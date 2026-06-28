import { cpus, freemem, totalmem } from "node:os";
import type { HardwareSummary } from "./types";

type HardwareSource = {
	cpus: () => Array<{ model?: string }>;
	totalmem: () => number;
	freemem: () => number;
};

export function getHardwareSummary(
	source: HardwareSource = { cpus, totalmem, freemem },
): HardwareSummary {
	const cpuList = source.cpus();
	const firstCpu = cpuList.at(0);

	return {
		cpuModel: firstCpu?.model?.trim() || "unknown",
		cpuCount: cpuList.length,
		totalMemoryBytes: source.totalmem(),
		freeMemoryBytes: source.freemem(),
	};
}
