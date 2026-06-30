import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import {
	normalizeToolTargetPresets,
	type ToolTargetPresetPreference,
} from "../core/toolHistoryPreferences";
import type { ToolId, ToolResult } from "../core/tools";
import type { NetworkSummary } from "../core/types";
import {
	type ClipboardPreview,
	createClipboardPreview,
} from "./clipboardPreview";

export type ToolRunActionId =
	| "tools.dns"
	| "tools.traceroute"
	| "tools.whois"
	| "tools.ipInfo"
	| "tools.tls"
	| "network.connect"
	| "ping.default";

export type ToolRunPlan = {
	actionId: ToolRunActionId;
	toolId: ToolId;
	args: string[];
	label: string;
};

export type ToolTargetPreset = {
	id: string;
	label: string;
	actionId: ToolRunActionId;
	target: string;
	hint: string;
};

export type ToolTargetCleanupPreview = {
	actionId: ToolRunActionId;
	count: number;
	confirmationPhrase: string;
	rows: string[];
	cleanup: ConfigCleanupPreview;
};

export type ToolTargetCleanupConfirmation = {
	confirmed: boolean;
	removed: number;
	presets: ToolTargetPreset[];
	message: string;
};

export type ToolHistoryCleanupPreview = {
	count: number;
	confirmationPhrase: string;
	rows: string[];
	cleanup: ConfigCleanupPreview;
};

export type ToolHistoryCleanupConfirmation = {
	confirmed: boolean;
	removed: number;
	presets: string[];
	message: string;
};

export { normalizeToolTargetPresets };

const toolRunActionAliases: Record<string, ToolRunActionId> = {
	connect: "network.connect",
	dns: "tools.dns",
	ip: "tools.ipInfo",
	"ip-info": "tools.ipInfo",
	ipinfo: "tools.ipInfo",
	ping: "ping.default",
	port: "network.connect",
	rdap: "tools.whois",
	tcp: "network.connect",
	tls: "tools.tls",
	trace: "tools.traceroute",
	traceroute: "tools.traceroute",
	whois: "tools.whois",
};

export type ToolHistoryItem = {
	id: string;
	time: string;
	status: "ok" | "fail";
	label: string;
	plan: ToolRunPlan;
	title: string;
	summary: string;
	rawOutput: string;
};

export type ToolHistoryExportScope = "selected" | "all";

export type ToolHistorySort = "time" | "tool" | "status";

export type ToolHistoryGroup = "none" | "tool" | "status";

export type ToolHistoryDetailView = "raw" | "summary" | "command";

export type ToolSectionClipboardSelection = "target" | "status";

export type ToolHistoryExportPlan = {
	path: string;
	content: string;
	itemCount: number;
	scope: ToolHistoryExportScope;
};

export type FilteredToolHistoryItem = {
	index: number;
	item: ToolHistoryItem;
};

