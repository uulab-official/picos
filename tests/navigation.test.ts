import { describe, expect, test } from "bun:test";
import {
	clampIndex,
	enterFocus,
	getLocationShortcutIndex,
	getNextIndex,
	getScreenByShortcut,
	getScreenIndex,
	getVisibleWindow,
	leaveFocus,
	moveScreen,
	screenOrder,
} from "../src/tui/navigation";

describe("TUI navigation", () => {
	test("maps number shortcuts to panels", () => {
		expect(getScreenByShortcut("1")).toBe("dashboard");
		expect(getScreenByShortcut("2")).toBe("files");
		expect(getScreenByShortcut("3")).toBe("remotes");
		expect(getScreenByShortcut("4")).toBe("editor");
		expect(getScreenByShortcut("5")).toBe("system");
		expect(getScreenByShortcut("6")).toBe("hardware");
		expect(getScreenByShortcut("7")).toBe("storage");
		expect(getScreenByShortcut("8")).toBe("processes");
		expect(getScreenByShortcut("9")).toBe("interfaces");
		expect(getScreenByShortcut("x")).toBeUndefined();
	});

	test("moves across panels with wraparound", () => {
		expect(screenOrder).toEqual([
			"dashboard",
			"files",
			"remotes",
			"editor",
			"system",
			"hardware",
			"storage",
			"processes",
			"interfaces",
			"network",
			"routes",
			"connections",
			"ports",
			"tools",
			"networkTools",
			"timeline",
			"dns",
			"actions",
			"status",
			"config",
			"logs",
			"operations",
		]);
		expect(moveScreen("dashboard", "next")).toBe("files");
		expect(moveScreen("operations", "next")).toBe("dashboard");
		expect(moveScreen("dashboard", "previous")).toBe("operations");
		expect(moveScreen("logs", "next")).toBe("operations");
	});

	test("returns stable screen indexes for labels", () => {
		expect(getScreenIndex("dashboard")).toBe(0);
		expect(getScreenIndex("remotes")).toBe(2);
		expect(getScreenIndex("status")).toBe(18);
		expect(getScreenIndex("config")).toBe(19);
		// Appended last on purpose, which is what keeps the indexes above stable.
		expect(getScreenIndex("operations")).toBe(21);
	});

	test("enters and leaves child focus for workspace panels", () => {
		expect(enterFocus("actions", "workspaces")).toBe("actions");
		expect(enterFocus("files", "workspaces")).toBe("files");
		expect(enterFocus("remotes", "workspaces")).toBe("remotes");
		expect(enterFocus("dashboard", "workspaces")).toBe("workspaces");
		expect(enterFocus("actions", "actions")).toBe("actions");
		expect(leaveFocus("actions")).toBe("workspaces");
		expect(leaveFocus("files")).toBe("workspaces");
		expect(leaveFocus("remotes")).toBe("workspaces");
		expect(leaveFocus("workspaces")).toBe("workspaces");
	});

	test("keeps the selected child item visible in small action panes", () => {
		expect(getVisibleWindow(15, 0, 5)).toEqual({ start: 0, end: 5 });
		expect(getVisibleWindow(15, 7, 5)).toEqual({ start: 5, end: 10 });
		expect(getVisibleWindow(15, 14, 5)).toEqual({ start: 10, end: 15 });
		expect(getVisibleWindow(3, 2, 10)).toEqual({ start: 0, end: 3 });
	});

	test("cycles indexes for child lists and location jumps", () => {
		expect(getNextIndex(0, 4, "next")).toBe(1);
		expect(getNextIndex(3, 4, "next")).toBe(0);
		expect(getNextIndex(0, 4, "previous")).toBe(3);
		expect(getNextIndex(2, 4, "previous")).toBe(1);
		expect(getNextIndex(99, 4, "next")).toBe(0);
		expect(getNextIndex(0, 0, "next")).toBe(0);
	});

	test("maps number shortcuts to file locations inside Files focus", () => {
		expect(getLocationShortcutIndex("1", 4)).toBe(0);
		expect(getLocationShortcutIndex("4", 4)).toBe(3);
		expect(getLocationShortcutIndex("5", 4)).toBeUndefined();
		expect(getLocationShortcutIndex("0", 4)).toBeUndefined();
		expect(getLocationShortcutIndex("x", 4)).toBeUndefined();
		expect(getLocationShortcutIndex("1", 0)).toBeUndefined();
	});
});

describe("index clamping", () => {
	test("keeps an index inside the list and survives an empty one", () => {
		expect(clampIndex(0, 3)).toBe(0);
		expect(clampIndex(2, 3)).toBe(2);
		expect(clampIndex(9, 3)).toBe(2);
		// The lower bound two of the replaced spellings omitted. A negative index
		// used to survive, which would have indexed past the start of the list.
		expect(clampIndex(-1, 3)).toBe(0);
		expect(clampIndex(-99, 3)).toBe(0);
		// Zero for an empty list, so a caller can index straight into it and get
		// undefined rather than having to guard the length separately.
		expect(clampIndex(0, 0)).toBe(0);
		expect(clampIndex(5, 0)).toBe(0);
		expect(clampIndex(-5, 0)).toBe(0);
	});
});
