import {
	formatOperationPresetConfirmation,
	OPERATION_PRESET_KIND_COUNT,
	OPERATION_PRESET_LIMITS,
	type OperationPresetKindContract,
} from "../core/operationPresets";
import type { OperationPreset } from "../core/types";
import {
	sanitizeLocalInspectorText,
	stringifyLocalInspectorCompleted,
} from "./localInspectorOutput";

export function formatOperationPresetsJson(input: {
	action: "list" | "show" | "save" | "remove";
	presets: OperationPreset[];
	preset?: OperationPreset;
	evicted?: string[];
}): string {
	return stringifyLocalInspectorCompleted("operations", {
		request: {
			operation: input.action,
			presetId: input.preset?.id ?? null,
		},
		source: {
			kind: "picos-config",
			location: "user-config",
			success: true,
		},
		data: {
			outcome: "ok",
			totalCount: input.presets.length,
			preset: input.preset ? normalizeOperationPreset(input.preset) : null,
			evicted: (input.evicted ?? []).map(sanitizeLocalInspectorText),
			presets: input.presets.map(normalizeOperationPreset),
		},
	});
}

export function findEvictedOperationPresetIds(
	before: OperationPreset[],
	after: OperationPreset[],
): string[] {
	return before
		.filter((preset) => !after.some((kept) => kept.id === preset.id))
		.map((preset) => preset.id);
}

export function formatOperationPresetKindsJson(
	contracts: OperationPresetKindContract[],
	options: { kind?: OperationPreset["kind"] } = {},
): string {
	return stringifyLocalInspectorCompleted("operations", {
		request: {
			operation: "kinds",
			presetId: null,
			kind: options.kind ?? null,
		},
		source: {
			kind: "picos-contract",
			location: "built-in",
			success: true,
		},
		data: {
			outcome: "ok",
			totalCount: OPERATION_PRESET_KIND_COUNT,
			returnedCount: contracts.length,
			limits: { ...OPERATION_PRESET_LIMITS },
			confirmations: {
				save: formatOperationPresetConfirmation("save", "<id>"),
				remove: formatOperationPresetConfirmation("remove", "<id>"),
			},
			kinds: contracts.map(normalizeOperationPresetKindContract),
		},
	});
}

export function normalizeOperationPresetKindContract(
	contract: OperationPresetKindContract,
) {
	return {
		kind: contract.kind,
		command: contract.command,
		label: sanitizeLocalInspectorText(contract.label),
		fields: contract.fields.map((field) => ({
			name: field.name,
			option: field.option,
			type: field.type,
			required: field.required,
			default: field.default,
			min: field.min ?? null,
			max: field.max ?? null,
			maxLength: field.maxLength ?? null,
			choices: field.choices ? [...field.choices] : null,
		})),
	};
}

export function normalizeOperationPreset(preset: OperationPreset) {
	if (preset.kind === "monitor") {
		return {
			id: sanitizeLocalInspectorText(preset.id),
			kind: preset.kind,
			samples: preset.samples,
			intervalMs: preset.intervalMs,
		};
	}
	if (preset.kind === "logs") {
		return {
			id: sanitizeLocalInspectorText(preset.id),
			kind: preset.kind,
			limit: preset.limit,
			level: preset.level,
			filter: preset.filter ? sanitizeLocalInspectorText(preset.filter) : null,
		};
	}
	return {
		id: sanitizeLocalInspectorText(preset.id),
		kind: preset.kind,
		pid: preset.pid,
		files: preset.files,
		savedAtMs: preset.savedAtMs,
	};
}
