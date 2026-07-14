import {
	formatPorts,
	getListeningPorts,
	parsePortSort,
} from "../../core/ports";
import {
	assertLocalJsonOptions,
	formatPortsJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function portsCommand(
	options: {
		raw?: boolean;
		json?: unknown;
		filter?: string | number;
		sort?: string;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const sort = parsePortSort(options.sort);
		const result = await getListeningPorts();
		if (json) {
			await writeCliOutput(
				formatPortsJson(result, { filter: options.filter, sort }),
			);
			return;
		}
		console.log(
			options.raw
				? result.rawOutput
				: formatPorts(result, { filter: options.filter, sort }),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("ports", caught, {
				request: { filter: options.filter, sort: options.sort },
			});
		}
		throw caught;
	}
}
