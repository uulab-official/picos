import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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
): string[] {
	const filtered = filterToolHistory(history, filterQuery);
	const latestIndex = getVisibleToolHistoryIndex(
		history,
		selectedIndex,
		filterQuery,
	);
	const latest = filtered.find((entry) => entry.index === latestIndex)?.item;
	const historyRows = filtered.map(
		(entry) =>
			`${entry.index === latestIndex ? ">" : " "} [${entry.item.time}] ${entry.item.status} ${entry.item.label}`,
	);
	const bodyRows = latest
		? [
				...historyRows,
				latest.summary,
				"RAW",
				...latest.rawOutput.split(/\r?\n/),
			]
		: [history.length ? "no matching tool runs" : "no tool runs yet"];
	const filter = filterQuery.trim();
	return [
		`TOOLS history=${history.length}${filter ? ` filter=${filter} matches=${filtered.length}` : ""} selected=${latest?.title ?? "-"}`,
		...bodyRows,
		"shortcuts: j/k select · f filter · F clear · r rerun · y summary · c raw · e export",
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
): number {
	const filtered = filterToolHistory(history, query);
	if (!filtered.length) {
		return 0;
	}
	if (filtered.some((entry) => entry.index === selectedIndex)) {
		return selectedIndex;
	}
	return filtered[0]?.index ?? 0;
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
): number {
	const filtered = filterToolHistory(history, query);
	if (filtered.length <= 0) {
		return 0;
	}
	const visibleIndex = getVisibleToolHistoryIndex(history, current, query);
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
