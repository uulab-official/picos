export type EditorBufferLine = {
	number: number;
	content: string;
};

export type EditorBuffer = {
	path: string;
	originalContent: string;
	content: string;
	truncated: boolean;
};

export type EditorBufferState = {
	dirty: boolean;
	lineCount: number;
	originalLineCount: number;
	truncated: boolean;
};

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
	};
}

export function appendEditorBufferLine(
	buffer: EditorBuffer,
	line: string,
): EditorBuffer {
	const separator =
		buffer.content.endsWith("\n") || buffer.content === "" ? "" : "\n";
	return {
		...buffer,
		content: `${buffer.content}${separator}${line}\n`,
	};
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
	const normalized = normalizeEditorLineIndex(selectedIndex, lineCount);
	return direction === "next"
		? (normalized + 1) % lineCount
		: (normalized - 1 + lineCount) % lineCount;
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
	return {
		...buffer,
		content: joinEditorLines(nextLines, buffer.content.endsWith("\n")),
	};
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
	return {
		...buffer,
		content: joinEditorLines(nextLines, buffer.content.endsWith("\n")),
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
