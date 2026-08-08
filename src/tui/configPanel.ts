import { defaultConfig } from "../config/schema";
import { filterConnections } from "../core/connections";
import type { FileOpenOrigin } from "../core/fileOpen";
import { formatLogProfileLabel, nextLogProfile } from "../core/logProfiles";
import { filterOsLogEntries, type OsLogEntry } from "../core/osLogs";
import { filterListeningPorts } from "../core/ports";
import { filterRouteEntries, type RouteEntry } from "../core/routes";
import type {
	ActiveConnection,
	ListeningPort,
	LogProfile,
	PicosConfig,
} from "../core/types";
import { nextEndpointFilterPreset } from "./endpointPanel";
import type { FocusArea, Screen } from "./navigation";
import { clampIndex, getNextIndex } from "./navigation";
import { nextRouteFilterPreset } from "./routePanel";
import type { ToolTargetPreset } from "./toolHistory";

export type ConfigWorkspaceItemKey =
	| "auditArchiveRetentionLimit"
	| "toolTargetPresetLimit"
	| "language"
	| "refreshInterval"
	| "statusResultJumpClassFilter"
	| "defaultPingHost"
	| "controlExecutionMode"
	| "allowAdminDryRun"
	| "editorSaveMode";

type ConfigWorkspaceItemKind = "number" | "choice" | "text" | "boolean";

type ConfigWorkspaceValue = number | string | boolean;

export type ConfigWorkspaceSectionId =
	| "display"
	| "safety"
	| "retention"
	| "connectivity";

export type ConfigPolicyPresetId =
	| "safe-readonly"
	| "user-dry-run"
	| "admin-dry-run";

type ConfigPolicyValues = Pick<
	PicosConfig,
	| "controlExecutionMode"
	| "allowAdminDryRun"
	| "enableExperimentalControls"
	| "editorSaveMode"
>;

export type ConfigPolicyPresetPreview = {
	id: ConfigPolicyPresetId;
	label: string;
	values: ConfigPolicyValues;
	rows: string[];
};

export type ConfigWorkspaceResetPreview = {
	scope: "core controls";
	confirmationPhrase: "reset config";
	values: ConfigWorkspaceResetValues;
	changedKeys: ConfigWorkspaceResetKey[];
	rows: string[];
};

export type ConfigWorkspaceResetConfirmation = {
	confirmed: boolean;
	message: string;
	preview: ConfigWorkspaceResetPreview;
};

export type ConfigWorkspaceNotice = {
	level: "info" | "ok" | "warn";
	message: string;
};

export type ConfigWorkspaceAdjustmentTransition =
	| {
			kind: "write";
			key: ConfigWorkspaceItemKey;
			value: ConfigWorkspaceValue;
			notice: ConfigWorkspaceNotice;
	  }
	| { kind: "notice"; notice: ConfigWorkspaceNotice };

export type ConfigWorkspaceResetSubmissionTransition =
	| {
			kind: "write";
			values: ConfigWorkspaceResetValues;
			notice: ConfigWorkspaceNotice;
	  }
	| { kind: "notice"; notice: ConfigWorkspaceNotice };

export type ConfigPolicyPresetTransition = {
	kind: "write";
	config: PicosConfig;
	notices: ConfigWorkspaceNotice[];
};

export type ConfigWorkspaceResetOpenTransition = {
	preview: ConfigWorkspaceResetPreview;
	commandLinePrompt: "config-reset";
	notice: ConfigWorkspaceNotice;
};

export type ConfigWorkspaceResetWriteIntent = {
	config: PicosConfig;
};

export type ConfigWorkspaceFocusTransition =
	| {
			kind: "focus";
			screen: "config";
			focusArea: "workspaces";
			selectedIndex: number;
			notice: ConfigWorkspaceNotice;
	  }
	| { kind: "notice"; notice: ConfigWorkspaceNotice };

export type ConfigManagedShelfStateEffect =
	| { kind: "screen"; screen: Screen }
	| { kind: "focus-area"; focusArea: FocusArea }
	| { kind: "shelf-landing"; target: ConfigManagedShelfTarget }
	| {
			kind: "command-line";
			prompt:
				| "route-filter"
				| "endpoint-filter:connections"
				| "endpoint-filter:ports"
				| "log-search"
				| "tool-target-preset"
				| "remote-profile";
	  }
	| { kind: "interface-selection"; index: number }
	| { kind: "route-detail-view"; view: "table" }
	| { kind: "route-copy-preview"; value: false }
	| { kind: "route-filter"; value: string }
	| { kind: "connection-copy-preview"; value: false }
	| { kind: "connection-filter"; value: string }
	| { kind: "connection-selection"; index: number }
	| { kind: "port-copy-preview"; value: false }
	| { kind: "port-process-preview"; value: false }
	| { kind: "port-filter"; value: string }
	| { kind: "port-selection"; index: number }
	| { kind: "tool-target-selection"; index: number }
	| { kind: "tool-detail-view"; view: "summary" }
	| { kind: "tool-copy-preview"; value: false }
	| { kind: "log-level"; value: LogProfile["level"] }
	| { kind: "log-query"; value: string }
	| { kind: "remote-selection"; index: number };

export type ConfigManagedShelfApplyTransition = {
	kind: "apply";
	effects: ConfigManagedShelfStateEffect[];
	notice: ConfigWorkspaceNotice;
};

export type ConfigManagedShelfFocusTransition =
	| { kind: "no-op" }
	| ConfigManagedShelfApplyTransition;

export type ConfigManagedShelfFocusActionInput = {
	target: ConfigManagedShelfTarget | undefined;
	screen: Screen;
	network?: { interfaceCount: number };
	routes?: { presets: string[]; query: string; entries: RouteEntry[] };
	connections?: {
		presets: string[];
		query: string;
		entries: ActiveConnection[];
	};
	ports?: { presets: string[]; query: string; entries: ListeningPort[] };
	tools?: { presets: ToolTargetPreset[]; selectedIndex: number };
	logs?: {
		profiles: LogProfile[];
		level: LogProfile["level"];
		query: string;
		entries: OsLogEntry[];
	};
	remotes?: { profileCount: number };
};

export type ConfigManagedShelfJumpCounts = Partial<
	Record<ConfigManagedShelfTarget, number>
>;

export type ConfigManagedShelfJumpOrigin =
	| "keyboard"
	| "palette"
	| "recovery-palette";

export type ConfigManagedShelfJumpInput = {
	origin?: ConfigManagedShelfJumpOrigin;
	counts?: ConfigManagedShelfJumpCounts;
};

export type ConfigManagedShelfLandingDismissTransition =
	| { kind: "clear"; notice: ConfigWorkspaceNotice }
	| { kind: "no-op" };

export type ConfigSessionSyncIntent = Pick<
	PicosConfig,
	| "auditArchiveRetentionLimit"
	| "toolTargetPresetLimit"
	| "language"
	| "refreshInterval"
	| "defaultPingHost"
	| "enableExperimentalControls"
	| "editorSaveMode"
	| "showPublicIp"
	| "controlExecutionMode"
	| "allowAdminDryRun"
	| "statusResultJumpClassFilter"
	| "interfaceEvidenceSearchPresets"
	| "operationPresets"
	| "toolTargetPresets"
	| "remoteProfiles"
