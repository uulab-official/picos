export type EditorBufferLine = {
	number: number;
	content: string;
};

export type EditorBuffer = {
	path: string;
	originalContent: string;
	content: string;
	truncated: boolean;
	editHistory: string[];
};

export type EditorBufferState = {
	dirty: boolean;
	lineCount: number;
	originalLineCount: number;
	truncated: boolean;
};

export type EditorTransitionNotice = {
	level: "ok" | "info" | "warn";
	message: string;
};

export type EditorBufferTransition = {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
	applies: boolean;
	clearSaveResult: boolean;
	notice?: EditorTransitionNotice;
};

export type EditorSaveBufferPublication = {
	status: "current" | "stale";
	buffer: EditorBuffer | undefined;
	markedClean: boolean;
};

export function classifyEditorSaveBufferPublication(input: {
	currentRequestToken: number;
	requestToken: number;
	current: EditorBuffer | undefined;
	submitted: EditorBuffer;
	success: boolean;
}): EditorSaveBufferPublication {
	if (input.currentRequestToken !== input.requestToken) {
		return { status: "stale", buffer: input.current, markedClean: false };
	}
	if (
		!input.success ||
		!input.current ||
		input.current.path !== input.submitted.path ||
		input.current.content !== input.submitted.content
	) {
		return { status: "current", buffer: input.current, markedClean: false };
	}
	return {
		status: "current",
		buffer: {
			...input.current,
			originalContent: input.submitted.content,
			editHistory: [],
		},
		markedClean: true,
	};
}

export function createEditorBuffer(input: {
	path: string;
	content: string;
	truncated: boolean;
}): EditorBuffer {
	return {
		path: input.path,
		originalContent: input.content,
		content: input.content,
		truncated: input.truncated,
		editHistory: [],
	};
}

export function appendEditorBufferLine(
	buffer: EditorBuffer,
	line: string,
): EditorBuffer {
	const separator =
		buffer.content.endsWith("\n") || buffer.content === "" ? "" : "\n";
	return withEditorBufferContent(
		buffer,
		`${buffer.content}${separator}${line}\n`,
	);
}

export function insertEditorBufferLine(
	buffer: EditorBuffer,
	selectedIndex: number,
	line: string,
	position: "before" | "after",
): EditorBuffer {
	const lines = splitEditorLines(buffer.content);
	const index = normalizeEditorLineIndex(selectedIndex, lines.length);
	const insertIndex = position === "before" ? index : index + 1;
	const nextLines = [
		...lines.slice(0, insertIndex),
		line,
		...lines.slice(insertIndex),
	];
	return withEditorBufferContent(
		buffer,
		joinEditorLines(nextLines, buffer.content.endsWith("\n")),
	);
}

export function moveEditorBufferLineSelection(
	buffer: EditorBuffer,
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	const lineCount = splitEditorLines(buffer.content).length;
	if (lineCount <= 0) {
		return 0;
	}
	const normalized = repairEditorBufferLineSelection(buffer, selectedIndex);
	return direction === "next"
		? (normalized + 1) % lineCount
		: (normalized - 1 + lineCount) % lineCount;
}

export function repairEditorBufferLineSelection(
	buffer: EditorBuffer,
	selectedIndex: number,
): number {
	return normalizeEditorLineIndex(
		selectedIndex,
		splitEditorLines(buffer.content).length,
	);
}

export function transitionEditorAppendLine(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
	line: string;
}): EditorBufferTransition {
	if (!input.buffer) {
		return missingEditorBufferTransition("open a text file before editing");
	}

	const buffer = appendEditorBufferLine(input.buffer, input.line);
	const state = getEditorBufferState(buffer);
	return {
		buffer,
		selectedLineIndex: repairEditorBufferLineSelection(
			buffer,
			state.lineCount - 1,
		),
		applies: true,
		clearSaveResult: true,
		notice: {
			level: "ok",
			message: `editor appended line ${state.lineCount} dirty=${state.dirty}`,
		},
	};
}

export function transitionEditorInsertLine(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
	line: string;
	position: "before" | "after";
}): EditorBufferTransition {
	if (!input.buffer) {
		return missingEditorBufferTransition(
			"open a text file before inserting lines",
		);
	}

	const selectedLineIndex = repairEditorBufferLineSelection(
		input.buffer,
		input.selectedLineIndex,
	);
	const buffer = insertEditorBufferLine(
		input.buffer,
		selectedLineIndex,
		input.line,
		input.position,
	);
	const state = getEditorBufferState(buffer);
	const insertedLineIndex =
		input.position === "before" ? selectedLineIndex : selectedLineIndex + 1;
	return {
		buffer,
		selectedLineIndex: repairEditorBufferLineSelection(
			buffer,
			insertedLineIndex,
		),
		applies: true,
		clearSaveResult: true,
		notice: {
			level: "ok",
			message: `editor inserted ${input.position} line ${selectedLineIndex + 1} dirty=${state.dirty}`,
		},
	};
}

export function transitionEditorReplaceLine(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
	line: string;
}): EditorBufferTransition {
	if (!input.buffer) {
		return missingEditorBufferTransition(
			"open a text file before replacing lines",
		);
	}

	const selectedLineIndex = repairEditorBufferLineSelection(
		input.buffer,
		input.selectedLineIndex,
	);
	const buffer = replaceEditorBufferLine(
		input.buffer,
		selectedLineIndex,
		input.line,
	);
	const state = getEditorBufferState(buffer);
	return {
		buffer,
		selectedLineIndex: repairEditorBufferLineSelection(
			buffer,
			selectedLineIndex,
		),
		applies: true,
		clearSaveResult: true,
		notice: {
			level: "ok",
			message: `editor replaced line ${selectedLineIndex + 1} dirty=${state.dirty}`,
		},
	};
}

