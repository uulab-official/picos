import {
	formatConnections,
	getActiveConnections,
	parseConnectionSort,
} from "../../core/connections";
import {
	assertLocalJsonOptions,
	formatConnectionsJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function connectionsCommand(
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
		const sort = parseConnectionSort(options.sort);
		const result = await getActiveConnections();
		if (json) {
			await writeCliOutput(
				formatConnectionsJson(result, { filter: options.filter, sort }),
			);
			return;
		}
		console.log(
			options.raw
				? result.rawOutput
				: formatConnections(result, { filter: options.filter, sort }),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("connections", caught, {
				request: { filter: options.filter, sort: options.sort },
			});
		}
		throw caught;
	}
}
