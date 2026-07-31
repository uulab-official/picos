import {
	filterOsLogEntries,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../core/osLogs";
import type {
	ProcessDetailResult,
	ProcessFileSnapshotResult,
	ProcessInspectionSource,
} from "../core/processes";
import type {
	SystemMonitorSeries,
	SystemMonitorSnapshot,
} from "../core/systemMonitor";
import type { InventorySourceStatus, ProcessSummary } from "../core/types";
import {
	LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
	LOCAL_INSPECTOR_JSON_MAX_BYTES,
	LocalInspectorSourceError,
	type LocalInspectorSourceResult,
	sanitizeLocalInspectorText,
	stringifyLocalInspectorCompleted,
} from "./localInspectorOutput";

export function formatMonitorJson(
	snapshot: SystemMonitorSnapshot,
	options: { presetId?: string } = {},
): string {
	return stringifyLocalInspectorCompleted("monitor", {
		request: {
			operation: "snapshot",
			presetId: options.presetId ?? null,
		},
		source: {
			system: {
				kind: "node",
				apis: [
					"os.uptime",
					"os.loadavg",
					"os.totalmem",
					"os.freemem",
					"os.cpus",
				],
				success: true,
			},
			processes: snapshot.processSource
				? normalizeInventorySource(snapshot.processSource)
				: null,
		},
		data: {
			outcome:
				snapshot.processSource &&
				(snapshot.processSource.supported === false ||
					snapshot.processSource.success === false ||
					snapshot.processSource.truncated)
					? "partial"
					: "ok",
			at: sanitizeLocalInspectorText(snapshot.at),
			uptimeSeconds: finiteNumber(snapshot.uptimeSeconds),
			loadAverage: snapshot.loadAverage.map(finiteNumber),
			memory: {
				totalBytes: finiteNumber(snapshot.memory.totalBytes),
				freeBytes: finiteNumber(snapshot.memory.freeBytes),
				usedBytes: finiteNumber(snapshot.memory.usedBytes),
				usedPercent: finiteNumber(snapshot.memory.usedPercent),
			},
			cpu: {
				model: sanitizeLocalInspectorText(snapshot.cpu.model),
				count: finiteNumber(snapshot.cpu.count),
			},
			processCount: finiteNumber(snapshot.processCount),
			topProcesses: snapshot.topProcesses
				.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
				.map(normalizeProcessSummary),
		},
	});
}

export function formatMonitorSeriesJson(
	series: SystemMonitorSeries,
	options: { presetId?: string } = {},
): string {
	const partial = series.samples.some(isMonitorSnapshotPartial);
	return stringifyLocalInspectorCompleted("monitor", {
		request: {
			operation: "sample",
			presetId: options.presetId ?? null,
			samples: series.requestedCount,
			intervalMs: series.intervalMs,
		},
		source: {
			system: {
				kind: "node",
				apis: [
					"os.uptime",
					"os.loadavg",
					"os.totalmem",
					"os.freemem",
					"os.cpus",
				],
				success: true,
			},
			processes: series.samples.map((sample, index) => ({
				index: index + 1,
				at: sanitizeLocalInspectorText(sample.at),
				evidence: sample.processSource
					? normalizeInventorySource(sample.processSource)
					: null,
			})),
		},
		data: {
			outcome: partial ? "partial" : "ok",
			startedAt: sanitizeLocalInspectorText(series.startedAt),
			completedAt: sanitizeLocalInspectorText(series.completedAt),
			requestedCount: series.requestedCount,
			returnedCount: series.samples.length,
			cancelled: series.cancelled,
			intervalMs: series.intervalMs,
			durationMs: durationMilliseconds(series.startedAt, series.completedAt),
			aggregate: summarizeMonitorSeries(series.samples),
			samples: series.samples.map(normalizeMonitorSample),
		},
	});
}

export function formatLogsJson(
	snapshot: OsLogSnapshot,
	options: {
		filter?: string;
		level: OsLogLevelFilter;
		limit: number;
		presetId?: string;
	},
): string {
	assertLogSourceCompleted(snapshot);
	const entries = filterOsLogEntries(
		snapshot.entries,
		options.filter,
		options.level,
	).slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT);

	return stringifyLocalInspectorCompleted("logs", {
		request: {
			presetId: options.presetId ?? null,
			limit: options.limit,
			filter: options.filter?.trim()
				? sanitizeLocalInspectorText(options.filter.trim())
				: null,
			level: options.level,
		},
		source: {
			kind: "command",
			name: sanitizeLocalInspectorText(snapshot.source),
			command: sanitizeLocalInspectorText(snapshot.command),
			args: snapshot.args.map(sanitizeLocalInspectorText),
			success: true,
			exitCode: snapshot.exitCode ?? 0,
			truncated: snapshot.truncated ?? false,
			note: sanitizeLocalInspectorText(snapshot.note),
		},
		data: {
			totalCount: snapshot.entries.length,
			visibleCount: entries.length,
			returnedCount: entries.length,
			limit: options.limit,
			// True when the collector filled the window, meaning `level` and `filter`
			// narrowed a set that was already capped and matches may exist further
			// back. A consumer can derive this from totalCount and limit, but only if
			// it knows the limit is applied before filtering, which is the trap.
			limitReached: snapshot.entries.length >= options.limit,
			byteLimit: LOCAL_INSPECTOR_JSON_MAX_BYTES,
			truncated: false,
			entries: entries.map((entry) => ({
				index: entry.index,
				level: entry.level,
				message: sanitizeLocalInspectorText(entry.message),
			})),
		},
	});
}

