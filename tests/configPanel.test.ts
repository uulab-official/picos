import { describe, expect, test } from "bun:test";
import {
	adjustConfigWorkspaceItem,
	createConfigWorkspaceItems,
	formatConfigWorkspaceRows,
	moveConfigWorkspaceSelection,
} from "../src/tui/configPanel";

describe("config TUI panel", () => {
	test("formats retention controls with a visible selection cursor", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
		});

		expect(formatConfigWorkspaceRows(items, 1, 8)).toEqual([
			"CONFIG WORKSPACE",
			"j/k select  +/- adjust+save  enter show  values persist to picos config",
			"  auditArchiveRetentionLimit  10   archived Timeline audit logs kept before prune",
			"> toolTargetPresetLimit       8    saved Tools target presets kept",
			"selected=toolTargetPresetLimit range=1..24",
		]);
	});

	test("moves selection and clamps adjusted retention values", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 60,
			toolTargetPresetLimit: 1,
		});

		expect(moveConfigWorkspaceSelection(0, items.length, "next")).toBe(1);
		expect(moveConfigWorkspaceSelection(0, items.length, "previous")).toBe(1);
		expect(adjustConfigWorkspaceItem(items[0], "increase")).toBe(60);
		expect(adjustConfigWorkspaceItem(items[0], "decrease")).toBe(59);
		expect(adjustConfigWorkspaceItem(items[1], "decrease")).toBe(1);
		expect(adjustConfigWorkspaceItem(items[1], "increase")).toBe(2);
	});
});
