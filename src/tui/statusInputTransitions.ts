import type {
	ConsoleAuditArchiveRetentionPlan,
	ConsoleAuditExportArchivePlan,
	ConsoleAuditExportPlan,
} from "../core/auditLog";
import type { ExternalOpenPlan } from "../core/externalOpen";
import type { FileOpenOrigin, FileOpenPlan } from "../core/fileOpen";
import type { SupportedPlatform } from "../core/types";
import {
	createUpdateReleaseHandoff,
	type GitHubReleaseCheckResult,
	getUpdateReleaseHandoffLinks,
	type PackageUpdateCheckResult,
} from "../core/updateCheck";
import type { StatusWorkspaceCommand } from "./appInputDispatcher";
import {
	prepareCleanupHandoffExport,
	prepareInterfaceEvidencePresetCycle,
	prepareInterfaceEvidencePresetSave,
	prepareInterfaceEvidenceSearchPrompt,
	prepareInterfaceEvidenceStateFilterCycle,
	prepareSelectedUpdateHandoffClipboard,
	prepareSelectedUpdateHandoffExternalOpen,
	prepareStatusActivityResultHistoryFilterCycle,
	prepareStatusActivityResultTimelineJumpFilterCycle,
	prepareStatusActivityResultTimelineJumpSelection,
	prepareToolEvidenceFilterCycle,
	resolveRecoveredEvidenceResultOptions,
} from "./appOwners";
import type {
	CleanupHandoffHistory,
	CleanupHandoffHistoryExportArchivePlan,
	CleanupHandoffHistoryExportPlan,
	CleanupJumpAudit,
	CleanupShelfIndex,
} from "./cleanupIndex";
import {
	createCleanupJumpAudit,
	getSelectedCleanupShelf,
	moveCleanupShelfSelection,
} from "./cleanupIndex";
import type { ClipboardPreview } from "./clipboardPreview";
import type { CommandPrompt } from "./commandLine";
import type { ConsoleEvent } from "./events";
import { clampIndex, type FocusArea, type Screen } from "./navigation";
import {
	prepareRemoteKnownHostsEvidenceHandoff,
	prepareRemoteKnownHostsEvidenceHandoffSelection,
} from "./remotesPanel";
import {
	appendStatusActivityCopyIntentHistory,
	createStatusActivityCopyIntentAuditExportOpenPlan,
	createStatusActivityCopyIntentEvidenceFocusPlan,
	createStatusActivityCopyIntentEvidenceFocusResult,
	createStatusActivityCopyIntentEvidenceFocusTimelineSearch,
	createStatusActivityCopyIntentRecord,
	createStatusActivityCopyIntentTimelineSearch,
	createStatusActivityEnterPlan,
	createStatusActivityResultAuditJumpReplayWarningTimelineSearch,
	filterTimelineEvidenceTrailAuditExports,
	formatStatusActivityCopyIntentAuditMessage,
	formatStatusActivityCopyIntentEvidenceFocusAuditMessage,
	getLatestStatusActivityResultAuditJumpIntent,
	getSelectedStatusActivityCopyIntentClipboardPreview,
	getSelectedStatusActivityResultAuditJumpIntent,
	getSelectedStatusActivityResultHistoryClipboardPreview,
	getSelectedStatusActivityToolsEvidenceSearchMatch,
	getStatusActivityCopyIntentAuditExportIndex,
	getStatusActivityResultAuditJumpIntentCount,
	moveStatusActivityCopyIntentSelection,
	moveStatusActivityCopyPreviewSelection,
	moveStatusActivityResultAuditJumpSelection,
	moveStatusActivitySource,
	moveStatusActivityToolsEvidenceSearchMatchSelection,
	nextTimelineEvidenceTrailSourceFilter,
	prepareCleanupHandoffHistoryReopen,
	prepareRecoveredEvidenceOpenTransition,
	prepareRecoveredEvidenceSearchTransition,
	prepareRecoveredEvidenceSelectionTransition,
	prepareStatusActivityAuditExportSelection,
	prepareStatusActivityResultHistoryMove,
	prepareStatusActivityResultTimelineHandoffOpenTransition,
	prepareStatusActivityToolsEvidenceMatchArchive,
	prepareStatusActivityToolsEvidenceMatchOpen,
	type StatusActivityCopyIntentEvidenceFocusPlan,
	type StatusActivityCopyIntentRecord,
	type StatusActivityResult,
	type StatusActivityResultHistoryFilter,
	type StatusActivityResultTimelineJumpFilter,
	type StatusActivitySource,
	type StatusActivityToolsEvidenceSearchRecovery,
	type TimelineEvidenceTrailSourceFilter,
} from "./statusActivityQueue";
import type {
	StatusEvidenceIndexes,
	StatusEvidenceKind,
	StatusEvidenceSelection,
} from "./statusEvidence";
import {
	createStatusEvidenceActionPlan,
	createStatusEvidenceEnterPlan,
	createStatusEvidenceItemMovePlan,
	createStatusEvidenceNumberJumpPlan,
	createStatusEvidenceSearchPlan,
	filterInterfaceConfirmationEvidenceExports,
	moveStatusEvidenceFocus,
	prepareStatusEvidenceActionTransition,
	prepareStatusEvidenceOpenTransition,
} from "./statusEvidence";
import type {
	TimelineFilter,
	TimelineSearchJumpTransition,
} from "./timelinePanel";
import { prepareTimelineSearchJumpTransition } from "./timelinePanel";
import type {
	ToolHistoryArchiveRetentionPlan,
	ToolHistoryExportArchivePlan,
} from "./toolHistory";

export type StatusInputNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

export type StatusWorkspaceInputState = {
	baseDir: string;
	platform: SupportedPlatform;
	generatedAt: Date;
	fileOpenOrigin: FileOpenOrigin | undefined;
	retentionLimit: number;
	updates: {
		packageResult?: PackageUpdateCheckResult;
		githubResult?: GitHubReleaseCheckResult;
		selectedLinkIndex: number;
	};
	activity: {
		selectedSource: StatusActivitySource;
		results: StatusActivityResult[];
		selectedResultIndex: number;
		resultHistoryFilter: StatusActivityResultHistoryFilter;
		resultTimelineJumpFilter: StatusActivityResultTimelineJumpFilter;
		selectedCopyPreviewRowIndex: number;
		copyPreviewExpanded: boolean;
		copyIntents: StatusActivityCopyIntentRecord[];
		selectedCopyIntentIndex: number;
		selectedAuditJumpIndex: number;
		selectedToolsEvidenceMatchIndex: number;
		timelineEvidenceTrailAuditExports?: ConsoleAuditExportPlan[];
		selectedTimelineEvidenceTrailAuditExportIndex?: number;
		timelineEvidenceTrailSourceFilter?: TimelineEvidenceTrailSourceFilter;
		toolsEvidenceRecovery?: StatusActivityToolsEvidenceSearchRecovery;
		lastCopyIntentAuditExport?: ConsoleAuditExportPlan;
		lastEvidenceFocusPlan?: StatusActivityCopyIntentEvidenceFocusPlan;
	};
	evidence: {
		indexes: StatusEvidenceIndexes;
		selection: StatusEvidenceSelection;
		selectedKind: StatusEvidenceKind;
		interfaceEvidenceSearchPresets?: string[];
	};
	cleanup: {
		index: CleanupShelfIndex;
		selectedShelfIndex: number;
		history: CleanupHandoffHistory[];
		selectedHistoryIndex?: number;
	};
	dialogs: {
		externalOpen: boolean;
		fileOpen: boolean;
		auditExportArchive: boolean;
		auditArchiveRetention: boolean;
		cleanupExportArchive: boolean;
		toolExportArchive: boolean;
		toolArchiveRetention: boolean;
	};
	configManagedShelfRows: string[];
	events: ConsoleEvent[];
};

export type StatusWorkspaceStatePatch = {
	selectedUpdateHandoffIndex?: number;
	selectedStatusActivitySource?: StatusActivitySource;
	selectedStatusActivityResultIndex?: number;
	statusActivityResultHistoryFilter?: StatusActivityResultHistoryFilter;
	statusActivityResultTimelineJumpFilter?: StatusActivityResultTimelineJumpFilter;
	selectedStatusActivityCopyPreviewRowIndex?: number;
	statusActivityCopyPreviewExpanded?: boolean;
	statusActivityCopyIntentHistory?: StatusActivityCopyIntentRecord[];
	selectedStatusActivityCopyIntentIndex?: number;
	selectedStatusActivityResultAuditJumpIndex?: number;
	selectedStatusActivityToolsEvidenceSearchMatchIndex?: number;
	selectedTimelineEvidenceTrailAuditExportIndex?: number;
	timelineEvidenceTrailSourceFilter?: TimelineEvidenceTrailSourceFilter;
	selectedStatusEvidenceKind?: StatusEvidenceKind;
	selectedHandoffIndex?: number;
	selectedAuditExportIndex?: number;
	selectedAuditExportArchiveIndex?: number;
	selectedCleanupExportIndex?: number;
	selectedCleanupExportArchiveIndex?: number;
	selectedToolExportIndex?: number;
	selectedToolExportArchiveIndex?: number;
	toolExportFilter?: NonNullable<StatusEvidenceSelection["toolExportFilter"]>;
	toolExportArchiveFilter?: NonNullable<
		StatusEvidenceSelection["toolExportArchiveFilter"]
	>;
	selectedProcessControlAuditExportIndex?: number;
	selectedRemoteKnownHostsSelectionAuditExportIndex?: number;
	selectedInterfaceConfirmationAuditExportIndex?: number;
	interfaceEvidenceStateFilter?: NonNullable<
		StatusEvidenceSelection["interfaceEvidenceStateFilter"]
	>;
	interfaceEvidenceQuery?: string;
	interfaceEvidenceSearchPresets?: string[];
	selectedCleanupShelfIndex?: number;
	selectedTimelineIndex?: number;
	timelineFilter?: TimelineFilter;
	timelineSearchQuery?: string;
	screen?: Screen;
	focusArea?: FocusArea;
	cleanupJumpAudit?: CleanupJumpAudit;
	lastStatusActivityEvidenceFocusPlan?: StatusActivityCopyIntentEvidenceFocusPlan;
};

