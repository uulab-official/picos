import { describe, expect, test } from "bun:test";
import {
	collectSystemMonitorSeries,
	createSystemMonitorSnapshot,
	formatSystemMonitorRows,
} from "../src/core/systemMonitor";

describe("system monitor", () => {
	test("creates a compact OS monitor snapshot from resource facts", () => {
		const snapshot = createSystemMonitorSnapshot({
			now: "2026-06-30T08:30:00.000Z",
			uptimeSeconds: 3661,
			loadAverage: [1.25, 0.5, 0.1],
			totalMemoryBytes: 8000,
			freeMemoryBytes: 2000,
			cpuModel: "Apple M3",
			cpuCount: 4,
			processes: [
				{ pid: 1, command: "launchd", cpu: "0.1", memory: "0.5" },
				{ pid: 42, command: "node server.js", cpu: "17.5", memory: "4.2" },
				{ pid: 7, command: "bun test", cpu: "8.3", memory: "2.1" },
			],
		});

		expect(snapshot).toEqual({
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
			processCount: 3,
			topProcesses: [
				{ pid: 42, command: "node server.js", cpu: "17.5", memory: "4.2" },
				{ pid: 7, command: "bun test", cpu: "8.3", memory: "2.1" },
				{ pid: 1, command: "launchd", cpu: "0.1", memory: "0.5" },
			],
		});
	});

	test("formats monitor rows for CLI and TUI panels", () => {
		const rows = formatSystemMonitorRows(
			createSystemMonitorSnapshot({
				now: "2026-06-30T08:30:00.000Z",
				uptimeSeconds: 3661,
				loadAverage: [1.25, 0.5, 0.1],
				totalMemoryBytes: 8000,
				freeMemoryBytes: 2000,
				cpuModel: "Apple M3",
				cpuCount: 4,
				processes: [
					{ pid: 42, command: "node server.js", cpu: "17.5", memory: "4.2" },
				],
			}),
		);

		expect(rows).toEqual([
			"PICOS SYSTEM MONITOR",
			"at=2026-06-30T08:30:00.000Z uptime=1h 1m",
			"load=1.25,0.50,0.10",
			"memory=6000/8000 bytes used percent=75 free=2000",
			"cpu=Apple M3 cores=4",
			"processes=1",
			"top pid=42 cpu=17.5 mem=4.2 cmd=node server.js",
		]);
	});

	test("uses collector total count instead of the bounded process sample", () => {
		const snapshot = createSystemMonitorSnapshot({
			uptimeSeconds: 1,
			loadAverage: [0, 0, 0],
			totalMemoryBytes: 1,
			freeMemoryBytes: 1,
			cpuModel: "cpu",
			cpuCount: 1,
			processes: [{ pid: 1, command: "init" }],
			processSource: {
				key: "processes",
				command: "ps",
				args: [],
				supported: true,
				success: true,
				exitCode: 0,
				truncated: false,
				totalCount: 120,
			},
		});

		expect(snapshot.processCount).toBe(120);
		expect(snapshot.processSource?.totalCount).toBe(120);
	});

	test("collects bounded monitor samples with waits only between reads", async () => {
		const waits: number[] = [];
		let reads = 0;
		const snapshot = createSystemMonitorSnapshot({
			now: "2026-07-14T12:00:00.000Z",
			uptimeSeconds: 1,
			loadAverage: [1, 0, 0],
			totalMemoryBytes: 100,
			freeMemoryBytes: 25,
			cpuModel: "cpu",
			cpuCount: 2,
			processes: [],
		});
		const times = ["2026-07-14T12:00:00.000Z", "2026-07-14T12:00:01.000Z"];
		const series = await collectSystemMonitorSeries(
			{ samples: 3, intervalMs: 500 },
			async () => {
				reads += 1;
				return snapshot;
			},
			async (milliseconds) => {
				waits.push(milliseconds);
			},
			() => times.shift() ?? "",
		);

		expect(reads).toBe(3);
		expect(waits).toEqual([500, 500]);
		expect(series).toMatchObject({
			startedAt: "2026-07-14T12:00:00.000Z",
			completedAt: "2026-07-14T12:00:01.000Z",
			requestedCount: 3,
			intervalMs: 500,
		});
		expect(series.samples).toHaveLength(3);
		expect(series.cancelled).toBeFalse();
	});

	test("stops sampling early when the caller withdraws", async () => {
		const snapshot = createSystemMonitorSnapshot({
			now: "2026-07-14T12:00:00.000Z",
			uptimeSeconds: 1,
			loadAverage: [1, 0, 0],
			totalMemoryBytes: 100,
			freeMemoryBytes: 25,
			cpuModel: "cpu",
			cpuCount: 2,
			processes: [],
		});
		const waits: number[] = [];
		let reads = 0;
		const series = await collectSystemMonitorSeries(
			{ samples: 10, intervalMs: 500 },
			async () => {
				reads += 1;
				return snapshot;
			},
			async (milliseconds) => {
				waits.push(milliseconds);
			},
			() => "2026-07-14T12:00:00.000Z",
			() => reads < 2,
		);

		// Withdrawn after the second sample: the two already collected are kept, the
		// remaining eight intervals are never slept through, and the requested count
		// is still reported so a consumer can see the run was cut short.
		expect(reads).toBe(2);
		expect(waits).toEqual([500]);
		expect(series.samples).toHaveLength(2);
		expect(series.requestedCount).toBe(10);
		expect(series.cancelled).toBeTrue();
	});
});
