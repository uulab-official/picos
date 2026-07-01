import { basename } from "node:path";
import {
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportPlan,
	createConsoleAuditExportPlan,
	writeConsoleAuditExport,
} from "../core/auditLog";
import { buildFileOpenPlan, type FileOpenPlan } from "../core/fileOpen";
import type { SupportedPlatform } from "../core/types";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import type {
	TimelineFilter,
	TimelineFocusEvidenceTrailPlan,
} from "./timelinePanel";

export type StatusActivityQueueInput = {
	releaseRows?: string[];
	dialogRows?: string[];
	cleanupRows?: string[];
	evidenceRows?: string[];
};

export type StatusActivitySource =
	| "release"
	| "dialog"
	| "cleanup"
	| "evidence"
	| "timeline";

export type StatusActivityEnterAction =
	| "cycle-release-link"
	| "show-dialog"
	| "jump-cleanup"
	| "enter-evidence"
	| "focus-evidence"
	| "timeline-evidence-trail"
	| "timeline-selected-copy"
	| "timeline-selected-export"
	| "filter-result-history"
	| "tools-evidence-archive"
	| "tools-evidence-retention"
	| "none";

export type StatusActivityEnterPlan = {
	source: StatusActivitySource;
	action: StatusActivityEnterAction;
	message: string;
};

export type StatusActivityResult = StatusActivityEnterPlan & {
	detail?: string;
};

export type StatusActivityResultHistoryFilter = "all" | "palette-result-jumps";

export type StatusActivityCopyIntentRecord = {
	label: string;
	copyText: string;
	selectedRow: number;
	expanded: boolean;
	lines: number;
	preview: string;
	auditMessage: string;
};

export type StatusActivityCopyIntentTimelineSearch = {
	filter: TimelineFilter;
	query: string;
	message: string;
};

type StatusActivityTimelineMessageSource = {
	message: string;
	time?: string;
};

export type StatusActivityResultAuditJumpReplayWarningSummary = {
	count: number;
	latestTime?: string;
	latestMessage: string;
};

export type StatusActivityCopyIntentEvidenceFocusPlan = {
	kind: "audit";
	selectedIndex: number;
	itemCount: number;
	shortcut: "w";
	label: string;
	path: string;
	message: string;
};

export type TimelineEvidenceTrailSourceFilter = "all" | "evidence" | "palette";

type StatusActivityQueueSource = {
	key: StatusActivitySource;
	prefix: string;
	rows?: string[];
};

const STATUS_ACTIVITY_QUEUE_SOURCES: StatusActivityQueueSource[] = [
	{
		key: "release",
		prefix: "STATUS RELEASE CONSOLE",
	},
	{
		key: "dialog",
		prefix: "STATUS DIALOG PREVIEW",
	},
	{
		key: "cleanup",
		prefix: "CLEANUP OPS",
	},
	{
		key: "evidence",
		prefix: "STATUS EVIDENCE SUMMARY",
	},
];

const STATUS_ACTIVITY_QUEUE_CONTROLS =
	"controls=Status queue scans release/dialog/cleanup/evidence; open panels for detail";
const STATUS_ACTIVITY_DETAIL_CONTROLS =
	"controls=enter action · ,/. activity source · detail mirrors selected Status console";

export function formatStatusActivityQueueRows(
	input: StatusActivityQueueInput,
): string[] {
	const entries = getStatusActivityEntries(input);
	const sources =
		entries.length > 0 ? entries.map((entry) => entry.key).join(",") : "none";
	if (entries.length === 0) {
		return [
			"STATUS ACTIVITY QUEUE active=0 sources=none",
			"no Status activity yet",
			STATUS_ACTIVITY_QUEUE_CONTROLS,
		];
	}
	return [
		`STATUS ACTIVITY QUEUE active=${entries.length} sources=${sources}`,
		...entries.map((entry, index) => {
			const marker = index === 0 ? "> " : "  ";
			return `${marker}${entry.key} ${entry.row}`;
		}),
		STATUS_ACTIVITY_QUEUE_CONTROLS,
	];
}

export function formatStatusActivityDetailRows(
	input: StatusActivityQueueInput,
	selectedSource: StatusActivitySource,
): string[] {
	const activeSource = getActiveStatusActivitySource(input, selectedSource);
	if (!activeSource) {
		return [
			"STATUS ACTIVITY DETAIL active=none rows=0",
			"no Status activity detail",
			STATUS_ACTIVITY_DETAIL_CONTROLS,
		];
	}
	const rows = getSourceRows(input, activeSource);
	return [
		`STATUS ACTIVITY DETAIL active=${activeSource} rows=${rows.length}`,
		...rows.slice(0, 3).map((row, index) => {
			const marker = index === 0 ? "> " : "  ";
			return `${marker}${normalizeActivityDetailRow(row)}`;
		}),
		STATUS_ACTIVITY_DETAIL_CONTROLS,
	];
}

export function moveStatusActivitySource(
	input: StatusActivityQueueInput,
	selectedSource: StatusActivitySource,
	delta: number,
): StatusActivitySource {
	const entries = getStatusActivityEntries(input);
	if (entries.length === 0) {
		return selectedSource;
	}
	const currentIndex = entries.findIndex(
		(entry) => entry.key === selectedSource,
	);
	const startIndex = currentIndex >= 0 ? currentIndex : 0;
	const nextIndex =
		(startIndex + delta + entries.length * Math.abs(delta || 1)) %
		entries.length;
	return entries[nextIndex]?.key ?? selectedSource;
}

export function createStatusActivityEnterPlan(
	input: StatusActivityQueueInput,
	selectedSource: StatusActivitySource,
): StatusActivityEnterPlan {
	const source = getActiveStatusActivitySource(input, selectedSource);
	if (!source) {
		return {
			source: selectedSource,
			action: "none",
			message: "no Status activity available",
		};
	}
	switch (source) {
		case "release":
			return {
				source,
				action: "cycle-release-link",
				message: "release activity selected; cycling release handoff link",
			};
		case "dialog":
			return {
				source,
				action: "show-dialog",
				message: "dialog activity selected; type the exact confirmation phrase",
			};
		case "cleanup":
			return {
				source,
				action: "jump-cleanup",
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			};
		case "evidence":
			return {
				source,
				action: "enter-evidence",
				message: "evidence activity selected; running active evidence enter",
			};
		case "timeline":
			return {
				source,
				action: "none",
				message: "timeline activity is available in result history",
			};
	}
}

export function formatStatusActivityResultRows(
	result?: StatusActivityResult,
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord,
	auditJumpIntentCount = 0,
): string[] {
	if (!result) {
		return [
			"STATUS ACTIVITY RESULT source=none action=none",
			"no Status activity action yet",
		];
	}
	return [
		`STATUS ACTIVITY RESULT source=${result.source} action=${result.action}`,
		`> ${result.message}`,
		...(result.detail ? [`  ${result.detail}`] : []),
		...formatStatusActivityResultAuditJumpIntentRows(
			latestAuditJumpIntent,
			"  ",
			auditJumpIntentCount,
		),
	];
}