export type StatusAuditWriteEffect = {
	kind: "audit-write";
	writer:
		| "interface-confirmation"
		| "remote-known-hosts"
		| "status-activity-copy-intent";
	plan: ConsoleAuditExportPlan;
	publication: {
		setLastStatusActivityCopyIntentAuditExport: true;
		refreshAuditExportIndex: false;
		refresh: StatusIndexRefreshEffect;
	};
	successMessagePrefix: string;
	failureMessagePrefix: string;
};

export type StatusDialogPlanKey =
	| "externalOpen"
	| "fileOpen"
	| "auditExportArchive"
	| "auditArchiveRetention"
	| "cleanupExportArchive"
	| "toolExportArchive"
	| "toolArchiveRetention";

export type StatusConfirmationPlan =
	| ConsoleAuditExportArchivePlan
	| ConsoleAuditArchiveRetentionPlan
	| CleanupHandoffHistoryExportArchivePlan
	| ToolHistoryExportArchivePlan
	| ToolHistoryArchiveRetentionPlan;

export type StatusIndexRefreshEffect = {
	kind: "refresh-index";
	target: "handoff" | "audit" | "audit-archive" | "cleanup" | "cleanup-archive";
	baseDir: string;
	announce: boolean;
	snapshot: {
		selectedIndex: number;
		selectedTimelineEvidenceTrailAuditExportIndex: number;
		selectedProcessControlAuditExportIndex: number;
		selectedRemoteKnownHostsSelectionAuditExportIndex: number;
		selectedInterfaceConfirmationAuditExportIndex: number;
		timelineEvidenceTrailSourceFilter: TimelineEvidenceTrailSourceFilter;
		interfaceEvidenceStateFilter: NonNullable<
			StatusEvidenceSelection["interfaceEvidenceStateFilter"]
		>;
		interfaceEvidenceQuery: string;
		interfaceConfirmationAuditExports: ConsoleAuditExportPlan[];
		interfaceConfirmationAuditArchiveExports: ConsoleAuditExportPlan[];
	};
};

export type StatusHandoffArchiveEffect = {
	kind: "handoff-archive";
	baseDir: string;
	path: string;
	selectedIndex: number;
	refresh: StatusIndexRefreshEffect;
	successMessagePrefix: "handoff archive";
	failureMessagePrefix: "handoff archive failed";
};

export type StatusCleanupHistoryWriteEffect = {
	kind: "cleanup-history-write";
	plan: CleanupHandoffHistoryExportPlan;
	refresh: StatusIndexRefreshEffect;
	successMessagePrefix: "cleanup history exported";
	failureMessagePrefix: "cleanup history export failed";
};

export type StatusConfigWriteEffect = {
	kind: "config-write";
	key: "interfaceEvidenceSearchPresets" | "statusResultJumpClassFilter";
	value: string[] | StatusActivityResultTimelineJumpFilter;
	failureMessagePrefix: string;
};

export type StatusWorkspaceInputEffect =
	| { kind: "state"; patch: StatusWorkspaceStatePatch }
	| { kind: "notice"; notice: StatusInputNotice }
	| { kind: "clipboard-confirmation"; preview: ClipboardPreview }
	| { kind: "record-activity"; result: StatusActivityResult }
	| {
			kind: "command-prompt";
			prompt: CommandPrompt;
			value?: string;
			screen: "status";
			focusArea: "workspaces";
	  }
	| {
			kind: "timeline-jump";
			transition: TimelineSearchJumpTransition;
			screen: "timeline";
	  }
	| {
			kind: "open-file-confirmation";
			target: StatusEvidenceKind;
			plan: FileOpenPlan;
			prompt: Extract<CommandPrompt, "file-open">;
			screen: "status";
			clearPlans: readonly [StatusDialogPlanKey, ...StatusDialogPlanKey[]];
	  }
	| {
			kind: "external-open-confirmation";
			plan: ExternalOpenPlan;
			prompt: Extract<CommandPrompt, "external-open">;
	  }
	| {
			kind: "plan-confirmation";
			plan: StatusConfirmationPlan;
			prompt: Extract<
				CommandPrompt,
				| "audit-export-archive"
				| "audit-archive-retention"
				| "cleanup-export-archive"
				| "tool-export-archive"
				| "tools-archive-retention"
			>;
			screen: "status";
			clearPlans: readonly [StatusDialogPlanKey, ...StatusDialogPlanKey[]];
			scope?: "all" | "interface" | "tools" | "cleanup";
	  }
	| StatusIndexRefreshEffect
	| StatusHandoffArchiveEffect
	| StatusCleanupHistoryWriteEffect
	| StatusConfigWriteEffect
	| StatusAuditWriteEffect;

export type StatusWorkspaceInputTransition =
	| { kind: "unhandled" }
	| { kind: "handled"; effects: StatusWorkspaceInputEffect[] };

export type StatusWorkspaceInput = {
	command: StatusWorkspaceCommand | undefined;
	inputDigit: string;
	state: StatusWorkspaceInputState | undefined;
};

type StatusCommandContext = {
	inputDigit: string;
	state: StatusWorkspaceInputState;
};

type StatusCommandPreparer = (
	context: StatusCommandContext,
) => StatusWorkspaceInputTransition;

function handled(
	...effects: StatusWorkspaceInputEffect[]
): StatusWorkspaceInputTransition {
	return { kind: "handled", effects };
}

function notice(level: StatusInputNotice["level"], message: string) {
	return { kind: "notice", notice: { level, message } } as const;
}

const fileOpenClearPlans = [
	"externalOpen",
	"auditExportArchive",
	"auditArchiveRetention",
	"cleanupExportArchive",
	"toolExportArchive",
	"toolArchiveRetention",
] as const satisfies readonly StatusDialogPlanKey[];

const confirmationClearPlans = [
	"externalOpen",
	"fileOpen",
	"auditExportArchive",
	"auditArchiveRetention",
	"cleanupExportArchive",
	"toolExportArchive",
	"toolArchiveRetention",
] as const satisfies readonly StatusDialogPlanKey[];

function createStatusIndexRefreshEffect(
	state: StatusWorkspaceInputState,
	target: StatusIndexRefreshEffect["target"],
	announce: boolean,
	selectedIndex?: number,
): StatusIndexRefreshEffect {
	const selection = state.evidence.selection;
	const indexes = state.evidence.indexes;
	const targetSelectedIndex =
		selectedIndex ?? switchStatusIndexSelection(target, selection);
	return {
		kind: "refresh-index",
		target,
		baseDir: state.baseDir,
		announce,
		snapshot: {
			selectedIndex: targetSelectedIndex,
			selectedTimelineEvidenceTrailAuditExportIndex:
				state.activity.selectedTimelineEvidenceTrailAuditExportIndex ?? 0,
			selectedProcessControlAuditExportIndex:
				selection.selectedProcessControlAuditExportIndex ?? 0,
			selectedRemoteKnownHostsSelectionAuditExportIndex:
				selection.selectedRemoteKnownHostsSelectionAuditExportIndex ?? 0,
			selectedInterfaceConfirmationAuditExportIndex:
				selection.selectedInterfaceConfirmationAuditExportIndex ?? 0,
			timelineEvidenceTrailSourceFilter:
				state.activity.timelineEvidenceTrailSourceFilter ?? "all",
			interfaceEvidenceStateFilter:
				selection.interfaceEvidenceStateFilter ?? "all",
			interfaceEvidenceQuery: selection.interfaceEvidenceQuery ?? "",
			interfaceConfirmationAuditExports:
				indexes.interfaceConfirmationAuditExports ?? [],
			interfaceConfirmationAuditArchiveExports:
				indexes.interfaceConfirmationAuditArchiveExports ?? [],
		},
	};
}

function switchStatusIndexSelection(
	target: StatusIndexRefreshEffect["target"],
	selection: StatusEvidenceSelection,
): number {
	switch (target) {
		case "handoff":
			return selection.selectedHandoffIndex;
		case "audit":
			return selection.selectedAuditExportIndex;
		case "audit-archive":
			return selection.selectedAuditExportArchiveIndex;
		case "cleanup":
			return selection.selectedCleanupExportIndex;
		case "cleanup-archive":
			return selection.selectedCleanupExportArchiveIndex;
	}
}

function openFileConfirmation(
	plan: FileOpenPlan,
	target: StatusEvidenceKind,
): Extract<StatusWorkspaceInputEffect, { kind: "open-file-confirmation" }> {
	return {
		kind: "open-file-confirmation",
		target,
		plan,
		prompt: "file-open",
		screen: "status",
		clearPlans: fileOpenClearPlans,
	};
}

function planConfirmation(
	plan: StatusConfirmationPlan,
	scope?: "all" | "interface" | "tools" | "cleanup",
): Extract<StatusWorkspaceInputEffect, { kind: "plan-confirmation" }> {
	const prompt = getStatusConfirmationPrompt(plan);
	return {
		kind: "plan-confirmation",
		plan,
		prompt,
		screen: "status",
		clearPlans: confirmationClearPlans,
		...(scope ? { scope } : {}),
	};
}

function getStatusConfirmationPrompt(
	plan: StatusConfirmationPlan,
): Extract<
	CommandPrompt,
	| "audit-export-archive"
	| "audit-archive-retention"
	| "cleanup-export-archive"
	| "tool-export-archive"
	| "tools-archive-retention"
> {
	switch (plan.confirmationPhrase) {
		case "archive audit export":
			return "audit-export-archive";
		case "prune audit archive":
			return "audit-archive-retention";
		case "archive cleanup export":
			return "cleanup-export-archive";
		case "archive tools export":
			return "tool-export-archive";
		case "prune tools archive":
			return "tools-archive-retention";
	}
}

function hasDialog(state: StatusWorkspaceInputState): boolean {
	return Object.values(state.dialogs).some(Boolean);
}

