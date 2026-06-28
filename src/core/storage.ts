import { safeExec } from "../utils/safeExec";
import type { StorageVolume } from "./types";

export function parseDfOutput(stdout: string): StorageVolume[] {
	return stdout
		.split(/\r?\n/)
		.slice(1)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.split(/\s+/))
		.filter((parts) => parts.length >= 6)
		.map((parts) => {
			const [filesystem, size, used, available, capacity] = parts;
			const mountParts = parts.length >= 9 ? parts.slice(8) : parts.slice(5);
			return {
				filesystem,
				size,
				used,
				available,
				capacity,
				mount: mountParts.join(" "),
			};
		});
}

export async function getStorageSummary(): Promise<StorageVolume[]> {
	if (process.platform === "win32") {
		return [];
	}

	const result = await safeExec("df", ["-h"], { timeoutMs: 5000 });
	if (!result.success) {
		return [];
	}

	return parseDfOutput(result.stdout);
}