export function appendStatusActivityResultHistory(
	history: StatusActivityResult[],
	result: StatusActivityResult,
	limit = 3,
): StatusActivityResult[] {
	return [result, ...history].slice(0, Math.max(1, limit));
}

export function formatStatusActivityResultHistoryRows(
	history: StatusActivityResult[],
	selectedIndex = 0,
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord,
	auditJumpIntentCount = 0,
	filter: StatusActivityResultHistoryFilter = "all",
): string[] {
	if (history.length === 0) {
		return [
			"STATUS ACTIVITY RESULT HISTORY count=0",
			"no Status activity result history yet",
		];
	}
	if (filter !== "all") {
		const indexes = filterStatusActivityResultHistoryIndexes(history, filter);
		if (indexes.length === 0) {
			return [
				`STATUS ACTIVITY RESULT HISTORY count=${history.length} visible=0 filter=${filter}`,
				`no Status activity result history for filter=${filter}`,
				"controls=f result filter · u/i filtered history",
			];
		}
		const selected = getSelectedStatusActivityResultHistoryIndex(
			history.length,
			selectedIndex,
		);
		const selectedFilteredIndex = Math.max(0, indexes.indexOf(selected));
		return [
			`STATUS ACTIVITY RESULT HISTORY count=${history.length} visible=${indexes.length} filter=${filter} selected=${selectedFilteredIndex + 1}/${indexes.length}`,
			...indexes.flatMap((historyIndex, index) => {
				const result = history[historyIndex] as StatusActivityResult;
				const marker = index === selectedFilteredIndex ? "> " : "  ";
				const rows = [
					`${marker}#${historyIndex + 1} ${result.source} ${result.action} ${result.message}`,
				];
				if (result.detail) {
					rows.push(`    ${result.detail}`);
				}
				if (index === selectedFilteredIndex) {
					rows.push(
						...formatStatusActivityResultAuditJumpIntentRows(
							latestAuditJumpIntent,
							"    ",
							auditJumpIntentCount,
						),
					);
				}
				return rows;
			}),
			"controls=f result filter · u/i filtered history",
		];
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	return [
		`STATUS ACTIVITY RESULT HISTORY count=${history.length} selected=${selected + 1}/${history.length}`,
		...history.flatMap((result, index) => {
			const marker = index === selected ? "> " : "  ";
			const rows = [
				`${marker}${result.source} ${result.action} ${result.message}`,
			];
			if (result.detail) {
				rows.push(`    ${result.detail}`);
			}
			if (index === selected) {
				rows.push(
					...formatStatusActivityResultAuditJumpIntentRows(
						latestAuditJumpIntent,
						"    ",
						auditJumpIntentCount,
					),
				);
			}
			return rows;
		}),
	];
}

export function nextStatusActivityResultHistoryFilter(
	filter: StatusActivityResultHistoryFilter,
): StatusActivityResultHistoryFilter {
	return filter === "all" ? "palette-result-jumps" : "all";
}

export function filterStatusActivityResultHistoryIndexes(
	history: StatusActivityResult[],
	filter: StatusActivityResultHistoryFilter,
): number[] {
	if (filter === "all") {
		return history.map((_, index) => index);
	}
	return history.reduce<number[]>((indexes, result, index) => {
		if (isPaletteStatusActivityResultJump(result)) {
			indexes.push(index);
		}
		return indexes;
	}, []);
}

export function moveStatusActivityResultHistoryFilteredSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	direction: "next" | "previous",
	filter: StatusActivityResultHistoryFilter,
): number {
	if (filter === "all") {
		return moveStatusActivityResultHistorySelection(
			history,
			selectedIndex,
			direction,
		);
	}
	const indexes = filterStatusActivityResultHistoryIndexes(history, filter);
	if (indexes.length === 0) {
		return getSelectedStatusActivityResultHistoryIndex(
			history.length,
			selectedIndex,
		);
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const current = indexes.indexOf(selected);
	if (current < 0) {
		return direction === "next"
			? (indexes[0] as number)
			: (indexes[indexes.length - 1] as number);
	}
	const delta = direction === "next" ? 1 : -1;
	return indexes[(current + delta + indexes.length) % indexes.length] as number;
}

export function getStatusActivityResultHistoryFilteredSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	filter: StatusActivityResultHistoryFilter,
): number {
	if (filter === "all") {
		return getSelectedStatusActivityResultHistoryIndex(
			history.length,
			selectedIndex,
		);
	}
	const indexes = filterStatusActivityResultHistoryIndexes(history, filter);
	if (indexes.length === 0) {
		return getSelectedStatusActivityResultHistoryIndex(
			history.length,
			selectedIndex,
		);
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	return indexes.includes(selected) ? selected : (indexes[0] as number);
}

export function createStatusActivityResultHistoryFilterPaletteResult(
	filter: StatusActivityResultHistoryFilter,
	options: {
		total?: number;
		visible?: number;
	} = {},
): StatusActivityResult {
	const total = Math.max(0, Math.floor(options.total ?? 0));
	const visible = Math.max(0, Math.floor(options.visible ?? 0));
	return {
		source: "timeline",
		action: "filter-result-history",
		message: `palette status result filter ${filter} visible=${visible}/${total}`,
		detail: `result history filter changed to ${filter}`,
	};
}

function isPaletteStatusActivityResultJump(
	result: StatusActivityResult,
): boolean {
	return (
		result.source === "timeline" &&
		result.action === "timeline-selected-copy" &&
		result.message.startsWith("palette status result jump ")
	);
}

function formatStatusActivityResultAuditJumpIntentRows(
	intent: StatusActivityCopyIntentRecord | undefined,
	prefix: string,
	count = 0,
): string[] {
	if (!intent) {
		return [];
	}
	const countSuffix = count > 1 ? ` count=${count}` : "";
	return [
		`${prefix}audit jump intent=${intent.preview} lines=${intent.lines}${countSuffix}`,
	];
}

export function moveStatusActivityResultHistorySelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (history.length === 0) {
		return 0;
	}
	const current = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + history.length) % history.length;
}

