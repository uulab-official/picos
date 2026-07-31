import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { operationsCommand } from "../src/cli/commands/operations";
import { readConfig, setConfigOperationPresets } from "../src/config/store";
import { createSystemMonitorSnapshot } from "../src/core/systemMonitor";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("operations CLI command", () => {
	test("requires exact confirmation before saving or removing presets", async () => {
		const configPath = await tempConfigPath();
		await expect(
			operationsCommand("save", "pulse", "monitor", {
				samples: 2,
				interval: 250,
				confirm: "wrong",
				configPath,
			}),
		).rejects.toThrow("save operation preset pulse");
		expect((await readConfig(configPath)).operationPresets).toEqual([]);

		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("save", "pulse", "monitor", {
				samples: 2,
				interval: 250,
				confirm: "save operation preset pulse",
				configPath,
			});
		} finally {
			console.log = originalLog;
		}
		expect((await readConfig(configPath)).operationPresets).toEqual([
			{ id: "pulse", kind: "monitor", samples: 2, intervalMs: 250 },
		]);
		expect(writes.join("\n")).toContain("Saved: pulse monitor");

		await expect(
			operationsCommand("remove", "pulse", undefined, {
				confirm: "wrong",
				configPath,
			}),
		).rejects.toThrow("remove operation preset pulse");
		expect((await readConfig(configPath)).operationPresets).toHaveLength(1);
	});

	test("reports the preset evicted when the shelf is full", async () => {
		const configPath = await tempConfigPath();
		await setConfigOperationPresets(
			Array.from({ length: 12 }, (_, index) => ({
				id: `p${index}`,
				kind: "monitor" as const,
				samples: 1,
				intervalMs: 1000,
			})),
			configPath,
		);
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("save", "fresh", "monitor", {
				confirm: "save operation preset fresh",
				configPath,
			});
		} finally {
			console.log = originalLog;
		}

		const saved = (await readConfig(configPath)).operationPresets;

		expect(writes.join("\n")).toContain("Evicted: p11");
		expect(saved).toHaveLength(12);
		expect(saved[0]?.id).toBe("fresh");
		expect(saved.some((preset) => preset.id === "p11")).toBeFalse();
	});

	test("runs a saved monitor preset through injected sampling", async () => {
		const configPath = await tempConfigPath();
		const snapshot = createSystemMonitorSnapshot({
			now: "2026-07-29T00:00:00.000Z",
			uptimeSeconds: 60,
			loadAverage: [1, 0, 0],
			totalMemoryBytes: 100,
			freeMemoryBytes: 50,
			cpuModel: "cpu",
			cpuCount: 2,
			processes: [],
		});
		const waits: number[] = [];
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("save", "pulse", "monitor", {
				samples: 2,
				interval: 250,
				confirm: "save operation preset pulse",
				configPath,
			});
			await operationsCommand(
				"run",
				"pulse",
				undefined,
				{ configPath },
				{
					readSnapshot: async () => snapshot,
					wait: async (milliseconds) => {
						waits.push(milliseconds);
					},
					now: () => "2026-07-29T00:00:00.000Z",
				},
			);
		} finally {
			console.log = originalLog;
		}

		const output = writes.join("\n");

		expect(waits).toEqual([250]);
		expect(output).toContain("PICOS OPERATION PRESET id=pulse kind=monitor");
		expect(output).toContain("SAMPLE 1/2");
		expect(output).toContain("SAMPLE 2/2");
	});

	test("runs saved logs and process presets through injected sources", async () => {
		const configPath = await tempConfigPath();
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("save", "errors", "logs", {
				limit: 20,
				level: "fail",
				confirm: "save operation preset errors",
				configPath,
			});
			await operationsCommand(
				"run",
				"errors",
				undefined,
				{ configPath },
				{
					logSnapshot: {
						source: "systemd-journal",
						status: "ok",
						command: "journalctl",
						args: ["-n", "20"],
						note: "recent systemd journal entries",
						exitCode: 0,
						truncated: false,
						entries: [
							{ index: 1, level: "info", message: "service ready" },
							{ index: 2, level: "fail", message: "disk offline" },
						],
					},
				},
			);
			await operationsCommand("save", "worker", "process", {
				pid: 4242,
				confirm: "save operation preset worker",
				configPath,
			});
			await operationsCommand(
				"run",
				"worker",
				undefined,
				{ configPath },
				{
					readProcessDetailResult: async () => ({
						detail: { pid: 4242, elapsed: "01:00", command: "bun worker.ts" },
						source: {
							key: "process-detail",
							command: "ps",
							args: ["-p", "4242"],
							supported: true,
							success: true,
							exitCode: 0,
							truncated: false,
							totalCount: 1,
						},
					}),
				},
			);
		} finally {
			console.log = originalLog;
		}

		const output = writes.join("\n");

		expect(output).toContain("PICOS OPERATION PRESET id=errors kind=logs");
		expect(output).toContain("002 fail disk offline");
		expect(output).not.toContain("service ready");
		expect(output).toContain("PICOS OPERATION PRESET id=worker kind=process");
		expect(output).toContain("bun worker.ts");
	});

	test("requires the normalized id in the confirmation phrase", async () => {
		const configPath = await tempConfigPath();

		await expect(
			operationsCommand("save", " PULSE ", "monitor", {
				confirm: "save operation preset  PULSE ",
				configPath,
			}),
		).rejects.toThrow('--confirm "save operation preset pulse"');
		expect((await readConfig(configPath)).operationPresets).toEqual([]);
	});

	test("lists saved presets without exposing an unbounded config object", async () => {
		const configPath = await tempConfigPath();
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("save", "errors", "logs", {
				limit: 20,
				level: "fail",
				filter: "kernel",
				confirm: "save operation preset errors",
				configPath,
			});
			await operationsCommand("list", undefined, undefined, { configPath });
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PICOS OPERATION PRESETS");
		expect(writes.join("\n")).toContain(
			"errors logs limit=20 level=fail filter=kernel",
		);
	});

	test("prints preset kind contracts without creating config", async () => {
		const configPath = await tempConfigPath();
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("kinds", undefined, undefined, { configPath });
		} finally {
			console.log = originalLog;
		}

		const output = writes.join("\n");

		expect(writes[0]).toBe("PICOS OPERATION PRESET KINDS");
		expect(output).toContain("count=3 total=3");
		expect(output).toContain("maxMonitorIntervalSpanMs=300000");
		expect(output).toContain(
			"monitor -> picos monitor [--samples=1..60] [--interval=250..60000]",
		);
		expect(output).toContain("logs -> picos logs [--limit=1..200]");
		expect(output).toContain("process -> picos process --pid=1+ [--files]");
		expect(output).toContain('confirm save="save operation preset <id>"');
		expect(existsSync(configPath)).toBeFalse();
	});

	test("filters printed kind contracts and rejects unknown kinds", async () => {
		const configPath = await tempConfigPath();
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => writes.push(String(value));
		try {
			await operationsCommand("kinds", " MONITOR ", undefined, { configPath });
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("count=1 total=3");
		expect(writes.join("\n")).not.toContain("picos logs");

		await expect(
			operationsCommand("kinds", "bogus", undefined, { configPath }),
		).rejects.toThrow("expected monitor, logs, or process");
		await expect(
			operationsCommand("kinds", "monitor", "extra", { configPath }),
		).rejects.toThrow("Unexpected argument after kind");
	});

	test("rejects unknown operations actions", async () => {
		const configPath = await tempConfigPath();

		await expect(
			operationsCommand("sample", undefined, undefined, { configPath }),
		).rejects.toThrow("expected list, kinds, show, save, run, or remove");
	});
});

async function tempConfigPath(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "picos-operations-command-"));
	tempDirs.push(dir);
	return join(dir, "config.json");
}
