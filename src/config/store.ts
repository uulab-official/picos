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
import {
	normalizeLogProfiles,
	normalizeLogSearchPresets,
} from "../core/logProfiles";
import type { PortSort } from "../core/ports";
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
import type { LogProfile, PicosConfig } from "../core/types";
import {
	coerceConfigValue,
	defaultConfig,
	getConfigPathForPlatform,
	isConfigKey,
	mergeConfig,
	normalizeToolTargetPresetLimit,
} from "./schema";

export function getConfigPath(): string {
	return getConfigPathForPlatform(process.platform, homedir(), process.env);
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

export async function writeConfig(
	config: PicosConfig,
	path = getConfigPath(),
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function setConfigValue(
	key: string,
	value: string,
	path = getConfigPath(),
): Promise<PicosConfig> {
	if (!isConfigKey(key)) {
		throw new Error(`Unknown config key: ${key}`);
	}

	const config = await readConfig(path);
	const next = {
		...config,
		[key]: coerceConfigValue(key, value),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigLogProfiles(
	profiles: LogProfile[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const next = {
		...config,
		logProfiles: normalizeLogProfiles(profiles),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigLogSearchPresets(
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const next = {
		...config,
		logSearchPresets: normalizeLogSearchPresets(presets),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigRouteFilterPresets(
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const next = {
		...config,
		routeFilterPresets: normalizeRouteFilterPresets(presets),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigEndpointFilterPresets(
	kind: "connections" | "ports",
	presets: string[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const key =
		kind === "connections" ? "connectionFilterPresets" : "portFilterPresets";
	const next = {
		...config,
		[key]: normalizeEndpointFilterPresets(presets),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigEndpointSort(
	kind: "connections" | "ports",
	sort: ConnectionSort | PortSort,
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const next =
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
				};
	await writeConfig(next, path);
	return next;
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
	const config = await readConfig(path);
	const next = {
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
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigToolTargetPresets(
	presets: unknown,
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const limit = normalizeToolTargetPresetLimit(config.toolTargetPresetLimit);
	const next = {
		...config,
		toolTargetPresetLimit: limit,
		toolTargetPresets: normalizeToolTargetPresets(presets).slice(0, limit),
	};
	await writeConfig(next, path);
	return next;
}
