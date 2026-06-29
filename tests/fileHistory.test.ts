import { describe, expect, test } from "bun:test";
import { popFileHistory, pushFileHistory } from "../src/tui/fileHistory";

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
});
