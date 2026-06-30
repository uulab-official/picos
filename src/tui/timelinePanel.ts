import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import type { ConsoleEvent } from "./events";

export type TimelineFilter = "all" | "network" | "audit" | "action" | "raw";

export type TimelineSearchCleanupPreview = {
	count: number;
	confirmationPhrase: string;
	cleanup: ConfigCleanupPreview;
	rows: string[];
};

export type TimelineSearchCleanupConfirmation = {
	confirmed: boolean;
	message: string;
	presets: string[];
	removed: number;
};

const timelineFilters: TimelineFilter[] = [
	"all",
	"network",
	"audit",
	"action",
	"raw",
];

export function nextTimelineFilter(current: TimelineFilter): TimelineFilter {
	const index = timelineFilters.indexOf(current);
	return timelineFilters[(index + 1) % timelineFilters.length] ?? "all";
}

export function formatTimelineWorkspaceRows(
	events: ConsoleEvent[],
	visibleRows: number,
	filter: TimelineFilter = "all",
	options: {
		presets?: string[];
		query?: string;
	} = {},
): string[] {
	const query = options.query?.trim() ?? "";
	const classified = events.map((event) => ({
		event,
		kind: classifyTimelineEvent(event),
	}));
	const filtered = classified.filter(
		(entry) => filter === "all" || entry.kind === filter,
	);
	const visible = query
		? filtered.filter(({ event, kind }) =>
				timelineSearchText(event, kind).includes(query.toLowerCase()),
			)
		: filtered;
	const eventRows = visible.map(({ event, kind }) =>
		formatTimelineEvent(event, kind),
	);
	const bodyRows = Math.max(0, visibleRows - 3);
	return [
		formatTimelineSummary(
			query ? visible.map(({ event }) => event) : events,
			visible.length,
			events.length,
			filter,
			query,
			options.presets,
		),
		"TIMELINE",
		...(eventRows.length
			? eventRows.slice(Math.max(0, eventRows.length - bodyRows))
			: ["no timeline events"]),
		"FILTERS t cycle · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
	].slice(0, visibleRows);
}

export function filterTimelineEvents(
	events: ConsoleEvent[],
	query: string | undefined,
	filter: TimelineFilter = "all",
): ConsoleEvent[] {
	const normalized = query?.trim().toLowerCase() ?? "";
	if (!normalized && filter === "all") {
		return events;
	}
	return events.filter((event) => {
		const kind = classifyTimelineEvent(event);
		return (
			(filter === "all" || kind === filter) &&
			(!normalized || timelineSearchText(event, kind).includes(normalized))
		);
	});
}

export function saveTimelineSearchPreset(
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

export function nextTimelineSearchPreset(
	presets: string[],
	currentQuery: string,
): string | undefined {
	if (presets.length === 0) {
		return undefined;
	}
	const index = presets.indexOf(currentQuery.trim());
	return presets[(index + 1) % presets.length] ?? presets[0];
}

export function createTimelineSearchCleanupPreview(
	presets: string[],
): TimelineSearchCleanupPreview | undefined {
	const normalized = presets.map((preset) => preset.trim()).filter(Boolean);
	if (!normalized.length) {
		return undefined;
	}
	const cleanup = createConfigCleanupPreview({
		id: "timeline.searches",
		label: "Timeline search presets",
		scope: "timeline",
		count: normalized.length,
		verb: "clear",
	});
	return {
		count: normalized.length,
		confirmationPhrase: cleanup.confirmationPhrase,
		cleanup,
		rows: [
			"TIMELINE SEARCH CLEANUP",
			`presets=${normalized.length}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
	};
}

export function submitTimelineSearchCleanupConfirmation(
	presets: string[],
	confirmation: string,
): TimelineSearchCleanupConfirmation {
	const preview = createTimelineSearchCleanupPreview(presets);
	if (!preview) {
		return {
			confirmed: false,
			message: "timeline search cleanup unavailable",
			presets,
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
			message: "timeline search cleanup rejected",
			presets,
			removed: 0,
		};
	}
	return {
		confirmed: true,
		message: `timeline search cleanup removed ${preview.count} presets`,
		presets: [],
		removed: preview.count,
	};
}

function formatTimelineSummary(
	countedEvents: ConsoleEvent[],
	visibleCount: number,
	totalCount: number,
	filter: TimelineFilter,
	query: string,
	presets: string[] | undefined,
): string {
	const counts = countedEvents.reduce(
		(current, event) => {
			current[classifyTimelineEvent(event)] += 1;
			return current;
		},
		{ network: 0, action: 0, audit: 0, raw: 0 } satisfies Record<
			Exclude<TimelineFilter, "all">,
			number
		>,
	);
	return [
		`SUMMARY events=${countLabel(visibleCount, totalCount, filter, Boolean(query))}`,
		`network=${counts.network}`,
		`audit=${counts.audit}`,
		`action=${counts.action}`,
		`raw=${counts.raw}`,
		`filter=${filter}`,
		query ? `search=${query}` : "",
		formatTimelinePresetSummary(presets),
	]
		.filter(Boolean)
		.join(" ");
}

function classifyTimelineEvent(
	event: ConsoleEvent,
): Exclude<TimelineFilter, "all"> {
	const message = event.message.toLowerCase();
	if (
		message.includes("clipboard") ||
		message.includes("control confirmation") ||
		message.includes("control preview") ||
		message.includes("control simulation") ||
		message.includes("control execution") ||
		message.includes("ports file evidence unavailable") ||
		message.includes("ports file evidence error") ||
		message.includes("ports file evidence failed") ||
		message.includes("audit") ||
		message.includes("locked") ||
		message.includes("failed")
	) {
		return "audit";
	}
	if (message.includes("raw.")) {
		return "raw";
	}
	if (
		message.startsWith("network status ") ||
		message.startsWith("network primary ") ||
		message.startsWith("network public ip ") ||
		message.startsWith("network interface ")
	) {
		return "network";
	}
	return "action";
}

function formatTimelineEvent(
	event: ConsoleEvent,
	kind: Exclude<TimelineFilter, "all">,
): string {
	return `[${event.time}] ${event.level.toUpperCase().padEnd(4)} ${kind.padEnd(6)} ${event.message}`;
}

function timelineSearchText(
	event: ConsoleEvent,
	kind: Exclude<TimelineFilter, "all">,
): string {
	return `${event.level} ${event.time} ${kind} ${event.message}`.toLowerCase();
}

function formatTimelinePresetSummary(presets: string[] | undefined): string {
	const visible = presets?.slice(0, 3).filter(Boolean) ?? [];
	return visible.length ? `presets=${visible.join("|")}` : "";
}

function countLabel(
	visibleCount: number,
	totalCount: number,
	filter: TimelineFilter,
	hasQuery = false,
): string {
	return filter === "all" && !hasQuery
		? String(totalCount)
		: `${visibleCount}/${totalCount}`;
}
