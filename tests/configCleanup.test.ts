import { describe, expect, test } from "bun:test";
import { defaultConfig } from "../src/config/schema";
import {
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../src/core/configCleanup";
import { createConfigWorkspaceResetWriteIntent } from "../src/tui/configPanel";

describe("config cleanup confirmation", () => {
	test("creates reusable exact-confirm previews for config cleanup operations", () => {
		expect(
			createConfigCleanupPreview({
				id: "tools.targets.tools.dns",
				label: "Tools target presets",
				scope: "tools.dns",
				count: 2,
				verb: "delete",
			}),
		).toEqual({
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
		});
	});

	test("submits exact config cleanup confirmations without executing cleanup work", () => {
		const preview = createConfigCleanupPreview({
			id: "logs.search",
			label: "Log search presets",
			scope: "logs",
			count: 4,
			verb: "clear",
		});

		expect(submitConfigCleanupConfirmation(preview, "clear log")).toEqual({
			confirmed: false,
			message: "config cleanup rejected logs.search",
			preview,
		});
		expect(submitConfigCleanupConfirmation(preview, " clear logs ")).toEqual({
			confirmed: true,
			message: "config cleanup confirmed logs.search (4 items)",
			preview,
		});
	});

	test("creates the reset write intent with a shelf bounded by the reset limit", () => {
		const config = {
			...defaultConfig,
			toolTargetPresets: [
				{
					id: "dns-one",
					label: "DNS one",
					actionId: "tools.dns" as const,
					target: "one.example",
					hint: "lookup",
				},
				{
					id: "dns-two",
					label: "DNS two",
					actionId: "tools.dns" as const,
					target: "two.example",
					hint: "lookup",
				},
			],
		};
		expect(
			createConfigWorkspaceResetWriteIntent(config, {
				auditArchiveRetentionLimit: 10,
				toolTargetPresetLimit: 1,
				language: "en",
				refreshInterval: 3000,
				defaultPingHost: "google.com",
				controlExecutionMode: "disabled",
				allowAdminDryRun: false,
				enableExperimentalControls: false,
				editorSaveMode: "disabled",
				statusResultJumpClassFilter: "all",
			}),
		).toEqual({
			config: {
				...config,
				toolTargetPresetLimit: 1,
				toolTargetPresets: [config.toolTargetPresets[0]],
			},
		});
	});
});
