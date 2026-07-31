import { dirname } from "node:path";
import { getConfigPath } from "../../config/store";
import {
	archiveHandoffFile,
	formatHandoffIndexRows,
	type HandoffArchiveResult,
	type HandoffIndex,
	readHandoffIndex,
} from "../../core/handoffIndex";
import {
	assertLocalJsonOptions,
	formatHandoffArchiveJson,
	formatHandoffsJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

const DEFAULT_HANDOFF_INDEX_LIMIT = 20;

export async function handoffsCommand(
	options: {
		archive?: string;
		archiver?: (
			baseDir: string,
			targetPath: string,
		) => Promise<HandoffArchiveResult>;
		baseDir?: string;
		index?: HandoffIndex;
		json?: unknown;
		limit?: number;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	const limit = options.limit ?? DEFAULT_HANDOFF_INDEX_LIMIT;
	try {
		const json = assertLocalJsonOptions(options);
		const baseDir = options.baseDir ?? dirname(getConfigPath());
		if (options.archive) {
			const result = await (options.archiver ?? archiveHandoffFile)(
				baseDir,
				options.archive,
			);
			if (json) {
				await writeCliOutput(
					formatHandoffArchiveJson(result, { archive: options.archive }),
				);
				return;
			}
			console.log(
				[
					`HANDOFF ARCHIVE ${result.status}`,
					`source=${result.sourcePath}`,
					`archive=${result.archivedPath || "-"}`,
					`message=${result.message}`,
				].join("\n"),
			);
			return;
		}

		const index = options.index ?? (await readHandoffIndex(baseDir, limit));
		if (json) {
			await writeCliOutput(formatHandoffsJson(index, { limit }));
			return;
		}
		console.log(
			formatHandoffIndexRows(index, 0, index.items.length + 3).join("\n"),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("handoffs", caught, {
				request: {
					action: options.archive ? "archive" : "list",
					archive: options.archive,
					limit,
				},
			});
		}
		throw caught;
	}
}
