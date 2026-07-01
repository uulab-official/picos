import { describe, expect, test } from "bun:test";
import {
	appendEditorBufferLine,
	createEditorBuffer,
	formatEditorBufferLines,
	getEditorBufferState,
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
});
