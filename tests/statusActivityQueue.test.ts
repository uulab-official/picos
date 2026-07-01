import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type ConsoleAuditExportIndex,
	readConsoleAuditExportIndex,
} from "../src/core/auditLog";
import {
	appendStatusActivityCopyIntentHistory,
	appendStatusActivityResultHistory,
	createStatusActivityCopyIntentAuditExportOpenPlan,
	createStatusActivityCopyIntentAuditExportPlan,
	createStatusActivityCopyIntentEvidenceFocusPlan,
	createStatusActivityCopyIntentEvidenceFocusResult,
	createStatusActivityCopyIntentEvidenceFocusTimelineSearch,
	createStatusActivityCopyIntentRecord,
	createStatusActivityCopyIntentTimelineSearch,
	createStatusActivityEnterPlan,
	createTimelineEvidenceTrailAuditExportOpenPlan,
	createTimelineEvidenceTrailAuditExportPlan,
	createTimelineEvidenceTrailStatusActivityResult,
	createTimelineEvidenceTrailTimelineSearch,
	formatStatusActivityCopyIntentAuditMessage,
	formatStatusActivityCopyIntentEvidenceFocusAuditMessage,
	formatStatusActivityCopyIntentRows,
	formatStatusActivityDetailRows,
	formatStatusActivityQueueRows,
	formatStatusActivityResultCopyPreviewRows,
	formatStatusActivityResultHistoryRows,
	formatStatusActivityResultRows,
	getLatestStatusActivityCopyIntentAuditExport,
	getLatestTimelineEvidenceTrailAuditExport,
	getSelectedStatusActivityCopyIntentClipboardPreview,
	getSelectedStatusActivityResultHistoryClipboardPreview,
	getSelectedTimelineEvidenceTrailAuditExport,
	getStatusActivityCopyIntentAuditExportIndex,
	getTimelineEvidenceTrailAuditExports,
	moveStatusActivityCopyIntentSelection,
	moveStatusActivityCopyPreviewSelection,
	moveStatusActivityResultHistorySelection,
	moveStatusActivitySource,
	moveTimelineEvidenceTrailSelection,
	writeStatusActivityCopyIntentAuditExport,
	writeTimelineEvidenceTrailAuditExport,
} from "../src/tui/statusActivityQueue";

