import type {
	LogsOperationPreset,
	MonitorOperationPreset,
	OperationPreset,
	ProcessOperationPreset,
} from "./types";

export const MAX_OPERATION_PRESETS = 12;
export const MAX_OPERATION_PRESET_ID_LENGTH = 32;
const OPERATION_PRESET_ID_REGEX = /^[a-z0-9][a-z0-9._-]*$/u;
export const OPERATION_PRESET_ID_PATTERN = OPERATION_PRESET_ID_REGEX.source;
export const MAX_OPERATION_LOG_FILTER_LENGTH = 256;
export const MIN_OPERATION_LOG_LIMIT = 1;
export const MAX_OPERATION_LOG_LIMIT = 200;
export const MIN_MONITOR_SAMPLES = 1;
export const MAX_MONITOR_SAMPLES = 60;
export const MIN_MONITOR_INTERVAL_MS = 250;
export const MAX_MONITOR_INTERVAL_MS = 60_000;
export const MAX_MONITOR_DURATION_MS = 5 * 60_000;
export const MIN_OPERATION_PROCESS_ID = 1;
export const DEFAULT_MONITOR_SAMPLES = 1;
export const DEFAULT_MONITOR_INTERVAL_MS = 1_000;
export const DEFAULT_OPERATION_LOG_LIMIT = 50;
export const DEFAULT_OPERATION_LOG_LEVEL: LogsOperationPreset["level"] = "all";
export const DEFAULT_OPERATION_FILES = false;
// Keyed by the level union so adding a level stops compiling until it is listed
// here, which keeps the published `choices` and the parser from omitting it.
const OPERATION_LOG_LEVEL_PRESENCE: Record<LogsOperationPreset["level"], true> =
	{
		all: true,
		warn: true,
		fail: true,
		info: true,
	};

// Object literal key order above is the published CLI order.
export const OPERATION_LOG_LEVELS = Object.keys(
	OPERATION_LOG_LEVEL_PRESENCE,
) as LogsOperationPreset["level"][];

export const OPERATION_PRESET_LIMITS = {
	maxPresets: MAX_OPERATION_PRESETS,
	maxIdLength: MAX_OPERATION_PRESET_ID_LENGTH,
	maxMonitorIntervalSpanMs: MAX_MONITOR_DURATION_MS,
	idPattern: OPERATION_PRESET_ID_PATTERN,
	idNormalization: "trim-lowercase",
} as const;

// Renders ["a", "b", "c"] as "a, b, or c" so validator messages can be derived
// from the catalogs they guard instead of repeating their members in prose.
function formatExpectedList(values: readonly string[]): string {
	if (values.length < 2) {
		return values[0] ?? "";
	}
	return `${values.slice(0, -1).join(", ")}, or ${values[values.length - 1]}`;
}

export type OperationPresetFieldContract = {
	name: string;
	option: string;
	type: "integer" | "text" | "choice" | "boolean";
	required: boolean;
	default: number | string | boolean | null;
	min?: number;
	max?: number;
	maxLength?: number;
	choices?: string[];
};

export type OperationPresetKindContract = {
	kind: OperationPreset["kind"];
	command: "monitor" | "logs" | "process";
	label: string;
	fields: OperationPresetFieldContract[];
};

const OPERATION_PRESET_KIND_CONTRACTS_BY_KIND: Record<
	OperationPreset["kind"],
	OperationPresetKindContract
