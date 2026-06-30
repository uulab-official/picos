import { dirname } from "node:path";
import { getConfigPath } from "../../config/store";
import {
	formatHandoffIndexRows,
	type HandoffIndex,
	readHandoffIndex,
} from "../../core/handoffIndex";

export async function handoffsCommand(
	options: { index?: HandoffIndex; limit?: number } = {},
): Promise<void> {
	const index =
		options.index ??
		(await readHandoffIndex(dirname(getConfigPath()), options.limit ?? 20));
	console.log(
		formatHandoffIndexRows(index, 0, index.items.length + 2).join("\n"),
	);
}
