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
import { clampIndex } from "./navigation";

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

export type TimelinePanelNotice = {
	level: "info" | "warn";
	message: string;
};

export type TimelineSearchTransition = {
	query: string;
	presets: string[];
	selectedIndex: number;
	notice: TimelinePanelNotice;
};

export type TimelinePanelInputDecision =
	| { kind: "no-op" }
	| { kind: "notice"; notice: TimelinePanelNotice }
	| {
			kind: "command";
			command: "search" | "cleanup" | "copy" | "export" | "evidence";
			notice?: TimelinePanelNotice;
	  }
	| {
			kind: "filter";
			filter: TimelineFilter;
			selectedIndex: number;
			notice: TimelinePanelNotice;
	  }
	| {
			kind: "search";
			query: string;
			selectedIndex: number;
			notice: TimelinePanelNotice;
	  }
	| {
			kind: "selection";
			selectedIndex: number;
			notice: TimelinePanelNotice;
	  }
	| {
			kind: "save-preset";
			presets: string[];
			notice: TimelinePanelNotice;
	  };

export function repairTimelineSelection(index: number, total: number): number {
	return clampIndex(index, total);
}

export function selectNewestTimelineResult(total: number): number {
	return clampIndex(total - 1, total);
}

export function resolveSelectedTimelineEvent(
	events: readonly ConsoleEvent[],
	selectedIndex: number,
): ConsoleEvent | undefined {
	if (!events.length) {
		return undefined;
	}
	return events[clampIndex(selectedIndex, events.length)];
}

export function prepareTimelineSearchTransition(input: {
	events: ConsoleEvent[];
	filter: TimelineFilter;
	presets: string[];
	query: string;
}): TimelineSearchTransition {
	const query = input.query.trim();
	const filtered = filterTimelineEvents(input.events, query, input.filter);
	return {
		query,
		presets: query
			? saveTimelineSearchPreset(input.presets, query)
			: input.presets,
		selectedIndex: selectNewestTimelineResult(filtered.length),
		notice: {
			level: filtered.length ? "info" : query ? "warn" : "info",
			message: query
				? `timeline search ${query} matches ${filtered.length}`
				: "timeline search cleared",
		},
	};
}

export function prepareTimelinePanelInput(input: {
	input: string;
	events: ConsoleEvent[];
	filter: TimelineFilter;
	query: string;
	presets: string[];
	selectedIndex: number;
}): TimelinePanelInputDecision {
	if (input.input === "t") {
		const filter = nextTimelineFilter(input.filter);
		const visible = filterTimelineEvents(input.events, input.query, filter);
		return {
			kind: "filter",
			filter,
			selectedIndex: selectNewestTimelineResult(visible.length),
			notice: { level: "info", message: `timeline filter ${filter}` },
		};
	}
	if (input.input === "f") {
		return {
			kind: "command",
			command: "search",
			notice: { level: "info", message: "timeline search opened" },
		};
	}
	if (input.input === "F") {
		const visible = filterTimelineEvents(input.events, "", input.filter);
		return {
			kind: "search",
			query: "",
			selectedIndex: selectNewestTimelineResult(visible.length),
			notice: { level: "info", message: "timeline search cleared" },
		};
	}
	if (input.input === "j" || input.input === "k") {
		const visible = filterTimelineEvents(
			input.events,
			input.query,
			input.filter,
		);
		if (!visible.length) {
			return {
				kind: "notice",
				notice: { level: "warn", message: "no timeline row to select" },
			};
		}
		const selectedIndex = moveTimelineSelection(
			input.selectedIndex,
			input.input === "j" ? 1 : -1,
			visible.length,
		);
		return {
			kind: "selection",
			selectedIndex,
			notice: {
				level: "info",
				message: `timeline selected ${selectedIndex + 1}/${visible.length}`,
			},
		};
	}
	if (input.input === "P") {
		const query = input.query.trim();
		return query
			? {
					kind: "save-preset",
					presets: saveTimelineSearchPreset(input.presets, query),
					notice: {
						level: "info",
						message: `timeline preset saved ${query}`,
					},
				}
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: "no timeline search to save",
					},
				};
	}
	if (input.input === "D") {
		const preview = createTimelineSearchCleanupPreview(input.presets);
		return preview
			? {
					kind: "command",
					command: "cleanup",
					notice: {
						level: "warn",
						message: `timeline search cleanup confirm ${preview.confirmationPhrase}`,
					},
				}
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: "no timeline search presets to clean",
					},
				};
	}
	if (input.input === "]") {
		const query = nextTimelineSearchPreset(input.presets, input.query);
		if (!query) {
			return {
				kind: "notice",
				notice: { level: "warn", message: "no timeline search presets" },
			};
		}
		const visible = filterTimelineEvents(input.events, query, input.filter);
		return {
			kind: "search",
			query,
			selectedIndex: selectNewestTimelineResult(visible.length),
			notice: {
				level: visible.length ? "info" : "warn",
				message: `timeline preset ${query} matches ${visible.length}`,
			},
		};
	}
	const commands = {
		c: "copy",
		e: "export",
		E: "evidence",
	} as const;
	const command = commands[input.input as keyof typeof commands];
	return command ? { kind: "command", command } : { kind: "no-op" };
}

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
				matchesTimelineSearch(timelineSearchText(event, kind), query),
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
			(!normalized ||
				matchesTimelineSearch(timelineSearchText(event, kind), normalized))
		);
	});
}

