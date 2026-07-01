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

type EvidenceEntry = {
	label: string;
	path: string;
	origin?: FileOpenOrigin;
	controls: string;
};

export function formatStatusEvidenceDetailRows(
	indexes: StatusEvidenceIndexes,
	selection: StatusEvidenceSelection,
	visibleRows = 14,
): string[] {
	const entries = collectStatusEvidenceEntries(indexes, selection);
	const rows =
		entries.length === 0
			? [
					"STATUS EVIDENCE selected=0",
					"no selected evidence; refresh Status indexes first",
				]
			: [
					`STATUS EVIDENCE selected=${entries.length}`,
					...entries.flatMap((entry, index) => [
						`${index === 0 ? ">" : " "} ${entry.label} ${formatEvidenceOrigin(entry.origin)}`,
						`  path=${entry.path}`,
						`  controls=${entry.controls}`,
					]),
				];

	return rows.slice(0, Math.max(1, visibleRows));
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
			"open W archive Z retention=-",
		),
		formatAuditEvidence(
			getSelectedConsoleAuditExport(
				indexes.auditExportArchiveIndex,
				selection.selectedAuditExportArchiveIndex,
			),
			"audit-archive",
			"open J archive=archived retention=M",
		),
		formatCleanupEvidence(
			getSelectedCleanupHandoffHistoryExport(
				indexes.cleanupExportIndex,
				selection.selectedCleanupExportIndex,
			),
			"cleanup",
			"open V archive X retention=-",
		),
		formatCleanupEvidence(
			getSelectedCleanupHandoffHistoryExportArchive(
				indexes.cleanupExportArchiveIndex,
				selection.selectedCleanupExportArchiveIndex,
			),
			"cleanup-archive",
			"open=- archive=archived retention=-",
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
		label: `handoff ${handoffKind} ${item.kind}/${item.view}`,
		path: item.path,
		origin: item.origin,
		controls: "open O archive A retention=-",
	};
}

function formatAuditEvidence(
	item: ConsoleAuditExportIndexItem | undefined,
	label: string,
	controls: string,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
		label: `${label} ${item.scope} events=${item.entryCount}${item.query ? ` query=${item.query}` : ""}`,
		path: item.path,
		origin: item.origin,
		controls,
	};
}

function formatCleanupEvidence(
	item: CleanupHandoffHistoryExportIndexItem | undefined,
	label: string,
	controls: string,
): EvidenceEntry | undefined {
	if (!item) {
		return undefined;
	}
	return {
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
