import {
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportPlan,
	createConsoleAuditExportPlan,
} from "../core/auditLog";
import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import type { FileOpenOrigin } from "../core/fileOpen";
import {
	type ClipboardPreview,
	createClipboardPreview,
} from "./clipboardPreview";
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

export type TimelineFocusEvidenceTrailPlan = {
	kind: "audit";
	selectedIndex: number;
	itemCount: number;
	label: string;
	path: string;
	message: string;
	rows: string[];
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
		selectedIndex?: number;
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
	const selectedIndex =
		options.selectedIndex === undefined
			? undefined
			: getSelectedTimelineIndex(visible.length, options.selectedIndex);
	const firstVisibleIndex = Math.max(0, eventRows.length - bodyRows);
	const visibleEventRows = eventRows
		.slice(firstVisibleIndex)
		.map((row, index) =>
			formatTimelineSelectionMarker(
				row,
				firstVisibleIndex + index,
				selectedIndex,
			),
		);
	return [
		formatTimelineSummary(
			query ? visible.map(({ event }) => event) : events,
			visible.length,
			events.length,
			filter,
			query,
			options.presets,
			selectedIndex,
		),
		"TIMELINE",
		...(visibleEventRows.length ? visibleEventRows : ["no timeline events"]),
		"FILTERS t cycle · j/k select · c copy selected · e export selected · E evidence · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
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

export function formatSelectedTimelinePreviewRow(
	events: ConsoleEvent[],
	options: {
		filter?: TimelineFilter;
		query?: string;
		selectedIndex?: number;
	} = {},
): string {
	const filter = options.filter ?? "all";
	const query = options.query?.trim() ?? "";
	const filtered = filterTimelineEvents(events, query, filter);
	const index = getSelectedTimelineIndex(
		filtered.length,
		options.selectedIndex,
	);
	if (index === undefined) {
		return [
			"selected timeline none",
			`filter=${filter}`,
			query ? `search=${query}` : "",
		]
			.filter(Boolean)
			.join(" ");
	}
	const event = filtered[index];
	if (!event) {
		return [
			"selected timeline none",
			`filter=${filter}`,
			query ? `search=${query}` : "",
		]
			.filter(Boolean)
			.join(" ");
	}
	const kind = classifyTimelineEvent(event);
	return [
		`selected timeline ${index + 1}/${filtered.length}`,
		kind,
		query ? `search=${query}` : "",
		`[${event.time}]`,
		event.level.toUpperCase(),
		event.message,
	]
		.filter(Boolean)
		.join(" ");
}

export function getSelectedTimelineClipboardPreview(
	events: ConsoleEvent[],
	options: {
		filter?: TimelineFilter;
		query?: string;
		selectedIndex?: number;
	} = {},
): ClipboardPreview | undefined {
	const filter = options.filter ?? "all";
	const filtered = filterTimelineEvents(events, options.query, filter);
	const index = getSelectedTimelineIndex(
		filtered.length,
		options.selectedIndex,
	);
	if (index === undefined) {
		return undefined;
	}
	const event = filtered[index];
	if (!event) {
		return undefined;
	}
	const kind = classifyTimelineEvent(event);
	return createClipboardPreview({
		source: kind === "audit" ? "timeline-audit" : "timeline-event",
		label: `timeline ${kind} ${event.time}`,
		copyText: formatTimelineEvent(event, kind),
		details: [
			`filter=${filter}`,
			options.query?.trim() ? `query=${options.query.trim()}` : "",
			`eventId=${event.id}`,
		],
	});
}

export function getSelectedTimelineAuditExportPlan(
	events: ConsoleEvent[],
	options: {
		baseDir: string;
		filter?: TimelineFilter;
		generatedAt?: Date;
		origin?: FileOpenOrigin;
		query?: string;
		selectedIndex?: number;
	},
): ConsoleAuditExportPlan | undefined {
	const filter = options.filter ?? "all";
	const filtered = filterTimelineEvents(events, options.query, filter);
	const index = getSelectedTimelineIndex(
		filtered.length,
		options.selectedIndex,
	);
	if (index === undefined) {
		return undefined;
	}
	const event = filtered[index];
	if (!event) {
		return undefined;
	}
	return createConsoleAuditExportPlan([event], {
		baseDir: options.baseDir,
		generatedAt: options.generatedAt,
		origin: options.origin,
		query: options.query?.trim() || undefined,
		scope: "selected",
	});
}

export function createTimelineFocusEvidenceTrailPlan(
	events: ConsoleEvent[],
	options: {
		auditExportIndex: ConsoleAuditExportIndex;
		filter?: TimelineFilter;
		query?: string;
		selectedIndex?: number;
	},
): TimelineFocusEvidenceTrailPlan | undefined {
	const filter = options.filter ?? "all";
	const filtered = filterTimelineEvents(events, options.query, filter);
	const index = getSelectedTimelineIndex(
		filtered.length,
		options.selectedIndex,
	);
	const event = index === undefined ? undefined : filtered[index];
	if (!event) {
		return undefined;
	}
	const path = getQuotedTimelineField(event.message, "path");
	if (!path || !event.message.includes("status activity evidence focus")) {
		return undefined;
	}
	const selectedIndex = options.auditExportIndex.items.findIndex(
		(item) => item.path === path,
	);
	const item = options.auditExportIndex.items[selectedIndex];
	if (selectedIndex < 0 || !item) {
		return undefined;
	}
	return {
		kind: "audit",
		selectedIndex,
		itemCount: options.auditExportIndex.items.length,
		label: item.fileName,
		path: item.path,
		message: `timeline evidence trail audit ${selectedIndex + 1}/${options.auditExportIndex.items.length} ${item.fileName}`,
		rows: [
			`TIMELINE EVIDENCE TRAIL audit selected=${selectedIndex + 1}/${options.auditExportIndex.items.length}`,
			`> ${item.fileName}`,
			`path=${item.path}`,
			"controls=Status Evidence W=open Z=archive enter=open",
		],
	};
}

export function moveTimelineSelection(
	currentIndex: number,
	delta: number,
	length: number,
): number {
	if (length <= 0) {
		return 0;
	}
	return (currentIndex + delta + length) % length;
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

function getSelectedTimelineIndex(
	length: number,
	selectedIndex: number | undefined,
): number | undefined {
	if (length <= 0) {
		return undefined;
	}
	return Math.min(Math.max(selectedIndex ?? length - 1, 0), length - 1);
}

function formatTimelineSummary(
	countedEvents: ConsoleEvent[],
	visibleCount: number,
	totalCount: number,
	filter: TimelineFilter,
	query: string,
	presets: string[] | undefined,
	selectedIndex: number | undefined,
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
		selectedIndex === undefined
			? ""
			: `selected=${selectedIndex + 1}/${visibleCount}`,
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

function formatTimelineSelectionMarker(
	row: string,
	index: number,
	selectedIndex: number | undefined,
): string {
	if (selectedIndex === undefined) {
		return row;
	}
	return `${index === selectedIndex ? ">" : " "} ${row}`;
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

function getQuotedTimelineField(
	message: string,
	field: string,
): string | undefined {
	const match = new RegExp(`${field}="([^"]+)"`).exec(message);
	return match?.[1];
}
