import { describe, expect, test } from "bun:test";
import type { FileEntry } from "../src/core/files";
import {
	clearFileOperationDialog,
	createFileOperationPreview,
	openFileOperationDialog,
} from "../src/tui/fileOperationDialog";

const fileEntry: FileEntry = {
	name: "README.md",
	path: "/workspace/picos/README.md",
	type: "file",
	size: 1200,
	readonly: false,
};

const parentEntry: FileEntry = {
	name: "..",
	path: "/workspace",
	type: "directory",
	readonly: true,
};

describe("TUI file operation dialog", () => {
	test("builds locked previews for write and destructive file operations", () => {
		expect(createFileOperationPreview("copy", fileEntry)).toEqual({
			kind: "copy",
			title: "Copy file",
			path: "/workspace/picos/README.md",
			targetHint: "choose destination path",
			risk: "write",
			privilege: "user",
			confirmationPhrase: "copy file",
			executable: false,
			reason: "locked until destination preview and confirmation are wired",
		});

		expect(createFileOperationPreview("move", fileEntry)).toMatchObject({
			kind: "move",
			title: "Move file",
			risk: "write",
			confirmationPhrase: "move file",
			executable: false,
		});

		expect(createFileOperationPreview("delete", fileEntry)).toMatchObject({
			kind: "delete",
			title: "Delete file",
			risk: "destructive",
			targetHint: "selected path will be removed",
			confirmationPhrase: "delete file",
			executable: false,
		});
	});

	test("opens and clears a dialog but refuses parent navigation entries", () => {
		const opened = openFileOperationDialog("delete", fileEntry);

		expect(opened.active).toBe(true);
		if (!opened.active) {
			throw new Error("expected delete operation dialog to open");
		}
		expect(opened.preview?.path).toBe(fileEntry.path);
		expect(clearFileOperationDialog(opened)).toEqual({ active: false });
		expect(openFileOperationDialog("copy", parentEntry)).toEqual({
			active: false,
			error: "Select a real file or directory before opening an operation.",
		});
	});
});
