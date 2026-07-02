import { describe, expect, test } from "bun:test";
import {
	buildTracerouteCommand,
	formatToolResult,
	getToolDefinitions,
	normalizeToolTarget,
	runIpInfo,
	runTlsInspect,
	runTool,
	runWhoisLookup,
} from "../src/core/tools";

describe("lazyifconfig-style tools hub", () => {
	test("lists runnable tool definitions", () => {
		expect(getToolDefinitions().map((tool) => tool.id)).toEqual([
			"dns",
			"whois",
			"ip-info",
			"port-check",
			"telnet",
			"tls",
			"ping",
			"traceroute",
		]);
	});

	test("rejects unsafe targets", () => {
		expect(() => normalizeToolTarget("example.com; rm -rf /")).toThrow(
			"Invalid target",
		);
		expect(() => normalizeToolTarget("-example.com")).toThrow("Invalid target");
	});

	test("builds platform traceroute commands safely", () => {
		expect(buildTracerouteCommand("8.8.8.8", "darwin")).toEqual({
			command: "traceroute",
			args: ["8.8.8.8"],
		});
		expect(buildTracerouteCommand("8.8.8.8", "win32")).toEqual({
			command: "tracert",
			args: ["-d", "8.8.8.8"],
		});
	});

	test("formats tool result sections", () => {
		expect(
			formatToolResult({
				title: "TCP Port Check",
				sections: [{ label: "Status", lines: ["OPEN", "Elapsed: 10ms"] }],
				rawOutput: "raw",
			}),
		).toContain("[Status]\nOPEN\nElapsed: 10ms");
	});

	test("runs port-check through the generic tool dispatcher", async () => {
		const result = await runTool("port-check", ["example.com", "443"], {
			timeoutMs: 500,
			connect: async () => undefined,
			now: (() => {
				let current = 100;
				return () => {
					current += 12;
					return current;
				};
			})(),
		});

		expect(result.title).toBe("TCP Port Check");
		expect(result.sections[1]?.label).toBe("Status");
		expect(result.sections[1]?.lines).toContain("OPEN");
	});

	test("includes TCP target detail rows for operators", async () => {
		const result = await runTool("port-check", ["example.com", "443"], {
			timeoutMs: 750,
			connect: async () => undefined,
			now: (() => {
				let current = 300;
				return () => {
					current += 21;
					return current;
				};
			})(),
		});

		expect(result.sections[0]).toEqual({
			label: "Target",
			lines: [
				"Host: example.com",
				"Port: 443",
				"Command: picos tools port-check example.com 443",
				"Timeout: 750ms",
			],
		});
		expect(result.sections[1]).toEqual({
			label: "Status",
			lines: ["OPEN", "Elapsed: 21ms"],
		});
		expect(result.rawOutput).toContain("[Target]\nHost: example.com");
		expect(result.rawOutput).toContain("Timeout: 750ms");
	});

	test("runs telnet as a familiar TCP reachability alias", async () => {
		const result = await runTool("telnet", ["example.com", "443"], {
			timeoutMs: 500,
			connect: async () => undefined,
			now: (() => {
				let current = 200;
				return () => {
					current += 15;
					return current;
				};
			})(),
		});

		expect(result.title).toBe("Telnet TCP Check");
		expect(result.sections[0]?.lines).toContain(
			"Command: picos tools telnet example.com 443",
		);
		expect(result.sections[1]?.label).toBe("Status");
		expect(result.sections[1]?.lines).toContain("OPEN");
		expect(result.rawOutput).toStartWith(
			"$ picos tools telnet example.com 443",
		);
	});

	test("uses injectable fetch for RDAP", async () => {
		const result = await runWhoisLookup("example.com", {
			fetch: async () =>
				new Response(
					JSON.stringify({
						handle: "EXAMPLE",
						name: "example.com",
						objectClassName: "domain",
					}),
				),
		});

		expect(result.rawOutput).toContain("EXAMPLE");
		expect(result.sections[0]?.lines).toContain("Name: example.com");
	});

	test("uses injectable fetch for IP information", async () => {
		const result = await runIpInfo("8.8.8.8", {
			fetch: async () =>
				new Response(
					JSON.stringify({
						ip: "8.8.8.8",
						hostname: "dns.google",
						org: "AS15169 Google LLC",
						country: "US",
					}),
				),
		});

		expect(result.sections[0]?.lines).toContain(
			"Organization: AS15169 Google LLC",
		);
	});

	test("formats TLS inspection with target status and certificate sections", async () => {
		const result = await runTlsInspect("example.com:443", {
			timeoutMs: 1200,
			inspectTls: async () => ({
				host: "example.com",
				port: 443,
				authorized: true,
				protocol: "TLSv1.3",
				cipher: "TLS_AES_256_GCM_SHA384",
				subject: "*.example.com",
				issuer: "Example CA",
				validFrom: "Jan 1 00:00:00 2026 GMT",
				validTo: "Jan 1 23:59:59 2027 GMT",
				subjectAltName: "DNS:example.com, DNS:www.example.com",
				certificateCount: 2,
			}),
		});

		expect(result.sections).toEqual([
			{
				label: "Target",
				lines: [
					"Host: example.com",
					"Port: 443",
					"Command: picos tools tls example.com:443",
					"Timeout: 1200ms",
				],
			},
			{
				label: "Status",
				lines: [
					"Authorized: yes",
					"Protocol: TLSv1.3",
					"Cipher: TLS_AES_256_GCM_SHA384",
				],
			},
			{
				label: "Certificate",
				lines: [
					"Subject: *.example.com",
					"Issuer: Example CA",
					"Valid From: Jan 1 00:00:00 2026 GMT",
					"Valid To: Jan 1 23:59:59 2027 GMT",
					"SAN: DNS:example.com, DNS:www.example.com",
					"Chain Certificates: 2",
				],
			},
		]);
		expect(result.rawOutput).toContain("[Target]\nHost: example.com");
		expect(result.rawOutput).toContain("[Certificate]\nSubject: *.example.com");
	});

	test("formats traceroute with target status and parsed hop sections", async () => {
		const result = await runTool("traceroute", ["8.8.8.8"], {
			platform: "darwin",
			timeoutMs: 1500,
			runner: async (command, args) => ({
				command,
				args,
				stdout: [
					"traceroute to 8.8.8.8 (8.8.8.8), 30 hops max",
					" 1  192.168.0.1  1.123 ms  1.221 ms  1.300 ms",
					" 2  10.0.0.1  8.100 ms  8.200 ms  8.300 ms",
				].join("\n"),
				stderr: "",
				exitCode: 0,
				success: true,
			}),
		});

		expect(result.sections).toEqual([
			{
				label: "Target",
				lines: [
					"Host: 8.8.8.8",
					"Command: traceroute 8.8.8.8",
					"Platform: darwin",
					"Timeout: 1500ms",
				],
			},
			{
				label: "Status",
				lines: ["Exit: 0", "Result: ok", "Output Lines: 3"],
			},
			{
				label: "Hops",
				lines: [
					"1 192.168.0.1 1.123 ms 1.221 ms 1.300 ms",
					"2 10.0.0.1 8.100 ms 8.200 ms 8.300 ms",
				],
			},
		]);
		expect(result.rawOutput).toContain("[Target]\nHost: 8.8.8.8");
		expect(result.rawOutput).toContain("[Hops]\n1 192.168.0.1");
	});
});
