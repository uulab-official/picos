import {
	formatSystemMonitorRows,
	getSystemMonitorSnapshot,
	type SystemMonitorSnapshot,
} from "../../core/systemMonitor";

export async function monitorCommand(
	options: { snapshot?: SystemMonitorSnapshot } = {},
): Promise<void> {
	const snapshot = options.snapshot ?? (await getSystemMonitorSnapshot());
	console.log(formatSystemMonitorRows(snapshot).join("\n"));
}
