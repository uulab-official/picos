import { describe, expect, test } from "bun:test";
import {
	canPublishEvidenceArchiveCurrentState,
	classifyAuditEvidenceIndexBatchRefresh,
	classifyAuditExportArchiveIndexRefresh,
	classifyAuditExportArchiveOutcome,
	classifyAuditExportIndexRefresh,
	classifyCleanupExportArchiveOutcome,
	classifyHandoffIndexRefresh,
	classifyToolArchiveRetentionOutcome,
	classifyToolExportArchiveOutcome,
	createStatusEvidenceActionPlan,
	createStatusEvidenceEnterPlan,
	createStatusEvidenceItemMovePlan,
	createStatusEvidenceNumberJumpPlan,
	createStatusEvidenceSearchPlan,
	filterInterfaceConfirmationEvidenceExports,
	formatInterfaceEvidenceFilterRows,
	formatStatusEvidenceCommandStripRows,
	formatStatusEvidenceDetailRows,
	formatStatusEvidenceIndexRows,
	formatStatusEvidenceLegacyBridgeRows,
	formatStatusEvidenceSummaryRows,
	formatStatusEvidenceTableDetailRows,
	formatStatusEvidenceTableRows,
	moveStatusEvidenceFocus,
	nextInterfaceEvidenceStateFilter,
	normalizeInterfaceEvidenceQuery,
	prepareStatusEvidenceActionTransition,
	prepareStatusEvidenceOpenTransition,
} from "../src/tui/statusEvidence";

