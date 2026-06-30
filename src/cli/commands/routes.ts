import {
	formatRouteTable,
	parseRouteSort,
	runRoutePath,
	runRouteTable,
} from "../../core/routes";

export async function routesCommand(
	options: { raw?: boolean; sort?: string } = {},
): Promise<void> {
	const result = await runRouteTable();
	const sort = parseRouteSort(options.sort);
	console.log(
		options.raw ? result.rawOutput : formatRouteTable(result, { sort }),
	);
}

export async function routeCommand(destination: string): Promise<void> {
	const result = await runRoutePath(destination);
	console.log(`picos route ${result.destination}`);
	console.log("");
	console.log(`Gateway:   ${result.gateway ?? "-"}`);
	console.log(`Interface: ${result.interfaceName ?? "-"}`);
	console.log(`Source IP: ${result.sourceIp ?? "-"}`);
}
