import {
	createOsLogSnapshot,
	formatOsLogRows,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../../core/osLogs";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { formatLogsJson } from "../operationsOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_FILTER_LENGTH = 256;

export async function logsCommand(
	options: {
		filter?: string;
		level?: OsLogLevelFilter;
		limit?: string;
		json?: unknown;
		snapshot?: OsLogSnapshot;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const limit = parseLogsLimit(options.limit);
		const level = parseLogsLevel(options.level);
		const filter = parseLogsFilter(options.filter);
		const snapshot = options.snapshot ?? (await createOsLogSnapshot({ limit }));
		if (json) {
			await writeCliOutput(formatLogsJson(snapshot, { filter, level, limit }));
			return;
		}
		console.log(formatOsLogRows(snapshot, { filter, level }).join("\n"));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("logs", caught, {
				request: {
					limit: options.limit ?? DEFAULT_LOG_LIMIT,
					filter: options.filter,
					level: options.level ?? "all",
				},
			});
		}
		throw caught;
	}
}

export function parseLogsLimit(value: string | number | undefined): number {
	if (value === undefined) return DEFAULT_LOG_LIMIT;
	const limit = Number(value);
	if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
		throw new Error("Invalid OS log limit; expected an integer from 1 to 200");
	}
	return limit;
}

export function parseLogsLevel(value: unknown): OsLogLevelFilter {
	if (value === undefined) return "all";
	if (
		value === "all" ||
		value === "warn" ||
		value === "fail" ||
		value === "info"
	) {
		return value;
	}
	throw new Error("Invalid OS log level; expected all, warn, fail, or info");
}

export function parseLogsFilter(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const filter = String(value).trim();
	if (filter.length > MAX_LOG_FILTER_LENGTH) {
		throw new Error(
			`Invalid OS log filter; expected at most ${MAX_LOG_FILTER_LENGTH} characters`,
		);
	}
	return filter || undefined;
}
