import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createConsoleAuditExportPlan,
	formatConsoleAuditLog,
	parseConsoleAuditLog,
	readLatestConsoleAuditExport,
	writeConsoleAuditExport,
} from "../src/core/auditLog";

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
});