export function createToolRunPlan(
	actionId: string,
	defaultTarget: string,
	summary?: NetworkSummary,
	targetInput = "",
): ToolRunPlan | undefined {
	const target = targetInput.trim() || defaultTarget || "example.com";
	if (actionId === "tools.dns") {
		return {
			actionId,
			toolId: "dns",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.traceroute") {
		return {
			actionId,
			toolId: "traceroute",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.whois") {
		return {
			actionId,
			toolId: "whois",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	if (actionId === "tools.ipInfo") {
		const ip = (targetInput.trim() || summary?.publicIp) ?? "8.8.8.8";
		return {
			actionId,
			toolId: "ip-info",
			args: [ip],
			label: `${actionId} ${ip}`,
		};
	}
	if (actionId === "tools.tls") {
		const tlsTarget = target.includes(":") ? target : `${target}:443`;
		return {
			actionId,
			toolId: "tls",
			args: [tlsTarget],
			label: `${actionId} ${tlsTarget}`,
		};
	}
	if (actionId === "network.connect") {
		const { host, port } = parseHostPortTarget(target);
		return {
			actionId,
			toolId: "telnet",
			args: [host, port],
			label: `${actionId} ${host}:${port}`,
		};
	}
	if (actionId === "ping.default") {
		return {
			actionId,
			toolId: "ping",
			args: [target],
			label: `${actionId} ${target}`,
		};
	}
	return undefined;
}

export function createToolRunPlanFromPreset(
	preset: ToolTargetPreset,
): ToolRunPlan | undefined {
	return createToolRunPlan(
		preset.actionId,
		preset.target,
		undefined,
		preset.target,
	);
}

export function getToolTargetPresets(
	summary: NetworkSummary | undefined,
	defaultTarget: string,
	customPresets: ToolTargetPresetPreference[] = [],
): ToolTargetPreset[] {
	const fallbackTarget = defaultTarget.trim() || "example.com";
	const presets: ToolTargetPreset[] = [
		...normalizeToolTargetPresets(customPresets),
		{
			id: "default-ping",
			label: "Default ping",
			actionId: "ping.default",
			target: fallbackTarget,
			hint: "default reachability target",
		},
	];

	if (summary?.gateway) {
		presets.push({
			id: "gateway-ping",
			label: "Gateway ping",
			actionId: "ping.default",
			target: summary.gateway,
			hint: "primary gateway",
		});
	}

	for (const [index, server] of (summary?.dnsServers ?? [])
		.slice(0, 2)
		.entries()) {
		presets.push({
			id: `dns-${index + 1}`,
			label: `DNS server ${index + 1}`,
			actionId: "tools.dns",
			target: server,
			hint: "resolver check",
		});
	}

	if (summary?.publicIp) {
		presets.push({
			id: "public-ip",
			label: "Public IP",
			actionId: "tools.ipInfo",
			target: summary.publicIp,
			hint: "external address metadata",
		});
	}

	presets.push(
		{
			id: "web-https",
			label: "HTTPS check",
			actionId: "network.connect",
			target: `${fallbackTarget}:443`,
			hint: "default TLS port",
		},
		{
			id: "web-tls",
			label: "TLS inspect",
			actionId: "tools.tls",
			target: `${fallbackTarget}:443`,
			hint: "certificate metadata",
		},
	);

	return dedupeToolTargetPresets(presets);
}

export function appendToolHistory(
	history: ToolHistoryItem[],
	input: {
		plan: ToolRunPlan;
		result: ToolResult;
		status?: "ok" | "fail";
	},
	time = new Date().toLocaleTimeString("en-US", { hour12: false }),
	limit = 12,
): ToolHistoryItem[] {
	const item: ToolHistoryItem = {
		id: createToolHistoryId(time, input.plan.label),
		time,
		status: input.status ?? "ok",
		label: input.plan.label,
		plan: input.plan,
		title: input.result.title,
		summary: summarizeToolResult(input.result),
		rawOutput: input.result.rawOutput,
	};
	return [...history, item].slice(-limit);
}

export function formatToolsWorkspaceRows(
	history: ToolHistoryItem[],
	visibleRows: number,
	selectedIndex = Math.max(0, history.length - 1),
	filterQuery = "",
	sort: ToolHistorySort = "time",
	group: ToolHistoryGroup = "none",
	presets: string[] = [],
	detailView: ToolHistoryDetailView = "raw",
	targetPresets: ToolTargetPreset[] = [],
	selectedTargetPresetIndex = 0,
	sectionClipboardSelection: ToolSectionClipboardSelection = "target",
	sectionClipboardRowIndex = 0,
): string[] {
	const filtered = sortToolHistory(history, filterQuery, sort);
	const latestIndex = getVisibleToolHistoryIndex(
		history,
		selectedIndex,
		filterQuery,
		sort,
	);
	const latest = filtered.find((entry) => entry.index === latestIndex)?.item;
	const historyRows = formatGroupedToolHistoryRows(
		filtered,
		latestIndex,
		group,
	);
	const bodyRows = latest
		? [...historyRows, ...formatToolHistoryDetailRows(latest, detailView)]
		: [history.length ? "no matching tool runs" : "no tool runs yet"];
	const targetRows = formatToolTargetPresetRows(
		targetPresets,
		selectedTargetPresetIndex,
	).slice(0, Math.max(0, visibleRows - 2));
	const visibleBodyRows = targetRows.length && !latest ? [] : bodyRows;
	const filter = filterQuery.trim();
	const presetSummary = formatToolHistoryPresetSummary(presets);
	const detailSummary = detailView === "raw" ? "" : ` detail=${detailView}`;
	const activeTargetPreset =
		targetPresets[
			Math.min(Math.max(selectedTargetPresetIndex, 0), targetPresets.length - 1)
		];
	const sectionRowCount = latest
		? getToolSectionClipboardRowCountForItem(latest, sectionClipboardSelection)
		: 0;
	const sectionRowSummary =
		sectionRowCount > 0
			? ` · ,/. row=${Math.min(Math.max(sectionClipboardRowIndex, 0), sectionRowCount - 1) + 1}/${sectionRowCount} · b row`
			: "";
	return [
		`TOOLS history=${history.length}${filter ? ` filter=${filter} matches=${filtered.length}` : ""}${sort !== "time" ? ` sort=${sort}` : ""}${group !== "none" ? ` group=${group}` : ""}${presetSummary ? ` presets=${presetSummary}` : ""}${targetPresets.length ? ` targets=${targetPresets.length} active=${activeTargetPreset?.label}:${activeTargetPreset?.target}` : ""}${detailSummary} selected=${latest?.title ?? "-"}`,
		...targetRows,
		...visibleBodyRows,
		`shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=${sectionClipboardSelection}${sectionRowSummary} · v copy section · c raw`,
	].slice(0, visibleRows);
}

export function filterToolHistory(
	history: ToolHistoryItem[],
	query: string,
): FilteredToolHistoryItem[] {
	const normalized = query.trim().toLowerCase();
	return history
		.map((item, index) => ({ index, item }))
		.filter(({ item }) => {
			if (!normalized) {
				return true;
			}
			return formatToolHistorySearchText(item).includes(normalized);
		});
}

export function getVisibleToolHistoryIndex(
	history: ToolHistoryItem[],
	selectedIndex: number,
	query: string,
	sort: ToolHistorySort = "time",
): number {
	const filtered = sortToolHistory(history, query, sort);
	if (!filtered.length) {
		return 0;
	}
	if (filtered.some((entry) => entry.index === selectedIndex)) {
		return selectedIndex;
	}
	return filtered[0]?.index ?? 0;
}

export function sortToolHistory(
	history: ToolHistoryItem[],
	query: string,
	sort: ToolHistorySort,
): FilteredToolHistoryItem[] {
	const filtered = filterToolHistory(history, query);
	if (sort === "time") {
		return filtered;
	}
	return [...filtered].sort((left, right) => {
		if (sort === "status") {
			const status =
				getToolHistoryStatusRank(left.item.status) -
				getToolHistoryStatusRank(right.item.status);
			return status || left.index - right.index;
		}
		const tool = left.item.plan.actionId.localeCompare(
			right.item.plan.actionId,
		);
		return (
			tool ||
			left.item.label.localeCompare(right.item.label) ||
			left.index - right.index
		);
	});
}

export function nextToolHistorySort(sort: ToolHistorySort): ToolHistorySort {
	if (sort === "time") {
		return "tool";
	}
	if (sort === "tool") {
		return "status";
	}
	return "time";
}

export function nextToolHistoryGroup(
	group: ToolHistoryGroup,
): ToolHistoryGroup {
	if (group === "none") {
		return "tool";
	}
	if (group === "tool") {
		return "status";
	}
	return "none";
}

export function nextToolHistoryDetailView(
	view: ToolHistoryDetailView,
): ToolHistoryDetailView {
	if (view === "raw") {
		return "summary";
	}
	if (view === "summary") {
		return "command";
	}
	return "raw";
}

export function nextToolSectionClipboardSelection(
	selection: ToolSectionClipboardSelection,
): ToolSectionClipboardSelection {
	return selection === "target" ? "status" : "target";
}

export function saveToolHistoryPreset(
	presets: string[],
	query: string,
	limit = 6,
): string[] {
	const normalized = query.trim();
	if (!normalized) {
		return presets;
	}
	return [
		normalized,
		...presets.filter((preset) => preset !== normalized),
	].slice(0, limit);
}

export function createToolHistoryCleanupPreview(
	presets: string[],
): ToolHistoryCleanupPreview | undefined {
	const normalized = presets.map((preset) => preset.trim()).filter(Boolean);
	if (!normalized.length) {
		return undefined;
	}
	const cleanup = createConfigCleanupPreview({
		id: "tools.history.filters",
		label: "Tools history filter presets",
		scope: "tools history",
		count: normalized.length,
		verb: "clear",
	});
	return {
		count: normalized.length,
		confirmationPhrase: cleanup.confirmationPhrase,
		rows: [
			"TOOLS HISTORY CLEANUP",
			`filter-presets=${normalized.length}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
		cleanup,
	};
}

export function submitToolHistoryCleanupConfirmation(
	presets: string[],
	confirmation: string,
): ToolHistoryCleanupConfirmation {
	const preview = createToolHistoryCleanupPreview(presets);
	if (!preview) {
		return {
			confirmed: false,
			removed: 0,
			presets,
			message: "tool history filter cleanup unavailable",
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		return {
			confirmed: false,
			removed: 0,
			presets,
			message: "tool history filter cleanup rejected",
		};
	}
	return {
		confirmed: true,
		removed: preview.count,
		presets: [],
		message: `tool history filter cleanup removed ${preview.count} presets`,
	};
}

export function saveToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	limit = 8,
): ToolTargetPreset[] {
	const [nextPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	if (!nextPreset) {
		return normalizeToolTargetPresets(presets).slice(0, limit);
	}
	return normalizeToolTargetPresets([
		nextPreset,
		...presets.filter(
			(current) =>
				`${current.actionId}:${current.target.trim()}` !==
				`${nextPreset.actionId}:${nextPreset.target}`,
		),
	]).slice(0, limit);
}

export function removeToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	if (!targetPreset) {
		return normalizeToolTargetPresets(presets);
	}
	return normalizeToolTargetPresets(presets).filter(
		(current) =>
			`${current.actionId}:${current.target}` !==
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
}

export function removeToolTargetPresetsByAction(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return normalized;
	}
	const selectedIsSaved = normalized.some(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (!selectedIsSaved) {
		return normalized;
	}
	return normalized.filter(
		(current) => current.actionId !== targetPreset.actionId,
	);
}

export function createToolTargetCleanupPreview(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetCleanupPreview | undefined {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return undefined;
	}
	const selectedIsSaved = normalized.some(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (!selectedIsSaved) {
		return undefined;
	}
	const count = normalized.filter(
		(current) => current.actionId === targetPreset.actionId,
	).length;
	const cleanup = createConfigCleanupPreview({
		id: `tools.targets.${targetPreset.actionId}`,
		label: "Tools target presets",
		scope: targetPreset.actionId,
		count,
		verb: "delete",
	});
	return {
		actionId: targetPreset.actionId,
		count,
		confirmationPhrase: cleanup.confirmationPhrase,
		rows: [
			"TOOL TARGET CLEANUP",
			`action=${targetPreset.actionId} saved=${count}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
		cleanup,
	};
}

export function submitToolTargetCleanupConfirmation(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	confirmation: string,
): ToolTargetCleanupConfirmation {
	const preview = createToolTargetCleanupPreview(presets, preset);
	const normalized = normalizeToolTargetPresets(presets);
	if (!preview) {
		return {
			confirmed: false,
			removed: 0,
			presets: normalized,
			message: "tool target action cleanup unavailable",
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		return {
			confirmed: false,
			removed: 0,
			presets: normalized,
			message: `tool target action cleanup rejected ${preview.actionId}`,
		};
	}
	const next = removeToolTargetPresetsByAction(normalized, preset);
	return {
		confirmed: true,
		removed: normalized.length - next.length,
		presets: next,
		message: `tool target action removed ${preview.actionId} (${normalized.length - next.length} presets)`,
	};
}

export function renameToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	label: string,
): ToolTargetPreset[] {
	const nextLabel = label.trim();
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextLabel) {
		return normalized;
	}
	return normalized.map((current) =>
		`${current.actionId}:${current.target}` ===
		`${targetPreset.actionId}:${targetPreset.target}`
			? { ...current, label: nextLabel }
			: current,
	);
}

export function retargetToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	target: string,
): ToolTargetPreset[] {
	const nextTarget = target.trim();
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextTarget) {
		return normalized;
	}
	return normalizeToolTargetPresets(
		normalized.map((current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`
				? { ...current, target: nextTarget }
				: current,
		),
	);
}

export function reassignToolTargetPresetAction(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
	actionId: string,
): ToolTargetPreset[] {
	const nextActionId = normalizeToolRunActionId(actionId);
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset || !nextActionId) {
		return normalized;
	}
	return normalizeToolTargetPresets(
		normalized.map((current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`
				? { ...current, actionId: nextActionId }
				: current,
		),
	);
}

export function promoteToolTargetPreset(
	presets: ToolTargetPreset[],
	preset: ToolTargetPreset | undefined,
): ToolTargetPreset[] {
	const [targetPreset] = normalizeToolTargetPresets(preset ? [preset] : []);
	const normalized = normalizeToolTargetPresets(presets);
	if (!targetPreset) {
		return normalized;
	}
	const index = normalized.findIndex(
		(current) =>
			`${current.actionId}:${current.target}` ===
			`${targetPreset.actionId}:${targetPreset.target}`,
	);
	if (index <= 0) {
		return normalized;
	}
	return [
		normalized[index],
		...normalized.slice(0, index),
		...normalized.slice(index + 1),
	];
}

export function nextToolHistoryPreset(
	presets: string[],
	currentQuery: string,
): string {
	if (!presets.length) {
		return "";
	}
	const normalized = currentQuery.trim();
	const index = presets.indexOf(normalized);
	if (index < 0 || index >= presets.length - 1) {
		return presets[0] ?? "";
	}
	return presets[index + 1] ?? "";
}

export function formatToolPromptRows(prompt: string, value: string): string[] {
	if (!prompt.startsWith("tool:")) {
		return [];
	}
	const actionId = prompt.slice("tool:".length);
	return [
		`TOOL TARGET ${actionId}`,
		`:tool ${value || " "}  enter=run esc=cancel`,
	];
}

export function moveToolHistorySelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	if (total <= 0) {
		return 0;
	}
	const normalized = Math.min(Math.max(current, 0), total - 1);
	const offset = direction === "next" ? 1 : -1;
	return (normalized + offset + total) % total;
}

export function moveToolTargetPresetSelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	return moveToolHistorySelection(current, total, direction);
}

export function moveFilteredToolHistorySelection(
	history: ToolHistoryItem[],
	current: number,
	query: string,
	direction: "next" | "previous",
	sort: ToolHistorySort = "time",
): number {
	const filtered = sortToolHistory(history, query, sort);
	if (filtered.length <= 0) {
		return 0;
	}
	const visibleIndex = getVisibleToolHistoryIndex(
		history,
		current,
		query,
		sort,
	);
	const currentFilteredIndex = Math.max(
		0,
		filtered.findIndex((entry) => entry.index === visibleIndex),
	);
	return (
		filtered[
			moveToolHistorySelection(currentFilteredIndex, filtered.length, direction)
		]?.index ??
		filtered[0]?.index ??
		0
	);
}

export function getSelectedToolHistoryItem(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ToolHistoryItem | undefined {
	if (history.length <= 0) {
		return undefined;
	}
	return history[Math.min(Math.max(selectedIndex, 0), history.length - 1)];
}

export function rerunToolHistoryItem(
	item: ToolHistoryItem | undefined,
): ToolRunPlan | undefined {
	return item?.plan;
}

export function getSelectedToolOutputClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	return createClipboardPreview({
		source: "tool-output",
		label: `${item.label} raw output`,
		copyText: item.rawOutput,
	});
}

export function getSelectedToolSummaryClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	if (!item) {
		return undefined;
	}
	return createClipboardPreview({
		source: "tool-summary",
		label: `${item.label} summary`,
		copyText: item.summary,
	});
}

