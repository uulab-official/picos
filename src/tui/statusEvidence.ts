import {
	type ConsoleAuditArchivePruneResult,
	type ConsoleAuditArchiveRetentionPlan,
	type ConsoleAuditExportArchivePlan,
	type ConsoleAuditExportArchiveResult,
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportIndexItem,
	type ConsoleAuditExportPlan,
	createConsoleAuditArchiveRetentionPlan,
	createConsoleAuditExportArchivePlan,
	getSelectedConsoleAuditExport,
} from "../core/auditLog";
import {
	buildFileOpenPlan,
	type FileOpenOrigin,
	type FileOpenPlan,
} from "../core/fileOpen";
import {
	nextInterfaceEvidenceSearchPreset,
	normalizeInterfaceEvidenceQuery,
} from "../core/interfaceEvidencePreferences";

export { normalizeInterfaceEvidenceQuery } from "../core/interfaceEvidencePreferences";

import type { HandoffIndex, HandoffIndexItem } from "../core/handoffIndex";
import { getSelectedHandoffIndexItem } from "../core/handoffIndex";
import type { SupportedPlatform } from "../core/types";
import type {
	CleanupHandoffHistoryExportArchiveResult,
	CleanupHandoffHistoryExportIndex,
	CleanupHandoffHistoryExportIndexItem,
} from "./cleanupIndex";
import {
	getSelectedCleanupHandoffHistoryExport,
	getSelectedCleanupHandoffHistoryExportArchive,
	prepareSelectedCleanupExportArchive,
} from "./cleanupIndex";
import { clampIndex } from "./navigation";
import { classifyRequestPublication } from "./requestSequence";
import {
	createInterfaceEvidenceOutcomeStatusActivityResult,
	createRecoveredStatusEvidenceIndex,
	filterInterfaceConfirmationAuditExportIndex,
	formatInterfaceEvidenceOutcomeAuditMessage,
	type RecoveredStatusEvidenceIndex,
	type StatusActivityResult,
	type TimelineEvidenceTrailSourceFilter,
} from "./statusActivityQueue";
import type {
	ToolHistoryArchivePruneResult,
	ToolHistoryEvidenceFilter,
	ToolHistoryExportArchiveResult,
	ToolHistoryExportIndex,
	ToolHistoryExportIndexItem,
} from "./toolHistory";

export type EvidenceArchiveOutcomeTransition = {
	publication: "current" | "stale";
	publishCurrentState: boolean;
	notices: { level: "info" | "ok" | "warn"; message: string }[];
	activityResult?: StatusActivityResult;
	refreshActive: boolean;
	refreshArchive: boolean;
	selectedEvidenceKind?: "tools-archive" | "interface";
	interfaceStateFilter?: "archived";
	selectedIndex?: 0;
};

type EvidenceArchiveRequest = {
	currentToken: number;
	requestToken: number;
};

function classifyEvidenceArchiveRequest(
	input: EvidenceArchiveRequest,
): Pick<
	EvidenceArchiveOutcomeTransition,
	"publication" | "publishCurrentState"
> {
	const publication = classifyRequestPublication(
		input.currentToken,
		input.requestToken,
	);
	return {
		publication,
		publishCurrentState: publication === "current",
	};
}

export function classifyCleanupExportArchiveOutcome(
	input: EvidenceArchiveRequest & {
		result: CleanupHandoffHistoryExportArchiveResult;
	},
): EvidenceArchiveOutcomeTransition {
	return {
		...classifyEvidenceArchiveRequest(input),
		notices: [
			{
				level: input.result.status === "archived" ? "ok" : "warn",
				message: `cleanup export archive ${input.result.message}`,
			},
		],
		refreshActive: input.result.status === "archived",
		refreshArchive: input.result.status === "archived",
	};
}

export function classifyToolExportArchiveOutcome(
	input: EvidenceArchiveRequest & {
		plan: ToolHistoryExportArchivePlan;
		result: ToolHistoryExportArchiveResult;
	},
): EvidenceArchiveOutcomeTransition {
	return {
		...classifyEvidenceArchiveRequest(input),
		notices: [
			{
				level: input.result.status === "archived" ? "ok" : "warn",
				message: `tools evidence archive ${input.result.message}`,
			},
		],
		activityResult: {
			source: "evidence",
			action: "tools-evidence-archive",
			message: `tools evidence archive ${input.result.status} ${input.plan.fileName}`,
			detail: `${input.result.message} from=${input.result.sourcePath} to=${input.result.archivedPath}`,
		},
		refreshActive: input.result.status === "archived",
		refreshArchive: input.result.status === "archived",
		...(input.result.status === "archived"
			? { selectedEvidenceKind: "tools-archive" as const }
			: {}),
	};
}

export function classifyAuditExportArchiveOutcome(
	input: {
		scope: "audit" | "interface";
		plan: ConsoleAuditExportArchivePlan;
		result: ConsoleAuditExportArchiveResult;
	} & EvidenceArchiveRequest,
): EvidenceArchiveOutcomeTransition {
	const label =
		input.scope === "interface" ? "interface evidence" : "audit export";
	const outcome = {
		status: input.result.status,
		message: input.result.message,
		fileName: input.plan.fileName,
		sourcePath: input.result.sourcePath,
		archivedPath: input.result.archivedPath,
	};
	return {
		...classifyEvidenceArchiveRequest(input),
		notices: [
			{
				level: input.result.status === "archived" ? "ok" : "warn",
				message: `${label} archive ${input.result.message}`,
			},
			...(input.scope === "interface"
				? [
						{
							level: "info" as const,
							message: formatInterfaceEvidenceOutcomeAuditMessage(
								"archive",
								outcome,
							),
						},
					]
				: []),
		],
		activityResult:
			input.scope === "interface"
				? createInterfaceEvidenceOutcomeStatusActivityResult("archive", outcome)
				: {
						source: "evidence",
						action: "audit-evidence-archive",
						message: `audit export archive ${input.result.status} ${input.plan.fileName}`,
						detail: `${input.result.message} from=${input.result.sourcePath} to=${input.result.archivedPath}`,
					},
		refreshActive: input.result.status === "archived",
		refreshArchive: input.result.status === "archived",
		...(input.scope === "interface" && input.result.status === "archived"
			? {
					selectedEvidenceKind: "interface" as const,
					interfaceStateFilter: "archived" as const,
					selectedIndex: 0 as const,
				}
			: {}),
	};
}

export function classifyAuditArchiveRetentionOutcome(
	input: {
		scope: "audit" | "interface";
		plan: ConsoleAuditArchiveRetentionPlan;
		result: ConsoleAuditArchivePruneResult;
	} & EvidenceArchiveRequest,
): EvidenceArchiveOutcomeTransition {
	const outcome = {
		status: input.result.status,
		message: input.result.message,
		removed: input.result.removed,
		candidates: input.plan.candidateItems.length,
		maxItems: input.plan.maxItems,
	};
	return {
		...classifyEvidenceArchiveRequest(input),
		notices: [
			{
				level: input.result.status === "pruned" ? "ok" : "warn",
				message: `${input.scope === "interface" ? "interface evidence" : "audit"} archive retention ${input.result.message}`,
			},
			...(input.scope === "interface"
				? [
						{
							level: "info" as const,
							message: formatInterfaceEvidenceOutcomeAuditMessage(
								"retention",
								outcome,
							),
						},
					]
				: []),
		],
		activityResult:
			input.scope === "interface"
				? createInterfaceEvidenceOutcomeStatusActivityResult(
						"retention",
						outcome,
					)
				: {
						source: "evidence",
						action: "audit-evidence-retention",
						message: `audit archive retention ${input.result.status} removed=${input.result.removed}`,
						detail: input.result.message,
					},
		refreshActive: false,
		refreshArchive: input.result.status === "pruned",
	};
}

export function classifyToolArchiveRetentionOutcome(
	input: {
		result: ToolHistoryArchivePruneResult;
	} & EvidenceArchiveRequest,
): EvidenceArchiveOutcomeTransition {
	return {
		...classifyEvidenceArchiveRequest(input),
		notices: [
			{
				level: input.result.status === "pruned" ? "ok" : "warn",
				message: `tools archive retention ${input.result.message}`,
			},
		],
		activityResult: {
			source: "evidence",
			action: "tools-evidence-retention",
			message: `tools archive retention ${input.result.status} removed=${input.result.removed}`,
			detail: input.result.message,
		},
		refreshActive: false,
		refreshArchive: input.result.status === "pruned",
	};
}

