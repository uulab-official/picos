import {
	formatSystemMonitorRows,
	getSystemMonitorSnapshot,
	type SystemMonitorSnapshot,
} from "../../core/systemMonitor";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { formatMonitorJson } from "../operationsOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function monitorCommand(
	options: { json?: unknown; snapshot?: SystemMonitorSnapshot } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const snapshot = options.snapshot ?? (await getSystemMonitorSnapshot());
		if (json) {
			await writeCliOutput(formatMonitorJson(snapshot));
			return;
		}
		console.log(formatSystemMonitorRows(snapshot).join("\n"));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("monitor", caught, {
				request: { operation: "snapshot" },
			});
		}
		throw caught;
	}
}
