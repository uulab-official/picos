import { basename } from "node:path";
import {
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportPlan,
	createConsoleAuditExportPlan,
	writeConsoleAuditExport,
} from "../core/auditLog";
import { buildFileOpenPlan, type FileOpenPlan } from "../core/fileOpen";
import type { RemoteConnectConfirmation } from "../core/remotes";
import type { SftpRemoteProfile, SupportedPlatform } from "../core/types";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import type { PortProcessControlPreview } from "./endpointPanel";
import type {
	TimelineFilter,
	TimelineFocusEvidenceTrailPlan,
} from "./timelinePanel";
import {
	filterToolHistoryExportIndex,
	type ToolHistoryEvidenceFilter,
	type ToolHistoryExportIndex,
	type ToolHistoryExportIndexItem,
} from "./toolHistory";

export type StatusActivityQueueInput = {
	releaseRows?: string[];
	dialogRows?: string[];
	cleanupRows?: string[];
	configRows?: string[];
	evidenceRows?: string[];
};

export type StatusActivitySource =
	| "release"
	| "dialog"
	| "cleanup"
	| "config"
	| "evidence"
	| "timeline";

export type StatusActivityEnterAction =
	| "cycle-release-link"
	| "show-dialog"
	| "jump-cleanup"
	| "focus-config"
	| "enter-evidence"
	| "focus-evidence"
	| "timeline-evidence-trail"
	| "timeline-selected-copy"
	| "timeline-selected-export"
	| "filter-result-history"
	| "tools-evidence-match-open"
	| "tools-evidence-match-archive"
	| "tools-evidence-search"
	| "tools-evidence-archive"
	| "tools-evidence-retention"
	| "process-control-preview"
	| "process-control-evidence"
	| "remote-host-review"
	| "remote-connect"
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
export type StatusActivityResultTimelineJumpFilter =
	| "all"
	| "process"
	| "timeline"
	| "tools"
	| "source";

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

export type StatusActivityToolsEvidenceSearchRecovery = {
	target: "active" | "archive";
	query: string;
	total: number;
	items: ToolHistoryExportIndexItem[];
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
		key: "config",
		prefix: "CONFIG MANAGED SHELVES",
	},
	{
		key: "evidence",
		prefix: "STATUS EVIDENCE SUMMARY",
	},
];

