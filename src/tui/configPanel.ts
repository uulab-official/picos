import { defaultConfig } from "../config/schema";
import type { PicosConfig } from "../core/types";
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
		"j/k select  +/- save  enter edit/show  P policy  R reset",
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