export function getSelectedStatusActivityResultHistoryClipboardPreview(
	history: StatusActivityResult[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const index = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const result = history[index];
	if (!result) {
		return undefined;
	}
	return createClipboardPreview({
		source: "status-activity",
		label: `status activity ${result.source} ${result.action}`,
		copyText: [
			`${result.source} ${result.action}`,
			result.message,
			result.detail,
		]
			.filter(Boolean)
			.join("\n"),
		details: [`selected=${index + 1}/${history.length}`],
	});
}

export function formatStatusActivityResultCopyPreviewRows(
	preview?: ClipboardPreview,
	options: {
		selectedRowIndex?: number;
		expanded?: boolean;
	} = {},
): string[] {
	if (!preview) {
		return [
			"STATUS ACTIVITY COPY PREVIEW source=none",
			"no Status activity copy preview",
			"controls=y copy selected history",
		];
	}
	const details = getStatusActivityCopyPreviewRows(preview, options.expanded);
	const selected = getSelectedStatusActivityCopyPreviewIndex(
		details.length,
		options.selectedRowIndex ?? 0,
	);
	return [
		`STATUS ACTIVITY COPY PREVIEW source=${preview.source} selected=${selected + 1}/${details.length} expanded=${Boolean(options.expanded)}`,
		...details.map((row, index) => `${index === selected ? "> " : "  "}${row}`),
		"controls=; row · = expand · y copy selected history · I audit jump · :clipboard confirm=copy locked",
	];
}

export function moveStatusActivityCopyPreviewSelection(
	preview: ClipboardPreview | undefined,
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (!preview) {
		return 0;
	}
	const rows = getStatusActivityCopyPreviewRows(preview, true);
	if (rows.length === 0) {
		return 0;
	}
	const current = getSelectedStatusActivityCopyPreviewIndex(
		rows.length,
		selectedIndex,
	);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + rows.length) % rows.length;
}

export function formatStatusActivityCopyIntentAuditMessage(
	preview?: ClipboardPreview,
	options: {
		selectedRowIndex?: number;
		expanded?: boolean;
	} = {},
): string {
	if (!preview) {
		return "clipboard intent status-activity unavailable";
	}
	const copyLines = preview.copyText.split(/\r?\n/);
	const previewText = copyLines[0] ?? "";
	return [
		"clipboard intent status-activity",
		`label="${preview.label}"`,
		`selectedRow=${Math.max(0, Math.floor(options.selectedRowIndex ?? 0)) + 1}`,
		`expanded=${Boolean(options.expanded)}`,
		`lines=${copyLines.length}`,
		`preview="${previewText}"`,
	].join(" ");
}

export function createStatusActivityCopyIntentRecord(
	preview?: ClipboardPreview,
	options: {
		selectedRowIndex?: number;
		expanded?: boolean;
	} = {},
): StatusActivityCopyIntentRecord | undefined {
	if (!preview) {
		return undefined;
	}
	const copyLines = preview.copyText.split(/\r?\n/);
	return {
		label: preview.label,
		copyText: preview.copyText,
		selectedRow: Math.max(0, Math.floor(options.selectedRowIndex ?? 0)) + 1,
		expanded: Boolean(options.expanded),
		lines: copyLines.length,
		preview: copyLines[0] ?? "",
		auditMessage: formatStatusActivityCopyIntentAuditMessage(preview, options),
	};
}

export function appendStatusActivityCopyIntentHistory(
	history: StatusActivityCopyIntentRecord[],
	record: StatusActivityCopyIntentRecord | undefined,
	limit = 5,
): StatusActivityCopyIntentRecord[] {
	if (!record) {
		return history;
	}
	return [record, ...history].slice(0, Math.max(1, limit));
}