import {
	createToolHistoryArchiveRetentionPlan,
	filterToolHistoryExportIndex,
	getSelectedToolHistoryExport,
	prepareSelectedToolHistoryExportArchive,
	type ToolHistoryArchiveRetentionPlan,
	type ToolHistoryExportArchivePlan,
} from "./toolHistory";

export type StatusEvidenceIndexes = {
	handoffIndex: HandoffIndex;
	auditExportIndex: ConsoleAuditExportIndex;
	auditExportArchiveIndex: ConsoleAuditExportIndex;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	toolExportIndex?: ToolHistoryExportIndex;
	toolExportArchiveIndex?: ToolHistoryExportIndex;
	processControlAuditExports?: ConsoleAuditExportPlan[];
	remoteKnownHostsSelectionAuditExports?: ConsoleAuditExportPlan[];
	interfaceConfirmationAuditExports?: ConsoleAuditExportPlan[];
	interfaceConfirmationAuditArchiveExports?: ConsoleAuditExportPlan[];
};

export type StatusEvidenceSelection = {
	selectedHandoffIndex: number;
	selectedAuditExportIndex: number;
	selectedAuditExportArchiveIndex: number;
	selectedCleanupExportIndex: number;
	selectedCleanupExportArchiveIndex: number;
	selectedToolExportIndex?: number;
	selectedToolExportArchiveIndex?: number;
	selectedProcessControlAuditExportIndex?: number;
	selectedRemoteKnownHostsSelectionAuditExportIndex?: number;
	selectedInterfaceConfirmationAuditExportIndex?: number;
	toolExportFilter?: ToolHistoryEvidenceFilter;
	toolExportArchiveFilter?: ToolHistoryEvidenceFilter;
	toolExportQuery?: string;
	toolExportArchiveQuery?: string;
	interfaceEvidenceStateFilter?: InterfaceEvidenceStateFilter;
	interfaceEvidenceQuery?: string;
};

export type InterfaceEvidenceStateFilter = "all" | "active" | "archived";

export type InterfaceEvidenceExport = {
	plan: ConsoleAuditExportPlan;
	state: Exclude<InterfaceEvidenceStateFilter, "all">;
};

export type StatusEvidenceKind =
	| "handoff"
	| "audit"
	| "audit-archive"
	| "cleanup"
	| "cleanup-archive"
	| "tools"
	| "tools-archive"
	| "process"
	| "remote-known-hosts"
	| "interface";

export type StatusEvidenceEnterAction =
	| "open-handoff"
	| "open-audit"
	| "open-audit-archive"
	| "open-cleanup"
	| "select-cleanup-archive"
	| "open-tools"
	| "open-tools-archive"
	| "open-process-evidence"
	| "open-remote-known-hosts-evidence"
	| "open-interface-evidence";

export type StatusEvidenceSecondaryIntent = "archive" | "retention";

export type StatusEvidenceSecondaryAction =
	| "archive-handoff"
	| "archive-audit"
	| "archive-cleanup"
	| "archive-tools"
	| "archive-interface-evidence"
	| "preview-audit-retention"
	| "preview-tools-retention"
	| "preview-interface-retention";

export type StatusEvidenceSearchAction =
	| "search-process-evidence"
	| "search-remote-known-hosts-evidence"
	| "search-interface-evidence";

export type StatusEvidenceEnterPlan = {
	kind: StatusEvidenceKind;
	action: StatusEvidenceEnterAction;
	shortcut: string;
	label: string;
	path: string;
};

export type StatusEvidenceActionPlan = {
	kind: StatusEvidenceKind;
	action: StatusEvidenceSecondaryAction;
	shortcut: string;
	label: string;
	path: string;
};

export type StatusEvidenceSearchPlan = {
	kind: StatusEvidenceKind;
	action: StatusEvidenceSearchAction;
	shortcut: string;
	label: string;
	path: string;
	query: string;
};

export type StatusEvidenceNumberJumpPlan = {
	kind: StatusEvidenceKind;
	shortcut: string;
	label: string;
};

export type StatusEvidenceItemMoveDirection = "next" | "previous";

export type StatusEvidenceItemMovePlan = {
	kind: StatusEvidenceKind;
	direction: StatusEvidenceItemMoveDirection;
	shortcut: string;
	selectedIndex: number;
	itemCount: number;
	label: string;
};

export type StatusEvidenceNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

export type StatusEvidenceIndexRefreshTransition<
	Index,
	Extra extends object = Record<never, never>,
> =
	| { status: "stale"; notice?: StatusEvidenceNotice }
	| { status: "failure"; notice: StatusEvidenceNotice }
	| ({
			status: "success";
			index: Index;
			selectedIndex: number;
			notice?: StatusEvidenceNotice;
	  } & Extra);

export type AuditExportIndexRefreshTransition =
	StatusEvidenceIndexRefreshTransition<
		ConsoleAuditExportIndex,
		RecoveredStatusEvidenceIndex
	>;

export type AuditExportArchiveIndexRefreshTransition =
	StatusEvidenceIndexRefreshTransition<
		ConsoleAuditExportIndex,
		{
			interfaceConfirmationAuditArchiveExports: ConsoleAuditExportPlan[];
			selectedInterfaceIndex: number;
		}
	>;

export type StatusEvidenceOpenTransition =
	| { kind: "notice"; notice: StatusEvidenceNotice }
	| {
			kind: "open";
			selectedIndex: number;
			plan: FileOpenPlan;
			notice: StatusEvidenceNotice;
	  };

export type StatusEvidenceActionTransition =
	| { kind: "notice"; notice: StatusEvidenceNotice }
	| {
			kind: "archive";
			selectedIndex: number;
			baseDir: string;
			path: string;
			notice: StatusEvidenceNotice;
	  }
	| {
			kind: "confirmation";
			selectedIndex: number;
			plan:
				| ConsoleAuditExportArchivePlan
				| ConsoleAuditArchiveRetentionPlan
				| ToolHistoryExportArchivePlan
				| ToolHistoryArchiveRetentionPlan
				| import("./cleanupIndex").CleanupHandoffHistoryExportArchivePlan;
			notice: StatusEvidenceNotice;
			scope?: "audit" | "interface" | "tools" | "cleanup";
	  };

export type AuditEvidenceArchiveConfirmationTransition =
	| { kind: "notice"; notice: StatusEvidenceNotice }
	| { kind: "execute"; plan: ConsoleAuditExportArchivePlan };

export type AuditEvidenceRetentionConfirmationTransition =
	| { kind: "notice"; notice: StatusEvidenceNotice }
	| { kind: "execute"; plan: ConsoleAuditArchiveRetentionPlan };

type EvidenceEntry = {
	kind: StatusEvidenceKind;
	label: string;
	path: string;
	origin?: FileOpenOrigin;
	controls: string;
	state?: "active" | "archived";
};

export function nextInterfaceEvidenceStateFilter(
	filter: InterfaceEvidenceStateFilter,
): InterfaceEvidenceStateFilter {
	const filters: InterfaceEvidenceStateFilter[] = ["all", "active", "archived"];
	return filters[(filters.indexOf(filter) + 1) % filters.length] ?? "all";
}

export function filterInterfaceConfirmationEvidenceExports(
	active: ConsoleAuditExportPlan[],
	archived: ConsoleAuditExportPlan[],
	stateFilter: InterfaceEvidenceStateFilter = "all",
	query = "",
): InterfaceEvidenceExport[] {
	const normalizedQuery = normalizeInterfaceEvidenceQuery(query);
	const tokens = normalizedQuery.split(" ").filter(Boolean);
	return [
		...active.map((plan) => ({ plan, state: "active" as const })),
		...archived.map((plan) => ({ plan, state: "archived" as const })),
	].filter((item) => {
		if (stateFilter !== "all" && item.state !== stateFilter) {
			return false;
		}
		const haystack = normalizeInterfaceEvidenceQuery(
			[
				item.plan.path,
				item.plan.query,
				item.plan.scope,
				item.plan.eventCount,
				item.state,
			]
				.filter((value) => value !== undefined)
				.join(" "),
		);
		return tokens.every((token) => haystack.includes(token));
	});
}

