import { basename } from "node:path";
import {
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportPlan,
	createConsoleAuditExportPlan,
	writeConsoleAuditExport,
} from "../core/auditLog";
import { buildFileOpenPlan, type FileOpenPlan } from "../core/fileOpen";
import type { InterfaceConfirmationResult } from "../core/interfaceControl";
import type {
	RemoteConnectConfirmation,
	RemoteHostKeyEvidenceInputConfirmation,
	RemoteHostKeyTrustReviewConfirmation,
	RemoteKnownHostsPasteReview,
} from "../core/remotes";
import type { SftpRemoteProfile, SupportedPlatform } from "../core/types";
import {
	type CleanupHandoffHistory,
	type CleanupJumpAudit,
	createCleanupHandoffReopenPlan,
	createCleanupJumpAuditFromHistory,
} from "./cleanupIndex";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import type { PortProcessControlPreview } from "./endpointPanel";
import type { ConsoleEvent } from "./events";
import { clampIndex } from "./navigation";
import {
	formatOperationRunAuditMessage,
	type OperationRunProgress,
} from "./operationRunPanel";
import {
	prepareTimelineSearchJumpTransition,
	type TimelineFilter,
	type TimelineFocusEvidenceTrailPlan,
	type TimelineSearchJumpTransition,
} from "./timelinePanel";
import {
	createToolHistoryExportArchivePlan,
	filterToolHistoryExportIndex,
	type ToolHistoryEvidenceFilter,
	type ToolHistoryExportArchivePlan,
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

export type CleanupHandoffHistoryReopenTransition =
	| {
			kind: "reopen";
			audit: CleanupJumpAudit;
			screen: CleanupHandoffHistory["screen"];
			notice: { level: "info"; message: string };
	  }
	| {
			kind: "notice";
			notice: {
				level: "warn";
				message: "no cleanup handoff history selected";
			};
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
	| "audit-evidence-archive"
	| "audit-evidence-retention"
	| "interface-evidence-archive"
	| "interface-evidence-retention"
	| "interface-evidence-filter"
	| "interface-evidence-find"
	| "process-control-preview"
	| "process-control-evidence"
	| "remote-known-hosts-evidence"
	| "remote-host-review"
	| "remote-host-key-evidence"
	| "remote-host-trust-review"
	| "remote-known-hosts-selection"
	| "remote-connect"
	| "interface-confirmation"
	| "operations-run"
	| "none";

export type StatusActivityEnterPlan = {
	source: StatusActivitySource;
	action: StatusActivityEnterAction;
	message: string;
};

export type StatusActivityResult = StatusActivityEnterPlan & {
	detail?: string;
	detailRows?: string[];
};

export type StatusActivityResultHistoryFilter =
	| "all"
	| "palette-result-jumps"
	| "evidence-handoffs";
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

export type StatusActivityToolsEvidenceMatchOpenTransition =
	| {
			kind: "notice";
			selectedIndex: number;
			notice: { level: "warn"; message: string };
			auditMessage: string;
			result: StatusActivityResult;
	  }
	| {
			kind: "open";
			selectedIndex: number;
			item: ToolHistoryExportIndexItem;
			plan: FileOpenPlan;
			notice: { level: "info"; message: string };
			auditMessage: string;
			result: StatusActivityResult;
	  };

export type StatusActivityToolsEvidenceMatchArchiveTransition =
	| {
			kind: "notice";
			selectedIndex: number;
			notice: { level: "warn"; message: string };
			auditMessage: string;
			result: StatusActivityResult;
	  }
	| {
			kind: "confirmation";
			selectedIndex: number;
			item: ToolHistoryExportIndexItem;
			plan: ToolHistoryExportArchivePlan;
			notice: { level: "info"; message: string };
			auditMessage: string;
			result: StatusActivityResult;
	  };

export type InterfaceEvidenceOutcomeStatus = "archived" | "pruned" | "blocked";

export type InterfaceEvidenceOutcomeInput = {
	status: InterfaceEvidenceOutcomeStatus;
	message: string;
	fileName?: string;
	sourcePath?: string;
	archivedPath?: string;
	removed?: number;
	candidates?: number;
	maxItems?: number;
};

export type RemoteKnownHostsSelectionStatusActivityInput = {
	id: string;
	host: string;
	port: number;
	target: string;
	direction: "next" | "previous";
	selected: number;
	candidateCount: number;
	sourceLine: number;
	hostPattern: string;
	keyType: string;
	fingerprint: string;
	match: "candidate-only" | "matched" | "mismatch" | "unknown";
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

export type RecoveredStatusEvidenceIndex = {
	lastStatusActivityCopyIntentAuditExport?: ConsoleAuditExportPlan;
	timelineEvidenceTrailAuditExports: ConsoleAuditExportPlan[];
	latestTimelineEvidenceTrailAuditExport?: ConsoleAuditExportPlan;
	processControlAuditExports: ConsoleAuditExportPlan[];
	remoteKnownHostsSelectionAuditExports: ConsoleAuditExportPlan[];
	interfaceConfirmationAuditExports: ConsoleAuditExportPlan[];
	selectedTimelineIndex: number;
	selectedProcessIndex: number;
	selectedRemoteKnownHostsIndex: number;
	selectedInterfaceIndex: number;
};

export type RecoveredEvidenceFamily =
	| "timeline"
	| "process"
	| "remote-known-hosts"
	| "interface";

export type RecoveredEvidenceActionOrigin =
	| "keyboard"
	| "palette"
	| "status-evidence";

type RecoveredEvidenceActivity = {
	auditMessage?: string;
	activityResult?: StatusActivityResult;
};

export type RecoveredEvidenceSelectionTransition =
	| ({
			kind: "notice";
			selectedIndex: number;
			notice: { level: "warn"; message: string };
			statusEvidenceKind?: "remote-known-hosts" | "interface";
	  } & RecoveredEvidenceActivity)
	| ({
			kind: "selection";
			selectedIndex: number;
			item: ConsoleAuditExportPlan;
			total: number;
			notice: { level: "info"; message: string };
			statusEvidenceKind?: "remote-known-hosts" | "interface";
	  } & RecoveredEvidenceActivity);

export type RecoveredEvidenceSearchTransition =
	| ({
			kind: "notice";
			selectedIndex: number;
			notice: { level: "warn"; message: string };
	  } & RecoveredEvidenceActivity)
	| ({
			kind: "search";
			selectedIndex: number;
			item: ConsoleAuditExportPlan;
			total: number;
			timeline: TimelineSearchJumpTransition;
	  } & RecoveredEvidenceActivity);

export type RecoveredEvidenceMasterSelection = {
	state: "active" | "archived";
	selectedIndex: number;
};

export type RecoveredEvidenceOpenTransition =
	| ({
			kind: "notice";
			selectedIndex: number;
			notice: { level: "warn"; message: string };
	  } & RecoveredEvidenceActivity)
	| ({
			kind: "open";
			selectedIndex: number;
			item: ConsoleAuditExportPlan;
			total: number;
			plan: FileOpenPlan;
			masterSelection?: RecoveredEvidenceMasterSelection;
			statusEvidenceKind?: "audit" | "interface";
			notice: { level: "info"; message: string };
	  } & RecoveredEvidenceActivity);

export type StatusActivityResultTimelineHandoffReplayTransition =
	| {
			kind: "notice";
			notice: { level: "warn"; message: string };
	  }
	| {
			kind: "replay";
			jump: StatusActivityCopyIntentTimelineSearch;
			intent?: StatusActivityCopyIntentRecord;
			notice: { level: "info"; message: string };
	  };

export type StatusActivityResultTimelineHandoffOpenTransition =
	| ({
			kind: "notice";
			notice: { level: "warn"; message: string };
	  } & RecoveredEvidenceActivity)
	| ({
			kind: "open";
			jump: StatusActivityCopyIntentTimelineSearch;
			intent?: StatusActivityCopyIntentRecord;
			timeline: TimelineSearchJumpTransition;
	  } & RecoveredEvidenceActivity);

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

export function prepareCleanupHandoffHistoryReopen(input: {
	history: CleanupHandoffHistory[];
	selectedIndex: number;
}): CleanupHandoffHistoryReopenTransition {
	const selected =
		input.history[clampIndex(input.selectedIndex, input.history.length)];
	const plan = createCleanupHandoffReopenPlan(selected);
	if (!selected || !plan) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no cleanup handoff history selected",
			},
		};
	}
	return {
		kind: "reopen",
		audit: createCleanupJumpAuditFromHistory(selected),
		screen: plan.screen,
		notice: {
			level: "info",
			message: `cleanup history reopened ${plan.label}: press enter to open prompt or esc to clear`,
		},
	};
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
		...formatStatusActivityResultDetailRows(result, "  "),
		...formatStatusActivityResultAuditJumpIntentRows(
			latestAuditJumpIntent,
			"  ",
			auditJumpIntentCount,
		),
	];
}

function formatStatusActivityResultDetailRows(
	result: StatusActivityResult,
	prefix = "",
): string[] {
	const rows = result.detailRows?.length
		? result.detailRows
		: result.detail
			? [result.detail]
			: [];
	return rows.map((row) => `${prefix}${row}`);
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
					`${marker}#${historyIndex + 1} ${result.source} ${result.action} ${result.message}${formatStatusActivityResultHistoryTargetToken(result)}`,
				];
				rows.push(...formatStatusActivityResultDetailRows(result, "    "));
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
				`${marker}${result.source} ${result.action} ${result.message}${formatStatusActivityResultHistoryTargetToken(result)}`,
			];
			rows.push(...formatStatusActivityResultDetailRows(result, "    "));
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

function formatStatusActivityResultHistoryTargetToken(
	result: StatusActivityResult,
): string {
	if (result.action !== "remote-known-hosts-evidence") {
		return "";
	}
	const match = result.message.match(
		/^palette remote known_hosts evidence (copy|export)(?:\s|$)/,
	);
	const action = match?.[1];
	const target = getRemoteKnownHostsSelectionHistoryEvidenceResultDetailTarget(
		result.detail,
	);
	if (!action || !target) {
		return "";
	}
	return ` target=remote-known-hosts id:${target} action=${action}`;
}

export function nextStatusActivityResultHistoryFilter(
	filter: StatusActivityResultHistoryFilter,
): StatusActivityResultHistoryFilter {
	if (filter === "all") {
		return "palette-result-jumps";
	}
	if (filter === "palette-result-jumps") {
		return "evidence-handoffs";
	}
	return "all";
}

