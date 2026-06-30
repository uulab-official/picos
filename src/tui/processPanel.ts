import type { ProcessDetail, ProcessFileSnapshot } from "../core/processes";
import type { ProcessSummary } from "../core/types";

export function formatProcessWorkspaceRows(
	processes: ProcessSummary[],
	selected?: ProcessDetail,
	files?: ProcessFileSnapshot,
	visibleRows = 12,
): string[] {
	const rows = [
		`SUMMARY processes=${processes.length} selected=${selected?.pid ?? "-"}`,
		"SNAPSHOT",
		...formatSnapshotRows(processes),
		...formatDetailRows(selected, files),
	];
	return fitRows(rows, visibleRows, "processes");
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
): string[] {
	if (!selected) {
		return [];
	}
	return [
		`DETAIL pid=${selected.pid} ppid=${selected.ppid ?? "-"} user=${selected.user ?? "-"} state=${selected.state ?? "-"}`,
		`usage cpu=${selected.cpu ?? "-"}% mem=${selected.memory ?? "-"}% elapsed=${selected.elapsed ?? "-"}`,
		`command ${selected.command || "-"}`,
		"FILES",
		`cwd ${files?.cwd ?? "-"}`,
		...(files?.openFiles.length ? files.openFiles : ["- none detected"]),
	];
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