>;

type ConfigWorkspaceResetKey =
	| "auditArchiveRetentionLimit"
	| "toolTargetPresetLimit"
	| "language"
	| "refreshInterval"
	| "defaultPingHost"
	| "controlExecutionMode"
	| "allowAdminDryRun"
	| "enableExperimentalControls"
	| "editorSaveMode"
	| "statusResultJumpClassFilter";

type ConfigWorkspaceResetValues = Pick<PicosConfig, ConfigWorkspaceResetKey>;

export type ConfigManagedShelfTarget =
	| "network"
	| "routes"
	| "connections"
	| "ports"
	| "tools"
	| "logs"
	| "remotes";

export type ConfigManagedShelfHandoff = {
	target: ConfigManagedShelfTarget;
	workspace: Screen;
	label: string;
};

export type ConfigManagedShelfFocusCursor =
	| "interfaceList"
	| "routeFilters"
	| "connectionFilters"
	| "portFilters"
	| "toolTargetPresets"
	| "logProfiles"
	| "remoteProfiles";

export type ConfigManagedShelfFocusPreset = ConfigManagedShelfHandoff & {
	focusArea: FocusArea;
	cursor: ConfigManagedShelfFocusCursor;
	index: number;
	detailView?: "table" | "summary";
	rows: string[];
};

export type ConfigManagedShelfFocusAction =
	| "openInterfacesWorkspace"
	| "cycleRouteFilterPresets"
	| "cycleConnectionFilterPresets"
	| "cyclePortFilterPresets"
	| "cycleToolTargetPresets"
	| "cycleLogProfiles"
	| "enterRemoteProfiles";

export type ConfigManagedShelfFocusActionPlan = ConfigManagedShelfHandoff & {
	action: ConfigManagedShelfFocusAction;
	rows: string[];
};

export type ConfigRecoveryShelfCounts = Partial<
	Record<ConfigManagedShelfTarget, number>
>;

export type ConfigRecoveryDirectPromptPlan = ConfigManagedShelfHandoff & {
	prompt:
		| "route-filter"
		| "endpoint-filter:connections"
		| "endpoint-filter:ports"
		| "log-search"
		| "tool-target-preset"
		| "remote-profile";
	reason: string;
	rows: string[];
};

export type ConfigRecoveryDirectPromptTransition =
	| { kind: "no-op" }
	| {
			kind: "apply";
			effects: ConfigManagedShelfStateEffect[];
			notice: ConfigWorkspaceNotice;
	  };

type ConfigManagedShelfCoverageKey =
	| "routeFilters"
	| "connectionFilters"
	| "portFilters"
	| "toolTargets"
	| "logProfiles"
	| "logSearches"
	| "remotes"
	| "operationPresets";

const configPolicyPresets: ConfigPolicyPresetPreview[] = [
	{
		id: "safe-readonly",
		label: "Safe read-only",
		values: {
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
			editorSaveMode: "disabled",
		},
		rows: [],
	},
	{
		id: "user-dry-run",
		label: "User dry-run",
		values: {
			controlExecutionMode: "dry-run",
			allowAdminDryRun: false,
			enableExperimentalControls: true,
			editorSaveMode: "disabled",
		},
		rows: [],
	},
	{
		id: "admin-dry-run",
		label: "Admin dry-run",
		values: {
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			enableExperimentalControls: true,
			editorSaveMode: "local-write",
		},
		rows: [],
	},
];

const resetKeys: ConfigWorkspaceResetKey[] = [
	"auditArchiveRetentionLimit",
	"toolTargetPresetLimit",
	"language",
	"refreshInterval",
	"defaultPingHost",
	"controlExecutionMode",
	"allowAdminDryRun",
	"enableExperimentalControls",
	"editorSaveMode",
	"statusResultJumpClassFilter",
];

const configManagedShelfHandoffs: ConfigManagedShelfHandoff[] = [
	{ target: "network", workspace: "network", label: "Network" },
	{ target: "routes", workspace: "routes", label: "Routes" },
	{ target: "connections", workspace: "connections", label: "Connections" },
	{ target: "ports", workspace: "ports", label: "Ports" },
	{ target: "tools", workspace: "tools", label: "Tools" },
	{ target: "logs", workspace: "logs", label: "Logs" },
	{ target: "remotes", workspace: "remotes", label: "Remotes" },
];

const configWorkspaceActionFocusKeys: Record<string, ConfigWorkspaceItemKey> = {
	"config.statusResultJumpClass.focus": "statusResultJumpClassFilter",
	"config.safetyPolicy.focus": "controlExecutionMode",
	"config.editorSaveMode.focus": "editorSaveMode",
	"config.auditRetention.focus": "auditArchiveRetentionLimit",
	"config.toolTargetRetention.focus": "toolTargetPresetLimit",
};

const configManagedShelfActionFocusTargets: Record<
	string,
	ConfigManagedShelfTarget
> = {
	"config.shelf.routes.focus": "routes",
	"config.shelf.connections.focus": "connections",
	"config.shelf.ports.focus": "ports",
	"config.shelf.tools.focus": "tools",
	"config.shelf.logs.focus": "logs",
	"config.shelf.remotes.focus": "remotes",
};

const configRecoveryActionFocusTargets: Record<
	string,
	ConfigManagedShelfTarget
> = {
	"config.recovery.routes": "routes",
	"config.recovery.connections": "connections",
	"config.recovery.ports": "ports",
	"config.recovery.tools": "tools",
	"config.recovery.logs": "logs",
	"config.recovery.remotes": "remotes",
};

export type ConfigWorkspaceItem = {
	key: ConfigWorkspaceItemKey;
	label: string;
	value: ConfigWorkspaceValue;
	kind: ConfigWorkspaceItemKind;
	section: ConfigWorkspaceSectionId;
	min?: number;
	max?: number;
	step?: number;
	options?: string[];
	hint: string;
};

const configSections: Array<{
	id: ConfigWorkspaceSectionId;
	label: string;
	shortcut: number;
}> = [
	{ id: "display", label: "DISPLAY", shortcut: 1 },
	{ id: "safety", label: "SAFETY", shortcut: 2 },
	{ id: "retention", label: "RETENTION", shortcut: 3 },
	{ id: "connectivity", label: "CONNECTIVITY", shortcut: 4 },
];

