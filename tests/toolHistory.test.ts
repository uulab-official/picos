import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { ToolResult } from "../src/core/tools";
import type { NetworkSummary } from "../src/core/types";
import type { ToolsWorkspaceCommand } from "../src/tui/appInputDispatcher";
import type { ClipboardPreview } from "../src/tui/clipboardPreview";
import {
	appendToolHistory,
	archiveToolHistoryExport,
	classifyToolHistoryExportIndexRefresh,
	createToolFormState,
	createToolHistoryArchiveRetentionPlan,
	createToolHistoryCleanupPreview,
	createToolHistoryCompareExportPlan,
	createToolHistoryExportArchivePlan,
	createToolHistoryExportPlan,
	createToolRunPlan,
	createToolRunPlanFromForm,
	createToolRunPlanFromPreset,
	createToolTargetCleanupPreview,
	createToolTargetPromptIntent,
	createToolTargetRunIntent,
	filterToolHistory,
	filterToolHistoryExportIndex,
	formatToolFormInputValue,
	formatToolFormRows,
	formatToolHistoryArchiveRetentionRows,
	formatToolHistoryExport,
	formatToolHistoryExportArchiveRows,
	formatToolHistoryExportIndexRows,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getSelectedToolCompareClipboardPreview,
	getSelectedToolHistoryExport,
	getSelectedToolHistoryItem,
	getSelectedToolOutputClipboardPreview,
	getSelectedToolSectionClipboardPreview,
	getSelectedToolSectionRowClipboardPreview,
	getSelectedToolSummaryClipboardPreview,
	getSelectedToolTargetClipboardPreview,
	getSelectedToolTargetPreset,
	getToolHistoryDetailViewShortcut,
	getToolRunActionMetadata,
	getToolTargetPresets,
	getVisibleToolHistoryIndex,
	moveFilteredToolHistorySelection,
	moveToolFormField,
	moveToolHistorySelection,
	moveToolSectionClipboardRow,
	moveToolTargetPresetSelection,
	nextToolHistoryDetailView,
	nextToolHistoryEvidenceFilter,
	nextToolHistoryGroup,
	nextToolHistoryPreset,
	nextToolHistorySort,
	nextToolSectionClipboardSelection,
	normalizeToolTargetPresets,
	parseToolTargetPresetCommand,
	prepareSelectedToolHistoryExport,
	prepareSelectedToolHistoryExportArchive,
	prepareSelectedToolHistoryExportOpen,
	prepareToolHistoryArchiveRetentionConfirmation,
	prepareToolHistoryExport,
	prepareToolHistoryExportArchiveConfirmation,
	prepareToolsWorkspaceInput,
	promoteToolTargetPreset,
	promoteToolTargetPresetTransition,
	pruneToolHistoryExportArchive,
	readToolHistoryExportArchiveIndex,
	readToolHistoryExportIndex,
	reassignToolTargetPresetAction,
	reassignToolTargetPresetActionTransition,
	removeToolTargetPreset,
	removeToolTargetPresetsByAction,
	removeToolTargetPresetTransition,
	renameToolTargetPreset,
	renameToolTargetPresetTransition,
	rerunToolHistoryItem,
	retargetToolTargetPreset,
	retargetToolTargetPresetTransition,
	saveSelectedToolTargetPresetTransition,
	saveToolHistoryPreset,
	saveToolTargetPreset,
	selectToolFormField,
	selectToolTargetPresetTransition,
	sortToolHistory,
	submitToolHistoryCleanupConfirmation,
	submitToolTargetCleanupConfirmation,
	submitToolTargetCleanupTransition,
	submitToolTargetPresetCommandTransition,
	type ToolsWorkspaceInput,
	type ToolsWorkspaceInputEffect,
	type ToolTargetPreset,
	updateToolFormFieldValue,
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

const savedToolTargetPresets = [
	{
		id: "api-dns",
		label: "API DNS",
		actionId: "tools.dns",
		target: "api.example.com",
		hint: "saved DNS target",
	},
	{
		id: "db-ping",
		label: "DB ping",
		actionId: "ping.default",
		target: "db.example.com",
		hint: "saved reachability target",
	},
] satisfies ToolTargetPreset[];

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
			toolId: "telnet",
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
			toolId: "telnet",
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
			toolId: "telnet",
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

	test("builds OS-aware tool target presets from network state", () => {
		const networkSummary: NetworkSummary = {
			...summary,
			interfaces: [
				{
					name: "Wi-Fi",
					ipv4: "192.168.0.20",
					ipv6: "fe80::1",
					status: "connected",
					kind: "wifiOrEthernet",
					mac: "aa:bb:cc:dd:ee:ff",
				},
			],
			primaryInterface: {
				name: "Wi-Fi",
				ipv4: "192.168.0.20",
				status: "connected",
				kind: "wifiOrEthernet",
			},
			gateway: "192.168.0.1",
			dnsServers: ["1.1.1.1", "8.8.8.8"],
		};

		const presets = getToolTargetPresets(networkSummary, "google.com");

		expect(presets.map((preset) => preset.id)).toEqual([
			"default-ping",
			"gateway-ping",
			"dns-1",
			"dns-2",
			"public-ip",
			"web-https",
			"web-tls",
		]);
		expect(presets[1]).toEqual({
			id: "gateway-ping",
			label: "Gateway ping",
			actionId: "ping.default",
			target: "192.168.0.1",
			hint: "primary gateway",
		});
		expect(createToolRunPlanFromPreset(presets[2])).toEqual({
			actionId: "tools.dns",
			toolId: "dns",
			args: ["1.1.1.1"],
			label: "tools.dns 1.1.1.1",
		});
		expect(createToolRunPlanFromPreset(presets[4])).toEqual({
			actionId: "tools.ipInfo",
			toolId: "ip-info",
			args: ["203.0.113.10"],
			label: "tools.ipInfo 203.0.113.10",
		});
		expect(
			formatToolsWorkspaceRows(
				[],
				6,
				0,
				"",
				"time",
				"none",
				[],
				"raw",
				presets,
			),
		).toEqual([
			"TOOLS history=0 targets=7 active=Default ping:google.com selected=-",
			"TARGET PRESETS n/N cycle · T save · U pin · L label · M edit · A action · X delete · D delete action · R run",
			"> Default ping google.com default reachability target",
			"  Gateway ping 192.168.0.1 primary gateway",
			"  DNS server 1 1.1.1.1 resolver check",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
	});

	test("merges normalized custom tool target presets before OS presets", () => {
		const custom = normalizeToolTargetPresets([
			{
				id: " api ",
				label: " API DNS ",
				actionId: "tools.dns",
				target: " api.example.com ",
				hint: " production api ",
			},
			{
				id: "bad",
				label: "Bad",
				actionId: "tools.bad",
				target: "ignored",
			},
			{
				id: "api-duplicate",
				label: "Duplicate",
				actionId: "tools.dns",
				target: "api.example.com",
			},
			{
				id: "",
				actionId: "network.connect",
				target: "db.internal:5432",
			},
		]);

		expect(custom).toEqual([
			{
				id: "api",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "network-connect-db-internal-5432",
				label: "network.connect db.internal:5432",
				actionId: "network.connect",
				target: "db.internal:5432",
				hint: "custom target",
			},
		]);

		const presets = getToolTargetPresets(summary, "google.com", custom);
		expect(presets.slice(0, 3).map((preset) => preset.id)).toEqual([
			"api",
			"network-connect-db-internal-5432",
			"default-ping",
		]);
		expect(createToolRunPlanFromPreset(presets[1])).toEqual({
			actionId: "network.connect",
			toolId: "telnet",
			args: ["db.internal", "5432"],
			label: "network.connect db.internal:5432",
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
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
		expect(formatToolsWorkspaceRows(history, 4, 0, "missing")).toEqual([
			"TOOLS history=2 filter=missing matches=0 selected=-",
			"no matching tool runs",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
	});

	test("groups tool history rows without changing source selection indexes", () => {
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

		expect(nextToolHistoryGroup("none")).toBe("tool");
		expect(nextToolHistoryGroup("tool")).toBe("status");
		expect(nextToolHistoryGroup("status")).toBe("none");
		expect(
			formatToolsWorkspaceRows(history, 10, 1, "", "tool", "tool"),
		).toEqual([
			"TOOLS history=2 sort=tool group=tool selected=TCP Port Check",
			"## network.connect (1)",
			"> [12:00:01] fail network.connect api.github.com:443",
			"## tools.dns (1)",
			"  [12:00:00] ok tools.dns example.com",
			"Summary: Query: example.com | A: 2",
			"RAW",
			"$ picos tools port-check api.github.com 443",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
		expect(
			formatToolsWorkspaceRows(history, 7, 0, "", "time", "status"),
		).toEqual([
			"TOOLS history=2 group=status selected=DNS Lookup",
			"## ok (1)",
			"> [12:00:00] ok tools.dns example.com",
			"## fail (1)",
			"  [12:00:01] fail network.connect api.github.com:443",
			"Summary: Query: example.com | A: 2",
			"RAW",
		]);
	});

	test("saves and cycles tool history filter presets", () => {
		const presets = saveToolHistoryPreset(["fail", "dns"], " connect ", 3);

		expect(presets).toEqual(["connect", "fail", "dns"]);
		expect(saveToolHistoryPreset(presets, "dns", 3)).toEqual([
			"dns",
			"connect",
			"fail",
		]);
		expect(saveToolHistoryPreset(presets, "  ", 3)).toEqual(presets);
		expect(saveToolHistoryPreset(presets, "tls", 3)).toEqual([
			"tls",
			"connect",
			"fail",
		]);
		expect(nextToolHistoryPreset(presets, "")).toBe("connect");
		expect(nextToolHistoryPreset(presets, "connect")).toBe("fail");
		expect(nextToolHistoryPreset(presets, "dns")).toBe("connect");
		expect(nextToolHistoryPreset([], "connect")).toBe("");
		expect(
			formatToolsWorkspaceRows([], 3, 0, "", "time", "none", presets),
		).toEqual([
			"TOOLS history=0 presets=connect,fail,dns selected=-",
			"no tool runs yet",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
	});

	test("requires exact confirmation before clearing tool history filter presets", () => {
		const presets = ["connect", "fail", "dns"];
		const preview = createToolHistoryCleanupPreview(presets);

		expect(preview).toEqual({
			count: 3,
			confirmationPhrase: "clear tools history",
			cleanup: {
				id: "tools.history.filters",
				label: "Tools history filter presets",
				scope: "tools history",
				count: 3,
				verb: "clear",
				confirmationPhrase: "clear tools history",
				rows: [
					"CONFIG CLEANUP",
					"target=Tools history filter presets",
					"scope=tools history count=3",
					"confirm clear tools history locked",
				],
			},
			rows: [
				"TOOLS HISTORY CLEANUP",
				"filter-presets=3",
				"confirm clear tools history locked",
			],
		});
		expect(
			submitToolHistoryCleanupConfirmation(presets, "clear tool history"),
		).toEqual({
			confirmed: false,
			message: "tool history filter cleanup rejected",
			presets,
			removed: 0,
		});
		expect(
			submitToolHistoryCleanupConfirmation(presets, " clear tools history "),
		).toEqual({
			confirmed: true,
			message: "tool history filter cleanup removed 3 presets",
			presets: [],
			removed: 3,
		});
		expect(createToolHistoryCleanupPreview([])).toBeUndefined();
	});

	test("saves normalized tool target presets without duplicates", () => {
		const presets = saveToolTargetPreset(
			[
				{
					id: "api-dns",
					label: "API DNS",
					actionId: "tools.dns",
					target: "api.example.com",
					hint: "production api",
				},
			],
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect",
				target: " db.internal:5432 ",
				hint: "internal db",
			},
			3,
		);

		expect(presets).toEqual([
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect",
				target: "db.internal:5432",
				hint: "internal db",
			},
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
		]);
		expect(saveToolTargetPreset(presets, presets[1], 3)).toEqual([
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect",
				target: "db.internal:5432",
				hint: "internal db",
			},
		]);
	});

	test("removes saved tool target presets by action and target only", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];

		expect(
			removeToolTargetPreset(presets, {
				id: "renamed",
				label: "Renamed API",
				actionId: "tools.dns",
				target: " api.example.com ",
				hint: "same target",
			}),
		).toEqual([presets[1]]);
		expect(
			removeToolTargetPreset(presets, {
				id: "gateway-ping",
				label: "Gateway ping",
				actionId: "ping.default",
				target: "192.168.0.1",
				hint: "OS-aware target",
			}),
		).toEqual(presets);
		expect(removeToolTargetPreset(presets, undefined)).toEqual(presets);
	});

	test("removes saved tool target presets by selected action in bulk", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "edge-dns",
				label: "Edge DNS",
				actionId: "tools.dns" as const,
				target: "edge.example.com",
				hint: "edge dns",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];

		expect(
			removeToolTargetPresetsByAction(presets, {
				id: "renamed-api",
				label: "Renamed API",
				actionId: "tools.dns",
				target: " api.example.com ",
				hint: "same target",
			}),
		).toEqual([presets[2]]);
		expect(
			removeToolTargetPresetsByAction(presets, {
				id: "gateway-dns",
				label: "Gateway DNS",
				actionId: "tools.dns",
				target: "192.168.0.1",
				hint: "OS-aware target",
			}),
		).toEqual(presets);
		expect(removeToolTargetPresetsByAction(presets, undefined)).toEqual(
			presets,
		);
	});

	test("requires exact confirmation before bulk target action cleanup", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "edge-dns",
				label: "Edge DNS",
				actionId: "tools.dns" as const,
				target: "edge.example.com",
				hint: "edge dns",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];
		const preview = createToolTargetCleanupPreview(presets, presets[0]);

		expect(preview).toEqual({
			actionId: "tools.dns",
			count: 2,
			confirmationPhrase: "delete tools.dns",
			cleanup: {
				id: "tools.targets.tools.dns",
				label: "Tools target presets",
				scope: "tools.dns",
				count: 2,
				verb: "delete",
				confirmationPhrase: "delete tools.dns",
				rows: [
					"CONFIG CLEANUP",
					"target=Tools target presets",
					"scope=tools.dns count=2",
					"confirm delete tools.dns locked",
				],
			},
			rows: [
				"TOOL TARGET CLEANUP",
				"action=tools.dns saved=2",
				"confirm delete tools.dns locked",
			],
		});
		expect(
			submitToolTargetCleanupConfirmation(presets, presets[0], "delete dns"),
		).toEqual({
			confirmed: false,
			removed: 0,
			presets,
			message: "tool target action cleanup rejected tools.dns",
		});
		expect(
			submitToolTargetCleanupConfirmation(
				presets,
				presets[0],
				" delete tools.dns ",
			),
		).toEqual({
			confirmed: true,
			removed: 2,
			presets: [presets[2]],
			message: "tool target action removed tools.dns (2 presets)",
		});
		expect(createToolTargetCleanupPreview(presets, undefined)).toBeUndefined();
	});

	test("renames saved tool target presets by action and target only", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];

		expect(
			renameToolTargetPreset(
				presets,
				{
					id: "renamed",
					label: "Renamed API",
					actionId: "tools.dns",
					target: " api.example.com ",
					hint: "same target",
				},
				" Production API DNS ",
			),
		).toEqual([
			{
				id: "api-dns",
				label: "Production API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
			presets[1],
		]);
		expect(renameToolTargetPreset(presets, presets[0], "  ")).toEqual(presets);
		expect(
			renameToolTargetPreset(
				presets,
				{
					id: "gateway-ping",
					label: "Gateway ping",
					actionId: "ping.default",
					target: "192.168.0.1",
					hint: "OS-aware target",
				},
				"Router",
			),
		).toEqual(presets);
	});

	test("edits saved tool target values by action and target only", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];

		expect(
			retargetToolTargetPreset(
				presets,
				{
					id: "renamed",
					label: "Renamed API",
					actionId: "tools.dns",
					target: " api.example.com ",
					hint: "same target",
				},
				" api.internal ",
			),
		).toEqual([
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.internal",
				hint: "production api",
			},
			presets[1],
		]);
		expect(retargetToolTargetPreset(presets, presets[0], "  ")).toEqual(
			presets,
		);
		expect(
			retargetToolTargetPreset(
				presets,
				{
					id: "gateway-ping",
					label: "Gateway ping",
					actionId: "ping.default",
					target: "192.168.0.1",
					hint: "OS-aware target",
				},
				"192.168.0.254",
			),
		).toEqual(presets);
	});

	test("edits saved tool target actions by action and target only", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
		];

		expect(
			reassignToolTargetPresetAction(
				presets,
				{
					id: "renamed",
					label: "Renamed API",
					actionId: "tools.dns",
					target: " api.example.com ",
					hint: "same target",
				},
				" ping.default ",
			),
		).toEqual([
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "ping.default",
				target: "api.example.com",
				hint: "production api",
			},
			presets[1],
		]);
		expect(
			reassignToolTargetPresetAction(presets, presets[0], "tools.unknown"),
		).toEqual(presets);
		expect(reassignToolTargetPresetAction(presets, presets[0], "  ")).toEqual(
			presets,
		);
		expect(
			reassignToolTargetPresetAction(
				presets,
				{
					id: "gateway-ping",
					label: "Gateway ping",
					actionId: "ping.default",
					target: "192.168.0.1",
					hint: "OS-aware target",
				},
				"tools.traceroute",
			),
		).toEqual(presets);
	});

	test("promotes saved tool target presets by action and target only", () => {
		const presets = [
			{
				id: "api-dns",
				label: "API DNS",
				actionId: "tools.dns" as const,
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "db-port",
				label: "DB port",
				actionId: "network.connect" as const,
				target: "db.internal:5432",
				hint: "internal db",
			},
			{
				id: "edge-ping",
				label: "Edge ping",
				actionId: "ping.default" as const,
				target: "edge.example.com",
				hint: "edge reachability",
			},
		];

		expect(
			promoteToolTargetPreset(presets, {
				id: "renamed",
				label: "Renamed DB",
				actionId: "network.connect",
				target: " db.internal:5432 ",
				hint: "same target",
			}),
		).toEqual([presets[1], presets[0], presets[2]]);
		expect(promoteToolTargetPreset(presets, presets[0])).toEqual(presets);
		expect(
			promoteToolTargetPreset(presets, {
				id: "gateway-ping",
				label: "Gateway ping",
				actionId: "ping.default",
				target: "192.168.0.1",
				hint: "OS-aware target",
			}),
		).toEqual(presets);
		expect(promoteToolTargetPreset(presets, undefined)).toEqual(presets);
	});

	test("moves tool target preset selection in both directions", () => {
		expect(moveToolTargetPresetSelection(0, 4, "next")).toBe(1);
		expect(moveToolTargetPresetSelection(3, 4, "next")).toBe(0);
		expect(moveToolTargetPresetSelection(0, 4, "previous")).toBe(3);
		expect(moveToolTargetPresetSelection(2, 4, "previous")).toBe(1);
		expect(moveToolTargetPresetSelection(99, 4, "next")).toBe(0);
		expect(moveToolTargetPresetSelection(0, 0, "previous")).toBe(0);
	});

	test("resolves target selection without indexing an empty shelf", () => {
		expect(getSelectedToolTargetPreset([], -1)).toBeUndefined();
		expect(getSelectedToolTargetPreset(savedToolTargetPresets, -4)).toEqual(
			savedToolTargetPresets[0],
		);
		expect(getSelectedToolTargetPreset(savedToolTargetPresets, 99)).toEqual(
			savedToolTargetPresets[1],
		);
	});

	test("repairs target selection before cycling and reports the selected target", () => {
		expect(
			selectToolTargetPresetTransition(savedToolTargetPresets, -4, "previous"),
		).toEqual({
			selectedIndex: 1,
			preset: savedToolTargetPresets[1],
			notice: {
				level: "info",
				message: "tool target DB ping db.example.com",
			},
		});
	});

	test("renames the selected saved target and closes the command line", () => {
		expect(
			renameToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: -1,
				value: "Public API DNS",
			}),
		).toEqual({
			presets: [
				{
					id: "api-dns",
					label: "Public API DNS",
					actionId: "tools.dns",
					target: "api.example.com",
					hint: "saved DNS target",
				},
				savedToolTargetPresets[1],
			],
			selectedIndex: 0,
			commandLine: "close",
			changed: true,
			notice: {
				level: "info",
				message: "tool target renamed api.example.com",
			},
		});
	});

	test("keeps the shelf for an unchanged target label", () => {
		expect(
			renameToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				value: " API DNS ",
			}),
		).toEqual({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "close",
			changed: false,
			notice: {
				level: "info",
				message: "tool target label unchanged",
			},
		});
	});

	test("reports a missing target selection while closing an edit prompt", () => {
		expect(
			renameToolTargetPresetTransition({
				presets: [],
				targetPresets: [],
				selectedIndex: -1,
				value: "Public API DNS",
			}),
		).toEqual({
			presets: [],
			selectedIndex: 0,
			commandLine: "close",
			changed: false,
			notice: {
				level: "warn",
				message: "no tool target preset selected",
			},
		});
	});

	test("updates a selected saved target value", () => {
		const transition = retargetToolTargetPresetTransition({
			presets: savedToolTargetPresets,
			targetPresets: savedToolTargetPresets,
			selectedIndex: 0,
			value: "api.internal.example",
		});

		expect(transition).toMatchObject({
			selectedIndex: 0,
			commandLine: "close",
			changed: true,
			notice: {
				level: "info",
				message: "tool target updated API DNS",
			},
		});
		expect(transition.presets[0]).toMatchObject({
			id: "api-dns",
			target: "api.internal.example",
		});
	});

	test("keeps the surviving custom target selected when an action edit deduplicates the displayed shelf", () => {
		const duplicateTargets = [
			savedToolTargetPresets[0],
			{
				id: "api-ping",
				label: "API ping",
				actionId: "ping.default",
				target: "api.example.com",
				hint: "saved reachability target",
			},
		] satisfies ToolTargetPreset[];
		const displayedTargetPresets = getToolTargetPresets(
			summary,
			"example.com",
			duplicateTargets,
		);
		const transition = reassignToolTargetPresetActionTransition({
			presets: duplicateTargets,
			targetPresets: displayedTargetPresets,
			selectedIndex: 1,
			value: "dns",
		});
		const updatedDisplayedTargetPresets = getToolTargetPresets(
			summary,
			"example.com",
			transition.presets,
		);

		expect(transition).toMatchObject({
			presets: [
				{
					id: "api-dns",
					actionId: "tools.dns",
					target: "api.example.com",
				},
			],
			selectedIndex: 0,
			commandLine: "close",
			changed: true,
			notice: {
				level: "info",
				message: "tool target action updated API ping",
			},
		});
		expect(
			updatedDisplayedTargetPresets[transition.selectedIndex],
		).toMatchObject({
			id: "api-dns",
			actionId: "tools.dns",
			target: "api.example.com",
		});
		expect(updatedDisplayedTargetPresets[1]).toMatchObject({
			id: "default-ping",
		});
	});

	test("keeps the surviving custom target selected when a value edit deduplicates the displayed shelf", () => {
		const duplicateTargets = [
			savedToolTargetPresets[0],
			{
				id: "internal-dns",
				label: "Internal DNS",
				actionId: "tools.dns",
				target: "api.internal.example",
				hint: "saved internal DNS target",
			},
		] satisfies ToolTargetPreset[];
		const transition = retargetToolTargetPresetTransition({
			presets: duplicateTargets,
			targetPresets: getToolTargetPresets(
				summary,
				"example.com",
				duplicateTargets,
			),
			selectedIndex: 1,
			value: "api.example.com",
		});
		const updatedDisplayedTargetPresets = getToolTargetPresets(
			summary,
			"example.com",
			transition.presets,
		);

		expect(transition.selectedIndex).toBe(0);
		expect(
			updatedDisplayedTargetPresets[transition.selectedIndex],
		).toMatchObject({
			id: "api-dns",
			actionId: "tools.dns",
			target: "api.example.com",
		});
	});

	test("emits close command-line intents for every target prompt submission", () => {
		const targetPresets = getToolTargetPresets(
			summary,
			"example.com",
			savedToolTargetPresets,
		);

		expect([
			renameToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets,
				selectedIndex: 0,
				value: "Public API DNS",
			}).commandLine,
			retargetToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets,
				selectedIndex: 0,
				value: "api.internal.example",
			}).commandLine,
			reassignToolTargetPresetActionTransition({
				presets: savedToolTargetPresets,
				targetPresets,
				selectedIndex: 0,
				value: "ping",
			}).commandLine,
			submitToolTargetCleanupTransition({
				presets: savedToolTargetPresets,
				targetPresets,
				selectedIndex: 0,
				value: "remove tools.dns",
			}).commandLine,
			submitToolTargetPresetCommandTransition({
				presets: savedToolTargetPresets,
				targetPresets,
				selectedIndex: 0,
				value: "ping db.example.com DB ping",
			}).commandLine,
		]).toEqual(["close", "close", "close", "close", "close"]);
	});

	test("updates a selected saved target action", () => {
		const transition = reassignToolTargetPresetActionTransition({
			presets: savedToolTargetPresets,
			targetPresets: savedToolTargetPresets,
			selectedIndex: 0,
			value: "ping",
		});

		expect(transition).toMatchObject({
			selectedIndex: 0,
			commandLine: "close",
			changed: true,
			notice: {
				level: "info",
				message: "tool target action updated API DNS",
			},
		});
		expect(transition.presets[0]).toMatchObject({
			id: "api-dns",
			actionId: "ping.default",
		});
	});

	test("pins a selected saved target and repairs its selection", () => {
		expect(
			promoteToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 1,
			}),
		).toEqual({
			presets: [savedToolTargetPresets[1], savedToolTargetPresets[0]],
			selectedIndex: 0,
			commandLine: "preserve",
			changed: true,
			notice: {
				level: "info",
				message: "tool target pinned DB ping db.example.com",
			},
		});
	});

	test("reports an immovable target without changing the shelf", () => {
		expect(
			promoteToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
			}),
		).toMatchObject({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "preserve",
			changed: false,
			notice: {
				level: "warn",
				message: "tool target API DNS is not a movable saved preset",
			},
		});
	});

	test("removes a selected saved target and repairs selection", () => {
		expect(
			removeToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 99,
			}),
		).toEqual({
			presets: [savedToolTargetPresets[0]],
			selectedIndex: 0,
			commandLine: "preserve",
			changed: true,
			notice: {
				level: "info",
				message: "tool target removed DB ping db.example.com",
			},
		});
	});

	test("reports an unsaved target removal without changing the shelf", () => {
		const builtInTarget = {
			id: "gateway-ping",
			label: "Gateway ping",
			actionId: "ping.default" as const,
			target: "192.0.2.1",
			hint: "OS-aware target",
		};
		expect(
			removeToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: [builtInTarget],
				selectedIndex: 0,
			}),
		).toMatchObject({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "preserve",
			changed: false,
			notice: {
				level: "warn",
				message: "tool target Gateway ping is not a saved preset",
			},
		});
	});

	test("keeps a rejected cleanup shelf and reports its exact confirmation notice", () => {
		expect(
			submitToolTargetCleanupTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				value: "delete ping.default",
			}),
		).toEqual({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "close",
			changed: false,
			notice: {
				level: "warn",
				message: "tool target action cleanup rejected tools.dns",
			},
		});
	});

	test("saves a parsed target command at the bounded shelf limit", () => {
		expect(
			submitToolTargetPresetCommandTransition({
				presets: [savedToolTargetPresets[0]],
				targetPresets: [savedToolTargetPresets[0]],
				selectedIndex: 0,
				value: "ping db.example.com DB ping",
				limit: 1,
			}),
		).toEqual({
			presets: [
				{
					id: "custom-ping-default-db-example-com",
					label: "DB ping",
					actionId: "ping.default",
					target: "db.example.com",
					hint: "saved ping target",
				},
			],
			selectedIndex: 0,
			commandLine: "close",
			changed: true,
			notice: {
				level: "ok",
				message: "tool target preset saved DB ping db.example.com",
			},
		});
	});

	test("reports invalid and missing target save intents", () => {
		expect(
			submitToolTargetPresetCommandTransition({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				value: "unknown example.com",
			}),
		).toMatchObject({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "close",
			changed: false,
			notice: {
				level: "warn",
				message: "tool target preset requires: <action> <target> [label]",
			},
		});
		expect(
			saveSelectedToolTargetPresetTransition({
				presets: savedToolTargetPresets,
				targetPresets: [],
				selectedIndex: 0,
			}),
		).toMatchObject({
			presets: savedToolTargetPresets,
			selectedIndex: 0,
			commandLine: "preserve",
			changed: false,
			notice: { level: "warn", message: "no tool target preset to save" },
		});
	});

	test("saves the selected target from the Tools shortcut", () => {
		expect(
			saveSelectedToolTargetPresetTransition({
				presets: [],
				targetPresets: [savedToolTargetPresets[0]],
				selectedIndex: -3,
				limit: 1,
			}),
		).toEqual({
			presets: [savedToolTargetPresets[0]],
			selectedIndex: 0,
			commandLine: "preserve",
			changed: true,
			notice: {
				level: "info",
				message: "tool target saved API DNS api.example.com",
			},
		});
	});

	test("turns each saved-target keyboard prompt into a typed intent", () => {
		expect(
			createToolTargetPromptIntent({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				prompt: "label",
			}),
		).toMatchObject({
			selectedIndex: 0,
			commandLine: "tool-target-label",
			notice: { level: "info", message: "tool target label opened API DNS" },
		});
		expect(
			createToolTargetPromptIntent({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				prompt: "value",
			}),
		).toMatchObject({
			commandLine: "tool-target-value",
			notice: { level: "info", message: "tool target value opened API DNS" },
		});
		expect(
			createToolTargetPromptIntent({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				prompt: "action",
			}),
		).toMatchObject({
			commandLine: "tool-target-action",
			notice: {
				level: "info",
				message: "tool target action opened API DNS",
			},
		});
		expect(
			createToolTargetPromptIntent({
				presets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedIndex: 0,
				prompt: "cleanup",
			}),
		).toMatchObject({
			commandLine: "tool-target-cleanup",
			notice: {
				level: "warn",
				message: "tool target cleanup confirm delete tools.dns",
			},
		});
	});

	test("creates a run intent from the repaired selected target", () => {
		expect(
			createToolTargetRunIntent({
				presets: savedToolTargetPresets,
				selectedIndex: 99,
			}),
		).toEqual({
			presets: savedToolTargetPresets,
			selectedIndex: 1,
			commandLine: "preserve",
			plan: {
				actionId: "ping.default",
				toolId: "ping",
				args: ["db.example.com"],
				label: "ping.default db.example.com",
			},
			completionNotice: "DB ping completed",
		});
	});

	test("reports a missing selected target run intent", () => {
		expect(
			createToolTargetRunIntent({ presets: [], selectedIndex: -1 }),
		).toEqual({
			presets: [],
			selectedIndex: 0,
			commandLine: "preserve",
			notice: { level: "warn", message: "no tool target presets" },
		});
	});

	test("formats selected tool history detail tabs", () => {
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

		expect(nextToolHistoryDetailView("raw")).toBe("summary");
		expect(nextToolHistoryDetailView("summary")).toBe("command");
		expect(nextToolHistoryDetailView("command")).toBe("compare");
		expect(nextToolHistoryDetailView("compare")).toBe("raw");
		expect(getToolHistoryDetailViewShortcut("1")).toBe("raw");
		expect(getToolHistoryDetailViewShortcut("2")).toBe("summary");
		expect(getToolHistoryDetailViewShortcut("3")).toBe("command");
		expect(getToolHistoryDetailViewShortcut("4")).toBe("compare");
		expect(getToolHistoryDetailViewShortcut("", { home: true })).toBe("raw");
		expect(getToolHistoryDetailViewShortcut("", { end: true })).toBe("compare");
		expect(getToolHistoryDetailViewShortcut("5")).toBeUndefined();
		expect(
			formatToolsWorkspaceRows(
				history,
				20,
				0,
				"",
				"time",
				"none",
				[],
				"summary",
			),
		).toEqual([
			"TOOLS history=1 detail=summary selected=DNS Lookup",
			"> [12:00:00] ok tools.dns example.com",
			"DETAIL summary",
			"title=DNS Lookup",
			"status=ok",
			"summary=Summary: Query: example.com | A: 2",
			"command=picos tools dns example.com",
			"copy help: b row=- · v section=- · c raw=ok · y summary=ok",
			"copy hint: b/v need TCP Target or Status rows; use c raw or y summary",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=target · v copy section · c raw",
		]);
		expect(
			formatToolsWorkspaceRows(
				history,
				7,
				0,
				"",
				"time",
				"none",
				[],
				"command",
			),
		).toEqual([
			"TOOLS history=1 detail=command selected=DNS Lookup",
			"> [12:00:00] ok tools.dns example.com",
			"DETAIL command",
			"action=tools.dns",
			"tool=dns",
			"args=example.com",
			"rerun=picos tools dns example.com",
		]);
	});

	test("surfaces structured TLS and traceroute evidence in tool history", () => {
		const tlsResult: ToolResult = {
			title: "TLS Inspector",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools tls example.com:443",
						"Timeout: 1200ms",
					],
				},
				{
					label: "Status",
					lines: [
						"Authorized: yes",
						"Protocol: TLSv1.3",
						"Cipher: TLS_AES_256_GCM_SHA384",
					],
				},
				{
					label: "Certificate",
					lines: ["Subject: *.example.com", "Issuer: Example CA"],
				},
			],
			rawOutput:
				"$ picos tools tls example.com:443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools tls example.com:443\nTimeout: 1200ms\n[Status]\nAuthorized: yes\nProtocol: TLSv1.3\nCipher: TLS_AES_256_GCM_SHA384\n[Certificate]\nSubject: *.example.com\nIssuer: Example CA",
		};
		const traceResult: ToolResult = {
			title: "Traceroute",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: 8.8.8.8",
						"Command: traceroute 8.8.8.8",
						"Platform: darwin",
						"Timeout: 1500ms",
					],
				},
				{
					label: "Status",
					lines: ["Exit: 0", "Result: ok", "Output Lines: 3"],
				},
				{
					label: "Hops",
					lines: [
						"1 192.168.0.1 1.123 ms 1.221 ms 1.300 ms",
						"2 10.0.0.1 8.100 ms 8.200 ms 8.300 ms",
					],
				},
			],
			rawOutput:
				"$ traceroute 8.8.8.8\n[Target]\nHost: 8.8.8.8\nCommand: traceroute 8.8.8.8\nPlatform: darwin\nTimeout: 1500ms\n[Status]\nExit: 0\nResult: ok\nOutput Lines: 3\n[Hops]\n1 192.168.0.1 1.123 ms 1.221 ms 1.300 ms\n2 10.0.0.1 8.100 ms 8.200 ms 8.300 ms",
		};
		const history = appendToolHistory(
			appendToolHistory(
				[],
				{
					plan: {
						actionId: "tools.tls",
						toolId: "tls",
						args: ["example.com:443"],
						label: "tools.tls example.com:443",
					},
					result: tlsResult,
				},
				"12:00:00",
			),
			{
				plan: {
					actionId: "tools.traceroute",
					toolId: "traceroute",
					args: ["8.8.8.8"],
					label: "tools.traceroute 8.8.8.8",
				},
				result: traceResult,
			},
			"12:00:01",
		);

		expect(
			formatToolsWorkspaceRows(
				history,
				16,
				0,
				"",
				"time",
				"none",
				[],
				"summary",
			),
		).toContain("summary=Target: Host: example.com | Port: 443");
		expect(
			formatToolsWorkspaceRows(
				history,
				30,
				1,
				"",
				"time",
				"none",
				[],
				"raw",
				[],
				0,
				"status",
			),
		).toEqual(
			expect.arrayContaining([
				"[Hops]",
				"1 192.168.0.1 1.123 ms 1.221 ms 1.300 ms",
				"copy help: b row=ok · v section=ok · c raw=ok · y summary=ok",
				"copy section: section=status rows=3 first=Exit: 0",
			]),
		);
		expect(
			getSelectedToolSectionClipboardPreview(history, 0, "status"),
		).toEqual(
			expect.objectContaining({
				source: "tool-status",
				label: "tools.tls example.com:443 status fields",
				copyText:
					"Authorized: yes\nProtocol: TLSv1.3\nCipher: TLS_AES_256_GCM_SHA384",
			}),
		);
	});

	test("compares the selected tool run with the previous matching target", () => {
		const history = appendToolHistory(
			appendToolHistory(
				appendToolHistory(
					[],
					{
						plan: {
							actionId: "tools.dns",
							toolId: "dns",
							args: ["example.com"],
							label: "tools.dns example.com",
						},
						result: {
							...result,
							rawOutput:
								"$ picos tools dns example.com\n[Summary]\nQuery: example.com\nA: 2",
						},
					},
					"12:00:00",
				),
				{
					plan: {
						actionId: "tools.dns",
						toolId: "dns",
						args: ["example.org"],
						label: "tools.dns example.org",
					},
					result: {
						...result,
						rawOutput:
							"$ picos tools dns example.org\n[Summary]\nQuery: example.org\nA: 1",
					},
				},
				"12:00:01",
			),
			{
				plan: {
					actionId: "tools.dns",
					toolId: "dns",
					args: ["example.com"],
					label: "tools.dns example.com",
				},
				result: {
					...result,
					rawOutput:
						"$ picos tools dns example.com\n[Summary]\nQuery: example.com\nA: 2\nAAAA: 1",
				},
			},
			"12:00:02",
		);

		expect(
			formatToolsWorkspaceRows(
				history,
				14,
				2,
				"",
				"time",
				"none",
				[],
				"compare",
			),
		).toEqual([
			"TOOLS history=3 detail=compare selected=DNS Lookup",
			"  [12:00:00] ok tools.dns example.com",
			"  [12:00:01] ok tools.dns example.org",
			"> [12:00:02] ok tools.dns example.com",
			"DETAIL compare",
			"current=12:00:02 ok tools.dns example.com",
			"previous=12:00:00 ok tools.dns example.com",
			"status=unchanged ok",
			"summary=unchanged",
			"raw lines current=5 previous=4 delta=+1",
			"+ AAAA: 1",
			"compare key=tools.dns example.com",
			"copy help: b row=- · v section=- · c raw=ok · y summary=ok",
			"copy hint: b/v need TCP Target or Status rows; use c raw or y summary",
		]);
		expect(
			formatToolsWorkspaceRows(
				history,
				9,
				1,
				"",
				"time",
				"none",
				[],
				"compare",
			),
		).toContain("no previous matching tool run");
	});

	test("creates locked compare clipboard previews and export plans", () => {
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
					result: {
						...result,
						rawOutput:
							"$ picos tools dns example.com\n[Summary]\nQuery: example.com\nA: 2",
					},
				},
				"12:00:00",
			),
			{
				plan: {
					actionId: "tools.dns",
					toolId: "dns",
					args: ["example.com"],
					label: "tools.dns example.com",
				},
				result: {
					...result,
					rawOutput:
						"$ picos tools dns example.com\n[Summary]\nQuery: example.com\nA: 2\nAAAA: 1",
				},
			},
			"12:00:02",
		);

		expect(getSelectedToolCompareClipboardPreview(history, 1)).toEqual({
			source: "tool-compare",
			label: "tools.dns example.com compare",
			copyText: [
				"DETAIL compare",
				"current=12:00:02 ok tools.dns example.com",
				"previous=12:00:00 ok tools.dns example.com",
				"status=unchanged ok",
				"summary=unchanged",
				"raw lines current=5 previous=4 delta=+1",
				"+ AAAA: 1",
				"compare key=tools.dns example.com",
			].join("\n"),
			details: [
				"path o compare",
				"previous 12:00:00 ok tools.dns example.com",
				"tool dns",
				"action tools.dns",
			],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(
			createToolHistoryCompareExportPlan(history, 1, {
				baseDir: "/Users/bonjin/.config/picos",
				generatedAt: new Date("2026-07-01T05:00:00.000Z"),
			}),
		).toEqual({
			path: "/Users/bonjin/.config/picos/tools/picos-tools-compare-2026-07-01T050000000Z.md",
			content: [
				"# picos tools compare",
				"generatedAt=2026-07-01T05:00:00.000Z",
				"scope=compare",
				"runs=1",
				"",
				"## tools.dns example.com",
				"DETAIL compare",
				"current=12:00:02 ok tools.dns example.com",
				"previous=12:00:00 ok tools.dns example.com",
				"status=unchanged ok",
				"summary=unchanged",
				"raw lines current=5 previous=4 delta=+1",
				"+ AAAA: 1",
				"compare key=tools.dns example.com",
				"",
			].join("\n"),
			itemCount: 1,
			scope: "compare",
		});
		expect(getSelectedToolCompareClipboardPreview([], 0)).toBeUndefined();
		expect(
			createToolHistoryCompareExportPlan([], 0, {
				baseDir: "/Users/bonjin/.config/picos",
			}),
		).toBeUndefined();
	});

	test("models active tool prompts as field forms", () => {
		const form = createToolFormState(
			"network.connect",
			"google.com",
			summary,
			"api.github.com 443",
		);
		expect(form).toEqual({
			actionId: "network.connect",
			title: "Telnet-style TCP check",
			toolId: "telnet",
			selectedFieldIndex: 0,
			fields: [
				{
					key: "host",
					label: "Host",
					placeholder: "github.com",
					value: "api.github.com",
				},
				{
					key: "port",
					label: "Port",
					placeholder: "443",
					value: "443",
				},
			],
		});
		expect(moveToolFormField(form, "next")?.selectedFieldIndex).toBe(1);
		expect(moveToolFormField(form, "previous")?.selectedFieldIndex).toBe(1);
		const updated = updateToolFormFieldValue(
			moveToolFormField(form, "next"),
			"8443",
		);
		expect(updated?.fields[1]?.value).toBe("8443");
		expect(createToolRunPlanFromForm(updated)).toEqual({
			actionId: "network.connect",
			toolId: "telnet",
			args: ["api.github.com", "8443"],
			label: "Telnet-style TCP check api.github.com:8443",
		});
		expect(formatToolFormRows(updated)).toEqual([
			"TOOLS FORM Telnet-style TCP check",
			"action=network.connect tool=telnet fields=2 selected=2/2",
			"  Host api.github.com placeholder=github.com",
			"> Port 8443 placeholder=443",
			"cli=picos tools telnet api.github.com 8443",
			"controls=tab/shift-tab field enter=run esc=cancel",
		]);
	});

	test("selects and serializes active tool form fields for live prompts", () => {
		const form = selectToolFormField(
			createToolFormState(
				"network.connect",
				"google.com 443",
				summary,
				"api.github.com 443",
			),
			1,
		);
		expect(form?.selectedFieldIndex).toBe(1);
		const updated = updateToolFormFieldValue(form, "8443");
		expect(formatToolFormInputValue(updated)).toBe("api.github.com 8443");
		expect(formatToolFormRows(updated).slice(0, 4)).toEqual([
			"TOOLS FORM Telnet-style TCP check",
			"action=network.connect tool=telnet fields=2 selected=2/2",
			"  Host api.github.com placeholder=github.com",
			"> Port 8443 placeholder=443",
		]);
		expect(
			formatToolPromptRows(
				"tool:network.connect",
				"api.github.com 8443",
				1,
				[1],
			),
		).toEqual([
			"TOOLS FORM Telnet-style TCP check",
			"action=network.connect tool=telnet fields=2 selected=2/2",
			"  Host api.github.com placeholder=github.com",
			"> Port 8443 placeholder=443",
			"field help active=Port touched=yes input=append tab=next ctrl-u=clear",
			"cli=picos tools telnet api.github.com 8443",
			"controls=tab/shift-tab field enter=run esc=cancel",
		]);
	});

	test("preserves cleared active tool fields while keeping run fallbacks", () => {
		const cleared = updateToolFormFieldValue(
			selectToolFormField(
				createToolFormState(
					"network.connect",
					"google.com 443",
					summary,
					"api.github.com 443",
				),
				0,
			),
			"",
		);
		expect(formatToolFormInputValue(cleared, { preserveEmpty: true })).toBe(
			" 443",
		);
		expect(formatToolFormRows(cleared).slice(0, 4)).toEqual([
			"TOOLS FORM Telnet-style TCP check",
			"action=network.connect tool=telnet fields=2 selected=1/2",
			"> Host <empty> placeholder=github.com",
			"  Port 443 placeholder=443",
		]);
		expect(createToolRunPlanFromForm(cleared)).toEqual({
			actionId: "network.connect",
			toolId: "telnet",
			args: ["example.com", "443"],
			label: "Telnet-style TCP check example.com:443",
		});
		expect(
			createToolFormState("network.connect", "google.com 443", summary, " 443")
				?.fields[0]?.value,
		).toBe("");
	});

	test("formats active tool target prompt rows as field forms", () => {
		expect(getToolRunActionMetadata("tools.tls")).toEqual({
			actionId: "tools.tls",
			title: "TLS inspector",
			toolId: "tls",
			placeholder: "example.com:443",
			example: "github.com:443",
			defaultTarget: "example.com:443",
			cli: "picos tools tls example.com:443",
			hint: "protocol, cipher, certificate chain",
		});
		expect(
			formatToolPromptRows("tool:network.connect", "api.github.com 443"),
		).toEqual([
			"TOOLS FORM Telnet-style TCP check",
			"action=network.connect tool=telnet fields=2 selected=1/2",
			"> Host api.github.com placeholder=github.com",
			"  Port 443 placeholder=443",
			"field help active=Host touched=no input=replace tab=next ctrl-u=clear",
			"cli=picos tools telnet api.github.com 443",
			"controls=tab/shift-tab field enter=run esc=cancel",
		]);
		expect(formatToolPromptRows("tool:tools.tls", "")).toEqual([
			"TOOLS FORM TLS inspector",
			"action=tools.tls tool=tls fields=1 selected=1/1",
			"> Target example.com:443 placeholder=github.com:443",
			"field help active=Target touched=no input=replace tab=next ctrl-u=clear",
			"cli=picos tools tls example.com:443",
			"controls=tab/shift-tab field enter=run esc=cancel",
		]);
		expect(formatToolPromptRows("route", "8.8.8.8")).toEqual([]);
	});

	test("parses saved tool target preset commands", () => {
		expect(parseToolTargetPresetCommand("dns example.com Example DNS")).toEqual(
			{
				id: "custom-tools-dns-example-com",
				label: "Example DNS",
				actionId: "tools.dns",
				target: "example.com",
				hint: "saved dns target",
			},
		);
		expect(parseToolTargetPresetCommand("connect api.github.com:443")).toEqual({
			id: "custom-network-connect-api-github-com-443",
			label: "connect api.github.com:443",
			actionId: "network.connect",
			target: "api.github.com:443",
			hint: "saved connect target",
		});
		expect(parseToolTargetPresetCommand("unknown example.com")).toBeUndefined();
		expect(parseToolTargetPresetCommand("dns")).toBeUndefined();
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
			details: ["path c raw", "tool dns", "action tools.dns"],
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
			details: ["path y summary", "tool dns", "action tools.dns"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedToolSummaryClipboardPreview([], 0)).toBeUndefined();
	});

	test("creates a locked clipboard preview for selected TCP target fields", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		expect(getSelectedToolTargetClipboardPreview(history, 0)).toEqual({
			source: "tool-target",
			label: "network.connect example.com:443 target fields",
			copyText:
				"Host: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms",
			details: [
				"path v section",
				"section target rows 4",
				"tool telnet",
				"action network.connect",
			],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedToolTargetClipboardPreview([], 0)).toBeUndefined();
		expect(
			getSelectedToolTargetClipboardPreview(
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
					"12:00:01",
				),
				0,
			),
		).toBeUndefined();
	});

	test("creates locked clipboard previews for selected TCP sections", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		expect(
			getSelectedToolSectionClipboardPreview(history, 0, "target"),
		).toEqual(
			expect.objectContaining({
				source: "tool-target",
				label: "network.connect example.com:443 target fields",
				copyText:
					"Host: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms",
				details: [
					"path v section",
					"section target rows 4",
					"tool telnet",
					"action network.connect",
				],
			}),
		);
		expect(
			getSelectedToolSectionClipboardPreview(history, 0, "status"),
		).toEqual(
			expect.objectContaining({
				source: "tool-status",
				label: "network.connect example.com:443 status fields",
				copyText: "OPEN\nElapsed: 42ms",
				details: [
					"path v section",
					"section status rows 2",
					"tool telnet",
					"action network.connect",
				],
			}),
		);
		expect(nextToolSectionClipboardSelection("target")).toBe("status");
		expect(nextToolSectionClipboardSelection("status")).toBe("target");
	});

	test("formats the selected TCP copy section shortcut", () => {
		expect(
			formatToolsWorkspaceRows(
				[],
				3,
				0,
				"",
				"time",
				"none",
				[],
				"raw",
				[],
				0,
				"status",
			),
		).toEqual([
			"TOOLS history=0 selected=-",
			"no tool runs yet",
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=status · v copy section · c raw",
		]);
	});

	test("selects and previews individual TCP section rows", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		expect(moveToolSectionClipboardRow(history, 0, "target", 0, "next")).toBe(
			1,
		);
		expect(
			moveToolSectionClipboardRow(history, 0, "target", 0, "previous"),
		).toBe(3);
		expect(moveToolSectionClipboardRow(history, 0, "status", 1, "next")).toBe(
			0,
		);
		expect(
			getSelectedToolSectionRowClipboardPreview(history, 0, "target", 2),
		).toEqual(
			expect.objectContaining({
				source: "tool-row",
				label: "network.connect example.com:443 target row 3",
				copyText: "Command: picos tools telnet example.com 443",
				details: [
					"path b row",
					"section target row 3/4",
					"tool telnet",
					"action network.connect",
				],
			}),
		);
		expect(
			getSelectedToolSectionRowClipboardPreview(history, 0, "status", 1),
		).toEqual(
			expect.objectContaining({
				source: "tool-row",
				label: "network.connect example.com:443 status row 2",
				copyText: "Elapsed: 42ms",
				details: [
					"path b row",
					"section status row 2/2",
					"tool telnet",
					"action network.connect",
				],
			}),
		);
		expect(
			getSelectedToolSectionRowClipboardPreview(
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
					"12:00:01",
				),
				0,
				"target",
				0,
			),
		).toBeUndefined();
		expect(
			formatToolsWorkspaceRows(
				history,
				20,
				0,
				"",
				"time",
				"none",
				[],
				"raw",
				[],
				0,
				"status",
				1,
			).at(-1),
		).toBe(
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=status · ,/. row=2/2 · b row · v copy section · c raw",
		);
	});

	test("marks the selected TCP section row inside raw detail rows", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		expect(
			formatToolsWorkspaceRows(
				history,
				20,
				0,
				"",
				"time",
				"none",
				[],
				"raw",
				[],
				0,
				"status",
				1,
			),
		).toContain("> Elapsed: 42ms");
		expect(
			formatToolsWorkspaceRows(
				history,
				20,
				0,
				"",
				"time",
				"none",
				[],
				"raw",
				[],
				0,
				"status",
				1,
			),
		).toContain("  OPEN");
	});

	test("formats a compact TCP copy target preview before the shortcut footer", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);
		const rows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"status",
			1,
		);

		expect(rows.at(-2)).toBe(
			"copy target: section=status rows=2 row=2 text=Elapsed: 42ms",
		);
		expect(rows.at(-1)).toBe(
			"shortcuts: j/k select · tab/1-4 detail · home/end · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · o compare · O export compare · V section=status · ,/. row=2/2 · b row · v copy section · c raw",
		);
	});

	test("formats a compact TCP section preview beside the row target", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);
		const rows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"target",
			2,
		);

		expect(rows.at(-3)).toBe(
			"copy section: section=target rows=4 first=Host: example.com",
		);
		expect(rows.at(-2)).toBe(
			"copy target: section=target rows=4 row=3 text=Command: picos tools telnet example.com 443",
		);
	});

	test("truncates long TCP copy preview values for narrow-safe footers", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: very-long-service-name-with-an-extra-long-preview.internal.example.com",
						"Port: 443",
						"Command: picos tools telnet very-long-service-name-with-an-extra-long-preview.internal.example.com 443",
						"Timeout: 2000ms",
					],
				},
				{
					label: "Status",
					lines: [
						"OPEN",
						"Error: connect ETIMEDOUT very-long-service-name-with-an-extra-long-preview.internal.example.com:443 after repeated retries",
					],
				},
			],
			rawOutput:
				"$ picos tools telnet very-long-service-name-with-an-extra-long-preview.internal.example.com 443\n[Target]\nHost: very-long-service-name-with-an-extra-long-preview.internal.example.com\nPort: 443\nCommand: picos tools telnet very-long-service-name-with-an-extra-long-preview.internal.example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nError: connect ETIMEDOUT very-long-service-name-with-an-extra-long-preview.internal.example.com:443 after repeated retries",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: [
						"very-long-service-name-with-an-extra-long-preview.internal.example.com",
						"443",
					],
					label:
						"network.connect very-long-service-name-with-an-extra-long-preview.internal.example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);
		const rows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"status",
			1,
		);

		const sectionPreview = rows.find((row) => row.startsWith("copy section:"));
		const targetPreview = rows.find((row) => row.startsWith("copy target:"));
		expect(sectionPreview).toBe(
			"copy section: section=status rows=2 first=OPEN",
		);
		expect(targetPreview).toStartWith(
			"copy target: section=status rows=2 row=2 text=Error: connect ETIMEDOUT",
		);
		expect(targetPreview).toEndWith("...");
		expect(targetPreview).not.toContain("repeated retries");
		expect(targetPreview?.length).toBeLessThanOrEqual(120);
	});

	test("formats compact copy mode indicators for TCP copy previews", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const history = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		const rowModeRows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"status",
			1,
			"row",
		);
		const sectionModeRows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"target",
			0,
			"target",
		);
		const rawModeRows = formatToolsWorkspaceRows(
			history,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"status",
			0,
			"raw",
		);

		expect(rowModeRows.at(-4)).toBe("copy mode: b row section=status row=2/2");
		expect(sectionModeRows.at(-4)).toBe(
			"copy mode: v section section=target rows=4",
		);
		expect(rawModeRows.at(-4)).toBe("copy mode: c raw output");
	});

	test("formats a copy help strip with current tool copy availability", () => {
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: [
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					],
				},
				{ label: "Status", lines: ["OPEN", "Elapsed: 42ms"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\nCommand: picos tools telnet example.com 443\nTimeout: 2000ms\n[Status]\nOPEN\nElapsed: 42ms",
		};
		const tcpHistory = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);
		const dnsHistory = appendToolHistory(
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
		const tcpRows = formatToolsWorkspaceRows(
			tcpHistory,
			20,
			0,
			"",
			"time",
			"none",
			[],
			"raw",
			[],
			0,
			"status",
			1,
			"row",
		);
		const dnsRows = formatToolsWorkspaceRows(dnsHistory, 20);

		expect(tcpRows).toContain(
			"copy help: b row=ok · v section=ok · c raw=ok · y summary=ok",
		);
		expect(dnsRows).toContain(
			"copy help: b row=- · v section=- · c raw=ok · y summary=ok",
		);
		expect(
			tcpRows.indexOf(
				"copy help: b row=ok · v section=ok · c raw=ok · y summary=ok",
			),
		).toBeLessThan(tcpRows.indexOf("copy mode: b row section=status row=2/2"));
	});

	test("formats copy unavailable hints for non-TCP tool runs", () => {
		const dnsHistory = appendToolHistory(
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
		const tcpResult = {
			title: "Telnet TCP Check",
			sections: [
				{
					label: "Target",
					lines: ["Host: example.com", "Port: 443"],
				},
				{ label: "Status", lines: ["OPEN"] },
			],
			rawOutput:
				"$ picos tools telnet example.com 443\n[Target]\nHost: example.com\nPort: 443\n[Status]\nOPEN",
		};
		const tcpHistory = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "telnet",
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				result: tcpResult,
			},
			"12:00:00",
		);

		const dnsRows = formatToolsWorkspaceRows(dnsHistory, 20);
		const tcpRows = formatToolsWorkspaceRows(tcpHistory, 20);

		expect(dnsRows).toContain(
			"copy hint: b/v need TCP Target or Status rows; use c raw or y summary",
		);
		expect(tcpRows.some((row) => row.startsWith("copy hint:"))).toBeFalse();
		expect(
			dnsRows.indexOf(
				"copy help: b row=- · v section=- · c raw=ok · y summary=ok",
			),
		).toBeLessThan(
			dnsRows.indexOf(
				"copy hint: b/v need TCP Target or Status rows; use c raw or y summary",
			),
		);
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

	test("indexes picos-owned tool history evidence files", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-tools-index-"));
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
			const selectedPlan = createToolHistoryExportPlan(history, 0, {
				baseDir: root,
				scope: "selected",
				generatedAt: new Date("2026-06-30T04:00:00.000Z"),
			});
			const allPlan = createToolHistoryExportPlan(history, 0, {
				baseDir: root,
				scope: "all",
				generatedAt: new Date("2026-06-30T04:01:00.000Z"),
			});
			const comparePlan = createToolHistoryCompareExportPlan(history, 0, {
				baseDir: root,
				generatedAt: new Date("2026-06-30T04:02:00.000Z"),
			});
			if (!selectedPlan || !allPlan || !comparePlan) {
				throw new Error("expected tool history export plans");
			}
			await writeToolHistoryExport(selectedPlan);
			await writeToolHistoryExport(allPlan);
			await writeToolHistoryExport(comparePlan);

			const index = await readToolHistoryExportIndex(root);

			expect(index.baseDir).toBe(join(root, "tools"));
			expect(index.items.map((item) => item.scope)).toEqual([
				"compare",
				"all",
				"selected",
			]);
			expect(index.items[0]).toMatchObject({
				fileName: "picos-tools-compare-2026-06-30T040200000Z.md",
				generatedAt: "2026-06-30T04:02:00.000Z",
				scope: "compare",
				runCount: 1,
			});
			expect(getSelectedToolHistoryExport(index, 99)?.scope).toBe("selected");
			expect(formatToolHistoryExportIndexRows(index, 0, 5)).toEqual([
				`TOOLS EVIDENCE 3 base=${join(root, "tools")}`,
				"> compare runs=1 2026-06-30T04:02:00.000Z picos-tools-compare-2026-06-30T040200000Z.md",
				"  all runs=1 2026-06-30T04:01:00.000Z picos-tools-all-2026-06-30T040100000Z.md",
				"  selected runs=1 2026-06-30T04:00:00.000Z picos-tools-selected-2026-06-30T040000000Z.md",
				`open target=${comparePlan.path}`,
			]);
			expect(nextToolHistoryEvidenceFilter("any")).toBe("selected");
			expect(nextToolHistoryEvidenceFilter("selected")).toBe("all");
			expect(nextToolHistoryEvidenceFilter("all")).toBe("compare");
			expect(nextToolHistoryEvidenceFilter("compare")).toBe("any");
			expect(
				filterToolHistoryExportIndex(index, "compare").items.map(
					(item) => item.scope,
				),
			).toEqual(["compare"]);
			expect(
				filterToolHistoryExportIndex(index, "any", "040100").items.map(
					(item) => item.scope,
				),
			).toEqual(["all"]);
			expect(getSelectedToolHistoryExport(index, 99, "compare")?.scope).toBe(
				"compare",
			);
			expect(
				getSelectedToolHistoryExport(index, 99, "any", "040100")?.scope,
			).toBe("all");
			expect(formatToolHistoryExportIndexRows(index, 0, 5, "compare")).toEqual([
				`TOOLS EVIDENCE 1/3 filter=compare base=${join(root, "tools")}`,
				"> compare runs=1 2026-06-30T04:02:00.000Z picos-tools-compare-2026-06-30T040200000Z.md",
				`open target=${comparePlan.path}`,
			]);
			expect(
				formatToolHistoryExportIndexRows(index, 0, 5, "any", "040100"),
			).toEqual([
				`TOOLS EVIDENCE 1/3 query=040100 base=${join(root, "tools")}`,
				"> all runs=1 2026-06-30T04:01:00.000Z picos-tools-all-2026-06-30T040100000Z.md",
				`open target=${allPlan.path}`,
			]);
			expect(formatToolHistoryExportIndexRows(index, 0, 5, "selected")).toEqual(
				[
					`TOOLS EVIDENCE 1/3 filter=selected base=${join(root, "tools")}`,
					"> selected runs=1 2026-06-30T04:00:00.000Z picos-tools-selected-2026-06-30T040000000Z.md",
					`open target=${selectedPlan.path}`,
				],
			);
			expect(
				formatToolHistoryExportIndexRows(
					{ baseDir: index.baseDir, items: index.items.slice(1) },
					0,
					5,
					"compare",
				),
			).toEqual([
				`TOOLS EVIDENCE 0/2 filter=compare base=${join(root, "tools")}`,
				"no matching tools evidence",
			]);
			expect(
				formatToolHistoryExportIndexRows(index, 0, 5, "compare", "040100"),
			).toEqual([
				`TOOLS EVIDENCE 0/3 filter=compare query=040100 base=${join(root, "tools")}`,
				"no matching tools evidence",
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("archives tool history export files only after exact confirmation", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-tools-archive-"));
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
				scope: "all",
				generatedAt: new Date("2026-07-01T05:00:00.000Z"),
			});
			if (!plan) {
				throw new Error("expected tool history export plan");
			}
			await writeToolHistoryExport(plan);
			const fileName = basename(plan.path);

			const locked = createToolHistoryExportArchivePlan(root, plan.path);
			expect(locked).toMatchObject({
				sourcePath: plan.path,
				archivedPath: join(root, "tools", "archive", fileName),
				fileName,
				risk: "write",
				privilege: "user",
				confirmationRequired: true,
				confirmationPhrase: "archive tools export",
				confirmed: false,
				enabled: false,
				reason: "type archive tools export to move selected tools export",
			});
			expect(formatToolHistoryExportArchiveRows(locked)).toEqual([
				`TOOLS EVIDENCE ARCHIVE ${fileName}`,
				"risk=write privilege=user confirmed=false",
				"confirm archive tools export locked",
				`from=${plan.path}`,
				`to=${join(root, "tools", "archive", fileName)}`,
				"reason=type archive tools export to move selected tools export",
			]);

			expect(await archiveToolHistoryExport(locked)).toEqual({
				status: "blocked",
				sourcePath: plan.path,
				archivedPath: join(root, "tools", "archive", fileName),
				message:
					"tools export archive is locked: type archive tools export to move selected tools export",
			});
			expect((await readToolHistoryExportIndex(root)).items).toHaveLength(1);

			const archived = await archiveToolHistoryExport(
				createToolHistoryExportArchivePlan(root, plan.path, {
					confirmation: "archive tools export",
				}),
			);
			expect(archived).toEqual({
				status: "archived",
				sourcePath: plan.path,
				archivedPath: join(root, "tools", "archive", fileName),
				message: `archived tools export ${fileName}`,
			});
			expect((await readToolHistoryExportIndex(root)).items).toEqual([]);
			expect((await readToolHistoryExportArchiveIndex(root)).items).toEqual([
				expect.objectContaining({
					fileName,
					generatedAt: "2026-07-01T05:00:00.000Z",
					scope: "all",
					runCount: 1,
				}),
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("prunes old archived tool history exports only after exact confirmation", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-tools-retention-"));
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
			for (const stamp of [
				"2026-07-01T050000000Z",
				"2026-07-01T040000000Z",
				"2026-07-01T030000000Z",
			]) {
				const plan = createToolHistoryExportPlan(history, 0, {
					baseDir: root,
					scope: "selected",
					generatedAt: new Date(
						stamp.replace(/T(\d{2})(\d{2})(\d{2})(\d{3})Z$/, "T$1:$2:$3.$4Z"),
					),
				});
				if (!plan) {
					throw new Error("expected tool history export plan");
				}
				await writeToolHistoryExport(plan);
				await archiveToolHistoryExport(
					createToolHistoryExportArchivePlan(root, plan.path, {
						confirmation: "archive tools export",
					}),
				);
			}

			const index = await readToolHistoryExportArchiveIndex(root);
			const retention = createToolHistoryArchiveRetentionPlan(index, {
				maxItems: 1,
			});

			expect(retention).toMatchObject({
				baseDir: join(root, "tools", "archive"),
				maxItems: 1,
				risk: "destructive",
				privilege: "user",
				confirmationRequired: true,
				confirmationPhrase: "prune tools archive",
				confirmed: false,
				enabled: false,
				reason: "type prune tools archive to remove 2 archived tools exports",
			});
			expect(retention.retainedItems.map((item) => item.fileName)).toEqual([
				"picos-tools-selected-2026-07-01T050000000Z.md",
			]);
			expect(retention.candidateItems.map((item) => item.fileName)).toEqual([
				"picos-tools-selected-2026-07-01T040000000Z.md",
				"picos-tools-selected-2026-07-01T030000000Z.md",
			]);
			expect(formatToolHistoryArchiveRetentionRows(retention)).toEqual([
				"TOOLS ARCHIVE RETENTION max=1 candidates=2",
				"risk=destructive privilege=user confirmed=false",
				"confirm prune tools archive locked",
				"keep picos-tools-selected-2026-07-01T050000000Z.md",
				"remove picos-tools-selected-2026-07-01T040000000Z.md",
				"remove picos-tools-selected-2026-07-01T030000000Z.md",
				"reason=type prune tools archive to remove 2 archived tools exports",
			]);
			expect(await pruneToolHistoryExportArchive(retention)).toEqual({
				status: "blocked",
				removed: 0,
				removedPaths: [],
				message:
					"tools archive retention is locked: type prune tools archive to remove 2 archived tools exports",
			});

			const confirmed = createToolHistoryArchiveRetentionPlan(index, {
				maxItems: 1,
				confirmation: "prune tools archive",
			});
			expect(await pruneToolHistoryExportArchive(confirmed)).toEqual({
				status: "pruned",
				removed: 2,
				removedPaths: [
					join(
						root,
						"tools",
						"archive",
						"picos-tools-selected-2026-07-01T040000000Z.md",
					),
					join(
						root,
						"tools",
						"archive",
						"picos-tools-selected-2026-07-01T030000000Z.md",
					),
				],
				message: "pruned 2 archived tools exports",
			});
			expect(
				(await readToolHistoryExportArchiveIndex(root)).items.map(
					(item) => item.fileName,
				),
			).toEqual(["picos-tools-selected-2026-07-01T050000000Z.md"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("repairs filtered Tools evidence selection after refresh", () => {
		const item = {
			fileName: "picos-tools-all-2026-07-01T040100000Z.md",
			path: "/tmp/picos/tools/picos-tools-all-2026-07-01T040100000Z.md",
			generatedAt: "2026-07-01T04:01:00.000Z",
			scope: "all" as const,
			runCount: 3,
		};
		const index = { baseDir: "/tmp/picos/tools", items: [item] };

		expect(
			classifyToolHistoryExportIndexRefresh({
				target: "active",
				currentRequestToken: 4,
				requestToken: 4,
				selectedIndex: 8,
				filter: "all",
				query: "040100",
				announce: true,
				outcome: { status: "success", index },
			}),
		).toEqual({
			status: "success",
			index,
			selectedIndex: 0,
			notice: { level: "info", message: "tools evidence indexed 1" },
		});
		expect(
			classifyToolHistoryExportIndexRefresh({
				target: "archive",
				currentRequestToken: 4,
				requestToken: 3,
				selectedIndex: 8,
				outcome: { status: "failure", error: "old failure" },
			}),
		).toEqual({
			status: "stale",
			notice: {
				level: "fail",
				message: "tools archive index failed old failure",
			},
		});
	});

	test("owns selected Tools export, open, archive, and retention confirmations", () => {
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
		const exported = prepareToolHistoryExport(history, 99, "selected", {
			baseDir: "/tmp/picos",
			generatedAt: new Date("2026-07-01T04:00:00.000Z"),
		});
		expect(exported).toMatchObject({
			kind: "export",
			notice: {
				level: "ok",
				message: "tools export selected prepared 1 run(s)",
			},
			plan: { scope: "selected", itemCount: 1 },
		});
		expect(
			prepareToolHistoryExport([], 4, "all", { baseDir: "/tmp/picos" }),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no tool history to export" },
		});

		const item = {
			fileName: "picos-tools-all-2026-07-01T040100000Z.md",
			path: "/tmp/picos/tools/picos-tools-all-2026-07-01T040100000Z.md",
			generatedAt: "2026-07-01T04:01:00.000Z",
			scope: "all" as const,
			runCount: 3,
		};
		const index = { baseDir: "/tmp/picos/tools", items: [item] };
		expect(
			prepareSelectedToolHistoryExportOpen({
				index,
				selectedIndex: 99,
				platform: "darwin",
			}),
		).toMatchObject({
			kind: "open",
			selectedIndex: 0,
			notice: {
				level: "info",
				message:
					"tools evidence open confirmation opened for picos-tools-all-2026-07-01T040100000Z.md",
			},
		});
		const archive = prepareSelectedToolHistoryExportArchive({
			baseDir: "/tmp/picos",
			index,
			selectedIndex: 99,
		});
		expect(archive).toMatchObject({
			kind: "confirmation",
			selectedIndex: 0,
			plan: { confirmationPhrase: "archive tools export" },
		});
		if (archive.kind !== "confirmation") {
			throw new Error("expected tools archive confirmation");
		}
		expect(
			prepareToolHistoryExportArchiveConfirmation(
				archive.plan,
				"archive tool export",
			),
		).toMatchObject({
			kind: "execute",
			plan: { confirmed: false, enabled: false },
		});
		const retention = createToolHistoryArchiveRetentionPlan(
			{
				baseDir: "/tmp/picos/tools/archive",
				items: [
					item,
					{
						...item,
						fileName: "picos-tools-all-older.md",
						path: "/tmp/picos/tools/archive/picos-tools-all-older.md",
						generatedAt: "2026-06-30T04:01:00.000Z",
					},
				],
			},
			{ maxItems: 1 },
		);
		expect(
			prepareToolHistoryArchiveRetentionConfirmation(
				retention,
				{
					baseDir: retention.baseDir,
					items: [...retention.retainedItems, ...retention.candidateItems],
				},
				"prune tool archive",
			),
		).toMatchObject({
			kind: "execute",
			plan: { confirmed: false, enabled: false },
		});
	});

	test("resolves filtered selected Tool history inside the export owner", () => {
		const dns = appendToolHistory(
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
		)[0];
		const tcp = appendToolHistory(
			[],
			{
				plan: {
					actionId: "network.connect",
					toolId: "port-check",
					args: ["api.example.com", "443"],
					label: "network.connect api.example.com:443",
				},
				result: {
					...result,
					title: "TCP Port Check",
					rawOutput: "$ picos tools port-check api.example.com 443",
				},
			},
			"12:00:01",
		)[0];
		if (!dns || !tcp) {
			throw new Error("expected tool history fixtures");
		}

		const transition = prepareSelectedToolHistoryExport({
			history: [dns, tcp],
			selectedIndex: 0,
			filter: "TCP",
			sort: "time",
			scope: "selected",
			baseDir: "/tmp/picos",
			generatedAt: new Date("2026-07-01T04:00:00.000Z"),
		});
		expect(transition).toMatchObject({
			kind: "export",
			selectedIndex: 1,
			plan: { scope: "selected", itemCount: 1 },
			notice: {
				level: "ok",
				message: "tools export selected prepared 1 run(s)",
			},
		});
		expect(
			transition.kind === "export" ? transition.plan.content : "",
		).toContain("network.connect api.example.com:443");
	});

	describe("Tools workspace input owner", () => {
		const workspaceHistory = [
			{
				id: "12:00:00-network-connect-example-com-443",
				time: "12:00:00",
				status: "ok" as const,
				label: "network.connect example.com:443",
				plan: {
					actionId: "network.connect" as const,
					toolId: "telnet" as const,
					args: ["example.com", "443"],
					label: "network.connect example.com:443",
				},
				title: "Telnet TCP Check",
				summary: "Summary: OPEN",
				rawOutput: [
					"$ picos tools telnet example.com 443",
					"[Target]",
					"Host: example.com",
					"Port: 443",
					"Command: picos tools telnet example.com 443",
					"Timeout: 2000ms",
					"[Status]",
					"OPEN",
					"Elapsed: 42ms",
				].join("\n"),
			},
		];

		function workspaceInput(
			overrides: Partial<ToolsWorkspaceInput> = {},
		): ToolsWorkspaceInput {
			return {
				command: undefined,
				input: "",
				key: {},
				history: workspaceHistory,
				selectedHistoryIndex: 0,
				filter: "",
				filterPresets: ["failed"],
				sort: "time",
				group: "none",
				detail: "raw",
				customTargetPresets: savedToolTargetPresets,
				targetPresets: savedToolTargetPresets,
				selectedTargetIndex: 0,
				targetPresetLimit: 8,
				copySection: "target",
				copyRowIndex: 0,
				exportContext: {
					baseDir: "/tmp/picos",
					generatedAt: new Date("2026-08-09T01:02:03.004Z"),
					publication: {
						selectedIndex: 4,
						filter: "any",
						query: "active evidence",
					},
				},
				...overrides,
			};
		}

		test("returns unhandled when no Tools command owns the key", () => {
			expect(prepareToolsWorkspaceInput(workspaceInput())).toEqual({
				kind: "unhandled",
			});
			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({ command: "detail-shortcut", input: "5" }),
				),
			).toEqual({ kind: "unhandled" });
		});

		test("owns filter and view commands with exact state, persistence, prompts, and notices", () => {
			const cases: Array<{
				name: string;
				input: Partial<ToolsWorkspaceInput>;
				effects: ToolsWorkspaceInputEffect[];
			}> = [
				{
					name: "open filter",
					input: { command: "open-filter" as const },
					effects: [
						{ kind: "prompt", prompt: "tool-filter" },
						{
							kind: "notice",
							notice: { level: "info", message: "tool history filter opened" },
						},
					],
				},
				{
					name: "clear filter",
					input: {
						command: "clear-filter" as const,
						selectedHistoryIndex: 99,
						filter: "tcp",
					},
					effects: [
						{ kind: "filter", filter: "" },
						{ kind: "copy-preview", mode: false },
						{ kind: "history-selection", selectedIndex: 0 },
						{
							kind: "notice",
							notice: { level: "info", message: "tool history filter cleared" },
						},
					],
				},
				{
					name: "save filter",
					input: { command: "save-filter" as const, filter: "tcp" },
					effects: [
						{ kind: "filter-presets", presets: ["tcp", "failed"] },
						{
							kind: "persist-history-preferences",
							preferences: { filterPresets: ["tcp", "failed"] },
							failureMessagePrefix: "tools preset save failed",
						},
						{
							kind: "notice",
							notice: { level: "info", message: "tools preset saved tcp" },
						},
					],
				},
				{
					name: "cleanup filter",
					input: { command: "cleanup-filter" as const },
					effects: [
						{ kind: "prompt", prompt: "tool-history-cleanup" },
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: {
								level: "warn",
								message:
									"tool history filter cleanup confirm clear tools history",
							},
						},
					],
				},
				{
					name: "cycle filter preset",
					input: {
						command: "cycle-filter-preset" as const,
						filter: "failed",
						filterPresets: ["failed", "tcp"],
					},
					effects: [
						{ kind: "filter", filter: "tcp" },
						{ kind: "copy-preview", mode: false },
						{ kind: "history-selection", selectedIndex: 0 },
						{
							kind: "notice",
							notice: { level: "info", message: "tools preset tcp matches 1" },
						},
					],
				},
				{
					name: "detail shortcut",
					input: { command: "detail-shortcut" as const, input: "4" },
					effects: [
						{ kind: "detail", detail: "compare" },
						{
							kind: "persist-history-preferences",
							preferences: { detailView: "compare" },
							failureMessagePrefix: "tools detail save failed",
						},
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: { level: "info", message: "tools detail compare" },
						},
					],
				},
				{
					name: "cycle detail",
					input: { command: "cycle-detail" as const },
					effects: [
						{ kind: "detail", detail: "summary" },
						{
							kind: "persist-history-preferences",
							preferences: { detailView: "summary" },
							failureMessagePrefix: "tools detail save failed",
						},
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: { level: "info", message: "tools detail summary" },
						},
					],
				},
				{
					name: "cycle sort",
					input: { command: "cycle-sort" as const },
					effects: [
						{ kind: "sort", sort: "tool" },
						{
							kind: "persist-history-preferences",
							preferences: { sort: "tool" },
							failureMessagePrefix: "tools sort save failed",
						},
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: { level: "info", message: "tools sort tool" },
						},
					],
				},
				{
					name: "cycle group",
					input: { command: "cycle-group" as const },
					effects: [
						{ kind: "group", group: "tool" },
						{
							kind: "persist-history-preferences",
							preferences: { group: "tool" },
							failureMessagePrefix: "tools group save failed",
						},
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: { level: "info", message: "tools group tool" },
						},
					],
				},
			];

			for (const current of cases) {
				expect(
					prepareToolsWorkspaceInput(workspaceInput(current.input)),
					current.name,
				).toEqual({ kind: "handled", effects: current.effects });
			}
		});

		test("owns target selection, persistence, prompts, and run plans", () => {
			const cases: Array<{
				name: string;
				input: Partial<ToolsWorkspaceInput>;
				effects: ToolsWorkspaceInputEffect[];
			}> = [
				{
					name: "next target",
					input: { command: "select-target-next" as const },
					effects: [
						{ kind: "target-selection", selectedIndex: 1 },
						{
							kind: "notice",
							notice: {
								level: "info",
								message: "tool target DB ping db.example.com",
							},
						},
						{ kind: "copy-preview", mode: false },
					],
				},
				{
					name: "previous target",
					input: { command: "select-target-previous" as const },
					effects: [
						{ kind: "target-selection", selectedIndex: 1 },
						{
							kind: "notice",
							notice: {
								level: "info",
								message: "tool target DB ping db.example.com",
							},
						},
						{ kind: "copy-preview", mode: false },
					],
				},
				{
					name: "save target",
					input: {
						command: "save-target" as const,
						customTargetPresets: [],
						targetPresets: [savedToolTargetPresets[0]],
					},
					effects: [
						{ kind: "target-selection", selectedIndex: 0 },
						{
							kind: "notice",
							notice: {
								level: "info",
								message: "tool target saved API DNS api.example.com",
							},
						},
						{ kind: "target-presets", presets: [savedToolTargetPresets[0]] },
						{
							kind: "persist-target-presets",
							presets: [savedToolTargetPresets[0]],
							failureMessagePrefix: "tool target save failed",
						},
						{ kind: "copy-preview", mode: false },
					],
				},
				{
					name: "promote target",
					input: {
						command: "promote-target" as const,
						selectedTargetIndex: 1,
					},
					effects: [
						{ kind: "target-selection", selectedIndex: 0 },
						{
							kind: "notice",
							notice: {
								level: "info",
								message: "tool target pinned DB ping db.example.com",
							},
						},
						{
							kind: "target-presets",
							presets: [savedToolTargetPresets[1], savedToolTargetPresets[0]],
						},
						{
							kind: "persist-target-presets",
							presets: [savedToolTargetPresets[1], savedToolTargetPresets[0]],
							failureMessagePrefix: "tool target pin failed",
						},
						{ kind: "copy-preview", mode: false },
					],
				},
				{
					name: "remove target",
					input: {
						command: "remove-target" as const,
						selectedTargetIndex: 1,
					},
					effects: [
						{ kind: "target-selection", selectedIndex: 0 },
						{
							kind: "notice",
							notice: {
								level: "info",
								message: "tool target removed DB ping db.example.com",
							},
						},
						{ kind: "target-presets", presets: [savedToolTargetPresets[0]] },
						{
							kind: "persist-target-presets",
							presets: [savedToolTargetPresets[0]],
							failureMessagePrefix: "tool target delete failed",
						},
						{ kind: "copy-preview", mode: false },
					],
				},
				...(
					[
						["prompt-target-cleanup", "tool-target-cleanup", "cleanup", "warn"],
						["prompt-target-label", "tool-target-label", "label", "info"],
						["prompt-target-value", "tool-target-value", "value", "info"],
						["prompt-target-action", "tool-target-action", "action", "info"],
					] as const
				).map(([command, prompt, label, level]) => ({
					name: command,
					input: { command },
					effects: [
						{ kind: "target-selection", selectedIndex: 0 },
						{ kind: "prompt", prompt },
						{ kind: "copy-preview", mode: false },
						{
							kind: "notice",
							notice: {
								level,
								message:
									label === "cleanup"
										? "tool target cleanup confirm delete tools.dns"
										: `tool target ${label} opened API DNS`,
							},
						},
					] satisfies ToolsWorkspaceInputEffect[],
				})),
				{
					name: "run target",
					input: { command: "run-target" as const, selectedTargetIndex: 1 },
					effects: [
						{ kind: "target-selection", selectedIndex: 1 },
						{
							kind: "run",
							source: "target",
							plan: {
								actionId: "ping.default",
								toolId: "ping",
								args: ["db.example.com"],
								label: "ping.default db.example.com",
							},
							completionNotice: "DB ping completed",
						},
					],
				},
			];

			for (const current of cases) {
				expect(
					prepareToolsWorkspaceInput(workspaceInput(current.input)),
					current.name,
				).toEqual({ kind: "handled", effects: current.effects });
			}
		});

		test("owns rerun, clipboard, section-row, and export commands with complete payloads", () => {
			const rawPreview = {
				source: "tool-output",
				label: "network.connect example.com:443 raw output",
				copyText: workspaceHistory[0]?.rawOutput ?? "",
				details: ["path c raw", "tool telnet", "action network.connect"],
				confirmation: "copy",
				enabled: false,
				reason: "Clipboard writes require explicit confirmation plumbing.",
			} satisfies ClipboardPreview;
			const summaryPreview = {
				source: "tool-summary",
				label: "network.connect example.com:443 summary",
				copyText: "Summary: OPEN",
				details: ["path y summary", "tool telnet", "action network.connect"],
				confirmation: "copy",
				enabled: false,
				reason: "Clipboard writes require explicit confirmation plumbing.",
			} satisfies ClipboardPreview;

			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({ command: "rerun", selectedHistoryIndex: 99 }),
				),
			).toEqual({
				kind: "handled",
				effects: [
					{
						kind: "run",
						source: "rerun",
						plan: workspaceHistory[0]?.plan,
						completionNotice: "network.connect example.com:443 rerun completed",
					},
				],
			});

			for (const [command, mode, preview] of [
				["copy-raw", "raw", rawPreview],
				["copy-summary", "summary", summaryPreview],
			] as const) {
				expect(
					prepareToolsWorkspaceInput(workspaceInput({ command })),
					command,
				).toEqual({
					kind: "handled",
					effects: [{ kind: "clipboard", mode, preview }],
				});
			}

			expect(
				prepareToolsWorkspaceInput(workspaceInput({ command: "copy-compare" })),
			).toEqual({
				kind: "handled",
				effects: [
					{
						kind: "clipboard",
						mode: "compare",
						preview: {
							source: "tool-compare",
							label: "network.connect example.com:443 compare",
							copyText: [
								"DETAIL compare",
								"current=12:00:00 ok network.connect example.com:443",
								"no previous matching tool run",
								"compare key=network.connect example.com 443",
							].join("\n"),
							details: [
								"path o compare",
								"previous none",
								"tool telnet",
								"action network.connect",
							],
							confirmation: "copy",
							enabled: false,
							reason:
								"Clipboard writes require explicit confirmation plumbing.",
						},
					},
				],
			});

			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({ command: "cycle-copy-section", copyRowIndex: 3 }),
				),
			).toEqual({
				kind: "handled",
				effects: [
					{ kind: "copy-section", section: "status" },
					{ kind: "copy-row", rowIndex: 0 },
					{ kind: "copy-preview", mode: false },
					{
						kind: "notice",
						notice: { level: "info", message: "tools copy section status" },
					},
				],
			});
			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({ command: "move-copy-row-next" }),
				),
			).toEqual({
				kind: "handled",
				effects: [
					{ kind: "copy-row", rowIndex: 1 },
					{ kind: "copy-preview", mode: false },
				],
			});
			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({ command: "move-copy-row-previous" }),
				),
			).toEqual({
				kind: "handled",
				effects: [
					{ kind: "copy-row", rowIndex: 3 },
					{ kind: "copy-preview", mode: false },
				],
			});

			for (const [command, mode, label, copyText, details] of [
				[
					"copy-row",
					"row",
					"network.connect example.com:443 target row 3",
					"Command: picos tools telnet example.com 443",
					[
						"path b row",
						"section target row 3/4",
						"tool telnet",
						"action network.connect",
					],
				],
				[
					"copy-section",
					"target",
					"network.connect example.com:443 target fields",
					[
						"Host: example.com",
						"Port: 443",
						"Command: picos tools telnet example.com 443",
						"Timeout: 2000ms",
					].join("\n"),
					[
						"path v section",
						"section target rows 4",
						"tool telnet",
						"action network.connect",
					],
				],
			] as const) {
				expect(
					prepareToolsWorkspaceInput(
						workspaceInput({
							command,
							copyRowIndex: command === "copy-row" ? 2 : 0,
						}),
					),
					command,
				).toEqual({
					kind: "handled",
					effects: [
						{
							kind: "clipboard",
							mode,
							preview: {
								source: command === "copy-row" ? "tool-row" : "tool-target",
								label,
								copyText,
								details: [...details],
								confirmation: "copy",
								enabled: false,
								reason:
									"Clipboard writes require explicit confirmation plumbing.",
							},
						},
					],
				});
			}

			for (const [command, scope] of [
				["export-selected", "selected"],
				["export-all", "all"],
				["export-compare", "compare"],
			] as const) {
				const transition = prepareToolsWorkspaceInput(
					workspaceInput({ command, selectedHistoryIndex: 99 }),
				);
				expect(transition, command).toMatchObject({
					kind: "handled",
					effects: [
						{
							kind: "export",
							plan: {
								path: `/tmp/picos/tools/picos-tools-${scope}-2026-08-09T010203004Z.md`,
								itemCount: 1,
								scope,
							},
							publication: {
								target: "active",
								selectedIndex: 4,
								filter: "any",
								query: "active evidence",
							},
							notice: {
								level: "ok",
								message: `tools export ${scope} prepared 1 run(s)`,
							},
						},
					],
				});
				if (transition.kind === "handled") {
					const effect = transition.effects[0];
					if (effect?.kind === "export") {
						expect(effect.plan.content).toContain(
							"generatedAt=2026-08-09T01:02:03.004Z",
						);
						expect(effect).not.toHaveProperty("snapshot");
					}
				}
			}
		});

		test("prepares the final export plan and immutable refresh publication", () => {
			const transition = prepareToolsWorkspaceInput({
				...workspaceInput({
					command: "export-selected",
					selectedHistoryIndex: 99,
				}),
				exportContext: {
					baseDir: "/tmp/picos",
					generatedAt: new Date("2026-08-09T01:02:03.004Z"),
					publication: {
						selectedIndex: 7,
						filter: "selected",
						query: "api.example.com",
					},
				},
			} as ToolsWorkspaceInput & {
				exportContext: {
					baseDir: string;
					generatedAt: Date;
					publication: {
						selectedIndex: number;
						filter: "selected";
						query: string;
					};
				};
			});

			expect(transition).toMatchObject({
				kind: "handled",
				effects: [
					{
						kind: "export",
						plan: {
							path: "/tmp/picos/tools/picos-tools-selected-2026-08-09T010203004Z.md",
							itemCount: 1,
							scope: "selected",
						},
						publication: {
							target: "active",
							selectedIndex: 7,
							filter: "selected",
							query: "api.example.com",
						},
					},
				],
			});
			if (transition.kind !== "handled") {
				throw new Error("expected handled tools export");
			}
			const effect = transition.effects[0] as ToolsWorkspaceInputEffect & {
				plan?: { content: string };
			};
			expect(effect.plan?.content).toContain(
				"## [12:00:00] network.connect example.com:443",
			);
		});

		test("bounds final export plans while retaining the selected and compare runs", () => {
			const history = Array.from({ length: 14 }, (_, index) => ({
				...workspaceHistory[0],
				id: `run-${index}`,
				time: `12:00:${String(index).padStart(2, "0")}`,
				plan: {
					...workspaceHistory[0]?.plan,
					args: [...(workspaceHistory[0]?.plan.args ?? [])],
				},
				rawOutput: `run ${index}`,
			}));

			const allTransition = prepareToolsWorkspaceInput(
				workspaceInput({
					command: "export-all",
					history,
					selectedHistoryIndex: 0,
				}),
			);
			expect(allTransition).toMatchObject({
				kind: "handled",
				effects: [
					{
						kind: "export",
						plan: {
							itemCount: 12,
							scope: "all",
						},
						notice: {
							level: "ok",
							message: "tools export all prepared 12 run(s)",
						},
					},
				],
			});
			if (allTransition.kind !== "handled") {
				throw new Error("expected handled all export");
			}
			const allEffect = allTransition.effects[0];
			if (allEffect?.kind !== "export") {
				throw new Error("expected all export effect");
			}
			expect(allEffect.plan.content).toContain("```txt\nrun 2\n```");
			expect(allEffect.plan.content).toContain("```txt\nrun 13\n```");
			expect(allEffect.plan.content).not.toContain("```txt\nrun 0\n```");
			expect(allEffect.plan.content).not.toContain("```txt\nrun 1\n```");

			const selectedTransition = prepareToolsWorkspaceInput(
				workspaceInput({
					command: "export-selected",
					history,
					selectedHistoryIndex: 13,
				}),
			);
			expect(selectedTransition).toMatchObject({
				kind: "handled",
				effects: [
					{
						kind: "export",
						plan: {
							itemCount: 1,
							scope: "selected",
						},
					},
				],
			});
			if (selectedTransition.kind !== "handled") {
				throw new Error("expected handled selected export");
			}
			const selectedEffect = selectedTransition.effects[0];
			if (selectedEffect?.kind !== "export") {
				throw new Error("expected selected export effect");
			}
			expect(selectedEffect.plan.content).toContain("```txt\nrun 13\n```");
			expect(selectedEffect.plan.content).not.toContain("```txt\nrun 12\n```");

			const compareTransition = prepareToolsWorkspaceInput(
				workspaceInput({
					command: "export-compare",
					history,
					selectedHistoryIndex: 13,
				}),
			);
			expect(compareTransition).toMatchObject({
				kind: "handled",
				effects: [
					{
						kind: "export",
						plan: {
							itemCount: 1,
							scope: "compare",
						},
					},
				],
			});
			if (compareTransition.kind !== "handled") {
				throw new Error("expected handled compare export");
			}
			const compareEffect = compareTransition.effects[0];
			if (compareEffect?.kind !== "export") {
				throw new Error("expected compare export effect");
			}
			expect(compareEffect.plan.content).toContain(
				"current=12:00:13 ok network.connect example.com:443",
			);
			expect(compareEffect.plan.content).toContain(
				"previous=12:00:12 ok network.connect example.com:443",
			);
		});

		test("reports exact empty filter, history, target, and clipboard notices", () => {
			const cases: Array<[Partial<ToolsWorkspaceInput>, string]> = [
				[
					{ command: "save-filter" as const, filter: "  " },
					"no tools filter to save",
				],
				[
					{ command: "cleanup-filter" as const, filterPresets: [] },
					"no tools filter presets to clean",
				],
				[
					{ command: "cycle-filter-preset" as const, filterPresets: [] },
					"no tools filter presets",
				],
				[
					{ command: "rerun" as const, history: [] },
					"no tool history selected",
				],
				[
					{ command: "copy-raw" as const, history: [] },
					"no tool output selected",
				],
				[
					{ command: "copy-summary" as const, history: [] },
					"no tool summary selected",
				],
				[
					{ command: "copy-compare" as const, history: [] },
					"no tool compare selected",
				],
				[
					{ command: "copy-row" as const, history: [] },
					"no tool target row selected",
				],
				[
					{ command: "copy-section" as const, history: [] },
					"no tool target fields selected",
				],
				[
					{ command: "export-selected" as const, history: [] },
					"no tool history to export",
				],
				[
					{ command: "export-all" as const, history: [] },
					"no tool history to export",
				],
				[
					{ command: "export-compare" as const, history: [] },
					"no tool history to export",
				],
			];

			for (const [overrides, message] of cases) {
				expect(
					prepareToolsWorkspaceInput(workspaceInput(overrides)),
					message,
				).toEqual({
					kind: "handled",
					effects: [{ kind: "notice", notice: { level: "warn", message } }],
				});
			}

			const emptyTargetCases: Array<[Partial<ToolsWorkspaceInput>, string]> = [
				[
					{
						command: "save-target" as const,
						customTargetPresets: [],
						targetPresets: [],
					},
					"no tool target preset to save",
				],
				[
					{
						command: "prompt-target-label" as const,
						customTargetPresets: [],
						targetPresets: [],
					},
					"no tool target preset selected",
				],
				[
					{ command: "run-target" as const, targetPresets: [] },
					"no tool target presets",
				],
			];
			for (const [overrides, message] of emptyTargetCases) {
				expect(
					prepareToolsWorkspaceInput(workspaceInput(overrides)),
					message,
				).toEqual({
					kind: "handled",
					effects: [
						{ kind: "target-selection", selectedIndex: 0 },
						{ kind: "notice", notice: { level: "warn", message } },
					],
				});
			}

			expect(
				prepareToolsWorkspaceInput(
					workspaceInput({
						command: "select-target-next",
						targetPresets: [],
						selectedTargetIndex: -1,
					}),
				),
			).toEqual({
				kind: "handled",
				effects: [
					{ kind: "target-selection", selectedIndex: 0 },
					{ kind: "copy-preview", mode: false },
				],
			});
		});

		test("enumerates every ToolsWorkspaceCommand through the owner", () => {
			const commands = {
				"open-filter": {},
				"clear-filter": {},
				"save-filter": { filter: "tcp" },
				"cleanup-filter": {},
				"cycle-filter-preset": {},
				"detail-shortcut": { input: "1" },
				"cycle-detail": {},
				"cycle-sort": {},
				"cycle-group": {},
				rerun: {},
				"select-target-next": {},
				"select-target-previous": {},
				"save-target": {},
				"promote-target": {},
				"remove-target": {},
				"prompt-target-cleanup": {},
				"prompt-target-label": {},
				"prompt-target-value": {},
				"prompt-target-action": {},
				"run-target": {},
				"copy-raw": {},
				"copy-summary": {},
				"copy-compare": {},
				"cycle-copy-section": {},
				"move-copy-row-next": {},
				"move-copy-row-previous": {},
				"copy-row": {},
				"copy-section": {},
				"export-selected": {},
				"export-all": {},
				"export-compare": {},
			} satisfies Record<ToolsWorkspaceCommand, Partial<ToolsWorkspaceInput>>;

			for (const [command, overrides] of Object.entries(commands)) {
				expect(
					prepareToolsWorkspaceInput(
						workspaceInput({
							...overrides,
							command: command as ToolsWorkspaceCommand,
						}),
					).kind,
					command,
				).toBe("handled");
			}
		});
	});
});
