import {
	getConfigPath,
	readConfig,
	setConfigOperationPresets,
} from "../../config/store";
import {
	createOperationPreset,
	findOperationPreset,
	findOperationPresetKindContract,
	formatOperationPreset,
	formatOperationPresetConfirmation,
	formatOperationPresetKindContract,
	listOperationPresetKindContracts,
	OPERATION_PRESET_KIND_COUNT,
	OPERATION_PRESET_LIMITS,
	removeOperationPreset,
	saveOperationPreset,
} from "../../core/operationPresets";
import {
	createOsLogSnapshot,
	formatOsLogRows,
	type OsLogSnapshot,
} from "../../core/osLogs";
import {
	detectProcessIdReuse,
	formatProcessDetail,
	formatProcessFileSnapshot,
	getProcessDetailWithSource,
	getProcessFileSnapshotWithSource,
	type ProcessDetailResult,
	type ProcessFileSnapshotResult,
} from "../../core/processes";
import {
	collectSystemMonitorSeries,
	formatSystemMonitorRows,
	getSystemMonitorSnapshot,
	type SystemMonitorSnapshot,
} from "../../core/systemMonitor";
import type { OperationPreset } from "../../core/types";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
	sanitizeLocalInspectorText,
} from "../localInspectorOutput";
import {
	findEvictedOperationPresetIds,
	formatOperationPresetKindsJson,
	formatOperationPresetsJson,
} from "../operationPresetsOutput";
import {
	formatLogsJson,
	formatMonitorJson,
	formatMonitorSeriesJson,
	formatProcessJson,
} from "../operationsOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

type OperationsCommandOptions = {
	json?: unknown;
	samples?: string | number;
	interval?: string | number;
	limit?: string | number;
	level?: unknown;
	filter?: unknown;
	pid?: string | number;
	files?: unknown;
	confirm?: unknown;
	configPath?: string;
};

// Injection seams stay outside OperationsCommandOptions, which cac populates
// from user flags, so a flag can never land where a function is expected.
// cac's checkUnknownOptions() already rejects unregistered flags, so this is
// defense in depth and separation of concerns rather than a reachable fix.
type OperationRunSeams = {
	readSnapshot?: () => Promise<SystemMonitorSnapshot>;
	wait?: (milliseconds: number) => Promise<void>;
	now?: () => string;
	logSnapshot?: OsLogSnapshot;
	readProcessDetailResult?: (pid: string) => Promise<ProcessDetailResult>;
	readProcessFileSnapshotResult?: (
		pid: string,
	) => Promise<ProcessFileSnapshotResult>;
};