export function createConfigWorkspaceItems(
	config: Pick<
		PicosConfig,
		| "auditArchiveRetentionLimit"
		| "toolTargetPresetLimit"
		| "language"
		| "refreshInterval"
		| "statusResultJumpClassFilter"
		| "defaultPingHost"
		| "controlExecutionMode"
		| "allowAdminDryRun"
		| "editorSaveMode"
	>,
): ConfigWorkspaceItem[] {
	return [
		{
			key: "auditArchiveRetentionLimit",
			label: "Audit archive retention",
			value: config.auditArchiveRetentionLimit,
			kind: "number",
			section: "retention",
			min: 1,
			max: 60,
			step: 1,
			hint: "archived Timeline audit logs kept before prune",
		},
		{
			key: "toolTargetPresetLimit",
			label: "Tools target retention",
			value: config.toolTargetPresetLimit,
			kind: "number",
			section: "retention",
			min: 1,
			max: 24,
			step: 1,
			hint: "saved Tools target presets kept",
		},
		{
			key: "language",
			label: "Language",
			value: config.language,
			kind: "choice",
			section: "display",
			options: ["en", "ko", "ja", "zh"],
			hint: "interface language",
		},
		{
			key: "refreshInterval",
			label: "Refresh interval",
			value: config.refreshInterval,
			kind: "number",
			section: "display",
			min: 1000,
			max: 60000,
			step: 1000,
			hint: "refresh cadence in ms",
		},
		{
			key: "statusResultJumpClassFilter",
			label: "Result jump class",
			value: config.statusResultJumpClassFilter,
			kind: "choice",
			section: "display",
			options: ["all", "process", "timeline", "tools", "source"],
			hint: "Status result jump browser class",
		},
		{
			key: "defaultPingHost",
			label: "Default ping host",
			value: config.defaultPingHost,
			kind: "text",
			section: "connectivity",
			hint: "default host for picos ping",
		},
		{
			key: "controlExecutionMode",
			label: "Execution mode",
			value: config.controlExecutionMode,
			kind: "choice",
			section: "safety",
			options: ["disabled", "dry-run"],
			hint: "OS mutation execution mode",
		},
		{
			key: "allowAdminDryRun",
			label: "Admin dry-run",
			value: config.allowAdminDryRun,
			kind: "boolean",
			section: "safety",
			hint: "allow admin-class dry-run previews",
		},
		{
			key: "editorSaveMode",
			label: "Editor save mode",
			value: config.editorSaveMode,
			kind: "choice",
			section: "safety",
			options: ["disabled", "local-write"],
			hint: "Editor file write execution mode",
		},
	];
}

export function getNextConfigPolicyPreset(
	config: ConfigPolicyValues,
): ConfigPolicyPresetId {
	const currentIndex = configPolicyPresets.findIndex((preset) =>
		matchesConfigPolicyPreset(config, preset),
	);
	return (
		configPolicyPresets[
			getNextIndex(
				currentIndex >= 0 ? currentIndex : 0,
				configPolicyPresets.length,
				"next",
			)
		]?.id ?? "safe-readonly"
	);
}

export function applyConfigPolicyPreset(
	id: ConfigPolicyPresetId,
): ConfigPolicyPresetPreview {
	const preset =
		configPolicyPresets.find((candidate) => candidate.id === id) ??
		configPolicyPresets[0];
	const values = { ...preset.values };
	return {
		id: preset.id,
		label: preset.label,
		values,
		rows: [
			"CONFIG POLICY PRESET",
			`preset=${preset.label}`,
			`controlExecutionMode=${values.controlExecutionMode}`,
			`allowAdminDryRun=${values.allowAdminDryRun}`,
			`enableExperimentalControls=${values.enableExperimentalControls}`,
			`editorSaveMode=${values.editorSaveMode}`,
		],
	};
}

export function prepareNextConfigPolicyPresetTransition(
	config: PicosConfig,
): ConfigPolicyPresetTransition {
	const preset = applyConfigPolicyPreset(
		getNextConfigPolicyPreset({
			controlExecutionMode: config.controlExecutionMode,
			allowAdminDryRun: config.allowAdminDryRun,
			enableExperimentalControls: config.enableExperimentalControls,
			editorSaveMode: config.editorSaveMode,
		}),
	);
	return {
		kind: "write",
		config: { ...config, ...preset.values },
		notices: preset.rows.map((message, index) => ({
			level: index === 0 ? "info" : "ok",
			message,
		})),
	};
}

export function createConfigWorkspaceResetPreview(
	config: ConfigWorkspaceResetValues,
): ConfigWorkspaceResetPreview {
	const values = createDefaultResetValues();
	const changedKeys = resetKeys.filter((key) => config[key] !== values[key]);
	return {
		scope: "core controls",
		confirmationPhrase: "reset config",
		values,
		changedKeys,
		rows: [
			"CONFIG RESET",
			`scope=core controls changed=${changedKeys.length}`,
			"confirm reset config locked",
			...changedKeys.map((key) => `${key} ${config[key]} -> ${values[key]}`),
		],
	};
}

export function prepareConfigWorkspaceResetOpenTransition(
	config: ConfigWorkspaceResetValues,
): ConfigWorkspaceResetOpenTransition {
	const preview = createConfigWorkspaceResetPreview(config);
	return {
		preview,
		commandLinePrompt: "config-reset",
		notice: {
			level: "warn",
			message: `config reset preview opened ${preview.changedKeys.length} values`,
		},
	};
}

export function submitConfigWorkspaceResetConfirmation(
	preview: ConfigWorkspaceResetPreview,
	confirmation: string,
): ConfigWorkspaceResetConfirmation {
	const confirmed = confirmation.trim() === preview.confirmationPhrase;
	return {
		confirmed,
		message: confirmed
			? `config reset confirmed ${preview.scope} (${preview.changedKeys.length} values)`
			: `config reset rejected ${preview.scope}`,
		preview,
	};
}

export function createConfigSessionSyncIntent(
	config: PicosConfig,
): ConfigSessionSyncIntent {
	return {
		auditArchiveRetentionLimit: config.auditArchiveRetentionLimit,
		toolTargetPresetLimit: config.toolTargetPresetLimit,
		language: config.language,
		refreshInterval: config.refreshInterval,
		defaultPingHost: config.defaultPingHost,
		enableExperimentalControls: config.enableExperimentalControls,
		editorSaveMode: config.editorSaveMode,
		showPublicIp: config.showPublicIp,
		controlExecutionMode: config.controlExecutionMode,
		allowAdminDryRun: config.allowAdminDryRun,
		statusResultJumpClassFilter: config.statusResultJumpClassFilter,
		interfaceEvidenceSearchPresets: config.interfaceEvidenceSearchPresets,
		operationPresets: config.operationPresets,
		toolTargetPresets: config.toolTargetPresets,
		remoteProfiles: config.remoteProfiles,
	};
}

export function prepareConfigWorkspaceAdjustment(input: {
	items: ConfigWorkspaceItem[];
	selectedIndex: number;
	direction: "increase" | "decrease";
}): ConfigWorkspaceAdjustmentTransition {
	const item = getConfigWorkspaceItem(input.items, input.selectedIndex);
	if (!item) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no config item selected" },
		};
	}

	const value = adjustConfigWorkspaceItem(item, input.direction);
	if (value === item.value) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: `${item.key} already at ${item.value}`,
			},
		};
	}

	return {
		kind: "write",
		key: item.key,
		value,
		notice: { level: "ok", message: `config ${item.key}=${value}` },
	};
}

