import {
	createOsLogSnapshot,
	formatOsLogRows,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../../core/osLogs";

export async function logsCommand(
	options: {
		filter?: string;
		level?: OsLogLevelFilter;
		limit?: string;
		snapshot?: OsLogSnapshot;
	} = {},
): Promise<void> {
	const snapshot =
		options.snapshot ??
		(await createOsLogSnapshot({
			limit: options.limit ? Number(options.limit) : undefined,
		}));
	console.log(
		formatOsLogRows(snapshot, {
			filter: options.filter,
			level: options.level,
		}).join("\n"),
	);
}