export function formatStatusActivityCopyIntentRows(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex = 0,
	latestExport?: ConsoleAuditExportPlan,
	latestExportEvidenceIndex?: number,
	latestTimelineTrailExport?: ConsoleAuditExportPlan,
	timelineTrailExports: ConsoleAuditExportPlan[] = latestTimelineTrailExport
		? [latestTimelineTrailExport]
		: [],
	selectedTimelineTrailIndex = 0,
	timelineTrailSourceFilter: TimelineEvidenceTrailSourceFilter = "all",
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord,
	auditJumpIntentCount = 0,
	auditJumpActionHint?: "fresh" | "replay",
	selectedAuditJumpIndex = 0,
	staleReplayWarningSummary?: StatusActivityResultAuditJumpReplayWarningSummary,
	freshResultJump?: StatusActivityCopyIntentTimelineSearch,
	freshResultJumpSelectedIndex = 0,
	freshResultJumpCount = freshResultJump ? 1 : 0,
): string[] {
	const exportRows = latestExport
		? [
				`z target=${basename(latestExport.path)}${latestExportEvidenceIndex !== undefined ? ` evidence=${latestExportEvidenceIndex + 1}` : ""}${latestExport.query ? ` query=${latestExport.query}` : ""} events=${latestExport.eventCount}`,
			]
		: [];
	const auditJumpIntents = getStatusActivityResultAuditJumpIntents(history);
	const selectedAuditJumpIntentFromHistory =
		getSelectedStatusActivityResultAuditJumpIntent(
			history,
			selectedAuditJumpIndex,
		);
	const selectedAuditJumpIntent =
		selectedAuditJumpIntentFromHistory ?? latestAuditJumpIntent;
	const replaySource =
		auditJumpActionHint === "replay"
			? selectedAuditJumpIntentFromHistory
				? "selected"
				: "latest"
			: undefined;
	const replayValidity =
		auditJumpActionHint === "replay"
			? getStatusActivityResultAuditJumpReplayValidity(selectedAuditJumpIntent)
			: undefined;
	const replayRecoveryHint =
		replayValidity === "stale" ? " fix=P audit jump/new result" : "";
	const auditJumpTotal = auditJumpIntents.length || auditJumpIntentCount;
	const selectedAuditJump =
		auditJumpIntents.length > 1
			? getNormalizedSelectionIndex(
					auditJumpIntents.length,
					selectedAuditJumpIndex,
				)
			: undefined;
	const auditJumpRows =
		selectedAuditJumpIntent && auditJumpTotal > 0
			? [
					`audit jumps count=${auditJumpTotal}${selectedAuditJump !== undefined ? ` selected=${selectedAuditJump + 1}/${auditJumpIntents.length}` : ""}${formatStatusActivityResultAuditJumpTargetToken(selectedAuditJumpIntent)} latest=${selectedAuditJumpIntent.preview} lines=${selectedAuditJumpIntent.lines}${auditJumpActionHint ? ` I=${auditJumpActionHint}` : ""}${replaySource ? ` replay=${replaySource}` : ""}${replayValidity ? ` ${replayValidity}` : ""}${replayRecoveryHint}`,
				]
			: [];
	const filteredTimelineTrailExports = filterTimelineEvidenceTrailAuditExports(
		timelineTrailExports,
		timelineTrailSourceFilter,
	);
	const selectedTimelineTrailExport =
		getSelectedTimelineEvidenceTrailAuditExport(
			filteredTimelineTrailExports,
			selectedTimelineTrailIndex,
			timelineTrailSourceFilter === "all"
				? latestTimelineTrailExport
				: undefined,
		);
	const normalizedTimelineTrailIndex = getNormalizedSelectionIndex(
		filteredTimelineTrailExports.length,
		selectedTimelineTrailIndex,
	);
	const timelineTrailSourceRows =
		timelineTrailExports.length > 1 || timelineTrailSourceFilter !== "all"
			? [
					`trail source=${timelineTrailSourceFilter} visible=${filteredTimelineTrailExports.length}/${timelineTrailExports.length}`,
				]
			: [];
	const timelineTrailRows = selectedTimelineTrailExport
		? [
				...timelineTrailSourceRows,
				...(filteredTimelineTrailExports.length > 1
					? [
							`trail selected=${normalizedTimelineTrailIndex + 1}/${filteredTimelineTrailExports.length}`,
						]
					: []),
				`trail target=${basename(selectedTimelineTrailExport.path)}${selectedTimelineTrailExport.query ? ` query=${selectedTimelineTrailExport.query}` : ""} events=${selectedTimelineTrailExport.eventCount}`,
				`trail detail source=${getTimelineEvidenceTrailExportSource(selectedTimelineTrailExport)} path=${selectedTimelineTrailExport.path} actions=L open N search`,
			]
		: timelineTrailSourceRows.length > 0
			? [
					...timelineTrailSourceRows,
					`no recovered Timeline Evidence trail exports for source=${timelineTrailSourceFilter}`,
				]
			: [];
	const rowsBeforeHistory = [
		...exportRows,
		...(freshResultJump && auditJumpActionHint === "fresh"
			? [
					`result jump target=filter:${freshResultJump.filter} query=${freshResultJump.query}${freshResultJumpCount > 1 ? ` selected=${getNormalizedSelectionIndex(freshResultJumpCount, freshResultJumpSelectedIndex) + 1}/${freshResultJumpCount}` : ""} I=fresh`,
				]
			: []),
		...auditJumpRows,
		...formatStatusActivityResultAuditJumpReplayWarningSummaryRows(
			staleReplayWarningSummary,
		),
		...timelineTrailRows,
	];
	const canFilterTimelineTrails =
		timelineTrailExports.length > 1 || timelineTrailSourceFilter !== "all";
	const trailControlParts = [
		...(selectedTimelineTrailExport ? ["L open trail", "N trail search"] : []),
		...(filteredTimelineTrailExports.length > 1 ? ["S trail select"] : []),
		...(canFilterTimelineTrails ? ["Q trail source"] : []),
		...(selectedTimelineTrailExport ? ["trail recovered"] : []),
	];
	const trailControls =
		trailControlParts.length > 0 ? ` · ${trailControlParts.join(" · ")}` : "";
	const resultJumpControls =
		freshResultJumpCount > 1 ? " · J result select" : "";
	const controls = `controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export${trailControls}${resultJumpControls} · g Timeline audit search`;
	if (history.length === 0) {
		return [
			"STATUS ACTIVITY COPY INTENTS count=0",
			...rowsBeforeHistory,
			"no Status activity copy intents yet",
			controls,
		];
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	return [
		`STATUS ACTIVITY COPY INTENTS count=${history.length} selected=${selected + 1}/${history.length}`,
		...rowsBeforeHistory,
		...history.map((record, index) => {
			const marker = index === selected ? "> " : "  ";
			return `${marker}${record.label} row=${record.selectedRow} expanded=${record.expanded} lines=${record.lines} preview=${record.preview}`;
		}),
		`${controls} · :clipboard confirm=copy locked`,
	];
}

function formatStatusActivityResultAuditJumpTargetToken(
	intent: StatusActivityCopyIntentRecord,
): string {
	const match = intent.preview.match(
		/^action=source source=(\S+) visible=(\S+)$/,
	);
	if (!match) {
		return "";
	}
	const [, source, visible] = match;
	return ` target=source:${source} visible:${visible}`;
}

function getStatusActivityResultAuditJumpReplayValidity(
	intent: StatusActivityCopyIntentRecord | undefined,
): "valid" | "stale" | undefined {
	if (!intent) {
		return undefined;
	}
	if (!intent.label.startsWith("status activity result audit jump ")) {
		return "stale";
	}
	const [query, , filterLine] = intent.copyText.split(/\r?\n/);
	return query && filterLine === "filter=audit" ? "valid" : "stale";
}

export function getStatusActivityResultAuditJumpIntents(
	history: StatusActivityCopyIntentRecord[],
): StatusActivityCopyIntentRecord[] {
	return history.filter((record) =>
		record.label.startsWith("status activity result audit jump "),
	);
}

export function getSelectedStatusActivityResultAuditJumpIntent(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
): StatusActivityCopyIntentRecord | undefined {
	const auditJumps = getStatusActivityResultAuditJumpIntents(history);
	const selected = getNormalizedSelectionIndex(
		auditJumps.length,
		selectedIndex,
	);
	return auditJumps[selected];
}

export function moveStatusActivityResultAuditJumpSelection(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	const auditJumps = getStatusActivityResultAuditJumpIntents(history);
	if (auditJumps.length === 0) {
		return 0;
	}
	const current = getNormalizedSelectionIndex(auditJumps.length, selectedIndex);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + auditJumps.length) % auditJumps.length;
}

export function getStatusActivityResultTimelineJumpIndexes(
	history: StatusActivityResult[],
): number[] {
	return history
		.map((_, index) => index)
		.filter((index) =>
			Boolean(createStatusActivityResultTimelineSearch(history, index)),
		);
}

export function getStatusActivityResultTimelineJumpSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
): { selectedIndex: number; total: number } | undefined {
	const indexes = getStatusActivityResultTimelineJumpIndexes(history);
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const selectedJumpIndex = indexes.indexOf(selected);
	if (selectedJumpIndex < 0) {
		return undefined;
	}
	return {
		selectedIndex: selectedJumpIndex,
		total: indexes.length,
	};
}

export function formatStatusActivityResultTimelineJumpRows(
	history: StatusActivityResult[],
	selectedIndex: number,
	visibleRows = 3,
): string[] {
	const paletteHint =
		"palette=? result jump · timeline result open · result select";
	const indexes = getStatusActivityResultTimelineJumpIndexes(history);
	if (indexes.length === 0) {
		return [
			"STATUS RESULT TIMELINE JUMPS count=0",
			paletteHint,
			"no Timeline result jumps yet",
		];
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const selectedJumpIndex = Math.max(0, indexes.indexOf(selected));
	const safeVisibleRows = Math.max(1, Math.floor(visibleRows));
	const start = Math.min(
		Math.max(0, selectedJumpIndex - safeVisibleRows + 1),
		Math.max(0, indexes.length - safeVisibleRows),
	);
	const visibleIndexes = indexes.slice(start, start + safeVisibleRows);
	const rows = visibleIndexes.map((historyIndex) => {
		const jump = createStatusActivityResultTimelineSearch(
			history,
			historyIndex,
		);
		const result = history[historyIndex];
		const marker = historyIndex === selected ? "> " : "  ";
		return `${marker}#${historyIndex + 1} filter=${jump?.filter ?? "unknown"} query=${jump?.query ?? "unknown"} action=${result?.action ?? "unknown"}`;
	});
	return [
		`STATUS RESULT TIMELINE JUMPS count=${indexes.length} selected=${selectedJumpIndex + 1}/${indexes.length}`,
		paletteHint,
		...rows,
		"controls=J select result jump · I open selected Timeline result",
	];
}

export function moveStatusActivityResultTimelineJumpSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	const indexes = getStatusActivityResultTimelineJumpIndexes(history);
	if (indexes.length === 0) {
		return getSelectedStatusActivityResultHistoryIndex(
			history.length,
			selectedIndex,
		);
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const current = indexes.indexOf(selected);
	const normalizedCurrent =
		current >= 0 ? current : direction === "next" ? -1 : 0;
	const delta = direction === "next" ? 1 : -1;
	return indexes[
		(normalizedCurrent + delta + indexes.length) % indexes.length
	] as number;
}

export function moveStatusActivityCopyIntentSelection(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (history.length === 0) {
		return 0;
	}
	const current = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + history.length) % history.length;
}

