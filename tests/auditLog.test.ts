import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	archiveConsoleAuditExport,
	createConsoleAuditArchiveRetentionPlan,
	createConsoleAuditExportArchivePlan,
	createConsoleAuditExportPlan,
	formatConsoleAuditArchiveRetentionRows,
	formatConsoleAuditExportArchiveIndexRows,
	formatConsoleAuditExportArchiveRows,
	formatConsoleAuditExportIndexRows,
	formatConsoleAuditLog,
	getSelectedConsoleAuditExport,
	parseConsoleAuditLog,
	pruneConsoleAuditArchive,
	readConsoleAuditExportArchiveIndex,
	readConsoleAuditExportIndex,
	readLatestConsoleAuditExport,
	writeConsoleAuditExport,
} from "../src/core/auditLog";
import type { FileOpenOrigin } from "../src/core/fileOpen";

const timelineOrigin: FileOpenOrigin = {
	kind: "config-shelf",
	target: "logs",
	label: "Logs",
	scope: "logs.profiles",
};

describe("console audit export", () => {
	test("formats console events as a durable audit log", () => {
		expect(
			formatConsoleAuditLog(
				[
					{
						id: "12:00:00-warn-clipboard-locked",
						level: "warn",
						time: "12:00:00",
						message: "clipboard locked selected port via pbcopy",
					},
					{
						id: "12:00:05-ok-clipboard-copied",
						level: "ok",
						time: "12:00:05",
						message: "clipboard copied selected port via pbcopy",
					},
				],
				{
					generatedAt: "2026-06-30T03:00:00.000Z",
				},
			),
		).toBe(
			[
				"# picos audit log",
				"generatedAt=2026-06-30T03:00:00.000Z",
				"events=2",
				"",
				"[12:00:00] WARN clipboard locked selected port via pbcopy",
				"[12:00:05] OK   clipboard copied selected port via pbcopy",
				"",
			].join("\n"),
		);
	});

	test("creates an export plan with a stable audit file path", () => {
		expect(
			createConsoleAuditExportPlan(
				[
					{
						id: "12:00:00-info-boot",
						level: "info",
						time: "12:00:00",
						message: "picos console booted",
					},
				],
				{
					baseDir: "/Users/bonjin/.config/picos",
					generatedAt: new Date("2026-06-30T03:00:00.000Z"),
				},
			),
		).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-2026-06-30T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-06-30T03:00:00.000Z",
				"events=1",
				"",
				"[12:00:00] INFO picos console booted",
				"",
			].join("\n"),
			eventCount: 1,
		});
	});

	test("creates scoped export plans for searched timeline events", () => {
		expect(
			createConsoleAuditExportPlan(
				[
					{
						id: "12:00:00-info-network",
						level: "info",
						time: "12:00:00",
						message: "network public ip changed",
					},
				],
				{
					baseDir: "/Users/bonjin/.config/picos",
					generatedAt: new Date("2026-06-30T03:00:00.000Z"),
					scope: "filtered",
					query: "network",
				},
			),
		).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-06-30T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-06-30T03:00:00.000Z",
				"scope=filtered",
				"query=network",
				"events=1",
				"",
				"[12:00:00] INFO network public ip changed",
				"",
			].join("\n"),
			eventCount: 1,
			scope: "filtered",
			query: "network",
		});
	});

	test("writes config-origin metadata into audit exports", () => {
		const plan = createConsoleAuditExportPlan(
			[
				{
					id: "12:00:00-info-logs",
					level: "info",
					time: "12:00:00",
					message: "logs profile opened",
				},
			],
			{
				baseDir: "/Users/bonjin/.config/picos",
				generatedAt: new Date("2026-07-01T03:00:00.000Z"),
				origin: timelineOrigin,
				scope: "selected",
			},
		);

		expect(plan.origin).toEqual(timelineOrigin);
		expect(plan.content).toContain("originKind=config-shelf\n");
		expect(plan.content).toContain("originTarget=logs\n");
		expect(plan.content).toContain("originLabel=Logs\n");
		expect(plan.content).toContain("originScope=logs.profiles\n");
	});

	test("writes audit export files and creates the audit directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-"));
		try {
			const plan = createConsoleAuditExportPlan(
				[
					{
						id: "12:00:00-warn-clipboard-locked",
						level: "warn",
						time: "12:00:00",
						message: "clipboard locked selected port via pbcopy",
					},
				],
				{
					baseDir: root,
					generatedAt: new Date("2026-06-30T03:00:00.000Z"),
				},
			);

			const written = await writeConsoleAuditExport(plan);

			expect(written).toEqual(plan);
			expect(await readFile(plan.path, "utf8")).toContain(
				"clipboard locked selected port via pbcopy",
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("parses exported audit log content back into timeline events", () => {
		expect(
			parseConsoleAuditLog(
				[
					"# picos audit log",
					"generatedAt=2026-06-30T03:00:00.000Z",
					"events=2",
					"",
					"[12:00:00] WARN clipboard locked selected port via pbcopy",
					"[12:00:05] OK   clipboard copied selected port via pbcopy",
					"",
				].join("\n"),
			),
		).toEqual([
			{
				id: "persisted-12:00:00-warn-clipboard-locked-selected-port-via-pbcopy",
				level: "warn",
				time: "12:00:00",
				message: "clipboard locked selected port via pbcopy",
			},
			{
				id: "persisted-12:00:05-ok-clipboard-copied-selected-port-via-pbcopy",
				level: "ok",
				time: "12:00:05",
				message: "clipboard copied selected port via pbcopy",
			},
		]);
	});

	test("reads the latest exported audit log from the config audit directory", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-read-"));
		try {
			const auditDir = join(root, "audit");
			await mkdir(auditDir, { recursive: true });
			await writeFile(
				join(auditDir, "picos-audit-2026-06-29T030000000Z.log"),
				formatConsoleAuditLog(
					[
						{
							id: "old",
							level: "info",
							time: "11:00:00",
							message: "old event",
						},
					],
					{ generatedAt: "2026-06-29T03:00:00.000Z" },
				),
				"utf8",
			);
			await writeConsoleAuditExport({
				path: join(auditDir, "picos-audit-2026-06-30T030000000Z.log"),
				content: formatConsoleAuditLog(
					[
						{
							id: "new",
							level: "warn",
							time: "12:00:00",
							message: "clipboard failed selected port via xclip",
						},
					],
					{ generatedAt: "2026-06-30T03:00:00.000Z" },
				),
				eventCount: 1,
			});

			expect(await readLatestConsoleAuditExport(root)).toEqual({
				path: join(auditDir, "picos-audit-2026-06-30T030000000Z.log"),
				events: [
					{
						id: "persisted-12:00:00-warn-clipboard-failed-selected-port-via-xclip",
						level: "warn",
						time: "12:00:00",
						message: "clipboard failed selected port via xclip",
					},
				],
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("indexes exported audit logs newest first for Status browsing", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-index-"));
		try {
			await mkdir(join(root, "audit"), { recursive: true });
			await writeFile(
				join(root, "audit", "picos-audit-selected-2026-07-01T030000000Z.log"),
				[
					"# picos audit log",
					"generatedAt=2026-07-01T03:00:00.000Z",
					"scope=selected",
					"query=control",
					"originKind=config-shelf",
					"originTarget=logs",
					"originLabel=Logs",
					"originScope=logs.profiles",
					"events=1",
					"",
					"[12:00:06] WARN control preview dns.flush",
					"",
				].join("\n"),
			);
			await writeFile(
				join(root, "audit", "picos-audit-filtered-2026-07-01T020000000Z.log"),
				[
					"# picos audit log",
					"generatedAt=2026-07-01T02:00:00.000Z",
					"scope=filtered",
					"events=2",
					"",
				].join("\n"),
			);
			await writeFile(join(root, "audit", "notes.log"), "ignore me");

			const index = await readConsoleAuditExportIndex(root);

			expect(index.items.map((item) => item.fileName)).toEqual([
				"picos-audit-selected-2026-07-01T030000000Z.log",
				"picos-audit-filtered-2026-07-01T020000000Z.log",
			]);
			expect(index.items[0]).toMatchObject({
				entryCount: 1,
				generatedAt: "2026-07-01T03:00:00.000Z",
				query: "control",
				scope: "selected",
				origin: timelineOrigin,
			});
			expect(formatConsoleAuditExportIndexRows(index, 0, 4)).toEqual([
				`AUDIT EXPORTS 2 base=${root}`,
				"> selected events=1 2026-07-01T03:00:00.000Z query=control origin=Config>Logs scope=logs.profiles",
				"  filtered events=2 2026-07-01T02:00:00.000Z",
				`path=${join(
					root,
					"audit",
					"picos-audit-selected-2026-07-01T030000000Z.log",
				)}`,
			]);
			expect(getSelectedConsoleAuditExport(index, 99)?.scope).toBe("filtered");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("builds locked archive plans for picos-owned audit exports", () => {
		const root = "/Users/bonjin/.config/picos";
		const sourcePath = join(
			root,
			"audit",
			"picos-audit-selected-2026-07-01T030000000Z.log",
		);

		const plan = createConsoleAuditExportArchivePlan(root, sourcePath);

		expect(plan).toEqual({
			sourcePath,
			archivedPath: join(
				root,
				"audit",
				"archive",
				"picos-audit-selected-2026-07-01T030000000Z.log",
			),
			fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "archive audit export",
			confirmed: false,
			enabled: false,
			reason: "type archive audit export to move selected audit export",
		});
		expect(formatConsoleAuditExportArchiveRows(plan)).toEqual([
			"AUDIT EXPORT ARCHIVE picos-audit-selected-2026-07-01T030000000Z.log",
			"risk=write privilege=user confirmed=false",
			"confirm archive audit export locked",
			`from=${sourcePath}`,
			`to=${join(
				root,
				"audit",
				"archive",
				"picos-audit-selected-2026-07-01T030000000Z.log",
			)}`,
			"reason=type archive audit export to move selected audit export",
		]);

		expect(
			createConsoleAuditExportArchivePlan(
				root,
				"/tmp/picos-audit-selected-2026-07-01T030000000Z.log",
				{ confirmation: "archive audit export" },
			),
		).toMatchObject({
			enabled: false,
			reason:
				"audit export archive is limited to picos-owned audit export files",
		});
	});

	test("archives confirmed audit exports and keeps active index tidy", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-archive-"));
		try {
			await mkdir(join(root, "audit"), { recursive: true });
			const sourcePath = join(
				root,
				"audit",
				"picos-audit-selected-2026-07-01T030000000Z.log",
			);
			await writeFile(
				sourcePath,
				[
					"# picos audit log",
					"generatedAt=2026-07-01T03:00:00.000Z",
					"scope=selected",
					"events=1",
					"",
					"[12:00:06] WARN control preview dns.flush",
					"",
				].join("\n"),
				"utf8",
			);

			const locked = createConsoleAuditExportArchivePlan(root, sourcePath);
			expect(await archiveConsoleAuditExport(locked)).toEqual({
				status: "blocked",
				sourcePath,
				archivedPath: join(
					root,
					"audit",
					"archive",
					"picos-audit-selected-2026-07-01T030000000Z.log",
				),
				message:
					"audit export archive is locked: type archive audit export to move selected audit export",
			});
			expect((await readConsoleAuditExportIndex(root)).items).toHaveLength(1);

			const confirmed = createConsoleAuditExportArchivePlan(root, sourcePath, {
				confirmation: "archive audit export",
			});
			expect(await archiveConsoleAuditExport(confirmed)).toEqual({
				status: "archived",
				sourcePath,
				archivedPath: join(
					root,
					"audit",
					"archive",
					"picos-audit-selected-2026-07-01T030000000Z.log",
				),
				message:
					"archived audit export picos-audit-selected-2026-07-01T030000000Z.log",
			});

			expect((await readConsoleAuditExportIndex(root)).items).toEqual([]);
			expect((await readConsoleAuditExportArchiveIndex(root)).items).toEqual([
				expect.objectContaining({
					fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
					generatedAt: "2026-07-01T03:00:00.000Z",
					scope: "selected",
					entryCount: 1,
				}),
			]);
			expect(
				formatConsoleAuditExportArchiveIndexRows(
					await readConsoleAuditExportArchiveIndex(root),
					0,
					4,
				),
			).toEqual([
				`AUDIT ARCHIVE 1 base=${root}`,
				"> selected events=1 2026-07-01T03:00:00.000Z",
				`path=${join(
					root,
					"audit",
					"archive",
					"picos-audit-selected-2026-07-01T030000000Z.log",
				)}`,
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("previews archive retention before pruning old audit exports", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-retention-"));
		try {
			await mkdir(join(root, "audit", "archive"), { recursive: true });
			for (const stamp of [
				"2026-07-01T030000000Z",
				"2026-07-01T020000000Z",
				"2026-07-01T010000000Z",
			]) {
				await writeFile(
					join(root, "audit", "archive", `picos-audit-selected-${stamp}.log`),
					[
						"# picos audit log",
						`generatedAt=${stamp.replace(
							/T(\d{2})(\d{2})(\d{2})(\d{3})Z$/,
							"T$1:$2:$3.$4Z",
						)}`,
						"scope=selected",
						"events=1",
						"",
						"[12:00:06] WARN control preview dns.flush",
						"",
					].join("\n"),
					"utf8",
				);
			}

			const index = await readConsoleAuditExportArchiveIndex(root);
			const plan = createConsoleAuditArchiveRetentionPlan(index, {
				maxItems: 1,
			});

			expect(plan).toMatchObject({
				baseDir: root,
				maxItems: 1,
				risk: "destructive",
				privilege: "user",
				confirmationRequired: true,
				confirmationPhrase: "prune audit archive",
				confirmed: false,
				enabled: false,
				reason: "type prune audit archive to remove 2 archived audit exports",
			});
			expect(plan.retainedItems.map((item) => item.fileName)).toEqual([
				"picos-audit-selected-2026-07-01T030000000Z.log",
			]);
			expect(plan.candidateItems.map((item) => item.fileName)).toEqual([
				"picos-audit-selected-2026-07-01T020000000Z.log",
				"picos-audit-selected-2026-07-01T010000000Z.log",
			]);
			expect(formatConsoleAuditArchiveRetentionRows(plan)).toEqual([
				"AUDIT ARCHIVE RETENTION max=1 candidates=2",
				"risk=destructive privilege=user confirmed=false",
				"confirm prune audit archive locked",
				"keep picos-audit-selected-2026-07-01T030000000Z.log",
				"remove picos-audit-selected-2026-07-01T020000000Z.log",
				"remove picos-audit-selected-2026-07-01T010000000Z.log",
				"reason=type prune audit archive to remove 2 archived audit exports",
			]);

			expect(await pruneConsoleAuditArchive(plan)).toEqual({
				status: "blocked",
				removed: 0,
				removedPaths: [],
				message:
					"audit archive retention is locked: type prune audit archive to remove 2 archived audit exports",
			});
			expect(
				(await readConsoleAuditExportArchiveIndex(root)).items,
			).toHaveLength(3);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("prunes confirmed old audit archive exports inside the picos archive", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-audit-prune-"));
		try {
			await mkdir(join(root, "audit", "archive"), { recursive: true });
			for (const stamp of [
				"2026-07-01T030000000Z",
				"2026-07-01T020000000Z",
				"2026-07-01T010000000Z",
			]) {
				await writeFile(
					join(root, "audit", "archive", `picos-audit-selected-${stamp}.log`),
					[
						"# picos audit log",
						`generatedAt=${stamp.replace(
							/T(\d{2})(\d{2})(\d{2})(\d{3})Z$/,
							"T$1:$2:$3.$4Z",
						)}`,
						"scope=selected",
						"events=1",
						"",
					].join("\n"),
					"utf8",
				);
			}
			const index = await readConsoleAuditExportArchiveIndex(root);
			const plan = createConsoleAuditArchiveRetentionPlan(index, {
				maxItems: 1,
				confirmation: "prune audit archive",
			});

			expect(await pruneConsoleAuditArchive(plan)).toEqual({
				status: "pruned",
				removed: 2,
				removedPaths: [
					join(
						root,
						"audit",
						"archive",
						"picos-audit-selected-2026-07-01T020000000Z.log",
					),
					join(
						root,
						"audit",
						"archive",
						"picos-audit-selected-2026-07-01T010000000Z.log",
					),
				],
				message: "pruned 2 archived audit exports",
			});
			expect(
				(await readConsoleAuditExportArchiveIndex(root)).items.map(
					(item) => item.fileName,
				),
			).toEqual(["picos-audit-selected-2026-07-01T030000000Z.log"]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
