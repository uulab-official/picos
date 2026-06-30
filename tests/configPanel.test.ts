import { describe, expect, test } from "bun:test";
import {
	adjustConfigWorkspaceItem,
	applyConfigPolicyPreset,
	createConfigWorkspaceItems,
	createConfigWorkspaceResetPreview,
	formatConfigWorkspaceRows,
	getConfigWorkspaceEditPrompt,
	getConfigWorkspaceSectionJumpIndex,
	getNextConfigPolicyPreset,
	moveConfigWorkspaceSelection,
	submitConfigWorkspaceResetConfirmation,
} from "../src/tui/configPanel";

describe("config TUI panel", () => {
	test("formats retention controls with a visible selection cursor", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
		});

		expect(formatConfigWorkspaceRows(items, 1, 10)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/show  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"> toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"[4] CONNECTIVITY",
		]);
	});

	test("groups config controls into OS-like sections", () => {
		const items = createConfigWorkspaceItems({
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
		});

		expect(items.map((item) => `${item.section}:${item.key}`)).toEqual([
			"retention:auditArchiveRetentionLimit",
			"retention:toolTargetPresetLimit",
			"display:language",
			"display:refreshInterval",
			"connectivity:defaultPingHost",
			"safety:controlExecutionMode",
			"safety:allowAdminDryRun",
		]);
		expect(getConfigWorkspaceSectionJumpIndex(items, "display")).toBe(2);
		expect(getConfigWorkspaceSectionJumpIndex(items, "safety")).toBe(5);
		expect(getConfigWorkspaceSectionJumpIndex(items, "retention")).toBe(0);
		expect(getConfigWorkspaceSectionJumpIndex(items, "connectivity")).toBe(4);
		expect(
			getConfigWorkspaceSectionJumpIndex(items, "missing"),
		).toBeUndefined();
		expect(formatConfigWorkspaceRows(items, 6, 18)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/show  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"  toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"[4] CONNECTIVITY",
			"  defaultPingHost             google.com default host for picos ping",
			"[2] SAFETY",
			"  controlExecutionMode        disabled OS mutation execution mode",
			"> allowAdminDryRun            false    allow admin-class dry-run previews",
			"selected=allowAdminDryRun values=true|false section=safety",
		]);
	});

	test("moves selection and clamps adjusted retention values", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 60,
			toolTargetPresetLimit: 1,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
		});

		expect(moveConfigWorkspaceSelection(0, items.length, "next")).toBe(1);
		expect(moveConfigWorkspaceSelection(0, items.length, "previous")).toBe(6);
		expect(adjustConfigWorkspaceItem(items[0], "increase")).toBe(60);
		expect(adjustConfigWorkspaceItem(items[0], "decrease")).toBe(59);
		expect(adjustConfigWorkspaceItem(items[1], "decrease")).toBe(1);
		expect(adjustConfigWorkspaceItem(items[1], "increase")).toBe(2);
		expect(adjustConfigWorkspaceItem(items[2], "increase")).toBe("ko");
		expect(adjustConfigWorkspaceItem(items[2], "decrease")).toBe("zh");
		expect(adjustConfigWorkspaceItem(items[3], "increase")).toBe(4000);
		expect(adjustConfigWorkspaceItem(items[3], "decrease")).toBe(2000);
		expect(adjustConfigWorkspaceItem(items[5], "increase")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[5], "decrease")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[6], "increase")).toBe(true);
		expect(adjustConfigWorkspaceItem(items[6], "decrease")).toBe(true);
	});

	test("marks text config rows as editable with enter", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
		});

		expect(getConfigWorkspaceEditPrompt(items[4])).toBe(
			"config-defaultPingHost",
		);
		expect(getConfigWorkspaceEditPrompt(items[0])).toBeUndefined();
	});

	test("cycles policy presets for safe OS control modes", () => {
		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "disabled",
				allowAdminDryRun: false,
				enableExperimentalControls: false,
			}),
		).toBe("user-dry-run");

		const userDryRun = applyConfigPolicyPreset("user-dry-run");
		expect(userDryRun).toEqual({
			id: "user-dry-run",
			label: "User dry-run",
			values: {
				controlExecutionMode: "dry-run",
				allowAdminDryRun: false,
				enableExperimentalControls: true,
			},
			rows: [
				"CONFIG POLICY PRESET",
				"preset=User dry-run",
				"controlExecutionMode=dry-run",
				"allowAdminDryRun=false",
				"enableExperimentalControls=true",
			],
		});

		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: false,
				enableExperimentalControls: true,
			}),
		).toBe("admin-dry-run");
		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: true,
				enableExperimentalControls: true,
			}),
		).toBe("safe-readonly");
		expect(applyConfigPolicyPreset("safe-readonly").values).toEqual({
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
		});
	});

	test("requires exact confirmation before resetting core config values", () => {
		const preview = createConfigWorkspaceResetPreview({
			auditArchiveRetentionLimit: 7,
			toolTargetPresetLimit: 4,
			language: "ko",
			refreshInterval: 10000,
			defaultPingHost: "example.com",
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			enableExperimentalControls: true,
		});

		expect(preview.confirmationPhrase).toBe("reset config");
		expect(preview.values).toEqual({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
		});
		expect(preview.rows).toEqual([
			"CONFIG RESET",
			"scope=core controls changed=8",
			"confirm reset config locked",
			"auditArchiveRetentionLimit 7 -> 10",
			"toolTargetPresetLimit 4 -> 8",
			"language ko -> en",
			"refreshInterval 10000 -> 3000",
			"defaultPingHost example.com -> google.com",
			"controlExecutionMode dry-run -> disabled",
			"allowAdminDryRun true -> false",
			"enableExperimentalControls true -> false",
		]);
		expect(submitConfigWorkspaceResetConfirmation(preview, "reset")).toEqual({
			confirmed: false,
			message: "config reset rejected core controls",
			preview,
		});
		expect(
			submitConfigWorkspaceResetConfirmation(preview, " reset config "),
		).toEqual({
			confirmed: true,
			message: "config reset confirmed core controls (8 values)",
			preview,
		});
	});
});
