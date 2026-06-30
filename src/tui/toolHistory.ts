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
): string[] {
	const latest =
		getSelectedToolHistoryItem(history, selectedIndex) ?? history.at(-1);
	const historyRows = history.map(
		(item, index) =>
			`${index === selectedIndex ? ">" : " "} [${item.time}] ${item.status} ${item.label}`,
	);
	const bodyRows = latest
		? [
				...historyRows,
				latest.summary,
				"RAW",
				...latest.rawOutput.split(/\r?\n/),
			]
		: ["no tool runs yet"];
	return [
		`TOOLS history=${history.length} selected=${latest?.title ?? "-"}`,
		...bodyRows,
		"shortcuts: j/k select · r rerun · y copy summary · c copy raw · action enter=target prompt",
	].slice(0, visibleRows);
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

function summarizeToolResult(result: ToolResult): string {
	const section = result.sections[0];
	if (!section) {
		return result.title;
	}
	return `${section.label}: ${section.lines.slice(0, 2).join(" | ")}`;
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
