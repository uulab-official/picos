import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolResult } from "../src/core/tools";
import type { NetworkSummary } from "../src/core/types";
import {
	appendToolHistory,
	createToolHistoryCleanupPreview,
	createToolHistoryExportPlan,
	createToolRunPlan,
	createToolRunPlanFromPreset,
	createToolTargetCleanupPreview,
	filterToolHistory,
	formatToolHistoryExport,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getSelectedToolHistoryItem,
	getSelectedToolOutputClipboardPreview,
	getSelectedToolSectionClipboardPreview,
	getSelectedToolSectionRowClipboardPreview,
	getSelectedToolSummaryClipboardPreview,
	getSelectedToolTargetClipboardPreview,
	getToolTargetPresets,
	getVisibleToolHistoryIndex,
	moveFilteredToolHistorySelection,
	moveToolHistorySelection,
	moveToolSectionClipboardRow,
	moveToolTargetPresetSelection,
	nextToolHistoryDetailView,
	nextToolHistoryGroup,
	nextToolHistoryPreset,
	nextToolHistorySort,
	nextToolSectionClipboardSelection,
	normalizeToolTargetPresets,
	promoteToolTargetPreset,
	reassignToolTargetPresetAction,
	removeToolTargetPreset,
	removeToolTargetPresetsByAction,
	renameToolTargetPreset,
	rerunToolHistoryItem,
	retargetToolTargetPreset,
	saveToolHistoryPreset,
	saveToolTargetPreset,
	sortToolHistory,
	submitToolHistoryCleanupConfirmation,
	submitToolTargetCleanupConfirmation,
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
		]);
		expect(formatToolsWorkspaceRows(history, 4, 0, "missing")).toEqual([
			"TOOLS history=2 filter=missing matches=0 selected=-",
			"no matching tool runs",
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
		expect(nextToolHistoryDetailView("command")).toBe("raw");
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=target · v copy section · c raw",
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
			}),
		);
		expect(
			getSelectedToolSectionClipboardPreview(history, 0, "status"),
		).toEqual(
			expect.objectContaining({
				source: "tool-status",
				label: "network.connect example.com:443 status fields",
				copyText: "OPEN\nElapsed: 42ms",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=status · v copy section · c raw",
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
			}),
		);
		expect(
			getSelectedToolSectionRowClipboardPreview(history, 0, "status", 1),
		).toEqual(
			expect.objectContaining({
				source: "tool-row",
				label: "network.connect example.com:443 status row 2",
				copyText: "Elapsed: 42ms",
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
			"shortcuts: j/k select · tab detail · f filter · F clear · s sort · G group · P save filter · ] preset · C filter cleanup · n/N target · T save target · U pin target · L label target · M edit target · A action target · X delete target · D delete action · R run · r rerun · y summary · V section=status · ,/. row=2/2 · b row · v copy section · c raw",
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
});
