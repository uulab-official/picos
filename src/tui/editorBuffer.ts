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
