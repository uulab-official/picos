import {
	formatConnections,
	getActiveConnections,
	parseConnectionSort,
} from "../../core/connections";

export async function connectionsCommand(
	options: { raw?: boolean; filter?: string; sort?: string } = {},
): Promise<void> {
	const result = await getActiveConnections();
	const sort = parseConnectionSort(options.sort);
	console.log(
		options.raw
			? result.rawOutput
			: formatConnections(result, { filter: options.filter, sort }),
	);
}
