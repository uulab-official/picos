import { describe, expect, test } from "bun:test";
import {
	buildTracerouteCommand,
	formatToolResult,
	getToolDefinitions,
	normalizeToolTarget,
	runIpInfo,
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
		expect(result.sections[0]?.label).toBe("Status");
		expect(result.sections[0]?.lines).toContain("OPEN");
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
});
