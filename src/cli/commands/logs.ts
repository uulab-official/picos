import {
	DEFAULT_OPERATION_LOG_LEVEL,
	DEFAULT_OPERATION_LOG_LIMIT,
	parseOperationLogFilter,
	parseOperationLogLevel,
	parseOperationLogLimit,
} from "../../core/operationPresets";
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

type LogsCommandOptions = {
	filter?: string;
	level?: OsLogLevelFilter;
	limit?: string;
	json?: unknown;
};

// The snapshot seam stays outside the options object, which cac populates from
// user flags, matching processCommand() and operationsCommand().
type LogsCommandSeams = {
	snapshot?: OsLogSnapshot;
};

export async function logsCommand(
	options: LogsCommandOptions = {},
	seams: LogsCommandSeams = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const limit = parseLogsLimit(options.limit);
		const level = parseLogsLevel(options.level);
		const filter = parseLogsFilter(options.filter);
		const snapshot = seams.snapshot ?? (await createOsLogSnapshot({ limit }));
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
					limit: options.limit ?? DEFAULT_OPERATION_LOG_LIMIT,
					filter: options.filter,
					level: options.level ?? DEFAULT_OPERATION_LOG_LEVEL,
				},
			});
		}
		throw caught;
	}
}

export function parseLogsLimit(value: string | number | undefined): number {
	return parseOperationLogLimit(value);
}

export function parseLogsLevel(value: unknown): OsLogLevelFilter {
	return parseOperationLogLevel(value);
}

export function parseLogsFilter(value: string | undefined): string | undefined {
	return parseOperationLogFilter(value);
}
