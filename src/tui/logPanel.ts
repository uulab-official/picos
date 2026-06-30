import {
	formatOsLogRows,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../core/osLogs";

export function formatLogWorkspaceRows(
	logs: OsLogSnapshot | undefined,
	visibleRows: number,
	options: {
		level?: OsLogLevelFilter;
		query?: string;
		presets?: string[];
	} = {},
): string[] {
	const level = options.level ?? "all";
	const query = options.query?.trim() ?? "";
	const header = [
		`LOGS level=${level} search=${query || "-"}`,
		formatLogPresetSummary(options.presets),
	]
		.filter(Boolean)
		.join(" ");
	if (!logs) {
		return [
			header,
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · r refresh",
		].slice(0, visibleRows);
	}

	return [
		header,
		...formatOsLogRows(logs, { filter: query, level }),
		"shortcuts: e level · f search · F clear · P save · ] preset · r refresh",
	].slice(0, visibleRows);
}

export function saveLogSearchPreset(
	presets: string[],
	query: string,
): string[] {
	const normalized = query.trim();
	if (!normalized) {
		return presets;
	}
	return [
		normalized,
		...presets.filter((preset) => preset !== normalized),
	].slice(0, 6);
}

export function nextLogSearchPreset(
	presets: string[],
	currentQuery: string,
): string | undefined {
	if (presets.length === 0) {
		return undefined;
	}
	const index = presets.indexOf(currentQuery.trim());
	return presets[(index + 1) % presets.length] ?? presets[0];
}

function formatLogPresetSummary(presets: string[] | undefined): string {
	const visible = presets?.slice(0, 3).filter(Boolean) ?? [];
	return visible.length ? `presets=${visible.join("|")}` : "";
}
