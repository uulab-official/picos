import { describe, expect, test } from "bun:test";
import { monitorCommand } from "../src/cli/commands/monitor";

describe("monitor CLI command", () => {
	test("prints a read-only system monitor snapshot", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await monitorCommand({
				snapshot: {
					at: "2026-06-30T08:30:00.000Z",
					uptimeSeconds: 3661,
					loadAverage: [1.25, 0.5, 0.1],
					memory: {
						totalBytes: 8000,
						freeBytes: 2000,
						usedBytes: 6000,
						usedPercent: 75,
					},
					cpu: {
						model: "Apple M3",
						count: 4,
					},
					processCount: 1,
					topProcesses: [
						{
							pid: 42,
							command: "node server.js",
							cpu: "17.5",
							memory: "4.2",
						},
					],
				},
			});
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PICOS SYSTEM MONITOR");
		expect(writes.join("\n")).toContain("load=1.25,0.50,0.10");
		expect(writes.join("\n")).toContain("processes=1");
		expect(writes.join("\n")).toContain(
			"top pid=42 cpu=17.5 mem=4.2 cmd=node server.js",
		);
	});
});
