import { describe, expect, test } from "bun:test";
import type { ToolResult } from "../src/core/tools";
import type { NetworkSummary } from "../src/core/types";
import {
	appendToolHistory,
	createToolRunPlan,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getSelectedToolHistoryItem,
	moveToolHistorySelection,
	rerunToolHistoryItem,
} from "../src/tui/toolHistory";

const result: ToolResult = {
	title: "DNS Lookup",
	sections: [
		{ label: "Summary", lines: ["Query: example.com", "A: 2"] },
		{ label: "A Records", lines: ["93.184.216.34"] },
	],
	rawOutput: "$ picos tools dns example.com\n[Summary]\nQuery: example.com",
};

const summary: NetworkSummary = {
	status: "online",
	host: "local",
	platform: "darwin",
	interfaces: [],
	networkGroups: [],
	dnsServers: ["1.1.1.1"],
	publicIp: "203.0.113.10",
};

describe("TUI tool history", () => {
	test("plans safe default tool runs from read-only action ids", () => {
		expect(createToolRunPlan("tools.dns", "example.com", summary)).toEqual({
			actionId: "tools.dns",
			toolId: "dns",
			args: ["example.com"],
			label: "tools.dns example.com",
		});
		expect(
			createToolRunPlan("network.connect", "example.com", summary),
		).toEqual({
			actionId: "network.connect",
			toolId: "port-check",
			args: ["example.com", "443"],
			label: "network.connect example.com:443",
		});
		expect(createToolRunPlan("ping.default", "example.com", summary)).toEqual({
			actionId: "ping.default",
			toolId: "ping",
			args: ["example.com"],
			label: "ping.default example.com",
		});
		expect(createToolRunPlan("tools.ipInfo", "example.com", summary)).toEqual({
			actionId: "tools.ipInfo",
			toolId: "ip-info",
			args: ["203.0.113.10"],
			label: "tools.ipInfo 203.0.113.10",
		});
		expect(
			createToolRunPlan("raw.view", "example.com", summary),
		).toBeUndefined();
	});

	test("plans tool runs from operator target prompts", () => {
		expect(
			createToolRunPlan("tools.dns", "example.com", summary, "cloudflare.com"),
		).toEqual({
			actionId: "tools.dns",
			toolId: "dns",
			args: ["cloudflare.com"],
			label: "tools.dns cloudflare.com",
		});
		expect(
			createToolRunPlan(
				"network.connect",
				"example.com",
				summary,
				"api.github.com 8443",
			),
		).toEqual({
			actionId: "network.connect",
			toolId: "port-check",
			args: ["api.github.com", "8443"],
			label: "network.connect api.github.com:8443",
		});
		expect(
			createToolRunPlan(
				"network.connect",
				"example.com",
				summary,
				"api.github.com:9443",
			),
		).toEqual({
			actionId: "network.connect",
			toolId: "port-check",
			args: ["api.github.com", "9443"],
			label: "network.connect api.github.com:9443",
		});
		expect(
			createToolRunPlan(
				"tools.tls",
				"example.com",
				summary,
				"api.github.com:8443",
			),
		).toEqual({
			actionId: "tools.tls",
			toolId: "tls",
			args: ["api.github.com:8443"],
			label: "tools.tls api.github.com:8443",
		});
		expect(
			createToolRunPlan("tools.ipInfo", "example.com", summary, "8.8.8.8"),
		).toEqual({
			actionId: "tools.ipInfo",
			toolId: "ip-info",
			args: ["8.8.8.8"],
			label: "tools.ipInfo 8.8.8.8",
		});
	});

	test("keeps latest tool results with stable raw handoff metadata", () => {
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "tools.dns",
					toolId: "dns",
					args: ["example.com"],
					label: "tools.dns example.com",
				},
				result,
			},
			"12:00:00",
		);

		expect(history).toEqual([
			{
				id: "12:00:00-tools-dns-example-com",
				time: "12:00:00",
				status: "ok",
				label: "tools.dns example.com",
				plan: {
					actionId: "tools.dns",
					toolId: "dns",
					args: ["example.com"],
					label: "tools.dns example.com",
				},
				title: "DNS Lookup",
				summary: "Summary: Query: example.com | A: 2",
				rawOutput: result.rawOutput,
			},
		]);
	});

	test("formats tool history rows with latest summary and clipped raw output", () => {
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "tools.dns",
					toolId: "dns",
					args: ["example.com"],
					label: "tools.dns example.com",
				},
				result,
			},
			"12:00:00",
		);

		expect(formatToolsWorkspaceRows(history, 8)).toEqual([
			"TOOLS history=1 selected=DNS Lookup",
			"> [12:00:00] ok tools.dns example.com",
			"Summary: Query: example.com | A: 2",
			"RAW",
			"$ picos tools dns example.com",
			"[Summary]",
			"Query: example.com",
			"shortcuts: j/k select · r rerun · action enter=target prompt · raw.view latest",
		]);
	});

	test("formats selected tool history rows for keyboard navigation", () => {
		const history = appendToolHistory(
			appendToolHistory(
				[],
				{
					plan: {
						actionId: "tools.dns",
						toolId: "dns",
						args: ["example.com"],
						label: "tools.dns example.com",
					},
					result,
				},
				"12:00:00",
			),
			{
				plan: {
					actionId: "ping.default",
					toolId: "ping",
					args: ["8.8.8.8"],
					label: "ping.default 8.8.8.8",
				},
				result: { ...result, title: "Ping" },
			},
			"12:00:01",
		);

		expect(formatToolsWorkspaceRows(history, 5, 0).slice(0, 3)).toEqual([
			"TOOLS history=2 selected=DNS Lookup",
			"> [12:00:00] ok tools.dns example.com",
			"  [12:00:01] ok ping.default 8.8.8.8",
		]);
	});

	test("formats active tool target prompt rows", () => {
		expect(
			formatToolPromptRows("tool:network.connect", "api.github.com 443"),
		).toEqual([
			"TOOL TARGET network.connect",
			":tool api.github.com 443  enter=run esc=cancel",
		]);
		expect(formatToolPromptRows("route", "8.8.8.8")).toEqual([]);
	});

	test("moves selected tool history with wraparound", () => {
		expect(moveToolHistorySelection(0, 3, "previous")).toBe(2);
		expect(moveToolHistorySelection(2, 3, "next")).toBe(0);
		expect(moveToolHistorySelection(99, 3, "next")).toBe(0);
		expect(moveToolHistorySelection(0, 0, "next")).toBe(0);
	});

	test("selects and reruns previous tool history entries", () => {
		const history = [
			...appendToolHistory(
				[],
				{
					plan: {
						actionId: "tools.dns",
						toolId: "dns",
						args: ["example.com"],
						label: "tools.dns example.com",
					},
					result,
				},
				"12:00:00",
			),
			...appendToolHistory(
				[],
				{
					plan: {
						actionId: "network.connect",
						toolId: "port-check",
						args: ["api.github.com", "8443"],
						label: "network.connect api.github.com:8443",
					},
					result: {
						...result,
						title: "TCP Port Check",
						rawOutput: "$ picos tools port-check api.github.com 8443",
					},
				},
				"12:00:01",
			),
		];

		expect(getSelectedToolHistoryItem(history, 1)?.label).toBe(
			"network.connect api.github.com:8443",
		);
		expect(rerunToolHistoryItem(history[1])).toEqual({
			actionId: "network.connect",
			toolId: "port-check",
			args: ["api.github.com", "8443"],
			label: "network.connect api.github.com:8443",
		});
		expect(rerunToolHistoryItem(undefined)).toBeUndefined();
	});
});
