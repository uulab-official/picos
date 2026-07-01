export type ClipboardPreviewSource =
	| "connection"
	| "port"
	| "process-resource"
	| "route-diagnostics"
	| "route-path"
	| "route-raw"
	| "route-table"
	| "status-activity"
	| "timeline-audit"
	| "timeline-event"
	| "tool-summary"
	| "tool-output"
	| "tool-target"
	| "tool-status"
	| "tool-row"
	| "update-handoff";

export type ClipboardPreview = {
	source: ClipboardPreviewSource;
	label: string;
	copyText: string;
	details?: string[];
	confirmation: "copy";
	enabled: false;
	reason: string;
};

export type ClipboardPreviewFormatOptions = {
	maxCopyLines?: number;
	maxCopyLineLength?: number;
};

export function createClipboardPreview(input: {
	source: ClipboardPreviewSource;
	label: string;
	copyText: string;
	details?: string[];
}): ClipboardPreview {
	const copyText = input.copyText.trim();
	if (!copyText) {
		throw new Error("Clipboard preview requires text");
	}
	const details = (input.details ?? [])
		.map((detail) => detail.trim())
		.filter(Boolean);
	return {
		source: input.source,
		label: input.label,
		copyText,
		...(details.length ? { details } : {}),
		confirmation: "copy",
		enabled: false,
		reason: "Clipboard writes require explicit confirmation plumbing.",
	};
}

export function formatClipboardPreviewRows(
	preview: ClipboardPreview,
	options: ClipboardPreviewFormatOptions = {},
): string[] {
	return [
		`CLIPBOARD PREVIEW ${preview.source}`,
		`label ${preview.label}`,
		...(preview.details ?? []).map((detail) => `detail ${detail}`),
		...formatClipboardCopyRows(preview.copyText, options),
		`confirm ${preview.confirmation} ${preview.enabled ? "ready" : "locked"}`,
	];
}

function formatClipboardCopyRows(
	copyText: string,
	options: ClipboardPreviewFormatOptions,
): string[] {
	if (!options.maxCopyLines && !options.maxCopyLineLength) {
		return [`copy ${copyText}`];
	}
	const maxCopyLines = Math.max(1, Math.floor(options.maxCopyLines ?? 6));
	const lines = copyText.split(/\r?\n/);
	const visibleLines = lines
		.slice(0, maxCopyLines)
		.map((line) => formatClipboardCopyLine(line, options.maxCopyLineLength));
	const remaining = lines.length - visibleLines.length;
	return [
		...visibleLines.map((line) => `copy ${line}`),
		...(remaining > 0
			? [`copy ... ${remaining} more ${remaining === 1 ? "line" : "lines"}`]
			: []),
	];
}

function formatClipboardCopyLine(
	line: string,
	maxCopyLineLength?: number,
): string {
	if (!maxCopyLineLength) {
		return line;
	}
	const maxLength = Math.max(4, Math.floor(maxCopyLineLength));
	if (line.length <= maxLength) {
		return line;
	}
	return `${line.slice(0, maxLength - 3)}...`;
}
