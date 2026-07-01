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
import type {
	ToolHistoryExportIndex,
	ToolHistoryExportIndexItem,
} from "./toolHistory";
import { getSelectedToolHistoryExport } from "./toolHistory";

export type StatusEvidenceIndexes = {
	handoffIndex: HandoffIndex;
	auditExportIndex: ConsoleAuditExportIndex;
	auditExportArchiveIndex: ConsoleAuditExportIndex;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	toolExportIndex?: ToolHistoryExportIndex;
};

export type StatusEvidenceSelection = {
	selectedHandoffIndex: number;
	selectedAuditExportIndex: number;
	selectedAuditExportArchiveIndex: number;
	selectedCleanupExportIndex: number;
	selectedCleanupExportArchiveIndex: number;
	selectedToolExportIndex?: number;
};

export type StatusEvidenceKind =
	| "handoff"
	| "audit"
	| "audit-archive"
	| "cleanup"
	| "cleanup-archive"
	| "tools";

export type StatusEvidenceEnterAction =
	| "open-handoff"
	| "open-audit"
	| "open-audit-archive"
	| "open-cleanup"
	| "select-cleanup-archive"
	| "open-tools";

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

export type StatusEvidenceItemMoveDirection = "next" | "previous";

export type StatusEvidenceItemMovePlan = {
	kind: StatusEvidenceKind;
	direction: StatusEvidenceItemMoveDirection;
	shortcut: string;
	selectedIndex: number;
	itemCount: number;
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
			);
			const retentionAction = getStatusEvidenceSecondaryAction(
				entry.kind,
				"retention",
			);
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
			} itemMove=${itemMovement} ${entry.label}`;
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
	);
	const retentionAction = getStatusEvidenceSecondaryAction(
		activeEntry.kind,
		"retention",
	);
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
		} item=${itemMovement}`,
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
	const selectedIndex =
		(family.selectedIndex + offset + family.entries.length) %
		family.entries.length;
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
			),
		),
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
				entries: getToolExportIndex(indexes)
					.items.map(formatToolsEvidence)
					.filter((entry): entry is EvidenceEntry => Boolean(entry)),
				selectedIndex: getSelectedToolExportIndex(selection),
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
	const archiveAction = getStatusEvidenceSecondaryAction(kind, "archive");
	const retentionAction = getStatusEvidenceSecondaryAction(kind, "retention");
	const cursor = kind === activeKind ? ">" : " ";
	const movement = family.entries.length > 1 ? "[/]" : "-";
	return `${cursor} ${kind.padEnd(15)} selected=${selectedIndex + 1}/${
		family.entries.length
	} open=enter/${enterAction.shortcut} archive=${
		archiveAction ? `a/${archiveAction.shortcut}` : "-"
	} retention=${
		retentionAction ? `m/${retentionAction.shortcut}` : "-"
	} move=${movement}`;
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
	const shortcuts = getStatusEvidenceLegacyShortcuts(kind);
	const selectedIndex = clampEvidenceSelectionIndex(
		family.selectedIndex,
		family.entries.length,
	);
	const cursor = kind === activeKind ? ">" : " ";
	return `${cursor} ${kind.padEnd(15)} selected=${selectedIndex + 1}/${
		family.entries.length
	} refresh=${shortcuts.refresh} select=${shortcuts.select} open=${
		shortcuts.open
	} archive=${shortcuts.archive} retention=${shortcuts.retention}`;
}

function getStatusEvidenceLegacyShortcuts(kind: StatusEvidenceKind): {
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
				archive: "-",
				retention: "-",
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
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
		kind: "tools",
		label: `tools ${item.scope} runs=${item.runCount}`,
		path: item.path,
		controls: "enter=open open K archive=- retention=-",
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

function clampEvidenceSelectionIndex(index: number, length: number): number {
	if (length <= 0) {
		return 0;
	}
	return Math.min(Math.max(index, 0), length - 1);
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
		case "tools":
			return undefined;
	}
}
