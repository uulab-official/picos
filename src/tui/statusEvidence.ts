import type {
	ConsoleAuditExportIndex,
	ConsoleAuditExportIndexItem,
} from "../core/auditLog";
import { getSelectedConsoleAuditExport } from "../core/auditLog";
import type { FileOpenOrigin } from "../core/fileOpen";
import type { HandoffIndex, HandoffIndexItem } from "../core/handoffIndex";
import { getSelectedHandoffIndexItem } from "../core/handoffIndex";
import type {
	CleanupHandoffHistoryExportIndex,
	CleanupHandoffHistoryExportIndexItem,
} from "./cleanupIndex";
import {
	getSelectedCleanupHandoffHistoryExport,
	getSelectedCleanupHandoffHistoryExportArchive,
} from "./cleanupIndex";

export type StatusEvidenceIndexes = {
	handoffIndex: HandoffIndex;
	auditExportIndex: ConsoleAuditExportIndex;
	auditExportArchiveIndex: ConsoleAuditExportIndex;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
};

export type StatusEvidenceSelection = {
	selectedHandoffIndex: number;
	selectedAuditExportIndex: number;
	selectedAuditExportArchiveIndex: number;
	selectedCleanupExportIndex: number;
	selectedCleanupExportArchiveIndex: number;
};

export type StatusEvidenceKind =
	| "handoff"
	| "audit"
	| "audit-archive"
	| "cleanup"
	| "cleanup-archive";

export type StatusEvidenceEnterAction =
	| "open-handoff"
	| "open-audit"
	| "open-audit-archive"
	| "open-cleanup"
	| "select-cleanup-archive";

export type StatusEvidenceSecondaryIntent = "archive" | "retention";

export type StatusEvidenceSecondaryAction =
	| "archive-handoff"
	| "archive-audit"
	| "archive-cleanup"
	| "preview-audit-retention";

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

export type StatusEvidenceNumberJumpPlan = {
	kind: StatusEvidenceKind;
	shortcut: string;
	label: string;
};

type EvidenceEntry = {
	kind: StatusEvidenceKind;
	label: string;
	path: string;
	origin?: FileOpenOrigin;
	controls: string;
};

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
			"> enter=cleanup-shelf archive=- retention=-",
			"target=no selected evidence",
		];
	}
	const enterAction = getStatusEvidenceEnterAction(activeEntry.kind);
	const archiveAction = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		"archive",
	);
	const retentionAction = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		"retention",
	);
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
		}`,
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
	const action = getStatusEvidenceSecondaryAction(activeEntry.kind, intent);
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
	].filter((entry): entry is EvidenceEntry => Boolean(entry));
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

function formatEvidenceOrigin(origin: FileOpenOrigin | undefined): string {
	return origin
		? `source=Config>${origin.label} scope=${origin.scope}`
		: "source=- scope=-";
}

function formatCommandStripAction(primary: string, shortcut: string): string {
	return primary === shortcut ? primary : `${primary}/${shortcut}`;
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
	}
}

function getStatusEvidenceSecondaryAction(
	kind: StatusEvidenceKind,
	intent: StatusEvidenceSecondaryIntent,
):
	| {
			action: StatusEvidenceSecondaryAction;
			shortcut: string;
	  }
	| undefined {
	if (intent === "retention") {
		return kind === "audit-archive"
			? { action: "preview-audit-retention", shortcut: "M" }
			: undefined;
	}
	switch (kind) {
		case "handoff":
			return { action: "archive-handoff", shortcut: "A" };
		case "audit":
			return { action: "archive-audit", shortcut: "Z" };
		case "cleanup":
			return { action: "archive-cleanup", shortcut: "X" };
		case "audit-archive":
		case "cleanup-archive":
			return undefined;
	}
}