export function formatInterfaceEvidenceFilterRows(
	active: ConsoleAuditExportPlan[],
	archived: ConsoleAuditExportPlan[],
	stateFilter: InterfaceEvidenceStateFilter,
	query: string,
	presets: string[] = [],
): string[] {
	const normalizedQuery = normalizeInterfaceEvidenceQuery(query);
	const visible = filterInterfaceConfirmationEvidenceExports(
		active,
		archived,
		stateFilter,
		normalizedQuery,
	).length;
	const total = active.length + archived.length;
	const nextPreset = nextInterfaceEvidenceSearchPreset(
		presets,
		normalizedQuery,
	);
	return [
		`INTERFACE EVIDENCE FILTER state=${stateFilter} query=${normalizedQuery || "-"} visible=${visible}/${total}`,
		"controls=q state f find G timeline [/] select",
		`presets=${presets.length} next=${nextPreset ?? "-"} controls=P save N cycle`,
	];
}

export function classifyHandoffIndexRefresh(input: {
	currentRequestToken: number;
	requestToken: number;
	selectedIndex: number;
	announce?: boolean;
	outcome:
		| { status: "success"; index: HandoffIndex }
		| { status: "failure"; error: unknown };
}): StatusEvidenceIndexRefreshTransition<HandoffIndex> {
	return classifyStatusEvidenceIndexRefresh({
		...input,
		failurePrefix: "handoff index failed",
		successMessage: (index) => `handoffs indexed ${index.items.length}`,
	});
}

export function classifyAuditExportIndexRefresh(input: {
	currentRequestToken: number;
	requestToken: number;
	selectedIndex: number;
	announce?: boolean;
	timelineSourceFilter?: TimelineEvidenceTrailSourceFilter;
	interfaceConfirmationAuditArchiveExports?: ConsoleAuditExportPlan[];
	interfaceStateFilter?: InterfaceEvidenceStateFilter;
	interfaceQuery?: string;
	recoveredSelections?: {
		timeline: number;
		process: number;
		remoteKnownHosts: number;
		interface: number;
	};
	outcome:
		| { status: "success"; index: ConsoleAuditExportIndex }
		| { status: "failure"; error: unknown };
}): AuditExportIndexRefreshTransition {
	if (input.outcome.status === "failure") {
		return classifyStatusEvidenceFailure(
			input.currentRequestToken,
			input.requestToken,
			"audit export index failed",
			input.outcome.error,
		);
	}
	if (
		isStaleStatusEvidenceRefresh(input.currentRequestToken, input.requestToken)
	) {
		return { status: "stale" };
	}
	const recoveredSelections = input.recoveredSelections ?? {
		timeline: 0,
		process: 0,
		remoteKnownHosts: 0,
		interface: 0,
	};
	const recovered = createRecoveredStatusEvidenceIndex(input.outcome.index, {
		timelineSourceFilter: input.timelineSourceFilter ?? "all",
		selectedTimelineIndex: recoveredSelections.timeline,
		selectedProcessIndex: recoveredSelections.process,
		selectedRemoteKnownHostsIndex: recoveredSelections.remoteKnownHosts,
		selectedInterfaceIndex: recoveredSelections.interface,
	});
	const visibleInterfaceExports = filterInterfaceConfirmationEvidenceExports(
		recovered.interfaceConfirmationAuditExports,
		input.interfaceConfirmationAuditArchiveExports ?? [],
		input.interfaceStateFilter ?? "all",
		input.interfaceQuery ?? "",
	);
	return {
		status: "success",
		index: input.outcome.index,
		selectedIndex: clampIndex(
			input.selectedIndex,
			input.outcome.index.items.length,
		),
		...recovered,
		selectedInterfaceIndex: clampIndex(
			recoveredSelections.interface,
			visibleInterfaceExports.length,
		),
		...(input.announce
			? {
					notice: {
						level: "info" as const,
						message: `audit exports indexed ${input.outcome.index.items.length}`,
					},
				}
			: {}),
	};
}

export function classifyAuditExportArchiveIndexRefresh(input: {
	currentRequestToken: number;
	requestToken: number;
	selectedIndex: number;
	selectedInterfaceIndex?: number;
	interfaceConfirmationAuditExports?: ConsoleAuditExportPlan[];
	interfaceStateFilter?: InterfaceEvidenceStateFilter;
	interfaceQuery?: string;
	announce?: boolean;
	outcome:
		| { status: "success"; index: ConsoleAuditExportIndex }
		| { status: "failure"; error: unknown };
}): AuditExportArchiveIndexRefreshTransition {
	if (input.outcome.status === "failure") {
		return classifyStatusEvidenceFailure(
			input.currentRequestToken,
			input.requestToken,
			"audit archive index failed",
			input.outcome.error,
		);
	}
	if (
		isStaleStatusEvidenceRefresh(input.currentRequestToken, input.requestToken)
	) {
		return { status: "stale" };
	}
	const interfaceConfirmationAuditArchiveExports =
		createRecoveredStatusEvidenceIndex(input.outcome.index, {
			timelineSourceFilter: "all",
			selectedTimelineIndex: 0,
			selectedProcessIndex: 0,
			selectedRemoteKnownHostsIndex: 0,
			selectedInterfaceIndex: input.selectedInterfaceIndex ?? 0,
		}).interfaceConfirmationAuditExports;
	const visibleInterfaceExports = filterInterfaceConfirmationEvidenceExports(
		input.interfaceConfirmationAuditExports ?? [],
		interfaceConfirmationAuditArchiveExports,
		input.interfaceStateFilter ?? "all",
		input.interfaceQuery ?? "",
	);
	return {
		status: "success",
		index: input.outcome.index,
		selectedIndex: clampIndex(
			input.selectedIndex,
			input.outcome.index.items.length,
		),
		interfaceConfirmationAuditArchiveExports,
		selectedInterfaceIndex: clampIndex(
			input.selectedInterfaceIndex ?? 0,
			visibleInterfaceExports.length,
		),
		...(input.announce
			? {
					notice: {
						level: "info" as const,
						message: `audit archive indexed ${input.outcome.index.items.length}`,
					},
				}
			: {}),
	};
}

export function prepareStatusEvidenceOpenTransition(input: {
	indexes: StatusEvidenceIndexes;
	selection: StatusEvidenceSelection;
	kind: StatusEvidenceKind;
	baseDir: string;
	platform: SupportedPlatform;
	fallbackOrigin?: FileOpenOrigin;
}): StatusEvidenceOpenTransition {
	const family = collectStatusEvidenceFamilyEntries(
		input.indexes,
		input.selection,
		input.kind,
	);
	const selectedIndex = clampIndex(family.selectedIndex, family.entries.length);
	const entry = family.entries[selectedIndex];
	if (!entry || input.kind === "cleanup-archive") {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: getMissingStatusEvidenceOpenMessage(input.kind),
			},
		};
	}
	const label = getStatusEvidenceOpenLabel(input.kind, entry);
	return {
		kind: "open",
		selectedIndex,
		plan: buildFileOpenPlan({
			baseDir: input.baseDir,
			source:
				input.kind === "handoff"
					? (input.indexes.handoffIndex.items[selectedIndex]?.source ??
						"route-handoff")
					: input.kind === "cleanup"
						? "cleanup-export"
						: input.kind === "tools" || input.kind === "tools-archive"
							? "tools-export"
							: "timeline-export",
			label,
			origin: entry.origin ?? input.fallbackOrigin,
			path: entry.path,
			platform: input.platform,
		}),
		notice: {
			level: "info",
			message: getStatusEvidenceOpenNoticeMessage(
				input.indexes,
				input.selection,
				input.kind,
				selectedIndex,
				entry,
			),
		},
	};
}

