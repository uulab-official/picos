import { describe, expect, test } from "bun:test";
import { getActionCatalog } from "../src/core/actions";
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
		state = appendCommandPaletteQuery(state, "route");

		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(state.query).toBe("route");
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
