import {
	formatRouteTable,
	parseRouteSort,
	runRoutePath,
	runRouteTable,
} from "../../core/routes";
import {
	assertLocalJsonOptions,
	formatRoutePathJson,
	formatRoutesJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function routesCommand(
	options: {
		filter?: string | number;
		json?: unknown;
		raw?: boolean;
		sort?: string;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const sort = parseRouteSort(options.sort);
		const result = await runRouteTable();
		const filter =
			options.filter === undefined ? undefined : String(options.filter);
		if (json) {
			await writeCliOutput(formatRoutesJson(result, { filter, sort }));
			return;
		}
		console.log(
			options.raw
				? result.rawOutput
				: formatRouteTable(result, { filter, sort }),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("routes", caught, {
				request: { filter: options.filter, sort: options.sort },
			});
		}
		throw caught;
	}
}

export async function routeCommand(
	destination: string,
	options: { json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const result = await runRoutePath(destination);
		if (json) {
			await writeCliOutput(formatRoutePathJson(result));
			return;
		}
		console.log(`picos route ${result.destination}`);
		console.log("");
		console.log(`Gateway:   ${result.gateway ?? "-"}`);
		console.log(`Interface: ${result.interfaceName ?? "-"}`);
		console.log(`Source IP: ${result.sourceIp ?? "-"}`);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("route", caught, {
				request: { destination },
			});
		}
		throw caught;
	}
}
