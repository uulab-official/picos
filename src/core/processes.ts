import { safeExec } from "../utils/safeExec";
import type { ProcessSummary } from "./types";

export function parsePsOutput(stdout: string, limit = 12): ProcessSummary[] {
	return stdout
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.flatMap((line): ProcessSummary[] => {
			const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
			if (!match) {
				return [];
			}
			return [
				{
					pid: Number(match[1]),
					cpu: match[2],
					memory: match[3],
					command: match[4],
				},
			];
		})
		.slice(0, limit);
}

export async function getProcessSummary(limit = 12): Promise<ProcessSummary[]> {
	if (process.platform === "win32") {
		return [];
	}

	const result = await safeExec("ps", ["-axo", "pid,pcpu,pmem,command"], {
		timeoutMs: 5000,
	});
	if (!result.success) {
		return [];
	}

	return parsePsOutput(result.stdout, limit);
}
