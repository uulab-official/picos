import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";
import {
	assertMonitorSamplingWindow,
	parseMonitorInterval,
	parseMonitorSampleCount,
} from "./operationPresets";
import { getProcessSummaryWithSource } from "./processes";
import type { InventorySourceStatus, ProcessSummary } from "./types";

export type SystemMonitorSnapshot = {
	at: string;
	uptimeSeconds: number;
	loadAverage: [number, number, number];
	memory: {
		totalBytes: number;
		freeBytes: number;
		usedBytes: number;
		usedPercent: number;
	};
	cpu: {
		model: string;
		count: number;
	};
	processCount: number;
	topProcesses: ProcessSummary[];
	processSource?: InventorySourceStatus;
};

export type SystemMonitorSeries = {
	startedAt: string;
	completedAt: string;
	requestedCount: number;
	intervalMs: number;
	samples: SystemMonitorSnapshot[];
	// True when sampling stopped before reaching `requestedCount`. `samples.length`
	// already implies it, but only for a reader who knows the two are otherwise
	// always equal, so the fact is stated rather than left to be derived.
	cancelled: boolean;
};

export function createSystemMonitorSnapshot(input: {
	now?: string;
	uptimeSeconds: number;
	loadAverage: [number, number, number] | number[];
	totalMemoryBytes: number;
	freeMemoryBytes: number;
	cpuModel: string;
	cpuCount: number;
	processes: ProcessSummary[];
	processSource?: InventorySourceStatus;
}): SystemMonitorSnapshot {
	const usedBytes = Math.max(0, input.totalMemoryBytes - input.freeMemoryBytes);
	const usedPercent =
		input.totalMemoryBytes > 0
			? Math.round((usedBytes / input.totalMemoryBytes) * 100)
			: 0;
	const loadAverage = normalizeLoadAverage(input.loadAverage);

	return {
		at: input.now ?? new Date().toISOString(),
		uptimeSeconds: input.uptimeSeconds,
		loadAverage,
		memory: {
			totalBytes: input.totalMemoryBytes,
			freeBytes: input.freeMemoryBytes,
			usedBytes,
			usedPercent,
		},
		cpu: {
			model: input.cpuModel,
			count: input.cpuCount,
		},
		processCount: input.processSource?.totalCount ?? input.processes.length,
		topProcesses: sortTopProcesses(input.processes).slice(0, 5),
		...(input.processSource ? { processSource: input.processSource } : {}),
	};
}

export async function getSystemMonitorSnapshot(): Promise<SystemMonitorSnapshot> {
	const cpuList = cpus();
	const processResult = await getProcessSummaryWithSource(24);
	return createSystemMonitorSnapshot({
		uptimeSeconds: uptime(),
		loadAverage: loadavg(),
		totalMemoryBytes: totalmem(),
		freeMemoryBytes: freemem(),
		cpuModel: cpuList[0]?.model ?? "unknown",
		cpuCount: cpuList.length,
		processes: processResult.processes,
		processSource: processResult.source,
	});
}

export async function collectSystemMonitorSeries(
	options: { samples: number; intervalMs: number },
	readSnapshot: () => Promise<SystemMonitorSnapshot> = getSystemMonitorSnapshot,
	wait: (milliseconds: number) => Promise<void> = delay,
	now: () => string = () => new Date().toISOString(),
	// Consulted after each sample rather than before, so a stopped run always keeps
	// the samples it already paid for and never sleeps through an interval for a
	// sample it will not take. The request is bounded without this; it exists so a
	// caller that cannot wait out the whole interval span can stop early instead of
	// being forced to abandon the result.
	shouldContinue: () => boolean = () => true,
): Promise<SystemMonitorSeries> {
	const requestedCount = parseMonitorSampleCount(options.samples);
	const intervalMs = parseMonitorInterval(options.intervalMs);
	assertMonitorSamplingWindow(requestedCount, intervalMs);
	const startedAt = now();
	const samples: SystemMonitorSnapshot[] = [];
	let cancelled = false;
	for (let index = 0; index < requestedCount; index += 1) {
		if (index > 0) await wait(intervalMs);
		samples.push(await readSnapshot());
		if (index + 1 < requestedCount && !shouldContinue()) {
			cancelled = true;
			break;
		}
	}
	return {
		startedAt,
		completedAt: now(),
		requestedCount,
		intervalMs,
		samples,
		cancelled,
	};
}

export function formatSystemMonitorRows(
	snapshot: SystemMonitorSnapshot,
): string[] {
	return [
		"PICOS SYSTEM MONITOR",
		`at=${snapshot.at} uptime=${formatMonitorUptime(snapshot.uptimeSeconds)}`,
		`load=${snapshot.loadAverage.map((value) => value.toFixed(2)).join(",")}`,
		`memory=${snapshot.memory.usedBytes}/${snapshot.memory.totalBytes} bytes used percent=${snapshot.memory.usedPercent} free=${snapshot.memory.freeBytes}`,
		`cpu=${snapshot.cpu.model} cores=${snapshot.cpu.count}`,
		`processes=${snapshot.processCount}`,
		...snapshot.topProcesses.map(
			(item) =>
				`top pid=${item.pid} cpu=${item.cpu ?? "-"} mem=${item.memory ?? "-"} cmd=${item.command}`,
		),
	];
}

function normalizeLoadAverage(
	values: number[] | [number, number, number],
): [number, number, number] {
	return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}

function sortTopProcesses(processes: ProcessSummary[]): ProcessSummary[] {
	return [...processes].sort(
		(left, right) => parseMetric(right.cpu) - parseMetric(left.cpu),
	);
}

function parseMetric(value: string | undefined): number {
	if (!value) {
		return 0;
	}
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatMonitorUptime(seconds: number): string {
	const totalMinutes = Math.floor(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours <= 0) {
		return `${minutes}m`;
	}
	return `${hours}h ${minutes}m`;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
