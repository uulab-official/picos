import { normalizeEndpointFilterPresets } from "../core/endpointPresets";
import {
	normalizeConnectionSortPreference,
	normalizePortSortPreference,
} from "../core/endpointSort";
import {
	normalizeLogProfiles,
	normalizeLogSearchPresets,
} from "../core/logProfiles";
import { normalizeRemoteProfiles } from "../core/remotes";
import { normalizeRouteFilterPresets } from "../core/routePresets";
import {
	normalizeToolHistoryDetailPreference,
	normalizeToolHistoryFilterPresets,
	normalizeToolHistoryGroupPreference,
	normalizeToolHistorySortPreference,
	normalizeToolTargetPresets,
} from "../core/toolHistoryPreferences";
import type { PicosConfig, SupportedPlatform } from "../core/types";
import { isSupportedLanguage } from "../i18n/catalog";
import { joinPathLike } from "../utils/pathStyle";

export const defaultConfig: PicosConfig = {
	theme: "dark",
	language: "en",
	refreshInterval: 3000,
	defaultPingHost: "google.com",
	showPublicIp: true,
	enableExperimentalControls: false,
	controlExecutionMode: "disabled",
	allowAdminDryRun: false,
	editorSaveMode: "disabled",
	statusResultJumpClassFilter: "all",
	remoteProfiles: [],
	logProfiles: [],
	logSearchPresets: [],
	routeFilterPresets: [],
	connectionSort: "state",
	portSort: "port",
	connectionFilterPresets: [],
	portFilterPresets: [],
	toolHistoryFilterPresets: [],
	toolHistorySort: "time",
	toolHistoryGroup: "none",
	toolHistoryDetailView: "raw",
	toolTargetPresets: [],
	toolTargetPresetLimit: 8,
	auditArchiveRetentionLimit: 10,
};

export type ConfigInput = Record<string, unknown>;

export function getConfigPathForPlatform(
	platform: SupportedPlatform,
	homeDirectory: string,
	env: NodeJS.ProcessEnv = process.env,
): string {
	if (platform === "win32") {
		return joinPathLike(env.APPDATA ?? homeDirectory, "picos", "config.json");
	}

	if (platform === "darwin") {
		return joinPathLike(
			homeDirectory,
			"Library",
			"Application Support",
			"picos",
			"config.json",
		);
	}

	return joinPathLike(
		env.XDG_CONFIG_HOME ?? joinPathLike(homeDirectory, ".config"),
		"picos",
		"config.json",
	);
}

export function mergeConfig(
	input: ConfigInput | null | undefined,
): PicosConfig {
	const merged = { ...defaultConfig };

	if (!input || typeof input !== "object") {
		return merged;
	}

	if (input.theme === "dark" || input.theme === "light") {
		merged.theme = input.theme;
	}

	if (
		typeof input.language === "string" &&
		isSupportedLanguage(input.language)
	) {
		merged.language = input.language;
	}

	if (
		typeof input.refreshInterval === "number" &&
		Number.isFinite(input.refreshInterval) &&
		input.refreshInterval >= 1000
	) {
		merged.refreshInterval = input.refreshInterval;
	}

	if (
		typeof input.defaultPingHost === "string" &&
		input.defaultPingHost.trim()
	) {
		merged.defaultPingHost = input.defaultPingHost.trim();
	}

	if (typeof input.showPublicIp === "boolean") {
		merged.showPublicIp = input.showPublicIp;
	}

	if (typeof input.enableExperimentalControls === "boolean") {
		merged.enableExperimentalControls = input.enableExperimentalControls;
	}

	if (
		input.controlExecutionMode === "disabled" ||
		input.controlExecutionMode === "dry-run"
	) {
		merged.controlExecutionMode = input.controlExecutionMode;
	}

	if (typeof input.allowAdminDryRun === "boolean") {
		merged.allowAdminDryRun = input.allowAdminDryRun;
	}

	if (
		input.editorSaveMode === "disabled" ||
		input.editorSaveMode === "local-write"
	) {
		merged.editorSaveMode = input.editorSaveMode;
	}

	if (
		input.statusResultJumpClassFilter === "all" ||
		input.statusResultJumpClassFilter === "process" ||
		input.statusResultJumpClassFilter === "timeline" ||
		input.statusResultJumpClassFilter === "tools" ||
		input.statusResultJumpClassFilter === "source"
	) {
		merged.statusResultJumpClassFilter = input.statusResultJumpClassFilter;
	}

	merged.remoteProfiles = normalizeRemoteProfiles(input.remoteProfiles);
	merged.logProfiles = normalizeLogProfiles(input.logProfiles);
	merged.logSearchPresets = normalizeLogSearchPresets(input.logSearchPresets);
	merged.routeFilterPresets = normalizeRouteFilterPresets(
		input.routeFilterPresets,
	);
	merged.connectionSort = normalizeConnectionSortPreference(
		input.connectionSort,
	);
	merged.portSort = normalizePortSortPreference(input.portSort);
	merged.connectionFilterPresets = normalizeEndpointFilterPresets(
		input.connectionFilterPresets,
	);
	merged.portFilterPresets = normalizeEndpointFilterPresets(
		input.portFilterPresets,
	);
	merged.toolHistoryFilterPresets = normalizeToolHistoryFilterPresets(
		input.toolHistoryFilterPresets,
	);
	merged.toolHistorySort = normalizeToolHistorySortPreference(
		input.toolHistorySort,
	);
	merged.toolHistoryGroup = normalizeToolHistoryGroupPreference(
		input.toolHistoryGroup,
	);
	merged.toolHistoryDetailView = normalizeToolHistoryDetailPreference(
		input.toolHistoryDetailView,
	);
	merged.toolTargetPresetLimit = normalizeToolTargetPresetLimit(
		input.toolTargetPresetLimit,
	);
	merged.auditArchiveRetentionLimit = normalizeAuditArchiveRetentionLimit(
		input.auditArchiveRetentionLimit,
	);
	merged.toolTargetPresets = normalizeToolTargetPresets(
		input.toolTargetPresets,
	).slice(0, merged.toolTargetPresetLimit);

	return merged;
}

