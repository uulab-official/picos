import { defaultConfig } from "../config/schema";
import type { PicosConfig } from "../core/types";
import type { FocusArea, Screen } from "./navigation";
import { getNextIndex } from "./navigation";

export type ConfigWorkspaceItemKey =
	| "auditArchiveRetentionLimit"
	| "toolTargetPresetLimit"
	| "language"
	| "refreshInterval"
	| "defaultPingHost"
	| "controlExecutionMode"
	| "allowAdminDryRun";

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
	"controlExecutionMode" | "allowAdminDryRun" | "enableExperimentalControls"
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
	| "enableExperimentalControls";

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

const configPolicyPresets: ConfigPolicyPresetPreview[] = [
	{
		id: "safe-readonly",
		label: "Safe read-only",
		values: {
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
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
		| "defaultPingHost"
		| "controlExecutionMode"
		| "allowAdminDryRun"
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
	return [
		"CONFIG MANAGED SHELVES",
		`network defaults host=${config.defaultPingHost} routeFilters=${config.routeFilterPresets.length} connectionFilters=${config.connectionFilterPresets.length} portFilters=${config.portFilterPresets.length}`,
		`tools defaults targets=${config.toolTargetPresets.length} filters=${config.toolHistoryFilterPresets.length} sort=${config.toolHistorySort} group=${config.toolHistoryGroup} detail=${config.toolHistoryDetailView}`,
		`workspace behavior logs=${config.logProfiles.length} searches=${config.logSearchPresets.length} remotes=${config.remoteProfiles.length} publicIp=${config.showPublicIp} experimental=${config.enableExperimentalControls}`,
		"managed-by=Routes/Connections/Ports/Tools/Logs/Remotes workspaces",
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
		"hint=config deep link active  esc clears landing",
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
		return "+/- writes language or refreshInterval";
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
		return "+/- adjust language/refresh, R exact reset";
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

function formatConfigSafetyPosture(items: ConfigWorkspaceItem[]): string {
	const mode = String(
		items.find((item) => item.key === "controlExecutionMode")?.value ??
			"disabled",
	);
	const allowAdminDryRun =
		items.find((item) => item.key === "allowAdminDryRun")?.value === true;
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
			preset.values.enableExperimentalControls
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
	};
}
