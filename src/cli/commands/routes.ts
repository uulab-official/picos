import {
	formatRouteTable,
	runRoutePath,
	runRouteTable,
} from "../../core/routes";

export async function routesCommand(
	options: { raw?: boolean } = {},
): Promise<void> {
	const result = await runRouteTable();
	console.log(options.raw ? result.rawOutput : formatRouteTable(result));
}

export async function routeCommand(destination: string): Promise<void> {
	const result = await runRoutePath(destination);
	console.log(`picos route ${result.destination}`);
	console.log("");
	console.log(`Gateway:   ${result.gateway ?? "-"}`);
	console.log(`Interface: ${result.interfaceName ?? "-"}`);
	console.log(`Source IP: ${result.sourceIp ?? "-"}`);
}