export function getSelectedTimelineEvidenceTrailAuditExport(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
	fallback?: ConsoleAuditExportPlan,
): ConsoleAuditExportPlan | undefined {
	if (exports.length === 0) {
		return fallback;
	}
	return exports[getNormalizedSelectionIndex(exports.length, selectedIndex)];
}

export function moveTimelineEvidenceTrailSelection(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (exports.length === 0) {
		return 0;
	}
	const current = getNormalizedSelectionIndex(exports.length, selectedIndex);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + exports.length) % exports.length;
}

export function filterTimelineEvidenceTrailAuditExports(
	exports: ConsoleAuditExportPlan[],
	filter: TimelineEvidenceTrailSourceFilter,
): ConsoleAuditExportPlan[] {
	if (filter === "all") {
		return exports;
	}
	return exports.filter(
		(item) => getTimelineEvidenceTrailExportSource(item) === filter,
	);
}

export function nextTimelineEvidenceTrailSourceFilter(
	filter: TimelineEvidenceTrailSourceFilter,
): TimelineEvidenceTrailSourceFilter {
	switch (filter) {
		case "all":
			return "evidence";
		case "evidence":
			return "palette";
		case "palette":
			return "all";
	}
}

export function createStatusActivityCopyIntentTimelineSearch(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const record = history[selected];
	if (!record) {
		return undefined;
	}
	return {
		filter: "audit",
		query: record.label,
		message: `status activity copy intent timeline search ${record.label}`,
	};
}

export function createStatusActivityResultTimelineSearch(
	history: StatusActivityResult[],
	selectedIndex: number,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const result = history[selected];
	if (!result) {
		return undefined;
	}
	if (
		result.source === "timeline" &&
		(result.action === "timeline-selected-copy" ||
			result.action === "timeline-selected-export")
	) {
		return createTimelineSelectedResultTimelineSearch(result);
	}
	if (
		result.source !== "evidence" ||
		result.action !== "timeline-evidence-trail"
	) {
		return undefined;
	}
	const match = result.message.match(
		/^palette timeline trail source (all|evidence|palette) visible=(\d+\/\d+)$/,
	);
	if (!match) {
		return undefined;
	}
	const [, sourceFilter, visible] = match;
	return {
		filter: "audit",
		query: `action=source source=${sourceFilter} visible=${visible}`,
		message: `status activity result timeline search palette source ${sourceFilter} visible=${visible}`,
	};
}

function createTimelineSelectedResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const filter = getTimelineSelectedResultFilter(result.detail);
	const query =
		getTimelineSelectedResultDetailValue(result.detail, "search") ??
		getTimelineSelectedResultLabel(result.message);
	if (!filter || !query) {
		return undefined;
	}
	const action = result.action === "timeline-selected-copy" ? "copy" : "export";
	return {
		filter,
		query,
		message: `status activity result timeline search timeline selected ${action} filter=${filter} query=${query}`,
	};
}

function getTimelineSelectedResultFilter(
	detail?: string,
): TimelineFilter | undefined {
	const filter = getTimelineSelectedResultDetailValue(detail, "filter");
	if (
		filter === "all" ||
		filter === "network" ||
		filter === "audit" ||
		filter === "action" ||
		filter === "raw"
	) {
		return filter;
	}
	return undefined;
}

function getTimelineSelectedResultLabel(message: string): string | undefined {
	const match = message.match(
		/^timeline selected (?:copy|export) \d+\/\d+ (.+)$/,
	);
	return match?.[1]?.trim() || undefined;
}

function getTimelineSelectedResultDetailValue(
	detail: string | undefined,
	key: "filter" | "search" | "path",
): string | undefined {
	if (!detail) {
		return undefined;
	}
	const token = `${key}=`;
	const start = detail.indexOf(token);
	if (start < 0) {
		return undefined;
	}
	const valueStart = start + token.length;
	const stop = [" filter=", " search=", " controls=", " path="]
		.map((marker) => detail.indexOf(marker, valueStart))
		.filter((index) => index >= 0)
		.sort((left, right) => left - right)[0];
	return detail.slice(valueStart, stop ?? detail.length).trim() || undefined;
}

export function createStatusActivityResultTimelineSearchReplay(
	history: StatusActivityResult[],
	selectedIndex: number,
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord,
	selectedAuditJumpIntent?: StatusActivityCopyIntentRecord,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const selectedJump = createStatusActivityResultTimelineSearch(
		history,
		selectedIndex,
	);
	if (selectedJump) {
		return selectedJump;
	}
	const replaySource = selectedAuditJumpIntent ? "selected" : "latest";
	const replayIntent = selectedAuditJumpIntent ?? latestAuditJumpIntent;
	if (
		!replayIntent ||
		getStatusActivityResultAuditJumpReplayValidity(replayIntent) !== "valid"
	) {
		return undefined;
	}
	const [query, , filterLine] = replayIntent.copyText.split(/\r?\n/);
	if (!query || filterLine !== "filter=audit") {
		return undefined;
	}
	return {
		filter: "audit",
		query,
		message: `status activity result audit jump replay ${replaySource} ${query}`,
	};
}

export function createStatusActivityResultTimelineSearchReplayWarning(
	history: StatusActivityResult[],
	selectedIndex: number,
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord,
	selectedAuditJumpIntent?: StatusActivityCopyIntentRecord,
): string {
	const selectedJump = createStatusActivityResultTimelineSearch(
		history,
		selectedIndex,
	);
	if (selectedJump) {
		return "no status activity result audit jump";
	}
	const replayIntent = selectedAuditJumpIntent ?? latestAuditJumpIntent;
	const recoveryHint =
		getStatusActivityResultAuditJumpReplayValidity(replayIntent) === "stale"
			? " fix=P audit jump/new result"
			: "";
	return `no status activity result audit jump${recoveryHint}`;
}

export function formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
	warning = "no status activity result audit jump",
): string {
	return `status activity result audit jump warning ${warning}`;
}

export function createStatusActivityResultAuditJumpReplayWarningSummary(
	events: StatusActivityTimelineMessageSource[],
): StatusActivityResultAuditJumpReplayWarningSummary | undefined {
	const warnings = events.filter((event) =>
		isStatusActivityResultAuditJumpStaleReplayWarning(event.message),
	);
	const latest = warnings.at(-1);
	if (!latest) {
		return undefined;
	}
	return {
		count: warnings.length,
		...(latest.time ? { latestTime: latest.time } : {}),
		latestMessage: latest.message,
	};
}

