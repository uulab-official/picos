export type ClipboardPreviewSource =
	| "connection"
	| "port"
	| "process-resource"
	| "route-diagnostics"
	| "route-path"
	| "route-raw"
	| "route-table"
	| "tool-summary"
	| "tool-output"
	| "update-handoff";

export type ClipboardPreview = {
	source: ClipboardPreviewSource;
	label: string;
	copyText: string;
	confirmation: "copy";
	enabled: false;
	reason: string;
};

export function createClipboardPreview(input: {
	source: ClipboardPreviewSource;
	label: string;
	copyText: string;
}): ClipboardPreview {
	const copyText = input.copyText.trim();
	if (!copyText) {
		throw new Error("Clipboard preview requires text");
	}
	return {
		source: input.source,
		label: input.label,
		copyText,
		confirmation: "copy",
		enabled: false,
		reason: "Clipboard writes require explicit confirmation plumbing.",
	};
}

export function formatClipboardPreviewRows(
	preview: ClipboardPreview,
): string[] {
	return [
		`CLIPBOARD PREVIEW ${preview.source}`,
		`label ${preview.label}`,
		`copy ${preview.copyText}`,
		`confirm ${preview.confirmation} ${preview.enabled ? "ready" : "locked"}`,
	];
}
