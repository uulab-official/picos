import * as linux from "../adapters/linux";
import * as macos from "../adapters/macos";
import * as windows from "../adapters/windows";
import { safeExec } from "../utils/safeExec";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type OsLogLevel = "info" | "warn" | "fail";

export type OsLogLevelFilter = "all" | OsLogLevel;

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

export function nextOsLogLevelFilter(
	current: OsLogLevelFilter,
): OsLogLevelFilter {
	const filters: OsLogLevelFilter[] = ["all", "warn", "fail", "info"];
	const index = filters.indexOf(current);
	return filters[(index + 1) % filters.length] ?? "all";
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
	if (entries.length === 0) {
		rows.push(
			query || level !== "all"
				? "no matching log entries"
				: "no recent log entries",
		);
		return rows;
	}
	return [
		...rows,
		...entries.map(
			(entry) =>
				`${String(entry.index).padStart(3, "0")} ${entry.level} ${entry.message}`,
		),
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
