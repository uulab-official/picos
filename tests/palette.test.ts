import { describe, expect, test } from "bun:test";
import { controlPreviewCommand as macosControlPreviewCommand } from "../src/adapters/macos";
import { createActionPreviewPlan, getActionCatalog } from "../src/core/actions";
import {
	type ConsoleAuditExportPlan,
	createConsoleAuditArchiveRetentionPlan,
} from "../src/core/auditLog";
import type { NetworkInterfaceSummary } from "../src/core/types";
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
	prepareCommandPaletteInput,
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
			})?.id,
		).toBe(actions.at(-1)?.id);
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

	test("finds interface state proposals by palette query", () => {
		const disableState = appendCommandPaletteQuery(
			openCommandPalette(),
			"interface proposal disable",
		);
		const enableState = appendCommandPaletteQuery(
			openCommandPalette(),
			"interface proposal enable",
		);

		expect(
			getFilteredPaletteActions(getActionCatalog(), disableState).map(
				(action) => action.id,
			),
		).toContain("interface.proposal.disable");
		expect(
			getFilteredPaletteActions(getActionCatalog(), enableState).map(
				(action) => action.id,
			),
		).toContain("interface.proposal.enable");
	});

	test("finds Tools direct-run actions with operator-style queries", () => {
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools tls"),
			).map((action) => action.id),
		).toContain("tools.tls");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools traceroute"),
			).map((action) => action.id),
		).toContain("tools.traceroute");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "tools dns"),
			).map((action) => action.id),
		).toContain("tools.dns");
	});

	test("finds Remotes known_hosts selection prompt from the command palette", () => {
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote known_hosts select",
				),
			).map((action) => action.id),
		).toContain("remote.knownHosts.select");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"known hosts candidate",
				),
			).map((action) => action.id),
		).toContain("remote.knownHosts.select");
	});

	test("previews Remotes known_hosts selection prompt before dispatch", () => {
		const actions = getActionCatalog();

		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find((action) => action.id === "remote.knownHosts.select"),
			),
		).toEqual([
			"remote known_hosts select",
			"action=remote.knownHosts.select risk=read privilege=none",
			"prompt=:remote-known-hosts-select accepts=12,#12,candidate 12",
			"guards=localRead=false network=not-opened trust=not-applied knownHostsWrite=false",
			"dispatch=enter opens Remotes known_hosts selection prompt",
		]);
	});

	test("previews Tools direct-run prompts before dispatch", () => {
		const actions = getActionCatalog();

		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find((action) => action.id === "tools.tls"),
				{
					defaultToolTarget: "api.example.com",
					publicIp: "203.0.113.10",
					selectedInterfacePlatform: "darwin",
				},
			),
		).toEqual([
			"tools direct run TLS inspector",
			"action=tools.tls tool=tls risk=read privilege=none",
			"target default=api.example.com:443 placeholder=example.com:443",
			"cli=picos tools tls api.example.com:443",
			"dispatch=enter opens Tools target prompt",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				actions.find((action) => action.id === "network.connect"),
				{
					defaultToolTarget: "api.example.com",
					selectedInterfacePlatform: "darwin",
				},
			),
		).toEqual([
			"tools direct run Telnet-style TCP check",
			"action=network.connect tool=telnet risk=read privilege=none",
			"target default=api.example.com 443 placeholder=example.com 443",
			"cli=picos tools telnet api.example.com 443",
			"dispatch=enter opens Tools target prompt",
		]);
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

	test("finds recovered remote known_hosts evidence actions from the command palette", () => {
		const state = appendCommandPaletteQuery(
			openCommandPalette(),
			"known_hosts evidence",
		);
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.remoteKnownHostsEvidence.select",
				"status.remoteKnownHostsEvidence.open",
				"status.remoteKnownHostsEvidence.search",
				"status.remoteKnownHostsEvidence.copy",
				"status.remoteKnownHostsEvidence.export",
				"status.remoteKnownHostsEvidence.handoffSelect",
				"status.remoteKnownHostsEvidence.handoffOpen",
			]),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote known_hosts evidence search",
				),
			).map((action) => action.id),
		).toContain("status.remoteKnownHostsEvidence.search");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote known_hosts evidence export",
				),
			).map((action) => action.id),
		).toContain("status.remoteKnownHostsEvidence.export");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote known_hosts handoff select",
				),
			).map((action) => action.id),
		).toContain("status.remoteKnownHostsEvidence.handoffSelect");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"remote known_hosts handoff open",
				),
			).map((action) => action.id),
		).toContain("status.remoteKnownHostsEvidence.handoffOpen");
	});

	test("previews recovered remote known_hosts evidence actions before dispatch", () => {
		const selectedKnownHostsEvidenceExport: ConsoleAuditExportPlan = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
			content: "",
			eventCount: 2,
			query: "remote known_hosts selection history prod",
			scope: "filtered",
		};

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.remoteKnownHostsEvidence.open",
				),
				{
					selectedRemoteKnownHostsEvidenceExport:
						selectedKnownHostsEvidenceExport,
					selectedRemoteKnownHostsEvidenceExportIndex: 1,
					totalRemoteKnownHostsEvidenceExports: 3,
				},
			),
		).toEqual([
			"selected remote known_hosts evidence 2/3 picos-audit-filtered-2026-07-01T060000000Z.log",
			"target=prod events=2",
			"query=remote known_hosts selection history prod",
			"confirm=file-open path=/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.remoteKnownHostsEvidence.copy",
				),
				{
					selectedRemoteKnownHostsEvidenceExport:
						selectedKnownHostsEvidenceExport,
					selectedRemoteKnownHostsEvidenceExportIndex: 1,
					totalRemoteKnownHostsEvidenceExports: 3,
				},
			),
		).toEqual([
			"selected remote known_hosts evidence 2/3 picos-audit-filtered-2026-07-01T060000000Z.log",
			"target=prod events=2",
			"query=remote known_hosts selection history prod",
			"confirm=clipboard handoff=remote-known-hosts path=/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.remoteKnownHostsEvidence.export",
				),
				{
					selectedRemoteKnownHostsEvidenceExport:
						selectedKnownHostsEvidenceExport,
					selectedRemoteKnownHostsEvidenceExportIndex: 1,
					totalRemoteKnownHostsEvidenceExports: 3,
				},
			),
		).toEqual([
			"selected remote known_hosts evidence 2/3 picos-audit-filtered-2026-07-01T060000000Z.log",
			"target=prod events=2",
			"query=remote known_hosts selection history prod",
			"audit-export=selected-handoff path=/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T060000000Z.log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.remoteKnownHostsEvidence.search",
				),
			),
		).toEqual([
			"selected remote known_hosts evidence unavailable",
			"hint=export or recover a Remotes known_hosts selection-history audit log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) =>
						action.id === "status.remoteKnownHostsEvidence.handoffSelect",
				),
				{
					selectedRemoteKnownHostsEvidenceHandoff: {
						action: "export",
						historyIndex: 2,
						id: "prod",
						jump: {
							filter: "audit",
							query:
								'palette remote known_hosts evidence audit action=export target="prod"',
							message:
								"status activity result timeline search palette remote known_hosts evidence prod",
						},
						selected: 1,
						total: 2,
					},
				},
			),
		).toEqual([
			"selected remote known_hosts handoff 2/2",
			"target=id:prod action=export row=3",
			'query=palette remote known_hosts evidence audit action=export target="prod"',
			"action=select next remote known_hosts handoff result",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) =>
						action.id === "status.remoteKnownHostsEvidence.handoffOpen",
				),
				{
					selectedRemoteKnownHostsEvidenceHandoff: {
						action: "export",
						historyIndex: 2,
						id: "prod",
						jump: {
							filter: "audit",
							query:
								'palette remote known_hosts evidence audit action=export target="prod"',
							message:
								"status activity result timeline search palette remote known_hosts evidence prod",
						},
						selected: 1,
						total: 2,
					},
				},
			),
		).toEqual([
			"selected remote known_hosts handoff 2/2",
			"target=id:prod action=export row=3",
			'query=palette remote known_hosts evidence audit action=export target="prod"',
			"timeline-search=audit message=status activity result timeline search palette remote known_hosts evidence prod",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) =>
						action.id === "status.remoteKnownHostsEvidence.handoffOpen",
				),
			),
		).toEqual([
			"selected remote known_hosts handoff unavailable",
			"hint=create or recover a palette known_hosts evidence copy/export result",
		]);
	});

	test("finds recovered interface evidence actions from the command palette", () => {
		const state = appendCommandPaletteQuery(
			openCommandPalette(),
			"interface evidence",
		);
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toEqual(
			expect.arrayContaining([
				"status.interfaceEvidence.select",
				"status.interfaceEvidence.open",
				"status.interfaceEvidence.search",
				"status.interfaceEvidence.filter",
				"status.interfaceEvidence.find",
				"status.interfaceEvidence.presetSave",
				"status.interfaceEvidence.presetNext",
				"status.interfaceEvidence.archive",
				"status.interfaceEvidence.retention",
			]),
		);
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"interface evidence open",
				),
			).map((action) => action.id),
		).toContain("status.interfaceEvidence.open");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"interface evidence search",
				),
			).map((action) => action.id),
		).toContain("status.interfaceEvidence.search");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"interface evidence retention",
				),
			).map((action) => action.id),
		).toContain("status.interfaceEvidence.retention");
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(
					openCommandPalette(),
					"interface evidence find",
				),
			).map((action) => action.id),
		).toContain("status.interfaceEvidence.find");
	});

	test("previews recovered interface evidence actions before dispatch", () => {
		const selectedInterfaceEvidenceExport: ConsoleAuditExportPlan = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-interface-2026-07-01T070000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"interface confirmation interface.disable status=confirmed-blocked",
			scope: "selected",
		};

		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.presetSave",
				),
				{
					interfaceEvidenceQuery: "wifi rejected",
					interfaceEvidenceSearchPresets: ["archived", "ethernet"],
					nextInterfaceEvidenceSearchPreset: "archived",
				},
			),
		).toEqual([
			"interface evidence search presets=2 current=wifi rejected",
			"action=save current query enabled=true",
			"controls=P save N cycle",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.presetNext",
				),
				{
					interfaceEvidenceQuery: "wifi rejected",
					interfaceEvidenceSearchPresets: ["archived", "ethernet"],
					nextInterfaceEvidenceSearchPreset: "archived",
				},
			),
		).toEqual([
			"interface evidence search presets=2 current=wifi rejected",
			"action=cycle next=archived",
			"controls=P save N cycle",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.filter",
				),
				{
					interfaceEvidenceStateFilter: "active",
					interfaceEvidenceQuery: "disable wifi",
					visibleInterfaceEvidenceExports: 1,
					totalAvailableInterfaceEvidenceExports: 3,
					nextInterfaceEvidenceStateFilter: "archived",
				},
			),
		).toEqual([
			"interface evidence state=active query=disable wifi visible=1/3",
			"action=cycle state next=archived",
			"controls=q state f find G timeline",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.find",
				),
			),
		).toEqual([
			"interface evidence state=all query=- visible=0/0",
			"action=open text search fields=path,query,scope,state",
			"controls=q state f find G timeline",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.select",
				),
				{
					selectedInterfaceEvidenceExport,
					selectedInterfaceEvidenceExportIndex: 0,
					totalInterfaceEvidenceExports: 2,
				},
			),
		).toEqual([
			"selected interface evidence 1/2 picos-audit-interface-2026-07-01T070000000Z.log",
			"target=interface.disable confirmed-blocked events=1",
			"query=interface confirmation interface.disable status=confirmed-blocked",
			"action=select next recovered interface evidence",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.open",
				),
				{
					selectedInterfaceEvidenceExport,
					selectedInterfaceEvidenceExportIndex: 0,
					totalInterfaceEvidenceExports: 2,
				},
			),
		).toEqual([
			"selected interface evidence 1/2 picos-audit-interface-2026-07-01T070000000Z.log",
			"target=interface.disable confirmed-blocked events=1",
			"query=interface confirmation interface.disable status=confirmed-blocked",
			"confirm=file-open path=/Users/bonjin/.config/picos/audit/picos-audit-interface-2026-07-01T070000000Z.log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.search",
				),
			),
		).toEqual([
			"selected interface evidence unavailable",
			"hint=export or recover an interface confirmation audit log",
		]);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.archive",
				),
				{
					selectedInterfaceEvidenceExport,
					selectedInterfaceEvidenceExportIndex: 0,
					totalInterfaceEvidenceExports: 2,
					selectedInterfaceEvidenceArchived: false,
				},
			),
		).toEqual([
			"selected interface evidence 1/2 picos-audit-interface-2026-07-01T070000000Z.log",
			"target=interface.disable confirmed-blocked events=1",
			"confirm=archive audit export path=/Users/bonjin/.config/picos/audit/picos-audit-interface-2026-07-01T070000000Z.log",
		]);
		const retentionPlan = createConsoleAuditArchiveRetentionPlan(
			{
				baseDir: "/Users/bonjin/.config/picos",
				items: [
					{
						fileName: "picos-audit-interface-old.log",
						path: "/Users/bonjin/.config/picos/audit/archive/picos-audit-interface-old.log",
						generatedAt: "2026-07-01T06:00:00.000Z",
						scope: "selected",
						query: "interface confirmation interface.disable status=rejected",
						entryCount: 1,
					},
				],
			},
			{ maxItems: 1 },
		);
		expect(
			formatCommandPaletteActionPreviewRows(
				getActionCatalog().find(
					(action) => action.id === "status.interfaceEvidence.retention",
				),
				{ interfaceAuditArchiveRetentionPlan: retentionPlan },
			),
		).toEqual([
			"interface evidence retention max=1 candidates=0",
			"keep=1 remove=0",
			"blocked=no archived interface evidence beyond retention",
			"confirm=prune audit archive",
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
		expect(
			getFilteredPaletteActions(
				getActionCatalog(),
				appendCommandPaletteQuery(openCommandPalette(), "known_hosts handoffs"),
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
			"preflight=5 scope=local resolver cache",
			"willModify=cache-only persistentConfig=false networkRestart=false",
			"blocked=disabled-by-default",
		]);
	});

	test("previews selected interface controls before dispatch", () => {
		const action = getActionCatalog().find(
			(candidate) => candidate.id === "interface.disable",
		);
		const controlPreview = createActionPreviewPlan(
			"interface.disable",
			"macos",
			macosControlPreviewCommand("interface.disable"),
		);
		const selectedInterface: NetworkInterfaceSummary = {
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.0.20",
			ipv6: "fe80::1",
			ipv4Cidr: "192.168.0.20/24",
			ipv6Cidr: "fe80::1/64",
			netmask: "255.255.255.0",
			mac: "aa:bb:cc:dd:ee:ff",
			mtu: 1500,
			rxBytes: 125000000,
			txBytes: 42000000,
			rxPackets: 9000,
			txPackets: 7100,
		};

		expect(
			formatCommandPaletteActionPreviewRows(action, {
				controlPreview,
				selectedInterface,
				selectedInterfacePlatform: "darwin",
			}),
		).toEqual([
			"interface control target=en0 connected wifiOrEthernet",
			"address=192.168.0.20/24 mtu=1500 rx=125.0MB tx=42.0MB",
			"source=darwin action=interface.disable locked",
			"control preview interface.disable locked dryRun=true",
			"risk=destructive privilege=admin confirm=disable interface",
			"adapter=macos command=sudo networksetup -setnetworkserviceenabled <service> off",
			"preflight=5 scope=selected interface or network service",
			"willModify=link-state persistentConfig=platform-dependent networkDrop=possible",
			"blocked=disabled-by-default",
		]);
	});

	test("previews selected interface state proposals before dispatch", () => {
		const action = getActionCatalog().find(
			(candidate) => candidate.id === "interface.proposal.disable",
		);
		const selectedInterface: NetworkInterfaceSummary = {
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.0.20",
			ipv6: "fe80::1",
			ipv4Cidr: "192.168.0.20/24",
			ipv6Cidr: "fe80::1/64",
			netmask: "255.255.255.0",
			mac: "aa:bb:cc:dd:ee:ff",
			mtu: 1500,
			rxBytes: 125000000,
			txBytes: 42000000,
			rxPackets: 9000,
			txPackets: 7100,
		};

		expect(
			formatCommandPaletteActionPreviewRows(action, {
				selectedInterface,
				selectedInterfacePlatform: "darwin",
				primaryInterfaceName: "en0",
				macosServiceNamesByDevice: { en0: "Wi-Fi" },
			}),
		).toEqual([
			"palette dispatch=interface.proposal.disable opens=interfaces",
			"selected=en0 status=ready proposal=interface.disable",
			"status=ready action=interface.disable locked enabled=false",
			"target=en0 kind=wifiOrEthernet primary=yes platform=darwin",
			"address ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff mtu=1500",
			"transition current=connected desired=disconnected",
			"risk=write privilege=admin confirm=disable interface",
			"controlTarget kind=network-service label=Wi-Fi confidence=exact source=networksetup-hardware-port-map",
			"controlCommand=sudo networksetup -setnetworkserviceenabled Wi-Fi off",
			"dryRun status=blocked policy=proposal-only adapterDryRun=unavailable willExecute=false",
			"dryRunCommand=sudo networksetup -setnetworkserviceenabled Wi-Fi off",
			"dryRunReason=interface-execution-disabled blockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
			'confirmation status=required phrase=disable interface typed="" confirmed=false',
			"confirmationTarget=Wi-Fi willExecute=false",
			"confirmationReason=confirmation-not-opened blockers=confirmation-required,interface-execution-disabled,mutation-controls-disabled",
			"PREFLIGHT",
			"scope=interface target=en0",
			"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
			"willModify=interface-link-state serviceOrAdapter=network-service controlTarget=Wi-Fi",
			"targetResolution=mapped BSD device en0 to network service Wi-Fi",
			"requires=selected-interface admin confirmation dry-run-policy",
			"confirmationRequired=disable interface confirmed=false willExecute=false",
			"adapterDryRun=unavailable policy=proposal-only willExecute=false",
			"dryRunBlockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
			"rollback=restore previous interface state from current snapshot",
			"execution=disabled no interface state will be changed",
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

	test("classifies palette navigation, dismissal, commands, and no-op input", () => {
		const actions = getActionCatalog();

		expect(
			prepareCommandPaletteInput({
				actions,
				state: { active: true, selectedIndex: 999, query: "" },
				input: "j",
			}),
		).toMatchObject({
			kind: "navigation",
			state: { active: true, selectedIndex: 0, query: "" },
		});
		expect(
			prepareCommandPaletteInput({
				actions,
				state: openCommandPalette(),
				input: "q",
			}),
		).toEqual({
			kind: "dismiss",
			state: { active: false, selectedIndex: 0, query: "" },
			notice: { level: "info", message: "command palette closed" },
		});
		expect(
			prepareCommandPaletteInput({
				actions,
				state: openCommandPalette(),
				input: "\r",
				return: true,
			}),
		).toMatchObject({ kind: "command", command: { kind: "run-action" } });
		expect(
			prepareCommandPaletteInput({
				actions,
				state: { active: false, selectedIndex: 0, query: "" },
				input: "x",
			}),
		).toEqual({
			kind: "no-op",
			state: { active: false, selectedIndex: 0, query: "" },
		});
		expect(
			prepareCommandPaletteInput({
				actions,
				state: openCommandPalette(),
				input: "\u0003",
			}),
		).toEqual({
			kind: "no-op",
			state: { active: true, selectedIndex: 0, query: "" },
		});
	});
});
