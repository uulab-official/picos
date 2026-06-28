import { formatPorts, getListeningPorts } from "../../core/ports";

export async function portsCommand(
	options: { raw?: boolean } = {},
): Promise<void> {
	const result = await getListeningPorts();
	console.log(options.raw ? result.rawOutput : formatPorts(result));
}