> = {
	monitor: {
		kind: "monitor",
		command: "monitor",
		label: "bounded system monitor sampling",
		fields: [
			{
				name: "samples",
				option: "--samples",
				type: "integer",
				required: false,
				default: DEFAULT_MONITOR_SAMPLES,
				min: MIN_MONITOR_SAMPLES,
				max: MAX_MONITOR_SAMPLES,
			},
			{
				name: "intervalMs",
				option: "--interval",
				type: "integer",
				required: false,
				default: DEFAULT_MONITOR_INTERVAL_MS,
				min: MIN_MONITOR_INTERVAL_MS,
				max: MAX_MONITOR_INTERVAL_MS,
			},
		],
	},
	logs: {
		kind: "logs",
		command: "logs",
		label: "bounded OS log triage",
		fields: [
			{
				name: "limit",
				option: "--limit",
				type: "integer",
				required: false,
				default: DEFAULT_OPERATION_LOG_LIMIT,
				min: MIN_OPERATION_LOG_LIMIT,
				max: MAX_OPERATION_LOG_LIMIT,
			},
			{
				name: "level",
				option: "--level",
				type: "choice",
				required: false,
				default: DEFAULT_OPERATION_LOG_LEVEL,
				choices: [...OPERATION_LOG_LEVELS],
			},
			{
				name: "filter",
				option: "--filter",
				type: "text",
				required: false,
				default: "",
				maxLength: MAX_OPERATION_LOG_FILTER_LENGTH,
			},
		],
	},
	process: {
		kind: "process",
		command: "process",
		label: "single-process inspection by ephemeral PID",
		fields: [
			{
				name: "pid",
				option: "--pid",
				type: "integer",
				required: true,
				default: null,
				min: MIN_OPERATION_PROCESS_ID,
			},
			{
				name: "files",
				option: "--files",
				type: "boolean",
				required: false,
				default: DEFAULT_OPERATION_FILES,
			},
		],
	},
};

// Object literal key order above is the published CLI order for `operations kinds`.
const OPERATION_PRESET_KIND_CONTRACTS: OperationPresetKindContract[] =
	Object.values(OPERATION_PRESET_KIND_CONTRACTS_BY_KIND);

export const OPERATION_PRESET_KIND_COUNT =
	OPERATION_PRESET_KIND_CONTRACTS.length;

// Declared after the catalog on purpose: deriving the kind list is what keeps the
// validator message from omitting a kind, but a `const` cannot be read above its
// own initializer.
const OPERATION_PRESET_KINDS = OPERATION_PRESET_KIND_CONTRACTS.map(
	(contract) => contract.kind,
);

export type OperationPresetInput = {
	id: unknown;
	kind: unknown;
	samples?: unknown;
	intervalMs?: unknown;
	limit?: unknown;
	level?: unknown;
	filter?: unknown;
	pid?: unknown;
	files?: unknown;
	savedAtMs?: unknown;
};

export function normalizeOperationPresets(input: unknown): OperationPreset[] {
	if (!Array.isArray(input)) return [];
	const presets: OperationPreset[] = [];
	const seen = new Set<string>();
	for (const candidate of input) {
		const preset = normalizeOperationPreset(candidate);
		if (!preset || seen.has(preset.id)) continue;
		presets.push(preset);
		seen.add(preset.id);
		if (presets.length >= MAX_OPERATION_PRESETS) break;
	}
	return presets;
}

export function createOperationPreset(
	input: OperationPresetInput,
): OperationPreset {
	const id = parseOperationPresetId(input.id);
	const kind = parseOperationPresetKind(input.kind);
	if (kind === "monitor") {
		const samples = parseMonitorSampleCount(input.samples);
		const intervalMs = parseMonitorInterval(input.intervalMs);
		assertMonitorSamplingWindow(samples, intervalMs);
		return { id, kind, samples, intervalMs };
	}
	if (kind === "logs") {
		return {
			id,
			kind,
			limit: parseOperationLogLimit(input.limit),
			level: parseOperationLogLevel(input.level),
			filter: parseOperationLogFilter(input.filter) ?? "",
		};
	}
	return {
		id,
		kind,
		pid: parseOperationProcessId(input.pid),
		files: parseOperationFiles(input.files),
		savedAtMs: parseOperationSavedAt(input.savedAtMs),
	};
}

// Never synthesized, so a round trip through the config keeps the original
// reference point and a preset saved before this field existed stays without one.
// That distinction matters: a fabricated baseline is not persisted anywhere, so it
// would be re-derived on every invocation and always read as consistent, silently
// disabling reuse detection. Absent instead lets the verdict report `unknown`. The
// clock therefore lives at the CLI boundary, which also keeps this deterministic.
export function parseOperationSavedAt(value: unknown): number | undefined {
	const savedAt = Number(value);
	return Number.isSafeInteger(savedAt) && savedAt > 0 ? savedAt : undefined;
}