export function prepareConfigWorkspaceTextSubmission(input: {
	items: ConfigWorkspaceItem[];
	selectedIndex: number;
	value: string;
}): ConfigWorkspaceAdjustmentTransition {
	const item = getConfigWorkspaceItem(input.items, input.selectedIndex);
	if (item?.key !== "defaultPingHost") {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no editable config item selected" },
		};
	}

	const value = input.value.trim();
	if (!value) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "defaultPingHost cannot be empty" },
		};
	}

	return {
		kind: "write",
		key: item.key,
		value,
		notice: { level: "ok", message: `config ${item.key}=${value}` },
	};
}

export function prepareConfigWorkspaceResetSubmission(
	preview: ConfigWorkspaceResetPreview,
	confirmation: string,
): ConfigWorkspaceResetSubmissionTransition {
	const result = submitConfigWorkspaceResetConfirmation(preview, confirmation);
	if (!result.confirmed) {
		return {
			kind: "notice",
			notice: { level: "warn", message: result.message },
		};
	}
	return {
		kind: "write",
		values: result.preview.values,
		notice: { level: "ok", message: result.message },
	};
}

export function createConfigWorkspaceResetWriteIntent(
	config: PicosConfig,
	values: ConfigWorkspaceResetValues,
): ConfigWorkspaceResetWriteIntent {
	return {
		config: {
			...config,
			...values,
			toolTargetPresets: config.toolTargetPresets.slice(
				0,
				values.toolTargetPresetLimit,
			),
		},
	};
}

export function moveConfigWorkspaceSelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	return getNextIndex(current, total, direction);
}

export function getConfigWorkspaceItem(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
): ConfigWorkspaceItem | undefined {
	return items[clampIndex(selectedIndex, items.length)];
}

export function getConfigWorkspaceItemIndex(
	items: ConfigWorkspaceItem[],
	key: ConfigWorkspaceItemKey,
): number | undefined {
	const index = items.findIndex((item) => item.key === key);
	return index >= 0 ? index : undefined;
}

export function getConfigWorkspaceActionFocusKey(
	actionId: string,
): ConfigWorkspaceItemKey | undefined {
	return configWorkspaceActionFocusKeys[actionId];
}

export function createConfigWorkspaceActionFocusTransition(
	actionId: string,
	items: ConfigWorkspaceItem[],
): ConfigWorkspaceFocusTransition | undefined {
	const key = getConfigWorkspaceActionFocusKey(actionId);
	if (!key) {
		return undefined;
	}
	const index = getConfigWorkspaceItemIndex(items, key);
	if (index === undefined) {
		return {
			kind: "notice",
			notice: { level: "warn", message: `config row ${key} unavailable` },
		};
	}
	const item = getConfigWorkspaceItem(items, index);
	return {
		kind: "focus",
		screen: "config",
		focusArea: "workspaces",
		selectedIndex: clampIndex(index, items.length),
		notice: {
			level: "info",
			message: `config focus ${key} current=${String(item?.value ?? "-")}`,
		},
	};
}

export function getConfigWorkspaceSectionJumpIndex(
	items: ConfigWorkspaceItem[],
	section: string,
): number | undefined {
	const index = items.findIndex((item) => item.section === section);
	return index >= 0 ? index : undefined;
}

export function adjustConfigWorkspaceItem(
	item: ConfigWorkspaceItem,
	direction: "increase" | "decrease",
): ConfigWorkspaceValue {
	if (item.kind === "boolean") {
		return !item.value;
	}
	if (item.kind === "choice") {
		const options = item.options ?? [];
		const currentIndex = options.indexOf(String(item.value));
		const index = currentIndex >= 0 ? currentIndex : 0;
		return (
			options[
				getNextIndex(
					index,
					options.length,
					direction === "increase" ? "next" : "previous",
				)
			] ?? item.value
		);
	}
	if (item.kind === "number") {
		const value =
			typeof item.value === "number" ? item.value : Number(item.value);
		const min = item.min ?? value;
		const max = item.max ?? value;
		const step = item.step ?? 1;
		const offset = direction === "increase" ? step : -step;
		return Math.min(max, Math.max(min, value + offset));
	}
	return item.value;
}

export function getConfigWorkspaceEditPrompt(
	item: ConfigWorkspaceItem,
): string | undefined {
	if (item.kind !== "text") {
		return undefined;
	}
	return `config-${item.key}`;
}

export function formatConfigWorkspaceRows(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
	visibleRows: number,
): string[] {
	const selected = getConfigWorkspaceItem(items, selectedIndex);
	const bodyRows = createConfigWorkspaceBodyRows(items, selectedIndex);
	const rows = [
		"CONFIG WORKSPACE",
		formatConfigSectionShortcutRow(),
		"j/k select  +/- save  enter edit/jump  g/G shelf  P policy  R reset",
		...bodyRows,
		selected
			? selected.kind === "number"
				? `selected=${selected.key} range=${selected.min}..${selected.max}`
				: selected.kind === "text"
					? `selected=${selected.key} enter=edit`
					: `selected=${selected.key} values=${selected.options?.join("|") ?? "true|false"} section=${selected.section}`
			: "selected=-",
	];
	return rows.slice(0, Math.max(0, visibleRows));
}

export function formatConfigWorkspaceDetailRows(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
	options: { configPath: string },
): string[] {
	const selected = getConfigWorkspaceItem(items, selectedIndex);
	const section = selected?.section ?? "display";
	const sectionItems = items.filter((item) => item.section === section);
	return [
		"CONFIG SECTION DETAIL",
		`section=${getConfigSectionLabel(section)} items=${sectionItems.length} shortcut=${getConfigSectionShortcut(section)}`,
		`config=${options.configPath}`,
		selected
			? `selected=${selected.key} value=${selected.value}`
			: "selected=-",
		`posture=${formatConfigSafetyPosture(items)}`,
		`persist=${getConfigSectionPersistHint(section)}`,
		`actions=${getConfigSectionActionHint(section)}`,
	];
}

