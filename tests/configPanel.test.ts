import { describe, expect, test } from "bun:test";
import {
	adjustConfigWorkspaceItem,
	createConfigWorkspaceItems,
	formatConfigWorkspaceRows,
	getConfigWorkspaceEditPrompt,
	moveConfigWorkspaceSelection,
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
			"j/k select  +/- adjust+save  enter edit/show  values persist to picos config",
			"  auditArchiveRetentionLimit  10   archived Timeline audit logs kept before prune",
			"> toolTargetPresetLimit       8    saved Tools target presets kept",
			"  language                    en   interface language",
			"  refreshInterval             3000 refresh cadence in ms",
			"  defaultPingHost             google.com default host for picos ping",
			"  controlExecutionMode        disabled OS mutation execution mode",
			"  allowAdminDryRun            false allow admin-class dry-run previews",
			"selected=toolTargetPresetLimit range=1..24",
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
});
