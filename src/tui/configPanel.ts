import { defaultConfig } from "../config/schema";
import type { FileOpenOrigin } from "../core/fileOpen";
import type { PicosConfig } from "../core/types";
import type { FocusArea, Screen } from "./navigation";
import { getNextIndex } from "./navigation";

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
	return items[Math.min(Math.max(selectedIndex, 0), items.length - 1)];
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