export function formatProcessJson(input: {
	pid: number;
	filesRequested: boolean;
	presetId?: string;
	detailResult: ProcessDetailResult;
	fileResult?: ProcessFileSnapshotResult;
}): string {
	assertProcessDetailCompleted(input.pid, input.detailResult);
	const detail = input.detailResult.detail;
	if (!detail) {
		throw new LocalInspectorSourceError(
			`Process not found: ${input.pid}`,
			toLocalInspectorSource(input.detailResult.source),
		);
	}
	const fileSnapshot = input.fileResult?.snapshot;
	const fileEntries = fileSnapshot?.fileEntries.length
		? fileSnapshot.fileEntries
		: (fileSnapshot?.openFiles ?? []).map((path) => ({
				descriptor: "file",
				label: "file",
				resourceKind: "file" as const,
				path,
			}));

	return stringifyLocalInspectorCompleted("process", {
		request: {
			presetId: input.presetId ?? null,
			pid: input.pid,
			files: input.filesRequested,
		},
		source: {
			detail: normalizeProcessSource(input.detailResult.source),
			files: input.fileResult
				? normalizeProcessSource(input.fileResult.source)
				: null,
		},
		data: {
			outcome:
				input.fileResult &&
				(input.fileResult.source.supported === false ||
					input.fileResult.source.success === false ||
					input.fileResult.source.truncated)
					? "partial"
					: "ok",
			detail: {
				pid: detail.pid,
				ppid: detail.ppid ?? null,
				user: optionalText(detail.user),
				state: optionalText(detail.state),
				cpu: optionalText(detail.cpu),
				memory: optionalText(detail.memory),
				elapsed: optionalText(detail.elapsed),
				name: sanitizeLocalInspectorText(
					detail.name ?? processName(detail.command),
				),
				executablePath: optionalText(detail.executablePath),
				started: optionalText(detail.started),
			},
			files: {
				requested: input.filesRequested,
				supported: input.fileResult?.source.supported ?? null,
				available: Boolean(fileSnapshot),
				cwd: fileSnapshot?.cwd
					? sanitizeLocalInspectorText(fileSnapshot.cwd)
					: null,
				totalCount: input.fileResult?.source.totalCount ?? 0,
				returnedCount: fileEntries.length,
				truncated:
					(input.fileResult?.source.totalCount ?? 0) > fileEntries.length,
				entries: fileEntries
					.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
					.map((entry) => ({
						descriptor: sanitizeLocalInspectorText(entry.descriptor),
						label: sanitizeLocalInspectorText(entry.label),
						resourceKind: entry.resourceKind,
						path: sanitizeLocalInspectorText(entry.path),
					})),
			},
		},
	});
}

function assertLogSourceCompleted(snapshot: OsLogSnapshot): void {
	if (snapshot.status === "ok" && !snapshot.truncated) return;
	throw new LocalInspectorSourceError(
		snapshot.error || "OS log command failed",
		{
			command: snapshot.command,
			args: snapshot.args,
			success: false,
			exitCode: snapshot.exitCode,
			truncated: snapshot.truncated,
		},
	);
}

function assertProcessDetailCompleted(
	pid: number,
	result: ProcessDetailResult,
): void {
	if (result.source.truncated) {
		throw new LocalInspectorSourceError(
			"Process detail output was truncated",
			toLocalInspectorSource(result.source),
		);
	}
	if (result.source.success === false) {
		throw new LocalInspectorSourceError(
			`Process detail lookup failed for pid ${pid}`,
			toLocalInspectorSource(result.source),
		);
	}
}