export function parseOperationPresetKind(
	value: unknown,
): OperationPreset["kind"] {
	const kind = String(value ?? "")
		.trim()
		.toLowerCase();
	if (kind === "monitor" || kind === "logs" || kind === "process") {
		return kind;
	}
	throw new Error(
		`Invalid operation preset kind; expected ${formatExpectedList(OPERATION_PRESET_KINDS)}`,
	);
}

export function listOperationPresetKindContracts(): OperationPresetKindContract[] {
	return OPERATION_PRESET_KIND_CONTRACTS.map(cloneOperationPresetKindContract);
}

export function findOperationPresetKindContract(
	kind: unknown,
): OperationPresetKindContract {
	return cloneOperationPresetKindContract(
		OPERATION_PRESET_KIND_CONTRACTS_BY_KIND[parseOperationPresetKind(kind)],
	);
}

export function formatOperationPresetConfirmation(
	action: "save" | "remove",
	id: string,
): string {
	return `${action} operation preset ${id}`;
}

export function formatOperationPresetKindContract(
	contract: OperationPresetKindContract,
): string {
	const fields = contract.fields
		.map(formatOperationPresetFieldContract)
		.join(" ");
	return `${contract.kind} -> picos ${contract.command}${fields ? ` ${fields}` : ""}`;
}

export function saveOperationPreset(
	presets: OperationPreset[],
	preset: OperationPreset,
): OperationPreset[] {
	return normalizeOperationPresets([
		preset,
		...presets.filter((candidate) => candidate.id !== preset.id),
	]);
}

export function removeOperationPreset(
	presets: OperationPreset[],
	idInput: unknown,
): OperationPreset[] {
	const id = parseOperationPresetId(idInput);
	return normalizeOperationPresets(presets).filter(
		(preset) => preset.id !== id,
	);
}

export function findOperationPreset(
	presets: OperationPreset[],
	idInput: unknown,
): OperationPreset | undefined {
	const id = parseOperationPresetId(idInput);
	return normalizeOperationPresets(presets).find((preset) => preset.id === id);
}

export function parseOperationPresetId(value: unknown): string {
	const id = String(value ?? "")
		.trim()
		.toLowerCase();
	if (
		!id ||
		id.length > MAX_OPERATION_PRESET_ID_LENGTH ||
		!OPERATION_PRESET_ID_REGEX.test(id)
	) {
		throw new Error(
			`Invalid operation preset id; expected 1-${MAX_OPERATION_PRESET_ID_LENGTH} lowercase letters, numbers, dot, underscore, or dash`,
		);
	}
	return id;
}

export function parseMonitorSampleCount(value: unknown): number {
	if (value === undefined) return DEFAULT_MONITOR_SAMPLES;
	const samples = Number(value);
	if (
		!Number.isInteger(samples) ||
		samples < MIN_MONITOR_SAMPLES ||
		samples > MAX_MONITOR_SAMPLES
	) {
		throw new Error(
			`Invalid monitor samples; expected an integer from ${MIN_MONITOR_SAMPLES} to ${MAX_MONITOR_SAMPLES}`,
		);
	}
	return samples;
}

export function parseMonitorInterval(value: unknown): number {
	if (value === undefined) return DEFAULT_MONITOR_INTERVAL_MS;
	const intervalMs = Number(value);
	if (
		!Number.isInteger(intervalMs) ||
		intervalMs < MIN_MONITOR_INTERVAL_MS ||
		intervalMs > MAX_MONITOR_INTERVAL_MS
	) {
		throw new Error(
			`Invalid monitor interval; expected an integer from ${MIN_MONITOR_INTERVAL_MS} to ${MAX_MONITOR_INTERVAL_MS} milliseconds`,
		);
	}
	return intervalMs;
}

export function assertMonitorSamplingWindow(
	samples: number,
	intervalMs: number,
): void {
	const durationMs = (samples - 1) * intervalMs;
	if (durationMs > MAX_MONITOR_DURATION_MS) {
		throw new Error(
			`Monitor sampling duration exceeds ${MAX_MONITOR_DURATION_MS} milliseconds`,
		);
	}
}

