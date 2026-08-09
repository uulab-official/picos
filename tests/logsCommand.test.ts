import { describe, expect, test } from "bun:test";
import {
	logsCommand,
	parseLogsFilter,
	parseLogsLevel,
	parseLogsLimit,
} from "../src/cli/commands/logs";

describe("logs CLI command", () => {
	test("validates bounded limits and severity filters", () => {
		expect(parseLogsLimit(undefined)).toBe(50);
		expect(parseLogsLimit("200")).toBe(200);
		expect(() => parseLogsLimit("0")).toThrow("1 to 200");
		expect(() => parseLogsLimit("1.5")).toThrow("1 to 200");
		expect(parseLogsLevel("warn")).toBe("warn");
		expect(() => parseLogsLevel("debug")).toThrow("all, warn, fail, or info");
		expect(parseLogsFilter(" kernel ")).toBe("kernel");
		expect(() => parseLogsFilter("x".repeat(257))).toThrow("256 characters");
	});
	test("prints a read-only OS log snapshot", async () => {
		const lines: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			lines.push(String(value));
		};

		try {
			await logsCommand(
				{},
				{
					snapshot: {
						source: "systemd-journal",
						status: "ok",
						command: "journalctl",
						args: ["-n", "1"],
						note: "recent systemd journal entries",
						entries: [
							{
								index: 1,
								level: "warn",
								message: "kernel: warning thermal pressure",
							},
						],
					},
				},
			);
		} finally {
			console.log = originalLog;
		}

		expect(lines.join("\n")).toContain("PICOS OS LOGS");
		expect(lines.join("\n")).toContain("source=systemd-journal status=ok");
		expect(lines.join("\n")).toContain(
			"001 warn kernel: warning thermal pressure",
		);
	});

	test("prints filtered OS log rows from an injected snapshot", async () => {
		const lines: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			lines.push(String(value));
		};

		try {
			await logsCommand(
				{ filter: "kernel", level: "fail" },
				{
					snapshot: {
						source: "systemd-journal",
						status: "ok",
						command: "journalctl",
						args: ["-n", "3"],
						note: "recent systemd journal entries",
						entries: [
							{ index: 1, level: "warn", message: "kernel: warning pressure" },
							{ index: 2, level: "info", message: "sshd: accepted key" },
							{ index: 3, level: "fail", message: "kernel: error disk" },
						],
					},
				},
			);
		} finally {
			console.log = originalLog;
		}

		const output = lines.join("\n");
		expect(output).toContain("entries=1/3 level=fail filter=kernel");
		expect(output).not.toContain("001 warn kernel: warning pressure");
		expect(output).not.toContain("sshd: accepted key");
		expect(output).toContain("003 fail kernel: error disk");
	});
});