function toLocalInspectorSource(
	source: ProcessInspectionSource,
): LocalInspectorSourceResult {
	return {
		command: source.command ?? undefined,
		args: source.args,
		success: source.success ?? undefined,
		exitCode: source.exitCode,
		truncated: source.truncated,
	};
}

function normalizeInventorySource(source: InventorySourceStatus) {
	return {
		key: source.key,
		command: source.command ? sanitizeLocalInspectorText(source.command) : null,
		args: source.args.map(sanitizeLocalInspectorText),
		supported: source.supported,
		success: source.success,
		exitCode: source.exitCode,
		truncated: source.truncated,
		totalCount: source.totalCount ?? null,
	};
}

function normalizeProcessSource(source: ProcessInspectionSource) {
	return {
		key: source.key,
		command: source.command ? sanitizeLocalInspectorText(source.command) : null,
		args: source.args.map(sanitizeLocalInspectorText),
		supported: source.supported,
		success: source.success,
		exitCode: source.exitCode,
		truncated: source.truncated,
		totalCount: source.totalCount,
	};
}

function normalizeProcessSummary(process: ProcessSummary) {
	return {
		pid: process.pid,
		name: sanitizeLocalInspectorText(processName(process.command)),
		cpu: optionalText(process.cpu),
		memory: optionalText(process.memory),
	};
}

function processName(command: string): string {
	const trimmed = command.trim();
	const executable = trimmed.startsWith('"')
		? (trimmed.match(/^"([^"]+)"/)?.[1] ?? trimmed.slice(1))
		: (trimmed.split(/\s+/u)[0] ?? "unknown");
	return executable.replaceAll("\\", "/").split("/").pop() || "unknown";
}

function optionalText(value: string | undefined): string | null {
	return value ? sanitizeLocalInspectorText(value) : null;
}

function finiteNumber(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

function isMonitorSnapshotPartial(snapshot: SystemMonitorSnapshot): boolean {
	return Boolean(
		snapshot.processSource &&
			(snapshot.processSource.supported === false ||
				snapshot.processSource.success === false ||
				snapshot.processSource.truncated),
	);
}

function normalizeMonitorSample(snapshot: SystemMonitorSnapshot) {
	return {
		at: sanitizeLocalInspectorText(snapshot.at),
		uptimeSeconds: finiteNumber(snapshot.uptimeSeconds),
		loadAverage: snapshot.loadAverage.map(finiteNumber),
		memory: {
			totalBytes: finiteNumber(snapshot.memory.totalBytes),
			freeBytes: finiteNumber(snapshot.memory.freeBytes),
			usedBytes: finiteNumber(snapshot.memory.usedBytes),
			usedPercent: finiteNumber(snapshot.memory.usedPercent),
		},
		cpu: {
			model: sanitizeLocalInspectorText(snapshot.cpu.model),
			count: finiteNumber(snapshot.cpu.count),
		},
		processCount: finiteNumber(snapshot.processCount),
		topProcesses: snapshot.topProcesses
			.slice(0, 5)
			.map(normalizeProcessSummary),
	};
}

function summarizeMonitorSeries(samples: SystemMonitorSnapshot[]) {
	return {
		memoryUsedPercent: summarizeNumbers(
			samples.map((sample) => sample.memory.usedPercent),
		),
		loadOneMinute: summarizeNumbers(
			samples.map((sample) => sample.loadAverage[0]),
		),
		processCount: summarizeNumbers(
			samples.map((sample) => sample.processCount),
		),
	};
}

function summarizeNumbers(values: number[]) {
	const finiteValues = values.map(finiteNumber);
	if (finiteValues.length === 0) {
		return { min: 0, max: 0, average: 0, last: 0 };
	}
	const total = finiteValues.reduce((sum, value) => sum + value, 0);
	return {
		min: Math.min(...finiteValues),
		max: Math.max(...finiteValues),
		average: Math.round((total / finiteValues.length) * 100) / 100,
		last: finiteValues[finiteValues.length - 1] ?? 0,
	};
}

function durationMilliseconds(startedAt: string, completedAt: string): number {
	const duration = Date.parse(completedAt) - Date.parse(startedAt);
	return Number.isFinite(duration) && duration > 0 ? duration : 0;
}
