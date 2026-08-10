import { getConfigPath } from "../config/store";
import { getHardwareSummary } from "./hardware";
import { getNetworkSummary } from "./network";
import { getPermissionSummary } from "./permissions";
import { collectDeveloperPlugin } from "./plugins";
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
	const [storageResult, processResult, dockerSnapshot] = await Promise.all([
		overrides.storage === undefined ? getStorageSummaryWithSource() : undefined,
		overrides.processes === undefined
			? getProcessSummaryWithSource(FULL_INVENTORY_PROCESS_LIMIT)
			: undefined,
		overrides.plugins === undefined
			? collectDeveloperPlugin("docker")
			: undefined,
	]);

	return {
		system: overrides.system ?? getSystemSummary(),
		hardware: overrides.hardware ?? getHardwareSummary(),
		storage: overrides.storage ?? storageResult?.volumes ?? [],
		processes: overrides.processes ?? processResult?.processes ?? [],
		network: overrides.network ?? (await getNetworkSummary()),
		permission: overrides.permission ?? getPermissionSummary(),
		runtime: overrides.runtime ?? getRuntimeSummary(configPath),
		plugins: overrides.plugins ?? (dockerSnapshot ? [dockerSnapshot] : []),
		sources:
			overrides.sources ??
			[storageResult?.source, processResult?.source].filter(
				(source): source is NonNullable<typeof source> => source !== undefined,
			),
	};
}