const STATUS_ACTIVITY_QUEUE_CONTROLS =
	"controls=Status queue scans release/dialog/cleanup/config/evidence; open panels for detail";
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
	const detailRows =
		activeSource === "config" ? getConfigActivityDetailRows(rows) : rows;
	return [
		`STATUS ACTIVITY DETAIL active=${activeSource} rows=${rows.length}`,
		...detailRows.slice(0, 3).map((row, index) => {
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
		case "config":
			return {
				source,
				action: "focus-config",
				message: "config activity selected; opening Config recovery hints",
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

export function createRemoteHostReviewStatusActivityResult(
	profile: SftpRemoteProfile,
): StatusActivityResult {
	return {
		source: "timeline",
		action: "remote-host-review",
		message: `remote host review staged ${profile.id} ${profile.host}:${profile.port}`,
		detail: [
			`target="${formatSftpRoot(profile)}"`,
			`user=${profile.username}`,
			`key=${profile.keyPath ? "configured" : "none"}`,
			"policy=read-only",
			"writes=locked",
			"network=not-opened",
			`confirm="connect remote ${profile.id}"`,
		].join(" "),
	};
}

export function createRemoteConnectStatusActivityResult(
	confirmation: RemoteConnectConfirmation,
): StatusActivityResult {
	const { preview } = confirmation;
	return {
		source: "timeline",
		action: "remote-connect",
		message: `remote connect ${confirmation.status} ${preview.id} ${preview.host}:${preview.port}`,
		detail: [
			`target="${preview.target}"`,
			`dependency=${preview.dependency}`,
			`reason=${preview.reason}`,
			"network=not-opened",
			"willExecute=false",
			`confirm="${preview.confirm}"`,
		].join(" "),
	};
}

export function formatRemoteActivityShelfRows(
	history: StatusActivityResult[],
	options: {
		selectedProfileId?: string;
		limit?: number;
	} = {},
): string[] {
	const limit = Math.max(1, Math.floor(options.limit ?? 3));
	const remoteResults = history.filter(isRemoteActivityResult).slice(0, limit);
	const selectedProfileId = options.selectedProfileId ?? "none";
	const selectedIndex = getSelectedRemoteActivityIndex(
		remoteResults,
		options.selectedProfileId,
	);

	if (!remoteResults.length) {
		return [
			`REMOTE ACTIVITY recent=0 selected=${selectedProfileId}`,
			"no remote activity recorded yet",
			"controls=enter stage · c connect preview · Status I timeline recovery",
		];
	}

	const rows = [
		`REMOTE ACTIVITY recent=${remoteResults.length} selected=${selectedProfileId}`,
	];
	for (const [index, result] of remoteResults.entries()) {
		const marker = index === selectedIndex ? ">" : " ";
		rows.push(`${marker} ${formatRemoteActivitySummary(result)}`);
		if (result.detail) {
			rows.push(`  ${result.detail}`);
		}
	}
	rows.push(
		"controls=enter stage · c connect preview · Status I timeline recovery",
	);
	return rows;
}

function isRemoteActivityResult(result: StatusActivityResult): boolean {
	return (
		result.source === "timeline" &&
		(result.action === "remote-host-review" ||
			result.action === "remote-connect")
	);
}

function getSelectedRemoteActivityIndex(
	results: StatusActivityResult[],
	selectedProfileId?: string,
): number {
	if (!results.length) {
		return -1;
	}
	if (!selectedProfileId) {
		return 0;
	}
	const selectedIndex = results.findIndex((result) =>
		result.message.includes(` ${selectedProfileId} `),
	);
	return selectedIndex >= 0 ? selectedIndex : 0;
}

function formatRemoteActivitySummary(result: StatusActivityResult): string {
	if (result.action === "remote-connect") {
		return result.message.replace(/^remote connect /, "connect ");
	}
	if (result.action === "remote-host-review") {
		return result.message.replace(/^remote host review staged /, "stage ");
	}
	return result.message;
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
	toolsEvidenceSearchRecovery?: StatusActivityToolsEvidenceSearchRecovery,
	selectedToolsEvidenceSearchMatchIndex = 0,
	processControlAuditExports: ConsoleAuditExportPlan[] = [],
	selectedProcessControlAuditExportIndex = 0,
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
	const selectedProcessControlAuditExport =
		getSelectedProcessControlAuditExport(
			processControlAuditExports,
			selectedProcessControlAuditExportIndex,
		);
	const normalizedProcessControlAuditExportIndex = getNormalizedSelectionIndex(
		processControlAuditExports.length,
		selectedProcessControlAuditExportIndex,
	);
	const processControlAuditExportRows = selectedProcessControlAuditExport
		? [
				`process evidence selected=${normalizedProcessControlAuditExportIndex + 1}/${processControlAuditExports.length}`,
				`process evidence target=${basename(selectedProcessControlAuditExport.path)}${selectedProcessControlAuditExport.query ? ` query=${selectedProcessControlAuditExport.query}` : ""} events=${selectedProcessControlAuditExport.eventCount}`,
				`process evidence detail ${formatProcessControlAuditExportTarget(selectedProcessControlAuditExport)} path=${selectedProcessControlAuditExport.path}`,
			]
		: [];
	const rowsBeforeHistory = [
		...exportRows,
		...(freshResultJump && auditJumpActionHint === "fresh"
			? formatFreshStatusActivityResultJumpRows(
					freshResultJump,
					freshResultJumpSelectedIndex,
					freshResultJumpCount,
				)
			: []),
		...auditJumpRows,
		...processControlAuditExportRows,
		...formatStatusActivityToolsEvidenceSearchRecoveryRows(
			toolsEvidenceSearchRecovery,
			selectedToolsEvidenceSearchMatchIndex,
		),
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
	const toolsRecoveryControls = toolsEvidenceSearchRecovery
		? `${toolsEvidenceSearchRecovery.items.length > 1 ? " · [/] tools select" : ""} · tools recovered`
		: "";
	const processControlAuditExportControls = selectedProcessControlAuditExport
		? `${processControlAuditExports.length > 1 ? " · F process select" : ""} · process evidence`
		: "";
	const controls = `controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export${processControlAuditExportControls}${trailControls}${resultJumpControls}${toolsRecoveryControls} · g Timeline audit search`;
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
	const processControlTarget = parseProcessControlAuditQuery(intent.preview);
	if (processControlTarget) {
		return processControlTarget.pid
			? ` target=process-control pid:${processControlTarget.pid}`
			: ` target=process-control status:${processControlTarget.status ?? "unknown"}`;
	}
	const toolsSearchTarget = parseToolsEvidenceSearchAuditQuery(intent.preview);
	if (toolsSearchTarget) {
		return ` target=tools:${toolsSearchTarget.target} query:${toolsSearchTarget.query || "-"}`;
	}
	const match = intent.preview.match(
		/^action=source source=(\S+) visible=(\S+)$/,
	);
	if (!match) {
		return "";
	}
	const [, source, visible] = match;
	return ` target=source:${source} visible:${visible}`;
}

function formatFreshStatusActivityResultJumpRows(
	jump: StatusActivityCopyIntentTimelineSearch,
	selectedIndex: number,
	count: number,
): string[] {
	const processControlTarget = parseProcessControlAuditQuery(jump.query);
	if (processControlTarget) {
		return [
			`process control target=${processControlTarget.pid ? `pid:${processControlTarget.pid}` : `status:${processControlTarget.status ?? "unknown"}`} action=${processControlTarget.action} I=fresh`,
		];
	}
	const toolsSearchTarget = parseToolsEvidenceSearchAuditQuery(jump.query);
	if (toolsSearchTarget) {
		return [
			`tools search target=${toolsSearchTarget.target} query=${toolsSearchTarget.query || "-"} I=fresh`,
		];
	}
	return [
		`result jump target=filter:${jump.filter} query=${jump.query}${count > 1 ? ` selected=${getNormalizedSelectionIndex(count, selectedIndex) + 1}/${count}` : ""} I=fresh`,
	];
}

function parseProcessControlAuditQuery(
	query: string,
): { action: string; pid?: string; status?: string } | undefined {
	const evidenceMatch = query.match(
		/(?:^| )(?:palette process evidence audit|status evidence process audit) action=(\S+)(?: .*?)?(?:target="?pid:([^" ]+)"?|status=(\S+))/,
	);
	if (evidenceMatch) {
		return {
			action: evidenceMatch[1] ?? "unknown",
			...(evidenceMatch[2] ? { pid: evidenceMatch[2] } : {}),
			...(evidenceMatch[3] ? { status: evidenceMatch[3] } : {}),
		};
	}
	const match = query.match(
		/(?:^| )palette process control audit action=(\S+)(?: .*?)?(?:pid=(\S+)|status=(\S+))/,
	);
	if (!match) {
		return undefined;
	}
	return {
		action: match[1] ?? "unknown",
		...(match[2] ? { pid: match[2] } : {}),
		...(match[3] ? { status: match[3] } : {}),
	};
}

function formatStatusActivityResultTimelineJumpTargetToken(
	query: string,
): string | undefined {
	const target = parseProcessControlAuditQuery(query);
	if (!target) {
		return undefined;
	}
	return target.pid
		? `process-control pid:${target.pid} action=${target.action}`
		: `process-control status:${target.status ?? "unknown"} action=${target.action}`;
}

function formatProcessControlAuditExportTarget(
	plan: ConsoleAuditExportPlan,
): string {
	const target = parseProcessControlAuditQuery(plan.query ?? "");
	if (!target) {
		return "target:unknown";
	}
	return target.pid
		? `pid:${target.pid}`
		: `status:${target.status ?? "unknown"}`;
}

export function createStatusActivityToolsEvidenceSearchRecovery(
	jump: StatusActivityCopyIntentTimelineSearch | undefined,
	options: {
		activeFilter?: ToolHistoryEvidenceFilter;
		activeIndex: ToolHistoryExportIndex;
		archiveFilter?: ToolHistoryEvidenceFilter;
		archiveIndex: ToolHistoryExportIndex;
	},
): StatusActivityToolsEvidenceSearchRecovery | undefined {
	const search = jump
		? parseToolsEvidenceSearchAuditQuery(jump.query)
		: undefined;
	if (!search) {
		return undefined;
	}
	const index =
		search.target === "archive" ? options.archiveIndex : options.activeIndex;
	const filter =
		search.target === "archive"
			? (options.archiveFilter ?? "any")
			: (options.activeFilter ?? "any");
	const filtered = filterToolHistoryExportIndex(index, filter, search.query);
	return {
		target: search.target,
		query: search.query,
		total: index.items.length,
		items: filtered.items,
	};
}

function formatStatusActivityToolsEvidenceSearchRecoveryRows(
	recovery?: StatusActivityToolsEvidenceSearchRecovery,
	selectedIndex = 0,
): string[] {
	if (!recovery) {
		return [];
	}
	const selected = getNormalizedSelectionIndex(
		recovery.items.length,
		selectedIndex,
	);
	const actionHint =
		recovery.target === "active"
			? "actions=K open D archive"
			: "actions=K open";
	const rows = [
		`tools matches target=${recovery.target} visible=${recovery.items.length}/${recovery.total}${recovery.items.length > 1 ? ` selected=${selected + 1}/${recovery.items.length}` : ""} query=${recovery.query || "-"}`,
		...recovery.items.slice(0, 2).map((item, index) => {
			const marker = index === selected ? "> " : "  ";
			return `${marker}${item.fileName} scope=${item.scope} runs=${item.runCount} ${actionHint}`;
		}),
	];
	const hidden = recovery.items.length - 2;
	if (hidden > 0) {
		rows.push(`  +${hidden} more tools evidence matches`);
	}
	if (recovery.items.length === 0) {
		rows.push("  no matching Tools evidence exports");
	}
	return rows;
}

export function getSelectedStatusActivityToolsEvidenceSearchMatch(
	recovery: StatusActivityToolsEvidenceSearchRecovery | undefined,
	selectedIndex: number,
): ToolHistoryExportIndexItem | undefined {
	if (!recovery || recovery.items.length === 0) {
		return undefined;
	}
	return recovery.items[
		getNormalizedSelectionIndex(recovery.items.length, selectedIndex)
	];
}

export function moveStatusActivityToolsEvidenceSearchMatchSelection(
	recovery: StatusActivityToolsEvidenceSearchRecovery | undefined,
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (!recovery || recovery.items.length === 0) {
		return 0;
	}
	const current = getNormalizedSelectionIndex(
		recovery.items.length,
		selectedIndex,
	);
	const delta = direction === "next" ? 1 : -1;
	return (current + delta + recovery.items.length) % recovery.items.length;
}

function parseToolsEvidenceSearchAuditQuery(
	query: string,
): { target: "active" | "archive"; query: string } | undefined {
	const match = query.match(
		/^palette tools evidence audit action=search target=(active|archive)(?: query="([^"]*)")?/,
	);
	if (!match) {
		return undefined;
	}
	return {
		target: match[1] as "active" | "archive",
		query: match[2] ?? "",
	};
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
	filter: StatusActivityResultTimelineJumpFilter = "all",
): number[] {
	return history
		.map((_, index) => index)
		.filter((index) =>
			Boolean(createStatusActivityResultTimelineSearch(history, index)),
		)
		.filter((index) => {
			if (filter === "all") {
				return true;
			}
			return (
				getStatusActivityResultTimelineJumpClass(history, index) === filter
			);
		});
}

function getStatusActivityResultTimelineJumpClass(
	history: StatusActivityResult[],
	index: number,
): Exclude<StatusActivityResultTimelineJumpFilter, "all"> | undefined {
	const jump = createStatusActivityResultTimelineSearch(history, index);
	if (!jump) {
		return undefined;
	}
	if (parseProcessControlAuditQuery(jump.query)) {
		return "process";
	}
	if (parseToolsEvidenceSearchAuditQuery(jump.query)) {
		return "tools";
	}
	if (/^action=source source=\S+ visible=\S+$/.test(jump.query)) {
		return "source";
	}
	return "timeline";
}

export function getStatusActivityResultTimelineJumpSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	filter: StatusActivityResultTimelineJumpFilter = "all",
): { selectedIndex: number; total: number } | undefined {
	const indexes = getStatusActivityResultTimelineJumpIndexes(history, filter);
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const selectedJumpIndex = indexes.indexOf(selected);
	if (selectedJumpIndex < 0 && indexes.length === 0) {
		return undefined;
	}
	return {
		selectedIndex: Math.max(0, selectedJumpIndex),
		total: indexes.length,
	};
}

export function formatStatusActivityResultTimelineJumpRows(
	history: StatusActivityResult[],
	selectedIndex: number,
	visibleRows = 3,
	filter: StatusActivityResultTimelineJumpFilter = "all",
): string[] {
	const paletteHint =
		"palette=? result jump · timeline result open · result select";
	const allIndexes = getStatusActivityResultTimelineJumpIndexes(history);
	const indexes = getStatusActivityResultTimelineJumpIndexes(history, filter);
	if (indexes.length === 0) {
		return [
			filter === "all"
				? "STATUS RESULT TIMELINE JUMPS count=0"
				: `STATUS RESULT TIMELINE JUMPS filter=${filter} count=0/${allIndexes.length}`,
			paletteHint,
			"no Timeline result jumps yet",
		];
	}
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const selectedJumpIndex = Math.max(0, indexes.indexOf(selected));
	const selectedVisibleHistoryIndex = indexes[selectedJumpIndex];
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
		const marker = historyIndex === selectedVisibleHistoryIndex ? "> " : "  ";
		const target = jump
			? formatStatusActivityResultTimelineJumpTargetToken(jump.query)
			: undefined;
		return `${marker}#${historyIndex + 1} filter=${jump?.filter ?? "unknown"} query=${jump?.query ?? "unknown"}${target ? ` target=${target}` : ""} action=${result?.action ?? "unknown"}`;
	});
	return [
		filter === "all"
			? `STATUS RESULT TIMELINE JUMPS count=${indexes.length} selected=${selectedJumpIndex + 1}/${indexes.length}`
			: `STATUS RESULT TIMELINE JUMPS filter=${filter} count=${indexes.length}/${allIndexes.length} selected=${selectedJumpIndex + 1}/${indexes.length}`,
		paletteHint,
		...rows,
		`controls=J select result jump · I open selected Timeline result${filter === "all" ? "" : " · ^=class filter"}`,
	];
}

