import { describe, expect, test } from "bun:test";
import {
	appendEditorBufferLine,
	classifyEditorSaveBufferPublication,
	createEditorBuffer,
	deleteEditorBufferLine,
	formatEditorBufferLines,
	getEditorBufferState,
	insertEditorBufferLine,
	moveEditorBufferLineSelection,
	replaceEditorBufferLine,
	transitionEditorAppendLine,
	transitionEditorDeleteLine,
	transitionEditorInsertLine,
	transitionEditorMoveCursor,
	transitionEditorReplaceLine,
	transitionEditorUndo,
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

	describe("editor mutation transitions", () => {
		test("suppresses an older save result after the editor revision changes", () => {
			const submitted = {
				...createEditorBuffer({
					path: "/workspace/picos/README.md",
					content: "before\n",
					truncated: false,
				}),
				content: "submitted\n",
			};

			expect(
				classifyEditorSaveBufferPublication({
					currentRequestToken: 4,
					requestToken: 4,
					currentRevision: 8,
					submittedRevision: 7,
					current: { ...submitted, content: "newer edit\n" },
					submitted,
					success: true,
				}),
			).toMatchObject({
				status: "stale",
				publishResult: false,
				markedClean: false,
			});
		});

		test("keeps newer edits dirty when an older save completes", () => {
			const submitted = {
				...createEditorBuffer({
					path: "/workspace/picos/README.md",
					content: "before\n",
					truncated: false,
				}),
				content: "submitted\n",
			};
			const current = { ...submitted, content: "newer edit\n" };

			expect(
				classifyEditorSaveBufferPublication({
					currentRequestToken: 4,
					requestToken: 4,
					currentRevision: 4,
					submittedRevision: 4,
					current,
					submitted,
					success: true,
				}),
			).toEqual({
				status: "stale",
				buffer: current,
				markedClean: false,
				publishResult: false,
			});
			expect(
				classifyEditorSaveBufferPublication({
					currentRequestToken: 5,
					requestToken: 4,
					currentRevision: 4,
					submittedRevision: 4,
					current: submitted,
					submitted,
					success: true,
				}),
			).toEqual({
				status: "stale",
				buffer: submitted,
				markedClean: false,
				publishResult: false,
			});
		});

		test("marks only the submitted editor revision clean", () => {
			const submitted = {
				...createEditorBuffer({
					path: "/workspace/picos/README.md",
					content: "before\n",
					truncated: false,
				}),
				content: "submitted\n",
				editHistory: ["before\n"],
			};

			expect(
				classifyEditorSaveBufferPublication({
					currentRequestToken: 4,
					requestToken: 4,
					currentRevision: 4,
					submittedRevision: 4,
					current: submitted,
					submitted,
					success: true,
				}),
			).toEqual({
				status: "current",
				buffer: {
					...submitted,
					originalContent: "submitted\n",
					editHistory: [],
				},
				markedClean: true,
				publishResult: true,
			});
		});

		test("reports a missing buffer without applying an append", () => {
			const transition = transitionEditorAppendLine({
				buffer: undefined,
				selectedLineIndex: 4,
				line: "new line",
			});

			expect(transition).toEqual({
				buffer: undefined,
				selectedLineIndex: 0,
				applies: false,
				clearSaveResult: false,
				notice: { level: "warn", message: "open a text file before editing" },
			});
		});

		test("appends an empty line and moves the cursor to it", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/notes.txt",
				content: "one\n",
				truncated: false,
			});

			const transition = transitionEditorAppendLine({
				buffer,
				selectedLineIndex: 0,
				line: "",
			});

			expect(transition).toEqual({
				buffer: {
					...buffer,
					content: "one\n\n",
					editHistory: ["one\n"],
				},
				selectedLineIndex: 1,
				applies: true,
				clearSaveResult: true,
				notice: { level: "ok", message: "editor appended line 2 dirty=true" },
			});
		});

		test("inserts before a cursor before the first line", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\ntwo\n",
				truncated: false,
			});

			const transition = transitionEditorInsertLine({
				buffer,
				selectedLineIndex: -4,
				line: "zero",
				position: "before",
			});

			expect(transition.selectedLineIndex).toBe(0);
			expect(transition.buffer?.content).toBe("zero\none\ntwo\n");
			expect(transition.notice).toEqual({
				level: "ok",
				message: "editor inserted before line 1 dirty=true",
			});
		});

		test("inserts after a cursor past the final line", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\ntwo\n",
				truncated: false,
			});

			const transition = transitionEditorInsertLine({
				buffer,
				selectedLineIndex: 9,
				line: "three",
				position: "after",
			});

			expect(transition.selectedLineIndex).toBe(2);
			expect(transition.buffer?.content).toBe("one\ntwo\nthree\n");
			expect(transition.notice).toEqual({
				level: "ok",
				message: "editor inserted after line 2 dirty=true",
			});
		});

		test("repairs a cursor past the final line when replacing", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\ntwo\n",
				truncated: false,
			});

			const transition = transitionEditorReplaceLine({
				buffer,
				selectedLineIndex: 3,
				line: "TWO",
			});

			expect(transition.selectedLineIndex).toBe(1);
			expect(transition.buffer?.content).toBe("one\nTWO\n");
			expect(transition.notice).toEqual({
				level: "ok",
				message: "editor replaced line 2 dirty=true",
			});
		});

		test("deletes at either cursor bound and repairs the cursor", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\ntwo\nthree\n",
				truncated: false,
			});

			const first = transitionEditorDeleteLine({
				buffer,
				selectedLineIndex: -1,
			});
			const last = transitionEditorDeleteLine({
				buffer,
				selectedLineIndex: 8,
			});

			expect(first.buffer?.content).toBe("two\nthree\n");
			expect(first.selectedLineIndex).toBe(0);
			expect(first.notice).toEqual({
				level: "warn",
				message: "editor deleted line 1 dirty=true",
			});
			expect(last.buffer?.content).toBe("one\ntwo\n");
			expect(last.selectedLineIndex).toBe(1);
			expect(last.notice).toEqual({
				level: "warn",
				message: "editor deleted line 3 dirty=true",
			});
		});

		test("reports an empty undo history without applying an edit", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\n",
				truncated: false,
			});

			const transition = transitionEditorUndo({
				buffer,
				selectedLineIndex: 6,
			});

			expect(transition).toEqual({
				buffer,
				selectedLineIndex: 0,
				applies: false,
				clearSaveResult: false,
				notice: { level: "info", message: "editor undo history empty" },
			});
		});

		test("moves the cursor through a typed transition", () => {
			const buffer = createEditorBuffer({
				path: "/workspace/picos/README.md",
				content: "one\ntwo\n",
				truncated: false,
			});

			const transition = transitionEditorMoveCursor({
				buffer,
				selectedLineIndex: 8,
				direction: "next",
			});

			expect(transition).toEqual({
				buffer,
				selectedLineIndex: 0,
				applies: true,
				clearSaveResult: false,
				notice: undefined,
			});
		});
	});
});
