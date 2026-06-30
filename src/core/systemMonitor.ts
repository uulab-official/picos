import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";
import { getProcessSummary } from "./processes";
import type { ProcessSummary } from "./types";

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
		processCount: input.processes.length,
		topProcesses: sortTopProcesses(input.processes).slice(0, 5),
	};
}

export async function getSystemMonitorSnapshot(): Promise<SystemMonitorSnapshot> {
	const cpuList = cpus();
	const processes = await getProcessSummary(24);
	return createSystemMonitorSnapshot({
		uptimeSeconds: uptime(),
		loadAverage: loadavg(),
		totalMemoryBytes: totalmem(),
		freeMemoryBytes: freemem(),
		cpuModel: cpuList[0]?.model ?? "unknown",
		cpuCount: cpuList.length,
		processes,
	});
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