export function moveStatusActivityResultTimelineJumpSelection(
	history: StatusActivityResult[],
	selectedIndex: number,
	direction: "next" | "previous",
	filter: StatusActivityResultTimelineJumpFilter = "all",
): number {
	const indexes = getStatusActivityResultTimelineJumpIndexes(history, filter);
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

export function nextStatusActivityResultTimelineJumpFilter(
	filter: StatusActivityResultTimelineJumpFilter,
): StatusActivityResultTimelineJumpFilter {
	switch (filter) {
		case "all":
			return "process";
		case "process":
			return "timeline";
		case "timeline":
			return "tools";
		case "tools":
			return "source";
		case "source":
			return "all";
	}
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

export function getSelectedProcessControlAuditExport(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
): ConsoleAuditExportPlan | undefined {
	if (exports.length === 0) {
		return undefined;
	}
	return exports[getNormalizedSelectionIndex(exports.length, selectedIndex)];
}

export function moveProcessControlAuditExportSelection(
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
		result.source === "evidence" &&
		result.action === "tools-evidence-search"
	) {
		return createToolsEvidenceSearchResultTimelineSearch(result);
	}
	if (
		result.source === "evidence" &&
		result.action === "process-control-evidence"
	) {
		return createProcessControlEvidenceResultTimelineSearch(result);
	}
	if (
		result.source === "timeline" &&
		result.action === "process-control-preview"
	) {
		return createProcessControlPreviewResultTimelineSearch(result);
	}
	if (result.source === "timeline" && result.action === "remote-host-review") {
		return createRemoteHostReviewResultTimelineSearch(result);
	}
	if (result.source === "timeline" && result.action === "remote-connect") {
		return createRemoteConnectResultTimelineSearch(result);
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

function createRemoteConnectResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^remote connect (confirmed-blocked|rejected) ([A-Za-z0-9._-]{1,64}) /,
	);
	const status = match?.[1];
	const id = match?.[2];
	if (!id || !status) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `remote connect audit id=${id} status=${status}`,
		message: `status activity result timeline search remote connect ${id} ${status}`,
	};
}

function createRemoteHostReviewResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^remote host review staged ([A-Za-z0-9._-]{1,64}) /,
	);
	const id = match?.[1];
	if (!id) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `remote host review audit action=stage id=${id}`,
		message: `status activity result timeline search remote host review ${id}`,
	};
}

function createProcessControlPreviewResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^palette process control preview (?:terminate|unavailable)(?: .* pid=(\S+))?/,
	);
	const pid = match?.[1];
	const query = pid
		? `palette process control audit action=preview pid=${pid}`
		: "palette process control audit action=preview status=unavailable";
	return {
		filter: "audit",
		query,
		message: `status activity result timeline search palette process control${pid ? ` pid=${pid}` : " unavailable"}`,
	};
}

function createProcessControlEvidenceResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^(palette process evidence|status evidence process) (select|open|search)(?:\s|$)/,
	);
	if (!match) {
		return undefined;
	}
	const [, prefix, action] = match;
	const auditPrefix =
		prefix === "status evidence process"
			? "status evidence process audit"
			: "palette process evidence audit";
	const messagePrefix =
		prefix === "status evidence process"
			? "status process evidence"
			: "palette process evidence";
	const target = getProcessControlEvidenceResultDetailTarget(result.detail);
	if (target?.startsWith("pid:")) {
		const pid = target.slice("pid:".length);
		return {
			filter: "audit",
			query: `${auditPrefix} action=${action} target="pid:${pid}"`,
			message: `status activity result timeline search ${messagePrefix} pid=${pid}`,
		};
	}
	return {
		filter: "audit",
		query: `${auditPrefix} action=${action} status=unavailable`,
		message: `status activity result timeline search ${messagePrefix} unavailable`,
	};
}