export function getSelectedToolTargetClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	return getSelectedToolSectionClipboardPreview(
		history,
		selectedIndex,
		"target",
	);
}

export function getSelectedToolSectionClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const sectionLabel = selection === "target" ? "Target" : "Status";
	const sectionLines = item
		? extractRawSection(item.rawOutput, sectionLabel)
		: [];
	if (!item || sectionLines.length <= 0) {
		return undefined;
	}
	return createClipboardPreview({
		source: selection === "target" ? "tool-target" : "tool-status",
		label: `${item.label} ${selection} fields`,
		copyText: sectionLines.join("\n"),
	});
}

export function moveToolSectionClipboardRow(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
	currentIndex: number,
	direction: "previous" | "next",
): number {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const count = item
		? getToolSectionClipboardRowCountForItem(item, selection)
		: 0;
	if (count <= 0) {
		return 0;
	}
	const normalized = Math.min(Math.max(currentIndex, 0), count - 1);
	return direction === "next"
		? (normalized + 1) % count
		: (normalized - 1 + count) % count;
}

export function getSelectedToolSectionRowClipboardPreview(
	history: ToolHistoryItem[],
	selectedIndex: number,
	selection: ToolSectionClipboardSelection,
	rowIndex: number,
): ClipboardPreview | undefined {
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	const sectionLines = item ? getToolSectionClipboardRows(item, selection) : [];
	if (!item || sectionLines.length <= 0) {
		return undefined;
	}
	const bounded = Math.min(Math.max(rowIndex, 0), sectionLines.length - 1);
	return createClipboardPreview({
		source: "tool-row",
		label: `${item.label} ${selection} row ${bounded + 1}`,
		copyText: sectionLines[bounded] ?? "",
	});
}