export function prepareStatusEvidenceActionTransition(input: {
	indexes: StatusEvidenceIndexes;
	selection: StatusEvidenceSelection;
	kind: StatusEvidenceKind;
	intent: StatusEvidenceSecondaryIntent;
	baseDir: string;
	retentionLimit?: number;
}): StatusEvidenceActionTransition {
	const family = collectStatusEvidenceFamilyEntries(
		input.indexes,
		input.selection,
		input.kind,
	);
	const selectedIndex = clampIndex(family.selectedIndex, family.entries.length);
	const entry = family.entries[selectedIndex];
	const action = createStatusEvidenceActionPlan(
		input.indexes,
		input.selection,
		input.kind,
		input.intent,
	);
	if (!entry || !action) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: getUnavailableStatusEvidenceActionMessage(
					input.kind,
					input.intent,
				),
			},
		};
	}

	if (action.action === "archive-handoff") {
		return {
			kind: "archive",
			selectedIndex,
			baseDir: input.indexes.handoffIndex.baseDir,
			path: entry.path,
			notice: {
				level: "info",
				message: `handoff archive prepared for ${entry.label}`,
			},
		};
	}
	if (action.action === "archive-cleanup") {
		const prepared = prepareSelectedCleanupExportArchive(
			input.indexes.cleanupExportIndex,
			input.selection.selectedCleanupExportIndex,
		);
		return prepared.kind === "notice"
			? prepared
			: {
					kind: "confirmation",
					selectedIndex: prepared.selectedIndex,
					plan: prepared.plan,
					notice: prepared.notice,
					scope: "cleanup",
				};
	}
	if (action.action === "archive-tools") {
		const prepared = prepareSelectedToolHistoryExportArchive({
			baseDir: input.baseDir,
			index: getToolExportIndex(input.indexes),
			selectedIndex: getSelectedToolExportIndex(input.selection),
			filter: getToolExportFilter(input.selection),
			query: getToolExportQuery(input.selection),
		});
		return prepared.kind === "notice"
			? prepared
			: {
					kind: "confirmation",
					selectedIndex: prepared.selectedIndex,
					plan: prepared.plan,
					notice: prepared.notice,
					scope: "tools",
				};
	}
	if (
		action.action === "archive-audit" ||
		action.action === "archive-interface-evidence"
	) {
		const plan = createConsoleAuditExportArchivePlan(input.baseDir, entry.path);
		const scope =
			action.action === "archive-interface-evidence" ? "interface" : "audit";
		return {
			kind: "confirmation",
			selectedIndex,
			plan,
			scope,
			notice: {
				level: "info",
				message: `${scope === "interface" ? "interface evidence" : "audit export"} archive confirmation opened for ${plan.fileName}`,
			},
		};
	}

	if (action.action === "preview-tools-retention") {
		const plan = createToolHistoryArchiveRetentionPlan(
			getToolExportArchiveIndex(input.indexes),
			{ maxItems: input.retentionLimit },
		);
		return {
			kind: "confirmation",
			selectedIndex,
			plan,
			scope: "tools",
			notice: {
				level: plan.candidateItems.length > 0 ? "warn" : "info",
				message: `tools archive retention candidates=${plan.candidateItems.length} max=${plan.maxItems}`,
			},
		};
	}
	const interfaceRetention = action.action === "preview-interface-retention";
	const retentionIndex = interfaceRetention
		? filterInterfaceConfirmationAuditExportIndex(
				input.indexes.auditExportArchiveIndex,
			)
		: input.indexes.auditExportArchiveIndex;
	const plan = createConsoleAuditArchiveRetentionPlan(retentionIndex, {
		maxItems: input.retentionLimit,
	});
	return {
		kind: "confirmation",
		selectedIndex,
		plan,
		scope: interfaceRetention ? "interface" : "audit",
		notice: {
			level: plan.candidateItems.length > 0 ? "warn" : "info",
			message: `${interfaceRetention ? "interface evidence" : "audit"} archive retention candidates=${plan.candidateItems.length} max=${plan.maxItems}`,
		},
	};
}

export function prepareAuditEvidenceArchiveConfirmation(
	preview: ConsoleAuditExportArchivePlan | undefined,
	baseDir: string,
	confirmation: string,
): AuditEvidenceArchiveConfirmationTransition {
	if (!preview) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "audit export archive missing preview",
			},
		};
	}
	return {
		kind: "execute",
		plan: createConsoleAuditExportArchivePlan(baseDir, preview.sourcePath, {
			confirmation,
		}),
	};
}

export function prepareAuditEvidenceRetentionConfirmation(
	preview: ConsoleAuditArchiveRetentionPlan | undefined,
	index: ConsoleAuditExportIndex,
	confirmation: string,
): AuditEvidenceRetentionConfirmationTransition {
	if (!preview) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "audit archive retention missing preview",
			},
		};
	}
	return {
		kind: "execute",
		plan: createConsoleAuditArchiveRetentionPlan(index, {
			maxItems: preview.maxItems,
			confirmation,
		}),
	};
}

export function formatStatusEvidenceDetailRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	visibleRows = 14,
	activeKind?: StatusEvidenceKind,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection);
	const activeEntry = getActiveStatusEvidenceEntry(entries, activeKind);
	const rows =
		entries.length === 0
			? [
					"STATUS EVIDENCE selected=0",
					"no selected evidence; refresh Status indexes first",
				]
			: [
					`STATUS EVIDENCE selected=${entries.length}`,
					...entries.flatMap((entry) => [
						`${entry.kind === activeEntry?.kind ? ">" : " "} ${entry.label} ${formatEvidenceOrigin(entry.origin)}`,
						`  path=${entry.path}`,
						`  controls=${entry.controls}`,
					]),
				];

	return rows.slice(0, Math.max(1, visibleRows));
}

export function formatStatusEvidenceIndexRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection);
	if (entries.length === 0) {
		return ["EVIDENCE INDEX 0", "no indexed evidence families"];
	}
	const activeEntry = getActiveStatusEvidenceEntry(entries, activeKind);
	return [
		`EVIDENCE INDEX 1..${Math.min(entries.length, 9)}`,
		...entries.slice(0, 9).map((entry, index) => {
			const shortcut = String(index + 1);
			const cursor = entry.kind === activeEntry?.kind ? ">" : "";
			return `${cursor}${shortcut} ${entry.label}`;
		}),
	];
}

export function formatStatusEvidenceSummaryRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const activeEntry = getActiveStatusEvidenceEntry(
		collectStatusEvidenceEntries(indexes, selection),
		activeKind,
	);
	const effectiveActiveKind = activeEntry?.kind ?? activeKind;
	const rows = STATUS_EVIDENCE_KIND_ORDER.map((kind) =>
		createStatusEvidenceSummaryRow(
			indexes,
			selection,
			effectiveActiveKind,
			kind,
		),
	).filter((row): row is string => Boolean(row));
	const fileCount = STATUS_EVIDENCE_KIND_ORDER.reduce(
		(count, kind) =>
			count +
			collectStatusEvidenceFamilyEntries(indexes, selection, kind).entries
				.length,
		0,
	);
	if (rows.length === 0) {
		return [
			"STATUS EVIDENCE SUMMARY active=none families=0 files=0",
			"no indexed evidence families",
		];
	}
	return [
		`STATUS EVIDENCE SUMMARY active=${activeEntry?.kind ?? "none"} families=${rows.length} files=${fileCount}`,
		...rows,
	];
}

export function formatStatusEvidenceLegacyBridgeRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const activeEntry = getActiveStatusEvidenceEntry(
		collectStatusEvidenceEntries(indexes, selection),
		activeKind,
	);
	const effectiveActiveKind = activeEntry?.kind ?? activeKind;
	const rows = STATUS_EVIDENCE_KIND_ORDER.map((kind) =>
		createStatusEvidenceLegacyBridgeRow(
			indexes,
			selection,
			effectiveActiveKind,
			kind,
		),
	).filter((row): row is string => Boolean(row));
	const fileCount = STATUS_EVIDENCE_KIND_ORDER.reduce(
		(count, kind) =>
			count +
			collectStatusEvidenceFamilyEntries(indexes, selection, kind).entries
				.length,
		0,
	);
	if (rows.length === 0) {
		return [
			"LEGACY EVIDENCE BRIDGE active=none families=0 files=0",
			"shortcuts still available after indexes refresh: H/T/U/Y/B",
		];
	}
	return [
		`LEGACY EVIDENCE BRIDGE active=${activeEntry?.kind ?? "none"} families=${rows.length} files=${fileCount}`,
		...rows,
	];
}

export function formatStatusEvidenceTableRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection).slice(0, 9);
	if (entries.length === 0) {
		return [
			"STATUS EVIDENCE TABLE 0 active=none",
			"no indexed evidence families",
		];
	}
	const activeEntry = getActiveStatusEvidenceEntry(entries, activeKind);
	return [
		`STATUS EVIDENCE TABLE 1..${entries.length} active=${activeEntry?.kind ?? "none"}`,
		...entries.map((entry, index) => {
			const family = collectStatusEvidenceFamilyEntries(
				indexes,
				selection,
				entry.kind,
			);
			const selectedIndex = clampEvidenceSelectionIndex(
				family.selectedIndex,
				family.entries.length,
			);
			const enterAction = getStatusEvidenceEnterAction(entry.kind);
			const archiveAction = getStatusEvidenceSecondaryAction(
				entry.kind,
				"archive",
				entry.state,
			);
			const retentionAction = getStatusEvidenceSecondaryAction(
				entry.kind,
				"retention",
				entry.state,
			);
			const searchAction = getStatusEvidenceSearchAction(entry.kind);
			const itemMovement = family.entries.length > 1 ? "[/]" : "-";
			const cursor = entry.kind === activeEntry?.kind ? ">" : " ";
			const shortcut = String(index + 1);
			return `${cursor}${shortcut} ${entry.kind.padEnd(
				15,
			)}item=${selectedIndex + 1}/${family.entries.length} open=enter/${
				enterAction.shortcut
			} archive=${
				archiveAction ? `a/${archiveAction.shortcut}` : "-"
			} retention=${
				retentionAction ? `m/${retentionAction.shortcut}` : "-"
			} search=${searchAction?.shortcut ?? "-"} itemMove=${itemMovement} ${entry.label}`;
		}),
	];
}

export function formatStatusEvidenceTableDetailRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection);
	const activeEntry = getActiveStatusEvidenceEntry(entries, activeKind);
	if (!activeEntry) {
		return [
			"TABLE DETAIL active=none item=0/0",
			"no selected evidence; refresh Status indexes first",
		];
	}
	const family = collectStatusEvidenceFamilyEntries(
		indexes,
		selection,
		activeEntry.kind,
	);
	const selectedIndex = clampEvidenceSelectionIndex(
		family.selectedIndex,
		family.entries.length,
	);
	return [
		`TABLE DETAIL active=${activeEntry.kind} item=${selectedIndex + 1}/${family.entries.length}`,
		`label=${activeEntry.label}`,
		formatEvidenceOrigin(activeEntry.origin),
		`path=${activeEntry.path}`,
		`controls=${activeEntry.controls}`,
	];
}

export function formatStatusEvidenceCommandStripRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection);
	const activeEntry = getActiveStatusEvidenceEntry(entries, activeKind);
	if (!activeEntry) {
		return [
			"COMMAND STRIP active=none",
			"> enter=cleanup-shelf archive=- retention=- item=-",
			"target=no selected evidence",
		];
	}
	const enterAction = getStatusEvidenceEnterAction(activeEntry.kind);
	const archiveAction = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		"archive",
		activeEntry.state,
	);
	const retentionAction = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		"retention",
		activeEntry.state,
	);
	const searchAction = getStatusEvidenceSearchAction(activeEntry.kind);
	const itemMovement =
		collectStatusEvidenceFamilyEntries(indexes, selection, activeEntry.kind)
			.entries.length > 1
			? "[/]"
			: "-";
	return [
		`COMMAND STRIP active=${activeEntry.kind}`,
		`> enter=${formatCommandStripAction("open", enterAction.shortcut)} archive=${
			archiveAction
				? formatCommandStripAction("a", archiveAction.shortcut)
				: "-"
		} retention=${
			retentionAction
				? formatCommandStripAction("m", retentionAction.shortcut)
				: "-"
		} search=${searchAction?.shortcut ?? "-"} item=${itemMovement}`,
		`target=${activeEntry.label}`,
	];
}

export function createStatusEvidenceNumberJumpPlan(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	shortcut: string,
): StatusEvidenceNumberJumpPlan | undefined {
	if (!/^[1-9]$/.test(shortcut)) {
		return undefined;
	}
	const entries = collectStatusEvidenceEntries(indexes, selection).slice(0, 9);
	const entry = entries[Number(shortcut) - 1];
	if (!entry) {
		return undefined;
	}
	return {
		kind: entry.kind,
		shortcut,
		label: entry.label,
	};
}

export function moveStatusEvidenceFocus(
	indexes: StatusEvidenceIndexes,
	currentKind: StatusEvidenceKind,
	direction: "next" | "previous",
): StatusEvidenceKind {
	const availableKinds = collectStatusEvidenceEntries(indexes, {
		selectedHandoffIndex: 0,
		selectedAuditExportIndex: 0,
		selectedAuditExportArchiveIndex: 0,
		selectedCleanupExportIndex: 0,
		selectedCleanupExportArchiveIndex: 0,
	}).map((entry) => entry.kind);
	if (availableKinds.length === 0) {
		return currentKind;
	}
	const currentIndex = availableKinds.indexOf(currentKind);
	if (currentIndex < 0) {
		return direction === "next"
			? (availableKinds[0] ?? currentKind)
			: (availableKinds.at(-1) ?? currentKind);
	}
	const baseIndex = currentIndex;
	const offset = direction === "next" ? 1 : -1;
	const nextIndex =
		(baseIndex + offset + availableKinds.length) % availableKinds.length;
	return availableKinds[nextIndex] ?? currentKind;
}

export function createStatusEvidenceEnterPlan(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): StatusEvidenceEnterPlan | undefined {
	const activeEntry = getActiveStatusEvidenceEntry(
		collectStatusEvidenceEntries(indexes, selection),
		activeKind,
	);
	if (!activeEntry) {
		return undefined;
	}
	const action = getStatusEvidenceEnterAction(activeEntry.kind);
	return {
		kind: activeEntry.kind,
		action: action.action,
		shortcut: action.shortcut,
		label: activeEntry.label,
		path: activeEntry.path,
	};
}

export function createStatusEvidenceActionPlan(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
	intent: StatusEvidenceSecondaryIntent,
): StatusEvidenceActionPlan | undefined {
	const activeEntry = getActiveStatusEvidenceEntry(
		collectStatusEvidenceEntries(indexes, selection),
		activeKind,
	);
	if (!activeEntry) {
		return undefined;
	}
	const action = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		intent,
		activeEntry.state,
	);
	if (!action) {
		return undefined;
	}
	return {
		kind: activeEntry.kind,
		action: action.action,
		shortcut: action.shortcut,
		label: activeEntry.label,
		path: activeEntry.path,
	};
}

export function createStatusEvidenceSearchPlan(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
): StatusEvidenceSearchPlan | undefined {
	const activeEntry = getActiveStatusEvidenceEntry(
		collectStatusEvidenceEntries(indexes, selection),
		activeKind,
	);
	if (
		activeEntry?.kind !== "process" &&
		activeEntry?.kind !== "remote-known-hosts" &&
		activeEntry?.kind !== "interface"
	) {
		return undefined;
	}
	const action = getStatusEvidenceSearchAction(activeEntry.kind);
	const exportPlan =
		activeEntry.kind === "process"
			? getSelectedProcessControlAuditExport(
					getProcessControlAuditExports(indexes),
					getSelectedProcessControlAuditExportIndex(selection),
				)
			: activeEntry.kind === "remote-known-hosts"
				? getSelectedProcessControlAuditExport(
						getRemoteKnownHostsSelectionAuditExports(indexes),
						getSelectedRemoteKnownHostsSelectionAuditExportIndex(selection),
					)
				: getSelectedInterfaceConfirmationEvidenceExport(indexes, selection)
						?.plan;
	if (!action || !exportPlan?.query) {
		return undefined;
	}
	return {
		kind: activeEntry.kind,
		action: action.action,
		shortcut: action.shortcut,
		label: activeEntry.label,
		path: activeEntry.path,
		query: exportPlan.query,
	};
}

export function createStatusEvidenceItemMovePlan(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
	direction: StatusEvidenceItemMoveDirection,
): StatusEvidenceItemMovePlan | undefined {
	const family = collectStatusEvidenceFamilyEntries(
		indexes,
		selection,
		activeKind,
	);
	if (family.entries.length <= 1) {
		return undefined;
	}
	const offset = direction === "next" ? 1 : -1;
	const baseIndex = clampIndex(family.selectedIndex, family.entries.length);
	const selectedIndex =
		(baseIndex + offset + family.entries.length) % family.entries.length;
	const entry = family.entries[selectedIndex];
	if (!entry) {
		return undefined;
	}
	return {
		kind: activeKind,
		direction,
		shortcut: direction === "next" ? "]" : "[",
		selectedIndex,
		itemCount: family.entries.length,
		label: entry.label,
	};
}

