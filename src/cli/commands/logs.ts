import {
	createOsLogSnapshot,
	formatOsLogRows,
	type OsLogSnapshot,
} from "../../core/osLogs";

export async function logsCommand(
	options: { limit?: string; snapshot?: OsLogSnapshot } = {},
): Promise<void> {
	const snapshot =
		options.snapshot ??
		(await createOsLogSnapshot({
			limit: options.limit ? Number(options.limit) : undefined,
		}));
	console.log(formatOsLogRows(snapshot).join("\n"));
}
