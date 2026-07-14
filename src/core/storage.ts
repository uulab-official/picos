import { safeExec } from "../utils/safeExec";
import type {
	InventorySourceStatus,
	StorageVolume,
	SupportedPlatform,
} from "./types";

export type StorageSummaryResult = {
	volumes: StorageVolume[];
	source: InventorySourceStatus;
};

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
	return (await getStorageSummaryWithSource()).volumes;
}

export async function getStorageSummaryWithSource(
	platform: SupportedPlatform = process.platform,
): Promise<StorageSummaryResult> {
	if (platform === "win32") {
		return {
			volumes: [],
			source: unsupportedInventorySource("storage"),
		};
	}

	const result = await safeExec("df", ["-h"], { timeoutMs: 5000 });
	const volumes = result.success ? parseDfOutput(result.stdout) : [];
	return {
		volumes,
		source: {
			key: "storage",
			command: "df",
			args: ["-h"],
			supported: true,
			success: result.success,
			exitCode: result.exitCode,
			truncated: result.truncated ?? false,
			totalCount: volumes.length,
		},
	};
}

function unsupportedInventorySource(
	key: InventorySourceStatus["key"],
): InventorySourceStatus {
	return {
		key,
		command: null,
		args: [],
		supported: false,
		success: null,
		exitCode: null,
		truncated: false,
		totalCount: 0,
	};
}
