import { describe, expect, test } from "bun:test";
import type { ConsoleAuditExportIndex } from "../src/core/auditLog";
import type { HandoffIndex } from "../src/core/handoffIndex";
import type { CleanupHandoffHistoryExportIndex } from "../src/tui/cleanupIndex";
import { formatStatusEvidenceDetailRows } from "../src/tui/statusEvidence";

describe("Status evidence detail rows", () => {
	const origin = {
		kind: "config-shelf" as const,
		target: "logs",
		label: "Logs",
		scope: "logs.profiles",
	};

	test("summarizes selected evidence source, path, and controls", () => {
		const handoffIndex: HandoffIndex = {
			baseDir: "/tmp/picos/handoffs",
			items: [
				{
					source: "route-handoff",
					kind: "routes",
					view: "table",
					label: "default route",
					command: "picos routes",
					generatedAt: "2026-07-01T01:00:00.000Z",
					origin,
					path: "/tmp/picos/handoffs/routes/route.md",
				},
			],
		};
		const auditExportIndex: ConsoleAuditExportIndex = {
			baseDir: "/tmp/picos/audit",
			items: [
				{
					fileName: "picos-audit-selected.log",
					path: "/tmp/picos/audit/picos-audit-selected.log",
					generatedAt: "2026-07-01T02:00:00.000Z",
					scope: "selected",
					query: "control",
					entryCount: 1,
					origin,
				},
			],
		};
		const cleanupExportIndex: CleanupHandoffHistoryExportIndex = {
			baseDir: "/tmp/picos/cleanup",
			items: [
				{
					fileName: "picos-cleanup-selected.md",
					path: "/tmp/picos/cleanup/picos-cleanup-selected.md",
					scope: "selected",
					entryCount: 2,
					generatedAt: "2026-07-01T03:00:00.000Z",
					origin,
				},
			],
		};

		expect(
			formatStatusEvidenceDetailRows(
				{
					handoffIndex,
					auditExportIndex,
					auditExportArchiveIndex: {
						baseDir: "/tmp/picos/audit/archive",
						items: [],
					},
					cleanupExportIndex,
					cleanupExportArchiveIndex: {
						baseDir: "/tmp/picos/cleanup/archive",
						items: [],
					},
				},
				{
					selectedHandoffIndex: 0,
					selectedAuditExportIndex: 0,
					selectedAuditExportArchiveIndex: 0,
					selectedCleanupExportIndex: 0,
					selectedCleanupExportArchiveIndex: 0,
				},
			),
		).toEqual([
			"STATUS EVIDENCE selected=3",
			"> handoff route routes/table source=Config>Logs scope=logs.profiles",
			"  path=/tmp/picos/handoffs/routes/route.md",
			"  controls=open O archive A retention=-",
			"  audit selected events=1 query=control source=Config>Logs scope=logs.profiles",
			"  path=/tmp/picos/audit/picos-audit-selected.log",
			"  controls=open W archive Z retention=-",
			"  cleanup selected entries=2 source=Config>Logs scope=logs.profiles",
			"  path=/tmp/picos/cleanup/picos-cleanup-selected.md",
			"  controls=open V archive X retention=-",
		]);
	});

	test("keeps an empty evidence detail pane useful", () => {
		expect(
			formatStatusEvidenceDetailRows(
				{
					handoffIndex: { baseDir: "/tmp/picos/handoffs", items: [] },
					auditExportIndex: { baseDir: "/tmp/picos/audit", items: [] },
					auditExportArchiveIndex: {
						baseDir: "/tmp/picos/audit/archive",
						items: [],
					},
					cleanupExportIndex: { baseDir: "/tmp/picos/cleanup", items: [] },
					cleanupExportArchiveIndex: {
						baseDir: "/tmp/picos/cleanup/archive",
						items: [],
					},
				},
				{
					selectedHandoffIndex: 0,
					selectedAuditExportIndex: 0,
					selectedAuditExportArchiveIndex: 0,
					selectedCleanupExportIndex: 0,
					selectedCleanupExportArchiveIndex: 0,
				},
			),
		).toEqual([
			"STATUS EVIDENCE selected=0",
			"no selected evidence; refresh Status indexes first",
		]);
	});
});
