import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	appendCleanupHandoffHistory,
	archiveCleanupHandoffHistoryExport,
	createCleanupHandoffActionPlan,
	createCleanupHandoffDismissPlan,
	createCleanupHandoffHistory,
	createCleanupHandoffHistoryExportArchivePlan,
	createCleanupHandoffHistoryExportPlan,
	createCleanupHandoffReopenPlan,
	createCleanupJumpAudit,
	createCleanupJumpAuditFromHistory,
	createCleanupShelfIndex,
	formatCleanupHandoffActionRows,
	formatCleanupHandoffDismissRows,
	formatCleanupHandoffHistoryExport,
	formatCleanupHandoffHistoryExportArchiveIndexRows,
	formatCleanupHandoffHistoryExportArchiveRows,
	formatCleanupHandoffHistoryExportIndexRows,
	formatCleanupHandoffHistoryIndexRows,
	formatCleanupHandoffHistoryRows,
	formatCleanupHandoffReopenRows,
	formatCleanupJumpAuditRows,
	formatCleanupShelfDetailRows,
	formatCleanupShelfIndexRows,
	getSelectedCleanupHandoffHistory,
	getSelectedCleanupHandoffHistoryExport,
	getSelectedCleanupHandoffHistoryExportArchive,
	getSelectedCleanupShelf,
	moveCleanupHandoffHistorySelection,
	moveCleanupShelfSelection,
	parseCleanupHandoffHistoryExport,
	readCleanupHandoffHistoryExportArchiveIndex,
	readCleanupHandoffHistoryExportIndex,
	readLatestCleanupHandoffHistoryExport,
	writeCleanupHandoffHistoryExport,
} from "../src/tui/cleanupIndex";

