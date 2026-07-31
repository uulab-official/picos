import { describe, expect, test } from "bun:test";
import {
	createOperationPreset,
	findOperationPreset,
	findOperationPresetKindContract,
	formatOperationPreset,
	formatOperationPresetConfirmation,
	formatOperationPresetKindContract,
	listOperationPresetKindContracts,
	MAX_MONITOR_INTERVAL_MS,
	MAX_MONITOR_SAMPLES,
	MAX_OPERATION_LOG_FILTER_LENGTH,
	MAX_OPERATION_LOG_LIMIT,
	MIN_MONITOR_INTERVAL_MS,
	normalizeOperationPresets,
	OPERATION_PRESET_LIMITS,
	type OperationPresetInput,
	parseMonitorInterval,
	parseMonitorSampleCount,
	parseOperationLogLimit,
	removeOperationPreset,
	saveOperationPreset,
} from "../src/core/operationPresets";

type ContractField = ReturnType<
	typeof listOperationPresetKindContracts
>[number]["fields"][number];

// Picks a value the constructor cannot arrive at by falling back to a default, so
// the round-trip assertion also catches a parser that ignores its argument. Using
// each field's `min` is not enough: `samples` has `min` equal to its default, and
// `level`, `filter`, and `files` have no `min` at all.
function probeValue(field: ContractField): unknown {
	if (field.choices) {
		return (
			field.choices.find((choice) => choice !== field.default) ??
			field.choices[0]
		);
	}
	if (field.type === "boolean") {
		return field.default !== true;
	}
	if (field.type === "text") {
		return "probe";
	}
	const min = field.min ?? 1;
	if (min !== field.default) {
		return min;
	}
	// Step up rather than jumping to `max`, which for `samples` would push the
	// monitor interval span toward its cap and couple this test to that product.
	return Math.min(min + 1, field.max ?? min + 1);
}

