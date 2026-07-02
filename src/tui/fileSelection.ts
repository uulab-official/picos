import type { FileEntry } from "../core/files";
import {
	type ClipboardPreview,
	createClipboardPreview,
} from "./clipboardPreview";

export function formatSelectedFilePathRows(
	entries: FileEntry[],
	selectedIndex: number,
): string[] {
	const entry = getSelectedFileEntry(entries, selectedIndex);
	if (!entry) {
		return [
			"SELECTED PATH none",
			"controls=j/k select · : path · 1-9 locations",
		];
	}

	return [
		`SELECTED PATH ${entry.name}`,
		`type=${entry.type} size=${formatFileEntrySize(entry)} readonly=${entry.readonly ? "yes" : "no"}`,
		`path=${entry.path}`,
		"controls=y copy path · enter open · c/m/x locked ops",
	];
}

export function getSelectedFilePathClipboardPreview(
	entries: FileEntry[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const entry = getSelectedFileEntry(entries, selectedIndex);
	if (!entry) {
		return undefined;
	}

	return createClipboardPreview({
		source: "file-path",
		label: `file path ${entry.name}`,
		copyText: entry.path,
		details: [
			`type=${entry.type}`,
			`size=${formatFileEntrySize(entry)}`,
			`readonly=${entry.readonly ? "yes" : "no"}`,
		],
	});
}

function getSelectedFileEntry(
	entries: FileEntry[],
	selectedIndex: number,
): FileEntry | undefined {
	return entries[Math.min(Math.max(selectedIndex, 0), entries.length - 1)];
}

function formatFileEntrySize(entry: FileEntry): string {
	if (entry.type === "directory") {
		return "<DIR>";
	}
	if (entry.size === undefined) {
		return "-";
	}
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let size = entry.size;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
