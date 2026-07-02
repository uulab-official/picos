import { describe, expect, test } from "bun:test";
import {
	basenamePathLike,
	dirnamePathLike,
	joinPathLike,
	resolvePathLike,
	samePathLike,
} from "../src/utils/pathStyle";

describe("path style helpers", () => {
	test("keeps POSIX-looking paths stable on every host platform", () => {
		expect(joinPathLike("/Users/alice/.config/picos", "audit", "x.log")).toBe(
			"/Users/alice/.config/picos/audit/x.log",
		);
		expect(resolvePathLike("/Users/alice/.config/picos", "audit")).toBe(
			"/Users/alice/.config/picos/audit",
		);
		expect(dirnamePathLike("/Users/alice/.config/picos/audit/x.log")).toBe(
			"/Users/alice/.config/picos/audit",
		);
		expect(basenamePathLike("/Users/alice/.config/picos/audit/x.log")).toBe(
			"x.log",
		);
	});

	test("preserves Windows-looking paths when the input uses backslashes", () => {
		expect(joinPathLike("C:\\Users\\Alice", "AppData", "picos")).toBe(
			"C:\\Users\\Alice\\AppData\\picos",
		);
		expect(resolvePathLike("C:\\Users\\Alice", "AppData")).toBe(
			"C:\\Users\\Alice\\AppData",
		);
		expect(
			dirnamePathLike("C:\\Users\\Alice\\AppData\\picos\\config.json"),
		).toBe("C:\\Users\\Alice\\AppData\\picos");
		expect(
			basenamePathLike("C:\\Users\\Alice\\AppData\\picos\\config.json"),
		).toBe("config.json");
	});

	test("keeps forward-slash drive paths forward slash for stable config output", () => {
		expect(joinPathLike("C:/Users/Alice/AppData/Roaming", "picos")).toBe(
			"C:/Users/Alice/AppData/Roaming/picos",
		);
	});

	test("compares root-relative POSIX and backslash paths as the same logical path", () => {
		expect(resolvePathLike("\\Users\\alice\\.config\\picos")).toBe(
			"\\Users\\alice\\.config\\picos",
		);
		expect(
			samePathLike(
				"\\Users\\alice\\.config\\picos\\audit",
				"/Users/alice/.config/picos/audit",
			),
		).toBe(true);
		expect(
			samePathLike(
				"C:\\Users\\alice\\.config\\picos\\audit",
				"/Users/alice/.config/picos/audit",
			),
		).toBe(false);
	});
});
