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
import {
	filterOsLogEntries,
	formatOsLogRows,
	nextOsLogLevelFilter,
	type OsLogEntry,
	type OsLogSnapshot,
} from "../core/osLogs";
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
	action: "apply" | "notice";
	confirmed: boolean;
	message: string;
	notice: LogPanelNotice;
	presets: string[];
	profiles: LogProfile[];
	removed: number;
};

export type LogPanelNotice = {
	level: "info" | "warn";
	message: string;
};

export type LogSearchTransition = {
	query: string;
	presets: string[];
	notice: LogPanelNotice;
};

export type LogPanelInputDecision =
	| { kind: "no-op" }
	| { kind: "notice"; notice: LogPanelNotice }
	| {
			kind: "command";
			command: "search" | "cleanup" | "refresh" | "clear-follow";
			notice?: LogPanelNotice;
	  }
	| {
			kind: "search";
			query: string;
			notice: LogPanelNotice;
	  }
	| {
			kind: "level";
			level: LogProfile["level"];
			notice: LogPanelNotice;
	  }
	| {
			kind: "save-preset";
			presets: string[];
			notice: LogPanelNotice;
	  }
	| {
			kind: "save-profile";
			profiles: LogProfile[];
			notice: LogPanelNotice;
	  }
	| {
			kind: "profile";
			profile: LogProfile;
			notice: LogPanelNotice;
	  }
	| { kind: "follow"; follow: boolean; notice: LogPanelNotice };

export function prepareLogSearchTransition(input: {
	entries: OsLogEntry[];
	level: LogProfile["level"];
	presets: string[];
	query: string;
}): LogSearchTransition {
	const query = input.query.trim();
	const matches = filterOsLogEntries(input.entries, query, input.level).length;
	return {
		query,
		presets: query ? saveLogSearchPreset(input.presets, query) : input.presets,
		notice: {
			level: matches ? "info" : "warn",
			message: query
				? `logs search ${query} matches ${matches}`
				: "logs search cleared",
		},
	};
}

export function prepareLogPanelInput(input: {
	input: string;
	entries: OsLogEntry[];
	level: LogProfile["level"];
	query: string;
	presets: string[];
	profiles: LogProfile[];
	follow: boolean;
}): LogPanelInputDecision {
	if (input.input === "e") {
		const level = nextOsLogLevelFilter(input.level);
		const matches = filterOsLogEntries(
			input.entries,
			input.query,
			level,
		).length;
		return {
			kind: "level",
			level,
			notice: {
				level: matches ? "info" : "warn",
				message: `logs level ${level} matches ${matches}`,
			},
		};
	}
	if (input.input === "f") {
		return {
			kind: "command",
			command: "search",
			notice: { level: "info", message: "logs search opened" },
		};
	}
	if (input.input === "F") {
		return {
			kind: "search",
			query: "",
			notice: { level: "info", message: "logs search cleared" },
		};
	}
	if (input.input === "P") {
		const query = input.query.trim();
		return query
			? {
					kind: "save-preset",
					presets: saveLogSearchPreset(input.presets, query),
					notice: {
						level: "info",
						message: `logs preset saved ${query}`,
					},
				}
			: {
					kind: "notice",
					notice: { level: "warn", message: "no logs search to save" },
				};
	}
	if (input.input === "]") {
		const query = nextLogSearchPreset(input.presets, input.query);
		if (!query) {
			return {
				kind: "notice",
				notice: { level: "warn", message: "no logs search presets" },
			};
		}
		const matches = filterOsLogEntries(
			input.entries,
			query,
			input.level,
		).length;
		return {
			kind: "search",
			query,
			notice: {
				level: matches ? "info" : "warn",
				message: `logs preset ${query} matches ${matches}`,
			},
		};
	}
	if (input.input === "S") {
		const profile = { level: input.level, query: input.query };
		return {
			kind: "save-profile",
			profiles: saveLogProfile(input.profiles, profile),
			notice: {
				level: "info",
				message: `logs profile saved ${formatLogProfileLabel(profile)}`,
			},
		};
	}
	if (input.input === "}") {
		const profile = nextLogProfile(input.profiles, {
			level: input.level,
			query: input.query,
		});
		if (!profile) {
			return {
				kind: "notice",
				notice: { level: "warn", message: "no logs profiles" },
			};
		}
		const matches = filterOsLogEntries(
			input.entries,
			profile.query,
			profile.level,
		).length;
		return {
			kind: "profile",
			profile,
			notice: {
				level: matches ? "info" : "warn",
				message: `logs profile ${formatLogProfileLabel(profile)} matches ${matches}`,
			},
		};
	}
	if (input.input === "D") {
		const preview = createLogCleanupPreview(input.presets, input.profiles);
		return preview
			? {
					kind: "command",
					command: "cleanup",
					notice: {
						level: "warn",
						message: `logs cleanup confirm ${preview.confirmationPhrase}`,
					},
				}
			: {
					kind: "notice",
					notice: { level: "warn", message: "no logs presets to clean" },
				};
	}
	if (input.input === "L") {
		const follow = !input.follow;
		return {
			kind: "follow",
			follow,
			notice: {
				level: follow ? "info" : "warn",
				message: `logs follow ${follow ? "on" : "off"}`,
			},
		};
	}
	if (input.input === "C") {
		return {
			kind: "command",
			command: "clear-follow",
			notice: { level: "info", message: "logs follow state cleared" },
		};
	}
	return input.input === "r"
		? { kind: "command", command: "refresh" }
		: { kind: "no-op" };
}

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
		const message = "logs cleanup unavailable";
		return {
			action: "notice",
			confirmed: false,
			message,
			notice: { level: "warn", message },
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
		const message = "logs cleanup rejected";
		return {
			action: "notice",
			confirmed: false,
			message,
			notice: { level: "warn", message },
			presets,
			profiles,
			removed: 0,
		};
	}
	const message = `logs cleanup removed ${preview.count} presets`;
	return {
		action: "apply",
		confirmed: true,
		message,
		notice: { level: "info", message },
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