describe("cleanup shelf index", () => {
	test("summarizes cleanable preset shelves for status rows", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443", "node"],
			customToolTargetPresets: [
				{ actionId: "tools.dns", target: "example.com" },
				{ actionId: "network.connect", target: "api.github.com:443" },
			],
			logProfiles: [{ level: "warn", query: "kernel" }],
			logSearchPresets: ["kernel", "dns"],
			portFilterPresets: ["3000"],
			routeFilterPresets: ["utun", "default"],
			timelineSearchPresets: [],
			toolHistoryFilterPresets: ["fail", "dns"],
		});

		expect(index).toEqual({
			activeShelves: 6,
			totalItems: 12,
			shelves: [
				{
					id: "logs",
					label: "Logs presets",
					count: 3,
					screen: "logs",
					workspace: "Logs",
					shortcut: "D",
					confirmationPhrase: "clear logs",
					detail: "search=2 profiles=1",
				},
				{
					id: "routes",
					label: "Route filters",
					count: 2,
					screen: "routes",
					workspace: "Routes",
					shortcut: "D",
					confirmationPhrase: "clear routes",
					detail: "filters=2",
				},
				{
					id: "connections",
					label: "Connection filters",
					count: 2,
					screen: "connections",
					workspace: "Connections",
					shortcut: "D",
					confirmationPhrase: "clear connections",
					detail: "filters=2",
				},
				{
					id: "ports",
					label: "Port filters",
					count: 1,
					screen: "ports",
					workspace: "Ports",
					shortcut: "D",
					confirmationPhrase: "clear ports",
					detail: "filters=1",
				},
				{
					id: "timeline",
					label: "Timeline searches",
					count: 0,
					screen: "timeline",
					workspace: "Timeline",
					shortcut: "D",
					confirmationPhrase: "clear timeline",
					detail: "searches=0",
				},
				{
					id: "tools-history",
					label: "Tools history filters",
					count: 2,
					screen: "tools",
					workspace: "Tools",
					shortcut: "C",
					confirmationPhrase: "clear tools history",
					detail: "filters=2",
				},
				{
					id: "tool-targets",
					label: "Tool targets",
					count: 2,
					screen: "tools",
					workspace: "Tools",
					shortcut: "D",
					confirmationPhrase: "delete <action id>",
					detail: "saved-targets=2",
				},
			],
		});
		expect(formatCleanupShelfIndexRows(index, 8)).toEqual([
			"CLEANUP INDEX active=6 items=12",
			"Logs        D  count=3  clear logs  search=2 profiles=1",
			"Routes      D  count=2  clear routes  filters=2",
			"Connections D  count=2  clear connections  filters=2",
			"Ports       D  count=1  clear ports  filters=1",
			"Timeline    D  count=0  clear timeline  searches=0",
			"Tools       C  count=2  clear tools history  filters=2",
			"Tools       D  count=2  delete <action id>  saved-targets=2",
		]);
	});

	test("keeps an empty cleanup index useful", () => {
		const index = createCleanupShelfIndex({});

		expect(index.activeShelves).toBe(0);
		expect(index.totalItems).toBe(0);
		expect(getSelectedCleanupShelf(index, 0)).toBeUndefined();
		expect(moveCleanupShelfSelection(index, 0, "next")).toBe(0);
		expect(formatCleanupShelfIndexRows(index, 3)).toEqual([
			"CLEANUP INDEX active=0 items=0",
			"no saved preset shelves to clean",
		]);
	});

	test("selects active cleanup shelves for status handoff", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
			customToolTargetPresets: [
				{ actionId: "tools.dns", target: "example.com" },
			],
			logSearchPresets: ["kernel"],
			portFilterPresets: ["3000"],
			routeFilterPresets: ["default"],
			timelineSearchPresets: [],
			toolHistoryFilterPresets: ["dns"],
		});

		expect(getSelectedCleanupShelf(index, 0)?.screen).toBe("logs");
		expect(getSelectedCleanupShelf(index, 4)?.id).toBe("tools-history");
		expect(getSelectedCleanupShelf(index, 99)?.id).toBe("tool-targets");
		expect(moveCleanupShelfSelection(index, 4, "next")).toBe(5);
		expect(moveCleanupShelfSelection(index, 5, "next")).toBe(0);
		expect(moveCleanupShelfSelection(index, 0, "previous")).toBe(5);
		expect(formatCleanupShelfIndexRows(index, 8, 4)).toEqual([
			"CLEANUP INDEX active=6 items=6 selected=Tools",
			"  Logs        D  count=1  clear logs  search=1 profiles=0",
			"  Routes      D  count=1  clear routes  filters=1",
			"  Connections D  count=1  clear connections  filters=1",
			"  Ports       D  count=1  clear ports  filters=1",
			"  Timeline    D  count=0  clear timeline  searches=0",
			"> Tools       C  count=1  clear tools history  filters=1",
			"  Tools       D  count=1  delete <action id>  saved-targets=1",
		]);
		expect(formatCleanupShelfDetailRows(index, 4)).toEqual([
			"CLEANUP DETAIL Tools history filters",
			"target=Tools screen=tools shortcut=C",
			"items=1 detail=filters=1",
			"confirm=clear tools history",
			"enter jumps to Tools; press C then type exact phrase",
		]);
	});

	test("keeps cleanup detail pane useful with no active shelf", () => {
		const index = createCleanupShelfIndex({
			timelineSearchPresets: [""],
		});

		expect(formatCleanupShelfDetailRows(index, 0)).toEqual([
			"CLEANUP DETAIL none",
			"no active cleanup shelf selected",
			"save presets first, then return to Status",
		]);
	});

	test("creates cleanup jump audit rows for destination workspaces", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443", "node"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		expect(shelf?.id).toBe("connections");
		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);

		expect(audit).toEqual({
			id: "connections",
			label: "Connection filters",
			screen: "connections",
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			count: 2,
			detail: "filters=2",
		});
		expect(formatCleanupJumpAuditRows(audit)).toEqual([
			"CLEANUP HANDOFF Connection filters",
			"from=Status target=Connections shortcut=D count=2",
			"confirm=clear connections detail=filters=2",
		]);
		expect(formatCleanupJumpAuditRows(undefined)).toEqual([]);
	});

	test("creates actionable cleanup prompt plans only on destination screens", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const plan = createCleanupHandoffActionPlan(audit, "connections");

		expect(plan).toEqual({
			id: "connections",
			label: "Connection filters",
			screen: "connections",
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
		});
		expect(createCleanupHandoffActionPlan(audit, "ports")).toBeUndefined();
		expect(
			createCleanupHandoffActionPlan(undefined, "connections"),
		).toBeUndefined();
		expect(formatCleanupHandoffActionRows(plan)).toEqual([
			"CLEANUP ACTION open prompt",
			"enter opens Connections cleanup shortcut=D",
			"confirm=clear connections",
		]);
		expect(formatCleanupHandoffActionRows(undefined)).toEqual([]);
	});

	test("creates dismiss plans so handoffs can restore normal workspace controls", () => {
		const index = createCleanupShelfIndex({
			portFilterPresets: ["3000"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const plan = createCleanupHandoffDismissPlan(audit, "ports");

		expect(plan).toEqual({
			label: "Port filters",
			screen: "ports",
			workspace: "Ports",
		});
		expect(
			createCleanupHandoffDismissPlan(audit, "connections"),
		).toBeUndefined();
		expect(createCleanupHandoffDismissPlan(undefined, "ports")).toBeUndefined();
		expect(formatCleanupHandoffDismissRows(plan)).toEqual([
			"CLEANUP DISMISS esc clears handoff",
			"normal Ports enter behavior resumes",
		]);
		expect(formatCleanupHandoffDismissRows(undefined)).toEqual([]);
	});

	test("formats the latest cleanup handoff history for Status auditing", () => {
		const index = createCleanupShelfIndex({
			routeFilterPresets: ["default"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const audit = createCleanupJumpAudit(shelf);
		const dismissed = createCleanupHandoffHistory(audit, "dismissed");
		const promptOpened = createCleanupHandoffHistory(audit, "prompt-opened");

		expect(dismissed).toEqual({
			id: "routes",
			label: "Route filters",
			workspace: "Routes",
			screen: "routes",
			shortcut: "D",
			confirmationPhrase: "clear routes",
			count: 1,
			detail: "filters=1",
			outcome: "dismissed",
		});
		expect(formatCleanupHandoffHistoryRows(dismissed)).toEqual([
			"CLEANUP HISTORY dismissed Route filters",
			"target=Routes shortcut=D confirm=clear routes",
			"detail=filters=1 normal controls restored",
		]);
		expect(formatCleanupHandoffHistoryRows(promptOpened)).toEqual([
			"CLEANUP HISTORY prompt-opened Route filters",
			"target=Routes shortcut=D confirm=clear routes",
			"detail=filters=1 exact-confirm prompt opened",
		]);
		expect(formatCleanupHandoffHistoryRows(undefined)).toEqual([]);
	});

	test("keeps cleanup handoff history bounded and selectable", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
			portFilterPresets: ["3000"],
			routeFilterPresets: ["default"],
		});
		const route = index.shelves.find((shelf) => shelf.id === "routes");
		const connection = index.shelves.find(
			(shelf) => shelf.id === "connections",
		);
		const port = index.shelves.find((shelf) => shelf.id === "ports");

		if (!route || !connection || !port) {
			throw new Error("expected cleanup shelves");
		}

		const histories = [
			createCleanupHandoffHistory(createCleanupJumpAudit(route), "dismissed"),
			createCleanupHandoffHistory(
				createCleanupJumpAudit(connection),
				"prompt-opened",
			),
			createCleanupHandoffHistory(createCleanupJumpAudit(port), "dismissed"),
		].reduce(
			(current, history) => appendCleanupHandoffHistory(current, history, 2),
			[] as ReturnType<typeof createCleanupHandoffHistory>[],
		);

		expect(histories.map((history) => history.label)).toEqual([
			"Port filters",
			"Connection filters",
		]);
		expect(getSelectedCleanupHandoffHistory(histories, 99)?.label).toBe(
			"Connection filters",
		);
		expect(moveCleanupHandoffHistorySelection(histories, 1, "next")).toBe(0);
		expect(moveCleanupHandoffHistorySelection(histories, 0, "previous")).toBe(
			1,
		);
		expect(formatCleanupHandoffHistoryIndexRows(histories, 1, 4)).toEqual([
			"CLEANUP HISTORY entries=2 selected=Connections",
			"  dismissed     Ports       D  clear ports  filters=1",
			"> prompt-opened Connections D  clear connections  filters=1",
		]);
		expect(formatCleanupHandoffHistoryIndexRows([], 0, 3)).toEqual([
			"CLEANUP HISTORY entries=0",
			"no cleanup handoff history yet",
		]);
	});

	test("creates cleanup handoff reopen plans from selected history", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
		});
		const shelf = getSelectedCleanupShelf(index, 0);

		if (!shelf) {
			throw new Error("expected cleanup shelf");
		}

		const history = createCleanupHandoffHistory(
			createCleanupJumpAudit(shelf),
			"dismissed",
		);
		const plan = createCleanupHandoffReopenPlan(history);

		expect(plan).toEqual({
			id: "connections",
			label: "Connection filters",
			workspace: "Connections",
			screen: "connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			count: 1,
			detail: "filters=1",
		});
		expect(createCleanupJumpAuditFromHistory(history)).toEqual({
			id: "connections",
			label: "Connection filters",
			workspace: "Connections",
			screen: "connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			count: 1,
			detail: "filters=1",
		});
		expect(formatCleanupHandoffReopenRows(plan)).toEqual([
			"CLEANUP REOPEN Connection filters",
			"R jumps to Connections and restores handoff",
			"shortcut=D confirm=clear connections detail=filters=1 count=1",
		]);
		expect(createCleanupHandoffReopenPlan(undefined)).toBeUndefined();
		expect(formatCleanupHandoffReopenRows(undefined)).toEqual([]);
	});

	test("creates durable cleanup handoff history export plans", () => {
		const index = createCleanupShelfIndex({
			connectionFilterPresets: ["443"],
			routeFilterPresets: ["default"],
		});
		const route = index.shelves.find((shelf) => shelf.id === "routes");
		const connection = index.shelves.find(
			(shelf) => shelf.id === "connections",
		);

		if (!route || !connection) {
			throw new Error("expected cleanup shelves");
		}

		const histories = [
			createCleanupHandoffHistory(createCleanupJumpAudit(route), "dismissed"),
			createCleanupHandoffHistory(
				createCleanupJumpAudit(connection),
				"prompt-opened",
			),
		].reduce(
			(current, history) => appendCleanupHandoffHistory(current, history),
			[] as ReturnType<typeof createCleanupHandoffHistory>[],
		);

		expect(
			createCleanupHandoffHistoryExportPlan(histories, 1, {
				baseDir: "/Users/bonjin/.config/picos",
				scope: "selected",
				generatedAt: new Date("2026-07-01T01:00:00.000Z"),
			}),
		).toEqual({
			path: "/Users/bonjin/.config/picos/cleanup/picos-cleanup-selected-2026-07-01T010000000Z.md",
			content: [
				"# picos cleanup handoff history",
				"generatedAt=2026-07-01T01:00:00.000Z",
				"scope=selected",
				"entries=1",
				"",
				"## Route filters",
				"outcome=dismissed",
				"workspace=Routes screen=routes shortcut=D",
				"confirm=clear routes count=1 detail=filters=1",
				"",
			].join("\n"),
			itemCount: 1,
			scope: "selected",
		});
		expect(
			formatCleanupHandoffHistoryExport(histories, {
				scope: "all",
				generatedAt: "2026-07-01T01:00:00.000Z",
			}),
		).toContain("entries=2");
		expect(
			createCleanupHandoffHistoryExportPlan([], 0, {
				baseDir: "/Users/bonjin/.config/picos",
				scope: "all",
			}),
		).toBeUndefined();
	});

	test("writes cleanup handoff history export files", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-cleanup-export-"));
		try {
			const index = createCleanupShelfIndex({
				portFilterPresets: ["3000"],
			});
			const shelf = getSelectedCleanupShelf(index, 0);

			if (!shelf) {
				throw new Error("expected cleanup shelf");
			}

			const plan = createCleanupHandoffHistoryExportPlan(
				[
					createCleanupHandoffHistory(
						createCleanupJumpAudit(shelf),
						"dismissed",
					),
				],
				0,
				{
					baseDir: root,
					scope: "all",
					generatedAt: new Date("2026-07-01T01:00:00.000Z"),
				},
			);

			if (!plan) {
				throw new Error("expected cleanup history export plan");
			}

			const written = await writeCleanupHandoffHistoryExport(plan);

			expect(written).toEqual(plan);
			expect(await readFile(written.path, "utf8")).toContain("Port filters");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("parses cleanup handoff exports into timeline events", () => {
		expect(
			parseCleanupHandoffHistoryExport(
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-07-01T01:00:00.000Z",
					"scope=all",
					"entries=1",
					"",
					"## Route filters",
					"outcome=dismissed",
					"workspace=Routes screen=routes shortcut=D",
					"confirm=clear routes count=1 detail=filters=1",
					"",
				].join("\n"),
			),
		).toEqual([
			{
				id: "persisted-cleanup-01:00:00-info-route-filters-dismissed",
				level: "info",
				time: "01:00:00",
				message:
					"cleanup history dismissed Route filters workspace=Routes screen=routes shortcut=D confirm=clear routes count=1 detail=filters=1",
			},
		]);
	});

	test("reads the latest cleanup handoff export from the config cleanup directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-cleanup-read-"));
		try {
			const cleanupDir = join(root, "cleanup");
			await mkdir(cleanupDir, { recursive: true });
			await writeFile(
				join(cleanupDir, "picos-cleanup-all-2026-06-30T030000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-06-30T03:00:00.000Z",
					"scope=all",
					"entries=1",
					"",
					"## Old filters",
					"outcome=dismissed",
					"workspace=Routes screen=routes shortcut=D",
					"confirm=clear routes count=1 detail=filters=1",
					"",
				].join("\n"),
				"utf8",
			);
			await writeFile(
				join(cleanupDir, "picos-cleanup-all-2026-07-01T010000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-07-01T01:00:00.000Z",
					"scope=all",
					"entries=1",
					"",
					"## Port filters",
					"outcome=prompt-opened",
					"workspace=Ports screen=ports shortcut=D",
					"confirm=clear ports count=1 detail=filters=1",
					"",
				].join("\n"),
				"utf8",
			);

			expect(await readLatestCleanupHandoffHistoryExport(root)).toEqual({
				path: join(cleanupDir, "picos-cleanup-all-2026-07-01T010000000Z.md"),
				events: [
					{
						id: "persisted-cleanup-01:00:00-info-port-filters-prompt-opened",
						level: "info",
						time: "01:00:00",
						message:
							"cleanup history prompt-opened Port filters workspace=Ports screen=ports shortcut=D confirm=clear ports count=1 detail=filters=1",
					},
				],
			});
			expect(
				await readLatestCleanupHandoffHistoryExport(join(root, "missing")),
			).toBeUndefined();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("indexes cleanup handoff exports for Status browsing", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-cleanup-index-"));
		try {
			const cleanupDir = join(root, "cleanup");
			await mkdir(cleanupDir, { recursive: true });
			await writeFile(
				join(cleanupDir, "picos-cleanup-all-2026-06-30T030000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-06-30T03:00:00.000Z",
					"scope=all",
					"entries=2",
					"",
				].join("\n"),
				"utf8",
			);
			await writeFile(
				join(cleanupDir, "picos-cleanup-selected-2026-07-01T010000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-07-01T01:00:00.000Z",
					"scope=selected",
					"entries=1",
					"",
				].join("\n"),
				"utf8",
			);

			const index = await readCleanupHandoffHistoryExportIndex(root);

			expect(index.items.map((item) => item.fileName)).toEqual([
				"picos-cleanup-selected-2026-07-01T010000000Z.md",
				"picos-cleanup-all-2026-06-30T030000000Z.md",
			]);
			expect(index.items[0]).toMatchObject({
				scope: "selected",
				entryCount: 1,
				generatedAt: "2026-07-01T01:00:00.000Z",
			});
			expect(getSelectedCleanupHandoffHistoryExport(index, 99)?.scope).toBe(
				"all",
			);
			expect(formatCleanupHandoffHistoryExportIndexRows(index, 0, 4)).toEqual([
				`CLEANUP EXPORTS 2 base=${root}`,
				"> selected entries=1 2026-07-01T01:00:00.000Z",
				"  all      entries=2 2026-06-30T03:00:00.000Z",
				`path=${join(
					cleanupDir,
					"picos-cleanup-selected-2026-07-01T010000000Z.md",
				)}`,
			]);
			expect(
				formatCleanupHandoffHistoryExportIndexRows(
					{ baseDir: root, items: [] },
					0,
					3,
				),
			).toEqual([`CLEANUP EXPORTS 0 base=${root}`, "no cleanup exports yet"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("creates exact-confirm archive plans for cleanup handoff exports", () => {
		const root = "/Users/me/.config/picos";
		const path = join(
			root,
			"cleanup",
			"picos-cleanup-all-2026-07-01T010000000Z.md",
		);
		const locked = createCleanupHandoffHistoryExportArchivePlan(root, path);

		expect(locked).toEqual({
			sourcePath: path,
			archivedPath: join(
				root,
				"cleanup",
				"archive",
				"picos-cleanup-all-2026-07-01T010000000Z.md",
			),
			fileName: "picos-cleanup-all-2026-07-01T010000000Z.md",
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "archive cleanup export",
			confirmed: false,
			enabled: false,
			reason: "type archive cleanup export to move selected cleanup export",
		});
		expect(
			createCleanupHandoffHistoryExportArchivePlan(root, path, {
				confirmation: "archive cleanup export",
			}),
		).toMatchObject({
			confirmed: true,
			enabled: true,
			reason: "confirmed",
		});
		expect(
			createCleanupHandoffHistoryExportArchivePlan(
				root,
				join(root, "cleanup", "notes.md"),
				{ confirmation: "archive cleanup export" },
			),
		).toMatchObject({
			enabled: false,
			reason: "cleanup export archive is limited to picos-owned export files",
		});
		expect(formatCleanupHandoffHistoryExportArchiveRows(locked)).toEqual([
			"CLEANUP EXPORT ARCHIVE picos-cleanup-all-2026-07-01T010000000Z.md",
			"risk=write privilege=user confirmed=false",
			"confirm archive cleanup export locked",
			`from=${path}`,
			`to=${join(
				root,
				"cleanup",
				"archive",
				"picos-cleanup-all-2026-07-01T010000000Z.md",
			)}`,
			"reason=type archive cleanup export to move selected cleanup export",
		]);
	});

	test("archives cleanup handoff export files only after exact confirmation", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-cleanup-archive-"));
		try {
			const cleanupDir = join(root, "cleanup");
			const fileName = "picos-cleanup-all-2026-07-01T010000000Z.md";
			const path = join(cleanupDir, fileName);
			await mkdir(cleanupDir, { recursive: true });
			await writeFile(
				path,
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-07-01T01:00:00.000Z",
					"scope=all",
					"entries=1",
					"",
				].join("\n"),
				"utf8",
			);

			const blocked = await archiveCleanupHandoffHistoryExport(
				createCleanupHandoffHistoryExportArchivePlan(root, path),
			);

			expect(blocked).toMatchObject({
				status: "blocked",
				sourcePath: path,
				message:
					"cleanup export archive is locked: type archive cleanup export to move selected cleanup export",
			});
			expect(await readFile(path, "utf8")).toContain("entries=1");

			const archived = await archiveCleanupHandoffHistoryExport(
				createCleanupHandoffHistoryExportArchivePlan(root, path, {
					confirmation: "archive cleanup export",
				}),
			);

			expect(archived).toEqual({
				status: "archived",
				sourcePath: path,
				archivedPath: join(cleanupDir, "archive", fileName),
				message: `archived ${fileName}`,
			});
			expect(await readFile(archived.archivedPath, "utf8")).toContain(
				"entries=1",
			);
			expect((await readCleanupHandoffHistoryExportIndex(root)).items).toEqual(
				[],
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("indexes archived cleanup handoff exports for Status browsing", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-cleanup-archive-index-"));
		try {
			const archiveDir = join(root, "cleanup", "archive");
			await mkdir(archiveDir, { recursive: true });
			await writeFile(
				join(archiveDir, "picos-cleanup-all-2026-06-30T030000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-06-30T03:00:00.000Z",
					"scope=all",
					"entries=2",
					"",
				].join("\n"),
				"utf8",
			);
			await writeFile(
				join(archiveDir, "picos-cleanup-selected-2026-07-01T010000000Z.md"),
				[
					"# picos cleanup handoff history",
					"generatedAt=2026-07-01T01:00:00.000Z",
					"scope=selected",
					"entries=1",
					"",
				].join("\n"),
				"utf8",
			);

			const index = await readCleanupHandoffHistoryExportArchiveIndex(root);

			expect(index.items.map((item) => item.fileName)).toEqual([
				"picos-cleanup-selected-2026-07-01T010000000Z.md",
				"picos-cleanup-all-2026-06-30T030000000Z.md",
			]);
			expect(
				getSelectedCleanupHandoffHistoryExportArchive(index, 99)?.scope,
			).toBe("all");
			expect(
				formatCleanupHandoffHistoryExportArchiveIndexRows(index, 0, 4),
			).toEqual([
				`CLEANUP ARCHIVE 2 base=${root}`,
				"> selected entries=1 2026-07-01T01:00:00.000Z",
				"  all      entries=2 2026-06-30T03:00:00.000Z",
				`path=${join(
					archiveDir,
					"picos-cleanup-selected-2026-07-01T010000000Z.md",
				)}`,
			]);
			expect(
				formatCleanupHandoffHistoryExportArchiveIndexRows(
					{ baseDir: root, items: [] },
					0,
					3,
				),
			).toEqual([
				`CLEANUP ARCHIVE 0 base=${root}`,
				"no archived cleanup exports yet",
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