export function formatConfigManagedShelfRows(config: PicosConfig): string[] {
	const shelfCounts: Record<ConfigManagedShelfCoverageKey, number> = {
		routeFilters: config.routeFilterPresets.length,
		connectionFilters: config.connectionFilterPresets.length,
		portFilters: config.portFilterPresets.length,
		toolTargets: config.toolTargetPresets.length,
		logProfiles: config.logProfiles.length,
		logSearches: config.logSearchPresets.length,
		remotes: config.remoteProfiles.length,
		operationPresets: config.operationPresets.length,
	};
	const saved = Object.values(shelfCounts).reduce(
		(total, count) => total + count,
		0,
	);
	const emptyShelves = Object.entries(shelfCounts)
		.filter(([, count]) => count === 0)
		.map(([key]) => key as ConfigManagedShelfCoverageKey);
	return [
		"CONFIG MANAGED SHELVES",
		`network defaults host=${config.defaultPingHost} routeFilters=${config.routeFilterPresets.length} connectionFilters=${config.connectionFilterPresets.length} portFilters=${config.portFilterPresets.length}`,
		`tools defaults targets=${config.toolTargetPresets.length} filters=${config.toolHistoryFilterPresets.length} sort=${config.toolHistorySort} group=${config.toolHistoryGroup} detail=${config.toolHistoryDetailView}`,
		`workspace behavior logs=${config.logProfiles.length} searches=${config.logSearchPresets.length} remotes=${config.remoteProfiles.length} publicIp=${config.showPublicIp} experimental=${config.enableExperimentalControls} statusJumpClass=${config.statusResultJumpClassFilter}`,
		`shelf coverage saved=${saved} empty=${emptyShelves.length} routeFilters=${shelfCounts.routeFilters} connectionFilters=${shelfCounts.connectionFilters} portFilters=${shelfCounts.portFilters} toolTargets=${shelfCounts.toolTargets} logProfiles=${shelfCounts.logProfiles} logSearches=${shelfCounts.logSearches} remotes=${shelfCounts.remotes} operationPresets=${shelfCounts.operationPresets}`,
		`empty shelves ${emptyShelves.length > 0 ? emptyShelves.join(",") : "none"}`,
		...formatConfigManagedShelfRecoveryRows(emptyShelves),
		"managed-by=Routes/Connections/Ports/Tools/Logs/Remotes workspaces + operationPresets via picos operations",
	];
}

export function getConfigManagedShelfHandoff(
	target: ConfigManagedShelfTarget,
): ConfigManagedShelfHandoff {
	return (
		configManagedShelfHandoffs.find((handoff) => handoff.target === target) ??
		configManagedShelfHandoffs[0]
	);
}

export function getConfigManagedShelfActionFocusTarget(
	actionId: string,
): ConfigManagedShelfTarget | undefined {
	return configManagedShelfActionFocusTargets[actionId];
}

export function getConfigRecoveryActionFocusTarget(
	actionId: string,
): ConfigManagedShelfTarget | undefined {
	return configRecoveryActionFocusTargets[actionId];
}

export function getNextConfigManagedShelfTarget(
	current: ConfigManagedShelfTarget | undefined,
	direction: "next" | "previous",
): ConfigManagedShelfTarget {
	if (!current) {
		return configManagedShelfHandoffs[0].target;
	}
	const currentIndex = configManagedShelfHandoffs.findIndex(
		(handoff) => handoff.target === current,
	);
	return configManagedShelfHandoffs[
		getNextIndex(
			currentIndex >= 0 ? currentIndex : 0,
			configManagedShelfHandoffs.length,
			direction,
		)
	].target;
}

export function formatConfigManagedShelfHandoffRows(
	target: ConfigManagedShelfTarget,
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	return [
		"CONFIG SHELF HANDOFF",
		`target=${handoff.target} workspace=${handoff.label}`,
		`enter jump=${handoff.workspace}  g/G cycle shelf`,
	];
}

export function formatConfigManagedShelfLandingRows(
	target: ConfigManagedShelfTarget,
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	const focus = getConfigManagedShelfFocusPreset(target);
	return [
		"CONFIG SHELF LANDING",
		`source=config target=${handoff.target} workspace=${handoff.label}`,
		`scope=${getConfigManagedShelfScopeHint(handoff.target)}`,
		formatConfigManagedShelfFocusHint(focus),
		"next=review shelf controls  esc=clear landing",
	];
}

export function formatConfigManagedShelfFocusRows(
	target: ConfigManagedShelfTarget,
): string[] {
	return [
		...getConfigManagedShelfFocusPreset(target).rows,
		formatConfigManagedShelfFocusEnterHint(target),
	];
}

export function withConfigManagedShelfFocusRows(
	rows: string[],
	target: ConfigManagedShelfTarget | undefined,
	visibleRows: number,
): string[] {
	if (!target) {
		return rows.slice(0, Math.max(0, visibleRows));
	}
	return [...formatConfigManagedShelfFocusRows(target), ...rows].slice(
		0,
		Math.max(0, visibleRows),
	);
}

export function getConfigManagedShelfFocusPreset(
	target: ConfigManagedShelfTarget,
): ConfigManagedShelfFocusPreset {
	const handoff = getConfigManagedShelfHandoff(target);
	const focusArea: FocusArea = target === "remotes" ? "remotes" : "workspaces";
	const cursor = getConfigManagedShelfFocusCursor(target);
	const detailView =
		target === "routes" ? "table" : target === "tools" ? "summary" : undefined;
	const focus: ConfigManagedShelfFocusPreset = {
		...handoff,
		focusArea,
		cursor,
		index: 0,
		...(detailView ? { detailView } : {}),
		rows: [],
	};
	return {
		...focus,
		rows: [
			"CONFIG SHELF FOCUS",
			`target=${handoff.target} workspace=${handoff.label}`,
			formatConfigManagedShelfFocusHint(focus),
		],
	};
}

export function createConfigManagedShelfFocusActionPlan(
	target: ConfigManagedShelfTarget,
): ConfigManagedShelfFocusActionPlan {
	const handoff = getConfigManagedShelfHandoff(target);
	const action = getConfigManagedShelfFocusAction(target);
	return {
		...handoff,
		action,
		rows: [
			"CONFIG SHELF ACTION",
			`target=${handoff.target} workspace=${handoff.label}`,
			formatConfigManagedShelfFocusActionHint(target),
		],
	};
}

export function createConfigManagedShelfJumpTransition(
	target: ConfigManagedShelfTarget,
	input: ConfigManagedShelfJumpInput = {},
): ConfigManagedShelfApplyTransition {
	const focus = getConfigManagedShelfFocusPreset(target);
	const origin = input.origin ?? "keyboard";
	const counts = input.counts ?? {};
	const index = clampIndex(0, Math.max(0, Math.floor(counts[target] ?? 0)));
	const effects: ConfigManagedShelfStateEffect[] = [
		{ kind: "screen", screen: focus.workspace },
		{ kind: "focus-area", focusArea: focus.focusArea },
		{ kind: "shelf-landing", target: focus.target },
	];
	if (focus.cursor === "interfaceList") {
		effects.push({ kind: "interface-selection", index });
	} else if (focus.cursor === "routeFilters") {
		effects.push(
			{ kind: "route-detail-view", view: "table" },
			{ kind: "route-copy-preview", value: false },
		);
	} else if (focus.cursor === "connectionFilters") {
		effects.push({ kind: "connection-selection", index });
	} else if (focus.cursor === "portFilters") {
		effects.push({ kind: "port-selection", index });
	} else if (focus.cursor === "toolTargetPresets") {
		effects.push(
			{ kind: "tool-target-selection", index },
			{ kind: "tool-detail-view", view: "summary" },
		);
	} else if (focus.cursor === "remoteProfiles") {
		effects.push({ kind: "remote-selection", index });
	}
	return {
		kind: "apply",
		effects,
		notice: {
			level: "info",
			message: `${getConfigManagedShelfJumpNoticePrefix(origin)} ${focus.target} -> ${focus.label} focus=${focus.cursor}`,
		},
	};
}

