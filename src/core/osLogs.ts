import * as linux from "../adapters/linux";
import * as macos from "../adapters/macos";
import * as windows from "../adapters/windows";
import { safeExec } from "../utils/safeExec";
import type {
	OsLogLevel,
	OsLogLevelFilter,
	SafeExecResult,
	SupportedPlatform,
} from "./types";

// Re-exported so the existing consumers keep importing these from the module that
// owns the log collectors, while `types.ts` holds the single declaration that
// `LogProfile` and `LogsOperationPreset` also use.
export type { OsLogLevel, OsLogLevelFilter };

export type OsLogEntry = {
	index: number;
	level: OsLogLevel;
	message: string;
};

export type OsLogCommand = {
	source: string;
	command: string;
	args: string[];
	note: string;
};

export type OsLogSnapshot = OsLogCommand & {
	status: "ok" | "warn";
	requestedLimit?: number;
	entries: OsLogEntry[];
	exitCode?: number | null;
	truncated?: boolean;
	error?: string;
};

export type OsLogFormatOptions = {
	filter?: string;
	level?: OsLogLevelFilter;
};

export type OsLogOptions = {
	platform?: SupportedPlatform;
	limit?: number;
	timeoutMs?: number;
	runner?: (
		command: string,
		args: string[],
		options?: { timeoutMs?: number },
	) => Promise<SafeExecResult>;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_TIMEOUT_MS = 5000;

export function buildOsLogCommand(
	platform: SupportedPlatform = process.platform,
	options: Pick<OsLogOptions, "limit"> = {},
): OsLogCommand {
	const limit = normalizeLimit(options.limit);
	if (platform === "darwin") {
		return macos.osLogCommand();
	}
	if (platform === "win32") {
		return windows.osLogCommand(limit);
	}
	return linux.osLogCommand(limit);
}

export async function createOsLogSnapshot(
	options: OsLogOptions = {},
): Promise<OsLogSnapshot> {
	const limit = normalizeLimit(options.limit);
	const command = buildOsLogCommand(options.platform, { limit });
	const runner = options.runner ?? safeExec;
	const result = await runner(command.command, command.args, {
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
	});
	const output = result.stdout || result.stderr;
	const entries = parseOsLogLines(output, limit);

	return {
		...command,
		status: result.success && !result.truncated ? "ok" : "warn",
		requestedLimit: limit,
		entries,
		exitCode: result.exitCode,
		truncated: result.truncated ?? false,
		error: result.success
			? result.truncated
				? "OS log command output was truncated"
				: undefined
			: result.stderr || `exitCode=${result.exitCode ?? "timeout"}`,
	};
}

export function parseOsLogLines(
	output: string,
	limit = DEFAULT_LIMIT,
): OsLogEntry[] {
	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, normalizeLimit(limit))
		.map((message, index) => ({
			index: index + 1,
			level: detectLogLevel(message),
			message,
		}));
}

export function filterOsLogEntries(
	entries: OsLogEntry[],
	query: string | undefined,
	level: OsLogLevelFilter = "all",
): OsLogEntry[] {
	const normalized = query?.trim().toLowerCase() ?? "";
	return entries.filter((entry) => {
		if (level !== "all" && entry.level !== level) {
			return false;
		}
		if (!normalized) {
			return true;
		}
		return [
			String(entry.index).padStart(3, "0"),
			String(entry.index),
			entry.level,
			entry.message,
		]
			.join(" ")
			.toLowerCase()
			.includes(normalized);
	});
}

// Keyed by the filter union so adding a severity stops compiling until the cycle
// order lists it, rather than silently dropping it from the keyboard rotation.
const OS_LOG_LEVEL_FILTER_PRESENCE: Record<OsLogLevelFilter, true> = {
	all: true,
	warn: true,
	fail: true,
	info: true,
};

// Object literal key order above is the keyboard cycle order.
const OS_LOG_LEVEL_FILTER_CYCLE = Object.keys(
	OS_LOG_LEVEL_FILTER_PRESENCE,
) as OsLogLevelFilter[];

export function nextOsLogLevelFilter(
	current: OsLogLevelFilter,
): OsLogLevelFilter {
	const cycle = OS_LOG_LEVEL_FILTER_CYCLE;
	const index = cycle.indexOf(current);
	return cycle[(index + 1) % cycle.length] ?? "all";
}

export function formatOsLogRows(
	snapshot: OsLogSnapshot,
	options: OsLogFormatOptions = {},
): string[] {
	const query = options.filter?.trim() ?? "";
	const level = options.level ?? "all";
	const entries = filterOsLogEntries(snapshot.entries, query, level);
	const rows = [
		"PICOS OS LOGS",
		[
			`source=${snapshot.source}`,
			`status=${snapshot.status}`,
			`entries=${formatEntryCount(entries.length, snapshot.entries.length, query, level)}`,
			level === "all" ? "" : `level=${level}`,
			query ? `filter=${query}` : "",
		]
			.filter(Boolean)
			.join(" "),
		`command=${[snapshot.command, ...snapshot.args].join(" ")}`,
		`note=${snapshot.note}`,
	];
	if (snapshot.error) {
		rows.push(`error=${snapshot.error}`);
	}
	// The platform command applies the limit before `level` and `filter` narrow
	// anything locally, so a saturated window means matching entries may exist
	// further back that were never fetched. Only worth saying when a filter is
	// active, since otherwise the limit is just an ordinary page size.
	const narrowed = query !== "" || level !== "all";
	const windowHint =
		narrowed &&
		snapshot.requestedLimit !== undefined &&
		snapshot.entries.length >= snapshot.requestedLimit
			? `limit=${snapshot.requestedLimit} reached before filtering; raise --limit to search further back`
			: undefined;
	if (entries.length === 0) {
		rows.push(narrowed ? "no matching log entries" : "no recent log entries");
		if (windowHint) {
			rows.push(windowHint);
		}
		return rows;
	}
	return [
		...rows,
		...entries.map(
			(entry) =>
				`${String(entry.index).padStart(3, "0")} ${entry.level} ${entry.message}`,
		),
		...(windowHint ? [windowHint] : []),
	];
}

function detectLogLevel(message: string): OsLogLevel {
	const normalized = message.toLowerCase();
	if (
		normalized.includes("error") ||
		normalized.includes("failed") ||
		normalized.includes("failure") ||
		normalized.includes("critical") ||
		normalized.includes("panic")
	) {
		return "fail";
	}
	if (
		normalized.includes("warn") ||
		normalized.includes("denied") ||
		normalized.includes("timeout") ||
		normalized.includes("pressure")
	) {
		return "warn";
	}
	return "info";
}

function normalizeLimit(limit: number | undefined): number {
	if (!limit || !Number.isFinite(limit)) {
		return DEFAULT_LIMIT;
	}
	return Math.max(1, Math.min(200, Math.floor(limit)));
}

function formatEntryCount(
	visibleCount: number,
	totalCount: number,
	query: string,
	level: OsLogLevelFilter,
): string {
	return query || level !== "all"
		? `${visibleCount}/${totalCount}`
		: String(totalCount);
}
