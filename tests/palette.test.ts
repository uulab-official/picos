import { describe, expect, test } from "bun:test";
import { controlPreviewCommand as macosControlPreviewCommand } from "../src/adapters/macos";
import { createActionPreviewPlan, getActionCatalog } from "../src/core/actions";
import type { ConsoleAuditExportPlan } from "../src/core/auditLog";
import { createConfigWorkspaceItems } from "../src/tui/configPanel";
import type { PortProcessControlPreview } from "../src/tui/endpointPanel";
import {
	appendCommandPaletteQuery,
	backspaceCommandPaletteQuery,
	closeCommandPalette,
	formatCommandPaletteActionPreviewRows,
	getFilteredPaletteActions,
	getPaletteAction,
	moveCommandPalette,
	openCommandPalette,
} from "../src/tui/palette";
import type { StatusActivityToolsEvidenceSearchRecovery } from "../src/tui/statusActivityQueue";
import type {
	ToolHistoryArchiveRetentionPlan,
	ToolHistoryExportIndexItem,
} from "../src/tui/toolHistory";

describe("TUI command palette", () => {
	test("opens and closes around the first action", () => {
		const state = openCommandPalette();

		expect(state).toEqual({ active: true, selectedIndex: 0, query: "" });
		expect(closeCommandPalette(state)).toEqual({
			active: false,
			selectedIndex: 0,
			query: "",
		});
	});

	test("moves selection with wraparound", () => {
		let state = openCommandPalette();
		state = moveCommandPalette(state, 3, "previous");
		expect(state.selectedIndex).toBe(2);

		state = moveCommandPalette(state, 3, "next");
		expect(state.selectedIndex).toBe(0);
	});

	test("returns selected action from the catalog", () => {
		const actions = getActionCatalog();
		const state = { active: true, selectedIndex: 2, query: "" };

		expect(getPaletteAction(actions, state)?.id).toBe("doctor.run");
		expect(
			getPaletteAction(actions, {
				active: true,
				selectedIndex: 999,
				query: "",
			}),
		).toBe(undefined);
	});

	test("filters actions by query text and resets selection", () => {
		let state = openCommandPalette();
		state = moveCommandPalette(state, 3, "next");
		state = appendCommandPaletteQuery(state, "route table");

		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(state.query).toBe("route table");
		expect(state.selectedIndex).toBe(0);
		expect(actions.map((action) => action.id)).toContain("routes.inspect");
		expect(getPaletteAction(getActionCatalog(), state)?.id).toBe(
			"routes.inspect",
		);
	});

	test("finds the TCP connect action with a telnet query", () => {
		const state = appendCommandPaletteQuery(openCommandPalette(), "telnet");
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toContain("network.connect");
	});

	test("finds Config settings focus actions from the command palette", () => {
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "safety policy config"),
			).map((action) => action.id),
		).toContain("config.safetyPolicy.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "editor save config"),
			).map((action) => action.id),
		).toContain("config.editorSaveMode.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"audit retention config",
				),
			).map((action) => action.id),
		).toContain("config.auditRetention.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"tools retention config",
				),
			).map((action) => action.id),
		).toContain("config.toolTargetRetention.focus");
	});

	test("finds Config managed shelf focus actions from the command palette", () => {
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "route filters config"),
			).map((action) => action.id),
		).toContain("config.shelf.routes.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"connection filters config",
				),
			).map((action) => action.id),
		).toContain("config.shelf.connections.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "port filters config"),
			).map((action) => action.id),
		).toContain("config.shelf.ports.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools shelf config"),
			).map((action) => action.id),
		).toContain("config.shelf.tools.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"tool target presets config",
				),
			).map((action) => action.id),
		).toContain("config.shelf.tools.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "log profiles config"),
			).map((action) => action.id),
		).toContain("config.shelf.logs.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote profiles config",
				),
			).map((action) => action.id),
		).toContain("config.shelf.remotes.focus");
	});

	test("finds Config recovery actions from the command palette", () => {
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "empty route filters"),
			).map((action) => action.id),
		).toContain("config.recovery.routes");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"recover connection filters",
				),
			).map((action) => action.id),
		).toContain("config.recovery.connections");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "missing port filters"),
			).map((action) => action.id),
		).toContain("config.recovery.ports");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"recover tools targets",
				),
			).map((action) => action.id),
		).toContain("config.recovery.tools");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "missing log profiles"),
			).map((action) => action.id),
		).toContain("config.recovery.logs");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"recover remote profiles",
				),
			).map((action) => action.id),
		).toContain("config.recovery.remotes");
	});

	test("previews Config managed shelf focus before dispatch", () => {
		const previewContext = {
			configManagedShelfCounts: {
				routes: 2,
				tools: 3,
				remotes: 1,
			},
		};

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.shelf.routes.focus",
				),
				previewContext,
			),
		).toEqual([
			"config shelf target=routes workspace=Routes",
			"scope=route filters, raw route evidence, path lookup",
			"counts=routeFilters 2",
			"focus=routeFilters cursor=0 detail=table",
			"enter=cycle route filter presets  esc=clear landing",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.shelf.tools.focus",
				),
				previewContext,
			),
		).toEqual([
			"config shelf target=tools workspace=Tools",
			"scope=saved targets, history filters, grouping, detail view",
			"counts=toolTargetPresets 3",
			"focus=toolTargetPresets cursor=0 detail=summary",
			"enter=cycle tool target presets  esc=clear landing",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.shelf.remotes.focus",
				),
				previewContext,
			),
		).toEqual([
			"config shelf target=remotes workspace=Remotes",
			"scope=SFTP profiles, provider boundary, locked file context",
			"counts=remoteProfiles 1",
			"focus=remoteProfiles cursor=0",
			"enter=remote profile focus  esc=clear landing",
		]);
	});

	test("previews Config recovery actions before dispatch", () => {
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.recovery.routes",
				),
			),
		).toEqual([
			"config recovery target=routes workspace=Routes",
			"empty=routeFilters action=restore missing shelf",
			"scope=route filters, raw route evidence, path lookup",
			"focus=routeFilters cursor=0 detail=table",
			"enter=cycle route filter presets  fallback=open filter prompt",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.recovery.remotes",
				),
			),
		).toEqual([
			"config recovery target=remotes workspace=Remotes",
			"empty=remoteProfiles action=restore missing shelf",
			"scope=SFTP profiles, provider boundary, locked file context",
			"focus=remoteProfiles cursor=0",
			"enter=remote profile focus  fallback=empty profile list",
		]);
	});

	test("finds recovered timeline trail actions from the command palette", () => {
		const state = appendCommandPaletteQuery(openCommandPalette(), "trail");
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.timelineTrail.select",
				"status.timelineTrail.open",
				"status.timelineTrail.search",
				"status.timelineTrail.source",
			]),
		);
		expect(
			actions.find((action) => action.id === "status.timelineTrail.select"),
		).toEqual(
			expect.objectContaining({
				category: "status",
				risk: "read",
				enabled: true,
				confirmationRequired: false,
			}),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "trail source"),
			).map((action) => action.id),
		).toContain("status.timelineTrail.source");
	});

	test("finds recovered process evidence actions from the command palette", () => {
		const state = appendCommandPaletteQuery(
			openCommandPalette(),
			"process evidence",
		);
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.processEvidence.select",
				"status.processEvidence.open",
				"status.processEvidence.search",
			]),
		);
		expect(
			actions.find((action) => action.id === "status.processEvidence.open"),
		).toEqual(
			expect.objectContaining({
				category: "status",
				risk: "read",
				enabled: true,
				confirmationRequired: false,
			}),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"process evidence search",
				),
			).map((action) => action.id),
		).toContain("status.processEvidence.search");
	});

	test("previews recovered process evidence actions before dispatch", () => {
		const selectedProcessEvidenceExport: ConsoleAuditExportPlan = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"status activity result audit jump palette process control audit action=preview pid=12345",
			scope: "selected",
		};

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.processEvidence.open",
				),
				{
					selectedProcessEvidenceExport,
					selectedProcessEvidenceExportIndex: 0,
					totalProcessEvidenceExports: 2,
				},
			),
		).toEqual([
			"selected process evidence 1/2 picos-audit-selected-2026-07-01T050000000Z.log",
			"target=pid:12345 events=1",
			"query=status activity result audit jump palette process control audit action=preview pid=12345",
			"confirm=file-open path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.processEvidence.search",
				),
			),
		).toEqual([
			"selected process evidence unavailable",
			"hint=export or recover a process-control audit jump",
		]);
	});

	test("finds status result timeline jump actions from the command palette", () => {
		const state = appendCommandPaletteQuery(
			openCommandPalette(),
			"result jump",
		);
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.resultJump.select",
				"status.resultJump.open",
			]),
		);
		expect(
			actions.find((action) => action.id === "status.resultJump.open"),
		).toEqual(
			expect.objectContaining({
				category: "status",
				risk: "read",
				enabled: true,
				confirmationRequired: false,
			}),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "timeline result open"),
			).map((action) => action.id),
		).toContain("status.resultJump.open");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "result select"),
			).map((action) => action.id),
		).toContain("status.resultJump.select");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "result jump filter"),
			).map((action) => action.id),
		).toContain("status.resultJump.filter");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "jump class"),
			).map((action) => action.id),
		).toContain("status.resultJump.filter");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "jump class config"),
			).map((action) => action.id),
		).toContain("config.statusResultJumpClass.focus");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "status jump config"),
			).map((action) => action.id),
		).toContain("config.statusResultJumpClass.focus");
	});

	test("previews status result timeline jumps before dispatch", () => {
		const jump = {
			filter: "audit" as const,
			query: 'status evidence process audit action=search target="pid:12345"',
			message:
				"status activity result timeline search status process evidence pid=12345",
		};

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.resultJump.open",
				),
				{
					selectedStatusActivityResultTimelineJump: jump,
					selectedStatusActivityResultTimelineJumpIndex: 1,
					totalStatusActivityResultTimelineJumps: 3,
				},
			),
		).toEqual([
			"selected result jump 2/3 filter=audit",
			"target=process-control pid:12345 action=search",
			'query=status evidence process audit action=search target="pid:12345"',
			"timeline-search=audit message=status activity result timeline search status process evidence pid=12345",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.resultJump.select",
				),
				{
					selectedStatusActivityResultTimelineJump: jump,
				},
			),
		).toEqual([
			"selected result jump 1/1 filter=audit",
			"target=process-control pid:12345 action=search",
			'query=status evidence process audit action=search target="pid:12345"',
			"action=select next Status result Timeline jump",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.resultJump.open",
				),
			),
		).toEqual([
			"selected result jump unavailable",
			"hint=select a Status Activity result row with a Timeline jump",
		]);
	});

	test("previews status result jump class filter before dispatch", () => {
		const configWorkspaceItems = createConfigWorkspaceItems({
			language: "en",
			refreshInterval: 3000,
			statusResultJumpClassFilter: "process",
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
		});

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.resultJump.filter",
				),
				{
					statusActivityResultTimelineJumpFilter: "process",
					nextStatusActivityResultTimelineJumpFilter: "timeline",
					visibleStatusActivityResultTimelineJumps: 1,
					totalStatusActivityResultTimelineJumps: 4,
				},
			),
		).toEqual([
			"result jump class filter",
			"current=process next=timeline",
			"visible=1/4",
			"dispatch=cycle Status ^ filter",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.statusResultJumpClass.focus",
				),
				{ configWorkspaceItems, statusResultJumpClassFilter: "process" },
			),
		).toEqual([
			"config target=statusResultJumpClassFilter",
			"current=process",
			"section=display action=focus Config row",
			"controls=+/- cycle all/process/timeline/tools/source",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.safetyPolicy.focus",
				),
				{ configWorkspaceItems },
			),
		).toEqual([
			"config target=controlExecutionMode",
			"current mode=disabled adminDryRun=false editorSave=disabled",
			"section=safety action=focus Config row",
			"controls=P presets safe/user/admin +/- cycle selected row",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.editorSaveMode.focus",
				),
				{ configWorkspaceItems },
			),
		).toEqual([
			"config target=editorSaveMode",
			"current=disabled",
			"section=safety action=focus Config row",
			"controls=+/- cycle disabled/local-write",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.auditRetention.focus",
				),
				{ configWorkspaceItems },
			),
		).toEqual([
			"config target=auditArchiveRetentionLimit",
			"current=10",
			"section=retention action=focus Config row",
			"controls=+/- clamp 1..60 archived audit logs",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "config.toolTargetRetention.focus",
				),
				{ configWorkspaceItems },
			),
		).toEqual([
			"config target=toolTargetPresetLimit",
			"current=8",
			"section=retention action=focus Config row",
			"controls=+/- clamp 1..24 saved tool targets",
		]);
	});

	test("finds status result history filter from the command palette", () => {
		const actions = getFilteredPaletteActions(
			getActionCatalog(),
			appendCommandPaletteQuery(openCommandPalette(), "result filter"),
		);

		expect(actions.map((action) => action.id)).toContain(
			"status.resultHistory.filter",
		);
		expect(
			actions.find((action) => action.id === "status.resultHistory.filter"),
		).toEqual(
			expect.objectContaining({
				category: "status",
				risk: "read",
				enabled: true,
				confirmationRequired: false,
			}),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "palette result jumps"),
			).map((action) => action.id),
		).toContain("status.resultHistory.filter");
	});

	test("finds Tools evidence management actions from the command palette", () => {
		const actions = getFilteredPaletteActions(
			getActionCatalog(),
			appendCommandPaletteQuery(openCommandPalette(), "tools evidence"),
		);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.toolsEvidence.filter",
				"status.toolsEvidence.search",
				"status.toolsEvidence.archive",
				"status.toolsEvidence.retention",
				"status.toolsEvidence.matchOpen",
				"status.toolsEvidence.matchArchive",
			]),
		);
		expect(
			actions.find((action) => action.id === "status.toolsEvidence.archive"),
		).toEqual(
			expect.objectContaining({
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
				confirmationRequired: false,
			}),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools archive"),
			).map((action) => action.id),
		).toContain("status.toolsEvidence.retention");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools compare"),
			).map((action) => action.id),
		).toContain("status.toolsEvidence.filter");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"tools evidence search",
				),
			).map((action) => action.id),
		).toContain("status.toolsEvidence.search");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools match"),
			).map((action) => action.id),
		).toEqual(
			expect.arrayContaining([
				"status.toolsEvidence.matchOpen",
				"status.toolsEvidence.matchArchive",
			]),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools match open"),
			).map((action) => action.id),
		).toContain("status.toolsEvidence.matchOpen");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools match archive"),
			).map((action) => action.id),
		).toContain("status.toolsEvidence.matchArchive");
	});

	test("previews selected Tools evidence match actions before dispatch", () => {
		const recovery: StatusActivityToolsEvidenceSearchRecovery = {
			target: "active",
			query: "040100",
			total: 3,
			items: [
				{
					fileName: "picos-tools-selected-2026-07-01T040100000Z.md",
					path: "/Users/me/.config/picos/tools/picos-tools-selected-2026-07-01T040100000Z.md",
					generatedAt: "2026-07-01T04:01:00.000Z",
					scope: "selected",
					runCount: 2,
				},
			],
		};
		const actions = getActionCatalog();

		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find(
					(action) => action.id === "status.toolsEvidence.matchOpen",
				),
				{ toolsEvidenceSearchRecovery: recovery },
			),
		).toEqual([
			"selected tools match active 1/1 picos-tools-selected-2026-07-01T040100000Z.md",
			"query=040100 scope=selected runs=2",
			"confirm=file-open path=/Users/me/.config/picos/tools/picos-tools-selected-2026-07-01T040100000Z.md",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find(
					(action) => action.id === "status.toolsEvidence.matchArchive",
				),
				{ toolsEvidenceSearchRecovery: recovery },
			),
		).toContain(
			"confirm=archive tools export path=/Users/me/.config/picos/tools/picos-tools-selected-2026-07-01T040100000Z.md",
		);
		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find(
					(action) => action.id === "status.toolsEvidence.matchArchive",
				),
				{
					toolsEvidenceSearchRecovery: {
						...recovery,
						target: "archive",
					},
				},
			),
		).toContain("blocked=archived Tools evidence matches are already archived");
	});

	test("previews Tools evidence archive and retention prompts before dispatch", () => {
		const selectedExport: ToolHistoryExportIndexItem = {
			fileName: "picos-tools-all-2026-07-01T050000000Z.md",
			path: "/Users/me/.config/picos/tools/picos-tools-all-2026-07-01T050000000Z.md",
			generatedAt: "2026-07-01T05:00:00.000Z",
			scope: "all",
			runCount: 4,
		};
		const candidateExport: ToolHistoryExportIndexItem = {
			fileName: "picos-tools-selected-2026-07-01T030000000Z.md",
			path: "/Users/me/.config/picos/tools/archive/picos-tools-selected-2026-07-01T030000000Z.md",
			generatedAt: "2026-07-01T03:00:00.000Z",
			scope: "selected",
			runCount: 1,
		};
		const retention: ToolHistoryArchiveRetentionPlan = {
			baseDir: "/Users/me/.config/picos/tools/archive",
			maxItems: 1,
			retainedItems: [
				{
					fileName: "picos-tools-all-2026-07-01T060000000Z.md",
					path: "/Users/me/.config/picos/tools/archive/picos-tools-all-2026-07-01T060000000Z.md",
					generatedAt: "2026-07-01T06:00:00.000Z",
					scope: "all",
					runCount: 5,
				},
			],
			candidateItems: [candidateExport],
			risk: "destructive",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "prune tools archive",
			confirmed: false,
			enabled: false,
			reason: "type prune tools archive to remove 1 archived tools exports",
		};
		const actions = getActionCatalog();

		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find((action) => action.id === "status.toolsEvidence.archive"),
				{
					selectedToolExport: selectedExport,
					selectedToolExportIndex: 1,
					totalToolExports: 3,
					toolExportFilter: "all",
					toolExportQuery: "050000",
				},
			),
		).toEqual([
			"selected tools export 2/3 picos-tools-all-2026-07-01T050000000Z.md",
			"filter=all query=050000 scope=all runs=4",
			"confirm=archive tools export path=/Users/me/.config/picos/tools/picos-tools-all-2026-07-01T050000000Z.md",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find(
					(action) => action.id === "status.toolsEvidence.retention",
				),
				{ toolArchiveRetentionPlan: retention },
			),
		).toEqual([
			"tools archive retention max=1 candidates=1",
			"keep=1 remove=1",
			"remove picos-tools-selected-2026-07-01T030000000Z.md",
			"confirm=prune tools archive",
		]);
	});

	test("previews locked Action Center controls before dispatch", () => {
		const action = getActionCatalog().find(
			(candidate) => candidate.id === "dns.flush",
		);
		const controlPreview = createActionPreviewPlan(
			"dns.flush",
			"macos",
			macosControlPreviewCommand("dns.flush"),
		);

		expect(
			formatCommandPaletteActionPreviewRows(action, { controlPreview }),
		).toEqual([
			"control preview dns.flush locked dryRun=true",
			"risk=write privilege=admin confirm=flush dns",
			"adapter=macos command=sudo dscacheutil -flushcache",
			"blocked=disabled-by-default",
		]);
	});

	test("previews selected port process controls before dispatch", () => {
		const portProcessPreview: PortProcessControlPreview = {
			actionId: "process.terminate",
			kind: "terminate",
			port: {
				protocol: "tcp",
				localAddress: "*",
				localPort: "3000",
				pid: "12345",
				command: "node",
				user: "alice",
			},
			confirmationPhrase: "kill pid 12345",
			risk: "destructive",
			privilege: "user",
			enabled: false,
			rows: [],
		};
		const action = getActionCatalog().find(
			(candidate) => candidate.id === "process.terminate",
		);

		expect(
			formatCommandPaletteActionPreviewRows(action, { portProcessPreview }),
		).toEqual([
			"port process control process.terminate locked",
			"risk=destructive privilege=user confirm=kill pid 12345",
			"target port=*:3000 pid=12345 process=node user=alice",
			"dryRun no process signal will be sent",
		]);
	});

	test("edits query with backspace and ignores control input", () => {
		let state = openCommandPalette();
		state = appendCommandPaletteQuery(state, "dns");
		state = appendCommandPaletteQuery(state, "\u0003");
		state = backspaceCommandPaletteQuery(state);

		expect(state.query).toBe("dn");
		const inactiveState = { ...state, active: false };
		expect(backspaceCommandPaletteQuery(inactiveState)).toBe(inactiveState);
	});
});