export function createStatusActivityResultAuditJumpReplayWarningTimelineSearch(
	events: StatusActivityTimelineMessageSource[],
): StatusActivityCopyIntentTimelineSearch | undefined {
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const message = events[index]?.message ?? "";
		if (isStatusActivityResultAuditJumpStaleReplayWarning(message)) {
			return {
				filter: "audit",
				query: message,
				message:
					"status activity result audit jump warning timeline search fix=P audit jump/new result",
			};
		}
	}
	return undefined;
}

function formatStatusActivityResultAuditJumpReplayWarningSummaryRows(
	summary?: StatusActivityResultAuditJumpReplayWarningSummary,
): string[] {
	if (!summary) {
		return [];
	}
	return [
		`stale warnings count=${summary.count}${summary.latestTime ? ` latest=${summary.latestTime}` : ""} K search`,
	];
}

function isStatusActivityResultAuditJumpStaleReplayWarning(
	message: string,
): boolean {
	return (
		message.startsWith("status activity result audit jump warning ") &&
		message.includes("fix=P audit jump/new result")
	);
}

export function createStatusActivityResultTimelineSearchIntent(
	jump?: StatusActivityCopyIntentTimelineSearch,
): StatusActivityCopyIntentRecord | undefined {
	if (!jump) {
		return undefined;
	}
	return createStatusActivityCopyIntentRecord(
		createClipboardPreview({
			source: "status-activity",
			label: `status activity result audit jump ${jump.query}`,
			copyText: [jump.query, jump.message, `filter=${jump.filter}`].join("\n"),
		}),
	);
}

export function getLatestStatusActivityResultAuditJumpIntent(
	history: StatusActivityCopyIntentRecord[],
): StatusActivityCopyIntentRecord | undefined {
	return history.find((record) =>
		record.label.startsWith("status activity result audit jump "),
	);
}

export function getStatusActivityResultAuditJumpIntentCount(
	history: StatusActivityCopyIntentRecord[],
): number {
	return history.filter((record) =>
		record.label.startsWith("status activity result audit jump "),
	).length;
}

export function createTimelineEvidenceTrailTimelineSearch(
	plan?: ConsoleAuditExportPlan,
): StatusActivityCopyIntentTimelineSearch | undefined {
	if (!plan?.query) {
		return undefined;
	}
	return {
		filter: "audit",
		query: plan.query,
		message: `timeline evidence trail recovered search ${basename(plan.path)}`,
	};
}

export function getSelectedStatusActivityCopyIntentClipboardPreview(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const record = history[selected];
	if (!record) {
		return undefined;
	}
	return createClipboardPreview({
		source: "status-activity",
		label: record.label,
		copyText: record.copyText,
		details: [
			`copy-intent selected=${selected + 1}/${history.length}`,
			`row=${record.selectedRow} expanded=${record.expanded} lines=${record.lines}`,
		],
	});
}

export function createStatusActivityCopyIntentAuditExportPlan(
	history: StatusActivityCopyIntentRecord[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
	},
): ConsoleAuditExportPlan | undefined {
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const record = history[selected];
	if (!record) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	return createConsoleAuditExportPlan(
		[
			{
				id: `status-activity-copy-intent-${selected + 1}`,
				level: "info",
				time: formatAuditEventTime(generatedAt),
				message: record.auditMessage,
			},
		],
		{
			baseDir: options.baseDir,
			generatedAt,
			query: record.label,
			scope: "selected",
		},
	);
}

export async function writeStatusActivityCopyIntentAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	return writeConsoleAuditExport(plan);
}

export function createStatusActivityCopyIntentAuditExportOpenPlan(
	plan: ConsoleAuditExportPlan,
	options: {
		baseDir: string;
		platform: SupportedPlatform;
	},
): FileOpenPlan {
	return buildFileOpenPlan({
		baseDir: options.baseDir,
		label: `status activity copy intent export ${plan.scope} ${plan.query}`,
		path: plan.path,
		platform: options.platform,
		source: "timeline-export",
	});
}

export function createTimelineEvidenceTrailAuditExportOpenPlan(
	plan: ConsoleAuditExportPlan,
	options: {
		baseDir: string;
		platform: SupportedPlatform;
	},
): FileOpenPlan {
	return buildFileOpenPlan({
		baseDir: options.baseDir,
		label: `timeline evidence trail export ${plan.scope} ${plan.query}`,
		path: plan.path,
		platform: options.platform,
		source: "timeline-export",
	});
}

