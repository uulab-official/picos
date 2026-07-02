import { describe, expect, test } from "bun:test";
import type { FileEntry } from "../src/core/files";
import {
	formatFileBreadcrumbRows,
	formatSelectedFilePathRows,
	getSelectedFilePathClipboardPreview,
} from "../src/tui/fileSelection";

const entries: FileEntry[] = [
	{
		name: "..",
		path: "/Users/bonjin/Documents/workspace/uulab",
		type: "directory",
		readonly: true,
	},
	{
		name: "README.md",
		path: "/Users/bonjin/Documents/workspace/uulab/picos/README.md",
		type: "file",
		size: 42,
		readonly: false,
	},
];

describe("TUI file selection", () => {
	test("formats selected path rows with copy affordances", () => {
		expect(formatSelectedFilePathRows(entries, 1)).toEqual([
			"SELECTED PATH README.md",
			"type=file size=42 B readonly=no",
			"path=/Users/bonjin/Documents/workspace/uulab/picos/README.md",
			"controls=y copy path · enter open · c/m/x locked ops",
		]);
	});

	test("creates a locked clipboard preview for the selected path", () => {
		expect(getSelectedFilePathClipboardPreview(entries, 1)).toEqual({
			source: "file-path",
			label: "file path README.md",
			copyText: "/Users/bonjin/Documents/workspace/uulab/picos/README.md",
			details: ["type=file", "size=42 B", "readonly=no"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
	});

	test("keeps empty file selections useful", () => {
		expect(formatSelectedFilePathRows([], 0)).toEqual([
			"SELECTED PATH none",
			"controls=j/k select · : path · 1-9 locations",
		]);
		expect(getSelectedFilePathClipboardPreview([], 0)).toBeUndefined();
	});

	test("formats compact root and selected breadcrumbs", () => {
		expect(
			formatFileBreadcrumbRows(
				"/Users/bonjin/Documents/workspace/uulab/picos",
				entries,
				1,
				{ maxSegments: 4 },
			),
		).toEqual([
			"PATH BREADCRUMB selected=README.md depth=7",
			"root=/ > ... > workspace > uulab > picos",
			"selected=/ > ... > uulab > picos > README.md",
			"controls=: path · u parent · y copy selected",
		]);
	});

	test("keeps empty breadcrumbs useful", () => {
		expect(formatFileBreadcrumbRows("/", [], 0)).toEqual([
			"PATH BREADCRUMB selected=none depth=0",
			"root=/",
			"selected=none",
			"controls=: path · u parent · y copy selected",
		]);
	});
});
