import { describe, expect, test } from "bun:test";
import { logsCommand } from "../src/cli/commands/logs";

describe("logs CLI command", () => {
	test("prints a read-only OS log snapshot", async () => {
		const lines: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			lines.push(String(value));
		};

		try {
			await logsCommand({
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
			});
		} finally {
			console.log = originalLog;
		}

		expect(lines.join("\n")).toContain("PICOS OS LOGS");
		expect(lines.join("\n")).toContain("source=systemd-journal status=ok");
		expect(lines.join("\n")).toContain(
			"001 warn kernel: warning thermal pressure",
		);
	});
});
