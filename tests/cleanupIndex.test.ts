import { describe, expect, test } from "bun:test";
import {
	createCleanupShelfIndex,
	formatCleanupShelfIndexRows,
} from "../src/tui/cleanupIndex";

describe("cleanup shelf index", () => {
	test("summarizes cleanable preset shelves for status rows", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443", "node"],
			customToolTargetPresets: [
				{ actionId: "tools.dns", target: "example.com" },
				{ actionId: "network.connect", target: "api.github.com:443" },
			],
			logProfiles: [{ level: "warn", query: "kernel" }],
			logSearchPresets: ["kernel", "dns"],
			portFilterPresets: ["3000"],
			routeFilterPresets: ["utun", "default"],
			timelineSearchPresets: [],
			toolHistoryFilterPresets: ["fail", "dns"],
		});

		expect(index).toEqual({
			activeShelves: 6,
			totalItems: 12,
			shelves: [
				{
					id: "logs",
					label: "Logs presets",
					count: 3,
					workspace: "Logs",
					shortcut: "D",
					confirmationPhrase: "clear logs",
					detail: "search=2 profiles=1",
				},
				{
					id: "routes",
					label: "Route filters",
					count: 2,
					workspace: "Routes",
					shortcut: "D",
					confirmationPhrase: "clear routes",
					detail: "filters=2",
				},
				{
					id: "connections",
					label: "Connection filters",
					count: 2,
					workspace: "Connections",
					shortcut: "D",
					confirmationPhrase: "clear connections",
					detail: "filters=2",
				},
				{
					id: "ports",
					label: "Port filters",
					count: 1,
					workspace: "Ports",
					shortcut: "D",
					confirmationPhrase: "clear ports",
					detail: "filters=1",
				},
				{
					id: "timeline",
					label: "Timeline searches",
					count: 0,
					workspace: "Timeline",
					shortcut: "D",
					confirmationPhrase: "clear timeline",
					detail: "searches=0",
				},
				{
					id: "tools-history",
					label: "Tools history filters",
					count: 2,
					workspace: "Tools",
					shortcut: "C",
					confirmationPhrase: "clear tools history",
					detail: "filters=2",
				},
				{
					id: "tool-targets",
					label: "Tool targets",
					count: 2,
					workspace: "Tools",
					shortcut: "D",
					confirmationPhrase: "delete <action id>",
					detail: "saved-targets=2",
				},
			],
		});
		expect(formatCleanupShelfIndexRows(index, 8)).toEqual([
			"CLEANUP INDEX active=6 items=12",
			"Logs        D  count=3  clear logs  search=2 profiles=1",
			"Routes      D  count=2  clear routes  filters=2",
			"Connections D  count=2  clear connections  filters=2",
			"Ports       D  count=1  clear ports  filters=1",
			"Timeline    D  count=0  clear timeline  searches=0",
			"Tools       C  count=2  clear tools history  filters=2",
			"Tools       D  count=2  delete <action id>  saved-targets=2",
		]);
	});

	test("keeps an empty cleanup index useful", () => {
		const index = createCleanupShelfIndex({});

		expect(index.activeShelves).toBe(0);
		expect(index.totalItems).toBe(0);
		expect(formatCleanupShelfIndexRows(index, 3)).toEqual([
			"CLEANUP INDEX active=0 items=0",
			"no saved preset shelves to clean",
		]);
	});
});
