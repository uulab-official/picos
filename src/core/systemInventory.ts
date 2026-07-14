import { getConfigPath } from "../config/store";
import { getHardwareSummary } from "./hardware";
import { getNetworkSummary } from "./network";
import { getPermissionSummary } from "./permissions";
import { getProcessSummaryWithSource } from "./processes";
import { getStorageSummaryWithSource } from "./storage";
import { getRuntimeSummary, getSystemSummary } from "./system";
import type { SystemInventory } from "./types";

type InventoryOverrides = Partial<SystemInventory> & {
	configPath?: string;
};

const FULL_INVENTORY_PROCESS_LIMIT = 10_000;

export async function createSystemInventory(
	overrides: InventoryOverrides = {},
): Promise<SystemInventory> {
	const configPath = overrides.configPath ?? getConfigPath();
	const storageResult =
		overrides.storage === undefined
			? await getStorageSummaryWithSource()
			: undefined;
	const processResult =
		overrides.processes === undefined
			? await getProcessSummaryWithSource(FULL_INVENTORY_PROCESS_LIMIT)
			: undefined;

	return {
		system: overrides.system ?? getSystemSummary(),
		hardware: overrides.hardware ?? getHardwareSummary(),
		storage: overrides.storage ?? storageResult?.volumes ?? [],
		processes: overrides.processes ?? processResult?.processes ?? [],
		network: overrides.network ?? (await getNetworkSummary()),
		permission: overrides.permission ?? getPermissionSummary(),
		runtime: overrides.runtime ?? getRuntimeSummary(configPath),
		sources:
			overrides.sources ??
			[storageResult?.source, processResult?.source].filter(
				(source): source is NonNullable<typeof source> => source !== undefined,
			),
	};
}