export function prepareConfigManagedShelfFocusAction(
	input: ConfigManagedShelfFocusActionInput,
): ConfigManagedShelfFocusTransition {
	if (!input.target) {
		return { kind: "no-op" };
	}
	const handoff = getConfigManagedShelfHandoff(input.target);
	if (handoff.workspace !== input.screen) {
		return { kind: "no-op" };
	}
	if (input.target === "network") {
		return {
			kind: "apply",
			effects: [
				{ kind: "screen", screen: "interfaces" },
				{
					kind: "interface-selection",
					index: clampIndex(0, input.network?.interfaceCount ?? 0),
				},
			],
			notice: { level: "info", message: "config shelf action open interfaces" },
		};
	}
	if (input.target === "routes") {
		const routes = input.routes ?? { presets: [], query: "", entries: [] };
		const preset = nextRouteFilterPreset(routes.presets, routes.query);
		if (!preset) {
			return createConfigManagedShelfPromptTransition("routes");
		}
		const matchCount = filterRouteEntries(routes.entries, preset).length;
		return {
			kind: "apply",
			effects: [
				{ kind: "route-copy-preview", value: false },
				{ kind: "route-filter", value: preset },
			],
			notice: {
				level: matchCount ? "info" : "warn",
				message: `config shelf action route preset ${preset} matches ${matchCount}`,
			},
		};
	}
	if (input.target === "connections") {
		const connections = input.connections ?? {
			presets: [],
			query: "",
			entries: [],
		};
		const preset = nextEndpointFilterPreset(
			connections.presets,
			connections.query,
		);
		if (!preset) {
			return createConfigManagedShelfPromptTransition("connections");
		}
		const filtered = filterConnections(connections.entries, preset);
		return {
			kind: "apply",
			effects: [
				{ kind: "connection-copy-preview", value: false },
				{ kind: "connection-filter", value: preset },
				{
					kind: "connection-selection",
					index: clampIndex(0, filtered.length),
				},
			],
			notice: {
				level: filtered.length ? "info" : "warn",
				message: `config shelf action connections preset ${preset} matches ${filtered.length}`,
			},
		};
	}
	if (input.target === "ports") {
		const ports = input.ports ?? { presets: [], query: "", entries: [] };
		const preset = nextEndpointFilterPreset(ports.presets, ports.query);
		if (!preset) {
			return createConfigManagedShelfPromptTransition("ports");
		}
		const filtered = filterListeningPorts(ports.entries, preset);
		return {
			kind: "apply",
			effects: [
				{ kind: "port-copy-preview", value: false },
				{ kind: "port-process-preview", value: false },
				{ kind: "port-filter", value: preset },
				{ kind: "port-selection", index: clampIndex(0, filtered.length) },
			],
			notice: {
				level: filtered.length ? "info" : "warn",
				message: `config shelf action ports preset ${preset} matches ${filtered.length}`,
			},
		};
	}
	if (input.target === "tools") {
		const tools = input.tools ?? { presets: [], selectedIndex: 0 };
		const index = getNextIndex(
			clampIndex(tools.selectedIndex, tools.presets.length),
			tools.presets.length,
			"next",
		);
		const preset = tools.presets[clampIndex(index, tools.presets.length)];
		return {
			kind: "apply",
			effects: [
				{
					kind: "tool-target-selection",
					index: clampIndex(index, tools.presets.length),
				},
				{ kind: "tool-detail-view", view: "summary" },
				{ kind: "tool-copy-preview", value: false },
			],
			notice: preset
				? {
						level: "info",
						message: `config shelf action tool target ${preset.label} ${preset.target}`,
					}
				: {
						level: "warn",
						message: "config shelf action no tool target presets",
					},
		};
	}
	if (input.target === "logs") {
		const logs = input.logs ?? {
			profiles: [],
			level: "all" as const,
			query: "",
			entries: [],
		};
		const profile = nextLogProfile(logs.profiles, {
			level: logs.level,
			query: logs.query,
		});
		if (!profile) {
			return createConfigManagedShelfPromptTransition("logs");
		}
		const matchCount = filterOsLogEntries(
			logs.entries,
			profile.query,
			profile.level,
		).length;
		return {
			kind: "apply",
			effects: [
				{ kind: "log-level", value: profile.level },
				{ kind: "log-query", value: profile.query },
			],
			notice: {
				level: matchCount ? "info" : "warn",
				message: `config shelf action logs profile ${formatLogProfileLabel(profile)} matches ${matchCount}`,
			},
		};
	}
	const profileCount = Math.max(
		0,
		Math.floor(input.remotes?.profileCount ?? 0),
	);
	return {
		kind: "apply",
		effects: [
			{ kind: "focus-area", focusArea: "remotes" },
			{ kind: "remote-selection", index: clampIndex(0, profileCount) },
		],
		notice: profileCount
			? { level: "info", message: "config shelf action remote profile focus" }
			: { level: "warn", message: "config shelf action no remote profiles" },
	};
}

function createConfigManagedShelfPromptTransition(
	target: "routes" | "connections" | "ports" | "logs",
): ConfigManagedShelfApplyTransition {
	const prompt = getConfigManagedShelfEmptyFocusPrompt(target);
	if (!prompt) {
		throw new Error(`Missing managed shelf recovery prompt for ${target}`);
	}
	return {
		kind: "apply",
		effects: [{ kind: "command-line", prompt: prompt.prompt }],
		notice: { level: "warn", message: prompt.message },
	};
}

export function prepareConfigManagedShelfLandingDismissal(input: {
	target: ConfigManagedShelfTarget | undefined;
	screen: Screen;
}): ConfigManagedShelfLandingDismissTransition {
	if (!input.target) {
		return { kind: "no-op" };
	}
	const handoff = getConfigManagedShelfHandoff(input.target);
	if (handoff.workspace !== input.screen) {
		return { kind: "no-op" };
	}
	return {
		kind: "clear",
		notice: {
			level: "info",
			message: `config shelf landing cleared ${handoff.label}`,
		},
	};
}

export function formatConfigRecoveryPaletteRows(
	target: ConfigManagedShelfTarget,
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	const landingRows = formatConfigManagedShelfLandingRows(target);
	const focusRows = formatConfigManagedShelfFocusRows(target);
	return [
		`config recovery target=${handoff.target} workspace=${handoff.label}`,
		`empty=${getConfigManagedShelfRecoveryEmptyLabel(target)} action=restore missing shelf`,
		landingRows[2],
		focusRows[2],
		formatConfigManagedShelfFocusActionHint(target),
	];
}

export function createConfigRecoveryDirectPromptPlan(
	target: ConfigManagedShelfTarget,
	counts: ConfigRecoveryShelfCounts,
): ConfigRecoveryDirectPromptPlan | undefined {
	const prompt = getConfigRecoveryDirectPrompt(target);
	if (!prompt) {
		return undefined;
	}
	const count = Math.max(0, Math.floor(counts[target] ?? 0));
	if (count > 0) {
		return undefined;
	}
	const handoff = getConfigManagedShelfHandoff(target);
	const reason = `empty ${getConfigManagedShelfRecoveryEmptyLabel(target)}`;
	return {
		...handoff,
		prompt,
		reason,
		rows: [
			"CONFIG RECOVERY PROMPT",
			`target=${handoff.target} workspace=${handoff.label}`,
			`prompt=${prompt} reason=${reason}`,
			"next=type filter and press enter",
		],
	};
}

