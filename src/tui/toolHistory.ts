import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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

export { normalizeToolTargetPresets };

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
			toolId: "port-check",
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
	return [
		`TOOLS history=${history.length}${filter ? ` filter=${filter} matches=${filtered.length}` : ""}${sort !== "time" ? ` sort=${sort}` : ""}${group !== "none" ? ` group=${group}` : ""}${presetSummary ? ` presets=${presetSummary}` : ""}${targetPresets.length ? ` targets=${targetPresets.length} active=${activeTargetPreset?.label}:${activeTargetPreset?.target}` : ""}${detailSummary} selected=${latest?.title ?? "-"}`,
		...targetRows,
		...visibleBodyRows,
		"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · n target · T save target · R run · r rerun · y summary · c raw",
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
		"TARGET PRESETS n cycle · T save · R run",
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