describe("evidence archive outcome transitions", () => {
	test("owns archive notices, activity records, refreshes, and selected evidence", () => {
		expect(
			classifyCleanupExportArchiveOutcome({
				currentToken: 1,
				requestToken: 1,
				result: {
					status: "archived",
					sourcePath: "/tmp/cleanup.md",
					archivedPath: "/tmp/archive/cleanup.md",
					message: "archived cleanup.md",
				},
			}),
		).toMatchObject({
			publication: "current",
			publishCurrentState: true,
			notices: [
				{ level: "ok", message: "cleanup export archive archived cleanup.md" },
			],
			refreshActive: true,
			refreshArchive: true,
		});

		const toolPlan = {
			fileName: "tools.md",
		} as never;
		const toolResult = {
			status: "archived",
			sourcePath: "/tmp/tools.md",
			archivedPath: "/tmp/archive/tools.md",
			message: "archived tools.md",
		} as const;
		expect(
			classifyToolExportArchiveOutcome({
				currentToken: 1,
				requestToken: 1,
				plan: toolPlan,
				result: toolResult,
			}),
		).toMatchObject({
			selectedEvidenceKind: "tools-archive",
			activityResult: { action: "tools-evidence-archive" },
			refreshActive: true,
			refreshArchive: true,
		});

		expect(
			classifyAuditExportArchiveOutcome({
				currentToken: 1,
				requestToken: 1,
				scope: "interface",
				plan: { fileName: "interface.log" } as never,
				result: {
					status: "archived",
					sourcePath: "/tmp/interface.log",
					archivedPath: "/tmp/archive/interface.log",
					message: "archived interface.log",
				},
			}),
		).toMatchObject({
			selectedEvidenceKind: "interface",
			interfaceStateFilter: "archived",
			selectedIndex: 0,
			activityResult: { action: "interface-evidence-archive" },
		});

		expect(
			classifyToolArchiveRetentionOutcome({
				currentToken: 1,
				requestToken: 1,
				result: {
					status: "pruned",
					removed: 2,
					removedPaths: ["a", "b"],
					message: "pruned 2 tools exports",
				},
			}),
		).toMatchObject({
			refreshArchive: true,
			activityResult: { action: "tools-evidence-retention" },
		});
	});

	test("preserves history and refresh intents while suppressing stale selection", () => {
		const outcome = classifyAuditExportArchiveOutcome({
			currentToken: 2,
			requestToken: 1,
			scope: "interface",
			plan: { fileName: "interface.log" } as never,
			result: {
				status: "archived",
				sourcePath: "/tmp/interface.log",
				archivedPath: "/tmp/archive/interface.log",
				message: "archived interface.log",
			},
		});

		expect(outcome).toMatchObject({
			publication: "stale",
			publishCurrentState: false,
			refreshActive: true,
			refreshArchive: true,
			selectedEvidenceKind: "interface",
			activityResult: { action: "interface-evidence-archive" },
		});
		expect(outcome.notices).toHaveLength(2);
	});

	test("rechecks archive publication after an interleaved refresh await", () => {
		const requestToken = 1;
		expect(
			canPublishEvidenceArchiveCurrentState({
				currentToken: requestToken,
				requestToken,
			}),
		).toBe(true);

		const newerMutationToken = 2;
		expect(
			canPublishEvidenceArchiveCurrentState({
				currentToken: newerMutationToken,
				requestToken,
			}),
		).toBe(false);
	});

	test("publishes active and archive audit indexes as one current batch", () => {
		const baseInput = {
			currentMutationToken: 1,
			requestMutationToken: 1,
			active: {
				currentRequestToken: 1,
				requestToken: 1,
				selectedIndex: 0,
				timelineSourceFilter: "all" as const,
				interfaceStateFilter: "all" as const,
				interfaceQuery: "",
				recoveredSelections: {
					timeline: 0,
					process: 0,
					remoteKnownHosts: 0,
					interface: 0,
				},
			},
			archive: {
				currentRequestToken: 1,
				requestToken: 1,
				selectedIndex: 0,
			},
			outcome: {
				status: "success" as const,
				activeIndex: { baseDir: "/tmp/audit", items: [] },
				archiveIndex: { baseDir: "/tmp/audit/archive", items: [] },
			},
		};

		expect(classifyAuditEvidenceIndexBatchRefresh(baseInput)).toMatchObject({
			status: "success",
			active: { status: "success", selectedIndex: 0 },
			archive: { status: "success", selectedIndex: 0 },
		});
		expect(
			classifyAuditEvidenceIndexBatchRefresh({
				...baseInput,
				currentMutationToken: 2,
			}),
		).toEqual({ status: "stale" });
	});
});

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
		processControlAuditExports: [
			{
				path: "/tmp/picos/audit/picos-audit-process-selected.log",
				content: "",
				eventCount: 3,
				scope: "selected" as const,
				query: "process control evidence: kill pid=42 node",
				origin,
			},
			{
				path: "/tmp/picos/audit/picos-audit-process-all.log",
				content: "",
				eventCount: 6,
				scope: "filtered" as const,
				query: "process control evidence: restart pid=99 worker",
				origin,
			},
		],
	};

	const selection = {
		selectedHandoffIndex: 0,
		selectedAuditExportIndex: 0,
		selectedAuditExportArchiveIndex: 0,
		selectedCleanupExportIndex: 0,
		selectedCleanupExportArchiveIndex: 0,
		selectedToolExportIndex: 0,
		selectedToolExportArchiveIndex: 0,
		selectedProcessControlAuditExportIndex: 0,
	};

	test("summarizes selected evidence source, path, and controls", () => {
		expect(
			formatStatusEvidenceDetailRows(populatedIndexes, selection, 20),
		).toEqual([
			"STATUS EVIDENCE selected=5",
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
			"  process selected events=3 query=process control evidence: kill pid=42 node source=Config>Logs scope=logs.profiles",
			"  path=/tmp/picos/audit/picos-audit-process-selected.log",
			"  controls=enter=open open F archive=- retention=- search=G",
		]);
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
			"process",
		);
		expect(moveStatusEvidenceFocus(populatedIndexes, "process", "next")).toBe(
			"handoff",
		);
		expect(
			moveStatusEvidenceFocus(populatedIndexes, "handoff", "previous"),
		).toBe("process");
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
			"process",
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
		expect(
			createStatusEvidenceEnterPlan(populatedIndexes, selection, "process"),
		).toEqual({
			kind: "process",
			action: "open-process-evidence",
			shortcut: "F",
			label:
				"process selected events=3 query=process control evidence: kill pid=42 node",
			path: "/tmp/picos/audit/picos-audit-process-selected.log",
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

		const searchedSelection = {
			...selection,
			toolExportQuery: "04:05" as const,
		};
		expect(
			createStatusEvidenceEnterPlan(indexes, searchedSelection, "tools"),
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
				"process",
			),
		).toEqual([
			"COMMAND STRIP active=process",
			"> enter=open/F archive=- retention=- search=G item=[/]",
			"target=process selected events=3 query=process control evidence: kill pid=42 node",
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
			"> enter=open/W archive=a/Z retention=- search=- item=[/]",
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
			"> enter=open/J archive=- retention=m/M search=- item=-",
			"target=audit-archive all events=7",
		]);
	});

	test("creates a timeline search plan for active process evidence", () => {
		expect(
			createStatusEvidenceSearchPlan(populatedIndexes, selection, "process"),
		).toEqual({
			kind: "process",
			action: "search-process-evidence",
			shortcut: "G",
			label:
				"process selected events=3 query=process control evidence: kill pid=42 node",
			path: "/tmp/picos/audit/picos-audit-process-selected.log",
			query: "process control evidence: kill pid=42 node",
		});
		expect(
			createStatusEvidenceSearchPlan(populatedIndexes, selection, "audit"),
		).toBeUndefined();
	});

	test("surfaces remote known_hosts selection history exports as recoverable evidence", () => {
		const knownHostsIndexes = {
			...populatedIndexes,
			remoteKnownHostsSelectionAuditExports: [
				{
					path: "/tmp/picos/audit/picos-audit-known-hosts-prod.log",
					content: "",
					eventCount: 2,
					scope: "filtered" as const,
					query: "remote known_hosts selection history prod",
					origin,
				},
				{
					path: "/tmp/picos/audit/picos-audit-known-hosts-dev.log",
					content: "",
					eventCount: 1,
					scope: "filtered" as const,
					query: "remote known_hosts selection history dev",
					origin,
				},
			],
		};
		const knownHostsSelection = {
			...selection,
			selectedRemoteKnownHostsSelectionAuditExportIndex: 0,
		};

		expect(
			formatStatusEvidenceIndexRows(
				knownHostsIndexes,
				knownHostsSelection,
				"remote-known-hosts",
			),
		).toEqual([
			"EVIDENCE INDEX 1..6",
			"1 handoff route routes/table",
			"2 audit selected events=1 query=control",
			"3 cleanup selected entries=2",
			"4 tools selected runs=1",
			"5 process selected events=3 query=process control evidence: kill pid=42 node",
			">6 remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
		]);
		expect(
			createStatusEvidenceEnterPlan(
				knownHostsIndexes,
				knownHostsSelection,
				"remote-known-hosts",
			),
		).toEqual({
			kind: "remote-known-hosts",
			action: "open-remote-known-hosts-evidence",
			shortcut: "R",
			label:
				"remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
			path: "/tmp/picos/audit/picos-audit-known-hosts-prod.log",
		});
		expect(
			createStatusEvidenceSearchPlan(
				knownHostsIndexes,
				knownHostsSelection,
				"remote-known-hosts",
			),
		).toEqual({
			kind: "remote-known-hosts",
			action: "search-remote-known-hosts-evidence",
			shortcut: "G",
			label:
				"remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
			path: "/tmp/picos/audit/picos-audit-known-hosts-prod.log",
			query: "remote known_hosts selection history prod",
		});
		expect(
			createStatusEvidenceItemMovePlan(
				knownHostsIndexes,
				knownHostsSelection,
				"remote-known-hosts",
				"next",
			),
		).toEqual({
			kind: "remote-known-hosts",
			direction: "next",
			shortcut: "]",
			selectedIndex: 1,
			itemCount: 2,
			label:
				"remote known_hosts filtered events=1 query=remote known_hosts selection history dev",
		});
		expect(
			formatStatusEvidenceCommandStripRows(
				knownHostsIndexes,
				knownHostsSelection,
				"remote-known-hosts",
			),
		).toEqual([
			"COMMAND STRIP active=remote-known-hosts",
			"> enter=open/R archive=- retention=- search=G item=[/]",
			"target=remote known_hosts filtered events=2 query=remote known_hosts selection history prod",
		]);
	});

	test("surfaces interface confirmation audit exports as recoverable evidence", () => {
		const interfaceIndexes = {
			...populatedIndexes,
			interfaceConfirmationAuditExports: [
				{
					path: "/tmp/picos/audit/picos-audit-interface-wifi.log",
					content: "",
					eventCount: 1,
					scope: "selected" as const,
					query:
						"interface confirmation interface.disable status=confirmed-blocked",
					origin,
				},
				{
					path: "/tmp/picos/audit/picos-audit-interface-eth.log",
					content: "",
					eventCount: 1,
					scope: "selected" as const,
					query: "interface confirmation interface.enable status=rejected",
					origin,
				},
			],
			interfaceConfirmationAuditArchiveExports: [
				{
					path: "/tmp/picos/audit/archive/picos-audit-interface-archived.log",
					content: "",
					eventCount: 1,
					scope: "selected" as const,
					query: "interface confirmation interface.disable status=rejected",
					origin,
				},
			],
		};
		const interfaceSelection = {
			...selection,
			selectedInterfaceConfirmationAuditExportIndex: 0,
		};

		expect(
			formatStatusEvidenceIndexRows(
				interfaceIndexes,
				interfaceSelection,
				"interface",
			),
		).toEqual([
			"EVIDENCE INDEX 1..6",
			"1 handoff route routes/table",
			"2 audit selected events=1 query=control",
			"3 cleanup selected entries=2",
			"4 tools selected runs=1",
			"5 process selected events=3 query=process control evidence: kill pid=42 node",
			">6 interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
		]);
		expect(
			createStatusEvidenceEnterPlan(
				interfaceIndexes,
				interfaceSelection,
				"interface",
			),
		).toEqual({
			kind: "interface",
			action: "open-interface-evidence",
			shortcut: "I",
			label:
				"interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			path: "/tmp/picos/audit/picos-audit-interface-wifi.log",
		});
		expect(
			createStatusEvidenceSearchPlan(
				interfaceIndexes,
				interfaceSelection,
				"interface",
			),
		).toEqual({
			kind: "interface",
			action: "search-interface-evidence",
			shortcut: "G",
			label:
				"interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			path: "/tmp/picos/audit/picos-audit-interface-wifi.log",
			query:
				"interface confirmation interface.disable status=confirmed-blocked",
		});
		expect(
			createStatusEvidenceItemMovePlan(
				interfaceIndexes,
				interfaceSelection,
				"interface",
				"next",
			),
		).toEqual({
			kind: "interface",
			direction: "next",
			shortcut: "]",
			selectedIndex: 1,
			itemCount: 3,
			label:
				"interface active selected events=1 query=interface confirmation interface.enable status=rejected",
		});
		expect(
			formatStatusEvidenceCommandStripRows(
				interfaceIndexes,
				interfaceSelection,
				"interface",
			),
		).toEqual([
			"COMMAND STRIP active=interface",
			"> enter=open/I archive=a/A retention=- search=G item=[/]",
			"target=interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
		]);

		expect(
			createStatusEvidenceActionPlan(
				interfaceIndexes,
				interfaceSelection,
				"interface",
				"archive",
			),
		).toEqual({
			kind: "interface",
			action: "archive-interface-evidence",
			shortcut: "A",
			label:
				"interface active selected events=1 query=interface confirmation interface.disable status=confirmed-blocked",
			path: "/tmp/picos/audit/picos-audit-interface-wifi.log",
		});

		const archivedSelection = {
			...interfaceSelection,
			selectedInterfaceConfirmationAuditExportIndex: 2,
		};
		expect(
			formatStatusEvidenceCommandStripRows(
				interfaceIndexes,
				archivedSelection,
				"interface",
			),
		).toEqual([
			"COMMAND STRIP active=interface",
			"> enter=open/I archive=- retention=m/M search=G item=[/]",
			"target=interface archived selected events=1 query=interface confirmation interface.disable status=rejected",
		]);
		expect(
			createStatusEvidenceActionPlan(
				interfaceIndexes,
				archivedSelection,
				"interface",
				"retention",
			),
		).toEqual({
			kind: "interface",
			action: "preview-interface-retention",
			shortcut: "M",
			label:
				"interface archived selected events=1 query=interface confirmation interface.disable status=rejected",
			path: "/tmp/picos/audit/archive/picos-audit-interface-archived.log",
		});
		expect(
			createStatusEvidenceSearchPlan(
				interfaceIndexes,
				archivedSelection,
				"interface",
			),
		).toEqual(
			expect.objectContaining({
				path: "/tmp/picos/audit/archive/picos-audit-interface-archived.log",
				query: "interface confirmation interface.disable status=rejected",
			}),
		);
	});

	test("formats indexed evidence family jump rows", () => {
		expect(
			formatStatusEvidenceIndexRows(populatedIndexes, selection, "audit"),
		).toEqual([
			"EVIDENCE INDEX 1..5",
			"1 handoff route routes/table",
			">2 audit selected events=1 query=control",
			"3 cleanup selected entries=2",
			"4 tools selected runs=1",
			"5 process selected events=3 query=process control evidence: kill pid=42 node",
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
			"STATUS EVIDENCE TABLE 1..5 active=audit",
			" 1 handoff        item=1/1 open=enter/O archive=a/A retention=- search=- itemMove=- handoff route routes/table",
			">2 audit          item=1/2 open=enter/W archive=a/Z retention=- search=- itemMove=[/] audit selected events=1 query=control",
			" 3 cleanup        item=1/1 open=enter/V archive=a/X retention=- search=- itemMove=- cleanup selected entries=2",
			" 4 tools          item=1/1 open=enter/K archive=a/D retention=- search=- itemMove=- tools selected runs=1",
			" 5 process        item=1/2 open=enter/F archive=- retention=- search=G itemMove=[/] process selected events=3 query=process control evidence: kill pid=42 node",
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
		expect(
			formatStatusEvidenceTableDetailRows(
				populatedIndexes,
				selection,
				"process",
			),
		).toContain("controls=enter=open open F archive=- retention=- search=G");
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
			"STATUS EVIDENCE SUMMARY active=audit families=8 files=9",
			"  handoff         selected=1/1 open=enter/O archive=a/A retention=- search=- move=-",
			"> audit           selected=1/1 open=enter/W archive=a/Z retention=- search=- move=-",
			"  audit-archive   selected=1/1 open=enter/J archive=- retention=m/M search=- move=-",
			"  cleanup         selected=1/1 open=enter/V archive=a/X retention=- search=- move=-",
			"  cleanup-archive selected=1/1 open=enter/{ archive=- retention=- search=- move=-",
			"  tools           selected=1/1 open=enter/K archive=a/D retention=- search=- move=-",
			"  tools-archive   selected=1/1 open=enter/K archive=- retention=m/M search=- move=-",
			"  process         selected=1/2 open=enter/F archive=- retention=- search=G move=[/]",
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
			"STATUS EVIDENCE SUMMARY active=handoff families=5 files=6",
			"> handoff         selected=1/1 open=enter/O archive=a/A retention=- search=- move=-",
			"  audit           selected=1/1 open=enter/W archive=a/Z retention=- search=- move=-",
			"  cleanup         selected=1/1 open=enter/V archive=a/X retention=- search=- move=-",
			"  tools           selected=1/1 open=enter/K archive=a/D retention=- search=- move=-",
			"  process         selected=1/2 open=enter/F archive=- retention=- search=G move=[/]",
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
			"LEGACY EVIDENCE BRIDGE active=audit families=5 files=6",
			"  handoff         selected=1/1 refresh=H select=] open=O archive=A retention=-",
			"> audit           selected=1/1 refresh=T select=) open=W archive=Z retention=-",
			"  cleanup         selected=1/1 refresh=Y select=} open=V archive=X retention=-",
			"  tools           selected=1/1 refresh=- select=] open=K archive=D retention=-",
			"  process         selected=1/2 refresh=- select=F open=F archive=- retention=-",
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
			createStatusEvidenceNumberJumpPlan(populatedIndexes, selection, "6"),
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

	test("filters interface evidence by state and normalized text tokens", () => {
		const active = [
			{
				path: "/tmp/picos/audit/disable-wifi.log",
				content: "",
				eventCount: 2,
				scope: "selected" as const,
				query:
					"interface confirmation interface.disable status=confirmed-blocked",
			},
		];
		const archived = [
			{
				path: "/tmp/picos/audit/archive/enable-ethernet.log",
				content: "",
				eventCount: 1,
				scope: "filtered" as const,
				query: "interface confirmation interface.enable status=rejected",
			},
		];

		expect(
			filterInterfaceConfirmationEvidenceExports(
				active,
				archived,
				"archived",
				" ENABLE   rejected ",
			),
		).toEqual([{ plan: archived[0], state: "archived" }]);
		expect(
			filterInterfaceConfirmationEvidenceExports(
				active,
				archived,
				"active",
				"ethernet",
			),
		).toEqual([]);
		expect(normalizeInterfaceEvidenceQuery("  Wi-Fi   ACTIVE ")).toBe(
			"wi-fi active",
		);
		expect(nextInterfaceEvidenceStateFilter("all")).toBe("active");
		expect(nextInterfaceEvidenceStateFilter("active")).toBe("archived");
		expect(nextInterfaceEvidenceStateFilter("archived")).toBe("all");
		expect(
			formatInterfaceEvidenceFilterRows(
				active,
				archived,
				"archived",
				"enable",
				["enable", "disable wifi"],
			),
		).toEqual([
			"INTERFACE EVIDENCE FILTER state=archived query=enable visible=1/2",
			"controls=q state f find G timeline [/] select",
			"presets=2 next=disable wifi controls=P save N cycle",
		]);
	});

	test("classifies stale Status index success and failure without publishing current state", () => {
		expect(
			classifyHandoffIndexRefresh({
				currentRequestToken: 2,
				requestToken: 1,
				selectedIndex: 4,
				outcome: {
					status: "success",
					index: { baseDir: "/tmp/picos", items: [] },
				},
			}),
		).toEqual({ status: "stale" });
		expect(
			classifyAuditExportIndexRefresh({
				currentRequestToken: 3,
				requestToken: 2,
				selectedIndex: 8,
				recoveredSelections: {
					timeline: 8,
					process: 8,
					remoteKnownHosts: 8,
					interface: 8,
				},
				outcome: { status: "failure", error: new Error("older audit") },
			}),
		).toEqual({
			status: "stale",
			notice: {
				level: "fail",
				message: "audit export index failed older audit",
			},
		});
		expect(
			classifyAuditExportArchiveIndexRefresh({
				currentRequestToken: 5,
				requestToken: 5,
				selectedIndex: 9,
				outcome: {
					status: "success",
					index: { baseDir: "/tmp/picos", items: [] },
				},
			}),
		).toMatchObject({
			status: "success",
			selectedIndex: 0,
			interfaceConfirmationAuditArchiveExports: [],
		});
	});

	test("publishes combined interface selection atomically from either audit refresh", () => {
		const activePlans = [
			{
				path: "/tmp/picos/audit/interface-active-1.log",
				content: "",
				eventCount: 1,
				scope: "selected" as const,
				query: "interface confirmation interface.disable status=rejected",
			},
			{
				path: "/tmp/picos/audit/interface-active-2.log",
				content: "",
				eventCount: 1,
				scope: "selected" as const,
				query: "interface confirmation interface.enable status=rejected",
			},
		];
		const archivedPlans = [
			{
				path: "/tmp/picos/audit/archive/interface-archived.log",
				content: "",
				eventCount: 1,
				scope: "selected" as const,
				query: "interface confirmation interface.disable status=rejected",
			},
		];
		const activeIndex = {
			baseDir: "/tmp/picos/audit",
			items: activePlans.map((plan, index) => ({
				fileName: `interface-active-${index + 1}.log`,
				path: plan.path,
				generatedAt: `2026-07-01T0${index + 1}:00:00.000Z`,
				scope: plan.scope,
				query: plan.query,
				entryCount: plan.eventCount,
			})),
		};
		const archiveIndex = {
			baseDir: "/tmp/picos/audit/archive",
			items: archivedPlans.map((plan) => ({
				fileName: "interface-archived.log",
				path: plan.path,
				generatedAt: "2026-07-01T03:00:00.000Z",
				scope: plan.scope,
				query: plan.query,
				entryCount: plan.eventCount,
			})),
		};

		const activeRefresh = classifyAuditExportIndexRefresh({
			currentRequestToken: 3,
			requestToken: 3,
			selectedIndex: 0,
			interfaceConfirmationAuditArchiveExports: archivedPlans,
			interfaceStateFilter: "all",
			interfaceQuery: "",
			recoveredSelections: {
				timeline: 0,
				process: 0,
				remoteKnownHosts: 0,
				interface: 2,
			},
			outcome: { status: "success", index: activeIndex },
		});
		expect(activeRefresh).toMatchObject({
			status: "success",
			selectedInterfaceIndex: 2,
			interfaceConfirmationAuditExports: activePlans,
		});

		const archiveRefresh = classifyAuditExportArchiveIndexRefresh({
			currentRequestToken: 5,
			requestToken: 5,
			selectedIndex: 0,
			selectedInterfaceIndex: 1,
			interfaceConfirmationAuditExports: activePlans,
			interfaceStateFilter: "all",
			interfaceQuery: "",
			outcome: { status: "success", index: archiveIndex },
		});
		expect(archiveRefresh).toMatchObject({
			status: "success",
			selectedInterfaceIndex: 1,
			interfaceConfirmationAuditArchiveExports: archivedPlans,
		});
	});

	test("repairs combined interface selection for deletion, empty, and stale refreshes", () => {
		const archived = [
			{
				path: "/tmp/picos/audit/archive/interface.log",
				content: "",
				eventCount: 1,
				scope: "selected" as const,
				query: "interface confirmation interface.disable status=rejected",
			},
		];
		const emptyIndex = { baseDir: "/tmp/picos/audit", items: [] };
		expect(
			classifyAuditExportIndexRefresh({
				currentRequestToken: 4,
				requestToken: 4,
				selectedIndex: 7,
				interfaceConfirmationAuditArchiveExports: archived,
				recoveredSelections: {
					timeline: 7,
					process: 7,
					remoteKnownHosts: 7,
					interface: 9,
				},
				outcome: { status: "success", index: emptyIndex },
			}),
		).toMatchObject({ status: "success", selectedInterfaceIndex: 0 });
		expect(
			classifyAuditExportArchiveIndexRefresh({
				currentRequestToken: 6,
				requestToken: 6,
				selectedIndex: 7,
				selectedInterfaceIndex: 9,
				interfaceConfirmationAuditExports: [],
				outcome: { status: "success", index: emptyIndex },
			}),
		).toMatchObject({ status: "success", selectedInterfaceIndex: 0 });
		expect(
			classifyAuditExportIndexRefresh({
				currentRequestToken: 8,
				requestToken: 7,
				selectedIndex: 0,
				interfaceConfirmationAuditArchiveExports: archived,
				outcome: { status: "success", index: emptyIndex },
			}),
		).toEqual({ status: "stale" });
		expect(
			classifyAuditExportArchiveIndexRefresh({
				currentRequestToken: 8,
				requestToken: 7,
				selectedIndex: 0,
				interfaceConfirmationAuditExports: [],
				outcome: { status: "failure", error: "old archive" },
			}),
		).toEqual({
			status: "stale",
			notice: {
				level: "fail",
				message: "audit archive index failed old archive",
			},
		});
	});

	test("normalizes stale evidence selection before next movement", () => {
		const auditItems = [
			...populatedIndexes.auditExportIndex.items,
			{
				fileName: "picos-audit-second.log",
				path: "/tmp/picos/audit/picos-audit-second.log",
				generatedAt: "2026-07-01T06:00:00.000Z",
				scope: "all" as const,
				entryCount: 2,
			},
			{
				fileName: "picos-audit-third.log",
				path: "/tmp/picos/audit/picos-audit-third.log",
				generatedAt: "2026-07-01T07:00:00.000Z",
				scope: "all" as const,
				entryCount: 3,
			},
		];
		const indexes = {
			...populatedIndexes,
			auditExportIndex: {
				...populatedIndexes.auditExportIndex,
				items: auditItems,
			},
		};
		const move = (selectedAuditExportIndex: number) =>
			createStatusEvidenceItemMovePlan(
				indexes,
				{ ...selection, selectedAuditExportIndex },
				"audit",
				"next",
			);

		expect(move(99)?.selectedIndex).toBe(0);
		expect(move(-4)?.selectedIndex).toBe(1);
		expect(move(2)?.selectedIndex).toBe(0);
		expect(move(1)?.selectedIndex).toBe(2);
		expect(
			createStatusEvidenceItemMovePlan(
				{
					...indexes,
					auditExportIndex: { ...indexes.auditExportIndex, items: [] },
				},
				selection,
				"audit",
				"next",
			),
		).toBeUndefined();
	});

	test("owns empty open and archive-retention mismatch notices", () => {
		const emptyIndexes = {
			handoffIndex: { baseDir: "/tmp/picos", items: [] },
			auditExportIndex: { baseDir: "/tmp/picos", items: [] },
			auditExportArchiveIndex: { baseDir: "/tmp/picos", items: [] },
			cleanupExportIndex: { baseDir: "/tmp/picos", items: [] },
			cleanupExportArchiveIndex: { baseDir: "/tmp/picos", items: [] },
		};
		expect(
			prepareStatusEvidenceOpenTransition({
				indexes: emptyIndexes,
				selection,
				kind: "audit",
				baseDir: "/tmp/picos",
				platform: "darwin",
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no audit export selected" },
		});
		expect(
			prepareStatusEvidenceActionTransition({
				indexes: populatedIndexes,
				selection,
				kind: "audit",
				intent: "retention",
				baseDir: "/tmp/picos",
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "audit evidence retention is unavailable",
			},
		});
		const archivedInterfaceIndexes = {
			...populatedIndexes,
			interfaceConfirmationAuditExports: [],
			interfaceConfirmationAuditArchiveExports: [
				{
					path: "/tmp/picos/audit/archive/interface.log",
					content: "",
					eventCount: 1,
					scope: "selected" as const,
					query: "interface confirmation interface.disable status=rejected",
				},
			],
		};
		expect(
			prepareStatusEvidenceActionTransition({
				indexes: archivedInterfaceIndexes,
				selection: { ...selection, interfaceEvidenceStateFilter: "archived" },
				kind: "interface",
				intent: "archive",
				baseDir: "/tmp/picos",
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no active interface confirmation evidence export to archive",
			},
		});
	});
});
