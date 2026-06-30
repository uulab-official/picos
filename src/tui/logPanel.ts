import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import {
	formatLogProfileLabel,
	nextLogProfile,
	nextLogSearchPreset,
	saveLogProfile,
	saveLogSearchPreset,
} from "../core/logProfiles";
import { formatOsLogRows, type OsLogSnapshot } from "../core/osLogs";
import type { LogProfile } from "../core/types";

export type LogFollowHistoryItem = {
	status: "ok" | "warn" | "fail";
	entries: number;
	label: string;
};

export type LogCleanupPreview = {
	count: number;
	confirmationPhrase: string;
	cleanup: ConfigCleanupPreview;
	rows: string[];
};

export type LogCleanupConfirmation = {
	confirmed: boolean;
	message: string;
	presets: string[];
	profiles: LogProfile[];
	removed: number;
};

export type { LogProfile };
export {
	formatLogProfileLabel,
	nextLogProfile,
	nextLogSearchPreset,
	saveLogProfile,
	saveLogSearchPreset,
};

export function createLogCleanupPreview(
	presets: string[],
	profiles: LogProfile[],
): LogCleanupPreview | undefined {
	const normalizedPresets = presets.filter((preset) => preset.trim());
	const normalizedProfiles = profiles.map((profile) => ({
		level: profile.level,
		query: profile.query.trim(),
	}));
	const count = normalizedPresets.length + normalizedProfiles.length;
	if (!count) {
		return undefined;
	}
	const cleanup = createConfigCleanupPreview({
		id: "logs.presets",
		label: "Logs presets",
		scope: "logs",
		count,
		verb: "clear",
	});
	return {
		count,
		confirmationPhrase: cleanup.confirmationPhrase,
		cleanup,
		rows: [
			"LOGS CLEANUP",
			`search-presets=${normalizedPresets.length} profiles=${normalizedProfiles.length}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
	};
}

export function submitLogCleanupConfirmation(
	presets: string[],
	profiles: LogProfile[],
	confirmation: string,
): LogCleanupConfirmation {
	const preview = createLogCleanupPreview(presets, profiles);
	if (!preview) {
		return {
			confirmed: false,
			message: "logs cleanup unavailable",
			presets,
			profiles,
			removed: 0,
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		return {
			confirmed: false,
			message: "logs cleanup rejected",
			presets,
			profiles,
			removed: 0,
		};
	}
	return {
		confirmed: true,
		message: `logs cleanup removed ${preview.count} presets`,
		presets: [],
		profiles: [],
		removed: preview.count,
	};
}

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
		followHistory?: LogFollowHistoryItem[];
		shelfFocus?: boolean;
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
	const shelfControlRows = options.shelfFocus
		? formatLogProfileShelfControlRows(options.profiles, {
				level,
				query,
			})
		: [];
	if (!logs) {
		return [
			header,
			...shelfControlRows,
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
		].slice(0, visibleRows);
	}

	return [
		header,
		...shelfControlRows,
		...formatOsLogRows(logs, { filter: query, level }),
		...formatLogFollowHistoryRows(options.followHistory),
		"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
	].slice(0, visibleRows);
}

function formatLogFollowHistoryRows(
	history: LogFollowHistoryItem[] | undefined,
): string[] {
	const visible = history?.slice(-3) ?? [];
	if (!visible.length) {
		return [];
	}
	return [
		`follow history: ${visible
			.map(
				(item) =>
					`${item.label} ${item.status} entries=${Math.max(
						0,
						Math.floor(item.entries),
					)}`,
			)
			.join(" | ")}`,
	];
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

function formatLogProfileShelfControlRows(
	profiles: LogProfile[] | undefined,
	current: LogProfile,
): string[] {
	const normalized = (profiles ?? []).map((profile) => ({
		level: profile.level,
		query: profile.query.trim(),
	}));
	const next = nextLogProfile(normalized, current);
	return [
		"SHELF CONTROL logs.profiles",
		`> profile=${formatLogProfileLabel(current)} next=${next ? formatLogProfileLabel(next) : "-"} saved=${normalized.length}`,
		normalized.length
			? "enter=cycle log profiles  }=cycle S=save D=cleanup"
			: "enter=open log search prompt  S=save D=cleanup",
	];
}
