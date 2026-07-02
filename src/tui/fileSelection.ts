import type { FileEntry } from "../core/files";
import type { RemoteFileContext } from "../core/remotes";
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

export function formatFileBreadcrumbRows(
	root: string,
	entries: FileEntry[],
	selectedIndex: number,
	options: { maxSegments?: number } = {},
): string[] {
	const entry = getSelectedFileEntry(entries, selectedIndex);
	const selectedPath = entry?.path;
	return [
		`PATH BREADCRUMB selected=${entry?.name ?? "none"} depth=${selectedPath ? getPathSegments(selectedPath).length : 0}`,
		`root=${formatPathBreadcrumb(root, options.maxSegments)}`,
		`selected=${selectedPath ? formatPathBreadcrumb(selectedPath, options.maxSegments) : "none"}`,
		"controls=: path · u parent · y copy selected",
	];
}

export function formatFileProviderBoundaryRows(options: {
	root: string;
	remoteContext?: RemoteFileContext;
}): string[] {
	const remote = options.remoteContext;
	if (remote) {
		return [
			`PROVIDER BOUNDARY ${remote.kind} ${remote.label}`,
			`root=${remote.root}`,
			`status=${remote.status} writes=${remote.writes} localRoot=${options.root}`,
			"controls=enter preview · y copy path · remote writes require confirmation",
		];
	}

	return [
		"PROVIDER BOUNDARY local",
		`root=${options.root}`,
		"status=ready writes=locked remote=none",
		"controls=enter open · y copy path · c/m/x preview-only",
	];
}

function getSelectedFileEntry(
	entries: FileEntry[],
	selectedIndex: number,
): FileEntry | undefined {
	return entries[Math.min(Math.max(selectedIndex, 0), entries.length - 1)];
}

function formatPathBreadcrumb(path: string, maxSegments = 5): string {
	const segments = getPathSegments(path);
	if (!segments.length) {
		return "/";
	}
	const segmentBudget = Math.max(1, Math.floor(maxSegments));
	const visibleCount =
		segments.length > segmentBudget
			? Math.max(1, segmentBudget - 1)
			: segmentBudget;
	const visibleSegments =
		segments.length > segmentBudget
			? ["...", ...segments.slice(-visibleCount)]
			: segments;
	return [getPathPrefix(path), ...visibleSegments].filter(Boolean).join(" > ");
}

function getPathSegments(path: string): string[] {
	return path.replace(/\\/g, "/").split("/").filter(Boolean);
}

function getPathPrefix(path: string): string {
	const normalized = path.replace(/\\/g, "/");
	if (/^[A-Za-z]:/.test(normalized)) {
		return normalized.slice(0, 2);
	}
	return normalized.startsWith("/") ? "/" : "";
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
