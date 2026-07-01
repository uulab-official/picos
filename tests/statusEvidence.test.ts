import { describe, expect, test } from "bun:test";
import {
	createStatusEvidenceEnterPlan,
	formatStatusEvidenceDetailRows,
	moveStatusEvidenceFocus,
} from "../src/tui/statusEvidence";

describe("Status evidence detail rows", () => {
	const origin = {
		kind: "config-shelf" as const,
		target: "logs",
		label: "Logs",
		scope: "logs.profiles",
	};

	const populatedIndexes = {
		handoffIndex: {
			baseDir: "/tmp/picos/handoffs",
			items: [
				{
					source: "route-handoff" as const,
					kind: "routes" as const,
					view: "table",
					label: "default route",
					command: "picos routes",
					generatedAt: "2026-07-01T01:00:00.000Z",
					origin,
					path: "/tmp/picos/handoffs/routes/route.md",
				},
			],
		},
		auditExportIndex: {
			baseDir: "/tmp/picos/audit",
			items: [
				{
					fileName: "picos-audit-selected.log",
					path: "/tmp/picos/audit/picos-audit-selected.log",
					generatedAt: "2026-07-01T02:00:00.000Z",
					scope: "selected" as const,
					query: "control",
					entryCount: 1,
					origin,
				},
			],
		},
		auditExportArchiveIndex: {
			baseDir: "/tmp/picos/audit/archive",
			items: [],
		},
		cleanupExportIndex: {
			baseDir: "/tmp/picos/cleanup",
			items: [
				{
					fileName: "picos-cleanup-selected.md",
					path: "/tmp/picos/cleanup/picos-cleanup-selected.md",
					scope: "selected" as const,
					entryCount: 2,
					generatedAt: "2026-07-01T03:00:00.000Z",
					origin,
				},
			],
		},
		cleanupExportArchiveIndex: {
			baseDir: "/tmp/picos/cleanup/archive",
			items: [],
		},
	};

	const selection = {
		selectedHandoffIndex: 0,
		selectedAuditExportIndex: 0,
		selectedAuditExportArchiveIndex: 0,
		selectedCleanupExportIndex: 0,
		selectedCleanupExportArchiveIndex: 0,
	};

	test("summarizes selected evidence source, path, and controls", () => {
		expect(formatStatusEvidenceDetailRows(populatedIndexes, selection)).toEqual(
			[
				"STATUS EVIDENCE selected=3",
				"> handoff route routes/table source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/handoffs/routes/route.md",
				"  controls=enter=open open O archive A retention=-",
				"  audit selected events=1 query=control source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/audit/picos-audit-selected.log",
				"  controls=enter=open open W archive Z retention=-",
				"  cleanup selected entries=2 source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/cleanup/picos-cleanup-selected.md",
				"  controls=enter=open open V archive X retention=-",
			],
		);
	});

	test("marks the active evidence entry when focus changes", () => {
		expect(
			formatStatusEvidenceDetailRows(
				populatedIndexes,
				selection,
				14,
				"cleanup",
			),
		).toContain(
			"> cleanup selected entries=2 source=Config>Logs scope=logs.profiles",
		);
		expect(
			formatStatusEvidenceDetailRows(
				populatedIndexes,
				selection,
				14,
				"cleanup",
			),
		).toContain(
			"  handoff route routes/table source=Config>Logs scope=logs.profiles",
		);
	});

	test("cycles evidence focus across available evidence families", () => {
		expect(moveStatusEvidenceFocus(populatedIndexes, "handoff", "next")).toBe(
			"audit",
		);
		expect(moveStatusEvidenceFocus(populatedIndexes, "audit", "next")).toBe(
			"cleanup",
		);
		expect(moveStatusEvidenceFocus(populatedIndexes, "cleanup", "next")).toBe(
			"handoff",
		);
		expect(
			moveStatusEvidenceFocus(populatedIndexes, "handoff", "previous"),
		).toBe("cleanup");
	});

	test("starts focus on the first available evidence when the current family is unavailable", () => {
		const withoutHandoff = {
			...populatedIndexes,
			handoffIndex: { baseDir: "/tmp/picos/handoffs", items: [] },
		};

		expect(moveStatusEvidenceFocus(withoutHandoff, "handoff", "next")).toBe(
			"audit",
		);
		expect(moveStatusEvidenceFocus(withoutHandoff, "handoff", "previous")).toBe(
			"cleanup",
		);
	});

	test("creates a unified enter plan for the active evidence family", () => {
		expect(
			createStatusEvidenceEnterPlan(populatedIndexes, selection, "handoff"),
		).toEqual({
			kind: "handoff",
			action: "open-handoff",
			shortcut: "O",
			label: "handoff route routes/table",
			path: "/tmp/picos/handoffs/routes/route.md",
		});
		expect(
			createStatusEvidenceEnterPlan(populatedIndexes, selection, "audit"),
		).toEqual({
			kind: "audit",
			action: "open-audit",
			shortcut: "W",
			label: "audit selected events=1 query=control",
			path: "/tmp/picos/audit/picos-audit-selected.log",
		});
		expect(
			createStatusEvidenceEnterPlan(populatedIndexes, selection, "cleanup"),
		).toEqual({
			kind: "cleanup",
			action: "open-cleanup",
			shortcut: "V",
			label: "cleanup selected entries=2",
			path: "/tmp/picos/cleanup/picos-cleanup-selected.md",
		});
	});

	test("routes archived evidence enter actions to safe existing controls", () => {
		const archivedIndexes = {
			...populatedIndexes,
			auditExportArchiveIndex: {
				baseDir: "/tmp/picos/audit/archive",
				items: [
					{
						fileName: "picos-audit-all.log",
						path: "/tmp/picos/audit/archive/picos-audit-all.log",
						generatedAt: "2026-07-01T04:00:00.000Z",
						scope: "all" as const,
						entryCount: 7,
						origin,
					},
				],
			},
			cleanupExportArchiveIndex: {
				baseDir: "/tmp/picos/cleanup/archive",
				items: [
					{
						fileName: "picos-cleanup-all.md",
						path: "/tmp/picos/cleanup/archive/picos-cleanup-all.md",
						scope: "all" as const,
						entryCount: 4,
						generatedAt: "2026-07-01T05:00:00.000Z",
						origin,
					},
				],
			},
		};

		expect(
			createStatusEvidenceEnterPlan(
				archivedIndexes,
				selection,
				"audit-archive",
			),
		).toMatchObject({
			kind: "audit-archive",
			action: "open-audit-archive",
			shortcut: "J",
			path: "/tmp/picos/audit/archive/picos-audit-all.log",
		});
		expect(
			createStatusEvidenceEnterPlan(
				archivedIndexes,
				selection,
				"cleanup-archive",
			),
		).toMatchObject({
			kind: "cleanup-archive",
			action: "select-cleanup-archive",
			shortcut: "{",
			path: "/tmp/picos/cleanup/archive/picos-cleanup-all.md",
		});
	});

	test("does not create an enter plan when no evidence is indexed", () => {
		expect(
			createStatusEvidenceEnterPlan(
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
				selection,
				"handoff",
			),
		).toBeUndefined();
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
