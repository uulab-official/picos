import {
	formatPorts,
	getListeningPorts,
	parsePortSort,
} from "../../core/ports";

export async function portsCommand(
	options: { raw?: boolean; filter?: string; sort?: string } = {},
): Promise<void> {
	const result = await getListeningPorts();
	const sort = parsePortSort(options.sort);
	console.log(
		options.raw
			? result.rawOutput
			: formatPorts(result, { filter: options.filter, sort }),
	);
}