export function prepareConfigRecoveryDirectPromptTransition(
	target: ConfigManagedShelfTarget | undefined,
	counts: ConfigRecoveryShelfCounts,
): ConfigRecoveryDirectPromptTransition {
	if (!target) {
		return { kind: "no-op" };
	}
	const plan = createConfigRecoveryDirectPromptPlan(target, counts);
	if (!plan) {
		return { kind: "no-op" };
	}
	return {
		kind: "apply",
		effects: [{ kind: "command-line", prompt: plan.prompt }],
		notice: {
			level: "info",
			message: `config recovery prompt ${plan.target} ${plan.prompt}`,
		},
	};
}

export function formatConfigManagedShelfPromptBreadcrumbRows(
	target: ConfigManagedShelfTarget,
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	return [
		`CONFIG ORIGIN Config > ${handoff.label}`,
		`scope=${getConfigManagedShelfPromptScope(target)} prompt=${getConfigManagedShelfPromptKind(target)} enter=apply esc=keep landing`,
	];
}

export function formatConfigManagedShelfCleanupBreadcrumbRows(
	target: ConfigManagedShelfTarget,
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	return [
		`CONFIG ORIGIN Config > ${handoff.label}`,
		`scope=${getConfigManagedShelfPromptScope(target)} prompt=cleanup exact-confirm esc=keep landing`,
	];
}

export function formatConfigManagedShelfLockedDialogBreadcrumbRows(
	target: ConfigManagedShelfTarget,
	dialog: "file-open",
): string[] {
	const handoff = getConfigManagedShelfHandoff(target);
	return [
		`CONFIG ORIGIN Config > ${handoff.label}`,
		`scope=${getConfigManagedShelfPromptScope(target)} dialog=${dialog} locked esc=keep landing`,
	];
}

export function createConfigManagedShelfFileOpenOrigin(
	target: ConfigManagedShelfTarget,
): FileOpenOrigin {
	const handoff = getConfigManagedShelfHandoff(target);
	return {
		kind: "config-shelf",
		target,
		label: handoff.label,
		scope: getConfigManagedShelfPromptScope(target),
	};
}

function createConfigWorkspaceBodyRows(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
): string[] {
	const rows: string[] = [];
	let previousSection: ConfigWorkspaceSectionId | undefined;
	for (const [index, item] of items.entries()) {
		if (item.section !== previousSection) {
			rows.push(formatConfigSectionHeader(item.section));
			previousSection = item.section;
		}
		const marker = index === selectedIndex ? ">" : " ";
		rows.push(
			`${marker} ${item.key.padEnd(27)} ${String(item.value).padEnd(8)} ${item.hint}`,
		);
	}
	return rows;
}

function formatConfigSectionShortcutRow(): string {
	return configSections
		.map((section) => `${section.shortcut} ${section.id}`)
		.join("  ");
}

function formatConfigSectionHeader(
	sectionId: ConfigWorkspaceSectionId,
): string {
	const section = configSections.find(
		(candidate) => candidate.id === sectionId,
	);
	return `[${section?.shortcut ?? "?"}] ${section?.label ?? sectionId.toUpperCase()}`;
}

function getConfigSectionLabel(sectionId: ConfigWorkspaceSectionId): string {
	return (
		configSections.find((section) => section.id === sectionId)?.label ??
		sectionId.toUpperCase()
	);
}

function getConfigSectionShortcut(sectionId: ConfigWorkspaceSectionId): number {
	return (
		configSections.find((section) => section.id === sectionId)?.shortcut ?? 0
	);
}

function getConfigSectionPersistHint(
	sectionId: ConfigWorkspaceSectionId,
): string {
	if (sectionId === "display") {
		return "+/- writes language, refreshInterval, or jump class";
	}
	if (sectionId === "safety") {
		return "+/- writes policy, P cycles preset, R exact reset";
	}
	if (sectionId === "retention") {
		return "+/- writes bounded retention limits";
	}
	return "enter edits defaultPingHost";
}

function getConfigSectionActionHint(
	sectionId: ConfigWorkspaceSectionId,
): string {
	if (sectionId === "display") {
		return "+/- adjust language/refresh/jump class, R exact reset";
	}
	if (sectionId === "safety") {
		return "+/- adjust policy, P cycle preset, R exact reset";
	}
	if (sectionId === "retention") {
		return "+/- adjust retention limits, R exact reset";
	}
	return "enter edit defaultPingHost, R exact reset";
}

function getConfigManagedShelfScopeHint(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "network") {
		return "default host, public IP display, interface status";
	}
	if (target === "routes") {
		return "route filters, raw route evidence, path lookup";
	}
	if (target === "connections") {
		return "connection filters, sorting, PID handoffs";
	}
	if (target === "ports") {
		return "port filters, sorting, process-control posture";
	}
	if (target === "tools") {
		return "saved targets, history filters, grouping, detail view";
	}
	if (target === "logs") {
		return "log profiles, search presets, live follow";
	}
	return "SFTP profiles, provider boundary, locked file context";
}

function getConfigManagedShelfFocusCursor(
	target: ConfigManagedShelfTarget,
): ConfigManagedShelfFocusCursor {
	if (target === "network") {
		return "interfaceList";
	}
	if (target === "routes") {
		return "routeFilters";
	}
	if (target === "connections") {
		return "connectionFilters";
	}
	if (target === "ports") {
		return "portFilters";
	}
	if (target === "tools") {
		return "toolTargetPresets";
	}
	if (target === "logs") {
		return "logProfiles";
	}
	return "remoteProfiles";
}

function getConfigManagedShelfEmptyFocusPrompt(
	target: ConfigManagedShelfTarget,
):
	| {
			prompt:
				| "route-filter"
				| "endpoint-filter:connections"
				| "endpoint-filter:ports"
				| "log-search";
			message: string;
	  }
	| undefined {
	if (target === "routes") {
		return {
			prompt: "route-filter",
			message: "config shelf action route filter prompt",
		};
	}
	if (target === "connections") {
		return {
			prompt: "endpoint-filter:connections",
			message: "config shelf action connections filter prompt",
		};
	}
	if (target === "ports") {
		return {
			prompt: "endpoint-filter:ports",
			message: "config shelf action ports filter prompt",
		};
	}
	if (target === "logs") {
		return {
			prompt: "log-search",
			message: "config shelf action logs search prompt",
		};
	}
	return undefined;
}

function formatConfigManagedShelfFocusHint(
	focus: Pick<ConfigManagedShelfFocusPreset, "cursor" | "detailView" | "index">,
): string {
	const detail = focus.detailView ? ` detail=${focus.detailView}` : "";
	return `focus=${focus.cursor} cursor=${focus.index}${detail}`;
}

