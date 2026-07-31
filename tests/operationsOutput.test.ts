import { describe, expect, test } from "bun:test";
import {
	formatLogsJson,
	formatMonitorJson,
	formatMonitorSeriesJson,
	formatProcessJson,
} from "../src/cli/operationsOutput";
import type { OsLogSnapshot } from "../src/core/osLogs";

describe("operations JSON output", () => {
	test("normalizes monitor metrics without exposing process arguments", () => {
		const output = formatMonitorJson({
			at: "2026-07-14T12:00:00.000Z",
			uptimeSeconds: 3600,
			loadAverage: [1, 0.5, 0.25],
			memory: {
				totalBytes: 8000,
				freeBytes: 2000,
				usedBytes: 6000,
				usedPercent: 75,
			},
			cpu: { model: "Example CPU", count: 8 },
			processCount: 42,
			topProcesses: [
				{
					pid: 123,
					command: "node server.js --token=monitor-secret",
					cpu: "20.1",
					memory: "2.5",
				},
			],
			processSource: {
				key: "processes",
				command: "ps",
				args: ["-axo", "pid,pcpu,pmem,command"],
				supported: true,
				success: true,
				exitCode: 0,
				truncated: false,
				totalCount: 42,
			},
		});
		const document = JSON.parse(output);

		expect(document.command).toBe("monitor");
		expect(document.data.topProcesses).toEqual([
			{ pid: 123, name: "node", cpu: "20.1", memory: "2.5" },
		]);
		expect(document.source.processes.totalCount).toBe(42);
		expect(document.data.outcome).toBe("ok");
		expect(output).not.toContain("server.js");
		expect(output).not.toContain("monitor-secret");
	});

	test("formats bounded monitor series with aggregate metrics", () => {
		const base = {
			uptimeSeconds: 100,
			loadAverage: [1, 0.5, 0.25] as [number, number, number],
			memory: {
				totalBytes: 1000,
				freeBytes: 250,
				usedBytes: 750,
				usedPercent: 75,
			},
			cpu: { model: "CPU", count: 4 },
			processCount: 20,
			topProcesses: [
				{ pid: 7, command: "node worker.js --token=hidden", cpu: "5" },
			],
		};
		const output = formatMonitorSeriesJson(
			{
				startedAt: "2026-07-14T12:00:00.000Z",
				completedAt: "2026-07-14T12:00:01.000Z",
				requestedCount: 2,
				intervalMs: 1000,
				cancelled: false,
				samples: [
					{ ...base, at: "2026-07-14T12:00:00.000Z" },
					{
						...base,
						at: "2026-07-14T12:00:01.000Z",
						memory: { ...base.memory, usedPercent: 85 },
						loadAverage: [3, 1, 0.5],
						processCount: 30,
					},
				],
			},
			{ presetId: "pulse" },
		);
		const document = JSON.parse(output);

		expect(document.request).toMatchObject({
			operation: "sample",
			presetId: "pulse",
			samples: 2,
			intervalMs: 1000,
		});
		expect(document.data.durationMs).toBe(1000);
		expect(document.data.aggregate.memoryUsedPercent).toEqual({
			min: 75,
			max: 85,
			average: 80,
			last: 85,
		});
		expect(document.data.aggregate.loadOneMinute.average).toBe(2);
		expect(document.data.aggregate.processCount.last).toBe(30);
		// A completed run reports both counts equal and says so explicitly, so a
		// consumer never has to infer a short run from the count difference alone.
		expect(document.data.requestedCount).toBe(2);
		expect(document.data.returnedCount).toBe(2);
		expect(document.data.cancelled).toBeFalse();
		expect(document.data.samples).toHaveLength(2);
		expect(output).not.toContain("worker.js");
		expect(output).not.toContain("hidden");
	});

	test("returns filtered log entries with credential redaction", () => {
		const output = formatLogsJson(
			{
				source: "systemd-journal",
				status: "ok",
				command: "journalctl",
				args: ["-n", "3"],
				note: "recent systemd journal entries",
				requestedLimit: 3,
				exitCode: 0,
				truncated: false,
				entries: [
					{ index: 1, level: "info", message: "service ready" },
					{
						index: 2,
						level: "fail",
						message:
							'Authorization: Bearer abcdefgh12345678 token: "json-secret" url=https://u:p@example.com/?token=query-secret path=/Users/bonjin/app',
					},
				],
			},
			{ filter: "Authorization", level: "fail", limit: 3 },
		);
		const document = JSON.parse(output);

		expect(document.data.visibleCount).toBe(1);
		expect(document.data.entries[0].message).toContain(
			"Authorization: [REDACTED]",
		);
		expect(output).toContain("$HOME/app");
		expect(output).not.toContain("abcdefgh12345678");
		expect(output).not.toContain("query-secret");
		expect(output).not.toContain("json-secret");
		expect(output).not.toContain("https://u:p@");
	});

	test("reports whether the log window was filled before filtering", () => {
		const snapshot: OsLogSnapshot = {
			source: "systemd-journal",
			status: "ok",
			command: "journalctl",
			args: ["-n", "2"],
			note: "recent systemd journal entries",
			exitCode: 0,
			truncated: false,
			entries: [
				{ index: 1, level: "info", message: "service ready" },
				{ index: 2, level: "info", message: "unit loaded" },
			],
		};

		// Two entries fetched against a limit of two, so the collector filled the
		// window. A `fail` filter returning nothing does not prove there are no
		// failures, only none among the two most recent entries.
		const capped = JSON.parse(
			formatLogsJson(snapshot, { level: "fail", limit: 2 }),
		);

		expect(capped.data.limitReached).toBeTrue();
		expect(capped.data.totalCount).toBe(2);
		expect(capped.data.visibleCount).toBe(0);

		const roomLeft = JSON.parse(
			formatLogsJson(snapshot, { level: "fail", limit: 50 }),
		);

		expect(roomLeft.data.limitReached).toBeFalse();
	});

	test("redacts complete quoted and spaced credential assignments", () => {
		const output = formatLogsJson(
			{
				source: "systemd-journal",
				status: "ok",
				command: "journalctl",
				args: ["-n", "2"],
				note: "recent systemd journal entries",
				exitCode: 0,
				truncated: false,
				entries: [
					{
						index: 1,
						level: "fail",
						message:
							'token: "abc,def" password = "spaced secret" API_KEY = unquoted-secret',
					},
				],
			},
			{ level: "all", limit: 2 },
		);

		expect(output).not.toContain("abc,def");
		expect(output).not.toContain("spaced secret");
		expect(output).not.toContain("unquoted-secret");
		expect(output.match(/\[REDACTED\]/gu)).toHaveLength(3);
	});

	test("rejects failed or capture-truncated log sources", () => {
		expect(() =>
			formatLogsJson(
				{
					source: "systemd-journal",
					status: "warn",
					command: "journalctl",
					args: ["-n", "5"],
					note: "recent systemd journal entries",
					entries: [],
					exitCode: 1,
					truncated: false,
					error: "permission denied",
				},
				{ level: "all", limit: 5 },
			),
		).toThrow("permission denied");
	});

	test("omits process command arguments and raw file output", () => {
		const output = formatProcessJson({
			pid: 123,
			filesRequested: true,
			detailResult: {
				detail: {
					pid: 123,
					ppid: 1,
					user: "bonjin",
					state: "S",
					cpu: "2.1",
					memory: "1.0",
					elapsed: "01:00",
					command: "bun app.ts --password process-secret",
				},
				source: {
					key: "process-detail",
					command: "ps",
					args: ["-p", "123"],
					supported: true,
					success: true,
					exitCode: 0,
					truncated: false,
					totalCount: 1,
				},
			},
			fileResult: {
				snapshot: {
					pid: 123,
					cwd: "/Users/bonjin/project",
					fileEntries: [
						{
							descriptor: "txt",
							label: "executable",
							resourceKind: "file",
							path: "/Users/bonjin/project/app.ts",
						},
					],
					openFiles: ["/Users/bonjin/project/app.ts"],
					rawOutput: "raw process-secret",
				},
				source: {
					key: "process-files",
					command: "lsof",
					args: ["-a", "-p", "123", "-Fn", "-w"],
					supported: true,
					success: true,
					exitCode: 0,
					truncated: false,
					totalCount: 1,
				},
			},
		});
		const document = JSON.parse(output);

		expect(document.data.detail.name).toBe("bun");
		expect(document.data.files.cwd).toBe("$HOME/project");
		expect(document.data.files.entries[0].path).toBe("$HOME/project/app.ts");
		expect(output).not.toContain("app.ts --password");
		expect(output).not.toContain("process-secret");
		expect(output).not.toContain("rawOutput");
	});

	test("keeps unsupported process file inspection explicit", () => {
		const document = JSON.parse(
			formatProcessJson({
				pid: 123,
				filesRequested: true,
				detailResult: {
					detail: { pid: 123, name: "node.exe", command: "node.exe app.js" },
					source: {
						key: "process-detail",
						command: "powershell",
						args: ["-NoProfile"],
						supported: true,
						success: true,
						exitCode: 0,
						truncated: false,
						totalCount: 1,
					},
				},
				fileResult: {
					source: {
						key: "process-files",
						command: null,
						args: [],
						supported: false,
						success: null,
						exitCode: null,
						truncated: false,
						totalCount: 0,
					},
				},
			}),
		);

		expect(document.source.files).toMatchObject({
			supported: false,
			success: null,
		});
		expect(document.data.files).toMatchObject({
			requested: true,
			supported: false,
			available: false,
		});
		expect(document.data.outcome).toBe("partial");
	});

	test("marks capture-truncated process file inspection partial", () => {
		const document = JSON.parse(
			formatProcessJson({
				pid: 123,
				filesRequested: true,
				detailResult: {
					detail: { pid: 123, command: "node app.js" },
					source: {
						key: "process-detail",
						command: "ps",
						args: ["-p", "123"],
						supported: true,
						success: true,
						exitCode: 0,
						truncated: false,
						totalCount: 1,
					},
				},
				fileResult: {
					source: {
						key: "process-files",
						command: "lsof",
						args: ["-p", "123"],
						supported: true,
						success: true,
						exitCode: null,
						truncated: true,
						totalCount: 0,
					},
				},
			}),
		);

		expect(document.data.outcome).toBe("partial");
		expect(document.source.files.truncated).toBe(true);
	});
});