export function formatToolHistoryExport(
	history: ToolHistoryItem[],
	options: {
		generatedAt?: string;
		scope: ToolHistoryExportScope;
		selectedIndex?: number;
	},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	const items = getToolHistoryExportItems(
		history,
		options.selectedIndex ?? Math.max(0, history.length - 1),
		options.scope,
	);
	return [
		"# picos tools history",
		`generatedAt=${generatedAt}`,
		`scope=${options.scope}`,
		`runs=${items.length}`,
		"",
		...items.flatMap(formatToolHistoryExportItem),
	].join("\n");
}

export function createToolHistoryExportPlan(
	history: ToolHistoryItem[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
		scope: ToolHistoryExportScope;
	},
): ToolHistoryExportPlan | undefined {
	const items = getToolHistoryExportItems(
		history,
		selectedIndex,
		options.scope,
	);
	if (!items.length) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: join(
			options.baseDir,
			"tools",
			`picos-tools-${options.scope}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatToolHistoryExport(items, {
			generatedAt: iso,
			scope: options.scope,
			selectedIndex: options.scope === "selected" ? 0 : selectedIndex,
		}),
		itemCount: items.length,
		scope: options.scope,
	};
}

export async function writeToolHistoryExport(
	plan: ToolHistoryExportPlan,
): Promise<ToolHistoryExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

function summarizeToolResult(result: ToolResult): string {
	const section = result.sections[0];
	if (!section) {
		return result.title;
	}
	return `${section.label}: ${section.lines.slice(0, 2).join(" | ")}`;
}

function getToolHistoryExportItems(
	history: ToolHistoryItem[],
	selectedIndex: number,
	scope: ToolHistoryExportScope,
): ToolHistoryItem[] {
	if (scope === "all") {
		return history;
	}
	const item = getSelectedToolHistoryItem(history, selectedIndex);
	return item ? [item] : [];
}

function formatToolHistoryExportItem(item: ToolHistoryItem): string[] {
	return [
		`## [${item.time}] ${item.label}`,
		`status=${item.status}`,
		`title=${item.title}`,
		`summary=${item.summary}`,
		`command=picos tools ${item.plan.toolId} ${item.plan.args.join(" ")}`,
		"",
		"```txt",
		item.rawOutput,
		"```",
		"",
	];
}

