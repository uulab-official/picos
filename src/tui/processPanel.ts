import type {
	ProcessDetail,
	ProcessFileSnapshot,
	ProcessOpenFile,
} from "../core/processes";
import type { ProcessSummary } from "../core/types";

export type ProcessFileRequest = {
	path: string;
	command: string;
};

export function formatProcessWorkspaceRows(
	processes: ProcessSummary[],
	selected?: ProcessDetail,
	files?: ProcessFileSnapshot,
	visibleRows = 12,
	selectedFileIndex = 0,
): string[] {
	const rows = [
		`SUMMARY processes=${processes.length} selected=${selected?.pid ?? "-"}`,
		"SNAPSHOT",
		...formatSnapshotRows(processes),
		...formatDetailRows(selected, files, selectedFileIndex),
	];
	return fitRows(rows, visibleRows, "processes");
}

export function getProcessFileSelectionCount(
	files: ProcessFileSnapshot | undefined,
): number {
	return getSelectableProcessFiles(files).length;
}

export function getSelectedProcessFileRequest(
	files: ProcessFileSnapshot | undefined,
	selectedIndex: number,
): ProcessFileRequest | undefined {
	const entries = getSelectableProcessFiles(files);
	const entry = entries[getSelectedIndex(entries.length, selectedIndex) ?? -1];
	if (!entry || !isFilesystemPath(entry.path)) {
		return undefined;
	}
	return {
		path: entry.path,
		command: `${entry.command} ${formatCommandPath(entry.path)}`,
	};
}

function formatSnapshotRows(processes: ProcessSummary[]): string[] {
	if (processes.length === 0) {
		return ["loading..."];
	}
	return processes.map(
		(process) =>
			`${String(process.pid).padEnd(7)} ${formatPercent(process.cpu).padEnd(6)} ${formatPercent(process.memory).padEnd(6)} ${process.command}`,
	);
}

function formatPercent(value: string | undefined): string {
	return value ? `${value}%` : "-";
}

function formatDetailRows(
	selected: ProcessDetail | undefined,
	files: ProcessFileSnapshot | undefined,
	selectedFileIndex: number,
): string[] {
	if (!selected) {
		return [];
	}
	return [
		`DETAIL pid=${selected.pid} ppid=${selected.ppid ?? "-"} user=${selected.user ?? "-"} state=${selected.state ?? "-"}`,
		`usage cpu=${selected.cpu ?? "-"}% mem=${selected.memory ?? "-"}% elapsed=${selected.elapsed ?? "-"}`,
		`command ${selected.command || "-"}`,
		"FILES",
		...formatProcessFileRows(files, selectedFileIndex),
	];
}

function formatProcessFileRows(
	files: ProcessFileSnapshot | undefined,
	selectedFileIndex: number,
): string[] {
	const entries = getSelectableProcessFiles(files);
	if (entries.length === 0) {
		return ["- none detected"];
	}
	const selectedIndex =
		getSelectedIndex(entries.length, selectedFileIndex) ?? 0;
	return entries.map((entry, index) => {
		const marker = index === selectedIndex ? ">" : " ";
		return `${marker} ${entry.descriptor.padEnd(4)} ${entry.label.padEnd(11)} ${entry.path}`;
	});
}

type SelectableProcessFile = {
	descriptor: string;
	label: string;
	path: string;
	command: "picos dir" | "picos type";
};

function getSelectableProcessFiles(
	files: ProcessFileSnapshot | undefined,
): SelectableProcessFile[] {
	if (!files) {
		return [];
	}
	const entries: SelectableProcessFile[] = [];
	if (files.cwd) {
		entries.push({
			descriptor: "cwd",
			label: "working-dir",
			path: files.cwd,
			command: "picos dir",
		});
	}
	const fileEntries = files.fileEntries.length
		? files.fileEntries
		: files.openFiles.map(
				(path): ProcessOpenFile => ({
					descriptor: "file",
					label: "file",
					path,
				}),
			);
	for (const entry of fileEntries) {
		entries.push({
			descriptor: entry.descriptor || "file",
			label: entry.label || "file",
			path: entry.path,
			command: "picos type",
		});
	}
	return entries;
}

function getSelectedIndex(
	total: number,
	selectedIndex: number,
): number | undefined {
	if (total <= 0) {
		return undefined;
	}
	return Math.min(Math.max(selectedIndex, 0), total - 1);
}

function isFilesystemPath(path: string): boolean {
	return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

function formatCommandPath(path: string): string {
	if (!/\s/.test(path)) {
		return path;
	}
	return `"${path.replaceAll('"', '\\"')}"`;
}

function fitRows(rows: string[], visibleRows: number, label: string): string[] {
	if (rows.length <= visibleRows) {
		return rows;
	}
	if (visibleRows <= 1) {
		return [`↓ ${rows.length} more ${label}`];
	}
	const visible = rows.slice(0, visibleRows - 1);
	return [...visible, `↓ ${rows.length - visible.length} more ${label}`];
}