function getConfigManagedShelfFocusAction(
	target: ConfigManagedShelfTarget,
): ConfigManagedShelfFocusAction {
	if (target === "network") {
		return "openInterfacesWorkspace";
	}
	if (target === "routes") {
		return "cycleRouteFilterPresets";
	}
	if (target === "connections") {
		return "cycleConnectionFilterPresets";
	}
	if (target === "ports") {
		return "cyclePortFilterPresets";
	}
	if (target === "tools") {
		return "cycleToolTargetPresets";
	}
	if (target === "logs") {
		return "cycleLogProfiles";
	}
	return "enterRemoteProfiles";
}

function formatConfigManagedShelfFocusEnterHint(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "network") {
		return "enter=open interfaces  esc=clear landing";
	}
	if (target === "routes") {
		return "enter=cycle route filter presets  esc=clear landing";
	}
	if (target === "connections") {
		return "enter=cycle connection filter presets  esc=clear landing";
	}
	if (target === "ports") {
		return "enter=cycle port filter presets  esc=clear landing";
	}
	if (target === "tools") {
		return "enter=cycle tool target presets  esc=clear landing";
	}
	if (target === "logs") {
		return "enter=cycle log profiles  esc=clear landing";
	}
	return "enter=remote profile focus  esc=clear landing";
}

function formatConfigManagedShelfFocusActionHint(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "network") {
		return "enter=open interfaces  fallback=network overview";
	}
	if (target === "routes") {
		return "enter=cycle route filter presets  fallback=open filter prompt";
	}
	if (target === "connections") {
		return "enter=cycle connection filter presets  fallback=open filter prompt";
	}
	if (target === "ports") {
		return "enter=cycle port filter presets  fallback=open filter prompt";
	}
	if (target === "tools") {
		return "enter=cycle tool target presets  fallback=keep first target";
	}
	if (target === "logs") {
		return "enter=cycle log profiles  fallback=open search prompt";
	}
	return "enter=remote profile focus  fallback=empty profile list";
}

function formatConfigManagedShelfRecoveryRows(
	emptyShelves: ConfigManagedShelfCoverageKey[],
): string[] {
	if (emptyShelves.length === 0) {
		return ["recovery all shelves ready"];
	}
	return emptyShelves.map((shelf) => {
		if (shelf === "operationPresets") {
			return "recovery operationPresets -> picos operations kinds";
		}
		const target = getConfigManagedShelfRecoveryTarget(shelf);
		const handoff = getConfigManagedShelfHandoff(target);
		return `recovery ${shelf} -> ${handoff.label} ${formatConfigManagedShelfFocusActionHint(target).replace("  ", " ")}`;
	});
}

function getConfigManagedShelfRecoveryTarget(
	shelf: Exclude<ConfigManagedShelfCoverageKey, "operationPresets">,
): ConfigManagedShelfTarget {
	if (shelf === "routeFilters") {
		return "routes";
	}
	if (shelf === "connectionFilters") {
		return "connections";
	}
	if (shelf === "portFilters") {
		return "ports";
	}
	if (shelf === "toolTargets") {
		return "tools";
	}
	if (shelf === "remotes") {
		return "remotes";
	}
	return "logs";
}

function getConfigManagedShelfRecoveryEmptyLabel(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "routes") {
		return "routeFilters";
	}
	if (target === "connections") {
		return "connectionFilters";
	}
	if (target === "ports") {
		return "portFilters";
	}
	if (target === "tools") {
		return "toolTargets";
	}
	if (target === "logs") {
		return "logProfiles";
	}
	if (target === "remotes") {
		return "remoteProfiles";
	}
	return "interfaces";
}

function getConfigRecoveryDirectPrompt(
	target: ConfigManagedShelfTarget,
): ConfigRecoveryDirectPromptPlan["prompt"] | undefined {
	if (target === "routes") {
		return "route-filter";
	}
	if (target === "connections") {
		return "endpoint-filter:connections";
	}
	if (target === "ports") {
		return "endpoint-filter:ports";
	}
	if (target === "logs") {
		return "log-search";
	}
	if (target === "tools") {
		return "tool-target-preset";
	}
	if (target === "remotes") {
		return "remote-profile";
	}
	return undefined;
}

function getConfigManagedShelfJumpNoticePrefix(
	origin: ConfigManagedShelfJumpOrigin,
): string {
	if (origin === "palette") {
		return "config shelf palette";
	}
	if (origin === "recovery-palette") {
		return "config recovery palette";
	}
	return "config shelf jump";
}

function getConfigManagedShelfPromptScope(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "routes") {
		return "routes.filters";
	}
	if (target === "connections") {
		return "connections.filters";
	}
	if (target === "ports") {
		return "ports.filters";
	}
	if (target === "logs") {
		return "logs.profiles";
	}
	return `${target}.settings`;
}

function getConfigManagedShelfPromptKind(
	target: ConfigManagedShelfTarget,
): string {
	if (target === "logs") {
		return "search";
	}
	if (target === "routes" || target === "connections" || target === "ports") {
		return "filter";
	}
	return "edit";
}

function formatConfigSafetyPosture(items: ConfigWorkspaceItem[]): string {
	const mode = String(
		items.find((item) => item.key === "controlExecutionMode")?.value ??
			"disabled",
	);
	const allowAdminDryRun =
		items.find((item) => item.key === "allowAdminDryRun")?.value === true;
	const editorSaveMode = String(
		items.find((item) => item.key === "editorSaveMode")?.value ?? "disabled",
	);
	if (editorSaveMode === "local-write") {
		return "local editor writes enabled";
	}
	if (mode !== "dry-run") {
		return "safe read-only";
	}
	return allowAdminDryRun ? "admin dry-run previews" : "user dry-run previews";
}

function matchesConfigPolicyPreset(
	config: ConfigPolicyValues,
	preset: ConfigPolicyPresetPreview,
): boolean {
	return (
		config.controlExecutionMode === preset.values.controlExecutionMode &&
		config.allowAdminDryRun === preset.values.allowAdminDryRun &&
		config.enableExperimentalControls ===
			preset.values.enableExperimentalControls &&
		config.editorSaveMode === preset.values.editorSaveMode
	);
}

function createDefaultResetValues(): ConfigWorkspaceResetValues {
	return {
		auditArchiveRetentionLimit: defaultConfig.auditArchiveRetentionLimit,
		toolTargetPresetLimit: defaultConfig.toolTargetPresetLimit,
		language: defaultConfig.language,
		refreshInterval: defaultConfig.refreshInterval,
		defaultPingHost: defaultConfig.defaultPingHost,
		controlExecutionMode: defaultConfig.controlExecutionMode,
		allowAdminDryRun: defaultConfig.allowAdminDryRun,
		enableExperimentalControls: defaultConfig.enableExperimentalControls,
		editorSaveMode: defaultConfig.editorSaveMode,
		statusResultJumpClassFilter: defaultConfig.statusResultJumpClassFilter,
	};
}
