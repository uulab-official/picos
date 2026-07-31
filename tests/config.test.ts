import { describe, expect, test } from "bun:test";
import {
	coerceConfigValue,
	defaultConfig,
	getConfigPathForPlatform,
	mergeConfig,
} from "../src/config/schema";

describe("config schema", () => {
	test("uses safe read-only defaults for v0.1", () => {
		expect(defaultConfig).toEqual({
			theme: "dark",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			showPublicIp: true,
			enableExperimentalControls: false,
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
			language: "en",
			remoteProfiles: [],
			logProfiles: [],
			logSearchPresets: [],
			operationPresets: [],
			interfaceEvidenceSearchPresets: [],
			routeFilterPresets: [],
			connectionSort: "state",
			portSort: "port",
			connectionFilterPresets: [],
			portFilterPresets: [],
			toolHistoryFilterPresets: [],
			toolHistorySort: "time",
			toolHistoryGroup: "none",
			toolHistoryDetailView: "raw",
			toolTargetPresets: [],
			toolTargetPresetLimit: 8,
			auditArchiveRetentionLimit: 10,
			statusResultJumpClassFilter: "all",
		});
	});

	test("resolves the expected platform config paths", () => {
		expect(
			getConfigPathForPlatform("darwin", "/Users/alice", {
				APPDATA: "C:/Users/Alice/AppData/Roaming",
			}),
		).toBe("/Users/alice/Library/Application Support/picos/config.json");

		expect(
			getConfigPathForPlatform("linux", "/home/alice", {
				XDG_CONFIG_HOME: "/tmp/xdg",
			}),
		).toBe("/tmp/xdg/picos/config.json");

		expect(
			getConfigPathForPlatform("win32", "C:/Users/Alice", {
				APPDATA: "C:/Users/Alice/AppData/Roaming",
			}),
		).toBe("C:/Users/Alice/AppData/Roaming/picos/config.json");
	});

	test("merges partial config with defaults and ignores unknown keys", () => {
		expect(
			mergeConfig({
				theme: "light",
				language: "ko",
				refreshInterval: 5000,
				controlExecutionMode: "dry-run",
				allowAdminDryRun: true,
				editorSaveMode: "local-write",
				unknown: true,
			}),
		).toEqual({
			...defaultConfig,
			theme: "light",
			language: "ko",
			refreshInterval: 5000,
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			editorSaveMode: "local-write",
		});
	});

	test("normalizes persisted log profiles", () => {
		expect(
			mergeConfig({
				logProfiles: [
					{ level: "warn", query: " kernel " },
					{ level: "bad", query: "ignored" },
					{ level: "all", query: "" },
					{ level: "warn", query: "kernel" },
					{ level: "fail", query: "error" },
					{ level: "info", query: "boot" },
					{ level: "all", query: "dns" },
					{ level: "warn", query: "route" },
					{ level: "fail", query: "panic" },
				],
			}).logProfiles,
		).toEqual([
			{ level: "warn", query: "kernel" },
			{ level: "all", query: "" },
			{ level: "fail", query: "error" },
			{ level: "info", query: "boot" },
			{ level: "all", query: "dns" },
			{ level: "warn", query: "route" },
		]);
	});

	test("normalizes persisted log search presets", () => {
		expect(
			mergeConfig({
				logSearchPresets: [
					" kernel ",
					"",
					"error",
					"kernel",
					"dns",
					"route",
					"boot",
					"panic",
					"ignored",
				],
			}).logSearchPresets,
		).toEqual(["kernel", "error", "dns", "route", "boot", "panic"]);
	});

	test("normalizes persisted operation presets", () => {
		expect(
			mergeConfig({
				operationPresets: [
					{ id: " Pulse ", kind: "monitor", samples: 3, intervalMs: 500 },
					{
						id: "errors",
						kind: "logs",
						limit: 25,
						level: "fail",
						filter: " disk ",
					},
					{ id: "worker", kind: "process", pid: 42, files: true },
					{ id: "bad", kind: "process", pid: 0, files: false },
				],
			}).operationPresets,
		).toEqual([
			{ id: "pulse", kind: "monitor", samples: 3, intervalMs: 500 },
			{ id: "errors", kind: "logs", limit: 25, level: "fail", filter: "disk" },
			{
				id: "worker",
				kind: "process",
				pid: 42,
				files: true,
				savedAtMs: expect.any(Number),
			},
		]);
		expect(() => coerceConfigValue("operationPresets", "[]")).toThrow(
			"managed by picos operations",
		);
	});

	test("normalizes persisted interface evidence search presets", () => {
		expect(
			mergeConfig({
				interfaceEvidenceSearchPresets: [
					" Wi-Fi ",
					"",
					"rejected",
					"WI-FI",
					"archived",
					"disable",
					"ethernet",
					"blocked",
				],
			}).interfaceEvidenceSearchPresets,
		).toEqual([
			"wi-fi",
			"rejected",
			"archived",
			"disable",
			"ethernet",
			"blocked",
		]);
	});

	test("normalizes persisted route filter presets", () => {
		expect(
			mergeConfig({
				routeFilterPresets: [
					" utun ",
					"",
					"default",
					"utun",
					"link",
					"ipv6",
					"vpn",
					"metric",
					"ignored",
				],
			}).routeFilterPresets,
		).toEqual(["utun", "default", "link", "ipv6", "vpn", "metric"]);
	});

	test("normalizes persisted endpoint filter presets", () => {
		expect(
			mergeConfig({
				connectionFilterPresets: [
					" 443 ",
					"",
					"node",
					"443",
					"ESTABLISHED",
					"127.0.0.1",
					"postgres",
					"udp",
					"ignored",
				],
				portFilterPresets: [
					" node ",
					"",
					"3000",
					"node",
					"postgres",
					"tcp",
					"5432",
					"listen",
					"ignored",
				],
			}),
		).toMatchObject({
			connectionFilterPresets: [
				"443",
				"node",
				"ESTABLISHED",
				"127.0.0.1",
				"postgres",
				"udp",
			],
			portFilterPresets: ["node", "3000", "postgres", "tcp", "5432", "listen"],
		});
	});

	test("normalizes persisted endpoint sort preferences", () => {
		expect(
			mergeConfig({
				connectionSort: "-pid",
				portSort: "process",
			}),
		).toMatchObject({
			connectionSort: "-pid",
			portSort: "process",
		});

		expect(
			mergeConfig({
				connectionSort: "unsafe",
				portSort: "-unsafe",
			}),
		).toMatchObject({
			connectionSort: "state",
			portSort: "port",
		});
	});

	test("normalizes persisted tool history preferences", () => {
		expect(
			mergeConfig({
				toolHistoryFilterPresets: [
					" dns ",
					"",
					"fail",
					"dns",
					"tls",
					"trace",
					"rdap",
					"ping",
					"ignored",
				],
				toolHistorySort: "status",
				toolHistoryGroup: "tool",
				toolHistoryDetailView: "compare",
			}),
		).toMatchObject({
			toolHistoryFilterPresets: ["dns", "fail", "tls", "trace", "rdap", "ping"],
			toolHistorySort: "status",
			toolHistoryGroup: "tool",
			toolHistoryDetailView: "compare",
		});

		expect(
			mergeConfig({
				toolHistoryFilterPresets: "dns",
				toolHistorySort: "unsafe",
				toolHistoryGroup: "unsafe",
				toolHistoryDetailView: "unsafe",
			}),
		).toMatchObject({
			toolHistoryFilterPresets: [],
			toolHistorySort: "time",
			toolHistoryGroup: "none",
			toolHistoryDetailView: "raw",
		});
	});

	test("normalizes persisted tool target presets", () => {
		expect(
			mergeConfig({
				toolTargetPresets: [
					{
						id: " api ",
						label: " API DNS ",
						actionId: "tools.dns",
						target: " api.example.com ",
						hint: " production api ",
					},
					{
						id: "bad",
						actionId: "tools.bad",
						target: "ignored",
					},
					{
						id: "api-duplicate",
						actionId: "tools.dns",
						target: "api.example.com",
					},
					{
						actionId: "network.connect",
						target: "db.internal:5432",
					},
				],
			}).toolTargetPresets,
		).toEqual([
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
	});

	test("normalizes tool target preset retention limits", () => {
		expect(
			mergeConfig({ toolTargetPresetLimit: 3 }).toolTargetPresetLimit,
		).toBe(3);
		expect(
			mergeConfig({ toolTargetPresetLimit: 0 }).toolTargetPresetLimit,
		).toBe(8);
		expect(
			mergeConfig({ toolTargetPresetLimit: 99 }).toolTargetPresetLimit,
		).toBe(24);
		expect(coerceConfigValue("toolTargetPresetLimit", "12")).toBe(12);
		expect(() => coerceConfigValue("toolTargetPresetLimit", "0")).toThrow(
			"toolTargetPresetLimit must be a number between 1 and 24",
		);
	});

	test("normalizes audit archive retention limits", () => {
		expect(
			mergeConfig({ auditArchiveRetentionLimit: 3 }).auditArchiveRetentionLimit,
		).toBe(3);
		expect(
			mergeConfig({ auditArchiveRetentionLimit: 0 }).auditArchiveRetentionLimit,
		).toBe(10);
		expect(
			mergeConfig({ auditArchiveRetentionLimit: 99 })
				.auditArchiveRetentionLimit,
		).toBe(60);
		expect(coerceConfigValue("auditArchiveRetentionLimit", "12")).toBe(12);
		expect(() => coerceConfigValue("auditArchiveRetentionLimit", "0")).toThrow(
			"auditArchiveRetentionLimit must be a number between 1 and 60",
		);
	});

	test("normalizes editor save execution mode", () => {
		expect(mergeConfig({ editorSaveMode: "local-write" }).editorSaveMode).toBe(
			"local-write",
		);
		expect(mergeConfig({ editorSaveMode: "unsafe" }).editorSaveMode).toBe(
			"disabled",
		);
		expect(coerceConfigValue("editorSaveMode", "local-write")).toBe(
			"local-write",
		);
		expect(() => coerceConfigValue("editorSaveMode", "unsafe")).toThrow(
			"editorSaveMode must be disabled or local-write",
		);
	});

	test("normalizes persisted status result jump class filters", () => {
		expect(
			mergeConfig({ statusResultJumpClassFilter: "process" })
				.statusResultJumpClassFilter,
		).toBe("process");
		expect(
			mergeConfig({ statusResultJumpClassFilter: "tools" })
				.statusResultJumpClassFilter,
		).toBe("tools");
		expect(
			mergeConfig({ statusResultJumpClassFilter: "unsafe" })
				.statusResultJumpClassFilter,
		).toBe("all");
		expect(coerceConfigValue("statusResultJumpClassFilter", "source")).toBe(
			"source",
		);
		expect(() =>
			coerceConfigValue("statusResultJumpClassFilter", "unsafe"),
		).toThrow(
			"statusResultJumpClassFilter must be one of all, process, timeline, tools, source",
		);
	});
});
