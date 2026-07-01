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
import type { TimelineFocusEvidenceTrailPlan } from "./timelinePanel";

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
	| "evidence";

export type StatusActivityEnterAction =
	| "cycle-release-link"
	| "show-dialog"
	| "jump-cleanup"
	| "enter-evidence"
	| "focus-evidence"
	| "timeline-evidence-trail"
	| "none";

export type StatusActivityEnterPlan = {
	source: StatusActivitySource;
	action: StatusActivityEnterAction;
	message: string;
};

export type StatusActivityResult = StatusActivityEnterPlan & {
	detail?: string;
};

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
	filter: "audit";
	query: string;
	message: string;
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
	}
}

export function formatStatusActivityResultRows(
	result?: StatusActivityResult,
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
): string[] {
	if (history.length === 0) {
		return [
			"STATUS ACTIVITY RESULT HISTORY count=0",
			"no Status activity result history yet",
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
			return rows;
		}),
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
		"controls=; row · = expand · y copy selected history · :clipboard confirm=copy locked",
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
): string[] {
	const exportRows = latestExport
		? [
				`z target=${basename(latestExport.path)}${latestExportEvidenceIndex !== undefined ? ` evidence=${latestExportEvidenceIndex + 1}` : ""}${latestExport.query ? ` query=${latestExport.query}` : ""} events=${latestExport.eventCount}`,
			]
		: [];
	const timelineTrailRows = latestTimelineTrailExport
		? [
				`trail target=${basename(latestTimelineTrailExport.path)}${latestTimelineTrailExport.query ? ` query=${latestTimelineTrailExport.query}` : ""} events=${latestTimelineTrailExport.eventCount}`,
			]
		: [];
	const rowsBeforeHistory = [...exportRows, ...timelineTrailRows];
	const controls = `controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export${latestTimelineTrailExport ? " · L open trail · trail recovered" : ""} · g Timeline audit search`;
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
	const item = index.items.find(
		(candidate) =>
			candidate.scope === "selected" &&
			candidate.query?.startsWith("timeline evidence trail "),
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
