import type { ConsoleEvent } from "./events";

export type TimelineFilter = "all" | "audit" | "action" | "raw";

const timelineFilters: TimelineFilter[] = ["all", "audit", "action", "raw"];

export function nextTimelineFilter(current: TimelineFilter): TimelineFilter {
	const index = timelineFilters.indexOf(current);
	return timelineFilters[(index + 1) % timelineFilters.length] ?? "all";
}

export function formatTimelineWorkspaceRows(
	events: ConsoleEvent[],
	visibleRows: number,
	filter: TimelineFilter = "all",
): string[] {
	const classified = events.map((event) => ({
		event,
		kind: classifyTimelineEvent(event),
	}));
	const visible = classified.filter(
		(entry) => filter === "all" || entry.kind === filter,
	);
	const eventRows = visible.map(({ event, kind }) =>
		formatTimelineEvent(event, kind),
	);
	const bodyRows = Math.max(0, visibleRows - 3);
	return [
		formatTimelineSummary(events, visible.length, filter),
		"TIMELINE",
		...(eventRows.length
			? eventRows.slice(Math.max(0, eventRows.length - bodyRows))
			: ["no timeline events"]),
		"FILTERS t cycle · timeline.export writes audit file",
	].slice(0, visibleRows);
}

function formatTimelineSummary(
	events: ConsoleEvent[],
	visibleCount: number,
	filter: TimelineFilter,
): string {
	const counts = events.reduce(
		(current, event) => {
			current[classifyTimelineEvent(event)] += 1;
			return current;
		},
		{ action: 0, audit: 0, raw: 0 } satisfies Record<
			Exclude<TimelineFilter, "all">,
			number
		>,
	);
	return [
		`SUMMARY events=${countLabel(visibleCount, events.length, filter)}`,
		`audit=${counts.audit}`,
		`action=${counts.action}`,
		`raw=${counts.raw}`,
		`filter=${filter}`,
	].join(" ");
}

function classifyTimelineEvent(
	event: ConsoleEvent,
): Exclude<TimelineFilter, "all"> {
	const message = event.message.toLowerCase();
	if (
		message.includes("clipboard") ||
		message.includes("audit") ||
		message.includes("locked") ||
		message.includes("failed")
	) {
		return "audit";
	}
	if (message.includes("raw.")) {
		return "raw";
	}
	return "action";
}

function formatTimelineEvent(
	event: ConsoleEvent,
	kind: Exclude<TimelineFilter, "all">,
): string {
	return `[${event.time}] ${event.level.toUpperCase().padEnd(4)} ${kind.padEnd(6)} ${event.message}`;
}

function countLabel(
	visibleCount: number,
	totalCount: number,
	filter: TimelineFilter,
): string {
	return filter === "all"
		? String(totalCount)
		: `${visibleCount}/${totalCount}`;
}
