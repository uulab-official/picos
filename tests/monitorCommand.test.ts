import { describe, expect, test } from "bun:test";
import { monitorCommand } from "../src/cli/commands/monitor";
import { createSystemMonitorSnapshot } from "../src/core/systemMonitor";

describe("monitor CLI command", () => {
	test("prints multiple injected samples and waits between reads", async () => {
		const writes: string[] = [];
		const waits: number[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		const snapshot = createSystemMonitorSnapshot({
			now: "2026-07-14T12:00:00.000Z",
			uptimeSeconds: 60,
			loadAverage: [1, 0, 0],
			totalMemoryBytes: 100,
			freeMemoryBytes: 50,
			cpuModel: "cpu",
			cpuCount: 2,
			processes: [],
		});
		try {
			await monitorCommand(
				{ samples: 2, interval: 250 },
				{
					readSnapshot: async () => snapshot,
					wait: async (milliseconds) => {
						waits.push(milliseconds);
					},
					now: () => "2026-07-14T12:00:00.000Z",
				},
			);
		} finally {
			console.log = originalLog;
		}

		expect(waits).toEqual([250]);
		expect(writes.join("\n")).toContain("PICOS MONITOR SAMPLE 1/2");
		expect(writes.join("\n")).toContain("PICOS MONITOR SAMPLE 2/2");
	});

	test("rejects monitor runs longer than five minutes", async () => {
		expect(monitorCommand({ samples: 60, interval: 60_000 })).rejects.toThrow(
			"exceeds 300000",
		);
	});
});