function getToolHistoryStatusRank(status: ToolHistoryItem["status"]): number {
	return status === "ok" ? 0 : 1;
}

function formatGroupedToolHistoryRows(
	entries: FilteredToolHistoryItem[],
	selectedIndex: number,
	group: ToolHistoryGroup,
): string[] {
	if (group === "none") {
		return entries.map((entry) => formatToolHistoryRow(entry, selectedIndex));
	}
	const counts = countToolHistoryGroups(entries, group);
	const rows: string[] = [];
	let currentGroup = "";
	for (const entry of entries) {
		const nextGroup = getToolHistoryGroupLabel(entry.item, group);
		if (nextGroup !== currentGroup) {
			currentGroup = nextGroup;
			rows.push(`## ${currentGroup} (${counts.get(currentGroup) ?? 0})`);
		}
		rows.push(formatToolHistoryRow(entry, selectedIndex));
	}
	return rows;
}

function countToolHistoryGroups(
	entries: FilteredToolHistoryItem[],
	group: ToolHistoryGroup,
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const label = getToolHistoryGroupLabel(entry.item, group);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return counts;
}

function formatToolHistoryPresetSummary(presets: string[]): string {
	return presets.slice(0, 3).join(",");
}

function formatToolTargetPresetRows(
	presets: ToolTargetPreset[],
	selectedIndex: number,
): string[] {
	if (!presets.length) {
		return [];
	}
	const normalizedIndex = Math.min(
		Math.max(selectedIndex, 0),
		presets.length - 1,
	);
	return [
		"TARGET PRESETS n/N cycle · T save · U pin · L label · M edit · A action · X delete · D delete action · R run",
		...presets.map(
			(preset, index) =>
				`${index === normalizedIndex ? ">" : " "} ${preset.label} ${preset.target} ${preset.hint}`,
		),
	];
}