export function parseOperationLogLimit(value: unknown): number {
	if (value === undefined) return DEFAULT_OPERATION_LOG_LIMIT;
	const limit = Number(value);
	if (
		!Number.isInteger(limit) ||
		limit < MIN_OPERATION_LOG_LIMIT ||
		limit > MAX_OPERATION_LOG_LIMIT
	) {
		throw new Error(
			`Invalid OS log limit; expected an integer from ${MIN_OPERATION_LOG_LIMIT} to ${MAX_OPERATION_LOG_LIMIT}`,
		);
	}
	return limit;
}

export function parseOperationLogLevel(
	value: unknown,
): LogsOperationPreset["level"] {
	if (value === undefined) return DEFAULT_OPERATION_LOG_LEVEL;
	const level = OPERATION_LOG_LEVELS.find((candidate) => candidate === value);
	if (level) {
		return level;
	}
	throw new Error(
		`Invalid OS log level; expected ${formatExpectedList(OPERATION_LOG_LEVELS)}`,
	);
}

export function parseOperationLogFilter(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	const filter = String(value).trim();
	if (filter.length > MAX_OPERATION_LOG_FILTER_LENGTH) {
		throw new Error(
			`Invalid OS log filter; expected at most ${MAX_OPERATION_LOG_FILTER_LENGTH} characters`,
		);
	}
	return filter || undefined;
}

export function parseOperationProcessId(value: unknown): number {
	const pid = Number(value);
	if (!Number.isSafeInteger(pid) || pid < MIN_OPERATION_PROCESS_ID) {
		throw new Error(
			"Invalid operation process PID; expected a positive integer",
		);
	}
	return pid;
}

export function parseOperationFiles(value: unknown): boolean {
	if (value === undefined || value === false || value === "false") {
		return DEFAULT_OPERATION_FILES;
	}
	if (value === true || value === "true") return true;
	throw new Error("--files is a boolean flag");
}

export function formatOperationPreset(preset: OperationPreset): string {
	if (preset.kind === "monitor") {
		return `${preset.id} monitor samples=${preset.samples} interval=${preset.intervalMs}ms`;
	}
	if (preset.kind === "logs") {
		return `${preset.id} logs limit=${preset.limit} level=${preset.level} filter=${preset.filter || "-"}`;
	}
	return `${preset.id} process pid=${preset.pid} files=${preset.files ? "yes" : "no"}`;
}

function normalizeOperationPreset(input: unknown): OperationPreset | undefined {
	if (!input || typeof input !== "object") return undefined;
	try {
		return createOperationPreset(input as OperationPresetInput);
	} catch {
		return undefined;
	}
}

function cloneOperationPresetKindContract(
	contract: OperationPresetKindContract,
): OperationPresetKindContract {
	return {
		...contract,
		fields: contract.fields.map((field) => ({
			...field,
			...(field.choices ? { choices: [...field.choices] } : {}),
		})),
	};
}

function formatOperationPresetFieldContract(
	field: OperationPresetFieldContract,
): string {
	const value = formatOperationPresetFieldValue(field);
	const token = value ? `${field.option}=${value}` : field.option;
	return field.required ? token : `[${token}]`;
}

function formatOperationPresetFieldValue(
	field: OperationPresetFieldContract,
): string | undefined {
	if (field.choices) {
		return field.choices.join("|");
	}
	if (field.type === "boolean") {
		return undefined;
	}
	if (field.maxLength !== undefined) {
		return `text<=${field.maxLength}`;
	}
	if (field.min !== undefined && field.max !== undefined) {
		return `${field.min}..${field.max}`;
	}
	if (field.min !== undefined) {
		return `${field.min}+`;
	}
	if (field.max !== undefined) {
		return `..${field.max}`;
	}
	return field.type;
}

export function isMonitorOperationPreset(
	preset: OperationPreset,
): preset is MonitorOperationPreset {
	return preset.kind === "monitor";
}

export function isLogsOperationPreset(
	preset: OperationPreset,
): preset is LogsOperationPreset {
	return preset.kind === "logs";
}

export function isProcessOperationPreset(
	preset: OperationPreset,
): preset is ProcessOperationPreset {
	return preset.kind === "process";
}
