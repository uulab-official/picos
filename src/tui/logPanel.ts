import {
	formatOsLogRows,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../core/osLogs";

export type LogProfile = {
	level: OsLogLevelFilter;
	query: string;
};

export function formatLogWorkspaceRows(
	logs: OsLogSnapshot | undefined,
	visibleRows: number,
	options: {
		level?: OsLogLevelFilter;
		query?: string;
		presets?: string[];
		profiles?: LogProfile[];
	} = {},
): string[] {
	const level = options.level ?? "all";
	const query = options.query?.trim() ?? "";
	const header = [
		`LOGS level=${level} search=${query || "-"}`,
		formatLogPresetSummary(options.presets),
		formatLogProfileSummary(options.profiles),
	]
		.filter(Boolean)
		.join(" ");
	if (!logs) {
		return [
			header,
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · r refresh",
		].slice(0, visibleRows);
	}

	return [
		header,
		...formatOsLogRows(logs, { filter: query, level }),
		"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · r refresh",
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

export function saveLogProfile(
	profiles: LogProfile[],
	profile: LogProfile,
): LogProfile[] {
	const normalized = normalizeLogProfile(profile);
	return [
		normalized,
		...profiles.filter(
			(candidate) =>
				formatLogProfileLabel(candidate) !== formatLogProfileLabel(normalized),
		),
	].slice(0, 6);
}

export function nextLogProfile(
	profiles: LogProfile[],
	current: LogProfile,
): LogProfile | undefined {
	if (profiles.length === 0) {
		return undefined;
	}
	const currentLabel = formatLogProfileLabel(current);
	const index = profiles.findIndex(
		(profile) => formatLogProfileLabel(profile) === currentLabel,
	);
	return profiles[(index + 1) % profiles.length] ?? profiles[0];
}

export function formatLogProfileLabel(profile: LogProfile): string {
	const normalized = normalizeLogProfile(profile);
	return `${normalized.level}:${normalized.query || "-"}`;
}

function formatLogPresetSummary(presets: string[] | undefined): string {
	const visible = presets?.slice(0, 3).filter(Boolean) ?? [];
	return visible.length ? `presets=${visible.join("|")}` : "";
}

function formatLogProfileSummary(profiles: LogProfile[] | undefined): string {
	const visible = profiles?.slice(0, 3) ?? [];
	return visible.length
		? `profiles=${visible.map(formatLogProfileLabel).join("|")}`
		: "";
}

function normalizeLogProfile(profile: LogProfile): LogProfile {
	return {
		level: profile.level,
		query: profile.query.trim(),
	};
}
