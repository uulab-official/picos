import * as linux from "../adapters/linux";
import * as macos from "../adapters/macos";
import * as windows from "../adapters/windows";
import { safeExec } from "../utils/safeExec";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type OsLogLevel = "info" | "warn" | "fail";

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
	entries: OsLogEntry[];
	error?: string;
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
		status: result.success ? "ok" : "warn",
		entries,
		error: result.success
			? undefined
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

export function formatOsLogRows(snapshot: OsLogSnapshot): string[] {
	const rows = [
		"PICOS OS LOGS",
		`source=${snapshot.source} status=${snapshot.status} entries=${snapshot.entries.length}`,
		`command=${[snapshot.command, ...snapshot.args].join(" ")}`,
		`note=${snapshot.note}`,
	];
	if (snapshot.error) {
		rows.push(`error=${snapshot.error}`);
	}
	if (snapshot.entries.length === 0) {
		rows.push("no recent log entries");
		return rows;
	}
	return [
		...rows,
		...snapshot.entries.map(
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