export async function operationsCommand(
	action = "list",
	idInput?: string,
	kind?: string,
	options: OperationsCommandOptions = {},
	seams: OperationRunSeams = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	const configPath = options.configPath ?? getConfigPath();
	try {
		const json = assertLocalJsonOptions(options);
		if (action === "kinds") {
			if (kind !== undefined) {
				throw new Error(
					"Unexpected argument after kind; expected operations kinds [monitor|logs|process]",
				);
			}
			await printPresetKindContracts(json, idInput);
			return;
		}
		const config = await readConfig(configPath);
		if (action === "list") {
			await printPresetCollection(config.operationPresets, json);
			return;
		}
		if (action === "show") {
			const preset = requirePreset(config.operationPresets, idInput);
			if (json) {
				await writeCliOutput(
					formatOperationPresetsJson({
						action: "show",
						presets: config.operationPresets,
						preset,
					}),
				);
				return;
			}
			console.log(sanitizeLocalInspectorText(formatOperationPreset(preset)));
			return;
		}
		if (action === "save") {
			const preset = createOperationPreset({
				id: idInput,
				kind,
				// The clock lives here rather than in the constructor, so a preset
				// gets its reference point exactly when it is written and loading one
				// never fabricates a baseline it does not have.
				savedAtMs: Date.now(),
				samples: options.samples,
				intervalMs: options.interval,
				limit: options.limit,
				level: options.level,
				filter: options.filter,
				pid: options.pid,
				files: options.files,
			});
			assertExactConfirmation(
				options.confirm,
				formatOperationPresetConfirmation("save", preset.id),
			);
			const next = saveOperationPreset(config.operationPresets, preset);
			const evicted = findEvictedOperationPresetIds(
				config.operationPresets,
				next,
			);
			await setConfigOperationPresets(next, configPath);
			if (json) {
				await writeCliOutput(
					formatOperationPresetsJson({
						action: "save",
						presets: next,
						preset,
						evicted,
					}),
				);
				return;
			}
			console.log(
				`Saved: ${sanitizeLocalInspectorText(formatOperationPreset(preset))}`,
			);
			if (evicted.length > 0) {
				console.log(`Evicted: ${evicted.join(", ")}`);
			}
			return;
		}
		if (action === "remove") {
			const preset = requirePreset(config.operationPresets, idInput);
			assertExactConfirmation(
				options.confirm,
				formatOperationPresetConfirmation("remove", preset.id),
			);
			const next = removeOperationPreset(config.operationPresets, preset.id);
			await setConfigOperationPresets(next, configPath);
			if (json) {
				await writeCliOutput(
					formatOperationPresetsJson({
						action: "remove",
						presets: next,
						preset,
					}),
				);
				return;
			}
			console.log(`Removed: ${preset.id}`);
			return;
		}
		if (action === "run") {
			await runPreset(
				requirePreset(config.operationPresets, idInput),
				json,
				seams,
			);
			return;
		}
		throw new Error(
			"Unknown operations action; expected list, kinds, show, save, run, or remove",
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("operations", caught, {
				request: {
					operation: action,
					presetId: action === "kinds" ? null : idInput,
					kind: action === "kinds" ? idInput : kind,
				},
			});
		}
		throw caught;
	}
}

async function runPreset(
	preset: OperationPreset,
	json: boolean,
	seams: OperationRunSeams,
): Promise<void> {
	if (preset.kind === "monitor") {
		const readSnapshot = seams.readSnapshot ?? getSystemMonitorSnapshot;
		if (preset.samples === 1) {
			const snapshot = await readSnapshot();
			if (json) {
				await writeCliOutput(
					formatMonitorJson(snapshot, { presetId: preset.id }),
				);
				return;
			}
			console.log(formatPresetHeader(preset));
			console.log(formatSystemMonitorRows(snapshot).join("\n"));
			return;
		}
		const series = await collectSystemMonitorSeries(
			{ samples: preset.samples, intervalMs: preset.intervalMs },
			readSnapshot,
			seams.wait,
			seams.now,
		);
		if (json) {
			await writeCliOutput(
				formatMonitorSeriesJson(series, { presetId: preset.id }),
			);
			return;
		}
		console.log(formatPresetHeader(preset));
		console.log(
			series.samples
				.map((snapshot, index) =>
					[
						`SAMPLE ${index + 1}/${series.samples.length}`,
						...formatSystemMonitorRows(snapshot).slice(1),
					].join("\n"),
				)
				.join("\n\n"),
		);
		return;
	}
	if (preset.kind === "logs") {
		const snapshot =
			seams.logSnapshot ?? (await createOsLogSnapshot({ limit: preset.limit }));
		if (json) {
			await writeCliOutput(
				formatLogsJson(snapshot, {
					presetId: preset.id,
					filter: preset.filter,
					level: preset.level,
					limit: preset.limit,
				}),
			);
			return;
		}
		console.log(formatPresetHeader(preset));
		console.log(
			formatOsLogRows(snapshot, {
				filter: preset.filter,
				level: preset.level,
			}).join("\n"),
		);
		return;
	}
	const pid = String(preset.pid);
	const readDetail =
		seams.readProcessDetailResult ?? getProcessDetailWithSource;
	const readFiles =
		seams.readProcessFileSnapshotResult ?? getProcessFileSnapshotWithSource;
	const detailResult = await readDetail(pid);
	const fileResult = preset.files ? await readFiles(pid) : undefined;
	// A stored PID is ephemeral, so compare the running process against the instant
	// the preset was saved. Only `reused` is a proof, and it is a proof of
	// difference: a process younger than the preset cannot be the one saved.
	const identity = detectProcessIdReuse(
		detailResult.detail,
		preset.savedAtMs,
		Date.now(),
	);
	if (json) {
		await writeCliOutput(
			formatProcessJson({
				presetId: preset.id,
				pid: preset.pid,
				filesRequested: preset.files,
				detailResult,
				fileResult,
				identity,
			}),
		);
		return;
	}
	if (!detailResult.detail) throw new Error(`Process not found: ${preset.pid}`);
	console.log(formatPresetHeader(preset));
	console.log(formatProcessDetail(detailResult.detail));
	if (identity === "reused") {
		console.log(
			"identity=reused this process started after the preset was saved, so the PID was reused",
		);
	}
	if (preset.files) {
		console.log(formatProcessFileSnapshot(fileResult?.snapshot));
	}
}