function collectStatusEvidenceEntries(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
): EvidenceEntry[] {
	return [
		formatHandoffEvidence(
			getSelectedHandoffIndexItem(
				indexes.handoffIndex,
				selection.selectedHandoffIndex,
			),
		),
		formatAuditEvidence(
			getSelectedConsoleAuditExport(
				indexes.auditExportIndex,
				selection.selectedAuditExportIndex,
			),
			"audit",
			"enter=open open W archive Z/a retention=-",
		),
		formatAuditEvidence(
			getSelectedConsoleAuditExport(
				indexes.auditExportArchiveIndex,
				selection.selectedAuditExportArchiveIndex,
			),
			"audit-archive",
			"enter=open open J archive=archived retention=M/m",
		),
		formatCleanupEvidence(
			getSelectedCleanupHandoffHistoryExport(
				indexes.cleanupExportIndex,
				selection.selectedCleanupExportIndex,
			),
			"cleanup",
			"enter=open open V archive X/x retention=-",
		),
		formatCleanupEvidence(
			getSelectedCleanupHandoffHistoryExportArchive(
				indexes.cleanupExportArchiveIndex,
				selection.selectedCleanupExportArchiveIndex,
			),
			"cleanup-archive",
			"enter=select open=- archive=archived retention=-",
		),
		formatToolsEvidence(
			getSelectedToolHistoryExport(
				getToolExportIndex(indexes),
				getSelectedToolExportIndex(selection),
				getToolExportFilter(selection),
				getToolExportQuery(selection),
			),
			"tools",
			"enter=open open K archive D/a retention=-",
		),
		formatToolsEvidence(
			getSelectedToolHistoryExport(
				getToolExportArchiveIndex(indexes),
				getSelectedToolExportArchiveIndex(selection),
				getToolExportArchiveFilter(selection),
				getToolExportArchiveQuery(selection),
			),
			"tools-archive",
			"enter=open open K archive=archived retention=M/m",
		),
		formatProcessEvidence(
			getSelectedProcessControlAuditExport(
				getProcessControlAuditExports(indexes),
				getSelectedProcessControlAuditExportIndex(selection),
			),
		),
		formatRemoteKnownHostsEvidence(
			getSelectedProcessControlAuditExport(
				getRemoteKnownHostsSelectionAuditExports(indexes),
				getSelectedRemoteKnownHostsSelectionAuditExportIndex(selection),
			),
		),
		formatSelectedInterfaceEvidence(indexes, selection),
	].filter((entry): entry is EvidenceEntry => Boolean(entry));
}

