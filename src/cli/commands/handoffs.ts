import { dirname } from "node:path";
import { getConfigPath } from "../../config/store";
import {
	archiveHandoffFile,
	formatHandoffIndexRows,
	type HandoffArchiveResult,
	type HandoffIndex,
	readHandoffIndex,
} from "../../core/handoffIndex";

export async function handoffsCommand(
	options: {
		archive?: string;
		archiver?: (
			baseDir: string,
			targetPath: string,
		) => Promise<HandoffArchiveResult>;
		baseDir?: string;
		index?: HandoffIndex;
		limit?: number;
	} = {},
): Promise<void> {
	const baseDir = options.baseDir ?? dirname(getConfigPath());
	if (options.archive) {
		const result = await (options.archiver ?? archiveHandoffFile)(
			baseDir,
			options.archive,
		);
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

	const index =
		options.index ?? (await readHandoffIndex(baseDir, options.limit ?? 20));
	console.log(
		formatHandoffIndexRows(index, 0, index.items.length + 3).join("\n"),
	);
}
