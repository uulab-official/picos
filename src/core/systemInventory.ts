import { getConfigPath } from "../config/store";
import { getHardwareSummary } from "./hardware";
import { getNetworkSummary } from "./network";
import { getPermissionSummary } from "./permissions";
import { getProcessSummary } from "./processes";
import { getStorageSummary } from "./storage";
import { getRuntimeSummary, getSystemSummary } from "./system";
import type { SystemInventory } from "./types";

type InventoryOverrides = Partial<SystemInventory> & {
	configPath?: string;
};

export async function createSystemInventory(
	overrides: InventoryOverrides = {},
): Promise<SystemInventory> {
	const configPath = overrides.configPath ?? getConfigPath();

	return {
		system: overrides.system ?? getSystemSummary(),
		hardware: overrides.hardware ?? getHardwareSummary(),
		storage: overrides.storage ?? (await getStorageSummary()),
		processes: overrides.processes ?? (await getProcessSummary()),
		network: overrides.network ?? (await getNetworkSummary()),
		permission: overrides.permission ?? getPermissionSummary(),
		runtime: overrides.runtime ?? getRuntimeSummary(configPath),
	};
}