function collectStatusEvidenceFamilyEntries(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	kind: StatusEvidenceKind,
): { entries: EvidenceEntry[]; selectedIndex: number } {
	switch (kind) {
		case "handoff":
			return {
				entries: indexes.handoffIndex.items
					.map(formatHandoffEvidence)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: selection.selectedHandoffIndex,
			};
		case "audit":
			return {
				entries: indexes.auditExportIndex.items
					.map((item) =>
						formatAuditEvidence(
							item,
							"audit",
							"enter=open open W archive Z/a retention=-",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: selection.selectedAuditExportIndex,
			};
		case "audit-archive":
			return {
				entries: indexes.auditExportArchiveIndex.items
					.map((item) =>
						formatAuditEvidence(
							item,
							"audit-archive",
							"enter=open open J archive=archived retention=M/m",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: selection.selectedAuditExportArchiveIndex,
			};
		case "cleanup":
			return {
				entries: indexes.cleanupExportIndex.items
					.map((item) =>
						formatCleanupEvidence(
							item,
							"cleanup",
							"enter=open open V archive X/x retention=-",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: selection.selectedCleanupExportIndex,
			};
		case "cleanup-archive":
			return {
				entries: indexes.cleanupExportArchiveIndex.items
					.map((item) =>
						formatCleanupEvidence(
							item,
							"cleanup-archive",
							"enter=select open=- archive=archived retention=-",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: selection.selectedCleanupExportArchiveIndex,
			};
		case "tools":
			return {
				entries: filterToolHistoryExportIndex(
					getToolExportIndex(indexes),
					getToolExportFilter(selection),
					getToolExportQuery(selection),
				)
					.items.map((item) =>
						formatToolsEvidence(
							item,
							"tools",
							"enter=open open K archive D/a retention=-",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: getSelectedToolExportIndex(selection),
			};
		case "tools-archive":
			return {
				entries: filterToolHistoryExportIndex(
					getToolExportArchiveIndex(indexes),
					getToolExportArchiveFilter(selection),
					getToolExportArchiveQuery(selection),
				)
					.items.map((item) =>
						formatToolsEvidence(
							item,
							"tools-archive",
							"enter=open open K archive=archived retention=M/m",
						),
					)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: getSelectedToolExportArchiveIndex(selection),
			};
		case "process":
			return {
				entries: getProcessControlAuditExports(indexes)
					.map(formatProcessEvidence)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: getSelectedProcessControlAuditExportIndex(selection),
			};
		case "remote-known-hosts":
			return {
				entries: getRemoteKnownHostsSelectionAuditExports(indexes)
					.map(formatRemoteKnownHostsEvidence)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex:
					getSelectedRemoteKnownHostsSelectionAuditExportIndex(selection),
			};
		case "interface":
			return {
				entries: getInterfaceConfirmationEvidenceExports(indexes, selection)
					.map(({ plan, state }) => formatInterfaceEvidence(plan, state))
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex:
					getSelectedInterfaceConfirmationAuditExportIndex(selection),
			};
	}
}

const STATUS_EVIDENCE_KIND_ORDER: StatusEvidenceKind[] = [
	"handoff",
	"audit",
	"audit-archive",
	"cleanup",
	"cleanup-archive",
	"tools",
	"tools-archive",
	"process",
	"remote-known-hosts",
	"interface",
];

function createStatusEvidenceSummaryRow(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
	kind: StatusEvidenceKind,
): string | undefined {
	const family = collectStatusEvidenceFamilyEntries(indexes, selection, kind);
	if (family.entries.length === 0) {
		return undefined;
	}
	const selectedIndex = clampEvidenceSelectionIndex(
		family.selectedIndex,
		family.entries.length,
	);
	const enterAction = getStatusEvidenceEnterAction(kind);
	const selectedEntry = family.entries[selectedIndex];
	const archiveAction = getStatusEvidenceSecondaryAction(
		kind,
		"archive",
		selectedEntry?.state,
	);
	const retentionAction = getStatusEvidenceSecondaryAction(
		kind,
		"retention",
		selectedEntry?.state,
	);
	const searchAction = getStatusEvidenceSearchAction(kind);
	const cursor = kind === activeKind ? ">" : " ";
	const movement = family.entries.length > 1 ? "[/]" : "-";
	return `${cursor} ${kind.padEnd(15)} selected=${selectedIndex + 1}/${
		family.entries.length
	} open=enter/${enterAction.shortcut} archive=${
		archiveAction ? `a/${archiveAction.shortcut}` : "-"
	} retention=${
		retentionAction ? `m/${retentionAction.shortcut}` : "-"
	} search=${searchAction?.shortcut ?? "-"} move=${movement}`;
}

function createStatusEvidenceLegacyBridgeRow(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	activeKind: StatusEvidenceKind,
	kind: StatusEvidenceKind,
): string | undefined {
	const family = collectStatusEvidenceFamilyEntries(indexes, selection, kind);
	if (family.entries.length === 0) {
		return undefined;
	}
	const selectedIndex = clampEvidenceSelectionIndex(
		family.selectedIndex,
		family.entries.length,
	);
	const shortcuts = getStatusEvidenceLegacyShortcuts(
		kind,
		family.entries[selectedIndex]?.state,
	);
	const cursor = kind === activeKind ? ">" : " ";
	return `${cursor} ${kind.padEnd(15)} selected=${selectedIndex + 1}/${
		family.entries.length
	} refresh=${shortcuts.refresh} select=${shortcuts.select} open=${
		shortcuts.open
	} archive=${shortcuts.archive} retention=${shortcuts.retention}`;
}

function getStatusEvidenceLegacyShortcuts(
	kind: StatusEvidenceKind,
	state?: "active" | "archived",
): {
	refresh: string;
	select: string;
	open: string;
	archive: string;
	retention: string;
} {
	switch (kind) {
		case "handoff":
			return {
				refresh: "H",
				select: "]",
				open: "O",
				archive: "A",
				retention: "-",
			};
		case "audit":
			return {
				refresh: "T",
				select: ")",
				open: "W",
				archive: "Z",
				retention: "-",
			};
		case "audit-archive":
			return {
				refresh: "U",
				select: "(",
				open: "J",
				archive: "-",
				retention: "M",
			};
		case "cleanup":
			return {
				refresh: "Y",
				select: "}",
				open: "V",
				archive: "X",
				retention: "-",
			};
		case "cleanup-archive":
			return {
				refresh: "B",
				select: "{",
				open: "-",
				archive: "-",
				retention: "-",
			};
		case "tools":
			return {
				refresh: "-",
				select: "]",
				open: "K",
				archive: "D",
				retention: "-",
			};
		case "tools-archive":
			return {
				refresh: "-",
				select: "]",
				open: "K",
				archive: "-",
				retention: "M",
			};
		case "process":
			return {
				refresh: "-",
				select: "F",
				open: "F",
				archive: "-",
				retention: "-",
			};
		case "remote-known-hosts":
			return {
				refresh: "-",
				select: "R",
				open: "R",
				archive: "-",
				retention: "-",
			};
		case "interface":
			return {
				refresh: "-",
				select: "I",
				open: "I",
				archive: state === "active" ? "A" : "-",
				retention: state === "archived" ? "M" : "-",
			};
	}
}

function formatHandoffEvidence(
	item: HandoffIndexItem | undefined,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	const handoffKind = item.source === "route-handoff" ? "route" : "endpoint";
	return {
		kind: "handoff",
		label: `handoff ${handoffKind} ${item.kind}/${item.view}`,
		path: item.path,
		origin: item.origin,
		controls: "enter=open open O archive A/a retention=-",
	};
}

function formatAuditEvidence(
	item: ConsoleAuditExportIndexItem | undefined,
	label: "audit" | "audit-archive",
	controls: string,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
		kind: label,
		label: `${label} ${item.scope} events=${item.entryCount}${item.query ? ` query=${item.query}` : ""}`,
		path: item.path,
		origin: item.origin,
		controls,
	};
}

function formatCleanupEvidence(
	item: CleanupHandoffHistoryExportIndexItem | undefined,
	label: "cleanup" | "cleanup-archive",
	controls: string,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
		kind: label,
		label: `${label} ${item.scope} entries=${item.entryCount}`,
		path: item.path,
		origin: item.origin,
		controls,
	};
}

function formatToolsEvidence(
	item: ToolHistoryExportIndexItem | undefined,
	label: "tools" | "tools-archive",
	controls: string,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
		kind: label,
		label: `${label} ${item.scope} runs=${item.runCount}`,
		path: item.path,
		controls,
	};
}

function formatProcessEvidence(
	item: ConsoleAuditExportPlan | undefined,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	const scope = item.scope ?? "selected";
	return {
		kind: "process",
		label: `process ${scope} events=${item.eventCount}${item.query ? ` query=${item.query}` : ""}`,
		path: item.path,
		origin: item.origin,
		controls: "enter=open open F archive=- retention=- search=G",
	};
}

function formatRemoteKnownHostsEvidence(
	item: ConsoleAuditExportPlan | undefined,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	const scope = item.scope ?? "filtered";
	return {
		kind: "remote-known-hosts",
		label: `remote known_hosts ${scope} events=${item.eventCount}${item.query ? ` query=${item.query}` : ""}`,
		path: item.path,
		origin: item.origin,
		controls: "enter=open open R archive=- retention=- search=G",
	};
}

function formatInterfaceEvidence(
	item: ConsoleAuditExportPlan | undefined,
	state: "active" | "archived",
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	const scope = item.scope ?? "selected";
	return {
		kind: "interface",
		label: `interface ${state} ${scope} events=${item.eventCount}${item.query ? ` query=${item.query}` : ""}`,
		path: item.path,
		origin: item.origin,
		controls:
			state === "active"
				? "enter=open open I archive A/a retention=- search=G filter=q find=f"
				: "enter=open open I archive=archived retention=M/m search=G filter=q find=f",
		state,
	};
}

function formatEvidenceOrigin(origin: FileOpenOrigin | undefined): string {
	return origin
		? `source=Config>${origin.label} scope=${origin.scope}`
		: "source=- scope=-";
}

function formatCommandStripAction(primary: string, shortcut: string): string {
	return primary === shortcut ? primary : `${primary}/${shortcut}`;
}

function classifyStatusEvidenceIndexRefresh<
	Index extends { items: unknown[] },
>(input: {
	currentRequestToken: number;
	requestToken: number;
	selectedIndex: number;
	announce?: boolean;
	failurePrefix: string;
	successMessage: (index: Index) => string;
	outcome:
		| { status: "success"; index: Index }
		| { status: "failure"; error: unknown };
}): StatusEvidenceIndexRefreshTransition<Index> {
	if (input.outcome.status === "failure") {
		return classifyStatusEvidenceFailure(
			input.currentRequestToken,
			input.requestToken,
			input.failurePrefix,
			input.outcome.error,
		);
	}
	if (
		isStaleStatusEvidenceRefresh(input.currentRequestToken, input.requestToken)
	) {
		return { status: "stale" };
	}
	return {
		status: "success",
		index: input.outcome.index,
		selectedIndex: clampIndex(
			input.selectedIndex,
			input.outcome.index.items.length,
		),
		...(input.announce
			? {
					notice: {
						level: "info" as const,
						message: input.successMessage(input.outcome.index),
					},
				}
			: {}),
	};
}

function classifyStatusEvidenceFailure(
	currentRequestToken: number,
	requestToken: number,
	prefix: string,
	error: unknown,
): { status: "stale" | "failure"; notice: StatusEvidenceNotice } {
	const notice = {
		level: "fail",
		message: `${prefix} ${formatStatusEvidenceError(error)}`,
	} as const;
	return isStaleStatusEvidenceRefresh(currentRequestToken, requestToken)
		? { status: "stale", notice }
		: { status: "failure", notice };
}

function isStaleStatusEvidenceRefresh(
	currentRequestToken: number,
	requestToken: number,
): boolean {
	return (
		classifyRequestPublication(currentRequestToken, requestToken) === "stale"
	);
}

function formatStatusEvidenceError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getMissingStatusEvidenceOpenMessage(kind: StatusEvidenceKind): string {
	switch (kind) {
		case "handoff":
			return "no handoff file selected";
		case "audit":
			return "no audit export selected";
		case "audit-archive":
			return "no archived audit export selected";
		case "cleanup":
			return "no cleanup export selected";
		case "cleanup-archive":
			return "cleanup archive evidence cannot be opened externally";
		case "tools":
			return "no tools evidence export selected";
		case "tools-archive":
			return "no archived tools evidence export selected";
		case "process":
			return "no process control evidence export to open";
		case "remote-known-hosts":
			return "no remote known_hosts selection evidence export to open";
		case "interface":
			return "no interface confirmation evidence export to open";
	}
}

function getStatusEvidenceOpenLabel(
	kind: StatusEvidenceKind,
	entry: EvidenceEntry,
): string {
	switch (kind) {
		case "handoff":
			return entry.label.replace(/^handoff (route|endpoint) /, "");
		case "audit":
			return entry.label.replace(/^audit /, "audit export ");
		case "audit-archive":
			return entry.label.replace(/^audit-archive /, "archived audit export ");
		case "cleanup":
			return entry.label.replace(/^cleanup /, "cleanup export ");
		case "tools":
			return entry.label.replace(/^tools /, "tools export ");
		case "tools-archive":
			return entry.label.replace(/^tools-archive /, "archived tools export ");
		case "process":
			return entry.label.replace(
				/^process /,
				"process control evidence export ",
			);
		case "remote-known-hosts":
			return entry.label.replace(
				/^remote known_hosts /,
				"remote known_hosts selection history export ",
			);
		case "interface":
			return entry.label.replace(
				/^interface /,
				"interface confirmation evidence ",
			);
		case "cleanup-archive":
			return entry.label;
	}
}

function getStatusEvidenceOpenNoticeMessage(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	kind: StatusEvidenceKind,
	selectedIndex: number,
	entry: EvidenceEntry,
): string {
	switch (kind) {
		case "handoff":
			return `file open confirmation opened for ${indexes.handoffIndex.items[selectedIndex]?.label ?? entry.label}`;
		case "audit":
			return `audit export open confirmation opened for ${indexes.auditExportIndex.items[selectedIndex]?.fileName ?? entry.path}`;
		case "audit-archive":
			return `archived audit export open confirmation opened for ${indexes.auditExportArchiveIndex.items[selectedIndex]?.fileName ?? entry.path}`;
		case "cleanup":
			return `cleanup export open confirmation opened for ${indexes.cleanupExportIndex.items[selectedIndex]?.fileName ?? entry.path}`;
		case "tools": {
			const item = getSelectedToolHistoryExport(
				getToolExportIndex(indexes),
				selectedIndex,
				getToolExportFilter(selection),
				getToolExportQuery(selection),
			);
			return `tools evidence open confirmation opened for ${item?.fileName ?? entry.path}`;
		}
		case "tools-archive": {
			const item = getSelectedToolHistoryExport(
				getToolExportArchiveIndex(indexes),
				selectedIndex,
				getToolExportArchiveFilter(selection),
				getToolExportArchiveQuery(selection),
			);
			return `archived tools evidence open confirmation opened for ${item?.fileName ?? entry.path}`;
		}
		case "process":
			return `process control evidence export open confirmation opened for ${entry.path}`;
		case "remote-known-hosts":
			return `remote known_hosts selection evidence export open confirmation opened for ${entry.path}`;
		case "interface":
			return `interface confirmation evidence export open confirmation opened for ${entry.path}`;
		case "cleanup-archive":
			return getMissingStatusEvidenceOpenMessage(kind);
	}
}

function getUnavailableStatusEvidenceActionMessage(
	kind: StatusEvidenceKind,
	intent: StatusEvidenceSecondaryIntent,
): string {
	if (kind === "interface" && intent === "archive") {
		return "no active interface confirmation evidence export to archive";
	}
	return `${kind} evidence ${intent} is unavailable`;
}

function clampEvidenceSelectionIndex(index: number, length: number): number {
	return clampIndex(index, length);
}

function getToolExportIndex(
	indexes: StatusEvidenceIndexes,
): ToolHistoryExportIndex {
	return indexes.toolExportIndex ?? { baseDir: "", items: [] };
}

function getSelectedToolExportIndex(
	selection: StatusEvidenceSelection,
): number {
	return selection.selectedToolExportIndex ?? 0;
}

function getToolExportArchiveIndex(
	indexes: StatusEvidenceIndexes,
): ToolHistoryExportIndex {
	return indexes.toolExportArchiveIndex ?? { baseDir: "", items: [] };
}

function getSelectedToolExportArchiveIndex(
	selection: StatusEvidenceSelection,
): number {
	return selection.selectedToolExportArchiveIndex ?? 0;
}

function getToolExportFilter(
	selection: StatusEvidenceSelection,
): ToolHistoryEvidenceFilter {
	return selection.toolExportFilter ?? "any";
}

function getToolExportArchiveFilter(
	selection: StatusEvidenceSelection,
): ToolHistoryEvidenceFilter {
	return selection.toolExportArchiveFilter ?? "any";
}

function getToolExportQuery(selection: StatusEvidenceSelection): string {
	return selection.toolExportQuery ?? "";
}

function getToolExportArchiveQuery(selection: StatusEvidenceSelection): string {
	return selection.toolExportArchiveQuery ?? "";
}

function getProcessControlAuditExports(
	indexes: StatusEvidenceIndexes,
): ConsoleAuditExportPlan[] {
	return indexes.processControlAuditExports ?? [];
}

function getRemoteKnownHostsSelectionAuditExports(
	indexes: StatusEvidenceIndexes,
): ConsoleAuditExportPlan[] {
	return indexes.remoteKnownHostsSelectionAuditExports ?? [];
}

function getInterfaceConfirmationAuditExports(
	indexes: StatusEvidenceIndexes,
): ConsoleAuditExportPlan[] {
	return indexes.interfaceConfirmationAuditExports ?? [];
}

function getInterfaceConfirmationEvidenceExports(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
): InterfaceEvidenceExport[] {
	return filterInterfaceConfirmationEvidenceExports(
		getInterfaceConfirmationAuditExports(indexes),
		indexes.interfaceConfirmationAuditArchiveExports ?? [],
		selection.interfaceEvidenceStateFilter ?? "all",
		selection.interfaceEvidenceQuery ?? "",
	);
}

function getSelectedInterfaceConfirmationEvidenceExport(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
): InterfaceEvidenceExport | undefined {
	const exports = getInterfaceConfirmationEvidenceExports(indexes, selection);
	if (exports.length === 0) {
		return undefined;
	}
	return exports[
		clampEvidenceSelectionIndex(
			getSelectedInterfaceConfirmationAuditExportIndex(selection),
			exports.length,
		)
	];
}

function formatSelectedInterfaceEvidence(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
): EvidenceEntry | undefined {
	const selected = getSelectedInterfaceConfirmationEvidenceExport(
		indexes,
		selection,
	);
	return selected
		? formatInterfaceEvidence(selected.plan, selected.state)
		: undefined;
}

function getSelectedProcessControlAuditExportIndex(
	selection: StatusEvidenceSelection,
): number {
	return selection.selectedProcessControlAuditExportIndex ?? 0;
}

function getSelectedRemoteKnownHostsSelectionAuditExportIndex(
	selection: StatusEvidenceSelection,
): number {
	return selection.selectedRemoteKnownHostsSelectionAuditExportIndex ?? 0;
}

function getSelectedInterfaceConfirmationAuditExportIndex(
	selection: StatusEvidenceSelection,
): number {
	return selection.selectedInterfaceConfirmationAuditExportIndex ?? 0;
}

function getSelectedProcessControlAuditExport(
	exports: ConsoleAuditExportPlan[],
	selectedIndex: number,
): ConsoleAuditExportPlan | undefined {
	if (exports.length === 0) {
		return undefined;
	}
	return exports[clampEvidenceSelectionIndex(selectedIndex, exports.length)];
}

function getActiveStatusEvidenceEntry(
	entries: EvidenceEntry[],
	activeKind: StatusEvidenceKind | undefined,
): EvidenceEntry | undefined {
	return entries.find((entry) => entry.kind === activeKind) ?? entries.at(0);
}

function getStatusEvidenceEnterAction(kind: StatusEvidenceKind): {
	action: StatusEvidenceEnterAction;
	shortcut: string;
} {
	switch (kind) {
		case "handoff":
			return { action: "open-handoff", shortcut: "O" };
		case "audit":
			return { action: "open-audit", shortcut: "W" };
		case "audit-archive":
			return { action: "open-audit-archive", shortcut: "J" };
		case "cleanup":
			return { action: "open-cleanup", shortcut: "V" };
		case "cleanup-archive":
			return { action: "select-cleanup-archive", shortcut: "{" };
		case "tools":
			return { action: "open-tools", shortcut: "K" };
		case "tools-archive":
			return { action: "open-tools-archive", shortcut: "K" };
		case "process":
			return { action: "open-process-evidence", shortcut: "F" };
		case "remote-known-hosts":
			return {
				action: "open-remote-known-hosts-evidence",
				shortcut: "R",
			};
		case "interface":
			return {
				action: "open-interface-evidence",
				shortcut: "I",
			};
	}
}

function getStatusEvidenceSecondaryAction(
	kind: StatusEvidenceKind,
	intent: StatusEvidenceSecondaryIntent,
	state?: "active" | "archived",
):
	| {
			action: StatusEvidenceSecondaryAction;
			shortcut: string;
	  }
	| undefined {
	if (intent === "retention") {
		if (kind === "audit-archive") {
			return { action: "preview-audit-retention", shortcut: "M" };
		}
		if (kind === "tools-archive") {
			return { action: "preview-tools-retention", shortcut: "M" };
		}
		if (kind === "interface" && state === "archived") {
			return { action: "preview-interface-retention", shortcut: "M" };
		}
		return undefined;
	}
	switch (kind) {
		case "handoff":
			return { action: "archive-handoff", shortcut: "A" };
		case "audit":
			return { action: "archive-audit", shortcut: "Z" };
		case "cleanup":
			return { action: "archive-cleanup", shortcut: "X" };
		case "tools":
			return { action: "archive-tools", shortcut: "D" };
		case "interface":
			return state === "active"
				? { action: "archive-interface-evidence", shortcut: "A" }
				: undefined;
		case "audit-archive":
		case "cleanup-archive":
		case "tools-archive":
		case "process":
		case "remote-known-hosts":
			return undefined;
	}
}

function getStatusEvidenceSearchAction(kind: StatusEvidenceKind):
	| {
			action: StatusEvidenceSearchAction;
			shortcut: string;
	  }
	| undefined {
	if (kind === "process") {
		return { action: "search-process-evidence", shortcut: "G" };
	}
	if (kind === "remote-known-hosts") {
		return {
			action: "search-remote-known-hosts-evidence",
			shortcut: "G",
		};
	}
	if (kind === "interface") {
		return {
			action: "search-interface-evidence",
			shortcut: "G",
		};
	}
	return undefined;
}
