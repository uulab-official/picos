import {
	formatLogProfileLabel,
	nextLogProfile,
	nextLogSearchPreset,
	saveLogProfile,
	saveLogSearchPreset,
} from "../core/logProfiles";
import { formatOsLogRows, type OsLogSnapshot } from "../core/osLogs";
import type { LogProfile } from "../core/types";

export type { LogProfile };
export {
	formatLogProfileLabel,
	nextLogProfile,
	nextLogSearchPreset,
	saveLogProfile,
	saveLogSearchPreset,
};

export function formatLogWorkspaceRows(
	logs: OsLogSnapshot | undefined,
	visibleRows: number,
	options: {
		level?: LogProfile["level"];
		query?: string;
		presets?: string[];
		profiles?: LogProfile[];
		follow?: boolean;
		followRefreshCount?: number;
		followLastStatus?: "idle" | "ok" | "warn" | "fail";
	} = {},
): string[] {
	const level = options.level ?? "all";
	const query = options.query?.trim() ?? "";
	const followRefreshCount = Math.max(
		0,
		Math.floor(options.followRefreshCount ?? 0),
	);
	const header = [
		`LOGS level=${level} search=${query || "-"}`,
		`follow=${options.follow ? "on" : "off"}`,
		options.follow && followRefreshCount > 0
			? `ticks=${followRefreshCount}`
			: "",
		options.follow && options.followLastStatus
			? `last=${options.followLastStatus}`
			: "",
		formatLogPresetSummary(options.presets),
		formatLogProfileSummary(options.profiles),
	]
		.filter(Boolean)
		.join(" ");
	if (!logs) {
		return [
			header,
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
		].slice(0, visibleRows);
	}

	return [
		header,
		...formatOsLogRows(logs, { filter: query, level }),
		"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
	].slice(0, visibleRows);
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