async function printPresetKindContracts(
	json: boolean,
	kindInput?: string,
): Promise<void> {
	const selected = kindInput
		? findOperationPresetKindContract(kindInput)
		: undefined;
	const contracts = selected ? [selected] : listOperationPresetKindContracts();
	if (json) {
		await writeCliOutput(
			formatOperationPresetKindsJson(
				contracts,
				selected ? { kind: selected.kind } : {},
			),
		);
		return;
	}
	console.log("PICOS OPERATION PRESET KINDS");
	console.log(
		`count=${contracts.length} total=${OPERATION_PRESET_KIND_COUNT} maxPresets=${OPERATION_PRESET_LIMITS.maxPresets} maxIdLength=${OPERATION_PRESET_LIMITS.maxIdLength} maxMonitorIntervalSpanMs=${OPERATION_PRESET_LIMITS.maxMonitorIntervalSpanMs}`,
	);
	console.log(
		`id pattern=${OPERATION_PRESET_LIMITS.idPattern} normalization=${OPERATION_PRESET_LIMITS.idNormalization}`,
	);
	for (const contract of contracts) {
		console.log(formatOperationPresetKindContract(contract));
	}
	console.log(
		`confirm save="${formatOperationPresetConfirmation("save", "<id>")}"`,
	);
	console.log(
		`confirm remove="${formatOperationPresetConfirmation("remove", "<id>")}"`,
	);
}

async function printPresetCollection(
	presets: OperationPreset[],
	json: boolean,
): Promise<void> {
	if (json) {
		await writeCliOutput(
			formatOperationPresetsJson({ action: "list", presets }),
		);
		return;
	}
	console.log("PICOS OPERATION PRESETS");
	console.log(`config=user-config count=${presets.length}`);
	if (presets.length === 0) {
		console.log("no saved operation presets");
		return;
	}
	for (const preset of presets) {
		console.log(sanitizeLocalInspectorText(formatOperationPreset(preset)));
	}
}

function requirePreset(
	presets: OperationPreset[],
	idInput: unknown,
): OperationPreset {
	const preset = findOperationPreset(presets, idInput);
	if (!preset)
		throw new Error(`Operation preset not found: ${String(idInput ?? "")}`);
	return preset;
}

function assertExactConfirmation(value: unknown, expected: string): void {
	if (String(value ?? "") !== expected) {
		throw new Error(`Confirmation required; pass --confirm "${expected}"`);
	}
}

function formatPresetHeader(preset: OperationPreset): string {
	return `PICOS OPERATION PRESET id=${preset.id} kind=${preset.kind}`;
}
