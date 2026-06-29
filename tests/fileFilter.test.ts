import { describe, expect, test } from "bun:test";
import type { FileEntry } from "../src/core/files";
import {
	appendFileFilterQuery,
	backspaceFileFilterQuery,
	clearFileFilter,
	filterFileEntries,
	openFileFilter,
} from "../src/tui/fileFilter";

const entries: FileEntry[] = [
	{
		name: "..",
		path: "/workspace",
		type: "directory",
		readonly: true,
	},
	{
		name: "src",
		path: "/workspace/picos/src",
		type: "directory",
		readonly: false,
	},
	{
		name: "README.md",
		path: "/workspace/picos/README.md",
		type: "file",
		readonly: false,
	},
	{
		name: "package.json",
		path: "/workspace/picos/package.json",
		type: "file",
		readonly: false,
	},
	{
		name: "문서.md",
		path: "/workspace/picos/문서.md",
		type: "file",
		readonly: false,
	},
];

describe("TUI file filter", () => {
	test("opens, edits, and clears query state", () => {
		let state = openFileFilter();
		state = appendFileFilterQuery(state, "read");
		state = appendFileFilterQuery(state, "\u0003");
		state = backspaceFileFilterQuery(state);

		expect(state).toEqual({ active: true, query: "rea" });
		expect(clearFileFilter(state)).toEqual({ active: false, query: "" });
	});

	test("filters entries by name path or type while keeping parent entry", () => {
		const state = appendFileFilterQuery(openFileFilter(), "read");

		expect(
			filterFileEntries(entries, state).map((entry) => entry.name),
		).toEqual(["..", "README.md"]);
		expect(
			filterFileEntries(entries, { query: "directory" }).map(
				(entry) => entry.name,
			),
		).toEqual(["..", "src"]);
		expect(
			filterFileEntries(entries, { query: "문서" }).map((entry) => entry.name),
		).toEqual(["..", "문서.md"]);
	});
});
