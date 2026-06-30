import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolResult } from "../src/core/tools";
import type { NetworkSummary } from "../src/core/types";
import {
	appendToolHistory,
	createToolHistoryExportPlan,
	createToolRunPlan,
	filterToolHistory,
	formatToolHistoryExport,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getSelectedToolHistoryItem,
	getSelectedToolOutputClipboardPreview,
	getSelectedToolSummaryClipboardPreview,
	getVisibleToolHistoryIndex,
	moveFilteredToolHistorySelection,
	moveToolHistorySelection,
	nextToolHistorySort,
	rerunToolHistoryItem,
	sortToolHistory,
	writeToolHistoryExport,
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
			"shortcuts: j/k select · f filter · F clear · s sort · r rerun · y summary · c raw",
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

	test("filters tool history while preserving source selection indexes", () => {
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
					actionId: "network.connect",
					toolId: "port-check",
					args: ["api.github.com", "443"],
					label: "network.connect api.github.com:443",
				},
				result: {
					...result,
					title: "TCP Port Check",
					rawOutput: "$ picos tools port-check api.github.com 443",
				},
			},
			"12:00:01",
		);

		expect(filterToolHistory(history, "connect")).toEqual([
			{
				index: 1,
				item: history[1],
			},
		]);
		expect(formatToolsWorkspaceRows(history, 7, 1, "connect")).toEqual([
			"TOOLS history=2 filter=connect matches=1 selected=TCP Port Check",
			"> [12:00:01] ok network.connect api.github.com:443",
			"Summary: Query: example.com | A: 2",
			"RAW",
			"$ picos tools port-check api.github.com 443",
			"shortcuts: j/k select · f filter · F clear · s sort · r rerun · y summary · c raw",
		]);
		expect(formatToolsWorkspaceRows(history, 4, 0, "missing")).toEqual([
			"TOOLS history=2 filter=missing matches=0 selected=-",
			"no matching tool runs",
			"shortcuts: j/k select · f filter · F clear · s sort · r rerun · y summary · c raw",
		]);
		expect(
			moveFilteredToolHistorySelection(history, 0, "connect", "next"),
		).toBe(1);
		expect(
			moveFilteredToolHistorySelection(history, 1, "connect", "previous"),
		).toBe(1);
		expect(getVisibleToolHistoryIndex(history, 0, "connect")).toBe(1);
	});

	test("sorts tool history while preserving source selection indexes", () => {
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
					actionId: "network.connect",
					toolId: "port-check",
					args: ["api.github.com", "443"],
					label: "network.connect api.github.com:443",
				},
				result: {
					...result,
					title: "TCP Port Check",
					rawOutput: "$ picos tools port-check api.github.com 443",
				},
				status: "fail",
			},
			"12:00:01",
		);

		expect(
			sortToolHistory(history, "", "tool").map((entry) => entry.index),
		).toEqual([1, 0]);
		expect(
			sortToolHistory(history, "", "status").map((entry) => entry.index),
		).toEqual([0, 1]);
		expect(nextToolHistorySort("time")).toBe("tool");
		expect(nextToolHistorySort("tool")).toBe("status");
		expect(nextToolHistorySort("status")).toBe("time");
		expect(formatToolsWorkspaceRows(history, 7, 1, "", "tool")).toEqual([
			"TOOLS history=2 sort=tool selected=TCP Port Check",
			"> [12:00:01] fail network.connect api.github.com:443",
			"  [12:00:00] ok tools.dns example.com",
			"Summary: Query: example.com | A: 2",
			"RAW",
			"$ picos tools port-check api.github.com 443",
			"shortcuts: j/k select · f filter · F clear · s sort · r rerun · y summary · c raw",
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

	test("creates a locked clipboard preview for selected tool raw output", () => {
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

		expect(getSelectedToolOutputClipboardPreview(history, 0)).toEqual({
			source: "tool-output",
			label: "tools.dns example.com raw output",
			copyText: "$ picos tools dns example.com\n[Summary]\nQuery: example.com",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedToolOutputClipboardPreview([], 0)).toBeUndefined();
	});

	test("creates a locked clipboard preview for selected tool summary", () => {
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

		expect(getSelectedToolSummaryClipboardPreview(history, 0)).toEqual({
			source: "tool-summary",
			label: "tools.dns example.com summary",
			copyText: "Summary: Query: example.com | A: 2",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedToolSummaryClipboardPreview([], 0)).toBeUndefined();
	});

	test("creates scoped export plans for selected tool history", () => {
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
					actionId: "network.connect",
					toolId: "port-check",
					args: ["api.github.com", "443"],
					label: "network.connect api.github.com:443",
				},
				result: {
					...result,
					title: "TCP Port Check",
					rawOutput: "$ picos tools port-check api.github.com 443",
				},
			},
			"12:00:01",
		);

		expect(
			createToolHistoryExportPlan(history, 1, {
				baseDir: "/Users/bonjin/.config/picos",
				scope: "selected",
				generatedAt: new Date("2026-06-30T04:00:00.000Z"),
			}),
		).toEqual({
			path: "/Users/bonjin/.config/picos/tools/picos-tools-selected-2026-06-30T040000000Z.md",
			content: [
				"# picos tools history",
				"generatedAt=2026-06-30T04:00:00.000Z",
				"scope=selected",
				"runs=1",
				"",
				"## [12:00:01] network.connect api.github.com:443",
				"status=ok",
				"title=TCP Port Check",
				"summary=Summary: Query: example.com | A: 2",
				"command=picos tools port-check api.github.com 443",
				"",
				"```txt",
				"$ picos tools port-check api.github.com 443",
				"```",
				"",
			].join("\n"),
			itemCount: 1,
			scope: "selected",
		});
		expect(
			formatToolHistoryExport(history, {
				scope: "all",
				generatedAt: "2026-06-30T04:00:00.000Z",
			}),
		).toContain("runs=2");
		expect(
			createToolHistoryExportPlan([], 0, {
				baseDir: "/Users/bonjin/.config/picos",
				scope: "selected",
			}),
		).toBeUndefined();
	});

	test("writes tool history export files", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-tools-export-"));
		try {
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
			const plan = createToolHistoryExportPlan(history, 0, {
				baseDir: root,
				scope: "selected",
				generatedAt: new Date("2026-06-30T04:00:00.000Z"),
			});

			if (!plan) {
				throw new Error("expected tool history export plan");
			}
			const written = await writeToolHistoryExport(plan);

			expect(written).toEqual(plan);
			expect(await readFile(written.path, "utf8")).toContain(
				"tools.dns example.com",
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