export function filterStatusActivityResultHistoryIndexes(
	history: StatusActivityResult[],
	filter: StatusActivityResultHistoryFilter,
): number[] {
	if (filter === "all") {
		return history.map((_, index) => index);
	}
	return history.reduce<number[]>((indexes, result, index) => {
		const matches =
			filter === "palette-result-jumps"
				? isPaletteStatusActivityResultJump(result)
				: isEvidenceHandoffStatusActivityResult(result);
		if (matches) {
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

export function createOperationRunStatusActivityResult(
	progress: OperationRunProgress,
): StatusActivityResult | undefined {
	const message = formatOperationRunAuditMessage(progress);
	if (!message) return undefined;
	return {
		source: "timeline",
		action: "operations-run",
		message,
		detail:
			progress.status === "failed"
				? `kind=${progress.kind} reason=${JSON.stringify(progress.message)}`
				: progress.kind === "monitor"
					? `kind=monitor interval=${progress.intervalMs} duration=${progress.durationMs ?? 0}ms`
					: `kind=${progress.kind} duration=${progress.durationMs ?? 0}ms`,
		detailRows: [progress.message],
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

export function createInterfaceConfirmationStatusActivityResult(
	confirmation: InterfaceConfirmationResult,
): StatusActivityResult {
	return {
		source: "timeline",
		action: "interface-confirmation",
		message: `interface confirmation ${confirmation.status} ${confirmation.actionId} target=${confirmation.targetLabel}`,
		detail: [
			`action=${confirmation.action}`,
			`target=${quoteAuditAttribute(confirmation.targetLabel)}`,
			`expected=${quoteAuditAttribute(confirmation.expectedPhrase)}`,
			`received=${quoteAuditAttribute(confirmation.receivedPhrase || "-")}`,
			`confirmed=${confirmation.confirmed}`,
			`willExecute=${confirmation.willExecute}`,
			`risk=${confirmation.risk}`,
			`privilege=${confirmation.privilege}`,
			`reason=${confirmation.reason}`,
			`blockers=${confirmation.blockers.join(",")}`,
			`command=${quoteAuditAttribute(confirmation.commandPreview)}`,
		].join(" "),
	};
}

export function createRemoteHostKeyTrustReviewStatusActivityResult(
	confirmation: RemoteHostKeyTrustReviewConfirmation,
): StatusActivityResult {
	const { preview } = confirmation;
	return {
		source: "timeline",
		action: "remote-host-trust-review",
		message: `remote host trust review ${confirmation.status} ${preview.id} ${preview.lookup}`,
		detail: [
			`target="${preview.target}"`,
			`match=${preview.match}`,
			`decision=${preview.decision}`,
			"network=not-opened",
			"trust=not-applied",
			"knownHostsWrite=false",
			`confirm="${preview.confirm}"`,
		].join(" "),
		detailRows: [
			`review target="${preview.target}" lookup=${preview.lookup} provider=${preview.provider}`,
			`fingerprints collected=${preview.collectedFingerprint} knownHosts=${preview.knownHostsFingerprint} match=${preview.match}`,
			`decision status=${confirmation.status} result=${preview.decision} network=not-opened trust=not-applied knownHostsWrite=${confirmation.knownHostsWritten}`,
			`confirm review="${preview.confirm}" connect="${preview.connectConfirm}"`,
		],
	};
}

export function createRemoteHostKeyEvidenceInputStatusActivityResult(
	confirmation: RemoteHostKeyEvidenceInputConfirmation,
): StatusActivityResult {
	const { input } = confirmation;
	const reviewConfirm =
		input.id === "none"
			? "select remote profile"
			: `review host trust ${input.id}`;
	return {
		source: "timeline",
		action: "remote-host-key-evidence",
		message: `remote host key evidence ${confirmation.status} ${input.id} ${input.lookup}`,
		detail: [
			`target="${input.target}"`,
			`fingerprint=${confirmation.fingerprint}`,
			`parserInput=${confirmation.parserInput}`,
			"network=not-opened",
			`scan=${confirmation.hostKeyScanned}`,
			"trust=not-applied",
			`knownHostsWrite=${confirmation.knownHostsWritten}`,
			`confirm="${input.confirm}"`,
		].join(" "),
		detailRows: [
			`evidence target="${input.target}" lookup=${input.lookup} provider=${input.provider}`,
			`fingerprint provided=${confirmation.fingerprint} parserInput=${confirmation.parserInput}`,
			`decision status=${confirmation.status} result=blocked network=not-opened scan=${confirmation.hostKeyScanned} trust=not-applied knownHostsWrite=${confirmation.knownHostsWritten}`,
			`confirm evidence="${input.confirm}" review="${reviewConfirm}"`,
		],
	};
}

export function createRemoteKnownHostsSelectionStatusActivityResult(
	input: RemoteKnownHostsSelectionStatusActivityInput,
): StatusActivityResult {
	return {
		source: "timeline",
		action: "remote-known-hosts-selection",
		message: `remote known_hosts selection ${input.direction} ${input.id} ${input.host}:${input.port} selected=${input.selected}/${input.candidateCount}`,
		detail: [
			`target="${input.target}"`,
			`line=${input.sourceLine}`,
			`hostPattern=${input.hostPattern}`,
			`keyType=${input.keyType}`,
			`fingerprint=${input.fingerprint}`,
			`match=${input.match}`,
			"network=not-opened",
			"scan=false",
			"trust=not-applied",
			"knownHostsWrite=false",
		].join(" "),
		detailRows: [
			`selection target="${input.target}" lookup=${input.host}:${input.port} direction=${input.direction} selected=${input.selected}/${input.candidateCount}`,
			`candidate line=${input.sourceLine} hostPattern=${input.hostPattern} keyType=${input.keyType} fingerprint=${input.fingerprint}`,
			`decision match=${input.match} network=not-opened scan=false trust=not-applied knownHostsWrite=false`,
		],
	};
}

export function createRemoteKnownHostsPasteSelectionStatusActivityResult(
	review: RemoteKnownHostsPasteReview,
	method: "next" | "previous" | "number" | "command",
): StatusActivityResult {
	const candidate =
		review.selected === "none"
			? undefined
			: review.candidates.find((item) => item.index === review.selected);
	const selected = candidate?.index ?? "none";
	const reviewConfirm =
		review.id === "none"
			? "select remote profile"
			: `review host trust ${review.id}`;
	const compareConfirm =
		review.id === "none"
			? "select remote profile"
			: `compare host key ${review.id}`;
	return {
		source: "timeline",
		action: "remote-known-hosts-selection",
		message: `remote known_hosts paste selection ${candidate ? "selected" : "missing"} ${review.id} ${review.lookup} candidate=${selected}/${review.candidates.length} method=${method}`,
		detail: [
			`source=${review.source}`,
			`line=${candidate?.sourceLine ?? "none"}`,
			`key=${candidate?.keyType ?? "none"}`,
			`fingerprint=${candidate?.fingerprint ?? "sha256:unknown"}`,
			`rawContent=${review.rawContent}`,
			"network=not-opened",
			"trust=not-applied",
			"knownHostsWrite=false",
		].join(" "),
		detailRows: [
			`selection lookup=${review.lookup} provider=${review.provider} method=${method} candidate=${selected}/${review.candidates.length} line=${candidate?.sourceLine ?? "none"}`,
			`candidate host=${candidate?.hostPattern ?? "none"} marker=${candidate?.marker ?? "none"} kind=${candidate?.hostKind ?? "none"} key=${candidate?.keyType ?? "none"} fingerprint=${candidate?.fingerprint ?? "sha256:unknown"}`,
			`decision result=${review.decision} rawContent=${review.rawContent} network=not-opened trust=not-applied knownHostsWrite=false`,
			`confirm compare="${compareConfirm}" review="${reviewConfirm}"`,
		],
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
			"controls=enter stage · e evidence · t trust review · c connect preview · Status I timeline recovery",
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
		"controls=enter stage · e evidence · t trust review · c connect preview · Status I timeline recovery",
	);
	return rows;
}

export function formatRemoteKnownHostsSelectionHistoryRows(
	history: StatusActivityResult[],
	options: {
		selectedProfileId?: string;
		limit?: number;
	} = {},
): string[] {
	const selectionResults = getRemoteKnownHostsSelectionHistoryResults(
		history,
		options.limit,
	);
	const selectedProfileId = options.selectedProfileId ?? "none";
	const selectedIndex = getSelectedRemoteActivityIndex(
		selectionResults,
		options.selectedProfileId,
	);

	if (!selectionResults.length) {
		return [
			"KNOWN_HOSTS SELECTION HISTORY count=0 selected=none",
			"hint=use [/] 1-9 S or palette remote known_hosts select after paste review",
			"guards=localRead=false network=not-opened trust=not-applied knownHostsWrite=false",
		];
	}

	const rows = [
		`KNOWN_HOSTS SELECTION HISTORY count=${selectionResults.length} selected=${selectedProfileId}`,
	];
	for (const [index, result] of selectionResults.entries()) {
		const marker = index === selectedIndex ? ">" : " ";
		rows.push(`${marker} ${formatRemoteActivitySummary(result)}`);
		if (result.detail) {
			rows.push(`  ${result.detail}`);
		}
		const timelineSearch = createStatusActivityResultTimelineSearch(
			[result],
			0,
		);
		if (timelineSearch) {
			rows.push(`  timeline=${timelineSearch.query}`);
		}
	}
	rows.push(
		"controls=[/] rotate · 1-9 direct · S typed · y copy · E export · palette remote known_hosts select · Status I timeline recovery",
	);
	return rows;
}

export function getRemoteKnownHostsSelectionHistoryClipboardPreview(
	history: StatusActivityResult[],
	options: {
		selectedProfileId?: string;
		limit?: number;
	} = {},
): ClipboardPreview | undefined {
	const selectionResults = getRemoteKnownHostsSelectionHistoryResults(
		history,
		options.limit,
	);
	if (!selectionResults.length) {
		return undefined;
	}
	const selectedProfileId = options.selectedProfileId ?? "none";
	return createClipboardPreview({
		source: "status-activity",
		label: `remote known_hosts selection history ${selectedProfileId}`,
		copyText: formatRemoteKnownHostsSelectionHistoryRows(history, options).join(
			"\n",
		),
		details: [
			`selection-history count=${selectionResults.length} selected=${selectedProfileId}`,
			"guards=localRead=false network=not-opened trust=not-applied knownHostsWrite=false",
		],
	});
}

export function createRemoteKnownHostsSelectionHistoryAuditExportPlan(
	history: StatusActivityResult[],
	options: {
		baseDir: string;
		generatedAt?: Date;
		selectedProfileId?: string;
		limit?: number;
	},
): ConsoleAuditExportPlan | undefined {
	const selectionResults = getRemoteKnownHostsSelectionHistoryResults(
		history,
		options.limit,
	);
	if (!selectionResults.length) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const selectedProfileId = options.selectedProfileId ?? "none";
	return createConsoleAuditExportPlan(
		selectionResults.map((result, index) => ({
			id: `remote-known-hosts-selection-history-${index + 1}`,
			level: "info",
			time: formatAuditEventTime(generatedAt),
			message: formatRemoteKnownHostsSelectionHistoryAuditMessage(
				result,
				index,
				selectionResults.length,
			),
		})),
		{
			baseDir: options.baseDir,
			generatedAt,
			query: `remote known_hosts selection history ${selectedProfileId}`,
			scope: "filtered",
		},
	);
}

export async function writeRemoteKnownHostsSelectionHistoryAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	return writeConsoleAuditExport(plan);
}

export function createInterfaceConfirmationAuditExportPlan(
	history: StatusActivityResult[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
	},
): ConsoleAuditExportPlan | undefined {
	const result = getSelectedInterfaceConfirmationActivityResult(
		history,
		selectedIndex,
	);
	if (!result) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const timelineSearch = createStatusActivityResultTimelineSearch([result], 0);
	return createConsoleAuditExportPlan(
		[
			{
				id: "interface-confirmation-audit-1",
				level: result.message.includes("rejected") ? "fail" : "warn",
				time: formatAuditEventTime(generatedAt),
				message: [
					"interface confirmation audit",
					result.message,
					result.detail ? `detail=${quoteAuditAttribute(result.detail)}` : "",
					timelineSearch
						? `timeline=${quoteAuditAttribute(timelineSearch.query)}`
						: "",
				]
					.filter(Boolean)
					.join(" "),
			},
		],
		{
			baseDir: options.baseDir,
			generatedAt,
			query: timelineSearch?.query ?? result.message,
			scope: "selected",
		},
	);
}

export async function writeInterfaceConfirmationAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	return writeConsoleAuditExport(plan);
}

function isRemoteActivityResult(result: StatusActivityResult): boolean {
	return (
		result.source === "timeline" &&
		(result.action === "remote-host-review" ||
			result.action === "remote-host-key-evidence" ||
			result.action === "remote-host-trust-review" ||
			result.action === "remote-known-hosts-selection" ||
			result.action === "remote-connect")
	);
}

function getRemoteKnownHostsSelectionHistoryResults(
	history: StatusActivityResult[],
	limit = 3,
): StatusActivityResult[] {
	const boundedLimit = Math.max(1, Math.floor(limit));
	return history
		.filter(isRemoteKnownHostsSelectionActivityResult)
		.slice(0, boundedLimit);
}

function isRemoteKnownHostsSelectionActivityResult(
	result: StatusActivityResult,
): boolean {
	return (
		result.source === "timeline" &&
		result.action === "remote-known-hosts-selection"
	);
}

function formatRemoteKnownHostsSelectionHistoryAuditMessage(
	result: StatusActivityResult,
	index: number,
	total: number,
): string {
	const timelineSearch = createStatusActivityResultTimelineSearch([result], 0);
	return [
		"remote known_hosts selection history",
		`${index + 1}/${total}`,
		formatRemoteActivitySummary(result),
		result.detail ? `detail=${quoteAuditAttribute(result.detail)}` : undefined,
		timelineSearch
			? `timeline=${quoteAuditAttribute(timelineSearch.query)}`
			: undefined,
	]
		.filter(Boolean)
		.join(" ");
}

function quoteAuditAttribute(value: string): string {
	return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
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
	if (result.action === "remote-host-key-evidence") {
		return result.message.replace(/^remote host key evidence /, "evidence ");
	}
	if (result.action === "remote-host-trust-review") {
		return result.message.replace(/^remote host trust review /, "trust ");
	}
	if (result.action === "remote-known-hosts-selection") {
		return result.message
			.replace(/^remote known_hosts paste selection /, "known_hosts ")
			.replace(/^remote known_hosts selection /, "known_hosts ");
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

function isEvidenceHandoffStatusActivityResult(
	result: StatusActivityResult,
): boolean {
	return Boolean(formatStatusActivityResultHistoryTargetToken(result));
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

export type StatusActivityResultHistoryMoveTransition =
	| {
			kind: "selection";
			selectedIndex: number;
			copyPreviewRowIndex: 0;
			copyPreviewExpanded: false;
			notice: { level: "info"; message: string };
	  }
	| {
			kind: "notice";
			notice: { level: "warn"; message: string };
	  };

export function prepareStatusActivityResultHistoryMove(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	direction: "next" | "previous";
	filter: StatusActivityResultHistoryFilter;
}): StatusActivityResultHistoryMoveTransition {
	if (input.history.length === 0) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no status activity result history",
			},
		};
	}
	const selectedIndex = moveStatusActivityResultHistoryFilteredSelection(
		input.history,
		input.selectedIndex,
		input.direction,
		input.filter,
	);
	const result = input.history[selectedIndex];
	return {
		kind: "selection",
		selectedIndex,
		copyPreviewRowIndex: 0,
		copyPreviewExpanded: false,
		notice: {
			level: "info",
			message: `status activity history ${selectedIndex + 1}/${input.history.length} filter=${input.filter} ${result?.source ?? "none"} ${result?.action ?? "none"}`,
		},
	};
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
			...formatStatusActivityResultDetailRows(result),
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
	remoteKnownHostsSelectionAuditExports: ConsoleAuditExportPlan[] = [],
	selectedRemoteKnownHostsSelectionAuditExportIndex = 0,
	statusActivityResultHistory: StatusActivityResult[] = [],
	selectedStatusActivityResultHistoryIndex = 0,
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
	const selectedRemoteKnownHostsSelectionAuditExport =
		getSelectedRemoteKnownHostsSelectionHistoryAuditExport(
			remoteKnownHostsSelectionAuditExports,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		);
	const normalizedRemoteKnownHostsSelectionAuditExportIndex =
		getNormalizedSelectionIndex(
			remoteKnownHostsSelectionAuditExports.length,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		);
	const remoteKnownHostsSelectionAuditExportRows =
		selectedRemoteKnownHostsSelectionAuditExport
			? [
					`remote known_hosts evidence selected=${normalizedRemoteKnownHostsSelectionAuditExportIndex + 1}/${remoteKnownHostsSelectionAuditExports.length}`,
					`remote known_hosts evidence target=${basename(selectedRemoteKnownHostsSelectionAuditExport.path)}${selectedRemoteKnownHostsSelectionAuditExport.query ? ` query=${selectedRemoteKnownHostsSelectionAuditExport.query}` : ""} events=${selectedRemoteKnownHostsSelectionAuditExport.eventCount}`,
					`remote known_hosts evidence detail id:${formatRemoteKnownHostsSelectionHistoryEvidenceTarget(selectedRemoteKnownHostsSelectionAuditExport)} path=${selectedRemoteKnownHostsSelectionAuditExport.path} actions=R open G search y copy e export`,
					"remote known_hosts evidence handoff y/e palette=? known_hosts evidence copy/export",
				]
			: [];
	const selectedRemoteKnownHostsEvidenceHandoff =
		getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff(
			statusActivityResultHistory,
			selectedStatusActivityResultHistoryIndex,
		);
	const remoteKnownHostsEvidenceHandoffRows =
		selectedRemoteKnownHostsEvidenceHandoff
			? [
					`remote known_hosts handoffs count=${selectedRemoteKnownHostsEvidenceHandoff.total} selected=${selectedRemoteKnownHostsEvidenceHandoff.selected + 1}/${selectedRemoteKnownHostsEvidenceHandoff.total}`,
					`remote known_hosts handoff #${selectedRemoteKnownHostsEvidenceHandoff.historyIndex + 1} target=id:${selectedRemoteKnownHostsEvidenceHandoff.id} action=${selectedRemoteKnownHostsEvidenceHandoff.action} I=replay`,
					`remote known_hosts handoff detail query=${selectedRemoteKnownHostsEvidenceHandoff.jump.query} H select`,
				]
			: [];
	const latestRemoteKnownHostsEvidenceHandoffOpenIntent =
		getLatestRemoteKnownHostsEvidenceHandoffOpenIntent(history);
	const remoteKnownHostsEvidenceHandoffOpenRows =
		latestRemoteKnownHostsEvidenceHandoffOpenIntent
			? [
					`remote known_hosts handoff open target=id:${latestRemoteKnownHostsEvidenceHandoffOpenIntent.id} action=${latestRemoteKnownHostsEvidenceHandoffOpenIntent.action} row=${latestRemoteKnownHostsEvidenceHandoffOpenIntent.historyIndex + 1} matches=${latestRemoteKnownHostsEvidenceHandoffOpenIntent.matches} selected=${latestRemoteKnownHostsEvidenceHandoffOpenIntent.selected + 1}/${latestRemoteKnownHostsEvidenceHandoffOpenIntent.total}`,
					`remote known_hosts handoff open detail query=${latestRemoteKnownHostsEvidenceHandoffOpenIntent.jump.query} g Timeline v replay`,
				]
			: [];
	const selectedInterfaceConfirmationResult =
		getSelectedInterfaceConfirmationActivityResult(
			statusActivityResultHistory,
			selectedStatusActivityResultHistoryIndex,
		);
	const selectedInterfaceConfirmationResultIndex =
		selectedInterfaceConfirmationResult
			? getSelectedStatusActivityResultHistoryIndex(
					statusActivityResultHistory.length,
					selectedStatusActivityResultHistoryIndex,
				)
			: -1;
	const interfaceConfirmationTimelineSearch =
		selectedInterfaceConfirmationResult
			? createStatusActivityResultTimelineSearch(
					[selectedInterfaceConfirmationResult],
					0,
				)
			: undefined;
	const interfaceConfirmationRows = selectedInterfaceConfirmationResult
		? [
				`interface evidence selected=${selectedInterfaceConfirmationResultIndex + 1}/${statusActivityResultHistory.length}`,
				`interface evidence target=${formatInterfaceConfirmationActivityResultTarget(selectedInterfaceConfirmationResult)}${interfaceConfirmationTimelineSearch ? ` query=${interfaceConfirmationTimelineSearch.query}` : ""}`,
				`interface evidence detail ${selectedInterfaceConfirmationResult.detail ?? "-"} actions=y copy e export I timeline`,
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
		...remoteKnownHostsSelectionAuditExportRows,
		...interfaceConfirmationRows,
		...remoteKnownHostsEvidenceHandoffRows,
		...remoteKnownHostsEvidenceHandoffOpenRows,
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
	const remoteKnownHostsSelectionAuditExportControls =
		selectedRemoteKnownHostsSelectionAuditExport
			? " · remote known_hosts evidence · palette known_hosts copy/export"
			: "";
	const remoteKnownHostsEvidenceHandoffControls =
		selectedRemoteKnownHostsEvidenceHandoff
			? " · H handoff select · I handoff search"
			: "";
	const remoteKnownHostsEvidenceHandoffOpenControls =
		latestRemoteKnownHostsEvidenceHandoffOpenIntent
			? " · handoff open tracked"
			: "";
	const interfaceConfirmationControls = selectedInterfaceConfirmationResult
		? " · interface evidence target · palette interface evidence"
		: "";
	const controls = `controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export${processControlAuditExportControls}${trailControls}${resultJumpControls}${toolsRecoveryControls} · g Timeline audit search`;
	const controlsWithRemoteKnownHosts = controls.replace(
		" · g Timeline audit search",
		`${remoteKnownHostsSelectionAuditExportControls}${remoteKnownHostsEvidenceHandoffControls}${remoteKnownHostsEvidenceHandoffOpenControls}${interfaceConfirmationControls} · g Timeline audit search`,
	);
	if (history.length === 0) {
		return [
			"STATUS ACTIVITY COPY INTENTS count=0",
			...rowsBeforeHistory,
			"no Status activity copy intents yet",
			controlsWithRemoteKnownHosts,
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
		`${controlsWithRemoteKnownHosts} · :clipboard confirm=copy locked`,
	];
}

export type StatusActivityRemoteKnownHostsEvidenceHandoffSelection = {
	action: "copy" | "export";
	historyIndex: number;
	id: string;
	jump: StatusActivityCopyIntentTimelineSearch;
	selected: number;
	total: number;
};

function getSelectedInterfaceConfirmationActivityResult(
	history: StatusActivityResult[],
	selectedIndex = 0,
): StatusActivityResult | undefined {
	const selected = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedIndex,
	);
	const result = history[selected];
	return result?.source === "timeline" &&
		result.action === "interface-confirmation"
		? result
		: undefined;
}

function formatInterfaceConfirmationActivityResultTarget(
	result: StatusActivityResult,
): string {
	const match = result.message.match(
		/^interface confirmation (confirmed-blocked|rejected) (interface\.(?:enable|disable))(?:\s|$)/,
	);
	const status = match?.[1];
	const actionId = match?.[2];
	if (!status || !actionId) {
		return result.message;
	}
	const targetMatch = result.detail?.match(/(?:^| )target="((?:\\.|[^"\\])*)"/);
	const target = targetMatch?.[1]
		? unquoteAuditAttributeValue(targetMatch[1])
		: undefined;
	return `${actionId}:${status}${target ? ` target=${quoteAuditAttribute(target)}` : ""}`;
}

function unquoteAuditAttributeValue(value: string): string {
	let unquoted = "";
	for (let index = 0; index < value.length; index += 1) {
		const current = value[index];
		const next = value[index + 1];
		if (current === "\\" && (next === "\\" || next === '"')) {
			unquoted += next;
			index += 1;
			continue;
		}
		unquoted += current;
	}
	return unquoted;
}

export type StatusActivityRemoteKnownHostsEvidenceHandoffOpenIntent = {
	action: "copy" | "export";
	historyIndex: number;
	id: string;
	jump: StatusActivityCopyIntentTimelineSearch;
	matches: number;
	selected: number;
	total: number;
};

export function getStatusActivityRemoteKnownHostsEvidenceHandoffIndexes(
	history: StatusActivityResult[],
): number[] {
	return filterStatusActivityResultHistoryIndexes(history, "evidence-handoffs");
}

export function getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff(
	history: StatusActivityResult[],
	selectedHistoryIndex = 0,
): StatusActivityRemoteKnownHostsEvidenceHandoffSelection | undefined {
	const indexes =
		getStatusActivityRemoteKnownHostsEvidenceHandoffIndexes(history);
	if (indexes.length === 0) {
		return undefined;
	}
	const normalizedHistoryIndex = getSelectedStatusActivityResultHistoryIndex(
		history.length,
		selectedHistoryIndex,
	);
	const selected = Math.max(0, indexes.indexOf(normalizedHistoryIndex));
	const historyIndex = indexes[selected] ?? indexes[0];
	if (historyIndex === undefined) {
		return undefined;
	}
	const jump = createStatusActivityResultTimelineSearch(history, historyIndex);
	const target = jump
		? parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(jump.query)
		: undefined;
	if (
		!jump ||
		!target ||
		(target.action !== "copy" && target.action !== "export")
	) {
		return undefined;
	}
	return {
		action: target.action,
		historyIndex,
		id: target.id,
		jump,
		selected,
		total: indexes.length,
	};
}

export function createRemoteKnownHostsEvidenceHandoffOpenCopyIntent(
	selection: StatusActivityRemoteKnownHostsEvidenceHandoffSelection | undefined,
	options: {
		matches?: number;
	} = {},
): StatusActivityCopyIntentRecord | undefined {
	if (!selection) {
		return undefined;
	}
	const matches = Math.max(0, Math.floor(options.matches ?? 0));
	return createStatusActivityCopyIntentRecord(
		createClipboardPreview({
			source: "status-activity",
			label: [
				"remote known_hosts handoff open",
				`id:${selection.id}`,
				`action=${selection.action}`,
				`row=${selection.historyIndex + 1}`,
				`matches=${matches}`,
				`selected=${selection.selected + 1}/${selection.total}`,
			].join(" "),
			copyText: [
				selection.jump.query,
				selection.jump.message,
				`filter=${selection.jump.filter}`,
				"handoff=open",
				`row=${selection.historyIndex + 1}`,
				`matches=${matches}`,
			].join("\n"),
		}),
	);
}

export function getLatestRemoteKnownHostsEvidenceHandoffOpenIntent(
	history: StatusActivityCopyIntentRecord[],
): StatusActivityRemoteKnownHostsEvidenceHandoffOpenIntent | undefined {
	for (const record of history) {
		const parsed = parseRemoteKnownHostsEvidenceHandoffOpenIntent(record);
		if (parsed) {
			return parsed;
		}
	}
	return undefined;
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
	const knownHostsTarget =
		parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(intent.preview);
	if (knownHostsTarget) {
		return ` target=remote-known-hosts id:${knownHostsTarget.id}`;
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
	const knownHostsTarget =
		parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(jump.query);
	if (knownHostsTarget) {
		return [
			`remote known_hosts target=id:${knownHostsTarget.id} action=${knownHostsTarget.action} I=fresh`,
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
	if (target) {
		return target.pid
			? `process-control pid:${target.pid} action=${target.action}`
			: `process-control status:${target.status ?? "unknown"} action=${target.action}`;
	}
	const knownHostsTarget =
		parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(query);
	if (knownHostsTarget) {
		return `remote-known-hosts id:${knownHostsTarget.id} action=${knownHostsTarget.action}`;
	}
	return undefined;
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

function formatRemoteKnownHostsSelectionHistoryEvidenceTarget(
	plan: ConsoleAuditExportPlan,
): string {
	return (
		parseRemoteKnownHostsSelectionHistoryEvidenceTarget(plan.query) ?? "unknown"
	);
}

function parseRemoteKnownHostsSelectionHistoryEvidenceTarget(
	query: string | undefined,
): string | undefined {
	const match = query?.match(/^remote known_hosts selection history (.+)$/);
	return match?.[1]?.trim() || undefined;
}

function formatInterfaceConfirmationEvidenceTarget(
	plan: ConsoleAuditExportPlan,
): string {
	const target = parseInterfaceConfirmationEvidenceTarget(plan.query);
	return target ? `${target.actionId}:${target.status}` : "unknown";
}

function parseInterfaceConfirmationEvidenceTarget(
	query: string | undefined,
): { actionId: string; status: string } | undefined {
	const match = query?.match(
		/^interface confirmation (interface\.(?:enable|disable)) status=(confirmed-blocked|rejected)$/,
	);
	const actionId = match?.[1];
	const status = match?.[2];
	if (!actionId || !status) {
		return undefined;
	}
	return { actionId, status };
}

function parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(
	query: string,
): { action: string; id: string } | undefined {
	const match = query.match(
		/(?:^| )(?:palette remote known_hosts evidence audit|status evidence remote known_hosts audit) action=(\S+)(?: .*?)?target="?([^" ]+)"?/,
	);
	const action = match?.[1];
	const id = match?.[2];
	if (!action || !id) {
		return undefined;
	}
	return { action, id };
}

function parseRemoteKnownHostsEvidenceHandoffOpenIntent(
	record: StatusActivityCopyIntentRecord,
): StatusActivityRemoteKnownHostsEvidenceHandoffOpenIntent | undefined {
	const labelMatch = record.label.match(
		/^remote known_hosts handoff open id:([A-Za-z0-9._-]{1,64}) action=(copy|export) row=(\d+) matches=(\d+) selected=(\d+)\/(\d+)$/,
	);
	if (!labelMatch) {
		return undefined;
	}
	const [, id, action, row, matches, selected, total] = labelMatch;
	const [query, message, filterLine] = record.copyText.split(/\r?\n/);
	if (!id || !action || !row || !matches || !selected || !total || !query) {
		return undefined;
	}
	if (action !== "copy" && action !== "export") {
		return undefined;
	}
	const target = parseRemoteKnownHostsSelectionHistoryEvidenceAuditQuery(query);
	if (
		!target ||
		target.id !== id ||
		target.action !== action ||
		filterLine !== "filter=audit"
	) {
		return undefined;
	}
	return {
		action,
		historyIndex: Math.max(0, Number.parseInt(row, 10) - 1),
		id,
		jump: {
			filter: "audit",
			query,
			message:
				message ||
				`status activity result timeline search palette remote known_hosts evidence ${id}`,
		},
		matches: Math.max(0, Number.parseInt(matches, 10)),
		selected: Math.max(0, Number.parseInt(selected, 10) - 1),
		total: Math.max(1, Number.parseInt(total, 10)),
	};
}

function getRemoteKnownHostsSelectionHistoryEvidenceResultDetailTarget(
	detail?: string,
): string | undefined {
	const match = detail?.match(/(?:^| )target=([^ ]+)/);
	return match?.[1]?.trim() || undefined;
}

function getInterfaceConfirmationEvidenceResultDetailTarget(
	detail?: string,
): string | undefined {
	const match = detail?.match(/(?:^| )target=([^ ]+)/);
	return match?.[1]?.trim() || undefined;
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

export function prepareStatusActivityToolsEvidenceMatchOpen(
	recovery: StatusActivityToolsEvidenceSearchRecovery | undefined,
	selectedIndex: number,
	options: { baseDir: string; platform: SupportedPlatform },
): StatusActivityToolsEvidenceMatchOpenTransition {
	const resolvedIndex = clampIndex(selectedIndex, recovery?.items.length ?? 0);
	const item = recovery?.items[resolvedIndex];
	const result = createStatusActivityToolsEvidenceMatchResult(
		"open",
		recovery,
		resolvedIndex,
	);
	const auditMessage = formatStatusActivityToolsEvidenceMatchAuditMessage(
		"open",
		recovery,
		resolvedIndex,
	);
	if (!item) {
		return {
			kind: "notice",
			selectedIndex: resolvedIndex,
			notice: {
				level: "warn",
				message: "no recovered tools evidence match selected",
			},
			auditMessage,
			result,
		};
	}
	return {
		kind: "open",
		selectedIndex: resolvedIndex,
		item,
		plan: buildFileOpenPlan({
			baseDir: options.baseDir,
			source: "tools-export",
			label: `${recovery?.target === "archive" ? "archived " : ""}tools export ${item.scope} ${item.generatedAt}`,
			path: item.path,
			platform: options.platform,
		}),
		notice: {
			level: "info",
			message: `recovered tools evidence open confirmation opened for ${item.fileName}`,
		},
		auditMessage,
		result,
	};
}

export function prepareStatusActivityToolsEvidenceMatchArchive(
	recovery: StatusActivityToolsEvidenceSearchRecovery | undefined,
	selectedIndex: number,
	options: { baseDir: string },
): StatusActivityToolsEvidenceMatchArchiveTransition {
	const resolvedIndex = clampIndex(selectedIndex, recovery?.items.length ?? 0);
	const item = recovery?.items[resolvedIndex];
	const unavailableReason =
		recovery?.target === "archive"
			? "archived Tools evidence matches are already archived"
			: undefined;
	const result = createStatusActivityToolsEvidenceMatchResult(
		"archive",
		recovery,
		resolvedIndex,
		{ unavailableReason },
	);
	const auditMessage = formatStatusActivityToolsEvidenceMatchAuditMessage(
		"archive",
		recovery,
		resolvedIndex,
		{ unavailableReason },
	);
	if (!item || unavailableReason) {
		return {
			kind: "notice",
			selectedIndex: resolvedIndex,
			notice: {
				level: "warn",
				message: unavailableReason
					? "archived tools evidence matches are already archived"
					: "no recovered tools evidence match selected",
			},
			auditMessage,
			result,
		};
	}
	return {
		kind: "confirmation",
		selectedIndex: resolvedIndex,
		item,
		plan: createToolHistoryExportArchivePlan(options.baseDir, item.path),
		notice: {
			level: "info",
			message: `recovered tools evidence archive confirmation opened for ${item.fileName}`,
		},
		auditMessage,
		result,
	};
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

export function prepareRecoveredEvidenceSelectionTransition(input: {
	family: RecoveredEvidenceFamily;
	exports: ConsoleAuditExportPlan[];
	selectedIndex: number;
	direction: "next" | "previous";
	origin?: RecoveredEvidenceActionOrigin;
}): RecoveredEvidenceSelectionTransition {
	const selectedIndex = clampIndex(input.selectedIndex, input.exports.length);
	const labels: Record<
		RecoveredEvidenceFamily,
		{ selection: string; unavailable: string }
	> = {
		timeline: {
			selection: "timeline evidence trail",
			unavailable: "no alternate timeline evidence trail exports",
		},
		process: {
			selection: "process control evidence",
			unavailable: "no alternate process control evidence exports",
		},
		"remote-known-hosts": {
			selection: "remote known_hosts evidence",
			unavailable: "no alternate remote known_hosts selection evidence exports",
		},
		interface: {
			selection: "interface confirmation evidence",
			unavailable: "no alternate interface confirmation evidence exports",
		},
	};
	const label = labels[input.family];
	if (input.exports.length <= 1) {
		return {
			kind: "notice",
			selectedIndex,
			notice: { level: "warn", message: label.unavailable },
			...getRecoveredEvidenceStatusKind(input.family),
			...createRecoveredEvidenceActivity(
				input.family,
				"select",
				undefined,
				selectedIndex,
				Math.max(1, input.exports.length),
				input.origin,
			),
		};
	}
	const offset = input.direction === "next" ? 1 : -1;
	const nextIndex =
		(selectedIndex + offset + input.exports.length) % input.exports.length;
	const item = input.exports[nextIndex];
	if (!item) {
		return {
			kind: "notice",
			selectedIndex,
			notice: { level: "warn", message: label.unavailable },
			...getRecoveredEvidenceStatusKind(input.family),
			...createRecoveredEvidenceActivity(
				input.family,
				"select",
				undefined,
				selectedIndex,
				Math.max(1, input.exports.length),
				input.origin,
			),
		};
	}
	return {
		kind: "selection",
		selectedIndex: nextIndex,
		item,
		total: input.exports.length,
		...getRecoveredEvidenceStatusKind(input.family),
		...createRecoveredEvidenceActivity(
			input.family,
			"select",
			item,
			nextIndex,
			input.exports.length,
			input.origin,
		),
		notice: {
			level: "info",
			message: `${label.selection} selected ${nextIndex + 1}/${input.exports.length} ${basename(item.path)}`,
		},
	};
}

export function prepareRecoveredEvidenceSearchTransition(input: {
	family: RecoveredEvidenceFamily;
	exports: ConsoleAuditExportPlan[];
	selectedIndex: number;
	events: ConsoleEvent[];
	origin?: RecoveredEvidenceActionOrigin;
}): RecoveredEvidenceSearchTransition {
	const selectedIndex = clampIndex(input.selectedIndex, input.exports.length);
	const item = input.exports[selectedIndex];
	const jump = createRecoveredEvidenceTimelineSearch(input.family, item);
	if (!item || !jump) {
		return {
			kind: "notice",
			selectedIndex,
			notice: {
				level: "warn",
				message: getMissingRecoveredEvidenceSearchMessage(input.family),
			},
			...createRecoveredEvidenceActivity(
				input.family,
				"search",
				undefined,
				selectedIndex,
				Math.max(1, input.exports.length),
				input.origin,
			),
		};
	}
	const timeline = prepareTimelineSearchJumpTransition(input.events, jump);
	return {
		kind: "search",
		selectedIndex,
		item,
		total: input.exports.length,
		timeline,
		...createRecoveredEvidenceActivity(
			input.family,
			"search",
			item,
			selectedIndex,
			input.exports.length,
			input.origin,
		),
	};
}

export function prepareRecoveredEvidenceOpenTransition(input: {
	family: RecoveredEvidenceFamily;
	exports: ConsoleAuditExportPlan[];
	selectedIndex: number;
	activeIndex: ConsoleAuditExportIndex;
	archiveIndex: ConsoleAuditExportIndex;
	baseDir: string;
	platform: SupportedPlatform;
	origin?: RecoveredEvidenceActionOrigin;
}): RecoveredEvidenceOpenTransition {
	const selectedIndex = clampIndex(input.selectedIndex, input.exports.length);
	const item = input.exports[selectedIndex];
	if (!item) {
		return {
			kind: "notice",
			selectedIndex,
			notice: {
				level: "warn",
				message: getMissingRecoveredEvidenceOpenMessage(input.family),
			},
			...createRecoveredEvidenceActivity(
				input.family,
				"open",
				undefined,
				selectedIndex,
				Math.max(1, input.exports.length),
				input.origin,
			),
		};
	}
	const activeIndex = getStatusActivityCopyIntentAuditExportIndex(
		input.activeIndex,
		item,
	);
	const archiveIndex = getStatusActivityCopyIntentAuditExportIndex(
		input.archiveIndex,
		item,
	);
	const masterSelection =
		activeIndex !== undefined
			? { state: "active" as const, selectedIndex: activeIndex }
			: archiveIndex !== undefined
				? { state: "archived" as const, selectedIndex: archiveIndex }
				: undefined;
	return {
		kind: "open",
		selectedIndex,
		item,
		total: input.exports.length,
		plan: createRecoveredEvidenceOpenPlan(input.family, item, {
			baseDir: input.baseDir,
			platform: input.platform,
		}),
		...(masterSelection ? { masterSelection } : {}),
		statusEvidenceKind: input.family === "interface" ? "interface" : "audit",
		notice: {
			level: "info",
			message: getRecoveredEvidenceOpenMessage(
				input.family,
				item,
				masterSelection,
			),
		},
		...createRecoveredEvidenceActivity(
			input.family,
			"open",
			item,
			selectedIndex,
			input.exports.length,
			input.origin,
		),
	};
}

function getRecoveredEvidenceStatusKind(family: RecoveredEvidenceFamily): {
	statusEvidenceKind?: "remote-known-hosts" | "interface";
} {
	if (family === "remote-known-hosts" || family === "interface") {
		return { statusEvidenceKind: family };
	}
	return {};
}

function createRecoveredEvidenceActivity(
	family: RecoveredEvidenceFamily,
	action: "select" | "open" | "search",
	item: ConsoleAuditExportPlan | undefined,
	selectedIndex: number,
	total: number,
	origin: RecoveredEvidenceActionOrigin | undefined,
): RecoveredEvidenceActivity {
	const options = { selectedIndex, total };
	if (origin === "palette") {
		switch (family) {
			case "timeline":
				return {
					auditMessage: formatTimelineEvidenceTrailPaletteAuditMessage(
						action,
						item,
						options,
					),
					activityResult:
						createTimelineEvidenceTrailPaletteStatusActivityResult(
							action,
							item,
							options,
						),
				};
			case "process":
				return {
					auditMessage: formatProcessControlEvidencePaletteAuditMessage(
						action,
						item,
						options,
					),
					activityResult:
						createProcessControlEvidencePaletteStatusActivityResult(
							action,
							item,
							options,
						),
				};
			case "remote-known-hosts":
				return {
					auditMessage:
						formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage(
							action,
							item,
							options,
						),
					activityResult:
						createRemoteKnownHostsSelectionHistoryEvidencePaletteStatusActivityResult(
							action,
							item,
							options,
						),
				};
			case "interface":
				return {
					auditMessage: formatInterfaceConfirmationEvidencePaletteAuditMessage(
						action,
						item,
						options,
					),
					activityResult:
						createInterfaceConfirmationEvidencePaletteStatusActivityResult(
							action,
							item,
							options,
						),
				};
		}
	}
	if (origin !== "status-evidence" || action !== "search") {
		return {};
	}
	switch (family) {
		case "process":
			return {
				auditMessage: formatProcessControlEvidenceStatusAuditMessage(
					"search",
					item,
					options,
				),
				activityResult: createProcessControlEvidenceStatusActivityResult(
					"search",
					item,
					options,
				),
			};
		case "remote-known-hosts":
			return {
				auditMessage:
					formatRemoteKnownHostsSelectionHistoryEvidenceStatusAuditMessage(
						"search",
						item,
						options,
					),
				activityResult:
					createRemoteKnownHostsSelectionHistoryEvidenceStatusActivityResult(
						"search",
						item,
						options,
					),
			};
		case "interface":
			return {
				auditMessage: formatInterfaceConfirmationEvidenceStatusAuditMessage(
					"search",
					item,
					options,
				),
				activityResult: createInterfaceConfirmationEvidenceStatusActivityResult(
					"search",
					item,
					options,
				),
			};
		case "timeline":
			return {};
	}
}

function createRecoveredEvidenceTimelineSearch(
	family: RecoveredEvidenceFamily,
	item: ConsoleAuditExportPlan | undefined,
): StatusActivityCopyIntentTimelineSearch | undefined {
	switch (family) {
		case "timeline":
			return createTimelineEvidenceTrailTimelineSearch(item);
		case "process":
			return createProcessControlAuditExportTimelineSearch(item);
		case "remote-known-hosts":
			return createRemoteKnownHostsSelectionHistoryAuditExportTimelineSearch(
				item,
			);
		case "interface":
			return createInterfaceConfirmationAuditExportTimelineSearch(item);
	}
}

function createRecoveredEvidenceOpenPlan(
	family: RecoveredEvidenceFamily,
	item: ConsoleAuditExportPlan,
	options: { baseDir: string; platform: SupportedPlatform },
): FileOpenPlan {
	switch (family) {
		case "timeline":
			return createTimelineEvidenceTrailAuditExportOpenPlan(item, options);
		case "process":
			return createProcessControlAuditExportOpenPlan(item, options);
		case "remote-known-hosts":
			return createRemoteKnownHostsSelectionHistoryAuditExportOpenPlan(
				item,
				options,
			);
		case "interface":
			return createInterfaceConfirmationAuditExportOpenPlan(item, options);
	}
}

function getMissingRecoveredEvidenceSearchMessage(
	family: RecoveredEvidenceFamily,
): string {
	switch (family) {
		case "timeline":
			return "no timeline evidence trail export for timeline";
		case "process":
			return "no process control evidence export for timeline";
		case "remote-known-hosts":
			return "no remote known_hosts selection evidence export for timeline";
		case "interface":
			return "no interface confirmation evidence export for timeline";
	}
}

function getMissingRecoveredEvidenceOpenMessage(
	family: RecoveredEvidenceFamily,
): string {
	switch (family) {
		case "timeline":
			return "no timeline evidence trail export to open";
		case "process":
			return "no process control evidence export to open";
		case "remote-known-hosts":
			return "no remote known_hosts selection evidence export to open";
		case "interface":
			return "no interface confirmation evidence export to open";
	}
}

function getRecoveredEvidenceOpenMessage(
	family: RecoveredEvidenceFamily,
	item: ConsoleAuditExportPlan,
	masterSelection: RecoveredEvidenceMasterSelection | undefined,
): string {
	switch (family) {
		case "timeline":
			return `timeline evidence trail export open confirmation opened for ${item.path}${masterSelection ? ` evidence=${masterSelection.selectedIndex + 1}` : ""}`;
		case "process":
			return `process control evidence export open confirmation opened for ${item.path}`;
		case "remote-known-hosts":
			return `remote known_hosts selection evidence export open confirmation opened for ${item.path}`;
		case "interface":
			return `interface confirmation evidence export open confirmation opened for ${item.path}`;
	}
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

export function getSelectedRemoteKnownHostsSelectionHistoryAuditExport(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
): ConsoleAuditExportPlan | undefined {
	if (exports.length === 0) {
		return undefined;
	}
	return exports[getNormalizedSelectionIndex(exports.length, selectedIndex)];
}

export function moveRemoteKnownHostsSelectionHistoryAuditExportSelection(
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

export function getSelectedInterfaceConfirmationAuditExport(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
): ConsoleAuditExportPlan | undefined {
	if (exports.length === 0) {
		return undefined;
	}
	return exports[getNormalizedSelectionIndex(exports.length, selectedIndex)];
}

export function moveInterfaceConfirmationAuditExportSelection(
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

export function prepareTimelineEvidenceTrailSourceFilterTransition(input: {
	exports: ConsoleAuditExportPlan[];
	filter: TimelineEvidenceTrailSourceFilter;
	origin?: "keyboard" | "palette";
}): {
	filter: TimelineEvidenceTrailSourceFilter;
	selectedIndex: 0;
	notice: { level: "info" | "warn"; message: string };
	auditMessage?: string;
	activityResult?: StatusActivityResult;
} {
	const filter = nextTimelineEvidenceTrailSourceFilter(input.filter);
	const visible = filterTimelineEvidenceTrailAuditExports(
		input.exports,
		filter,
	);
	const context = {
		sourceFilter: filter,
		visible: visible.length,
		total: input.exports.length,
	};
	return {
		filter,
		selectedIndex: 0,
		notice: {
			level: visible.length ? "info" : "warn",
			message: `timeline evidence trail source filter ${filter} visible ${visible.length}/${input.exports.length}${input.origin === "palette" ? " origin=palette" : ""}`,
		},
		...(input.origin === "palette"
			? {
					auditMessage: formatTimelineEvidenceTrailPaletteAuditMessage(
						"source",
						undefined,
						context,
					),
					activityResult:
						createTimelineEvidenceTrailPaletteStatusActivityResult(
							"source",
							undefined,
							context,
						),
				}
			: {}),
	};
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
	const handoffOpenIntent =
		parseRemoteKnownHostsEvidenceHandoffOpenIntent(record);
	if (handoffOpenIntent) {
		return {
			...handoffOpenIntent.jump,
			message: `status activity copy intent timeline search remote known_hosts handoff open ${handoffOpenIntent.id} action=${handoffOpenIntent.action}`,
		};
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
		(result.action === "interface-evidence-filter" ||
			result.action === "interface-evidence-find")
	) {
		return createInterfaceEvidenceManagementResultTimelineSearch(result);
	}
	if (
		result.source === "evidence" &&
		(result.action === "interface-evidence-archive" ||
			result.action === "interface-evidence-retention")
	) {
		return createInterfaceEvidenceOutcomeResultTimelineSearch(result);
	}
	if (
		result.source === "evidence" &&
		result.action === "process-control-evidence"
	) {
		return createProcessControlEvidenceResultTimelineSearch(result);
	}
	if (
		result.source === "evidence" &&
		result.action === "remote-known-hosts-evidence"
	) {
		return createRemoteKnownHostsSelectionHistoryEvidenceResultTimelineSearch(
			result,
		);
	}
	if (
		result.source === "evidence" &&
		result.action === "interface-confirmation"
	) {
		return createInterfaceConfirmationEvidenceResultTimelineSearch(result);
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
	if (
		result.source === "timeline" &&
		result.action === "remote-host-key-evidence"
	) {
		return createRemoteHostKeyEvidenceResultTimelineSearch(result);
	}
	if (
		result.source === "timeline" &&
		result.action === "remote-host-trust-review"
	) {
		return createRemoteHostKeyTrustReviewResultTimelineSearch(result);
	}
	if (
		result.source === "timeline" &&
		result.action === "remote-known-hosts-selection"
	) {
		return createRemoteKnownHostsSelectionResultTimelineSearch(result);
	}
	if (result.source === "timeline" && result.action === "remote-connect") {
		return createRemoteConnectResultTimelineSearch(result);
	}
	if (
		result.source === "timeline" &&
		result.action === "interface-confirmation"
	) {
		return createInterfaceConfirmationResultTimelineSearch(result);
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
		/^remote connect (confirmed-ready|confirmed-blocked|rejected|connected|failed|cancelled) ([A-Za-z0-9._-]{1,64}) /,
	);
	const status = match?.[1];
	const id = match?.[2];
	if (!id || !status) {
		return undefined;
	}
	const storedAudit = result.detailRows
		?.find((row) => row.startsWith("audit="))
		?.slice("audit=".length);
	return {
		filter: "audit",
		query: storedAudit ?? `remote connect audit id=${id} status=${status}`,
		message: `status activity result timeline search remote connect ${id} ${status}`,
	};
}

function createInterfaceConfirmationResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^interface confirmation (confirmed-blocked|rejected) (interface\.(?:enable|disable)) /,
	);
	const status = match?.[1];
	const actionId = match?.[2];
	if (!actionId || !status) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `interface confirmation ${actionId} status=${status}`,
		message: `status activity result timeline search interface confirmation ${actionId} ${status}`,
	};
}

function createRemoteHostKeyTrustReviewResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^remote host trust review (confirmed-blocked|rejected) ([A-Za-z0-9._-]{1,64}) /,
	);
	const status = match?.[1];
	const id = match?.[2];
	if (!id || !status) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `remote host trust review audit id=${id} status=${status}`,
		message: `status activity result timeline search remote host trust review ${id} ${status}`,
	};
}

function createRemoteHostKeyEvidenceResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^remote host key evidence (recorded-blocked|rejected) ([A-Za-z0-9._-]{1,64}) /,
	);
	const status = match?.[1];
	const id = match?.[2];
	if (!id || !status) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `remote host key evidence input audit id=${id} status=${status}`,
		message: `status activity result timeline search remote host key evidence ${id} ${status}`,
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

function createRemoteKnownHostsSelectionResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const pasteMatch = result.message.match(
		/^remote known_hosts paste selection (selected|missing) ([A-Za-z0-9._-]{1,64}) .* candidate=(\d+|none)\/\d+ method=([a-z]+)$/,
	);
	if (pasteMatch) {
		const [, , id, candidate, method] = pasteMatch;
		if (!id || !candidate || !method) {
			return undefined;
		}
		return {
			filter: "audit",
			query: `remote known_hosts paste selection audit id=${id} candidate=${candidate} method=${method}`,
			message: `status activity result timeline search remote known_hosts selection ${id} candidate=${candidate}`,
		};
	}
	const moveMatch = result.message.match(
		/^remote known_hosts selection (next|previous) ([A-Za-z0-9._-]{1,64}) .* selected=(\d+)\/\d+$/,
	);
	if (!moveMatch) {
		return undefined;
	}
	const [, , id, selected] = moveMatch;
	if (!id || !selected) {
		return undefined;
	}
	return {
		filter: "audit",
		query: `remote known_hosts selection audit id=${id} selected=${selected}`,
		message: `status activity result timeline search remote known_hosts selection ${id} selected=${selected}`,
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

function createRemoteKnownHostsSelectionHistoryEvidenceResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^(palette remote known_hosts evidence|status evidence remote known_hosts) (select|open|search|copy|export)(?:\s|$)/,
	);
	if (!match) {
		return undefined;
	}
	const [, prefix, action] = match;
	const auditPrefix =
		prefix === "status evidence remote known_hosts"
			? "status evidence remote known_hosts audit"
			: "palette remote known_hosts evidence audit";
	const messagePrefix =
		prefix === "status evidence remote known_hosts"
			? "status remote known_hosts evidence"
			: "palette remote known_hosts evidence";
	const target = getRemoteKnownHostsSelectionHistoryEvidenceResultDetailTarget(
		result.detail,
	);
	if (target) {
		return {
			filter: "audit",
			query: `${auditPrefix} action=${action} target="${target}"`,
			message: `status activity result timeline search ${messagePrefix} ${target}`,
		};
	}
	return {
		filter: "audit",
		query: `${auditPrefix} action=${action} status=unavailable`,
		message: `status activity result timeline search ${messagePrefix} unavailable`,
	};
}

function createInterfaceConfirmationEvidenceResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const match = result.message.match(
		/^(palette interface evidence|status evidence interface) (select|open|search)(?:\s|$)/,
	);
	if (!match) {
		return undefined;
	}
	const [, prefix, action] = match;
	const auditPrefix =
		prefix === "status evidence interface"
			? "status evidence interface audit"
			: "palette interface evidence audit";
	const messagePrefix =
		prefix === "status evidence interface"
			? "status interface evidence"
			: "palette interface evidence";
	const target = getInterfaceConfirmationEvidenceResultDetailTarget(
		result.detail,
	);
	if (target) {
		return {
			filter: "audit",
			query: `${auditPrefix} action=${action} target="${target}"`,
			message: `status activity result timeline search ${messagePrefix} ${target}`,
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

function createInterfaceEvidenceManagementResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const action =
		result.action === "interface-evidence-filter" ? "filter" : "find";
	const match = result.message.match(
		/^interface evidence (filter|find) state=(all|active|archived) query=(.*) visible=(\d+\/\d+)$/,
	);
	if (!match || match[1] !== action) {
		return undefined;
	}
	const [, , state, query, visible] = match;
	return {
		filter: "audit",
		query: formatInterfaceEvidenceManagementAuditMessage(action, {
			state: state as "all" | "active" | "archived",
			query: query === "-" ? "" : query,
			visible: Number(visible?.split("/")[0] ?? 0),
			total: Number(visible?.split("/")[1] ?? 0),
		}),
		message: `status activity result timeline search interface evidence ${action}`,
	};
}

function createInterfaceEvidenceOutcomeResultTimelineSearch(
	result: StatusActivityResult,
): StatusActivityCopyIntentTimelineSearch | undefined {
	const auditMessage = result.detailRows
		?.find((row) => row.startsWith("audit="))
		?.slice("audit=".length);
	if (!auditMessage) {
		return undefined;
	}
	const action =
		result.action === "interface-evidence-archive" ? "archive" : "retention";
	return {
		filter: "audit",
		query: auditMessage,
		message: `status activity result timeline search interface evidence ${action}`,
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

export function prepareStatusActivityResultTimelineHandoffReplay(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord;
	selectedAuditJumpIntent?: StatusActivityCopyIntentRecord;
}): StatusActivityResultTimelineHandoffReplayTransition {
	const jump = createStatusActivityResultTimelineSearchReplay(
		input.history,
		input.selectedIndex,
		input.latestAuditJumpIntent,
		input.selectedAuditJumpIntent,
	);
	if (!jump) {
		const warning = createStatusActivityResultTimelineSearchReplayWarning(
			input.history,
			input.selectedIndex,
			input.latestAuditJumpIntent,
			input.selectedAuditJumpIntent,
		);
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message:
					formatStatusActivityResultAuditJumpReplayWarningAuditMessage(warning),
			},
		};
	}
	return {
		kind: "replay",
		jump,
		intent: createStatusActivityResultTimelineSearchIntent(jump),
		notice: { level: "info", message: jump.message },
	};
}

export function prepareStatusActivityResultTimelineHandoffOpenTransition(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	latestAuditJumpIntent?: StatusActivityCopyIntentRecord;
	selectedAuditJumpIntent?: StatusActivityCopyIntentRecord;
	events: ConsoleEvent[];
	origin?: "keyboard" | "palette";
	filter?: StatusActivityResultTimelineJumpFilter;
}): StatusActivityResultTimelineHandoffOpenTransition {
	const replay = prepareStatusActivityResultTimelineHandoffReplay(input);
	if (replay.kind === "notice") {
		return {
			...replay,
			...(input.origin === "palette"
				? {
						auditMessage:
							formatStatusActivityResultTimelineJumpPaletteAuditMessage("open"),
						activityResult:
							createStatusActivityResultTimelineJumpPaletteResult("open"),
					}
				: {}),
		};
	}
	const timeline = prepareTimelineSearchJumpTransition(
		input.events,
		replay.jump,
		{
			messageSuffix: input.origin === "palette" ? " origin=palette" : "",
		},
	);
	const selection = getStatusActivityResultTimelineJumpSelection(
		input.history,
		input.selectedIndex,
		input.filter ?? "all",
	);
	const activityOptions = {
		historyIndex: input.selectedIndex,
		jump: replay.jump,
		matches: timeline.matches,
		selectedIndex: selection?.selectedIndex,
		total: selection?.total,
	};
	return {
		kind: "open",
		jump: replay.jump,
		...(replay.intent ? { intent: replay.intent } : {}),
		timeline,
		...(input.origin === "palette"
			? {
					auditMessage:
						formatStatusActivityResultTimelineJumpPaletteAuditMessage(
							"open",
							activityOptions,
						),
					activityResult: createStatusActivityResultTimelineJumpPaletteResult(
						"open",
						activityOptions,
					),
				}
			: {}),
	};
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

export function createRemoteKnownHostsSelectionHistoryAuditExportTimelineSearch(
	plan?: ConsoleAuditExportPlan,
): StatusActivityCopyIntentTimelineSearch | undefined {
	if (!plan?.query) {
		return undefined;
	}
	return {
		filter: "audit",
		query: plan.query,
		message: `remote known_hosts selection evidence recovered search ${basename(plan.path)}`,
	};
}

export function createInterfaceConfirmationAuditExportTimelineSearch(
	plan?: ConsoleAuditExportPlan,
): StatusActivityCopyIntentTimelineSearch | undefined {
	if (!plan?.query) {
		return undefined;
	}
	return {
		filter: "audit",
		query: plan.query,
		message: `interface confirmation evidence recovered search ${basename(plan.path)}`,
	};
}

export function createRemoteKnownHostsSelectionHistoryEvidenceClipboardPreview(
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): ClipboardPreview | undefined {
	if (!plan) {
		return undefined;
	}
	const selected = getRemoteKnownHostsSelectionHistoryEvidenceSelection(plan, {
		selectedIndex: options.selectedIndex,
		total: options.total,
	});
	return createClipboardPreview({
		source: "status-activity",
		label: `remote known_hosts evidence ${selected.target}`,
		copyText: [
			`remote known_hosts evidence selected=${selected.selected}/${selected.total}`,
			`target=${selected.target}`,
			`file=${basename(plan.path)}`,
			`query=${plan.query ?? "-"}`,
			`path=${plan.path}`,
			`events=${plan.eventCount}`,
			"guards=localRead=false network=not-opened scan=false trust=not-applied knownHostsWrite=false",
		].join("\n"),
		details: [
			`target=${selected.target} selected=${selected.selected}/${selected.total} events=${plan.eventCount}`,
			`path=${plan.path}`,
			"guards=localRead=false network=not-opened trust=not-applied knownHostsWrite=false",
		],
	});
}

export function createRemoteKnownHostsSelectionHistoryEvidenceAuditExportPlan(
	plan: ConsoleAuditExportPlan | undefined,
	options: {
		baseDir: string;
		generatedAt?: Date;
		selectedIndex?: number;
		total?: number;
	},
): ConsoleAuditExportPlan | undefined {
	if (!plan) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const selected = getRemoteKnownHostsSelectionHistoryEvidenceSelection(plan, {
		selectedIndex: options.selectedIndex,
		total: options.total,
	});
	return createConsoleAuditExportPlan(
		[
			{
				id: `remote-known-hosts-evidence-handoff-${selected.selected}`,
				level: "info",
				time: formatAuditEventTime(generatedAt),
				message: [
					`remote known_hosts evidence handoff selected=${selected.selected}/${selected.total}`,
					`target="${formatTimelineEvidenceTrailAuditValue(selected.target)}"`,
					`label="${formatTimelineEvidenceTrailAuditValue(basename(plan.path))}"`,
					`query="${formatTimelineEvidenceTrailAuditValue(plan.query ?? "-")}"`,
					`path="${formatTimelineEvidenceTrailAuditValue(plan.path)}"`,
					`events=${plan.eventCount}`,
					'guards="localRead=false network=not-opened scan=false trust=not-applied knownHostsWrite=false"',
				].join(" "),
			},
		],
		{
			baseDir: options.baseDir,
			generatedAt,
			query: `remote known_hosts evidence handoff ${selected.target}`,
			scope: "selected",
		},
	);
}

function getRemoteKnownHostsSelectionHistoryEvidenceSelection(
	plan: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	},
): { selected: number; total: number; target: string } {
	const total = Math.max(1, Math.floor(options.total ?? 1));
	const selected = Math.min(
		total,
		Math.max(1, Math.floor(options.selectedIndex ?? 0) + 1),
	);
	return {
		selected,
		total,
		target: formatRemoteKnownHostsSelectionHistoryEvidenceTarget(plan),
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

export type StatusActivityAuditExportSelection =
	| { kind: "copy-intent"; plan: ConsoleAuditExportPlan }
	| { kind: "interface-confirmation"; plan: ConsoleAuditExportPlan }
	| { kind: "remote-known-hosts" };

export function prepareStatusActivityAuditExportSelection(input: {
	copyIntents: StatusActivityCopyIntentRecord[];
	selectedCopyIntentIndex: number;
	results: StatusActivityResult[];
	selectedResultIndex: number;
	baseDir: string;
	generatedAt?: Date;
}): StatusActivityAuditExportSelection {
	const options = {
		baseDir: input.baseDir,
		generatedAt: input.generatedAt,
	};
	const copyIntentPlan = createStatusActivityCopyIntentAuditExportPlan(
		input.copyIntents,
		input.selectedCopyIntentIndex,
		options,
	);
	if (copyIntentPlan) {
		return { kind: "copy-intent", plan: copyIntentPlan };
	}
	const interfacePlan = createInterfaceConfirmationAuditExportPlan(
		input.results,
		input.selectedResultIndex,
		options,
	);
	return interfacePlan
		? { kind: "interface-confirmation", plan: interfacePlan }
		: { kind: "remote-known-hosts" };
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

export function createRemoteKnownHostsSelectionHistoryAuditExportOpenPlan(
	plan: ConsoleAuditExportPlan,
	options: {
		baseDir: string;
		platform: SupportedPlatform;
	},
): FileOpenPlan {
	return buildFileOpenPlan({
		baseDir: options.baseDir,
		label: `remote known_hosts selection history export ${plan.scope} ${plan.query}`,
		path: plan.path,
		platform: options.platform,
		source: "timeline-export",
	});
}

export function createInterfaceConfirmationAuditExportOpenPlan(
	plan: ConsoleAuditExportPlan,
	options: {
		baseDir: string;
		platform: SupportedPlatform;
	},
): FileOpenPlan {
	return buildFileOpenPlan({
		baseDir: options.baseDir,
		label: `interface confirmation evidence export ${plan.scope} ${plan.query}`,
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

export function createRemoteKnownHostsSelectionHistoryEvidencePaletteStatusActivityResult(
	action: "select" | "open" | "search" | "copy" | "export",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createRemoteKnownHostsSelectionHistoryEvidenceStatusActivityResultWithPrefix(
		"palette remote known_hosts evidence",
		action,
		plan,
		options,
	);
}

export function createRemoteKnownHostsSelectionHistoryEvidenceStatusActivityResult(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createRemoteKnownHostsSelectionHistoryEvidenceStatusActivityResultWithPrefix(
		"status evidence remote known_hosts",
		action,
		plan,
		options,
	);
}

function createRemoteKnownHostsSelectionHistoryEvidenceStatusActivityResultWithPrefix(
	prefix:
		| "palette remote known_hosts evidence"
		| "status evidence remote known_hosts",
	action: "select" | "open" | "search" | "copy" | "export",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	if (!plan) {
		return {
			source: "evidence",
			action: "remote-known-hosts-evidence",
			message: `${prefix} ${action} unavailable`,
			detail:
				"no recovered remote known_hosts selection-history export selected",
		};
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return {
		source: "evidence",
		action: "remote-known-hosts-evidence",
		message: `${prefix} ${action} ${selected + 1}/${total} ${basename(plan.path)}`,
		detail: [
			`target=${formatRemoteKnownHostsSelectionHistoryEvidenceTarget(plan)}`,
			plan.query ? `query=${plan.query}` : "",
			`path=${plan.path}`,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export function createInterfaceConfirmationEvidencePaletteStatusActivityResult(
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createInterfaceConfirmationEvidenceStatusActivityResultWithPrefix(
		"palette interface evidence",
		action,
		plan,
		options,
	);
}

export function createInterfaceConfirmationEvidenceStatusActivityResult(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): StatusActivityResult {
	return createInterfaceConfirmationEvidenceStatusActivityResultWithPrefix(
		"status evidence interface",
		action,
		plan,
		options,
	);
}

function createInterfaceConfirmationEvidenceStatusActivityResultWithPrefix(
	prefix: "palette interface evidence" | "status evidence interface",
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
			action: "interface-confirmation",
			message: `${prefix} ${action} unavailable`,
			detail: "no recovered interface confirmation evidence export selected",
		};
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return {
		source: "evidence",
		action: "interface-confirmation",
		message: `${prefix} ${action} ${selected + 1}/${total} ${basename(plan.path)}`,
		detail: [
			`target=${formatInterfaceConfirmationEvidenceTarget(plan)}`,
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

export function createInterfaceEvidenceManagementStatusActivityResult(
	action: "filter" | "find",
	options: {
		state: "all" | "active" | "archived";
		query?: string;
		visible: number;
		total: number;
	},
): StatusActivityResult {
	const query = options.query?.trim() ?? "";
	const visible = Math.max(0, Math.floor(options.visible));
	const total = Math.max(0, Math.floor(options.total));
	return {
		source: "evidence",
		action:
			action === "filter"
				? "interface-evidence-filter"
				: "interface-evidence-find",
		message: `interface evidence ${action} state=${options.state} query=${query || "-"} visible=${visible}/${total}`,
		detail: `controls=q state f find G timeline state=${options.state} query=${query}`,
	};
}

export function createInterfaceEvidenceOutcomeStatusActivityResult(
	action: "archive" | "retention",
	input: InterfaceEvidenceOutcomeInput,
): StatusActivityResult {
	const auditMessage = formatInterfaceEvidenceOutcomeAuditMessage(
		action,
		input,
	);
	const summary =
		action === "archive"
			? `${input.status} ${input.fileName ?? "unknown"}`
			: `${input.status} removed=${Math.max(0, Math.floor(input.removed ?? 0))}`;
	return {
		source: "evidence",
		action:
			action === "archive"
				? "interface-evidence-archive"
				: "interface-evidence-retention",
		message: `interface evidence ${action} ${summary}`,
		detail: input.message,
		detailRows: [input.message, `audit=${auditMessage}`],
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

export function formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage(
	action: "select" | "open" | "search" | "copy" | "export",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatRemoteKnownHostsSelectionHistoryEvidenceAuditMessageWithPrefix(
		"palette remote known_hosts evidence audit",
		action,
		plan,
		options,
	);
}

export function formatRemoteKnownHostsSelectionHistoryEvidenceStatusAuditMessage(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatRemoteKnownHostsSelectionHistoryEvidenceAuditMessageWithPrefix(
		"status evidence remote known_hosts audit",
		action,
		plan,
		options,
	);
}

export function formatInterfaceConfirmationEvidencePaletteAuditMessage(
	action: "select" | "open" | "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatInterfaceConfirmationEvidenceAuditMessageWithPrefix(
		"palette interface evidence audit",
		action,
		plan,
		options,
	);
}

export function formatInterfaceConfirmationEvidenceStatusAuditMessage(
	action: "search",
	plan?: ConsoleAuditExportPlan,
	options: {
		selectedIndex?: number;
		total?: number;
	} = {},
): string {
	return formatInterfaceConfirmationEvidenceAuditMessageWithPrefix(
		"status evidence interface audit",
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

function formatInterfaceConfirmationEvidenceAuditMessageWithPrefix(
	prefix:
		| "palette interface evidence audit"
		| "status evidence interface audit",
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
			`reason="${formatTimelineEvidenceTrailAuditValue("no recovered interface confirmation evidence export selected")}"`,
		].join(" ");
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return [
		prefix,
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`target="${formatTimelineEvidenceTrailAuditValue(formatInterfaceConfirmationEvidenceTarget(plan))}"`,
		`label="${formatTimelineEvidenceTrailAuditValue(basename(plan.path))}"`,
		...(plan.query
			? [`query="${formatTimelineEvidenceTrailAuditValue(plan.query)}"`]
			: []),
		`path="${formatTimelineEvidenceTrailAuditValue(plan.path)}"`,
	].join(" ");
}

function formatRemoteKnownHostsSelectionHistoryEvidenceAuditMessageWithPrefix(
	prefix:
		| "palette remote known_hosts evidence audit"
		| "status evidence remote known_hosts audit",
	action: "select" | "open" | "search" | "copy" | "export",
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
			`reason="${formatTimelineEvidenceTrailAuditValue("no recovered remote known_hosts selection-history export selected")}"`,
		].join(" ");
	}
	const selected = Math.max(0, Math.floor(options.selectedIndex ?? 0));
	const total = Math.max(1, Math.floor(options.total ?? 1));
	return [
		prefix,
		`action=${action}`,
		`selected=${selected + 1}/${total}`,
		`target="${formatTimelineEvidenceTrailAuditValue(formatRemoteKnownHostsSelectionHistoryEvidenceTarget(plan))}"`,
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

export function formatInterfaceEvidenceManagementAuditMessage(
	action: "filter" | "find",
	options: {
		state: "all" | "active" | "archived";
		query?: string;
		visible: number;
		total: number;
	},
): string {
	const query = options.query?.trim() ?? "";
	const visible = Math.max(0, Math.floor(options.visible));
	const total = Math.max(0, Math.floor(options.total));
	return [
		"interface evidence audit",
		`action=${action}`,
		`state=${options.state}`,
		`query="${formatTimelineEvidenceTrailAuditValue(query)}"`,
		`visible=${visible}/${total}`,
	].join(" ");
}

export function formatInterfaceEvidenceOutcomeAuditMessage(
	action: "archive" | "retention",
	input: InterfaceEvidenceOutcomeInput,
): string {
	const rows = [
		"interface evidence outcome audit",
		`action=${action}`,
		`status=${input.status}`,
	];
	if (action === "archive") {
		rows.push(
			`label="${formatTimelineEvidenceTrailAuditValue(input.fileName ?? "")}"`,
			`from="${formatTimelineEvidenceTrailAuditValue(input.sourcePath ?? "")}"`,
			`to="${formatTimelineEvidenceTrailAuditValue(input.archivedPath ?? "")}"`,
		);
	} else {
		rows.push(
			`removed=${Math.max(0, Math.floor(input.removed ?? 0))}`,
			`candidates=${Math.max(0, Math.floor(input.candidates ?? 0))}`,
			`max=${Math.max(1, Math.floor(input.maxItems ?? 1))}`,
		);
	}
	rows.push(`reason="${formatTimelineEvidenceTrailAuditValue(input.message)}"`);
	return rows.join(" ");
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

export function getLatestRemoteKnownHostsSelectionHistoryAuditExport(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan | undefined {
	return getRemoteKnownHostsSelectionHistoryAuditExports(index)[0];
}

export function getLatestInterfaceConfirmationAuditExport(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan | undefined {
	return getInterfaceConfirmationAuditExports(index)[0];
}

export function createRecoveredStatusEvidenceIndex(
	index: ConsoleAuditExportIndex,
	options: {
		timelineSourceFilter: TimelineEvidenceTrailSourceFilter;
		selectedTimelineIndex: number;
		selectedProcessIndex: number;
		selectedRemoteKnownHostsIndex: number;
		selectedInterfaceIndex: number;
	},
): RecoveredStatusEvidenceIndex {
	const timelineEvidenceTrailAuditExports =
		getTimelineEvidenceTrailAuditExports(index);
	const filteredTimelineEvidenceTrailAuditExports =
		filterTimelineEvidenceTrailAuditExports(
			timelineEvidenceTrailAuditExports,
			options.timelineSourceFilter,
		);
	const processControlAuditExports = getProcessControlAuditExports(index);
	const remoteKnownHostsSelectionAuditExports =
		getRemoteKnownHostsSelectionHistoryAuditExports(index);
	const interfaceConfirmationAuditExports =
		getInterfaceConfirmationAuditExports(index);
	return {
		lastStatusActivityCopyIntentAuditExport:
			getLatestStatusActivityCopyIntentAuditExport(index),
		timelineEvidenceTrailAuditExports,
		latestTimelineEvidenceTrailAuditExport:
			getLatestTimelineEvidenceTrailAuditExport(index),
		processControlAuditExports,
		remoteKnownHostsSelectionAuditExports,
		interfaceConfirmationAuditExports,
		selectedTimelineIndex: clampIndex(
			options.selectedTimelineIndex,
			filteredTimelineEvidenceTrailAuditExports.length,
		),
		selectedProcessIndex: clampIndex(
			options.selectedProcessIndex,
			processControlAuditExports.length,
		),
		selectedRemoteKnownHostsIndex: clampIndex(
			options.selectedRemoteKnownHostsIndex,
			remoteKnownHostsSelectionAuditExports.length,
		),
		selectedInterfaceIndex: clampIndex(
			options.selectedInterfaceIndex,
			interfaceConfirmationAuditExports.length,
		),
	};
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

export function getRemoteKnownHostsSelectionHistoryAuditExports(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan[] {
	return index.items
		.filter(isRemoteKnownHostsSelectionHistoryAuditExport)
		.map((item) => ({
			path: item.path,
			content: "",
			eventCount: item.entryCount,
			...(item.query ? { query: item.query } : {}),
			scope: item.scope,
			...(item.origin ? { origin: item.origin } : {}),
		}));
}

export function getInterfaceConfirmationAuditExports(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportPlan[] {
	return index.items.filter(isInterfaceConfirmationAuditExport).map((item) => ({
		path: item.path,
		content: "",
		eventCount: item.entryCount,
		...(item.query ? { query: item.query } : {}),
		scope: item.scope,
		...(item.origin ? { origin: item.origin } : {}),
	}));
}

export function filterInterfaceConfirmationAuditExportIndex(
	index: ConsoleAuditExportIndex,
): ConsoleAuditExportIndex {
	return {
		...index,
		items: index.items.filter(isInterfaceConfirmationAuditExport),
	};
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

function isRemoteKnownHostsSelectionHistoryAuditExport(
	candidate: ConsoleAuditExportIndex["items"][number],
): boolean {
	if (candidate.scope !== "filtered") {
		return false;
	}
	return (candidate.query ?? "").startsWith(
		"remote known_hosts selection history ",
	);
}

function isInterfaceConfirmationAuditExport(
	candidate: ConsoleAuditExportIndex["items"][number],
): boolean {
	if (candidate.scope !== "selected") {
		return false;
	}
	return (candidate.query ?? "").startsWith(
		"interface confirmation interface.",
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
	return clampIndex(Math.floor(selectedIndex), length);
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
