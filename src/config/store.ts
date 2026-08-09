import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import type { ConnectionSort } from "../core/connections";
import { normalizeEndpointFilterPresets } from "../core/endpointPresets";
import {
	formatConnectionSortPreference,
	formatPortSortPreference,
	normalizeConnectionSortPreference,
	normalizePortSortPreference,
} from "../core/endpointSort";
import { normalizeInterfaceEvidenceSearchPresets } from "../core/interfaceEvidencePreferences";
import {
	normalizeLogProfiles,
	normalizeLogSearchPresets,
} from "../core/logProfiles";
import { normalizeOperationPresets } from "../core/operationPresets";
import type { PortSort } from "../core/ports";
import { normalizeRemoteProfiles } from "../core/remotes";
import { normalizeRouteFilterPresets } from "../core/routePresets";
import {
	normalizeToolHistoryDetailPreference,
	normalizeToolHistoryFilterPresets,
	normalizeToolHistoryGroupPreference,
	normalizeToolHistorySortPreference,
	normalizeToolTargetPresets,
	type ToolHistoryDetailPreference,
	type ToolHistoryGroupPreference,
	type ToolHistorySortPreference,
} from "../core/toolHistoryPreferences";
import type {
	LogProfile,
	OperationPreset,
	PicosConfig,
	SftpRemoteProfile,
} from "../core/types";
import {
	type ConfigWorkspaceResetValues,
	coerceConfigValue,
	defaultConfig,
	getConfigPathForPlatform,
	isConfigKey,
	mergeConfig,
	mergeConfigWorkspaceResetValues,
	normalizeToolTargetPresetLimit,
} from "./schema";

export function getConfigPath(): string {
	return getConfigPathForPlatform(process.platform, homedir(), process.env);
}

const configMutationQueues = new Map<string, Promise<void>>();

function enqueueConfigMutation<T>(
	path: string,
	mutation: () => Promise<T>,
): Promise<T> {
	const previous = configMutationQueues.get(path) ?? Promise.resolve();
	const result = previous.catch(() => undefined).then(mutation);
	const tail = result.then(
		() => undefined,
		() => undefined,
	);
	configMutationQueues.set(path, tail);
	void tail.finally(() => {
		if (configMutationQueues.get(path) === tail) {
			configMutationQueues.delete(path);
		}
	});
	return result;
}

export async function readConfig(path = getConfigPath()): Promise<PicosConfig> {
	try {
		const raw = await readFile(path, "utf8");
		return mergeConfig(JSON.parse(raw));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return defaultConfig;
		}
		throw error;
	}
}

async function writeConfigFile(
	config: PicosConfig,
	path: string,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function writeConfig(
	config: PicosConfig,
	path = getConfigPath(),
): Promise<void> {
	return enqueueConfigMutation(path, () => writeConfigFile(config, path));
}

function updateConfig(
	path: string,
	update: (config: PicosConfig) => PicosConfig,
): Promise<PicosConfig> {
	return mutateConfigAtomically(
		(config) => ({ config: update(config), result: undefined }),
		path,
	).then(({ config }) => config);
}

export function mutateConfigAtomically<Result>(
	mutation: (config: PicosConfig) => { config: PicosConfig; result: Result },
	path = getConfigPath(),
): Promise<{ config: PicosConfig; result: Result }> {
	return enqueueConfigMutation(path, async () => {
		const mutationResult = mutation(await readConfig(path));
		await writeConfigFile(mutationResult.config, path);
		return mutationResult;
	});
}

export async function setConfigValue(
	key: string,
	value: string,
	path = getConfigPath(),
): Promise<PicosConfig> {
	if (!isConfigKey(key)) {
		throw new Error(`Unknown config key: ${key}`);
	}

	return updateConfig(path, (config) => ({
		...config,
		[key]: coerceConfigValue(key, value),
	}));
}

export async function resetConfigWorkspaceValues(
	values: ConfigWorkspaceResetValues,
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) =>
		mergeConfigWorkspaceResetValues(config, values),
	);
}

export async function upsertConfigRemoteProfile(
	profile: SftpRemoteProfile,
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		remoteProfiles: normalizeRemoteProfiles([
			profile,
			...config.remoteProfiles.filter((item) => item.id !== profile.id),
		]),
	}));
}

export async function setConfigLogProfiles(
	profiles: LogProfile[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		logProfiles: normalizeLogProfiles(profiles),
	}));
}

export async function setConfigLogSearchPresets(
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		logSearchPresets: normalizeLogSearchPresets(presets),
	}));
}

export async function setConfigOperationPresets(
	presets: OperationPreset[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		operationPresets: normalizeOperationPresets(presets),
	}));
}

export async function setConfigInterfaceEvidenceSearchPresets(
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		interfaceEvidenceSearchPresets:
			normalizeInterfaceEvidenceSearchPresets(presets),
	}));
}

export async function setConfigRouteFilterPresets(
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		routeFilterPresets: normalizeRouteFilterPresets(presets),
	}));
}

export async function setConfigEndpointFilterPresets(
	kind: "connections" | "ports",
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const key =
		kind === "connections" ? "connectionFilterPresets" : "portFilterPresets";
	return updateConfig(path, (config) => ({
		...config,
		[key]: normalizeEndpointFilterPresets(presets),
	}));
}

export async function setConfigEndpointSort(
	kind: "connections" | "ports",
	sort: ConnectionSort | PortSort,
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) =>
		kind === "connections"
			? {
					...config,
					connectionSort: normalizeConnectionSortPreference(
						formatConnectionSortPreference(sort as ConnectionSort),
					),
				}
			: {
					...config,
					portSort: normalizePortSortPreference(
						formatPortSortPreference(sort as PortSort),
					),
				},
	);
}

export async function setConfigToolHistoryPreferences(
	preferences: {
		detailView?: ToolHistoryDetailPreference;
		filterPresets?: string[];
		group?: ToolHistoryGroupPreference;
		sort?: ToolHistorySortPreference;
	},
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => ({
		...config,
		...(preferences.filterPresets
			? {
					toolHistoryFilterPresets: normalizeToolHistoryFilterPresets(
						preferences.filterPresets,
					),
				}
			: {}),
		...(preferences.sort
			? {
					toolHistorySort: normalizeToolHistorySortPreference(preferences.sort),
				}
			: {}),
		...(preferences.group
			? {
					toolHistoryGroup: normalizeToolHistoryGroupPreference(
						preferences.group,
					),
				}
			: {}),
		...(preferences.detailView
			? {
					toolHistoryDetailView: normalizeToolHistoryDetailPreference(
						preferences.detailView,
					),
				}
			: {}),
	}));
}

export async function setConfigToolTargetPresets(
	presets: unknown,
	path = getConfigPath(),
): Promise<PicosConfig> {
	return updateConfig(path, (config) => {
		const limit = normalizeToolTargetPresetLimit(config.toolTargetPresetLimit);
		return {
			...config,
			toolTargetPresetLimit: limit,
			toolTargetPresets: normalizeToolTargetPresets(presets).slice(0, limit),
		};
	});
}
