import { describe, expect, test } from "bun:test";
import {
	popFileForwardHistory,
	popFileHistory,
	pushFileForwardHistory,
	pushFileHistory,
} from "../src/tui/fileHistory";

describe("TUI file history", () => {
	test("pushes unique roots and pops the previous location", () => {
		let history: string[] = [];

		history = pushFileHistory(history, "/");
		history = pushFileHistory(history, "/Users");
		history = pushFileHistory(history, "/Users");

		expect(history).toEqual(["/", "/Users"]);
		expect(popFileHistory(history)).toEqual({
			history: ["/"],
			previousRoot: "/Users",
		});
	});

	test("returns no previous root for an empty stack", () => {
		expect(popFileHistory([])).toEqual({
			history: [],
			previousRoot: undefined,
		});
	});

	test("moves current roots between back and forward stacks", () => {
		let backHistory: string[] = [];
		let forwardHistory: string[] = [];

		backHistory = pushFileHistory(backHistory, "/");
		backHistory = pushFileHistory(backHistory, "/Users");

		const back = popFileHistory(backHistory);
		backHistory = back.history;
		forwardHistory = pushFileForwardHistory(forwardHistory, "/Users/bonjin");

		expect(back.previousRoot).toBe("/Users");
		expect(backHistory).toEqual(["/"]);
		expect(forwardHistory).toEqual(["/Users/bonjin"]);

		const forward = popFileForwardHistory(forwardHistory);
		forwardHistory = forward.history;
		backHistory = pushFileHistory(backHistory, "/Users");

		expect(forward.nextRoot).toBe("/Users/bonjin");
		expect(backHistory).toEqual(["/", "/Users"]);
		expect(forwardHistory).toEqual([]);
	});

	test("clears forward roots when a new manual navigation starts", () => {
		expect(pushFileForwardHistory(["/Users/bonjin"], "/tmp")).toEqual([
			"/Users/bonjin",
			"/tmp",
		]);
		expect(popFileForwardHistory([])).toEqual({
			history: [],
			nextRoot: undefined,
		});
	});
});