function formatToolHistoryDetailRows(
	item: ToolHistoryItem,
	view: ToolHistoryDetailView,
): string[] {
	if (view === "summary") {
		return [
			"DETAIL summary",
			`title=${item.title}`,
			`status=${item.status}`,
			`summary=${item.summary}`,
			`command=${formatToolHistoryCommand(item)}`,
		];
	}
	if (view === "command") {
		return [
			"DETAIL command",
			`action=${item.plan.actionId}`,
			`tool=${item.plan.toolId}`,
			`args=${item.plan.args.join(" ") || "-"}`,
			`rerun=${formatToolHistoryCommand(item)}`,
		];
	}
	return [item.summary, "RAW", ...item.rawOutput.split(/\r?\n/)];
}

function formatToolHistoryCommand(item: ToolHistoryItem): string {
	return `picos tools ${item.plan.toolId} ${item.plan.args.join(" ")}`.trim();
}

function getToolSectionClipboardRows(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): string[] {
	return extractRawSection(
		item.rawOutput,
		selection === "target" ? "Target" : "Status",
	);
}

function getToolSectionClipboardRowCountForItem(
	item: ToolHistoryItem,
	selection: ToolSectionClipboardSelection,
): number {
	return getToolSectionClipboardRows(item, selection).length;
}

