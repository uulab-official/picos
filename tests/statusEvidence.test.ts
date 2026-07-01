import { describe, expect, test } from "bun:test";
import {
	createStatusEvidenceActionPlan,
	createStatusEvidenceEnterPlan,
	createStatusEvidenceItemMovePlan,
	createStatusEvidenceNumberJumpPlan,
	formatStatusEvidenceCommandStripRows,
	formatStatusEvidenceDetailRows,
	formatStatusEvidenceIndexRows,
	formatStatusEvidenceLegacyBridgeRows,
	formatStatusEvidenceSummaryRows,
	formatStatusEvidenceTableDetailRows,
	formatStatusEvidenceTableRows,
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
		toolExportIndex: {
			baseDir: "/tmp/picos/tools",
			items: [
				{
					fileName: "picos-tools-selected.md",
					path: "/tmp/picos/tools/picos-tools-selected.md",
					scope: "selected" as const,
					runCount: 1,
					generatedAt: "2026-07-01T04:00:00.000Z",
				},
			],
		},
		toolExportArchiveIndex: {
			baseDir: "/tmp/picos/tools/archive",
			items: [],
		},
	};

	const selection = {
		selectedHandoffIndex: 0,
		selectedAuditExportIndex: 0,
		selectedAuditExportArchiveIndex: 0,
		selectedCleanupExportIndex: 0,
		selectedCleanupExportArchiveIndex: 0,
		selectedToolExportIndex: 0,
		selectedToolExportArchiveIndex: 0,
	};

	test("summarizes selected evidence source, path, and controls", () => {
		expect(formatStatusEvidenceDetailRows(populatedIndexes, selection)).toEqual(
			[
				"STATUS EVIDENCE selected=4",
				"> handoff route routes/table source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/handoffs/routes/route.md",
				"  controls=enter=open open O archive A/a retention=-",
				"  audit selected events=1 query=control source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/audit/picos-audit-selected.log",
				"  controls=enter=open open W archive Z/a retention=-",
				"  cleanup selected entries=2 source=Config>Logs scope=logs.profiles",
				"  path=/tmp/picos/cleanup/picos-cleanup-selected.md",
				"  controls=enter=open open V archive X/x retention=-",
				"  tools selected runs=1 source=- scope=-",
				"  path=/tmp/picos/tools/picos-tools-selected.md",
				"  controls=enter=open open K archive D/a retention=-",
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
			"tools",
		);
		expect(moveStatusEvidenceFocus(populatedIndexes, "tools", "next")).toBe(
			"handoff",
		);
		expect(
			moveStatusEvidenceFocus(populatedIndexes, "handoff", "previous"),
		).toBe("tools");
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
			"tools",
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
		expect(
			createStatusEvidenceEnterPlan(populatedIndexes, selection, "tools"),
		).toEqual({
			kind: "tools",
			action: "open-tools",
			shortcut: "K",
			label: "tools selected runs=1",
			path: "/tmp/picos/tools/picos-tools-selected.md",
		});
	});

	test("filters Tools evidence selections by scope", () => {
		const indexes = {
			...populatedIndexes,
			toolExportIndex: {
				baseDir: "/tmp/picos/tools",
				items: [
					{
						fileName: "picos-tools-selected.md",
						path: "/tmp/picos/tools/picos-tools-selected.md",
						scope: "selected" as const,
						runCount: 1,
						generatedAt: "2026-07-01T04:00:00.000Z",
					},
					{
						fileName: "picos-tools-compare.md",
						path: "/tmp/picos/tools/picos-tools-compare.md",
						scope: "compare" as const,
						runCount: 1,
						generatedAt: "2026-07-01T04:05:00.000Z",
					},
				],
			},
		};
		const filteredSelection = {
			...selection,
			toolExportFilter: "compare" as const,
		};

		expect(
			formatStatusEvidenceDetailRows(indexes, filteredSelection, 20, "tools"),
		).toContain("> tools compare runs=1 source=- scope=-");
		expect(
			createStatusEvidenceEnterPlan(indexes, filteredSelection, "tools"),
		).toEqual(
			expect.objectContaining({
				kind: "tools",
				action: "open-tools",
				label: "tools compare runs=1",
				path: "/tmp/picos/tools/picos-tools-compare.md",
			}),
		);
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
			toolExportArchiveIndex: {
				baseDir: "/tmp/picos/tools/archive",
				items: [
					{
						fileName: "picos-tools-all.md",
						path: "/tmp/picos/tools/archive/picos-tools-all.md",
						scope: "all" as const,
						runCount: 3,
						generatedAt: "2026-07-01T06:00:00.000Z",
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
		expect(
			createStatusEvidenceEnterPlan(
				archivedIndexes,
				selection,
				"tools-archive",
			),
		).toMatchObject({
			kind: "tools-archive",
			action: "open-tools-archive",
			shortcut: "K",
			path: "/tmp/picos/tools/archive/picos-tools-all.md",
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

	test("creates secondary action plans for the active evidence family", () => {
		expect(
			createStatusEvidenceActionPlan(
				populatedIndexes,
				selection,
				"handoff",
				"archive",
			),
		).toEqual({
			kind: "handoff",
			action: "archive-handoff",
			shortcut: "A",
			label: "handoff route routes/table",
			path: "/tmp/picos/handoffs/routes/route.md",
		});
		expect(
			createStatusEvidenceActionPlan(
				populatedIndexes,
				selection,
				"audit",
				"archive",
			),
		).toEqual({
			kind: "audit",
			action: "archive-audit",
			shortcut: "Z",
			label: "audit selected events=1 query=control",
			path: "/tmp/picos/audit/picos-audit-selected.log",
		});
		expect(
			createStatusEvidenceActionPlan(
				populatedIndexes,
				selection,
				"cleanup",
				"archive",
			),
		).toEqual({
			kind: "cleanup",
			action: "archive-cleanup",
			shortcut: "X",
			label: "cleanup selected entries=2",
			path: "/tmp/picos/cleanup/picos-cleanup-selected.md",
		});
		expect(
			createStatusEvidenceActionPlan(
				populatedIndexes,
				selection,
				"tools",
				"archive",
			),
		).toEqual({
			kind: "tools",
			action: "archive-tools",
			shortcut: "D",
			label: "tools selected runs=1",
			path: "/tmp/picos/tools/picos-tools-selected.md",
		});
	});

	test("creates retention plans for archived audit and tools evidence", () => {
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
			toolExportArchiveIndex: {
				baseDir: "/tmp/picos/tools/archive",
				items: [
					{
						fileName: "picos-tools-all.md",
						path: "/tmp/picos/tools/archive/picos-tools-all.md",
						scope: "all" as const,
						runCount: 3,
						generatedAt: "2026-07-01T06:00:00.000Z",
					},
				],
			},
		};

		expect(
			createStatusEvidenceActionPlan(
				archivedIndexes,
				selection,
				"audit-archive",
				"retention",
			),
		).toMatchObject({
			kind: "audit-archive",
			action: "preview-audit-retention",
			shortcut: "M",
			path: "/tmp/picos/audit/archive/picos-audit-all.log",
		});
		expect(
			createStatusEvidenceActionPlan(
				archivedIndexes,
				selection,
				"tools-archive",
				"retention",
			),
		).toMatchObject({
			kind: "tools-archive",
			action: "preview-tools-retention",
			shortcut: "M",
			path: "/tmp/picos/tools/archive/picos-tools-all.md",
		});
		expect(
			createStatusEvidenceActionPlan(
				populatedIndexes,
				selection,
				"cleanup",
				"retention",
			),
		).toBeUndefined();
	});

	test("does not create unsafe secondary plans for archived cleanup evidence", () => {
		const archivedCleanupIndexes = {
			...populatedIndexes,
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
			createStatusEvidenceActionPlan(
				archivedCleanupIndexes,
				selection,
				"cleanup-archive",
				"archive",
			),
		).toBeUndefined();
		expect(
			createStatusEvidenceActionPlan(
				archivedCleanupIndexes,
				selection,
				"cleanup-archive",
				"retention",
			),
		).toBeUndefined();
	});

	test("formats a command strip for the active evidence target", () => {
		expect(
			formatStatusEvidenceCommandStripRows(
				populatedIndexes,
				selection,
				"audit",
			),
		).toEqual([
			"COMMAND STRIP active=audit",
			"> enter=open/W archive=a/Z retention=- item=-",
			"target=audit selected events=1 query=control",
		]);
	});

	test("formats item movement controls in the command strip when available", () => {
		const multiIndexes = {
			...populatedIndexes,
			auditExportIndex: {
				...populatedIndexes.auditExportIndex,
				items: [
					...populatedIndexes.auditExportIndex.items,
					{
						fileName: "picos-audit-all.log",
						path: "/tmp/picos/audit/picos-audit-all.log",
						generatedAt: "2026-07-01T06:00:00.000Z",
						scope: "all" as const,
						entryCount: 5,
						origin,
					},
				],
			},
		};

		expect(
			formatStatusEvidenceCommandStripRows(multiIndexes, selection, "audit"),
		).toEqual([
			"COMMAND STRIP active=audit",
			"> enter=open/W archive=a/Z retention=- item=[/]",
			"target=audit selected events=1 query=control",
		]);
	});

	test("formats archived audit retention in the command strip", () => {
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
		};

		expect(
			formatStatusEvidenceCommandStripRows(
				archivedIndexes,
				selection,
				"audit-archive",
			),
		).toEqual([
			"COMMAND STRIP active=audit-archive",
			"> enter=open/J archive=- retention=m/M item=-",
			"target=audit-archive all events=7",
		]);
	});

	test("formats indexed evidence family jump rows", () => {
		expect(
			formatStatusEvidenceIndexRows(populatedIndexes, selection, "audit"),
		).toEqual([
			"EVIDENCE INDEX 1..4",
			"1 handoff route routes/table",
			">2 audit selected events=1 query=control",
			"3 cleanup selected entries=2",
			"4 tools selected runs=1",
		]);
	});

	test("formats a dense evidence table with counts and active controls", () => {
		const multiIndexes = {
			...populatedIndexes,
			auditExportIndex: {
				...populatedIndexes.auditExportIndex,
				items: [
					...populatedIndexes.auditExportIndex.items,
					{
						fileName: "picos-audit-all.log",
						path: "/tmp/picos/audit/picos-audit-all.log",
						generatedAt: "2026-07-01T06:00:00.000Z",
						scope: "all" as const,
						entryCount: 5,
						origin,
					},
				],
			},
		};

		expect(
			formatStatusEvidenceTableRows(multiIndexes, selection, "audit"),
		).toEqual([
			"STATUS EVIDENCE TABLE 1..4 active=audit",
			" 1 handoff        item=1/1 open=enter/O archive=a/A retention=- itemMove=- handoff route routes/table",
			">2 audit          item=1/2 open=enter/W archive=a/Z retention=- itemMove=[/] audit selected events=1 query=control",
			" 3 cleanup        item=1/1 open=enter/V archive=a/X retention=- itemMove=- cleanup selected entries=2",
			" 4 tools          item=1/1 open=enter/K archive=a/D retention=- itemMove=- tools selected runs=1",
		]);
	});

	test("formats active evidence table detail rows for path and source inspection", () => {
		expect(
			formatStatusEvidenceTableDetailRows(populatedIndexes, selection, "audit"),
		).toEqual([
			"TABLE DETAIL active=audit item=1/1",
			"label=audit selected events=1 query=control",
			"source=Config>Logs scope=logs.profiles",
			"path=/tmp/picos/audit/picos-audit-selected.log",
			"controls=enter=open open W archive Z/a retention=-",
		]);
	});

	test("formats compact evidence summary rows for remaining status browsers", () => {
		const archivedIndexes = {
			...populatedIndexes,
			auditExportArchiveIndex: {
				baseDir: "/tmp/picos/audit/archive",
				items: [
					{
						fileName: "picos-audit-archive.log",
						path: "/tmp/picos/audit/archive/picos-audit-archive.log",
						generatedAt: "2026-07-01T07:00:00.000Z",
						scope: "all" as const,
						entryCount: 8,
						origin,
					},
				],
			},
			cleanupExportArchiveIndex: {
				baseDir: "/tmp/picos/cleanup/archive",
				items: [
					{
						fileName: "picos-cleanup-archive.md",
						path: "/tmp/picos/cleanup/archive/picos-cleanup-archive.md",
						scope: "all" as const,
						entryCount: 4,
						generatedAt: "2026-07-01T08:00:00.000Z",
						origin,
					},
				],
			},
			toolExportArchiveIndex: {
				baseDir: "/tmp/picos/tools/archive",
				items: [
					{
						fileName: "picos-tools-archive.md",
						path: "/tmp/picos/tools/archive/picos-tools-archive.md",
						scope: "all" as const,
						runCount: 5,
						generatedAt: "2026-07-01T09:00:00.000Z",
					},
				],
			},
		};

		expect(
			formatStatusEvidenceSummaryRows(archivedIndexes, selection, "audit"),
		).toEqual([
			"STATUS EVIDENCE SUMMARY active=audit families=7 files=7",
			"  handoff         selected=1/1 open=enter/O archive=a/A retention=- move=-",
			"> audit           selected=1/1 open=enter/W archive=a/Z retention=- move=-",
			"  audit-archive   selected=1/1 open=enter/J archive=- retention=m/M move=-",
			"  cleanup         selected=1/1 open=enter/V archive=a/X retention=- move=-",
			"  cleanup-archive selected=1/1 open=enter/{ archive=- retention=- move=-",
			"  tools           selected=1/1 open=enter/K archive=a/D retention=- move=-",
			"  tools-archive   selected=1/1 open=enter/K archive=- retention=m/M move=-",
		]);
	});

	test("marks the fallback summary row when the requested evidence family is unavailable", () => {
		expect(
			formatStatusEvidenceSummaryRows(
				populatedIndexes,
				selection,
				"audit-archive",
			),
		).toEqual([
			"STATUS EVIDENCE SUMMARY active=handoff families=4 files=4",
			"> handoff         selected=1/1 open=enter/O archive=a/A retention=- move=-",
			"  audit           selected=1/1 open=enter/W archive=a/Z retention=- move=-",
			"  cleanup         selected=1/1 open=enter/V archive=a/X retention=- move=-",
			"  tools           selected=1/1 open=enter/K archive=a/D retention=- move=-",
		]);
	});

	test("formats a compact bridge for legacy evidence browser shortcuts", () => {
		expect(
			formatStatusEvidenceLegacyBridgeRows(
				populatedIndexes,
				selection,
				"audit",
			),
		).toEqual([
			"LEGACY EVIDENCE BRIDGE active=audit families=4 files=4",
			"  handoff         selected=1/1 refresh=H select=] open=O archive=A retention=-",
			"> audit           selected=1/1 refresh=T select=) open=W archive=Z retention=-",
			"  cleanup         selected=1/1 refresh=Y select=} open=V archive=X retention=-",
			"  tools           selected=1/1 refresh=- select=] open=K archive=D retention=-",
		]);
	});

	test("keeps the legacy evidence bridge useful when no files are indexed", () => {
		expect(
			formatStatusEvidenceLegacyBridgeRows(
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
		).toEqual([
			"LEGACY EVIDENCE BRIDGE active=none families=0 files=0",
			"shortcuts still available after indexes refresh: H/T/U/Y/B",
		]);
	});

	test("creates number jump plans for available evidence families", () => {
		expect(
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "1"),
		).toEqual({
			kind: "handoff",
			shortcut: "1",
			label: "handoff route routes/table",
		});
		expect(
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "3"),
		).toEqual({
			kind: "cleanup",
			shortcut: "3",
			label: "cleanup selected entries=2",
		});
		expect(
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "4"),
		).toEqual({
			kind: "tools",
			shortcut: "4",
			label: "tools selected runs=1",
		});
	});

	test("ignores number jumps outside the available evidence index", () => {
		expect(
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "5"),
		).toBeUndefined();
		expect(
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "0"),
		).toBeUndefined();
	});

	test("creates active evidence item move plans with wraparound", () => {
		const multiIndexes = {
			...populatedIndexes,
			auditExportIndex: {
				...populatedIndexes.auditExportIndex,
				items: [
					...populatedIndexes.auditExportIndex.items,
					{
						fileName: "picos-audit-all.log",
						path: "/tmp/picos/audit/picos-audit-all.log",
						generatedAt: "2026-07-01T06:00:00.000Z",
						scope: "all" as const,
						entryCount: 5,
						origin,
					},
				],
			},
		};

		expect(
			createStatusEvidenceItemMovePlan(
				multiIndexes,
				selection,
				"audit",
				"next",
			),
		).toEqual({
			kind: "audit",
			direction: "next",
			shortcut: "]",
			selectedIndex: 1,
			itemCount: 2,
			label: "audit all events=5",
		});
		expect(
			createStatusEvidenceItemMovePlan(
				multiIndexes,
				selection,
				"audit",
				"previous",
			),
		).toEqual({
			kind: "audit",
			direction: "previous",
			shortcut: "[",
			selectedIndex: 1,
			itemCount: 2,
			label: "audit all events=5",
		});
	});

	test("does not create item move plans for single-item evidence families", () => {
		expect(
			createStatusEvidenceItemMovePlan(
				populatedIndexes,
				selection,
				"cleanup",
				"next",
			),
		).toBeUndefined();
	});

	test("keeps the command strip useful when no evidence is indexed", () => {
		expect(
			formatStatusEvidenceCommandStripRows(
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
		).toEqual([
			"COMMAND STRIP active=none",
			"> enter=cleanup-shelf archive=- retention=- item=-",
			"target=no selected evidence",
		]);
	});

	test("keeps the evidence table detail useful when no evidence is indexed", () => {
		expect(
			formatStatusEvidenceTableDetailRows(
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
		).toEqual([
			"TABLE DETAIL active=none item=0/0",
			"no selected evidence; refresh Status indexes first",
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