export function formatSelectedTimelinePreviewRow(
	events: ConsoleEvent[],
	options: {
		filter?: TimelineFilter;
		maxWidth?: number;
		query?: string;
		selectedIndex?: number;
		showRawSourceHint?: boolean;
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
		return clipSelectedTimelinePreviewRow(
			[
				"selected timeline none",
				`filter=${filter}`,
				query ? `search=${query}` : "",
			],
			options.maxWidth,
		);
	}
	const event = filtered[index];
	if (!event) {
		return clipSelectedTimelinePreviewRow(
			[
				"selected timeline none",
				`filter=${filter}`,
				query ? `search=${query}` : "",
			],
			options.maxWidth,
		);
	}
	const kind = classifyTimelineEvent(event);
	return clipSelectedTimelinePreviewRow(
		[
			`selected timeline ${index + 1}/${filtered.length}`,
			kind,
			query ? `search=${query}` : "",
			options.showRawSourceHint ? formatTimelineRawSourceHint() : "",
			`[${event.time}]`,
			event.level.toUpperCase(),
			event.message,
		],
		options.maxWidth,
	);
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
		return clampIndex(currentIndex, length);
	}
	const current = clampIndex(currentIndex, length);
	return clampIndex((current + delta + length) % length, length);
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
	return clampIndex(selectedIndex ?? length - 1, length);
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
		message.includes("editor save") ||
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

function matchesTimelineSearch(searchText: string, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	return (
		!normalized ||
		searchText.includes(normalized) ||
		normalized.split(/\s+/).every((part) => searchText.includes(part))
	);
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

function clipSelectedTimelinePreviewRow(
	parts: string[],
	maxWidth: number | undefined,
): string {
	const row = parts.filter(Boolean).join(" ");
	if (!maxWidth || maxWidth <= 0 || row.length <= maxWidth) {
		return row;
	}
	const recoveryHint = getTimelineRecoveryHint(row);
	if (recoveryHint && recoveryHint.length + 3 < maxWidth) {
		const headWidth = maxWidth - recoveryHint.length - 3;
		return `${row.slice(0, Math.max(1, headWidth))}… ${recoveryHint}`;
	}
	if (maxWidth === 1) {
		return "…";
	}
	return `${row.slice(0, Math.max(0, maxWidth - 1))}…`;
}

function getTimelineRecoveryHint(row: string): string | undefined {
	const match = /\bfix=[^"]+$/.exec(row);
	return match?.[0];
}

function formatTimelineRawSourceHint(): string {
	return "source=t raw c copy e export";
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
