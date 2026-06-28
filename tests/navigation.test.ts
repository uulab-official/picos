import { describe, expect, test } from "bun:test";
import {
	enterFocus,
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
		expect(getScreenByShortcut("2")).toBe("system");
		expect(getScreenByShortcut("3")).toBe("hardware");
		expect(getScreenByShortcut("4")).toBe("storage");
		expect(getScreenByShortcut("5")).toBe("processes");
		expect(getScreenByShortcut("6")).toBe("interfaces");
		expect(getScreenByShortcut("7")).toBe("network");
		expect(getScreenByShortcut("8")).toBe("routes");
		expect(getScreenByShortcut("9")).toBe("connections");
		expect(getScreenByShortcut("x")).toBeUndefined();
	});

	test("moves across panels with wraparound", () => {
		expect(screenOrder).toEqual([
			"dashboard",
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
			"logs",
		]);
		expect(moveScreen("dashboard", "next")).toBe("system");
		expect(moveScreen("logs", "next")).toBe("dashboard");
		expect(moveScreen("dashboard", "previous")).toBe("logs");
	});

	test("returns stable screen indexes for labels", () => {
		expect(getScreenIndex("dashboard")).toBe(0);
		expect(getScreenIndex("status")).toBe(15);
	});

	test("enters and leaves child focus for Actions", () => {
		expect(enterFocus("actions", "workspaces")).toBe("actions");
		expect(enterFocus("dashboard", "workspaces")).toBe("workspaces");
		expect(enterFocus("actions", "actions")).toBe("actions");
		expect(leaveFocus("actions")).toBe("workspaces");
		expect(leaveFocus("workspaces")).toBe("workspaces");
	});

	test("keeps the selected child item visible in small action panes", () => {
		expect(getVisibleWindow(15, 0, 5)).toEqual({ start: 0, end: 5 });
		expect(getVisibleWindow(15, 7, 5)).toEqual({ start: 5, end: 10 });
		expect(getVisibleWindow(15, 14, 5)).toEqual({ start: 10, end: 15 });
		expect(getVisibleWindow(3, 2, 10)).toEqual({ start: 0, end: 3 });
	});
});