describe("operation presets", () => {
	test("normalizes bounded monitor, logs, and process presets", () => {
		const presets = normalizeOperationPresets([
			{ id: " Health ", kind: "monitor", samples: 3, intervalMs: 500 },
			{
				id: "errors",
				kind: "logs",
				limit: 20,
				level: "fail",
				filter: " disk ",
			},
			{ id: "worker", kind: "process", pid: 42, files: true },
			{ id: "health", kind: "monitor", samples: 2, intervalMs: 250 },
			{ id: "unsafe id", kind: "logs", limit: 1, level: "all", filter: "" },
			{ id: "too-long", kind: "monitor", samples: 60, intervalMs: 60_000 },
		]);

		expect(presets).toEqual([
			{ id: "health", kind: "monitor", samples: 3, intervalMs: 500 },
			{ id: "errors", kind: "logs", limit: 20, level: "fail", filter: "disk" },
			{ id: "worker", kind: "process", pid: 42, files: true },
		]);
	});

	test("creates validated presets and rejects unsafe bounds", () => {
		expect(
			createOperationPreset({
				id: "pulse",
				kind: "monitor",
				samples: "5",
				intervalMs: "1000",
			}),
		).toEqual({
			id: "pulse",
			kind: "monitor",
			samples: 5,
			intervalMs: 1000,
		});
		expect(parseMonitorSampleCount("60")).toBe(60);
		expect(parseMonitorInterval("250")).toBe(250);
		expect(() => parseMonitorSampleCount("61")).toThrow("1 to 60");
		expect(() => parseMonitorInterval("249")).toThrow("250 to 60000");
		expect(() =>
			createOperationPreset({
				id: "too-long",
				kind: "monitor",
				samples: 60,
				intervalMs: 60_000,
			}),
		).toThrow("exceeds 300000");
		expect(() =>
			createOperationPreset({ id: "worker", kind: "process", pid: 0 }),
		).toThrow("positive integer");
		expect(createOperationPreset({ id: "p", kind: " MONITOR " }).kind).toBe(
			"monitor",
		);
		expect(() => createOperationPreset({ id: "p", kind: "net" })).toThrow(
			"expected monitor, logs, or process",
		);
	});

	test("saves by stable id and removes without mutating other presets", () => {
		const logs = createOperationPreset({
			id: "errors",
			kind: "logs",
			limit: 20,
			level: "warn",
			filter: "kernel",
		});
		const monitor = createOperationPreset({
			id: "pulse",
			kind: "monitor",
			samples: 2,
			intervalMs: 250,
		});
		const updated = saveOperationPreset([logs], monitor);

		expect(findOperationPreset(updated, "PULSE")).toEqual(monitor);
		expect(formatOperationPreset(logs)).toContain("level=warn filter=kernel");
		expect(removeOperationPreset(updated, "errors")).toEqual([monitor]);
	});

	test("publishes preset contracts derived from the validated bounds", () => {
		const contracts = listOperationPresetKindContracts();
		const kinds = contracts.map((contract) => contract.kind);

		expect(kinds).toEqual(["monitor", "logs", "process"]);
		expect(OPERATION_PRESET_LIMITS).toEqual({
			maxPresets: 12,
			maxIdLength: 32,
			maxMonitorIntervalSpanMs: 300_000,
			idPattern: "^[a-z0-9][a-z0-9._-]*$",
			idNormalization: "trim-lowercase",
		});

		const monitor = findOperationPresetKindContract("monitor");

		expect(monitor.command).toBe("monitor");
		expect(monitor.fields).toEqual([
			{
				name: "samples",
				option: "--samples",
				type: "integer",
				required: false,
				default: 1,
				min: 1,
				max: MAX_MONITOR_SAMPLES,
			},
			{
				name: "intervalMs",
				option: "--interval",
				type: "integer",
				required: false,
				default: 1000,
				min: MIN_MONITOR_INTERVAL_MS,
				max: MAX_MONITOR_INTERVAL_MS,
			},
		]);

		const logs = findOperationPresetKindContract("logs");
		const limit = logs.fields.find((field) => field.name === "limit");
		const filter = logs.fields.find((field) => field.name === "filter");
		const level = logs.fields.find((field) => field.name === "level");
		const overLimit = (limit?.max ?? 0) + 1;

		expect(limit?.max).toBe(MAX_OPERATION_LOG_LIMIT);
		expect(() => parseOperationLogLimit(overLimit)).toThrow("1 to 200");
		expect(filter?.maxLength).toBe(MAX_OPERATION_LOG_FILTER_LENGTH);
		expect(level?.choices).toEqual(["all", "warn", "fail", "info"]);

		const processKind = findOperationPresetKindContract("process");
		const pid = processKind.fields[0];

		expect(processKind.label).toContain("ephemeral");
		expect(pid).toMatchObject({
			name: "pid",
			required: true,
			default: null,
		});
		expect(findOperationPresetKindContract("  MONITOR ").kind).toBe("monitor");
		expect(() => findOperationPresetKindContract("network")).toThrow(
			"expected monitor, logs, or process",
		);
	});

	test("formats contract rows and exact confirmation phrases", () => {
		const rows = listOperationPresetKindContracts().map(
			formatOperationPresetKindContract,
		);

		expect(rows).toEqual([
			"monitor -> picos monitor [--samples=1..60] [--interval=250..60000]",
			"logs -> picos logs [--limit=1..200] [--level=all|warn|fail|info] [--filter=text<=256]",
			"process -> picos process --pid=1+ [--files]",
		]);
		expect(formatOperationPresetConfirmation("save", "pulse")).toBe(
			"save operation preset pulse",
		);
		expect(formatOperationPresetConfirmation("remove", "pulse")).toBe(
			"remove operation preset pulse",
		);
	});

	test("returns contract copies so callers cannot mutate the catalog", () => {
		const contracts = listOperationPresetKindContracts();
		contracts[0]?.fields.pop();

		expect(listOperationPresetKindContracts()[0]?.fields).toHaveLength(2);
	});

	test("creates a preset from every published field name and bound", () => {
		for (const contract of listOperationPresetKindContracts()) {
			const input: Record<string, unknown> = {
				id: "probe",
				kind: contract.kind,
			};
			for (const field of contract.fields) {
				const value = probeValue(field);
				if (value !== null) {
					input[field.name] = value;
				}
			}

			const created = createOperationPreset(
				input as unknown as OperationPresetInput,
			) as unknown as Record<string, unknown>;

			expect(created.kind).toBe(contract.kind);
			for (const field of contract.fields) {
				expect(created[field.name]).toEqual(input[field.name]);
			}
		}
	});
});
