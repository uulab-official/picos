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
});
