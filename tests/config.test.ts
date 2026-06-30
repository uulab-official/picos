import { describe, expect, test } from "bun:test";
import {
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
			language: "en",
			remoteProfiles: [],
			logProfiles: [],
			logSearchPresets: [],
			routeFilterPresets: [],
			connectionSort: "state",
			portSort: "port",
			connectionFilterPresets: [],
			portFilterPresets: [],
			toolHistoryFilterPresets: [],
			toolHistorySort: "time",
			toolHistoryGroup: "none",
			toolHistoryDetailView: "raw",
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
				unknown: true,
			}),
		).toEqual({
			...defaultConfig,
			theme: "light",
			language: "ko",
			refreshInterval: 5000,
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
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
				toolHistoryDetailView: "command",
			}),
		).toMatchObject({
			toolHistoryFilterPresets: ["dns", "fail", "tls", "trace", "rdap", "ping"],
			toolHistorySort: "status",
			toolHistoryGroup: "tool",
			toolHistoryDetailView: "command",
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
});