export function getLatestStatusActivityCopyIntentAuditExport(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan | undefined {
	const item = index.items.find(
		(candidate) =>
			candidate.scope === "selected" &&
			candidate.query?.startsWith("status activity "),
	);
	if (!item) {
		return undefined;
	}
	return {
		path: item.path,
		content: "",
		eventCount: item.entryCount,
		...(item.query ? { query: item.query } : {}),
		scope: item.scope,
	};
}

export function getStatusActivityCopyIntentAuditExportIndex(
	index: ConsoleAuditExportIndex,
	plan: ConsoleAuditExportPlan | undefined,
): number | undefined {
	if (!plan) {
		return undefined;
	}
	const found = index.items.findIndex((item) => item.path === plan.path);
	return found >= 0 ? found : undefined;
}

export function createStatusActivityCopyIntentEvidenceFocusPlan(
	index: ConsoleAuditExportIndex,
	plan: ConsoleAuditExportPlan | undefined,
): StatusActivityCopyIntentEvidenceFocusPlan | undefined {
	const selectedIndex = getStatusActivityCopyIntentAuditExportIndex(
		index,
		plan,
	);
	if (selectedIndex === undefined) {
		return undefined;
	}
	const item = index.items[selectedIndex];
	if (!item) {
		return undefined;
	}
	return {
		kind: "audit",
		selectedIndex,
		itemCount: index.items.length,
		shortcut: "w",
		label: item.fileName,
		path: item.path,
		message: `status activity copy intent evidence focus audit ${selectedIndex + 1}/${index.items.length} ${item.fileName}`,
	};
}

export function createStatusActivityCopyIntentEvidenceFocusResult(
	plan: StatusActivityCopyIntentEvidenceFocusPlan,
): StatusActivityResult {
	return {
		source: "evidence",
		action: "focus-evidence",
		message: plan.message,
		detail: `evidence ${plan.kind} selected=${plan.selectedIndex + 1}/${plan.itemCount} path=${plan.path}`,
	};
}

export function createTimelineEvidenceTrailStatusActivityResult(
	plan: TimelineFocusEvidenceTrailPlan,
): StatusActivityResult {
	const controls = plan.rows
		.find((row) => row.startsWith("controls="))
		?.replace(/^controls=/, "");
	return {
		source: "evidence",
		action: "timeline-evidence-trail",
		message: plan.message,
		detail: `${controls ?? "Status Evidence controls unavailable"} path=${plan.path}`,
	};
}

export function createTimelineSelectedStatusActivityResult(
	action: "copy" | "export",
	options: {
		filter: string;
		label: string;
		path?: string;
		query?: string;
		selectedIndex: number;
		total: number;
	},
): StatusActivityResult {
	const selected = Math.max(0, Math.floor(options.selectedIndex)) + 1;
	const total = Math.max(1, Math.floor(options.total));
	const detail = [
		`filter=${options.filter}`,
		options.query?.trim() ? `search=${options.query.trim()}` : "",
		"controls=t raw c copy e export",
		options.path ? `path=${options.path}` : "",
	]
		.filter(Boolean)
		.join(" ");
	return {
		source: "timeline",
		action:
			action === "copy" ? "timeline-selected-copy" : "timeline-selected-export",
		message: `timeline selected ${action} ${selected}/${total} ${options.label}`,
		detail,
	};
}

export function createTimelineEvidenceTrailPaletteStatusActivityResult(
	action?: "select" | "open" | "search" | "source",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		sourceFilter?: TimelineEvidenceTrailSourceFilter;
		total?: number;
		visible?: number;
	} = {},
): StatusActivityResult {
	const paletteAction = action ?? "select";
	if (paletteAction === "source") {
		const sourceFilter = options.sourceFilter ?? "all";
		const visible = Math.max(0, Math.floor(options.visible ?? 0));
		const total = Math.max(0, Math.floor(options.total ?? 0));
		return {
			source: "evidence",
			action: "timeline-evidence-trail",
			message: `palette timeline trail source ${sourceFilter} visible=${visible}/${total}`,
			detail: `source filter changed to ${sourceFilter}`,
		};
	}
	if (!plan) {
		return {
			source: "evidence",
			action: "timeline-evidence-trail",
			message: `palette timeline trail ${paletteAction} unavailable`,
			detail: "no recovered Timeline Evidence trail export selected",
		};
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return {
		source: "evidence",
		action: "timeline-evidence-trail",
		message: `palette timeline trail ${paletteAction} ${selected + 1}/${total} ${basename(plan.path)}`,
		detail: `${plan.query ? `query=${plan.query} ` : ""}path=${plan.path}`,
	};
}

export function createStatusActivityResultTimelineJumpPaletteResult(
	action: "select" | "open",
	options: {
		historyIndex?: number;
		jump?: StatusActivityCopyIntentTimelineSearch;
		matches?: number;
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	if (!options.jump) {
		return {
			source: "timeline",
			action: "timeline-selected-copy",
			message: `palette status result jump ${action} unavailable`,
			detail: "no Status result Timeline jump selected",
		};
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0)) + 1;
	const total = Math.max(1, Math.floor(options.total ?? 1));
	const row = Math.max(0, Math.floor(options.historyIndex ?? 0)) + 1;
	const detail = [
		`filter=${options.jump.filter}`,
		`search=${options.jump.query}`,
		options.matches !== undefined
			? `matches=${Math.max(0, Math.floor(options.matches))}`
			: "",
	]
		.filter(Boolean)
		.join(" ");
	return {
		source: "timeline",
		action: "timeline-selected-copy",
		message: `palette status result jump ${action} ${selected}/${total} row=${row}`,
		detail,
	};
}

export function createStatusActivityToolsEvidencePaletteResult(
	action: "archive" | "retention",
	options: {
		candidateCount?: number;
		fileName?: string;
		maxItems?: number;
		path?: string;
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	if (action === "archive") {
		if (!options.fileName) {
			return {
				source: "evidence",
				action: "tools-evidence-archive",
				message: "palette tools evidence archive unavailable",
				detail: "no Tools evidence export selected",
			};
		}
		const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0)) + 1;
		const total = Math.max(1, Math.floor(options.total ?? 1));
		return {
			source: "evidence",
			action: "tools-evidence-archive",
			message: `palette tools evidence archive ${selected}/${total} ${options.fileName}`,
			detail: [
				options.path ? `path=${options.path}` : "",
				"confirm=archive tools export",
			]
				.filter(Boolean)
				.join(" "),
		};
	}

	const candidates = Math.max(0, Math.floor(options.candidateCount ?? 0));
	const maxItems = Math.max(1, Math.floor(options.maxItems ?? 1));
	return {
		source: "evidence",
		action: "tools-evidence-retention",
		message: `palette tools evidence retention candidates=${candidates} max=${maxItems}`,
		detail: "confirm=prune tools archive",
	};
}

export function formatTimelineEvidenceTrailPaletteAuditMessage(
	action: "select" | "open" | "search" | "source",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		sourceFilter?: TimelineEvidenceTrailSourceFilter;
		total?: number;
		visible?: number;
	} = {},
): string {
	if (action === "source") {
		const sourceFilter = options.sourceFilter ?? "all";
		const visible = Math.max(0, Math.floor(options.visible ?? 0));
		const total = Math.max(0, Math.floor(options.total ?? 0));
		return [
			"palette timeline trail audit",
			"action=source",
			`source=${sourceFilter}`,
			`visible=${visible}/${total}`,
		].join(" ");
	}
	if (!plan) {
		return [
			"palette timeline trail audit",
			`action=${action}`,
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue("no recovered Timeline Evidence trail export selected")}"`,
		].join(" ");
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return [
		"palette timeline trail audit",
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`label="${formatTimelineEvidenceTrailAuditValue(basename(plan.path))}"`,
		...(plan.query
			? [`query="${formatTimelineEvidenceTrailAuditValue(plan.query)}"`]
			: []),
		`path="${formatTimelineEvidenceTrailAuditValue(plan.path)}"`,
	].join(" ");
}

export function formatStatusActivityResultTimelineJumpPaletteAuditMessage(
	action: "select" | "open",
	options: {
		historyIndex?: number;
		jump?: StatusActivityCopyIntentTimelineSearch;
		matches?: number;
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	if (!options.jump) {
		return [
			"palette status result jump audit",
			`action=${action}`,
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue("no Status result Timeline jump selected")}"`,
		].join(" ");
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	const row = Math.max(0, Math.floor(options.historyIndex ?? 0)) + 1;
	return [
		"palette status result jump audit",
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`row=${row}`,
		`filter=${options.jump.filter}`,
		`query="${formatTimelineEvidenceTrailAuditValue(options.jump.query)}"`,
		...(options.matches !== undefined
			? [`matches=${Math.max(0, Math.floor(options.matches))}`]
			: []),
	].join(" ");
}

export function formatStatusActivityToolsEvidencePaletteAuditMessage(
	action: "archive" | "retention",
	options: {
		candidateCount?: number;
		fileName?: string;
		maxItems?: number;
		path?: string;
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	if (action === "retention") {
		const candidates = Math.max(0, Math.floor(options.candidateCount ?? 0));
		const maxItems = Math.max(1, Math.floor(options.maxItems ?? 1));
		return [
			"palette tools evidence audit",
			"action=retention",
			`candidates=${candidates}`,
			`max=${maxItems}`,
		].join(" ");
	}

	if (!options.fileName) {
		return [
			"palette tools evidence audit",
			"action=archive",
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue("no Tools evidence export selected")}"`,
		].join(" ");
	}

	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0)) + 1;
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return [
		"palette tools evidence audit",
		"action=archive",
		`selected=${selected}/${total}`,
		`label="${formatTimelineEvidenceTrailAuditValue(options.fileName)}"`,
		options.path
			? `path="${formatTimelineEvidenceTrailAuditValue(options.path)}"`
			: "",
	]
		.filter(Boolean)
		.join(" ");
}

