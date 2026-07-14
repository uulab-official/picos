import { describe, expect, test } from "bun:test";
import {
	formatDnsBlockedJson,
	formatDnsJson,
	formatDoctorJson,
	formatToolRunJson,
	formatToolsListJson,
} from "../src/cli/diagnosticOutput";
import { getToolDefinitions, type ToolResult } from "../src/core/tools";

describe("diagnostic JSON output", () => {
	test("summarizes stable doctor checks without leaking sensitive detail", () => {
		const document = JSON.parse(
			formatDoctorJson([
				{
					id: "interface",
					label: "Interface detected",
					status: "pass",
				},
				{
					id: "public-ip",
					label: "Public IP lookup",
					status: "warn",
					detail: "token=super-secret /Users/alice/.ssh/id_ed25519",
				},
				{
					id: "internet",
					label: "Internet reachable",
					status: "fail",
					detail: "timeout",
				},
			]),
		);

		expect(document).toMatchObject({
			schemaVersion: 1,
			command: "doctor",
			status: "completed",
			data: {
				healthy: false,
				passCount: 1,
				warnCount: 1,
				failCount: 1,
				checkCount: 3,
			},
		});
		expect(JSON.stringify(document)).not.toContain("super-secret");
		expect(JSON.stringify(document)).not.toContain("/Users/alice");
	});

	test("reports configured DNS servers through the node resolver source", () => {
		expect(JSON.parse(formatDnsJson(["1.1.1.1", "8.8.8.8"]))).toMatchObject({
			command: "dns",
			status: "completed",
			request: { operation: "show" },
			source: { kind: "node", api: "dns.getServers", success: true },
			data: {
				configured: true,
				serverCount: 2,
				servers: ["1.1.1.1", "8.8.8.8"],
			},
		});
	});

	test("keeps DNS mutation explicitly blocked", () => {
		expect(JSON.parse(formatDnsBlockedJson("locked"))).toMatchObject({
			command: "dns",
			status: "blocked",
			request: { operation: "flush" },
			action: {
				risk: "write",
				privilege: "admin",
				confirmationRequired: true,
				executionEnabled: false,
			},
			error: { code: "PICOS_ACTION_LOCKED", message: "locked" },
		});
	});

	test("lists every Tools Hub contract with field metadata", () => {
		const document = JSON.parse(formatToolsListJson(getToolDefinitions()));
		expect(document.command).toBe("tools");
		expect(document.request).toEqual({ operation: "list" });
		expect(document.data.toolCount).toBe(8);
		expect(document.data.tools.map((tool: { id: string }) => tool.id)).toEqual([
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

	test("emits normalized tool evidence and omits raw output and secrets", () => {
		const result: ToolResult = {
			toolId: "port-check",
			title: "TCP Port Check",
			sections: [{ label: "Status", lines: ["OPEN"] }],
			rawOutput: "raw source must not appear",
			automation: {
				source: { kind: "tcp", success: true },
				data: {
					host: "example.com",
					port: 443,
					reachable: true,
					token: "super-secret",
					nested: { password: "also-secret" },
				},
			},
		};
		const output = formatToolRunJson(result, {
			name: "port-check",
			args: ["example.com", "443"],
			timeoutMs: 500,
		});
		const document = JSON.parse(output);

		expect(document).toMatchObject({
			command: "tools",
			status: "completed",
			request: {
				operation: "run",
				tool: "port-check",
				requestedTool: "port-check",
				args: ["example.com", "443"],
				timeoutMs: 500,
			},
			source: { kind: "tcp", success: true },
			data: {
				outcome: "ok",
				result: {
					host: "example.com",
					port: 443,
					reachable: true,
					token: "[REDACTED]",
					nested: { password: "[REDACTED]" },
				},
			},
		});
		expect(output).not.toContain("raw source");
		expect(output).not.toContain("super-secret");
		expect(output).not.toContain("also-secret");
	});

	test("rejects legacy tool results without automation metadata", () => {
		expect(() =>
			formatToolRunJson(
				{ title: "Legacy", sections: [], rawOutput: "raw" },
				{ name: "ping", args: ["example.com"] },
			),
		).toThrow("automation metadata");
	});
});