function getProcessControlEvidenceResultDetailTarget(
	detail: string | undefined,
): string | undefined {
	const match = detail?.match(/(?:^| )target=(\S+)/);
	return match?.[1];
}

function createToolsEvidenceSearchResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const target = getStatusActivityToolsEvidenceSearchDetailValue(
		result.detail,
		"target",
	);
	if (target !== "active" && target !== "archive") {
		return undefined;
	}
	const query =
		getStatusActivityToolsEvidenceSearchDetailValue(result.detail, "query") ??
		"";
	const queryToken = query
		? ` query="${formatTimelineEvidenceTrailAuditValue(query)}"`
		: "";
	return {
		filter: "audit",
		query: `palette tools evidence audit action=search target=${target}${queryToken}`,
		message: `status activity result timeline search tools evidence search ${target}`,
	};
}

function getStatusActivityToolsEvidenceSearchDetailValue(
	detail: string | undefined,
	key: "target" | "query",
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
	const stop = [" target=", " query=", " controls="]
		.map((marker) => detail.indexOf(marker, valueStart))
		.filter((index) => index >= 0)
		.sort((left, right) => left - right)[0];
	return detail.slice(valueStart, stop ?? detail.length).trim();
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

export function createProcessControlAuditExportTimelineSearch(
	plan?: ConsoleAuditExportPlan,
): StatusActivityCopyIntentTimelineSearch | undefined {
	if (!plan?.query) {
		return undefined;
	}
	return {
		filter: "audit",
		query: plan.query,
		message: `process control evidence recovered search ${basename(plan.path)}`,
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

export function createProcessControlAuditExportOpenPlan(
	plan: ConsoleAuditExportPlan,
	options: {
		baseDir: string;
		platform: SupportedPlatform;
	},
): FileOpenPlan {
	return buildFileOpenPlan({
		baseDir: options.baseDir,
		label: `process control evidence export ${plan.scope} ${plan.query}`,
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

export function createProcessControlEvidencePaletteStatusActivityResult(
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createProcessControlEvidenceStatusActivityResultWithPrefix(
		"palette process evidence",
		action,
		plan,
		options,
	);
}

export function createProcessControlEvidenceStatusActivityResult(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createProcessControlEvidenceStatusActivityResultWithPrefix(
		"status evidence process",
		action,
		plan,
		options,
	);
}

function createProcessControlEvidenceStatusActivityResultWithPrefix(
	prefix: "palette process evidence" | "status evidence process",
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	if (!plan) {
		return {
			source: "evidence",
			action: "process-control-evidence",
			message: `${prefix} ${action} unavailable`,
			detail: "no recovered process-control evidence export selected",
		};
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return {
		source: "evidence",
		action: "process-control-evidence",
		message: `${prefix} ${action} ${selected + 1}/${total} ${basename(plan.path)}`,
		detail: [
			`target=${formatProcessControlAuditExportTarget(plan)}`,
			plan.query ? `query=${plan.query}` : "",
			`path=${plan.path}`,
		]
			.filter(Boolean)
			.join(" "),
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
	const target = formatStatusActivityResultTimelineJumpTargetToken(
		options.jump.query,
	);
	const detail = [
		target ? `target=${target}` : "",
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
	action: "archive" | "retention" | "search",
	options: {
		candidateCount?: number;
		fileName?: string;
		maxItems?: number;
		path?: string;
		query?: string;
		selectedIndex?: number;
		target?: "active" | "archive";
		total?: number;
		visible?: number;
	} = {},
): StatusActivityResult {
	if (action === "search") {
		const target = options.target ?? "active";
		const query = options.query?.trim() ?? "";
		const visible = Math.max(0, Math.floor(options.visible ?? 0));
		const total = Math.max(0, Math.floor(options.total ?? 0));
		return {
			source: "evidence",
			action: "tools-evidence-search",
			message: `palette tools evidence search ${target} ${query ? `query=${query}` : "cleared"} visible=${visible}/${total}`,
			detail: [
				`target=${target}`,
				`query=${query}`,
				"controls=? tools search K/open D/archive",
			].join(" "),
		};
	}

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

export function createStatusActivityToolsEvidenceMatchResult(
	action: "archive" | "open",
	recovery?: StatusActivityToolsEvidenceSearchRecovery,
	selectedIndex = 0,
	options: { unavailableReason?: string } = {},
): StatusActivityResult {
	const item = getSelectedStatusActivityToolsEvidenceSearchMatch(
		recovery,
		selectedIndex,
	);
	const resultAction =
		action === "open"
			? "tools-evidence-match-open"
			: "tools-evidence-match-archive";
	if (!item) {
		return {
			source: "evidence",
			action: resultAction,
			message: `recovered tools evidence match ${action} unavailable`,
			detail:
				options.unavailableReason ??
				"no recovered Tools evidence match selected",
		};
	}
	const selected = getNormalizedSelectionIndex(
		recovery?.items.length ?? 0,
		selectedIndex,
	);
	const total = Math.max(1, recovery?.items.length ?? 1);
	const unavailableReason =
		options.unavailableReason ??
		(action === "archive" && recovery?.target === "archive"
			? "archived Tools evidence matches are already archived"
			: undefined);
	return {
		source: "evidence",
		action: resultAction,
		message: `recovered tools evidence match ${action} ${recovery?.target ?? "active"} ${selected + 1}/${total} ${item.fileName}${unavailableReason ? " unavailable" : ""}`,
		detail: [
			recovery?.query ? `query=${recovery.query}` : "",
			`scope=${item.scope}`,
			`runs=${item.runCount}`,
			`path=${item.path}`,
			unavailableReason
				? `reason=${unavailableReason}`
				: action === "open"
					? "confirm=file-open"
					: "confirm=archive tools export",
		]
			.filter(Boolean)
			.join(" "),
	};
}

export function createStatusActivityProcessControlPaletteResult(
	preview?: PortProcessControlPreview,
): StatusActivityResult {
	if (!preview) {
		return {
			source: "timeline",
			action: "process-control-preview",
			message: "palette process control preview unavailable",
			detail: "no PID-backed port process selected",
		};
	}
	const state = preview.enabled ? "ready" : "locked";
	return {
		source: "timeline",
		action: "process-control-preview",
		message: `palette process control preview ${preview.kind} ${preview.port.localAddress}:${preview.port.localPort} pid=${preview.port.pid}`,
		detail: [
			`action=${preview.actionId}`,
			`state=${state}`,
			`risk=${preview.risk}`,
			`privilege=${preview.privilege}`,
			`process=${preview.port.command}`,
			`user=${preview.port.user}`,
			`confirm=${preview.confirmationPhrase}`,
		].join(" "),
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

export function formatProcessControlEvidencePaletteAuditMessage(
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatProcessControlEvidenceAuditMessageWithPrefix(
		"palette process evidence audit",
		action,
		plan,
		options,
	);
}

export function formatProcessControlEvidenceStatusAuditMessage(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatProcessControlEvidenceAuditMessageWithPrefix(
		"status evidence process audit",
		action,
		plan,
		options,
	);
}

function formatProcessControlEvidenceAuditMessageWithPrefix(
	prefix: "palette process evidence audit" | "status evidence process audit",
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	if (!plan) {
		return [
			prefix,
			`action=${action}`,
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue("no recovered process-control evidence export selected")}"`,
		].join(" ");
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return [
		prefix,
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`target="${formatTimelineEvidenceTrailAuditValue(formatProcessControlAuditExportTarget(plan))}"`,
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
	const target = formatStatusActivityResultTimelineJumpTargetToken(
		options.jump.query,
	);
	return [
		"palette status result jump audit",
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`row=${row}`,
		target ? `target="${formatTimelineEvidenceTrailAuditValue(target)}"` : "",
		`filter=${options.jump.filter}`,
		`query="${formatStatusActivityResultTimelineJumpAuditValue(options.jump.query)}"`,
		...(options.matches !== undefined
			? [`matches=${Math.max(0, Math.floor(options.matches))}`]
			: []),
	]
		.filter(Boolean)
		.join(" ");
}

export function formatStatusActivityProcessControlPaletteAuditMessage(
	preview?: PortProcessControlPreview,
): string {
	if (!preview) {
		return [
			"palette process control audit",
			"action=preview",
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue("no PID-backed port process selected")}"`,
		].join(" ");
	}
	const state = preview.enabled ? "ready" : "locked";
	return [
		"palette process control audit",
		"action=preview",
		`status=${state}`,
		`kind=${preview.kind}`,
		`target="${formatTimelineEvidenceTrailAuditValue(`${preview.port.localAddress}:${preview.port.localPort}`)}"`,
		`pid=${preview.port.pid}`,
		`process="${formatTimelineEvidenceTrailAuditValue(preview.port.command)}"`,
		`user="${formatTimelineEvidenceTrailAuditValue(preview.port.user)}"`,
		`risk=${preview.risk}`,
		`privilege=${preview.privilege}`,
		`confirm="${formatTimelineEvidenceTrailAuditValue(preview.confirmationPhrase)}"`,
	].join(" ");
}

export function formatStatusActivityToolsEvidencePaletteAuditMessage(
	action: "archive" | "retention" | "search",
	options: {
		candidateCount?: number;
		fileName?: string;
		maxItems?: number;
		path?: string;
		query?: string;
		selectedIndex?: number;
		target?: "active" | "archive";
		total?: number;
		visible?: number;
	} = {},
): string {
	if (action === "search") {
		const target = options.target ?? "active";
		const query = options.query?.trim() ?? "";
		const visible = Math.max(0, Math.floor(options.visible ?? 0));
		const total = Math.max(0, Math.floor(options.total ?? 0));
		return [
			"palette tools evidence audit",
			"action=search",
			`target=${target}`,
			`query="${formatTimelineEvidenceTrailAuditValue(query)}"`,
			`visible=${visible}/${total}`,
		].join(" ");
	}

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

export function formatStatusActivityToolsEvidenceMatchAuditMessage(
	action: "archive" | "open",
	recovery?: StatusActivityToolsEvidenceSearchRecovery,
	selectedIndex = 0,
	options: { unavailableReason?: string } = {},
): string {
	const item = getSelectedStatusActivityToolsEvidenceSearchMatch(
		recovery,
		selectedIndex,
	);
	if (!item) {
		return [
			"status tools evidence match audit",
			`action=${action}`,
			"status=unavailable",
			`reason="${formatTimelineEvidenceTrailAuditValue(options.unavailableReason ?? "no recovered Tools evidence match selected")}"`,
		].join(" ");
	}
	const selected = getNormalizedSelectionIndex(
		recovery?.items.length ?? 0,
		selectedIndex,
	);
	const total = Math.max(1, recovery?.items.length ?? 1);
	const unavailableReason =
		options.unavailableReason ??
		(action === "archive" && recovery?.target === "archive"
			? "archived Tools evidence matches are already archived"
			: undefined);
	return [
		"status tools evidence match audit",
		`action=${action}`,
		`target=${recovery?.target ?? "active"}`,
		...(unavailableReason
			? [
					"status=unavailable",
					`reason="${formatTimelineEvidenceTrailAuditValue(unavailableReason)}"`,
				]
			: []),
		`selected=${selected + 1}/${total}`,
		`query="${formatTimelineEvidenceTrailAuditValue(recovery?.query ?? "")}"`,
		`label="${formatTimelineEvidenceTrailAuditValue(item.fileName)}"`,
		...(unavailableReason
			? []
			: [
					`scope=${item.scope}`,
					`runs=${Math.max(0, Math.floor(item.runCount))}`,
				]),
		`path="${formatTimelineEvidenceTrailAuditValue(item.path)}"`,
	].join(" ");
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

export function getLatestProcessControlAuditExport(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan | undefined {
	return getProcessControlAuditExports(index)[0];
}

export function getProcessControlAuditExports(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan[] {
	return index.items.filter(isProcessControlAuditExport).map((item) => ({
		path: item.path,
		content: "",
		eventCount: item.entryCount,
		...(item.query ? { query: item.query } : {}),
		scope: item.scope,
	}));
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

function isProcessControlAuditExport(
	candidate: ConsoleAuditExportIndex["items"][number],
): boolean {
	if (candidate.scope !== "selected") {
		return false;
	}
	return parseProcessControlAuditQuery(candidate.query ?? "") !== undefined;
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
		case "config":
			return input.configRows ?? [];
		case "evidence":
			return input.evidenceRows ?? [];
		case "timeline":
			return [];
	}
}

function normalizeActivityDetailRow(row: string): string {
	return row.replace(/^>\s*/, "");
}

function getConfigActivityDetailRows(rows: string[]): string[] {
	const priorityRows = [
		rows.find((row) => row.startsWith("shelf coverage ")),
		rows.find((row) => row.startsWith("empty shelves ")),
		rows.find((row) => row.startsWith("recovery ")),
	].filter((row): row is string => Boolean(row));
	return priorityRows.length > 0 ? priorityRows : rows;
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

function formatStatusActivityResultTimelineJumpAuditValue(
	value: string,
): string {
	return value
		.replaceAll(/[\r\n]/g, " ")
		.replaceAll('"', '\\"')
		.trim();
}

function formatSftpRoot(profile: SftpRemoteProfile): string {
	const root = profile.root.startsWith("/") ? profile.root : `/${profile.root}`;
	return `sftp://${profile.username}@${profile.host}:${profile.port}${root}`;
}

function formatAuditEventTime(date: Date): string {
	return date.toISOString().slice(11, 19);
}
