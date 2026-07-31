import {
	assertMonitorSamplingWindow,
	DEFAULT_MONITOR_INTERVAL_MS,
	DEFAULT_MONITOR_SAMPLES,
	parseMonitorInterval,
	parseMonitorSampleCount,
} from "../../core/operationPresets";
import {
	collectSystemMonitorSeries,
	formatSystemMonitorRows,
	getSystemMonitorSnapshot,
	type SystemMonitorSnapshot,
} from "../../core/systemMonitor";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import {
	formatMonitorJson,
	formatMonitorSeriesJson,
} from "../operationsOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

type MonitorCommandOptions = {
	json?: unknown;
	samples?: string | number;
	interval?: string | number;
};

// Sampling seams stay outside the options object, which cac populates from user
// flags, matching processCommand() and operationsCommand().
type MonitorCommandSeams = {
	snapshot?: SystemMonitorSnapshot;
	readSnapshot?: () => Promise<SystemMonitorSnapshot>;
	wait?: (milliseconds: number) => Promise<void>;
	now?: () => string;
};

export async function monitorCommand(
	options: MonitorCommandOptions = {},
	seams: MonitorCommandSeams = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const samples = parseMonitorSampleCount(options.samples);
		const intervalMs = parseMonitorInterval(options.interval);
		assertMonitorSamplingWindow(samples, intervalMs);
		const readSnapshot =
			seams.readSnapshot ??
			(seams.snapshot
				? async () => seams.snapshot as SystemMonitorSnapshot
				: getSystemMonitorSnapshot);
		if (samples === 1) {
			const snapshot = await readSnapshot();
			if (json) {
				await writeCliOutput(formatMonitorJson(snapshot));
				return;
			}
			console.log(formatSystemMonitorRows(snapshot).join("\n"));
			return;
		}
		const series = await collectSystemMonitorSeries(
			{ samples, intervalMs },
			readSnapshot,
			seams.wait,
			seams.now,
		);
		if (json) {
			await writeCliOutput(formatMonitorSeriesJson(series));
			return;
		}
		console.log(
			series.samples
				.map((snapshot, index) =>
					[
						`PICOS MONITOR SAMPLE ${index + 1}/${series.samples.length}`,
						...formatSystemMonitorRows(snapshot).slice(1),
					].join("\n"),
				)
				.join("\n\n"),
		);
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("monitor", caught, {
				request: {
					operation:
						options.samples && Number(options.samples) > 1
							? "sample"
							: "snapshot",
					samples: options.samples ?? DEFAULT_MONITOR_SAMPLES,
					intervalMs: options.interval ?? DEFAULT_MONITOR_INTERVAL_MS,
				},
			});
		}
		throw caught;
	}
}
