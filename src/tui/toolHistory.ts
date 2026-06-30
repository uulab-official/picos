import type { ToolId, ToolResult } from "../core/tools";
import type { NetworkSummary } from "../core/types";

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
	title: string;
	summary: string;
	rawOutput: string;
};

export function createToolRunPlan(
	actionId: string,
	defaultTarget: string,
	summary?: NetworkSummary,
): ToolRunPlan | undefined {
	const target = defaultTarget || "example.com";
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
		const ip = summary?.publicIp ?? "8.8.8.8";
		return {
			actionId,
			toolId: "ip-info",
			args: [ip],
			label: `${actionId} ${ip}`,
		};
	}
	if (actionId === "tools.tls") {
		return {
			actionId,
			toolId: "tls",
			args: [`${target}:443`],
			label: `${actionId} ${target}:443`,
		};
	}
	if (actionId === "network.connect") {
		return {
			actionId,
			toolId: "port-check",
			args: [target, "443"],
			label: `${actionId} ${target}:443`,
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
		title: input.result.title,
		summary: summarizeToolResult(input.result),
		rawOutput: input.result.rawOutput,
	};
	return [...history, item].slice(-limit);
}

export function formatToolsWorkspaceRows(
	history: ToolHistoryItem[],
	visibleRows: number,
): string[] {
	const latest = history.at(-1);
	const bodyRows = latest
		? [
				`[${latest.time}] ${latest.status} ${latest.label}`,
				latest.summary,
				"RAW",
				...latest.rawOutput.split(/\r?\n/),
			]
		: ["no tool runs yet"];
	return [
		`TOOLS history=${history.length} latest=${latest?.title ?? "-"}`,
		...bodyRows,
		"shortcuts: action enter=run · raw.view shows latest raw output",
	].slice(0, visibleRows);
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
