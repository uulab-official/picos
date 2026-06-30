import { describe, expect, test } from "bun:test";
import {
	createCleanupHandoffActionPlan,
	createCleanupHandoffDismissPlan,
	createCleanupHandoffHistory,
	createCleanupJumpAudit,
	createCleanupShelfIndex,
	formatCleanupHandoffActionRows,
	formatCleanupHandoffDismissRows,
	formatCleanupHandoffHistoryRows,
	formatCleanupJumpAuditRows,
	formatCleanupShelfDetailRows,
	formatCleanupShelfIndexRows,
	getSelectedCleanupShelf,
	moveCleanupShelfSelection,
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
					screen: "logs",
					workspace: "Logs",
					shortcut: "D",
					confirmationPhrase: "clear logs",
					detail: "search=2 profiles=1",
				},
				{
					id: "routes",
					label: "Route filters",
					count: 2,
					screen: "routes",
					workspace: "Routes",
					shortcut: "D",
					confirmationPhrase: "clear routes",
					detail: "filters=2",
				},
				{
					id: "connections",
					label: "Connection filters",
					count: 2,
					screen: "connections",
					workspace: "Connections",
					shortcut: "D",
					confirmationPhrase: "clear connections",
					detail: "filters=2",
				},
				{
					id: "ports",
					label: "Port filters",
					count: 1,
					screen: "ports",
					workspace: "Ports",
					shortcut: "D",
					confirmationPhrase: "clear ports",
					detail: "filters=1",
				},
				{
					id: "timeline",
					label: "Timeline searches",
					count: 0,
					screen: "timeline",
					workspace: "Timeline",
					shortcut: "D",
					confirmationPhrase: "clear timeline",
					detail: "searches=0",
				},
				{
					id: "tools-history",
					label: "Tools history filters",
					count: 2,
					screen: "tools",
					workspace: "Tools",
					shortcut: "C",
					confirmationPhrase: "clear tools history",
					detail: "filters=2",
				},
				{
					id: "tool-targets",
					label: "Tool targets",
					count: 2,
					screen: "tools",
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
		expect(getSelectedCleanupShelf(index, 0)).toBeUndefined();
		expect(moveCleanupShelfSelection(index, 0, "next")).toBe(0);
		expect(formatCleanupShelfIndexRows(index, 3)).toEqual([
			"CLEANUP INDEX active=0 items=0",
			"no saved preset shelves to clean",
		]);
	});

	test("selects active cleanup shelves for status handoff", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
			customToolTargetPresets: [
				{ actionId: "tools.dns", target: "example.com" },
			],
			logSearchPresets: ["kernel"],
			portFilterPresets: ["3000"],
			routeFilterPresets: ["default"],
			timelineSearchPresets: [],
			toolHistoryFilterPresets: ["dns"],
		});

		expect(getSelectedCleanupShelf(index, 0)?.screen).toBe("logs");
		expect(getSelectedCleanupShelf(index, 4)?.id).toBe("tools-history");
		expect(getSelectedCleanupShelf(index, 99)?.id).toBe("tool-targets");
		expect(moveCleanupShelfSelection(index, 4, "next")).toBe(5);
		expect(moveCleanupShelfSelection(index, 5, "next")).toBe(0);
		expect(moveCleanupShelfSelection(index, 0, "previous")).toBe(5);
		expect(formatCleanupShelfIndexRows(index, 8, 4)).toEqual([
			"CLEANUP INDEX active=6 items=6 selected=Tools",
			"  Logs        D  count=1  clear logs  search=1 profiles=0",
			"  Routes      D  count=1  clear routes  filters=1",
			"  Connections D  count=1  clear connections  filters=1",
			"  Ports       D  count=1  clear ports  filters=1",
			"  Timeline    D  count=0  clear timeline  searches=0",
			"> Tools       C  count=1  clear tools history  filters=1",
			"  Tools       D  count=1  delete <action id>  saved-targets=1",
		]);
		expect(formatCleanupShelfDetailRows(index, 4)).toEqual([
			"CLEANUP DETAIL Tools history filters",
			"target=Tools screen=tools shortcut=C",
			"items=1 detail=filters=1",
			"confirm=clear tools history",
			"enter jumps to Tools; press C then type exact phrase",
		]);
	});

	test("keeps cleanup detail pane useful with no active shelf", () => {
		const index = createCleanupShelfIndex({
			timelineSearchPresets: [""],
		});

		expect(formatCleanupShelfDetailRows(index, 0)).toEqual([
			"CLEANUP DETAIL none",
			"no active cleanup shelf selected",
			"save presets first, then return to Status",
		]);
	});

	test("creates cleanup jump audit rows for destination workspaces", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443", "node"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		expect(shelf?.id).toBe("connections");
		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);

		expect(audit).toEqual({
			id: "connections",
			label: "Connection filters",
			screen: "connections",
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			count: 2,
			detail: "filters=2",
		});
		expect(formatCleanupJumpAuditRows(audit)).toEqual([
			"CLEANUP HANDOFF Connection filters",
			"from=Status target=Connections shortcut=D count=2",
			"confirm=clear connections detail=filters=2",
		]);
		expect(formatCleanupJumpAuditRows(undefined)).toEqual([]);
	});

	test("creates actionable cleanup prompt plans only on destination screens", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const plan = createCleanupHandoffActionPlan(audit, "connections");

		expect(plan).toEqual({
			id: "connections",
			label: "Connection filters",
			screen: "connections",
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
		});
		expect(createCleanupHandoffActionPlan(audit, "ports")).toBeUndefined();
		expect(
			createCleanupHandoffActionPlan(undefined, "connections"),
		).toBeUndefined();
		expect(formatCleanupHandoffActionRows(plan)).toEqual([
			"CLEANUP ACTION open prompt",
			"enter opens Connections cleanup shortcut=D",
			"confirm=clear connections",
		]);
		expect(formatCleanupHandoffActionRows(undefined)).toEqual([]);
	});

	test("creates dismiss plans so handoffs can restore normal workspace controls", () => {
		const index = createCleanupShelfIndex({
			portFilterPresets: ["3000"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const plan = createCleanupHandoffDismissPlan(audit, "ports");

		expect(plan).toEqual({
			label: "Port filters",
			screen: "ports",
			workspace: "Ports",
		});
		expect(
			createCleanupHandoffDismissPlan(audit, "connections"),
		).toBeUndefined();
		expect(createCleanupHandoffDismissPlan(undefined, "ports")).toBeUndefined();
		expect(formatCleanupHandoffDismissRows(plan)).toEqual([
			"CLEANUP DISMISS esc clears handoff",
			"normal Ports enter behavior resumes",
		]);
		expect(formatCleanupHandoffDismissRows(undefined)).toEqual([]);
	});

	test("formats the latest cleanup handoff history for Status auditing", () => {
		const index = createCleanupShelfIndex({
			routeFilterPresets: ["default"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const dismissed = createCleanupHandoffHistory(audit, "dismissed");
		const promptOpened = createCleanupHandoffHistory(audit, "prompt-opened");

		expect(dismissed).toEqual({
			label: "Route filters",
			workspace: "Routes",
			screen: "routes",
			shortcut: "D",
			confirmationPhrase: "clear routes",
			detail: "filters=1",
			outcome: "dismissed",
		});
		expect(formatCleanupHandoffHistoryRows(dismissed)).toEqual([
			"CLEANUP HISTORY dismissed Route filters",
			"target=Routes shortcut=D confirm=clear routes",
			"detail=filters=1 normal controls restored",
		]);
		expect(formatCleanupHandoffHistoryRows(promptOpened)).toEqual([
			"CLEANUP HISTORY prompt-opened Route filters",
			"target=Routes shortcut=D confirm=clear routes",
			"detail=filters=1 exact-confirm prompt opened",
		]);
		expect(formatCleanupHandoffHistoryRows(undefined)).toEqual([]);
	});
});