export function transitionEditorDeleteLine(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
}): EditorBufferTransition {
	if (!input.buffer) {
		return missingEditorBufferTransition(
			"open a text file before deleting lines",
		);
	}

	const selectedLineIndex = repairEditorBufferLineSelection(
		input.buffer,
		input.selectedLineIndex,
	);
	const buffer = deleteEditorBufferLine(input.buffer, selectedLineIndex);
	const state = getEditorBufferState(buffer);
	const applies = buffer !== input.buffer;
	return {
		buffer,
		selectedLineIndex: repairEditorBufferLineSelection(
			buffer,
			selectedLineIndex,
		),
		applies,
		clearSaveResult: applies,
		notice: {
			level: "warn",
			message: `editor deleted line ${selectedLineIndex + 1} dirty=${state.dirty}`,
		},
	};
}

export function transitionEditorUndo(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
}): EditorBufferTransition {
	if (!input.buffer) {
		return missingEditorBufferTransition("open a text file before undo");
	}

	if (input.buffer.editHistory.length <= 0) {
		return {
			buffer: input.buffer,
			selectedLineIndex: repairEditorBufferLineSelection(
				input.buffer,
				input.selectedLineIndex,
			),
			applies: false,
			clearSaveResult: false,
			notice: { level: "info", message: "editor undo history empty" },
		};
	}

	const buffer = undoEditorBufferEdit(input.buffer);
	const state = getEditorBufferState(buffer);
	return {
		buffer,
		selectedLineIndex: repairEditorBufferLineSelection(
			buffer,
			input.selectedLineIndex,
		),
		applies: true,
		clearSaveResult: true,
		notice: { level: "info", message: `editor undo dirty=${state.dirty}` },
	};
}

export function transitionEditorMoveCursor(input: {
	buffer: EditorBuffer | undefined;
	selectedLineIndex: number;
	direction: "next" | "previous";
}): EditorBufferTransition {
	if (!input.buffer) {
		return {
			buffer: undefined,
			selectedLineIndex: 0,
			applies: false,
			clearSaveResult: false,
		};
	}

	return {
		buffer: input.buffer,
		selectedLineIndex: moveEditorBufferLineSelection(
			input.buffer,
			input.selectedLineIndex,
			input.direction,
		),
		applies: true,
		clearSaveResult: false,
	};
}

export function replaceEditorBufferLine(
	buffer: EditorBuffer,
	selectedIndex: number,
	line: string,
): EditorBuffer {
	const lines = splitEditorLines(buffer.content);
	if (lines.length <= 0) {
		return appendEditorBufferLine(buffer, line);
	}
	const index = normalizeEditorLineIndex(selectedIndex, lines.length);
	const nextLines = [...lines];
	nextLines[index] = line;
	return withEditorBufferContent(
		buffer,
		joinEditorLines(nextLines, buffer.content.endsWith("\n")),
	);
}

export function deleteEditorBufferLine(
	buffer: EditorBuffer,
	selectedIndex: number,
): EditorBuffer {
	const lines = splitEditorLines(buffer.content);
	if (lines.length <= 0) {
		return buffer;
	}
	const index = normalizeEditorLineIndex(selectedIndex, lines.length);
	const nextLines = lines.filter((_, lineIndex) => lineIndex !== index);
	return withEditorBufferContent(
		buffer,
		joinEditorLines(nextLines, buffer.content.endsWith("\n")),
	);
}

export function undoEditorBufferEdit(buffer: EditorBuffer): EditorBuffer {
	const previousContent = buffer.editHistory.at(-1);
	if (previousContent === undefined) {
		return buffer;
	}
	return {
		...buffer,
		content: previousContent,
		editHistory: buffer.editHistory.slice(0, -1),
	};
}

export function getEditorBufferState(buffer: EditorBuffer): EditorBufferState {
	return {
		dirty: buffer.content !== buffer.originalContent,
		lineCount: splitEditorLines(buffer.content).length,
		originalLineCount: splitEditorLines(buffer.originalContent).length,
		truncated: buffer.truncated,
	};
}

export function formatEditorBufferLines(
	buffer: EditorBuffer,
	limit: number,
): EditorBufferLine[] {
	return splitEditorLines(buffer.content)
		.slice(0, Math.max(0, limit))
		.map((content, index) => ({ number: index + 1, content }));
}

function splitEditorLines(content: string): string[] {
	const lines = content.split(/\r?\n/);
	if (lines.at(-1) === "") {
		return lines.slice(0, -1);
	}
	return lines;
}

function missingEditorBufferTransition(
	message: string,
): EditorBufferTransition {
	return {
		buffer: undefined,
		selectedLineIndex: 0,
		applies: false,
		clearSaveResult: false,
		notice: { level: "warn", message },
	};
}

function normalizeEditorLineIndex(index: number, lineCount: number): number {
	if (lineCount <= 0) {
		return 0;
	}
	return Math.max(0, Math.min(index, lineCount - 1));
}

function joinEditorLines(lines: string[], trailingNewline: boolean): string {
	if (!lines.length) {
		return "";
	}
	return `${lines.join("\n")}${trailingNewline ? "\n" : ""}`;
}

function withEditorBufferContent(
	buffer: EditorBuffer,
	content: string,
): EditorBuffer {
	if (content === buffer.content) {
		return buffer;
	}
	return {
		...buffer,
		content,
		editHistory: [...buffer.editHistory, buffer.content],
	};
}