export function coerceConfigValue(
	key: keyof PicosConfig,
	value: string,
): PicosConfig[keyof PicosConfig] {
	if (key === "theme") {
		if (value !== "dark" && value !== "light") {
			throw new Error("theme must be dark or light");
		}
		return value;
	}

	if (key === "language") {
		if (!isSupportedLanguage(value)) {
			throw new Error("language must be one of en, ko, ja, zh");
		}
		return value;
	}

	if (key === "refreshInterval") {
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed < 1000) {
			throw new Error("refreshInterval must be a number >= 1000");
		}
		return parsed;
	}

	if (key === "controlExecutionMode") {
		if (value !== "disabled" && value !== "dry-run") {
			throw new Error("controlExecutionMode must be disabled or dry-run");
		}
		return value;
	}

	if (key === "editorSaveMode") {
		if (value !== "disabled" && value !== "local-write") {
			throw new Error("editorSaveMode must be disabled or local-write");
		}
		return value;
	}

	if (key === "statusResultJumpClassFilter") {
		if (
			value !== "all" &&
			value !== "process" &&
			value !== "timeline" &&
			value !== "tools" &&
			value !== "source"
		) {
			throw new Error(
				"statusResultJumpClassFilter must be one of all, process, timeline, tools, source",
			);
		}
		return value;
	}

	if (
		key === "showPublicIp" ||
		key === "enableExperimentalControls" ||
		key === "allowAdminDryRun"
	) {
		if (value !== "true" && value !== "false") {
			throw new Error(`${key} must be true or false`);
		}
		return value === "true";
	}

	if (key === "remoteProfiles") {
		throw new Error("remoteProfiles must be edited as JSON in the config file");
	}

	if (key === "logProfiles") {
		throw new Error("logProfiles are managed from the Logs workspace");
	}

	if (key === "logSearchPresets") {
		throw new Error("logSearchPresets are managed from the Logs workspace");
	}

	if (key === "routeFilterPresets") {
		throw new Error("routeFilterPresets are managed from the Routes workspace");
	}

	if (key === "connectionSort") {
		return normalizeConnectionSortPreference(value);
	}

	if (key === "portSort") {
		return normalizePortSortPreference(value);
	}

	if (key === "connectionFilterPresets" || key === "portFilterPresets") {
		throw new Error(
			"endpoint filter presets are managed from endpoint workspaces",
		);
	}

	if (key === "toolHistoryFilterPresets") {
		throw new Error(
			"toolHistoryFilterPresets are managed from the Tools workspace",
		);
	}

	if (key === "toolHistorySort") {
		return normalizeToolHistorySortPreference(value);
	}

	if (key === "toolHistoryGroup") {
		return normalizeToolHistoryGroupPreference(value);
	}

	if (key === "toolHistoryDetailView") {
		return normalizeToolHistoryDetailPreference(value);
	}

	if (key === "toolTargetPresets") {
		throw new Error(
			"toolTargetPresets must be edited as JSON in the config file",
		);
	}

	if (key === "toolTargetPresetLimit") {
		return parseToolTargetPresetLimit(value);
	}

	if (key === "auditArchiveRetentionLimit") {
		return parseAuditArchiveRetentionLimit(value);
	}

	return value;
}

export function isConfigKey(key: string): key is keyof PicosConfig {
	return key in defaultConfig;
}

export function normalizeToolTargetPresetLimit(input: unknown): number {
	if (typeof input !== "number" || !Number.isFinite(input)) {
		return defaultConfig.toolTargetPresetLimit;
	}
	const normalized = Math.floor(input);
	if (normalized < 1) {
		return defaultConfig.toolTargetPresetLimit;
	}
	return Math.min(24, normalized);
}

function parseToolTargetPresetLimit(value: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 24) {
		throw new Error("toolTargetPresetLimit must be a number between 1 and 24");
	}
	return parsed;
}

export function normalizeAuditArchiveRetentionLimit(input: unknown): number {
	if (typeof input !== "number" || !Number.isFinite(input)) {
		return defaultConfig.auditArchiveRetentionLimit;
	}
	const normalized = Math.floor(input);
	if (normalized < 1) {
		return defaultConfig.auditArchiveRetentionLimit;
	}
	return Math.min(60, normalized);
}

function parseAuditArchiveRetentionLimit(value: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
		throw new Error(
			"auditArchiveRetentionLimit must be a number between 1 and 60",
		);
	}
	return parsed;
}