describe("Status activity queue", () => {
	test("summarizes release dialog cleanup and evidence activity in source order", () => {
		expect(
			formatStatusActivityQueueRows({
				releaseRows: [
					"STATUS RELEASE CONSOLE npm=update-available github=up-to-date current=0.2.0 latest=0.3.0",
					"package=@uulab/picos repo=uulab-official/picos",
				],
				dialogRows: [
					"STATUS DIALOG PREVIEW active=file-open count=1",
					"> file-open FILE OPEN cleanup-export",
				],
				cleanupRows: [
					"CLEANUP OPS active=2 items=5 history=1 selected=Routes",
					"> shelf Routes r count=3 confirm=delete routes",
				],
				evidenceRows: [
					"STATUS EVIDENCE SUMMARY active=audit families=3 files=4",
					"> audit selected=1 total=2",
				],
			}),
		).toEqual([
			"STATUS ACTIVITY QUEUE active=4 sources=release,dialog,cleanup,evidence",
			"> release STATUS RELEASE CONSOLE npm=update-available github=up-to-date current=0.2.0 latest=0.3.0",
			"  dialog STATUS DIALOG PREVIEW active=file-open count=1",
			"  cleanup CLEANUP OPS active=2 items=5 history=1 selected=Routes",
			"  evidence STATUS EVIDENCE SUMMARY active=audit families=3 files=4",
			"controls=Status queue scans release/dialog/cleanup/evidence; open panels for detail",
		]);
	});

	test("keeps an empty queue useful when no Status sources have rows", () => {
		expect(formatStatusActivityQueueRows({})).toEqual([
			"STATUS ACTIVITY QUEUE active=0 sources=none",
			"no Status activity yet",
			"controls=Status queue scans release/dialog/cleanup/evidence; open panels for detail",
		]);
	});

	test("formats a detail cursor for the selected activity source", () => {
		expect(
			formatStatusActivityDetailRows(
				{
					releaseRows: [
						"STATUS RELEASE CONSOLE npm=update-available github=up-to-date current=0.2.0 latest=0.3.0",
						"package=@uulab/picos repo=uulab-official/picos",
						"> link release notes https://github.com/uulab-official/picos/releases/tag/v0.3.0",
						"apply=locked confirm=update picos",
					],
					cleanupRows: [
						"CLEANUP OPS active=2 items=5 history=1 selected=Routes",
						"> shelf Routes r count=3 confirm=delete routes",
					],
				},
				"release",
			),
		).toEqual([
			"STATUS ACTIVITY DETAIL active=release rows=4",
			"> STATUS RELEASE CONSOLE npm=update-available github=up-to-date current=0.2.0 latest=0.3.0",
			"  package=@uulab/picos repo=uulab-official/picos",
			"  link release notes https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			"controls=enter action · ,/. activity source · detail mirrors selected Status console",
		]);
	});

	test("falls back to the first available source when selected activity is empty", () => {
		expect(
			formatStatusActivityDetailRows(
				{
					cleanupRows: [
						"CLEANUP OPS active=1 items=2 history=0 selected=Logs",
						"> shelf Logs l count=2 confirm=delete logs",
					],
				},
				"release",
			),
		).toEqual([
			"STATUS ACTIVITY DETAIL active=cleanup rows=2",
			"> CLEANUP OPS active=1 items=2 history=0 selected=Logs",
			"  shelf Logs l count=2 confirm=delete logs",
			"controls=enter action · ,/. activity source · detail mirrors selected Status console",
		]);
	});

	test("moves the activity source cursor across available sources", () => {
		const input = {
			releaseRows: ["STATUS RELEASE CONSOLE npm=up-to-date"],
			evidenceRows: ["STATUS EVIDENCE SUMMARY active=audit families=1 files=1"],
		};
		expect(moveStatusActivitySource(input, "release", 1)).toBe("evidence");
		expect(moveStatusActivitySource(input, "release", -1)).toBe("evidence");
		expect(moveStatusActivitySource({}, "release", 1)).toBe("release");
	});

	test("plans the safest enter action for the selected activity source", () => {
		const input = {
			releaseRows: [
				"STATUS RELEASE CONSOLE npm=update-available github=up-to-date current=0.2.0 latest=0.3.0",
				"> link release notes https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			],
			dialogRows: [
				"STATUS DIALOG PREVIEW active=file-open count=1",
				"> file-open FILE OPEN cleanup-export",
			],
			cleanupRows: [
				"CLEANUP OPS active=1 items=2 history=0 selected=Logs",
				"> shelf Logs l count=2 confirm=delete logs",
			],
			evidenceRows: [
				"STATUS EVIDENCE SUMMARY active=audit families=1 files=1",
				"> audit selected=1 total=1 open=W",
			],
		};

		expect(createStatusActivityEnterPlan(input, "release")).toEqual({
			source: "release",
			action: "cycle-release-link",
			message: "release activity selected; cycling release handoff link",
		});
		expect(createStatusActivityEnterPlan(input, "dialog")).toEqual({
			source: "dialog",
			action: "show-dialog",
			message: "dialog activity selected; type the exact confirmation phrase",
		});
		expect(createStatusActivityEnterPlan(input, "cleanup")).toEqual({
			source: "cleanup",
			action: "jump-cleanup",
			message: "cleanup activity selected; jumping to selected cleanup shelf",
		});
		expect(createStatusActivityEnterPlan(input, "evidence")).toEqual({
			source: "evidence",
			action: "enter-evidence",
			message: "evidence activity selected; running active evidence enter",
		});
	});

	test("falls back to the first available enter action", () => {
		expect(
			createStatusActivityEnterPlan(
				{
					evidenceRows: [
						"STATUS EVIDENCE SUMMARY active=audit families=1 files=1",
					],
				},
				"release",
			),
		).toEqual({
			source: "evidence",
			action: "enter-evidence",
			message: "evidence activity selected; running active evidence enter",
		});
		expect(createStatusActivityEnterPlan({}, "release")).toEqual({
			source: "release",
			action: "none",
			message: "no Status activity available",
		});
	});

	test("formats recent activity action results", () => {
		expect(
			formatStatusActivityResultRows({
				source: "cleanup",
				action: "jump-cleanup",
				message: "cleanup activity selected; jumping to selected cleanup shelf",
				detail: "cleanup handoff Logs: press l then type delete logs",
			}),
		).toEqual([
			"STATUS ACTIVITY RESULT source=cleanup action=jump-cleanup",
			"> cleanup activity selected; jumping to selected cleanup shelf",
			"  cleanup handoff Logs: press l then type delete logs",
		]);
	});

	test("keeps an empty activity result useful", () => {
		expect(formatStatusActivityResultRows()).toEqual([
			"STATUS ACTIVITY RESULT source=none action=none",
			"no Status activity action yet",
		]);
	});

	test("keeps bounded activity result history newest first", () => {
		const first = {
			source: "release" as const,
			action: "cycle-release-link" as const,
			message: "release activity selected; cycling release handoff link",
			detail: "release handoff link cycled",
		};
		const second = {
			source: "cleanup" as const,
			action: "jump-cleanup" as const,
			message: "cleanup activity selected; jumping to selected cleanup shelf",
			detail: "cleanup handoff Logs: press l then type delete logs",
		};
		const third = {
			source: "dialog" as const,
			action: "show-dialog" as const,
			message: "dialog activity selected; type the exact confirmation phrase",
		};

		const history = appendStatusActivityResultHistory(
			appendStatusActivityResultHistory(
				appendStatusActivityResultHistory([], first, 2),
				second,
				2,
			),
			third,
			2,
		);

		expect(history).toEqual([third, second]);
		expect(formatStatusActivityResultHistoryRows(history)).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=2 selected=1/2",
			"> dialog show-dialog dialog activity selected; type the exact confirmation phrase",
			"  cleanup jump-cleanup cleanup activity selected; jumping to selected cleanup shelf",
			"    cleanup handoff Logs: press l then type delete logs",
		]);
	});

	test("keeps empty activity result history useful", () => {
		expect(formatStatusActivityResultHistoryRows([])).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=0",
			"no Status activity result history yet",
		]);
	});

	test("moves the activity result history cursor with wraparound", () => {
		const history = [
			{
				source: "dialog" as const,
				action: "show-dialog" as const,
				message: "dialog activity selected; type the exact confirmation phrase",
			},
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
				detail: "cleanup handoff Logs: press l then type delete logs",
			},
		];

		expect(moveStatusActivityResultHistorySelection(history, 0, "next")).toBe(
			1,
		);
		expect(moveStatusActivityResultHistorySelection(history, 1, "next")).toBe(
			0,
		);
		expect(
			moveStatusActivityResultHistorySelection(history, 0, "previous"),
		).toBe(1);
		expect(moveStatusActivityResultHistorySelection([], 1, "next")).toBe(0);
		expect(formatStatusActivityResultHistoryRows(history, 1)).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=2 selected=2/2",
			"  dialog show-dialog dialog activity selected; type the exact confirmation phrase",
			"> cleanup jump-cleanup cleanup activity selected; jumping to selected cleanup shelf",
			"    cleanup handoff Logs: press l then type delete logs",
		]);
	});

	test("builds clipboard preview for the selected activity result history row", () => {
		const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
			[
				{
					source: "cleanup",
					action: "jump-cleanup",
					message:
						"cleanup activity selected; jumping to selected cleanup shelf",
					detail: "cleanup handoff Logs: press l then type delete logs",
				},
			],
			0,
		);

		expect(preview).toEqual({
			source: "status-activity",
			label: "status activity cleanup jump-cleanup",
			copyText:
				"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
			details: ["selected=1/1"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(
			getSelectedStatusActivityResultHistoryClipboardPreview([], 0),
		).toBeUndefined();
	});

	test("formats a compact copy preview strip for selected activity history", () => {
		const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
			[
				{
					source: "cleanup",
					action: "jump-cleanup",
					message:
						"cleanup activity selected; jumping to selected cleanup shelf",
					detail: "cleanup handoff Logs: press l then type delete logs",
				},
			],
			0,
		);

		expect(formatStatusActivityResultCopyPreviewRows(preview)).toEqual([
			"STATUS ACTIVITY COPY PREVIEW source=status-activity selected=1/5 expanded=false",
			"> label status activity cleanup jump-cleanup",
			"  detail selected=1/1",
			"  copy cleanup jump-cleanup",
			"  copy cleanup activity selected; jumping to selected cleanup shelf",
			"  copy ... 1 more line",
			"controls=; row · = expand · y copy selected history · :clipboard confirm=copy locked",
		]);
		expect(formatStatusActivityResultCopyPreviewRows()).toEqual([
			"STATUS ACTIVITY COPY PREVIEW source=none",
			"no Status activity copy preview",
			"controls=y copy selected history",
		]);
	});

	test("selects and expands status activity copy preview rows", () => {
		const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
			[
				{
					source: "cleanup",
					action: "jump-cleanup",
					message:
						"cleanup activity selected; jumping to selected cleanup shelf",
					detail: "cleanup handoff Logs: press l then type delete logs",
				},
			],
			0,
		);

		expect(moveStatusActivityCopyPreviewSelection(preview, 0, "next")).toBe(1);
		expect(moveStatusActivityCopyPreviewSelection(preview, 4, "next")).toBe(0);
		expect(moveStatusActivityCopyPreviewSelection(preview, 0, "previous")).toBe(
			4,
		);
		expect(moveStatusActivityCopyPreviewSelection(undefined, 3, "next")).toBe(
			0,
		);
		expect(
			formatStatusActivityResultCopyPreviewRows(preview, {
				selectedRowIndex: 3,
				expanded: true,
			}),
		).toEqual([
			"STATUS ACTIVITY COPY PREVIEW source=status-activity selected=4/5 expanded=true",
			"  label status activity cleanup jump-cleanup",
			"  detail selected=1/1",
			"  copy cleanup jump-cleanup",
			"> copy cleanup activity selected; jumping to selected cleanup shelf",
			"  copy cleanup handoff Logs: press l then type delete logs",
			"controls=; row · = expand · y copy selected history · :clipboard confirm=copy locked",
		]);
	});

	test("formats status activity copy intent audit messages", () => {
		const preview = getSelectedStatusActivityResultHistoryClipboardPreview(
			[
				{
					source: "cleanup",
					action: "jump-cleanup",
					message:
						"cleanup activity selected; jumping to selected cleanup shelf",
					detail: "cleanup handoff Logs: press l then type delete logs",
				},
			],
			0,
		);

		expect(
			formatStatusActivityCopyIntentAuditMessage(preview, {
				selectedRowIndex: 3,
				expanded: true,
			}),
		).toBe(
			'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
		);
		expect(formatStatusActivityCopyIntentAuditMessage()).toBe(
			"clipboard intent status-activity unavailable",
		);
	});

	test("formats recent status activity copy intents as a review shelf", () => {
		const cleanupPreview =
			getSelectedStatusActivityResultHistoryClipboardPreview(
				[
					{
						source: "cleanup",
						action: "jump-cleanup",
						message:
							"cleanup activity selected; jumping to selected cleanup shelf",
						detail: "cleanup handoff Logs: press l then type delete logs",
					},
				],
				0,
			);
		const dialogPreview =
			getSelectedStatusActivityResultHistoryClipboardPreview(
				[
					{
						source: "dialog",
						action: "show-dialog",
						message:
							"dialog activity selected; type the exact confirmation phrase",
					},
				],
				0,
			);

		const cleanupIntent = createStatusActivityCopyIntentRecord(cleanupPreview, {
			selectedRowIndex: 3,
			expanded: true,
		});
		const dialogIntent = createStatusActivityCopyIntentRecord(dialogPreview);
		const history = appendStatusActivityCopyIntentHistory(
			appendStatusActivityCopyIntentHistory([], cleanupIntent, 2),
			dialogIntent,
			2,
		);

		expect(cleanupIntent).toEqual({
			label: "status activity cleanup jump-cleanup",
			copyText:
				"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
			selectedRow: 4,
			expanded: true,
			lines: 3,
			preview: "cleanup jump-cleanup",
			auditMessage:
				'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
		});
		expect(createStatusActivityCopyIntentRecord()).toBeUndefined();
		expect(formatStatusActivityCopyIntentRows(history, 1)).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=2 selected=2/2",
			"  status activity dialog show-dialog row=1 expanded=false lines=2 preview=dialog show-dialog",
			"> status activity cleanup jump-cleanup row=4 expanded=true lines=3 preview=cleanup jump-cleanup",
			"controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export · g Timeline audit search · :clipboard confirm=copy locked",
		]);
		expect(formatStatusActivityCopyIntentRows([])).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export · g Timeline audit search",
		]);
	});

	test("shows the restored status activity copy intent export path for z open", () => {
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				{
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
					content: "",
					eventCount: 1,
					query: "status activity cleanup jump-cleanup",
					scope: "selected",
				},
				1,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"z target=picos-audit-selected-2026-07-01T030000000Z.log evidence=2 query=status activity cleanup jump-cleanup events=1",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export · g Timeline audit search",
		]);
	});

	test("shows recovered timeline evidence trail exports in the copy intent shelf", () => {
		expect(
			formatStatusActivityCopyIntentRows([], 0, undefined, undefined, {
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
				content: "",
				eventCount: 1,
				query:
					"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
				scope: "selected",
			}),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"trail target=picos-audit-selected-2026-07-01T040000000Z.log query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log events=1",
			"trail detail path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log actions=L open N search",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export · L open trail · N trail search · trail recovered · g Timeline audit search",
		]);
	});

	test("shows a selected recovered timeline evidence trail export when several are indexed", () => {
		const older = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			scope: "selected" as const,
		};
		const newer = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T040000000Z.log",
			scope: "selected" as const,
		};

		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				newer,
				[newer, older],
				1,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"trail selected=2/2",
			"trail target=picos-audit-selected-2026-07-01T040000000Z.log query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log events=1",
			"trail detail path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log actions=L open N search",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · v replay · e export · w Evidence focus · G focus search · z open export · L open trail · N trail search · S trail select · trail recovered · g Timeline audit search",
		]);
	});

	test("replays selected status activity copy intents as locked clipboard previews", () => {
		const history = [
			{
				label: "status activity dialog show-dialog",
				copyText:
					"dialog show-dialog\ndialog activity selected; type the exact confirmation phrase",
				selectedRow: 1,
				expanded: false,
				lines: 2,
				preview: "dialog show-dialog",
				auditMessage:
					'clipboard intent status-activity label="status activity dialog show-dialog" selectedRow=1 expanded=false lines=2 preview="dialog show-dialog"',
			},
			{
				label: "status activity cleanup jump-cleanup",
				copyText:
					"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
				selectedRow: 4,
				expanded: true,
				lines: 3,
				preview: "cleanup jump-cleanup",
				auditMessage:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		];

		expect(
			getSelectedStatusActivityCopyIntentClipboardPreview(history, 1),
		).toEqual({
			source: "status-activity",
			label: "status activity cleanup jump-cleanup",
			copyText:
				"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
			details: ["copy-intent selected=2/2", "row=4 expanded=true lines=3"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(
			getSelectedStatusActivityCopyIntentClipboardPreview([], 0),
		).toBeUndefined();
	});

	test("creates selected status activity copy intent audit export plans", () => {
		const history = [
			{
				label: "status activity dialog show-dialog",
				copyText:
					"dialog show-dialog\ndialog activity selected; type the exact confirmation phrase",
				selectedRow: 1,
				expanded: false,
				lines: 2,
				preview: "dialog show-dialog",
				auditMessage:
					'clipboard intent status-activity label="status activity dialog show-dialog" selectedRow=1 expanded=false lines=2 preview="dialog show-dialog"',
			},
			{
				label: "status activity cleanup jump-cleanup",
				copyText:
					"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
				selectedRow: 4,
				expanded: true,
				lines: 3,
				preview: "cleanup jump-cleanup",
				auditMessage:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		];

		expect(
			createStatusActivityCopyIntentAuditExportPlan(history, 1, {
				baseDir: "/Users/bonjin/.config/picos",
				generatedAt: new Date("2026-07-01T03:00:00.000Z"),
			}),
		).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-07-01T03:00:00.000Z",
				"scope=selected",
				"query=status activity cleanup jump-cleanup",
				"events=1",
				"",
				'[03:00:00] INFO clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
				"",
			].join("\n"),
			eventCount: 1,
			query: "status activity cleanup jump-cleanup",
			scope: "selected",
		});
		expect(
			createStatusActivityCopyIntentAuditExportPlan([], 0, {
				baseDir: "/Users/bonjin/.config/picos",
			}),
		).toBeUndefined();
	});

	test("writes selected status activity copy intent audit exports", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-status-intent-"));
		try {
			const plan = createStatusActivityCopyIntentAuditExportPlan(
				[
					{
						label: "status activity cleanup jump-cleanup",
						copyText:
							"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
						selectedRow: 4,
						expanded: true,
						lines: 3,
						preview: "cleanup jump-cleanup",
						auditMessage:
							'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
					},
				],
				0,
				{
					baseDir: root,
					generatedAt: new Date("2026-07-01T03:00:00.000Z"),
				},
			);

			expect(plan).toBeDefined();
			if (!plan) {
				throw new Error("expected copy intent export plan");
			}
			const written = await writeStatusActivityCopyIntentAuditExport(plan);

			expect(written).toEqual(plan);
			expect(await readFile(plan.path, "utf8")).toContain(
				'clipboard intent status-activity label="status activity cleanup jump-cleanup"',
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("creates locked file-open plans for status activity copy intent audit exports", () => {
		const plan = createStatusActivityCopyIntentAuditExportOpenPlan(
			{
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				content: "# picos audit log\n",
				eventCount: 1,
				query: "status activity cleanup jump-cleanup",
				scope: "selected",
			},
			{
				baseDir: "/Users/bonjin/.config/picos",
				platform: "darwin",
			},
		);

		expect(plan).toEqual({
			source: "timeline-export",
			label:
				"status activity copy intent export selected status activity cleanup jump-cleanup",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "open",
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [
					"/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				],
			},
		});
	});

	test("creates locked file-open plans for recovered timeline evidence trail exports", () => {
		const plan = createTimelineEvidenceTrailAuditExportOpenPlan(
			{
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
				content: "# picos audit log\n",
				eventCount: 1,
				query:
					"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
				scope: "selected",
			},
			{
				baseDir: "/Users/bonjin/.config/picos",
				platform: "darwin",
			},
		);

		expect(plan).toEqual({
			source: "timeline-export",
			label:
				"timeline evidence trail export selected timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "open",
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [
					"/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
				],
			},
		});
	});

	test("creates timeline searches for recovered timeline evidence trail exports", () => {
		expect(
			createTimelineEvidenceTrailTimelineSearch({
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
				content: "",
				eventCount: 1,
				query:
					"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
				scope: "selected",
			}),
		).toEqual({
			filter: "audit",
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"timeline evidence trail recovered search picos-audit-selected-2026-07-01T040000000Z.log",
		});
		expect(createTimelineEvidenceTrailTimelineSearch()).toBeUndefined();
	});

	test("finds the latest persisted status activity copy intent audit export", () => {
		expect(
			getLatestStatusActivityCopyIntentAuditExport({
				baseDir: "/Users/bonjin/.config/picos",
				items: [
					{
						fileName: "picos-audit-selected-2026-07-01T040000000Z.log",
						path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
						generatedAt: "2026-07-01T04:00:00.000Z",
						scope: "selected",
						query: "tools ping google.com",
						entryCount: 1,
					},
					{
						fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
						path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
						generatedAt: "2026-07-01T03:00:00.000Z",
						scope: "selected",
						query: "status activity cleanup jump-cleanup",
						entryCount: 1,
					},
					{
						fileName: "picos-audit-filtered-2026-07-01T020000000Z.log",
						path: "/Users/bonjin/.config/picos/audit/picos-audit-filtered-2026-07-01T020000000Z.log",
						generatedAt: "2026-07-01T02:00:00.000Z",
						scope: "filtered",
						query: "status activity older",
						entryCount: 3,
					},
				],
			}),
		).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			content: "",
			eventCount: 1,
			query: "status activity cleanup jump-cleanup",
			scope: "selected",
		});

		expect(
			getLatestStatusActivityCopyIntentAuditExport({
				baseDir: "/Users/bonjin/.config/picos",
				items: [],
			}),
		).toBeUndefined();
	});

	test("finds matching status activity copy intent audit export indexes", () => {
		const index: ConsoleAuditExportIndex = {
			baseDir: "/Users/bonjin/.config/picos",
			items: [
				{
					fileName: "picos-audit-selected-2026-07-01T040000000Z.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
					generatedAt: "2026-07-01T04:00:00.000Z",
					scope: "selected",
					query: "tools ping google.com",
					entryCount: 1,
				},
				{
					fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
					generatedAt: "2026-07-01T03:00:00.000Z",
					scope: "selected",
					query: "status activity cleanup jump-cleanup",
					entryCount: 1,
				},
			],
		};

		expect(
			getStatusActivityCopyIntentAuditExportIndex(index, {
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				content: "",
				eventCount: 1,
				query: "status activity cleanup jump-cleanup",
				scope: "selected",
			}),
		).toBe(1);
		expect(
			getStatusActivityCopyIntentAuditExportIndex(index, {
				path: "/Users/bonjin/.config/picos/audit/missing.log",
				content: "",
				eventCount: 0,
				query: "status activity missing",
				scope: "selected",
			}),
		).toBeUndefined();
	});

	test("creates status activity copy intent evidence focus plans", () => {
		const index: ConsoleAuditExportIndex = {
			baseDir: "/Users/bonjin/.config/picos",
			items: [
				{
					fileName: "picos-audit-selected-2026-07-01T040000000Z.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
					generatedAt: "2026-07-01T04:00:00.000Z",
					scope: "selected",
					query: "tools ping google.com",
					entryCount: 1,
				},
				{
					fileName: "picos-audit-selected-2026-07-01T030000000Z.log",
					path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
					generatedAt: "2026-07-01T03:00:00.000Z",
					scope: "selected",
					query: "status activity cleanup jump-cleanup",
					entryCount: 1,
				},
			],
		};

		expect(
			createStatusActivityCopyIntentEvidenceFocusPlan(index, {
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				content: "",
				eventCount: 1,
				query: "status activity cleanup jump-cleanup",
				scope: "selected",
			}),
		).toEqual({
			kind: "audit",
			selectedIndex: 1,
			itemCount: 2,
			shortcut: "w",
			label: "picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
		});
		expect(
			createStatusActivityCopyIntentEvidenceFocusPlan(index, {
				path: "/Users/bonjin/.config/picos/audit/missing.log",
				content: "",
				eventCount: 0,
				query: "status activity missing",
				scope: "selected",
			}),
		).toBeUndefined();
	});

	test("creates status activity results for copy intent evidence focus jumps", () => {
		const focusPlan = {
			kind: "audit" as const,
			selectedIndex: 1,
			itemCount: 2,
			shortcut: "w" as const,
			label: "picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
		};

		const result = createStatusActivityCopyIntentEvidenceFocusResult(focusPlan);

		expect(result).toEqual({
			source: "evidence",
			action: "focus-evidence",
			message:
				"status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			detail:
				"evidence audit selected=2/2 path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
		});
		expect(formatStatusActivityResultRows(result)).toEqual([
			"STATUS ACTIVITY RESULT source=evidence action=focus-evidence",
			"> status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			"  evidence audit selected=2/2 path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
		]);
		expect(formatStatusActivityResultHistoryRows([result])).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=1 selected=1/1",
			"> evidence focus-evidence status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			"    evidence audit selected=2/2 path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
		]);
	});

	test("formats status activity evidence focus as timeline audit text", () => {
		const focusPlan = {
			kind: "audit" as const,
			selectedIndex: 1,
			itemCount: 2,
			shortcut: "w" as const,
			label: "picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"status activity copy intent evidence focus audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
		};

		expect(
			formatStatusActivityCopyIntentEvidenceFocusAuditMessage(focusPlan),
		).toBe(
			'status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
		);
		expect(
			createStatusActivityCopyIntentEvidenceFocusTimelineSearch(focusPlan),
		).toEqual({
			filter: "audit",
			query: "status activity evidence focus",
			message:
				"status activity evidence focus timeline search picos-audit-selected-2026-07-01T030000000Z.log",
		});
		expect(
			createStatusActivityCopyIntentEvidenceFocusTimelineSearch(undefined),
		).toBeUndefined();
	});

	test("creates status activity results for timeline evidence trail handoffs", () => {
		const result = createTimelineEvidenceTrailStatusActivityResult({
			kind: "audit",
			selectedIndex: 1,
			itemCount: 2,
			label: "picos-audit-selected-2026-07-01T030000000Z.log",
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			message:
				"timeline evidence trail audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			rows: [
				"TIMELINE EVIDENCE TRAIL audit selected=2/2",
				"> picos-audit-selected-2026-07-01T030000000Z.log",
				"path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				"controls=Status Evidence W=open Z=archive enter=open",
			],
		});

		expect(result).toEqual({
			source: "evidence",
			action: "timeline-evidence-trail",
			message:
				"timeline evidence trail audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			detail:
				"Status Evidence W=open Z=archive enter=open path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
		});
		expect(formatStatusActivityResultRows(result)).toEqual([
			"STATUS ACTIVITY RESULT source=evidence action=timeline-evidence-trail",
			"> timeline evidence trail audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
			"  Status Evidence W=open Z=archive enter=open path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
		]);
	});

	test("creates selected audit exports for timeline evidence trail handoffs", () => {
		const plan = createTimelineEvidenceTrailAuditExportPlan(
			{
				kind: "audit",
				selectedIndex: 1,
				itemCount: 2,
				label: "picos-audit-selected-2026-07-01T030000000Z.log",
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
				message:
					"timeline evidence trail audit 2/2 picos-audit-selected-2026-07-01T030000000Z.log",
				rows: [
					"TIMELINE EVIDENCE TRAIL audit selected=2/2",
					"> picos-audit-selected-2026-07-01T030000000Z.log",
					"path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
					"controls=Status Evidence W=open Z=archive enter=open",
				],
			},
			{
				baseDir: "/Users/bonjin/.config/picos",
				generatedAt: new Date("2026-07-01T03:00:00.000Z"),
			},
		);

		expect(plan).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-07-01T03:00:00.000Z",
				"scope=selected",
				"query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
				"events=1",
				"",
				'[03:00:00] INFO timeline evidence trail kind=audit selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log" controls="Status Evidence W=open Z=archive enter=open"',
				"",
			].join("\n"),
			eventCount: 1,
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			scope: "selected",
		});
	});

	test("recovers the latest persisted timeline evidence trail audit export", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-timeline-trail-"));
		try {
			const older = createTimelineEvidenceTrailAuditExportPlan(
				{
					kind: "audit",
					selectedIndex: 0,
					itemCount: 2,
					label: "older.log",
					path: join(root, "audit", "older.log"),
					message: "timeline evidence trail audit 1/2 older.log",
					rows: [
						"TIMELINE EVIDENCE TRAIL audit selected=1/2",
						"> older.log",
						`path=${join(root, "audit", "older.log")}`,
						"controls=Status Evidence W=open Z=archive enter=open",
					],
				},
				{
					baseDir: root,
					generatedAt: new Date("2026-07-01T02:00:00.000Z"),
				},
			);
			const newer = createTimelineEvidenceTrailAuditExportPlan(
				{
					kind: "audit",
					selectedIndex: 1,
					itemCount: 2,
					label: "newer.log",
					path: join(root, "audit", "newer.log"),
					message: "timeline evidence trail audit 2/2 newer.log",
					rows: [
						"TIMELINE EVIDENCE TRAIL audit selected=2/2",
						"> newer.log",
						`path=${join(root, "audit", "newer.log")}`,
						"controls=Status Evidence W=open Z=archive enter=open",
					],
				},
				{
					baseDir: root,
					generatedAt: new Date("2026-07-01T03:00:00.000Z"),
				},
			);

			await writeTimelineEvidenceTrailAuditExport(older);
			await writeTimelineEvidenceTrailAuditExport(newer);

			const latest = getLatestTimelineEvidenceTrailAuditExport(
				await readConsoleAuditExportIndex(root),
			);
			const trailExports = getTimelineEvidenceTrailAuditExports(
				await readConsoleAuditExportIndex(root),
			);

			expect(latest).toEqual({
				path: newer.path,
				content: "",
				eventCount: 1,
				query: "timeline evidence trail newer.log",
				scope: "selected",
			});
			expect(trailExports).toEqual([
				{
					path: newer.path,
					content: "",
					eventCount: 1,
					query: "timeline evidence trail newer.log",
					scope: "selected",
				},
				{
					path: older.path,
					content: "",
					eventCount: 1,
					query: "timeline evidence trail older.log",
					scope: "selected",
				},
			]);
			expect(
				getSelectedTimelineEvidenceTrailAuditExport(trailExports, 1),
			).toEqual(trailExports[1]);
			expect(moveTimelineEvidenceTrailSelection(trailExports, 1, "next")).toBe(
				0,
			);
			expect(
				moveTimelineEvidenceTrailSelection(trailExports, 0, "previous"),
			).toBe(1);
			expect(await readFile(newer.path, "utf8")).toContain(
				'timeline evidence trail kind=audit selected=2/2 label="newer.log"',
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("selects status activity copy intents and creates timeline search jumps", () => {
		const history = [
			{
				label: "status activity dialog show-dialog",
				copyText:
					"dialog show-dialog\ndialog activity selected; type the exact confirmation phrase",
				selectedRow: 1,
				expanded: false,
				lines: 2,
				preview: "dialog show-dialog",
				auditMessage:
					'clipboard intent status-activity label="status activity dialog show-dialog" selectedRow=1 expanded=false lines=2 preview="dialog show-dialog"',
			},
			{
				label: "status activity cleanup jump-cleanup",
				copyText:
					"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf\ncleanup handoff Logs: press l then type delete logs",
				selectedRow: 4,
				expanded: true,
				lines: 3,
				preview: "cleanup jump-cleanup",
				auditMessage:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		];

		expect(moveStatusActivityCopyIntentSelection(history, 0, "next")).toBe(1);
		expect(moveStatusActivityCopyIntentSelection(history, 1, "next")).toBe(0);
		expect(moveStatusActivityCopyIntentSelection(history, 0, "previous")).toBe(
			1,
		);
		expect(moveStatusActivityCopyIntentSelection([], 4, "next")).toBe(0);
		expect(createStatusActivityCopyIntentTimelineSearch(history, 1)).toEqual({
			filter: "audit",
			query: "status activity cleanup jump-cleanup",
			message:
				"status activity copy intent timeline search status activity cleanup jump-cleanup",
		});
		expect(createStatusActivityCopyIntentTimelineSearch([], 0)).toBeUndefined();
	});
});