function createActivityQueue(
	state: StatusWorkspaceInputState,
	includeExtendedEvidence: boolean,
) {
	const indexes = state.evidence.indexes;
	const hasEvidence =
		indexes.handoffIndex.items.length > 0 ||
		indexes.auditExportIndex.items.length > 0 ||
		indexes.auditExportArchiveIndex.items.length > 0 ||
		indexes.cleanupExportIndex.items.length > 0 ||
		indexes.cleanupExportArchiveIndex.items.length > 0 ||
		(includeExtendedEvidence &&
			((indexes.toolExportIndex?.items.length ?? 0) > 0 ||
				(indexes.toolExportArchiveIndex?.items.length ?? 0) > 0 ||
				(indexes.processControlAuditExports?.length ?? 0) > 0 ||
				(indexes.remoteKnownHostsSelectionAuditExports?.length ?? 0) > 0 ||
				(indexes.interfaceConfirmationAuditExports?.length ?? 0) > 0));
	return {
		releaseRows:
			state.updates.packageResult || state.updates.githubResult
				? ["STATUS RELEASE CONSOLE"]
				: [],
		dialogRows: hasDialog(state) ? ["STATUS DIALOG PREVIEW"] : [],
		cleanupRows:
			state.cleanup.index.activeShelves > 0 || state.cleanup.history.length > 0
				? ["CLEANUP OPS"]
				: [],
		configRows: state.configManagedShelfRows,
		evidenceRows: hasEvidence ? ["STATUS EVIDENCE SUMMARY"] : [],
	};
}

function prepareUpdateLinkCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const handoff = state.updates.packageResult
		? createUpdateReleaseHandoff(state.updates.packageResult)
		: undefined;
	if (!handoff) return handled(notice("warn", "no update handoff links"));
	const links = getUpdateReleaseHandoffLinks(handoff);
	const next = (state.updates.selectedLinkIndex + 1) % links.length;
	return handled(
		{ kind: "state", patch: { selectedUpdateHandoffIndex: next } },
		notice("info", `update handoff selected ${links[next]?.label ?? ""}`),
	);
}

function prepareActivityMove(
	state: StatusWorkspaceInputState,
	direction: "next" | "previous",
): StatusWorkspaceInputTransition {
	const selected = moveStatusActivitySource(
		createActivityQueue(state, false),
		state.activity.selectedSource,
		direction === "next" ? 1 : -1,
	);
	return handled(
		{
			kind: "state",
			patch: { selectedStatusActivitySource: selected },
		},
		notice("info", `status activity focus ${selected}`),
	);
}

function prepareResultHistoryMove(
	state: StatusWorkspaceInputState,
	direction: "next" | "previous",
): StatusWorkspaceInputTransition {
	const transition = prepareStatusActivityResultHistoryMove({
		history: state.activity.results,
		selectedIndex: state.activity.selectedResultIndex,
		direction,
		filter: state.activity.resultHistoryFilter,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: {
				selectedStatusActivityResultIndex: transition.selectedIndex,
				selectedStatusActivityCopyPreviewRowIndex:
					transition.copyPreviewRowIndex,
				statusActivityCopyPreviewExpanded: transition.copyPreviewExpanded,
			},
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareCopyPreviewMove(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
		state.activity.results,
		state.activity.selectedResultIndex,
	);
	if (!preview) {
		return handled(notice("warn", "no status activity copy preview rows"));
	}
	const selected = moveStatusActivityCopyPreviewSelection(
		preview,
		state.activity.selectedCopyPreviewRowIndex,
		"next",
	);
	return handled(
		{
			kind: "state",
			patch: { selectedStatusActivityCopyPreviewRowIndex: selected },
		},
		notice("info", `status activity copy preview row ${selected + 1}`),
	);
}

function prepareCopyPreviewToggle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
		state.activity.results,
		state.activity.selectedResultIndex,
	);
	if (!preview) {
		return handled(notice("warn", "no status activity copy preview to expand"));
	}
	const expanded = !state.activity.copyPreviewExpanded;
	return handled(
		{
			kind: "state",
			patch: { statusActivityCopyPreviewExpanded: expanded },
		},
		notice("info", `status activity copy preview expanded=${expanded}`),
	);
}

function prepareRemoteKnownHostsHandoff(
	state: StatusWorkspaceInputState,
	action: "copy" | "export",
): StatusWorkspaceInputTransition {
	const exports =
		state.evidence.indexes.remoteKnownHostsSelectionAuditExports ?? [];
	const selected = resolveRecoveredEvidenceResultOptions(
		state.evidence.selection
			.selectedRemoteKnownHostsSelectionAuditExportIndex ?? 0,
		exports.length,
	);
	const transition = prepareRemoteKnownHostsEvidenceHandoff({
		action,
		plan: exports[selected.selectedIndex],
		...selected,
		baseDir: state.baseDir,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	if (transition.kind === "copy") {
		return handled(
			{
				kind: "state",
				patch: {
					statusActivityCopyIntentHistory:
						appendStatusActivityCopyIntentHistory(
							state.activity.copyIntents,
							transition.intent,
						),
					selectedStatusActivityCopyIntentIndex: 0,
					selectedStatusEvidenceKind: transition.statusEvidenceKind,
					screen: "status",
					focusArea: "workspaces",
				},
			},
			{ kind: "notice", notice: transition.notice },
			{ kind: "clipboard-confirmation", preview: transition.preview },
		);
	}
	return handled(
		{
			kind: "state",
			patch: {
				selectedStatusEvidenceKind: transition.statusEvidenceKind,
				screen: "status",
				focusArea: "workspaces",
			},
		},
		{
			kind: "audit-write",
			writer: "remote-known-hosts",
			plan: transition.exportPlan,
			publication: {
				setLastStatusActivityCopyIntentAuditExport: true,
				refreshAuditExportIndex: false,
				refresh: createStatusIndexRefreshEffect(state, "audit", false),
			},
			successMessagePrefix: "remote known_hosts evidence handoff exported",
			failureMessagePrefix: "remote known_hosts evidence handoff export failed",
		},
	);
}

function prepareResultCopy(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
		state.activity.results,
		state.activity.selectedResultIndex,
	);
	if (!preview) {
		return prepareRemoteKnownHostsHandoff(state, "copy");
	}
	const intent = createStatusActivityCopyIntentRecord(preview, {
		selectedRowIndex: state.activity.selectedCopyPreviewRowIndex,
		expanded: state.activity.copyPreviewExpanded,
	});
	return handled(
		{
			kind: "state",
			patch: {
				statusActivityCopyIntentHistory: appendStatusActivityCopyIntentHistory(
					state.activity.copyIntents,
					intent,
				),
				selectedStatusActivityCopyIntentIndex: 0,
			},
		},
		notice(
			"info",
			intent?.auditMessage ??
				formatStatusActivityCopyIntentAuditMessage(preview, {
					selectedRowIndex: state.activity.selectedCopyPreviewRowIndex,
					expanded: state.activity.copyPreviewExpanded,
				}),
		),
		{ kind: "clipboard-confirmation", preview },
	);
}

function prepareCopyIntentMove(
	state: StatusWorkspaceInputState,
	direction: "next" | "previous",
): StatusWorkspaceInputTransition {
	const history = state.activity.copyIntents;
	if (history.length === 0) {
		return handled(notice("warn", "no status activity copy intents"));
	}
	const selected = moveStatusActivityCopyIntentSelection(
		history,
		state.activity.selectedCopyIntentIndex,
		direction,
	);
	return handled(
		{
			kind: "state",
			patch: { selectedStatusActivityCopyIntentIndex: selected },
		},
		notice(
			"info",
			`status activity copy intent ${selected + 1}/${history.length} ${history[selected]?.label ?? "none"}`,
		),
	);
}

function prepareCopyIntentReplay(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const preview = getSelectedStatusActivityCopyIntentClipboardPreview(
		state.activity.copyIntents,
		state.activity.selectedCopyIntentIndex,
	);
	if (!preview) {
		return handled(notice("warn", "no status activity copy intent to replay"));
	}
	return handled(
		notice("info", `status activity copy intent replay ${preview.label}`),
		{ kind: "clipboard-confirmation", preview },
	);
}

function prepareInterfaceOrResultTimeline(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const selectedResult =
		state.activity.results[
			clampIndex(
				state.activity.selectedResultIndex,
				state.activity.results.length,
			)
		];
	if (
		selectedResult?.action === "interface-evidence-filter" ||
		selectedResult?.action === "interface-evidence-find" ||
		selectedResult?.action === "interface-evidence-archive" ||
		selectedResult?.action === "interface-evidence-retention"
	) {
		return prepareResultTimelineOpen(state);
	}
	const indexes = state.evidence.indexes;
	const selection = state.evidence.selection;
	const interfaceExports = filterInterfaceConfirmationEvidenceExports(
		indexes.interfaceConfirmationAuditExports ?? [],
		indexes.interfaceConfirmationAuditArchiveExports ?? [],
		selection.interfaceEvidenceStateFilter ?? "all",
		selection.interfaceEvidenceQuery ?? "",
	);
	return state.evidence.selectedKind === "interface" &&
		interfaceExports.length > 0
		? prepareRecoveredEvidenceOpen(state, "interface")
		: prepareResultTimelineOpen(state);
}

function prepareInterfaceEvidenceFilterCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const indexes = state.evidence.indexes;
	const selection = state.evidence.selection;
	const transition = prepareInterfaceEvidenceStateFilterCycle({
		state: selection.interfaceEvidenceStateFilter ?? "all",
		query: selection.interfaceEvidenceQuery ?? "",
		activeExports: indexes.interfaceConfirmationAuditExports ?? [],
		archivedExports: indexes.interfaceConfirmationAuditArchiveExports ?? [],
	});
	return handled(
		{
			kind: "state",
			patch: {
				interfaceEvidenceStateFilter: transition.state,
				selectedInterfaceConfirmationAuditExportIndex: transition.selectedIndex,
				selectedStatusEvidenceKind: transition.selectedKind,
				screen: transition.screen,
				focusArea: transition.focusArea,
			},
		},
		{ kind: "notice", notice: transition.notice },
		{ kind: "record-activity", result: transition.result },
	);
}

function prepareToolsEvidenceFilterCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const selectedKind =
		state.evidence.selectedKind === "tools-archive" ? "tools-archive" : "tools";
	const selection = state.evidence.selection;
	const transition = prepareToolEvidenceFilterCycle({
		selectedKind,
		filter:
			selectedKind === "tools-archive"
				? (selection.toolExportArchiveFilter ?? "any")
				: (selection.toolExportFilter ?? "any"),
	});
	return handled(
		{
			kind: "state",
			patch: {
				...(transition.target === "archive"
					? {
							toolExportArchiveFilter: transition.filter,
							selectedToolExportArchiveIndex: transition.selectedIndex,
						}
					: {
							toolExportFilter: transition.filter,
							selectedToolExportIndex: transition.selectedIndex,
						}),
				selectedStatusEvidenceKind: transition.selectedKind,
			},
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareResultHistoryFilterCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareStatusActivityResultHistoryFilterCycle(
		state.activity.results,
		state.activity.resultHistoryFilter,
	);
	return handled(
		{
			kind: "state",
			patch: {
				statusActivityResultHistoryFilter: transition.filter,
				selectedStatusActivityResultIndex: transition.selectedIndex,
				selectedStatusActivityCopyPreviewRowIndex: 0,
				statusActivityCopyPreviewExpanded: false,
			},
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareResultTimelineFilterCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareStatusActivityResultTimelineJumpFilterCycle(
		state.activity.results,
		state.activity.resultTimelineJumpFilter,
	);
	return handled(
		{
			kind: "state",
			patch: {
				statusActivityResultTimelineJumpFilter: transition.filter,
				selectedStatusActivityResultIndex: transition.selectedIndex,
			},
		},
		{ kind: "notice", notice: transition.notice },
		{
			kind: "config-write",
			key: "statusResultJumpClassFilter",
			value: transition.filter,
			failureMessagePrefix: "status result jump filter persistence failed",
		},
	);
}

function prepareInterfaceSearchPrompt(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareInterfaceEvidenceSearchPrompt(
		state.evidence.selection.interfaceEvidenceQuery ?? "",
	);
	return handled(
		{
			kind: "state",
			patch: {
				selectedStatusEvidenceKind: transition.selectedKind,
				screen: transition.screen,
				focusArea: transition.focusArea,
			},
		},
		{
			kind: "command-prompt",
			prompt: transition.prompt,
			value: transition.value,
			screen: transition.screen,
			focusArea: transition.focusArea,
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareInterfacePresetSave(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareInterfaceEvidencePresetSave(
		state.evidence.selection.interfaceEvidenceQuery ?? "",
		state.evidence.interfaceEvidenceSearchPresets ?? [],
	);
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: { interfaceEvidenceSearchPresets: transition.presets },
		},
		{
			kind: "config-write",
			key: "interfaceEvidenceSearchPresets",
			value: transition.presets,
			failureMessagePrefix: "",
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareInterfacePresetCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const indexes = state.evidence.indexes;
	const selection = state.evidence.selection;
	const transition = prepareInterfaceEvidencePresetCycle({
		query: selection.interfaceEvidenceQuery ?? "",
		presets: state.evidence.interfaceEvidenceSearchPresets ?? [],
		state: selection.interfaceEvidenceStateFilter ?? "all",
		activeExports: indexes.interfaceConfirmationAuditExports ?? [],
		archivedExports: indexes.interfaceConfirmationAuditArchiveExports ?? [],
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: {
				interfaceEvidenceQuery: transition.query,
				selectedInterfaceConfirmationAuditExportIndex: transition.selectedIndex,
				selectedStatusEvidenceKind: transition.selectedKind,
				screen: transition.screen,
				focusArea: transition.focusArea,
			},
		},
		{ kind: "notice", notice: transition.notice },
		{ kind: "record-activity", result: transition.result },
	);
}

function prepareAuditJumpMove(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	if (state.evidence.selectedKind === "interface") {
		return prepareInterfacePresetSave(state);
	}
	const count = getStatusActivityResultAuditJumpIntentCount(
		state.activity.copyIntents,
	);
	if (count === 0) {
		return handled(notice("warn", "no status activity result audit jumps"));
	}
	const selected = moveStatusActivityResultAuditJumpSelection(
		state.activity.copyIntents,
		state.activity.selectedAuditJumpIndex,
		"next",
	);
	return handled(
		{
			kind: "state",
			patch: { selectedStatusActivityResultAuditJumpIndex: selected },
		},
		notice(
			"info",
			`status activity result audit jump ${selected + 1}/${count}`,
		),
	);
}

function timelineJump(
	state: StatusWorkspaceInputState,
	jump: { filter: TimelineFilter; query: string; message: string },
): StatusWorkspaceInputTransition {
	return handled({
		kind: "timeline-jump",
		transition: prepareTimelineSearchJumpTransition(state.events, jump),
		screen: "timeline",
	});
}

function prepareCopyIntentTimelineJump(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const jump = createStatusActivityCopyIntentTimelineSearch(
		state.activity.copyIntents,
		state.activity.selectedCopyIntentIndex,
	);
	return jump
		? timelineJump(state, jump)
		: handled(notice("warn", "no status activity copy intent for timeline"));
}

function prepareResultTimelineOpen(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareStatusActivityResultTimelineHandoffOpenTransition({
		history: state.activity.results,
		selectedIndex: state.activity.selectedResultIndex,
		latestAuditJumpIntent: getLatestStatusActivityResultAuditJumpIntent(
			state.activity.copyIntents,
		),
		selectedAuditJumpIntent: getSelectedStatusActivityResultAuditJumpIntent(
			state.activity.copyIntents,
			state.activity.selectedAuditJumpIndex,
		),
		events: state.events,
		filter: state.activity.resultTimelineJumpFilter,
	});
	const effects: StatusWorkspaceInputEffect[] = [];
	if (transition.auditMessage) {
		effects.push(notice("info", transition.auditMessage));
	}
	if (transition.activityResult) {
		effects.push({
			kind: "record-activity",
			result: transition.activityResult,
		});
	}
	if (transition.kind === "notice") {
		effects.push({ kind: "notice", notice: transition.notice });
		return handled(...effects);
	}
	effects.push({
		kind: "state",
		patch: {
			statusActivityCopyIntentHistory: transition.intent
				? appendStatusActivityCopyIntentHistory(
						state.activity.copyIntents,
						transition.intent,
					)
				: state.activity.copyIntents,
			selectedStatusActivityCopyIntentIndex: 0,
		},
	});
	if (transition.intent) {
		effects.push(notice("info", transition.intent.auditMessage));
	}
	effects.push({
		kind: "timeline-jump",
		transition: transition.timeline,
		screen: "timeline",
	});
	return handled(...effects);
}

function prepareResultTimelineSelection(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareStatusActivityResultTimelineJumpSelection({
		history: state.activity.results,
		selectedIndex: state.activity.selectedResultIndex,
		filter: state.activity.resultTimelineJumpFilter,
	});
	const effects: StatusWorkspaceInputEffect[] = [];
	if (transition.kind === "select") {
		effects.push({
			kind: "state",
			patch: { selectedStatusActivityResultIndex: transition.selectedIndex },
		});
	}
	if (transition.result) {
		effects.push({ kind: "record-activity", result: transition.result });
	}
	effects.push({ kind: "notice", notice: transition.notice });
	return handled(...effects);
}

function prepareRecoveredEvidenceSelection(
	state: StatusWorkspaceInputState,
	family: "timeline" | "process",
): StatusWorkspaceInputTransition {
	const exports = getRecoveredEvidencePlans(state, family);
	const transition = prepareRecoveredEvidenceSelectionTransition({
		family,
		exports,
		selectedIndex: getRecoveredEvidenceSelectedIndex(state, family),
		direction: "next",
	});
	const effects: StatusWorkspaceInputEffect[] = [
		{
			kind: "state",
			patch: {
				...recoveredEvidenceSelectionPatch(family, transition.selectedIndex),
				screen: "status",
			},
		},
		{ kind: "notice", notice: transition.notice },
	];
	if (transition.auditMessage) {
		effects.push(notice("info", transition.auditMessage));
	}
	if (transition.activityResult) {
		effects.push({
			kind: "record-activity",
			result: transition.activityResult,
		});
	}
	return handled(...effects);
}

function prepareRecoveredEvidenceSearch(
	state: StatusWorkspaceInputState,
	family: "timeline" | "process" | "remote-known-hosts" | "interface",
	origin?: "status-evidence",
): StatusWorkspaceInputTransition {
	const exports = getRecoveredEvidencePlans(state, family);
	const transition = prepareRecoveredEvidenceSearchTransition({
		family,
		exports,
		selectedIndex: getRecoveredEvidenceSelectedIndex(state, family),
		events: state.events,
		origin,
	});
	const effects: StatusWorkspaceInputEffect[] = [
		{
			kind: "state",
			patch: recoveredEvidenceSelectionPatch(family, transition.selectedIndex),
		},
	];
	if (transition.kind === "notice") {
		effects.push({ kind: "notice", notice: transition.notice });
	} else {
		effects.push({
			kind: "timeline-jump",
			transition: transition.timeline,
			screen: "timeline",
		});
	}
	if (transition.auditMessage) {
		effects.push(notice("info", transition.auditMessage));
	}
	if (transition.activityResult) {
		effects.push({
			kind: "record-activity",
			result: transition.activityResult,
		});
	}
	return handled(...effects);
}

function prepareTimelineEvidenceSourceCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const exports = state.activity.timelineEvidenceTrailAuditExports ?? [];
	const filter = nextTimelineEvidenceTrailSourceFilter(
		state.activity.timelineEvidenceTrailSourceFilter ?? "all",
	);
	const visible = filterTimelineEvidenceTrailAuditExports(exports, filter);
	return handled(
		{
			kind: "state",
			patch: {
				timelineEvidenceTrailSourceFilter: filter,
				selectedTimelineEvidenceTrailAuditExportIndex: 0,
				screen: "status",
			},
		},
		notice(
			visible.length ? "info" : "warn",
			`timeline evidence trail source filter ${filter} visible ${visible.length}/${exports.length}`,
		),
	);
}

function prepareRemoteHandoffSelection(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareRemoteKnownHostsEvidenceHandoffSelection({
		history: state.activity.results,
		selectedIndex: state.activity.selectedResultIndex,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: {
				selectedStatusActivityResultIndex: transition.selectedIndex,
				selectedStatusActivityCopyPreviewRowIndex: 0,
				statusActivityCopyPreviewExpanded: false,
			},
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareEvidenceSearch(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const kind = state.evidence.selectedKind;
	if (
		kind === "process" ||
		kind === "remote-known-hosts" ||
		kind === "interface"
	) {
		const plan = createStatusEvidenceSearchPlan(
			state.evidence.indexes,
			state.evidence.selection,
			kind,
		);
		if (!plan) {
			return handled(notice("warn", `no ${kind} evidence search target`));
		}
		const family =
			plan.action === "search-process-evidence"
				? "process"
				: plan.action === "search-remote-known-hosts-evidence"
					? "remote-known-hosts"
					: "interface";
		const prepared = prepareRecoveredEvidenceSearch(
			state,
			family,
			"status-evidence",
		);
		return handled(
			...(prepared.kind === "handled" ? prepared.effects : []),
			notice("info", `status evidence search ${plan.shortcut} ${plan.label}`),
		);
	}
	const jump = createStatusActivityCopyIntentEvidenceFocusTimelineSearch(
		state.activity.lastEvidenceFocusPlan,
	);
	return jump
		? timelineJump(state, jump)
		: handled(notice("warn", "no status activity evidence focus for timeline"));
}

function prepareEvidenceNumberFocus(
	state: StatusWorkspaceInputState,
	inputDigit: string,
): StatusWorkspaceInputTransition {
	const plan = createStatusEvidenceNumberJumpPlan(
		state.evidence.indexes,
		state.evidence.selection,
		inputDigit,
	);
	if (!plan) {
		return handled(
			notice("warn", `status evidence index unavailable ${inputDigit}`),
		);
	}
	return handled(
		{
			kind: "state",
			patch: { selectedStatusEvidenceKind: plan.kind },
		},
		notice(
			"info",
			`status evidence focus ${plan.shortcut} ${plan.kind} ${plan.label}`,
		),
	);
}

function evidenceSelectionPatch(
	kind: StatusEvidenceKind,
	selectedIndex: number,
): StatusWorkspaceStatePatch {
	switch (kind) {
		case "handoff":
			return { selectedHandoffIndex: selectedIndex };
		case "audit":
			return { selectedAuditExportIndex: selectedIndex };
		case "audit-archive":
			return { selectedAuditExportArchiveIndex: selectedIndex };
		case "cleanup":
			return { selectedCleanupExportIndex: selectedIndex };
		case "cleanup-archive":
			return { selectedCleanupExportArchiveIndex: selectedIndex };
		case "tools":
			return { selectedToolExportIndex: selectedIndex };
		case "tools-archive":
			return { selectedToolExportArchiveIndex: selectedIndex };
		case "process":
			return { selectedProcessControlAuditExportIndex: selectedIndex };
		case "remote-known-hosts":
			return {
				selectedRemoteKnownHostsSelectionAuditExportIndex: selectedIndex,
			};
		case "interface":
			return {
				selectedInterfaceConfirmationAuditExportIndex: selectedIndex,
			};
	}
}

function getInterfaceEvidencePlans(
	state: StatusWorkspaceInputState,
): ConsoleAuditExportPlan[] {
	const indexes = state.evidence.indexes;
	const selection = state.evidence.selection;
	return filterInterfaceConfirmationEvidenceExports(
		indexes.interfaceConfirmationAuditExports ?? [],
		indexes.interfaceConfirmationAuditArchiveExports ?? [],
		selection.interfaceEvidenceStateFilter ?? "all",
		selection.interfaceEvidenceQuery ?? "",
	).map((item) => item.plan);
}

function getRecoveredEvidencePlans(
	state: StatusWorkspaceInputState,
	kind: "timeline" | "process" | "remote-known-hosts" | "interface",
): ConsoleAuditExportPlan[] {
	switch (kind) {
		case "timeline":
			return filterTimelineEvidenceTrailAuditExports(
				state.activity.timelineEvidenceTrailAuditExports ?? [],
				state.activity.timelineEvidenceTrailSourceFilter ?? "all",
			);
		case "process":
			return state.evidence.indexes.processControlAuditExports ?? [];
		case "remote-known-hosts":
			return state.evidence.indexes.remoteKnownHostsSelectionAuditExports ?? [];
		case "interface":
			return getInterfaceEvidencePlans(state);
	}
}

function getRecoveredEvidenceSelectedIndex(
	state: StatusWorkspaceInputState,
	kind: "timeline" | "process" | "remote-known-hosts" | "interface",
): number {
	const selection = state.evidence.selection;
	switch (kind) {
		case "timeline":
			return state.activity.selectedTimelineEvidenceTrailAuditExportIndex ?? 0;
		case "process":
			return selection.selectedProcessControlAuditExportIndex ?? 0;
		case "remote-known-hosts":
			return selection.selectedRemoteKnownHostsSelectionAuditExportIndex ?? 0;
		case "interface":
			return selection.selectedInterfaceConfirmationAuditExportIndex ?? 0;
	}
}

function recoveredEvidenceSelectionPatch(
	kind: "timeline" | "process" | "remote-known-hosts" | "interface",
	selectedIndex: number,
): StatusWorkspaceStatePatch {
	switch (kind) {
		case "timeline":
			return { selectedTimelineEvidenceTrailAuditExportIndex: selectedIndex };
		case "process":
			return { selectedProcessControlAuditExportIndex: selectedIndex };
		case "remote-known-hosts":
			return {
				selectedRemoteKnownHostsSelectionAuditExportIndex: selectedIndex,
			};
		case "interface":
			return {
				selectedInterfaceConfirmationAuditExportIndex: selectedIndex,
			};
	}
}

function prepareRecoveredEvidenceOpen(
	state: StatusWorkspaceInputState,
	kind: "timeline" | "process" | "remote-known-hosts" | "interface",
): StatusWorkspaceInputTransition {
	const exports = getRecoveredEvidencePlans(state, kind);
	const transition = prepareRecoveredEvidenceOpenTransition({
		family: kind,
		exports,
		selectedIndex: getRecoveredEvidenceSelectedIndex(state, kind),
		activeIndex: state.evidence.indexes.auditExportIndex,
		archiveIndex: state.evidence.indexes.auditExportArchiveIndex,
		baseDir: state.baseDir,
		platform: state.platform,
	});
	const patch: StatusWorkspaceStatePatch = {
		...recoveredEvidenceSelectionPatch(kind, transition.selectedIndex),
		screen: "status",
	};
	const effects: StatusWorkspaceInputEffect[] = [];
	if (transition.kind === "open") {
		if (transition.masterSelection?.state === "active") {
			patch.selectedAuditExportIndex = transition.masterSelection.selectedIndex;
		} else if (transition.masterSelection?.state === "archived") {
			patch.selectedAuditExportArchiveIndex =
				transition.masterSelection.selectedIndex;
		}
		patch.selectedStatusEvidenceKind = transition.statusEvidenceKind;
	}
	effects.push({ kind: "state", patch });
	effects.push({ kind: "notice", notice: transition.notice });
	if (transition.auditMessage) {
		effects.push(notice("info", transition.auditMessage));
	}
	if (transition.activityResult) {
		effects.push({
			kind: "record-activity",
			result: transition.activityResult,
		});
	}
	if (transition.kind === "open") {
		const target: StatusEvidenceKind =
			kind === "timeline"
				? transition.masterSelection?.state === "archived"
					? "audit-archive"
					: "audit"
				: kind;
		effects.push(openFileConfirmation(transition.plan, target));
	}
	return handled(...effects);
}

function prepareEvidenceOpen(
	state: StatusWorkspaceInputState,
	kind: Exclude<StatusEvidenceKind, "cleanup-archive">,
): StatusWorkspaceInputTransition {
	if (
		kind === "process" ||
		kind === "remote-known-hosts" ||
		kind === "interface"
	) {
		return prepareRecoveredEvidenceOpen(state, kind);
	}
	const indexes = state.evidence.indexes;
	const baseDir =
		kind === "handoff"
			? indexes.handoffIndex.baseDir
			: kind === "audit"
				? indexes.auditExportIndex.baseDir
				: kind === "audit-archive"
					? indexes.auditExportArchiveIndex.baseDir
					: kind === "cleanup"
						? indexes.cleanupExportIndex.baseDir
						: state.baseDir;
	const transition = prepareStatusEvidenceOpenTransition({
		indexes,
		selection: state.evidence.selection,
		kind,
		baseDir,
		platform: state.platform,
		fallbackOrigin: state.fileOpenOrigin,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: {
				...evidenceSelectionPatch(kind, transition.selectedIndex),
				screen: "status",
			},
		},
		{ kind: "notice", notice: transition.notice },
		openFileConfirmation(transition.plan, kind),
	);
}

function prepareEvidenceMove(
	state: StatusWorkspaceInputState,
	direction: "next" | "previous",
): StatusWorkspaceInputTransition {
	const recovery = state.activity.toolsEvidenceRecovery;
	if (recovery && recovery.items.length > 1) {
		const selected = moveStatusActivityToolsEvidenceSearchMatchSelection(
			recovery,
			state.activity.selectedToolsEvidenceMatchIndex,
			direction,
		);
		const item = getSelectedStatusActivityToolsEvidenceSearchMatch(
			recovery,
			selected,
		);
		return handled(
			{
				kind: "state",
				patch: {
					selectedStatusActivityToolsEvidenceSearchMatchIndex: selected,
				},
			},
			notice(
				"info",
				`tools evidence match selected ${selected + 1}/${recovery.items.length} ${item?.fileName ?? ""}`.trim(),
			),
		);
	}
	const plan = createStatusEvidenceItemMovePlan(
		state.evidence.indexes,
		state.evidence.selection,
		state.evidence.selectedKind,
		direction,
	);
	if (!plan) {
		return handled(
			notice(
				"warn",
				`status evidence item unavailable ${state.evidence.selectedKind}`,
			),
		);
	}
	return handled(
		{
			kind: "state",
			patch: evidenceSelectionPatch(plan.kind, plan.selectedIndex),
		},
		notice(
			"info",
			`status evidence item ${plan.shortcut} ${plan.kind} ${plan.selectedIndex + 1}/${plan.itemCount} ${plan.label}`,
		),
	);
}

function prepareOpenToolsOrReplayWarning(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	if (state.activity.toolsEvidenceRecovery?.items.length) {
		const transition = prepareStatusActivityToolsEvidenceMatchOpen(
			state.activity.toolsEvidenceRecovery,
			state.activity.selectedToolsEvidenceMatchIndex,
			{ baseDir: state.baseDir, platform: state.platform },
		);
		const effects: StatusWorkspaceInputEffect[] = [
			{
				kind: "state",
				patch: {
					selectedStatusActivityToolsEvidenceSearchMatchIndex:
						transition.selectedIndex,
				},
			},
			{ kind: "notice", notice: transition.notice },
			notice("info", transition.auditMessage),
			{ kind: "record-activity", result: transition.result },
		];
		if (transition.kind === "open") {
			effects.push(
				openFileConfirmation(
					transition.plan,
					state.activity.toolsEvidenceRecovery.target === "archive"
						? "tools-archive"
						: "tools",
				),
			);
		}
		return handled(...effects);
	}
	if (state.evidence.selectedKind === "tools") {
		return prepareEvidenceOpen(state, "tools");
	}
	if (state.evidence.selectedKind === "tools-archive") {
		return prepareEvidenceOpen(state, "tools-archive");
	}
	const jump = createStatusActivityResultAuditJumpReplayWarningTimelineSearch(
		state.events,
	);
	return jump
		? timelineJump(state, jump)
		: handled(
				notice("warn", "no status activity stale replay warning for timeline"),
			);
}

function prepareEvidenceFocusCycle(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const indexes = state.evidence.indexes;
	const count =
		indexes.handoffIndex.items.length +
		indexes.auditExportIndex.items.length +
		indexes.auditExportArchiveIndex.items.length +
		indexes.cleanupExportIndex.items.length +
		indexes.cleanupExportArchiveIndex.items.length +
		(indexes.toolExportIndex?.items.length ?? 0) +
		(indexes.toolExportArchiveIndex?.items.length ?? 0) +
		(indexes.processControlAuditExports?.length ?? 0) +
		(indexes.remoteKnownHostsSelectionAuditExports?.length ?? 0) +
		(indexes.interfaceConfirmationAuditExports?.length ?? 0);
	if (count === 0) {
		return handled(notice("warn", "no status evidence indexed"));
	}
	const selected = moveStatusEvidenceFocus(
		indexes,
		state.evidence.selectedKind,
		"next",
	);
	return handled(
		{ kind: "state", patch: { selectedStatusEvidenceKind: selected } },
		notice("info", `status evidence focus ${selected}`),
	);
}

function prepareCleanupShelfMove(
	state: StatusWorkspaceInputState,
	direction: "next" | "previous",
): StatusWorkspaceInputTransition {
	if (state.cleanup.index.activeShelves === 0) {
		return handled(notice("warn", "no cleanup shelves with saved items"));
	}
	const selected = moveCleanupShelfSelection(
		state.cleanup.index,
		state.cleanup.selectedShelfIndex,
		direction,
	);
	const shelf = getSelectedCleanupShelf(state.cleanup.index, selected);
	return handled(
		{ kind: "state", patch: { selectedCleanupShelfIndex: selected } },
		notice("info", `cleanup shelf selected ${shelf?.label ?? selected + 1}`),
	);
}

function prepareEvidenceEnter(
	state: StatusWorkspaceInputState,
	activityPlan: StatusActivityResult,
): StatusWorkspaceInputTransition {
	const plan = createStatusEvidenceEnterPlan(
		state.evidence.indexes,
		state.evidence.selection,
		state.evidence.selectedKind,
	);
	if (plan) {
		const commonEffects: StatusWorkspaceInputEffect[] = [
			notice(
				"info",
				`status evidence enter ${plan.action} ${plan.shortcut} ${plan.label}`,
			),
			{
				kind: "record-activity",
				result: {
					...activityPlan,
					detail: `${plan.action} ${plan.shortcut} ${plan.label}`,
				},
			},
		];
		if (plan.action === "select-cleanup-archive") {
			return handled(
				notice(
					"info",
					`cleanup archive selected ${plan.label}; use { to cycle archived cleanup exports`,
				),
				...commonEffects,
			);
		}
		const kindByAction = {
			"open-handoff": "handoff",
			"open-audit": "audit",
			"open-audit-archive": "audit-archive",
			"open-cleanup": "cleanup",
			"open-tools": "tools",
			"open-tools-archive": "tools-archive",
			"open-process-evidence": "process",
			"open-remote-known-hosts-evidence": "remote-known-hosts",
			"open-interface-evidence": "interface",
		} as const;
		const opened = prepareEvidenceOpen(state, kindByAction[plan.action]);
		return opened.kind === "handled"
			? handled(...opened.effects, ...commonEffects)
			: handled(...commonEffects);
	}
	const shelf = getSelectedCleanupShelf(
		state.cleanup.index,
		state.cleanup.selectedShelfIndex,
	);
	if (!shelf) return handled(notice("warn", "no cleanup shelf selected"));
	const message = `cleanup handoff ${shelf.label}: press ${shelf.shortcut} then type ${shelf.confirmationPhrase}`;
	return handled(
		{
			kind: "state",
			patch: {
				cleanupJumpAudit: createCleanupJumpAudit(shelf),
				screen: shelf.screen,
			},
		},
		{
			kind: "record-activity",
			result: { ...activityPlan, detail: message },
		},
		notice("info", message),
	);
}

function prepareActivityEnter(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const plan = createStatusActivityEnterPlan(
		createActivityQueue(state, true),
		state.activity.selectedSource,
	);
	switch (plan.action) {
		case "cycle-release-link": {
			const handoff = state.updates.packageResult
				? createUpdateReleaseHandoff(state.updates.packageResult)
				: undefined;
			if (!handoff) {
				return handled(notice("warn", "no update handoff links"));
			}
			const links = getUpdateReleaseHandoffLinks(handoff);
			const selected = (state.updates.selectedLinkIndex + 1) % links.length;
			return handled(
				{
					kind: "state",
					patch: { selectedUpdateHandoffIndex: selected },
				},
				notice(
					"info",
					`update handoff selected ${links[selected]?.label ?? ""}`,
				),
				{
					kind: "record-activity",
					result: { ...plan, detail: "release handoff link cycled" },
				},
				notice("info", plan.message),
			);
		}
		case "show-dialog":
			return handled(
				{ kind: "record-activity", result: plan },
				notice("info", plan.message),
			);
		case "jump-cleanup": {
			const shelf = getSelectedCleanupShelf(
				state.cleanup.index,
				state.cleanup.selectedShelfIndex,
			);
			if (!shelf) {
				return handled(notice("warn", "no cleanup shelf selected"));
			}
			const message = `cleanup handoff ${shelf.label}: press ${shelf.shortcut} then type ${shelf.confirmationPhrase}`;
			return handled(
				{
					kind: "state",
					patch: {
						cleanupJumpAudit: createCleanupJumpAudit(shelf),
						screen: shelf.screen,
					},
				},
				{
					kind: "record-activity",
					result: { ...plan, detail: message },
				},
				notice("info", plan.message),
				notice("info", message),
			);
		}
		case "focus-config":
			return handled(
				{
					kind: "state",
					patch: { screen: "config", focusArea: "workspaces" },
				},
				{
					kind: "record-activity",
					result: { ...plan, detail: "Config recovery hints opened" },
				},
				notice("info", plan.message),
			);
		case "none":
			return handled(
				{ kind: "record-activity", result: plan },
				notice("warn", plan.message),
			);
		case "enter-evidence":
			return prepareEvidenceEnter(state, plan);
		default:
			return handled(
				{ kind: "record-activity", result: plan },
				notice("warn", plan.message),
			);
	}
}

function prepareEvidenceAction(
	state: StatusWorkspaceInputState,
	kind: StatusEvidenceKind,
	intent: "archive" | "retention",
	options: { forceArchivedInterface?: boolean } = {},
): StatusWorkspaceInputTransition {
	const selection =
		kind === "interface" && options.forceArchivedInterface
			? {
					...state.evidence.selection,
					interfaceEvidenceStateFilter: "archived" as const,
				}
			: state.evidence.selection;
	const transition = prepareStatusEvidenceActionTransition({
		indexes: state.evidence.indexes,
		selection,
		kind,
		intent,
		baseDir: state.baseDir,
		retentionLimit: state.retentionLimit,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	const patch: StatusWorkspaceStatePatch = evidenceSelectionPatch(
		kind,
		transition.selectedIndex,
	);
	if (kind === "interface") {
		patch.selectedStatusEvidenceKind = "interface";
	}
	if (transition.kind === "archive") {
		return handled(
			{ kind: "state", patch },
			{ kind: "notice", notice: transition.notice },
			{
				kind: "handoff-archive",
				baseDir: transition.baseDir,
				path: transition.path,
				selectedIndex: transition.selectedIndex,
				refresh: createStatusIndexRefreshEffect(
					state,
					"handoff",
					false,
					transition.selectedIndex,
				),
				successMessagePrefix: "handoff archive",
				failureMessagePrefix: "handoff archive failed",
			},
		);
	}
	return handled(
		{ kind: "state", patch },
		{ kind: "notice", notice: transition.notice },
		planConfirmation(
			transition.plan,
			transition.scope === "audit"
				? "all"
				: transition.scope === "interface"
					? "interface"
					: transition.scope,
		),
	);
}

function prepareEvidenceArchive(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const plan = createStatusEvidenceActionPlan(
		state.evidence.indexes,
		state.evidence.selection,
		state.evidence.selectedKind,
		"archive",
	);
	if (!plan) {
		return handled(
			notice(
				"warn",
				`status evidence archive unavailable for ${state.evidence.selectedKind}`,
			),
		);
	}
	const effects: StatusWorkspaceInputEffect[] = [];
	if (
		plan.action === "archive-handoff" ||
		plan.action === "archive-audit" ||
		plan.action === "archive-cleanup" ||
		plan.action === "archive-tools" ||
		plan.action === "archive-interface-evidence"
	) {
		const prepared = prepareEvidenceAction(state, plan.kind, "archive");
		if (prepared.kind === "handled") {
			effects.push(...prepared.effects);
		}
	}
	effects.push(
		notice(
			"info",
			`status evidence action ${plan.action} ${plan.shortcut} ${plan.label}`,
		),
	);
	return handled(...effects);
}

function prepareEvidenceRetention(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const plan = createStatusEvidenceActionPlan(
		state.evidence.indexes,
		state.evidence.selection,
		state.evidence.selectedKind,
		"retention",
	);
	if (!plan) {
		return handled(
			notice(
				"warn",
				`status evidence retention unavailable for ${state.evidence.selectedKind}`,
			),
		);
	}
	const kind =
		plan.action === "preview-tools-retention"
			? "tools-archive"
			: plan.action === "preview-interface-retention"
				? "interface"
				: "audit-archive";
	const prepared = prepareEvidenceAction(state, kind, "retention", {
		forceArchivedInterface: kind === "interface",
	});
	return handled(
		...(prepared.kind === "handled" ? prepared.effects : []),
		notice(
			"info",
			`status evidence action ${plan.action} ${plan.shortcut} ${plan.label}`,
		),
	);
}

function prepareLegacyIndexMove(
	items: Array<{ fileName: string }>,
	selectedIndex: number,
	patchKey:
		| "selectedCleanupExportIndex"
		| "selectedAuditExportIndex"
		| "selectedAuditExportArchiveIndex"
		| "selectedCleanupExportArchiveIndex",
	label: string,
	emptyMessage: string,
): StatusWorkspaceInputTransition {
	if (items.length === 0) return handled(notice("warn", emptyMessage));
	const selected = (clampIndex(selectedIndex, items.length) + 1) % items.length;
	return handled(
		{ kind: "state", patch: { [patchKey]: selected } },
		notice(
			"info",
			`${label} selected ${items[selected]?.fileName ?? selected + 1}`,
		),
	);
}

function prepareCopyIntentExport(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const selection = prepareStatusActivityAuditExportSelection({
		copyIntents: state.activity.copyIntents,
		selectedCopyIntentIndex: state.activity.selectedCopyIntentIndex,
		results: state.activity.results,
		selectedResultIndex: state.activity.selectedResultIndex,
		baseDir: state.baseDir,
		generatedAt: state.generatedAt,
	});
	if (selection.kind === "remote-known-hosts") {
		return prepareRemoteKnownHostsHandoff(state, "export");
	}
	const isInterface = selection.kind === "interface-confirmation";
	return handled({
		kind: "audit-write",
		writer: isInterface
			? "interface-confirmation"
			: "status-activity-copy-intent",
		plan: selection.plan,
		publication: {
			setLastStatusActivityCopyIntentAuditExport: true,
			refreshAuditExportIndex: false,
			refresh: createStatusIndexRefreshEffect(state, "audit", false),
		},
		successMessagePrefix: isInterface
			? "interface confirmation audit exported"
			: "status activity copy intent exported",
		failureMessagePrefix: isInterface
			? "interface confirmation audit export failed"
			: "status activity copy intent export failed",
	});
}

export function formatStatusAuditWriteSuccess(
	effect: StatusAuditWriteEffect,
	written: ConsoleAuditExportPlan,
): StatusInputNotice {
	return {
		level: "ok",
		message: `${effect.successMessagePrefix} ${written.path} events=${written.eventCount}`,
	};
}

export function formatStatusAuditWriteFailure(
	effect: StatusAuditWriteEffect,
	error: unknown,
): StatusInputNotice {
	return {
		level: "fail",
		message: `${effect.failureMessagePrefix} ${error instanceof Error ? error.message : String(error)}`,
	};
}

function prepareLastCopyExportOpen(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const last = state.activity.lastCopyIntentAuditExport;
	if (!last) {
		return handled(
			notice("warn", "no status activity copy intent export to open"),
		);
	}
	const plan = createStatusActivityCopyIntentAuditExportOpenPlan(last, {
		baseDir: state.baseDir,
		platform: state.platform,
	});
	const evidenceIndex = getStatusActivityCopyIntentAuditExportIndex(
		state.evidence.indexes.auditExportIndex,
		last,
	);
	return handled(
		...(evidenceIndex === undefined
			? []
			: [
					{
						kind: "state" as const,
						patch: {
							selectedAuditExportIndex: evidenceIndex,
							selectedStatusEvidenceKind: "audit" as const,
						},
					},
				]),
		{
			kind: "open-file-confirmation",
			target: "audit",
			plan,
			prompt: "file-open",
			screen: "status",
			clearPlans: [
				"externalOpen",
				"auditExportArchive",
				"auditArchiveRetention",
				"cleanupExportArchive",
			],
		},
		notice(
			"info",
			`status activity copy intent export open confirmation opened for ${last.path}${evidenceIndex !== undefined ? ` evidence=${evidenceIndex + 1}` : ""}`,
		),
	);
}

function prepareLastCopyExportFocus(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const last = state.activity.lastCopyIntentAuditExport;
	if (!last) {
		return handled(
			notice("warn", "no status activity copy intent export to focus"),
		);
	}
	const plan = createStatusActivityCopyIntentEvidenceFocusPlan(
		state.evidence.indexes.auditExportIndex,
		last,
	);
	if (!plan) {
		return handled(
			notice("warn", "status activity copy intent evidence unavailable"),
		);
	}
	return handled(
		{
			kind: "state",
			patch: {
				selectedAuditExportIndex: plan.selectedIndex,
				selectedStatusEvidenceKind: plan.kind,
				lastStatusActivityEvidenceFocusPlan: plan,
				screen: "status",
			},
		},
		{
			kind: "record-activity",
			result: createStatusActivityCopyIntentEvidenceFocusResult(plan),
		},
		notice(
			"info",
			formatStatusActivityCopyIntentEvidenceFocusAuditMessage(plan),
		),
	);
}

function isSelectedInterfaceEvidenceArchived(
	state: StatusWorkspaceInputState,
): boolean {
	const indexes = state.evidence.indexes;
	const selection = state.evidence.selection;
	const exports = filterInterfaceConfirmationEvidenceExports(
		indexes.interfaceConfirmationAuditExports ?? [],
		indexes.interfaceConfirmationAuditArchiveExports ?? [],
		selection.interfaceEvidenceStateFilter ?? "all",
		selection.interfaceEvidenceQuery ?? "",
	);
	const selected = resolveRecoveredEvidenceResultOptions(
		selection.selectedInterfaceConfirmationAuditExportIndex ?? 0,
		exports.length,
	).selectedIndex;
	return exports[selected]?.state === "archived";
}

function prepareCleanupHistoryReopen(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareCleanupHandoffHistoryReopen({
		history: state.cleanup.history,
		selectedIndex: state.cleanup.selectedHistoryIndex ?? 0,
	});
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "state",
			patch: {
				cleanupJumpAudit: transition.audit,
				screen: transition.screen,
			},
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareCleanupHistoryExport(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareCleanupHandoffExport(
		state.cleanup.history,
		state.cleanup.selectedHistoryIndex ?? 0,
		{
			baseDir: state.baseDir,
			origin: state.fileOpenOrigin,
			scope: "all",
		},
	);
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled({
		kind: "cleanup-history-write",
		plan: transition.plan,
		refresh: createStatusIndexRefreshEffect(state, "cleanup", false),
		successMessagePrefix: "cleanup history exported",
		failureMessagePrefix: "cleanup history export failed",
	});
}

function prepareUpdateClipboard(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareSelectedUpdateHandoffClipboard(
		state.updates.packageResult
			? createUpdateReleaseHandoff(state.updates.packageResult)
			: undefined,
		state.updates.selectedLinkIndex,
	);
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled({
		kind: "clipboard-confirmation",
		preview: transition.preview,
	});
}

function prepareUpdateExternalOpen(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	const transition = prepareSelectedUpdateHandoffExternalOpen(
		state.updates.packageResult
			? createUpdateReleaseHandoff(state.updates.packageResult)
			: undefined,
		state.updates.selectedLinkIndex,
		state.platform,
	);
	if (transition.kind === "notice") {
		return handled({ kind: "notice", notice: transition.notice });
	}
	return handled(
		{
			kind: "external-open-confirmation",
			plan: transition.plan,
			prompt: transition.prompt,
		},
		{ kind: "notice", notice: transition.notice },
	);
}

function prepareToolsArchive(
	state: StatusWorkspaceInputState,
): StatusWorkspaceInputTransition {
	if (state.activity.toolsEvidenceRecovery?.items.length) {
		const transition = prepareStatusActivityToolsEvidenceMatchArchive(
			state.activity.toolsEvidenceRecovery,
			state.activity.selectedToolsEvidenceMatchIndex,
			{ baseDir: state.baseDir },
		);
		const effects: StatusWorkspaceInputEffect[] = [
			{
				kind: "state",
				patch: {
					selectedStatusActivityToolsEvidenceSearchMatchIndex:
						transition.selectedIndex,
				},
			},
			{ kind: "notice", notice: transition.notice },
			notice("info", transition.auditMessage),
			{ kind: "record-activity", result: transition.result },
		];
		if (transition.kind === "confirmation") {
			effects.push(planConfirmation(transition.plan, "tools"));
		}
		return handled(...effects);
	}
	return prepareEvidenceAction(state, "tools", "archive");
}

export function formatStatusCleanupHistoryWriteSuccess(
	effect: StatusCleanupHistoryWriteEffect,
	written: CleanupHandoffHistoryExportPlan,
): StatusInputNotice {
	return {
		level: "ok",
		message: `${effect.successMessagePrefix} ${written.itemCount} entries to ${written.path}`,
	};
}

export function formatStatusCleanupHistoryWriteFailure(
	effect: StatusCleanupHistoryWriteEffect,
	error: unknown,
): StatusInputNotice {
	return {
		level: "fail",
		message: `${effect.failureMessagePrefix} ${error instanceof Error ? error.message : String(error)}`,
	};
}

export function formatStatusHandoffArchiveResult(
	effect: StatusHandoffArchiveEffect,
	result: { status: "archived" | "blocked"; message: string },
): StatusInputNotice {
	return {
		level: result.status === "archived" ? "ok" : "warn",
		message: `${effect.successMessagePrefix} ${result.message}`,
	};
}

export function formatStatusHandoffArchiveFailure(
	effect: StatusHandoffArchiveEffect,
	error: unknown,
): StatusInputNotice {
	return {
		level: "fail",
		message: `${effect.failureMessagePrefix} ${error instanceof Error ? error.message : String(error)}`,
	};
}

export function formatStatusConfigWriteFailure(
	effect: StatusConfigWriteEffect,
	error: unknown,
): StatusInputNotice {
	const message = error instanceof Error ? error.message : String(error);
	return {
		level: effect.key === "statusResultJumpClassFilter" ? "warn" : "fail",
		message: effect.failureMessagePrefix
			? `${effect.failureMessagePrefix} ${message}`
			: message,
	};
}

const statusCommandPreparers = {
	"cycle-evidence-filter": ({ state }) =>
		state.evidence.selectedKind === "interface"
			? prepareInterfaceEvidenceFilterCycle(state)
			: prepareToolsEvidenceFilterCycle(state),
	"cycle-update-link": ({ state }) => prepareUpdateLinkCycle(state),
	"move-activity-previous": ({ state }) =>
		prepareActivityMove(state, "previous"),
	"move-activity-next": ({ state }) => prepareActivityMove(state, "next"),
	"move-result-history-previous": ({ state }) =>
		prepareResultHistoryMove(state, "previous"),
	"move-result-history-next": ({ state }) =>
		prepareResultHistoryMove(state, "next"),
	"filter-or-interface-search": ({ state }) =>
		state.evidence.selectedKind === "interface"
			? prepareInterfaceSearchPrompt(state)
			: prepareResultHistoryFilterCycle(state),
	"cycle-result-timeline-filter": ({ state }) =>
		prepareResultTimelineFilterCycle(state),
	"move-copy-preview-row": ({ state }) => prepareCopyPreviewMove(state),
	"toggle-copy-preview": ({ state }) => prepareCopyPreviewToggle(state),
	"open-interface-or-result-timeline": ({ state }) =>
		prepareInterfaceOrResultTimeline(state),
	"copy-result": ({ state }) => prepareResultCopy(state),
	"move-copy-intent-previous": ({ state }) =>
		prepareCopyIntentMove(state, "previous"),
	"move-copy-intent-next": ({ state }) => prepareCopyIntentMove(state, "next"),
	"save-interface-preset-or-move-audit-jump": ({ state }) =>
		prepareAuditJumpMove(state),
	"select-remote-known-hosts-handoff": ({ state }) =>
		prepareRemoteHandoffSelection(state),
	"select-result-timeline-jump": ({ state }) =>
		prepareResultTimelineSelection(state),
	"jump-copy-intent-timeline": ({ state }) =>
		prepareCopyIntentTimelineJump(state),
	"jump-evidence-search": ({ state }) => prepareEvidenceSearch(state),
	"open-tools-or-replay-warning": ({ state }) =>
		prepareOpenToolsOrReplayWarning(state),
	"cycle-interface-preset-or-search-trail": ({ state }) =>
		state.evidence.selectedKind === "interface"
			? prepareInterfacePresetCycle(state)
			: prepareRecoveredEvidenceSearch(state, "timeline"),
	"select-timeline-trail-export": ({ state }) =>
		prepareRecoveredEvidenceSelection(state, "timeline"),
	"cycle-timeline-trail-source": ({ state }) =>
		prepareTimelineEvidenceSourceCycle(state),
	"select-process-export": ({ state }) =>
		prepareRecoveredEvidenceSelection(state, "process"),
	"replay-copy-intent": ({ state }) => prepareCopyIntentReplay(state),
	"export-copy-intent": ({ state }) => prepareCopyIntentExport(state),
	"open-last-copy-export": ({ state }) => prepareLastCopyExportOpen(state),
	"open-timeline-trail-export": ({ state }) =>
		prepareRecoveredEvidenceOpen(state, "timeline"),
	"focus-last-copy-export": ({ state }) => prepareLastCopyExportFocus(state),
	"number-evidence-focus": ({ state, inputDigit }) =>
		prepareEvidenceNumberFocus(state, inputDigit),
	"move-evidence-previous": ({ state }) =>
		prepareEvidenceMove(state, "previous"),
	"move-evidence-next": ({ state }) => prepareEvidenceMove(state, "next"),
	"cycle-evidence-focus": ({ state }) => prepareEvidenceFocusCycle(state),
	"move-cleanup-next": ({ state }) => prepareCleanupShelfMove(state, "next"),
	"move-cleanup-previous": ({ state }) =>
		prepareCleanupShelfMove(state, "previous"),
	"reopen-cleanup-or-open-remote-export": ({ state }) =>
		state.evidence.selectedKind === "remote-known-hosts"
			? prepareRecoveredEvidenceOpen(state, "remote-known-hosts")
			: prepareCleanupHistoryReopen(state),
	"export-cleanup-history": ({ state }) => prepareCleanupHistoryExport(state),
	"enter-activity": ({ state }) => prepareActivityEnter(state),
	"archive-evidence": ({ state }) => prepareEvidenceArchive(state),
	"preview-retention": ({ state }) => prepareEvidenceRetention(state),
	"refresh-cleanup": ({ state }) =>
		handled(createStatusIndexRefreshEffect(state, "cleanup", true)),
	"refresh-audit": ({ state }) =>
		handled(createStatusIndexRefreshEffect(state, "audit", true)),
	"refresh-audit-archive": ({ state }) =>
		handled(createStatusIndexRefreshEffect(state, "audit-archive", true)),
	"refresh-cleanup-archive": ({ state }) =>
		handled(createStatusIndexRefreshEffect(state, "cleanup-archive", true)),
	"open-tools-archive": ({ state }) => prepareToolsArchive(state),
	"move-cleanup-export": ({ state }) =>
		prepareLegacyIndexMove(
			state.evidence.indexes.cleanupExportIndex.items,
			state.evidence.selection.selectedCleanupExportIndex,
			"selectedCleanupExportIndex",
			"cleanup export",
			"no cleanup exports indexed",
		),
	"move-audit-export": ({ state }) =>
		prepareLegacyIndexMove(
			state.evidence.indexes.auditExportIndex.items,
			state.evidence.selection.selectedAuditExportIndex,
			"selectedAuditExportIndex",
			"audit export",
			"no audit exports indexed",
		),
	"move-audit-archive": ({ state }) =>
		prepareLegacyIndexMove(
			state.evidence.indexes.auditExportArchiveIndex.items,
			state.evidence.selection.selectedAuditExportArchiveIndex,
			"selectedAuditExportArchiveIndex",
			"audit archive",
			"no audit archive indexed",
		),
	"move-cleanup-archive": ({ state }) =>
		prepareLegacyIndexMove(
			state.evidence.indexes.cleanupExportArchiveIndex.items,
			state.evidence.selection.selectedCleanupExportArchiveIndex,
			"selectedCleanupExportArchiveIndex",
			"cleanup archive",
			"no cleanup archive indexed",
		),
	"open-cleanup-export": ({ state }) => prepareEvidenceOpen(state, "cleanup"),
	"open-audit-export": ({ state }) => prepareEvidenceOpen(state, "audit"),
	"preview-selected-retention": ({ state }) =>
		state.evidence.selectedKind === "tools-archive"
			? prepareEvidenceAction(state, "tools-archive", "retention")
			: state.evidence.selectedKind === "interface" &&
					isSelectedInterfaceEvidenceArchived(state)
				? prepareEvidenceAction(state, "interface", "retention", {
						forceArchivedInterface: true,
					})
				: prepareEvidenceAction(state, "audit-archive", "retention"),
	"archive-selected-audit": ({ state }) =>
		prepareEvidenceAction(state, "audit", "archive"),
	"archive-selected-cleanup": ({ state }) =>
		prepareEvidenceAction(state, "cleanup", "archive"),
	"open-handoff": ({ state }) => prepareEvidenceOpen(state, "handoff"),
	"archive-handoff-or-interface": ({ state }) =>
		state.evidence.selectedKind === "interface" &&
		!isSelectedInterfaceEvidenceArchived(state)
			? prepareEvidenceAction(state, "interface", "archive")
			: prepareEvidenceAction(state, "handoff", "archive"),
	"copy-update-link": ({ state }) => prepareUpdateClipboard(state),
	"open-update-link": ({ state }) => prepareUpdateExternalOpen(state),
} satisfies Record<StatusWorkspaceCommand, StatusCommandPreparer>;

export function prepareStatusWorkspaceInput(
	input: StatusWorkspaceInput,
): StatusWorkspaceInputTransition {
	if (!input.command || !input.state) return { kind: "unhandled" };
	return statusCommandPreparers[input.command]({
		inputDigit: input.inputDigit,
		state: input.state,
	});
}