function extractRawSection(rawOutput: string, sectionLabel: string): string[] {
	const lines = rawOutput.split(/\r?\n/);
	const start = lines.indexOf(`[${sectionLabel}]`);
	if (start < 0) {
		return [];
	}
	const sectionLines: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^\[[^\]]+\]$/.test(line)) {
			break;
		}
		if (line.length > 0) {
			sectionLines.push(line);
		}
	}
	return sectionLines;
}

function formatToolHistoryRow(
	entry: FilteredToolHistoryItem,
	selectedIndex: number,
): string {
	return `${entry.index === selectedIndex ? ">" : " "} [${entry.item.time}] ${entry.item.status} ${entry.item.label}`;
}

function getToolHistoryGroupLabel(
	item: ToolHistoryItem,
	group: ToolHistoryGroup,
): string {
	if (group === "status") {
		return item.status;
	}
	if (group === "tool") {
		return item.plan.actionId;
	}
	return "all";
}

function formatToolHistorySearchText(item: ToolHistoryItem): string {
	return [
		item.time,
		item.status,
		item.label,
		item.title,
		item.summary,
		item.rawOutput,
		item.plan.actionId,
		item.plan.toolId,
		...item.plan.args,
	]
		.join(" ")
		.toLowerCase();
}

function createToolHistoryId(time: string, label: string): string {
	return `${time}-${label
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "")}`;
}

function parseHostPortTarget(target: string): { host: string; port: string } {
	const [hostPart, portPart] = target.split(/\s+/, 2);
	if (hostPart?.includes(":") && !portPart) {
		const separator = hostPart.lastIndexOf(":");
		return {
			host: hostPart.slice(0, separator),
			port: hostPart.slice(separator + 1) || "443",
		};
	}
	return {
		host: hostPart || "example.com",
		port: portPart || "443",
	};
}

function normalizeToolRunActionId(input: string): ToolRunActionId | undefined {
	const value = input.trim();
	if (!value) {
		return undefined;
	}
	if (
		value === "tools.dns" ||
		value === "tools.traceroute" ||
		value === "tools.whois" ||
		value === "tools.ipInfo" ||
		value === "tools.tls" ||
		value === "network.connect" ||
		value === "ping.default"
	) {
		return value;
	}
	return toolRunActionAliases[value.toLowerCase()];
}

function dedupeToolTargetPresets(
	presets: ToolTargetPreset[],
): ToolTargetPreset[] {
	const seen = new Set<string>();
	const deduped: ToolTargetPreset[] = [];
	for (const preset of presets) {
		const key = `${preset.actionId}:${preset.target}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		deduped.push(preset);
	}
	return deduped;
}
