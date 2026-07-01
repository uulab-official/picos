import { describe, expect, test } from "bun:test";
import {
	appendEditorBufferLine,
	createEditorBuffer,
	deleteEditorBufferLine,
	formatEditorBufferLines,
	getEditorBufferState,
	insertEditorBufferLine,
	moveEditorBufferLineSelection,
	replaceEditorBufferLine,
	undoEditorBufferEdit,
} from "../src/tui/editorBuffer";

describe("editor buffer", () => {
	test("appends a typed line and marks the buffer dirty", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "# picos\n",
			truncated: false,
		});

		const next = appendEditorBufferLine(buffer, "A tiny terminal OS");

		expect(next.content).toBe("# picos\nA tiny terminal OS\n");
		expect(next.originalContent).toBe("# picos\n");
		expect(getEditorBufferState(next)).toEqual({
			dirty: true,
			lineCount: 2,
			originalLineCount: 1,
			truncated: false,
		});
		expect(formatEditorBufferLines(next, 4)).toEqual([
			{ number: 1, content: "# picos" },
			{ number: 2, content: "A tiny terminal OS" },
		]);
	});

	test("keeps blank appended lines visible for diff review", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/notes.txt",
			content: "one",
			truncated: true,
		});

		const next = appendEditorBufferLine(buffer, "");

		expect(next.content).toBe("one\n\n");
		expect(getEditorBufferState(next)).toEqual({
			dirty: true,
			lineCount: 2,
			originalLineCount: 1,
			truncated: true,
		});
		expect(formatEditorBufferLines(next, 3)).toEqual([
			{ number: 1, content: "one" },
			{ number: 2, content: "" },
		]);
	});

	test("moves line selection with wraparound inside the buffer", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "one\ntwo\nthree\n",
			truncated: false,
		});

		expect(moveEditorBufferLineSelection(buffer, 0, "previous")).toBe(2);
		expect(moveEditorBufferLineSelection(buffer, 0, "next")).toBe(1);
		expect(moveEditorBufferLineSelection(buffer, 7, "next")).toBe(0);
	});

	test("replaces and deletes selected lines in the dirty buffer", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "one\ntwo\nthree\n",
			truncated: false,
		});

		const replaced = replaceEditorBufferLine(buffer, 1, "TWO");
		expect(replaced.content).toBe("one\nTWO\nthree\n");
		expect(getEditorBufferState(replaced).dirty).toBe(true);

		const deleted = deleteEditorBufferLine(replaced, 0);
		expect(deleted.content).toBe("TWO\nthree\n");
		expect(formatEditorBufferLines(deleted, 4)).toEqual([
			{ number: 1, content: "TWO" },
			{ number: 2, content: "three" },
		]);
	});

	test("inserts lines before and after the selected line", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "one\nthree\n",
			truncated: false,
		});

		const before = insertEditorBufferLine(buffer, 1, "two", "before");
		expect(before.content).toBe("one\ntwo\nthree\n");

		const after = insertEditorBufferLine(before, 1, "two-and-half", "after");
		expect(after.content).toBe("one\ntwo\ntwo-and-half\nthree\n");
		expect(formatEditorBufferLines(after, 5)).toEqual([
			{ number: 1, content: "one" },
			{ number: 2, content: "two" },
			{ number: 3, content: "two-and-half" },
			{ number: 4, content: "three" },
		]);
	});

	test("undoes the latest editor buffer edit without losing the original file", () => {
		const buffer = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "one\ntwo\n",
			truncated: false,
		});

		const inserted = insertEditorBufferLine(buffer, 1, "middle", "before");
		const replaced = replaceEditorBufferLine(inserted, 1, "TWO");
		const undone = undoEditorBufferEdit(replaced);

		expect(undone.content).toBe("one\nmiddle\ntwo\n");
		expect(undone.originalContent).toBe("one\ntwo\n");
		expect(getEditorBufferState(undone)).toEqual({
			dirty: true,
			lineCount: 3,
			originalLineCount: 2,
			truncated: false,
		});

		const clean = undoEditorBufferEdit(undoEditorBufferEdit(undone));
		expect(clean.content).toBe("one\ntwo\n");
		expect(getEditorBufferState(clean).dirty).toBe(false);
	});
});
