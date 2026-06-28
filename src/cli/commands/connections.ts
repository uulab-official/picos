import {
	formatConnections,
	getActiveConnections,
} from "../../core/connections";

export async function connectionsCommand(
	options: { raw?: boolean } = {},
): Promise<void> {
	const result = await getActiveConnections();
	console.log(options.raw ? result.rawOutput : formatConnections(result));
}
