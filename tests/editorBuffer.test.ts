import { describe, expect, test } from "bun:test";
import {
	appendEditorBufferLine,
	createEditorBuffer,
	deleteEditorBufferLine,
	formatEditorBufferLines,
	getEditorBufferState,
	moveEditorBufferLineSelection,
	replaceEditorBufferLine,
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
});