export function createTimelineEvidenceTrailAuditExportPlan(
	plan: TimelineFocusEvidenceTrailPlan,
	options: {
		baseDir: string;
		generatedAt?: Date;
	},
): ConsoleAuditExportPlan {
	const generatedAt = options.generatedAt ?? new Date();
	const controls = getTimelineEvidenceTrailControls(plan);
	return createConsoleAuditExportPlan(
		[
			{
				id: `timeline-evidence-trail-${plan.selectedIndex + 1}`,
				level: "info",
				time: formatAuditEventTime(generatedAt),
				message: [
					"timeline evidence trail",
					`kind=${plan.kind}`,
					`selected=${plan.selectedIndex + 1}/${plan.itemCount}`,
					`label="${formatTimelineEvidenceTrailAuditValue(plan.label)}"`,
					`path="${formatTimelineEvidenceTrailAuditValue(plan.path)}"`,
					`controls="${formatTimelineEvidenceTrailAuditValue(controls)}"`,
				].join(" "),
			},
		],
		{
			baseDir: options.baseDir,
			generatedAt,
			query: `timeline evidence trail ${plan.label}`,
			scope: "selected",
		},
	);
}

export async function writeTimelineEvidenceTrailAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	return writeConsoleAuditExport(plan);
}

export function getLatestTimelineEvidenceTrailAuditExport(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan | undefined {
	return getTimelineEvidenceTrailAuditExports(index)[0];
}

export function getTimelineEvidenceTrailAuditExports(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan[] {
	return index.items.filter(isTimelineEvidenceTrailAuditExport).map((item) => ({
		path: item.path,
		content: "",
		eventCount: item.entryCount,
		...(item.query ? { query: item.query } : {}),
		scope: item.scope,
	}));
}

function isTimelineEvidenceTrailAuditExport(
	candidate: ConsoleAuditExportIndex["items"][number],
): boolean {
	if (candidate.scope !== "selected") {
		return false;
	}
	const query = candidate.query ?? "";
	return (
		query.startsWith("timeline evidence trail ") ||
		query === "palette timeline trail" ||
		query.startsWith("palette timeline trail ")
	);
}

function getTimelineEvidenceTrailExportSource(
	plan: ConsoleAuditExportPlan,
): "evidence" | "palette" {
	const query = plan.query ?? "";
	return query === "palette timeline trail" ||
		query.startsWith("palette timeline trail ")
		? "palette"
		: "evidence";
}

function getNormalizedSelectionIndex(
	length: number,
	selectedIndex: number,
): number {
	if (length <= 0) {
		return 0;
	}
	return Math.min(Math.max(0, Math.floor(selectedIndex)), length - 1);
}

export function formatStatusActivityCopyIntentEvidenceFocusAuditMessage(
	plan: StatusActivityCopyIntentEvidenceFocusPlan,
): string {
	return [
		"status activity evidence focus",
		`kind=${plan.kind}`,
		`shortcut=${plan.shortcut}`,
		`selected=${plan.selectedIndex + 1}/${plan.itemCount}`,
		`label="${plan.label}"`,
		`path="${plan.path}"`,
	].join(" ");
}

export function createStatusActivityCopyIntentEvidenceFocusTimelineSearch(
	plan: StatusActivityCopyIntentEvidenceFocusPlan | undefined,
): StatusActivityCopyIntentTimelineSearch | undefined {
	if (!plan) {
		return undefined;
	}
	return {
		filter: "audit",
		query: "status activity evidence focus",
		message: `status activity evidence focus timeline search ${plan.label}`,
	};
}

function getStatusActivityEntries(input: StatusActivityQueueInput) {
	return STATUS_ACTIVITY_QUEUE_SOURCES.map((source) => ({
		key: source.key,
		row: getSourceHeader(input, source),
	})).filter((entry): entry is { key: StatusActivitySource; row: string } =>
		Boolean(entry.row),
	);
}

function getActiveStatusActivitySource(
	input: StatusActivityQueueInput,
	selectedSource: StatusActivitySource,
): StatusActivitySource | undefined {
	const entries = getStatusActivityEntries(input);
	return (
		entries.find((entry) => entry.key === selectedSource)?.key ??
		entries[0]?.key
	);
}

function getSourceHeader(
	input: StatusActivityQueueInput,
	source: StatusActivityQueueSource,
): string | undefined {
	const rows = getSourceRows(input, source.key);
	return rows.find((row) => row.startsWith(source.prefix));
}

function getSourceRows(
	input: StatusActivityQueueInput,
	source: StatusActivitySource,
): string[] {
	switch (source) {
		case "release":
			return input.releaseRows ?? [];
		case "dialog":
			return input.dialogRows ?? [];
		case "cleanup":
			return input.cleanupRows ?? [];
		case "evidence":
			return input.evidenceRows ?? [];
		case "timeline":
			return [];
	}
}

function normalizeActivityDetailRow(row: string): string {
	return row.replace(/^>\s*/, "");
}

function getSelectedStatusActivityResultHistoryIndex(
	length: number,
	selectedIndex: number,
): number {
	if (length <= 0) {
		return 0;
	}
	return Math.min(Math.max(selectedIndex, 0), length - 1);
}

function getStatusActivityCopyPreviewRows(
	preview: ClipboardPreview,
	expanded = false,
): string[] {
	const rows = formatClipboardPreviewRows(preview, {
		maxCopyLines: expanded ? 6 : 2,
		maxCopyLineLength: expanded ? 96 : 72,
	});
	return rows.slice(1).filter((row) => !row.startsWith("confirm "));
}

function getSelectedStatusActivityCopyPreviewIndex(
	length: number,
	selectedIndex: number,
): number {
	if (length <= 0) {
		return 0;
	}
	return Math.min(Math.max(selectedIndex, 0), length - 1);
}

function getTimelineEvidenceTrailControls(
	plan: TimelineFocusEvidenceTrailPlan,
): string {
	return (
		plan.rows
			.find((row) => row.startsWith("controls="))
			?.replace(/^controls=/, "") ?? "Status Evidence controls unavailable"
	);
}

function formatTimelineEvidenceTrailAuditValue(value: string): string {
	return value.replaceAll(/["\r\n]/g, " ").trim();
}

function formatAuditEventTime(date: Date): string {
	return date.toISOString().slice(11, 19);
}
