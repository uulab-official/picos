import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type ConsoleAuditExportIndex,
	createConsoleAuditExportPlan,
	readConsoleAuditExportIndex,
	writeConsoleAuditExport,
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
	createStatusActivityResultAuditJumpReplayWarningSummary,
	createStatusActivityResultAuditJumpReplayWarningTimelineSearch,
	createStatusActivityResultHistoryFilterPaletteResult,
	createStatusActivityResultTimelineJumpPaletteResult,
	createStatusActivityResultTimelineSearch,
	createStatusActivityResultTimelineSearchIntent,
	createStatusActivityResultTimelineSearchReplay,
	createStatusActivityResultTimelineSearchReplayWarning,
	createTimelineEvidenceTrailAuditExportOpenPlan,
	createTimelineEvidenceTrailAuditExportPlan,
	createTimelineEvidenceTrailPaletteStatusActivityResult,
	createTimelineEvidenceTrailStatusActivityResult,
	createTimelineEvidenceTrailTimelineSearch,
	createTimelineSelectedStatusActivityResult,
	filterStatusActivityResultHistoryIndexes,
	filterTimelineEvidenceTrailAuditExports,
	formatStatusActivityCopyIntentAuditMessage,
	formatStatusActivityCopyIntentEvidenceFocusAuditMessage,
	formatStatusActivityCopyIntentRows,
	formatStatusActivityDetailRows,
	formatStatusActivityQueueRows,
	formatStatusActivityResultAuditJumpReplayWarningAuditMessage,
	formatStatusActivityResultCopyPreviewRows,
	formatStatusActivityResultHistoryRows,
	formatStatusActivityResultRows,
	formatStatusActivityResultTimelineJumpPaletteAuditMessage,
	formatStatusActivityResultTimelineJumpRows,
	formatTimelineEvidenceTrailPaletteAuditMessage,
	getLatestStatusActivityCopyIntentAuditExport,
	getLatestStatusActivityResultAuditJumpIntent,
	getLatestTimelineEvidenceTrailAuditExport,
	getSelectedStatusActivityCopyIntentClipboardPreview,
	getSelectedStatusActivityResultAuditJumpIntent,
	getSelectedStatusActivityResultHistoryClipboardPreview,
	getSelectedTimelineEvidenceTrailAuditExport,
	getStatusActivityCopyIntentAuditExportIndex,
	getStatusActivityResultAuditJumpIntentCount,
	getTimelineEvidenceTrailAuditExports,
	moveStatusActivityCopyIntentSelection,
	moveStatusActivityCopyPreviewSelection,
	moveStatusActivityResultAuditJumpSelection,
	moveStatusActivityResultHistoryFilteredSelection,
	moveStatusActivityResultHistorySelection,
	moveStatusActivityResultTimelineJumpSelection,
	moveStatusActivitySource,
	moveTimelineEvidenceTrailSelection,
	nextStatusActivityResultHistoryFilter,
	nextTimelineEvidenceTrailSourceFilter,
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
		const auditJumpIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		});
		const auditJumpIntentCount = 2;

		expect(
			formatStatusActivityResultRows(
				{
					source: "cleanup",
					action: "jump-cleanup",
					message:
						"cleanup activity selected; jumping to selected cleanup shelf",
					detail: "cleanup handoff Logs: press l then type delete logs",
				},
				auditJumpIntent,
				auditJumpIntentCount,
			),
		).toEqual([
			"STATUS ACTIVITY RESULT source=cleanup action=jump-cleanup",
			"> cleanup activity selected; jumping to selected cleanup shelf",
			"  cleanup handoff Logs: press l then type delete logs",
			"  audit jump intent=action=source source=evidence visible=1/3 lines=3 count=2",
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
		const auditJumpIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		});
		expect(
			formatStatusActivityResultHistoryRows(history, 1, auditJumpIntent, 2),
		).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=2 selected=2/2",
			"  dialog show-dialog dialog activity selected; type the exact confirmation phrase",
			"> cleanup jump-cleanup cleanup activity selected; jumping to selected cleanup shelf",
			"    cleanup handoff Logs: press l then type delete logs",
			"    audit jump intent=action=source source=evidence visible=1/3 lines=3 count=2",
		]);
	});

	test("filters activity result history to palette result jump rows", () => {
		const history = [
			{
				source: "timeline" as const,
				action: "timeline-selected-copy" as const,
				message: "palette status result jump open 2/2 row=4",
				detail: "filter=audit search=control preview matches=5",
			},
			{
				source: "dialog" as const,
				action: "show-dialog" as const,
				message: "dialog activity selected; type the exact confirmation phrase",
			},
			{
				source: "timeline" as const,
				action: "timeline-selected-copy" as const,
				message: "palette status result jump select 1/2 row=1",
				detail: "filter=audit search=control preview",
			},
		];

		expect(nextStatusActivityResultHistoryFilter("all")).toBe(
			"palette-result-jumps",
		);
		expect(nextStatusActivityResultHistoryFilter("palette-result-jumps")).toBe(
			"all",
		);
		expect(
			filterStatusActivityResultHistoryIndexes(history, "palette-result-jumps"),
		).toEqual([0, 2]);
		expect(
			moveStatusActivityResultHistoryFilteredSelection(
				history,
				0,
				"next",
				"palette-result-jumps",
			),
		).toBe(2);
		expect(
			moveStatusActivityResultHistoryFilteredSelection(
				history,
				2,
				"next",
				"palette-result-jumps",
			),
		).toBe(0);
		expect(
			formatStatusActivityResultHistoryRows(
				history,
				2,
				undefined,
				0,
				"palette-result-jumps",
			),
		).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=3 visible=2 filter=palette-result-jumps selected=2/2",
			"  #1 timeline timeline-selected-copy palette status result jump open 2/2 row=4",
			"    filter=audit search=control preview matches=5",
			"> #3 timeline timeline-selected-copy palette status result jump select 1/2 row=1",
			"    filter=audit search=control preview",
			"controls=f result filter · u/i filtered history",
		]);
	});

	test("keeps filtered activity result history useful when nothing matches", () => {
		expect(
			formatStatusActivityResultHistoryRows(
				[
					{
						source: "dialog" as const,
						action: "show-dialog" as const,
						message:
							"dialog activity selected; type the exact confirmation phrase",
					},
				],
				0,
				undefined,
				0,
				"palette-result-jumps",
			),
		).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=1 visible=0 filter=palette-result-jumps",
			"no Status activity result history for filter=palette-result-jumps",
			"controls=f result filter · u/i filtered history",
		]);
	});

	test("creates status activity results for palette-triggered result history filters", () => {
		const result = createStatusActivityResultHistoryFilterPaletteResult(
			"palette-result-jumps",
			{
				total: 5,
				visible: 2,
			},
		);

		expect(result).toEqual({
			source: "timeline",
			action: "filter-result-history",
			message: "palette status result filter palette-result-jumps visible=2/5",
			detail: "result history filter changed to palette-result-jumps",
		});
		expect(formatStatusActivityResultRows(result)).toEqual([
			"STATUS ACTIVITY RESULT source=timeline action=filter-result-history",
			"> palette status result filter palette-result-jumps visible=2/5",
			"  result history filter changed to palette-result-jumps",
		]);
		expect(formatStatusActivityResultHistoryRows([result])).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=1 selected=1/1",
			"> timeline filter-result-history palette status result filter palette-result-jumps visible=2/5",
			"    result history filter changed to palette-result-jumps",
		]);
		expect(createStatusActivityResultHistoryFilterPaletteResult("all")).toEqual(
			{
				source: "timeline",
				action: "filter-result-history",
				message: "palette status result filter all visible=0/0",
				detail: "result history filter changed to all",
			},
		);
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
			"controls=; row · = expand · y copy selected history · I audit jump · :clipboard confirm=copy locked",
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
			"controls=; row · = expand · y copy selected history · I audit jump · :clipboard confirm=copy locked",
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
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search · :clipboard confirm=copy locked",
		]);
		expect(formatStatusActivityCopyIntentRows([])).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
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
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
		]);
	});

	test("summarizes reusable result audit jumps in the copy intent shelf", () => {
		const latestAuditJumpIntent =
			createStatusActivityResultTimelineSearchIntent({
				filter: "audit",
				query: "action=source source=palette visible=2/5",
				message:
					"status activity result timeline search palette source palette visible=2/5",
			});

		expect(latestAuditJumpIntent).toBeDefined();
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				latestAuditJumpIntent,
				3,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"audit jumps count=3 target=source:palette visible:2/5 latest=action=source source=palette visible=2/5 lines=3",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
		]);
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				latestAuditJumpIntent,
				3,
				"replay",
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"audit jumps count=3 target=source:palette visible:2/5 latest=action=source source=palette visible=2/5 lines=3 I=replay replay=latest valid",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
		]);
	});

	test("shows fresh timeline result jump targets in the copy intent shelf", () => {
		const timelineResultJump = createStatusActivityResultTimelineSearch(
			[
				createTimelineSelectedStatusActivityResult("copy", {
					filter: "audit",
					label: "timeline audit 12:00:06",
					query: "control preview",
					selectedIndex: 0,
					total: 2,
				}),
			],
			0,
		);

		expect(timelineResultJump).toBeDefined();
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				undefined,
				0,
				"fresh",
				0,
				undefined,
				timelineResultJump,
				0,
				2,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"result jump target=filter:audit query=control preview selected=1/2 I=fresh",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · J result select · g Timeline audit search",
		]);
	});

	test("moves between timeline result jump rows without stopping on non-jump results", () => {
		const history = [
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			},
			createTimelineSelectedStatusActivityResult("copy", {
				filter: "audit",
				label: "timeline audit 12:00:06",
				query: "control preview",
				selectedIndex: 0,
				total: 2,
			}),
			{
				source: "dialog" as const,
				action: "show-dialog" as const,
				message: "dialog activity selected; type the exact confirmation phrase",
			},
			createTimelineSelectedStatusActivityResult("export", {
				filter: "raw",
				label: "timeline raw 12:00:09",
				selectedIndex: 1,
				total: 2,
			}),
		];

		expect(
			moveStatusActivityResultTimelineJumpSelection(history, 0, "next"),
		).toBe(1);
		expect(
			moveStatusActivityResultTimelineJumpSelection(history, 1, "next"),
		).toBe(3);
		expect(
			moveStatusActivityResultTimelineJumpSelection(history, 3, "next"),
		).toBe(1);
		expect(
			moveStatusActivityResultTimelineJumpSelection(history, 1, "previous"),
		).toBe(3);
		expect(
			moveStatusActivityResultTimelineJumpSelection([history[0]], 0, "next"),
		).toBe(0);
	});

	test("formats a compact timeline result jump browser", () => {
		const history = [
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			},
			createTimelineSelectedStatusActivityResult("copy", {
				filter: "audit",
				label: "timeline audit 12:00:06",
				query: "control preview",
				selectedIndex: 0,
				total: 2,
			}),
			createTimelineSelectedStatusActivityResult("export", {
				filter: "raw",
				label: "timeline raw 12:00:09",
				selectedIndex: 1,
				total: 2,
			}),
		];

		expect(formatStatusActivityResultTimelineJumpRows(history, 2)).toEqual([
			"STATUS RESULT TIMELINE JUMPS count=2 selected=2/2",
			"palette=? result jump · timeline result open · result select",
			"  #2 filter=audit query=control preview action=timeline-selected-copy",
			"> #3 filter=raw query=timeline raw 12:00:09 action=timeline-selected-export",
			"controls=J select result jump · I open selected Timeline result",
		]);
		expect(formatStatusActivityResultTimelineJumpRows([], 0)).toEqual([
			"STATUS RESULT TIMELINE JUMPS count=0",
			"palette=? result jump · timeline result open · result select",
			"no Timeline result jumps yet",
		]);
	});

	test("marks stale audit jump replay payloads in the copy intent shelf", () => {
		const staleAuditJumpIntent = {
			label:
				"status activity result audit jump action=source source=palette visible=2/5",
			copyText:
				"action=source source=palette visible=2/5\nstatus activity result timeline search palette source palette visible=2/5\nfilter=timeline",
			selectedRow: 1,
			expanded: false,
			lines: 3,
			preview: "action=source source=palette visible=2/5",
			auditMessage:
				'clipboard intent status-activity label="status activity result audit jump action=source source=palette visible=2/5" selectedRow=1 expanded=false lines=3 preview="action=source source=palette visible=2/5"',
		};

		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				staleAuditJumpIntent,
				1,
				"replay",
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"audit jumps count=1 target=source:palette visible:2/5 latest=action=source source=palette visible=2/5 lines=3 I=replay replay=latest stale fix=P audit jump/new result",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
		]);
	});

	test("shows latest stale replay warning summary in the copy intent shelf", () => {
		const warningSummary =
			createStatusActivityResultAuditJumpReplayWarningSummary([
				{
					message: formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
						"no status activity result audit jump fix=P audit jump/new result",
					),
					time: "12:00:08",
				},
				{
					message: formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
						"no status activity result audit jump fix=P audit jump/new result",
					),
					time: "12:00:09",
				},
			]);

		expect(warningSummary).toEqual({
			count: 2,
			latestTime: "12:00:09",
			latestMessage:
				"status activity result audit jump warning no status activity result audit jump fix=P audit jump/new result",
		});
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				undefined,
				0,
				undefined,
				0,
				warningSummary,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"stale warnings count=2 latest=12:00:09 K search",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search",
		]);
		expect(
			createStatusActivityResultAuditJumpReplayWarningSummary([
				{
					message:
						formatStatusActivityResultAuditJumpReplayWarningAuditMessage(),
					time: "12:00:10",
				},
			]),
		).toBeUndefined();
	});

	test("selects reusable result audit jumps without walking all copy intents", () => {
		const evidenceIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		});
		const paletteIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=palette visible=2/5",
			message:
				"status activity result timeline search palette source palette visible=2/5",
		});
		if (!evidenceIntent || !paletteIntent) {
			throw new Error("expected audit jump intents");
		}
		const history = [
			paletteIntent,
			{
				label: "status activity cleanup jump-cleanup",
				copyText:
					"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf",
				selectedRow: 1,
				expanded: false,
				lines: 2,
				preview: "cleanup jump-cleanup",
				auditMessage:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=1 expanded=false lines=2 preview="cleanup jump-cleanup"',
			},
			evidenceIntent,
		];

		expect(getSelectedStatusActivityResultAuditJumpIntent(history, 1)).toEqual(
			evidenceIntent,
		);
		expect(moveStatusActivityResultAuditJumpSelection(history, 0, "next")).toBe(
			1,
		);
		expect(
			moveStatusActivityResultAuditJumpSelection(history, 0, "previous"),
		).toBe(1);
		expect(moveStatusActivityResultAuditJumpSelection([], 4, "next")).toBe(0);
		expect(
			formatStatusActivityCopyIntentRows(
				history,
				0,
				undefined,
				undefined,
				undefined,
				[],
				0,
				"all",
				paletteIntent,
				2,
				"replay",
				1,
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=3 selected=1/3",
			"audit jumps count=2 selected=2/2 target=source:evidence visible:1/3 latest=action=source source=evidence visible=1/3 lines=3 I=replay replay=selected valid",
			"> status activity result audit jump action=source source=palette visible=2/5 row=1 expanded=false lines=3 preview=action=source source=palette visible=2/5",
			"  status activity cleanup jump-cleanup row=1 expanded=false lines=2 preview=cleanup jump-cleanup",
			"  status activity result audit jump action=source source=evidence visible=1/3 row=1 expanded=false lines=3 preview=action=source source=evidence visible=1/3",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · g Timeline audit search · :clipboard confirm=copy locked",
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
			"trail detail source=evidence path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log actions=L open N search",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · L open trail · N trail search · trail recovered · g Timeline audit search",
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
			"trail source=all visible=2/2",
			"trail selected=2/2",
			"trail target=picos-audit-selected-2026-07-01T040000000Z.log query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log events=1",
			"trail detail source=evidence path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log actions=L open N search",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · L open trail · N trail search · S trail select · Q trail source · trail recovered · g Timeline audit search",
		]);
		expect(
			formatStatusActivityCopyIntentRows(
				[],
				0,
				undefined,
				undefined,
				newer,
				[newer, older],
				1,
				"palette",
			),
		).toEqual([
			"STATUS ACTIVITY COPY INTENTS count=0",
			"trail source=palette visible=0/2",
			"no recovered Timeline Evidence trail exports for source=palette",
			"no Status activity copy intents yet",
			"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · Q trail source · g Timeline audit search",
		]);
	});

	test("filters recovered timeline evidence trail exports by source", () => {
		const evidence = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			scope: "selected" as const,
		};
		const palette = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T050000000Z.log",
			content: "",
			eventCount: 1,
			query: "palette timeline trail",
			scope: "selected" as const,
		};
		const trailExports = [palette, evidence];

		expect(
			filterTimelineEvidenceTrailAuditExports(trailExports, "all"),
		).toEqual(trailExports);
		expect(
			filterTimelineEvidenceTrailAuditExports(trailExports, "palette"),
		).toEqual([palette]);
		expect(
			filterTimelineEvidenceTrailAuditExports(trailExports, "evidence"),
		).toEqual([evidence]);
		expect(nextTimelineEvidenceTrailSourceFilter("all")).toBe("evidence");
		expect(nextTimelineEvidenceTrailSourceFilter("evidence")).toBe("palette");
		expect(nextTimelineEvidenceTrailSourceFilter("palette")).toBe("all");
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

	test("creates status activity results for selected timeline raw-source handoffs", () => {
		const copyResult = createTimelineSelectedStatusActivityResult("copy", {
			filter: "audit",
			label: "timeline audit 12:00:06",
			query: "control preview",
			selectedIndex: 0,
			total: 2,
		});

		expect(copyResult).toEqual({
			source: "timeline",
			action: "timeline-selected-copy",
			message: "timeline selected copy 1/2 timeline audit 12:00:06",
			detail:
				"filter=audit search=control preview controls=t raw c copy e export",
		});
		expect(formatStatusActivityResultRows(copyResult)).toEqual([
			"STATUS ACTIVITY RESULT source=timeline action=timeline-selected-copy",
			"> timeline selected copy 1/2 timeline audit 12:00:06",
			"  filter=audit search=control preview controls=t raw c copy e export",
		]);

		expect(
			createTimelineSelectedStatusActivityResult("export", {
				filter: "audit",
				label: "timeline audit 12:00:06",
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected.log",
				selectedIndex: 1,
				total: 2,
			}),
		).toEqual({
			source: "timeline",
			action: "timeline-selected-export",
			message: "timeline selected export 2/2 timeline audit 12:00:06",
			detail:
				"filter=audit controls=t raw c copy e export path=/Users/bonjin/.config/picos/audit/picos-audit-selected.log",
		});
	});

	test("creates status activity results for palette-triggered timeline evidence trail actions", () => {
		const trail = {
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
			content: "",
			eventCount: 1,
			query:
				"timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log",
			scope: "selected" as const,
		};

		const result = createTimelineEvidenceTrailPaletteStatusActivityResult(
			"search",
			trail,
			{
				selectedIndex: 1,
				total: 3,
			},
		);

		expect(result).toEqual({
			source: "evidence",
			action: "timeline-evidence-trail",
			message:
				"palette timeline trail search 2/3 picos-audit-selected-2026-07-01T040000000Z.log",
			detail:
				"query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
		});
		expect(formatStatusActivityResultRows(result)).toEqual([
			"STATUS ACTIVITY RESULT source=evidence action=timeline-evidence-trail",
			"> palette timeline trail search 2/3 picos-audit-selected-2026-07-01T040000000Z.log",
			"  query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
		]);
		expect(formatStatusActivityResultHistoryRows([result])).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=1 selected=1/1",
			"> evidence timeline-evidence-trail palette timeline trail search 2/3 picos-audit-selected-2026-07-01T040000000Z.log",
			"    query=timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log path=/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log",
		]);
		expect(
			createTimelineEvidenceTrailPaletteStatusActivityResult(
				"select",
				undefined,
			),
		).toEqual({
			source: "evidence",
			action: "timeline-evidence-trail",
			message: "palette timeline trail select unavailable",
			detail: "no recovered Timeline Evidence trail export selected",
		});
		expect(
			createTimelineEvidenceTrailPaletteStatusActivityResult(
				"source",
				undefined,
				{
					sourceFilter: "evidence",
					visible: 1,
					total: 3,
				},
			),
		).toEqual({
			source: "evidence",
			action: "timeline-evidence-trail",
			message: "palette timeline trail source evidence visible=1/3",
			detail: "source filter changed to evidence",
		});
		expect(
			createTimelineEvidenceTrailPaletteStatusActivityResult(
				"source",
				undefined,
				{
					sourceFilter: "palette",
					visible: 0,
					total: 3,
				},
			),
		).toEqual({
			source: "evidence",
			action: "timeline-evidence-trail",
			message: "palette timeline trail source palette visible=0/3",
			detail: "source filter changed to palette",
		});
		expect(
			formatTimelineEvidenceTrailPaletteAuditMessage("search", trail, {
				selectedIndex: 1,
				total: 3,
			}),
		).toBe(
			'palette timeline trail audit action=search selected=2/3 label="picos-audit-selected-2026-07-01T040000000Z.log" query="timeline evidence trail picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T040000000Z.log"',
		);
		expect(
			formatTimelineEvidenceTrailPaletteAuditMessage("source", undefined, {
				sourceFilter: "evidence",
				visible: 1,
				total: 3,
			}),
		).toBe(
			"palette timeline trail audit action=source source=evidence visible=1/3",
		);
		expect(
			formatTimelineEvidenceTrailPaletteAuditMessage("source", undefined, {
				sourceFilter: "palette",
				visible: 0,
				total: 3,
			}),
		).toBe(
			"palette timeline trail audit action=source source=palette visible=0/3",
		);
		expect(formatTimelineEvidenceTrailPaletteAuditMessage("open")).toBe(
			'palette timeline trail audit action=open status=unavailable reason="no recovered Timeline Evidence trail export selected"',
		);
	});

	test("creates status activity results for palette-triggered status result jumps", () => {
		const jump = createStatusActivityResultTimelineSearch(
			[
				createTimelineSelectedStatusActivityResult("copy", {
					filter: "audit",
					label: "timeline audit 12:00:06",
					query: "control preview",
					selectedIndex: 0,
					total: 2,
				}),
			],
			0,
		);

		if (!jump) {
			throw new Error("expected jump");
		}

		const result = createStatusActivityResultTimelineJumpPaletteResult("open", {
			historyIndex: 3,
			jump,
			matches: 5,
			selectedIndex: 1,
			total: 2,
		});

		expect(result).toEqual({
			source: "timeline",
			action: "timeline-selected-copy",
			message: "palette status result jump open 2/2 row=4",
			detail: "filter=audit search=control preview matches=5",
		});
		expect(formatStatusActivityResultRows(result)).toEqual([
			"STATUS ACTIVITY RESULT source=timeline action=timeline-selected-copy",
			"> palette status result jump open 2/2 row=4",
			"  filter=audit search=control preview matches=5",
		]);
		expect(formatStatusActivityResultHistoryRows([result])).toEqual([
			"STATUS ACTIVITY RESULT HISTORY count=1 selected=1/1",
			"> timeline timeline-selected-copy palette status result jump open 2/2 row=4",
			"    filter=audit search=control preview matches=5",
		]);
		expect(
			createStatusActivityResultTimelineJumpPaletteResult("select"),
		).toEqual({
			source: "timeline",
			action: "timeline-selected-copy",
			message: "palette status result jump select unavailable",
			detail: "no Status result Timeline jump selected",
		});
	});

	test("formats palette-triggered status result jump audit messages", () => {
		const jump = createStatusActivityResultTimelineSearch(
			[
				createTimelineSelectedStatusActivityResult("copy", {
					filter: "audit",
					label: "timeline audit 12:00:06",
					query: "control preview",
					selectedIndex: 0,
					total: 2,
				}),
			],
			0,
		);

		if (!jump) {
			throw new Error("expected jump");
		}

		expect(
			formatStatusActivityResultTimelineJumpPaletteAuditMessage("select", {
				jump,
				selectedIndex: 0,
				total: 2,
				historyIndex: 3,
			}),
		).toBe(
			'palette status result jump audit action=select selected=1/2 row=4 filter=audit query="control preview"',
		);
		expect(
			formatStatusActivityResultTimelineJumpPaletteAuditMessage("open", {
				jump,
				selectedIndex: 1,
				total: 2,
				historyIndex: 3,
				matches: 5,
			}),
		).toBe(
			'palette status result jump audit action=open selected=2/2 row=4 filter=audit query="control preview" matches=5',
		);
		expect(
			formatStatusActivityResultTimelineJumpPaletteAuditMessage("open"),
		).toBe(
			'palette status result jump audit action=open status=unavailable reason="no Status result Timeline jump selected"',
		);
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
			const palette = createConsoleAuditExportPlan(
				[
					{
						id: "palette-trail-search",
						level: "info",
						time: "04:00:00",
						message: formatTimelineEvidenceTrailPaletteAuditMessage(
							"search",
							newer,
							{ selectedIndex: 0, total: 2 },
						),
					},
				],
				{
					baseDir: root,
					generatedAt: new Date("2026-07-01T04:00:00.000Z"),
					query: "palette timeline trail",
					scope: "selected",
				},
			);

			await writeTimelineEvidenceTrailAuditExport(older);
			await writeTimelineEvidenceTrailAuditExport(newer);
			await writeConsoleAuditExport(palette);

			const latest = getLatestTimelineEvidenceTrailAuditExport(
				await readConsoleAuditExportIndex(root),
			);
			const trailExports = getTimelineEvidenceTrailAuditExports(
				await readConsoleAuditExportIndex(root),
			);

			expect(latest).toEqual({
				path: palette.path,
				content: "",
				eventCount: 1,
				query: "palette timeline trail",
				scope: "selected",
			});
			expect(trailExports).toEqual([
				{
					path: palette.path,
					content: "",
					eventCount: 1,
					query: "palette timeline trail",
					scope: "selected",
				},
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
				formatStatusActivityCopyIntentRows(
					[],
					0,
					undefined,
					undefined,
					latest,
					trailExports,
				),
			).toEqual([
				"STATUS ACTIVITY COPY INTENTS count=0",
				"trail source=all visible=3/3",
				"trail selected=1/3",
				"trail target=picos-audit-selected-2026-07-01T040000000Z.log query=palette timeline trail events=1",
				`trail detail source=palette path=${palette.path} actions=L open N search`,
				"no Status activity copy intents yet",
				"controls=y records intent · </> select · P audit jump · v replay · e export · w Evidence focus · G focus search · K stale search · z open export · L open trail · N trail search · S trail select · Q trail source · trail recovered · g Timeline audit search",
			]);
			expect(
				getSelectedTimelineEvidenceTrailAuditExport(trailExports, 1),
			).toEqual(trailExports[1]);
			expect(moveTimelineEvidenceTrailSelection(trailExports, 1, "next")).toBe(
				2,
			);
			expect(
				moveTimelineEvidenceTrailSelection(trailExports, 0, "previous"),
			).toBe(2);
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

	test("creates timeline searches for palette source result history rows", () => {
		const history = [
			createTimelineEvidenceTrailPaletteStatusActivityResult(
				"source",
				undefined,
				{
					sourceFilter: "evidence",
					visible: 1,
					total: 3,
				},
			),
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			},
		];

		expect(createStatusActivityResultTimelineSearch(history, 0)).toEqual({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		});
		expect(
			createStatusActivityResultTimelineSearch(history, 1),
		).toBeUndefined();
		expect(createStatusActivityResultTimelineSearch([], 0)).toBeUndefined();
	});

	test("creates timeline searches for selected timeline result history rows", () => {
		const history = [
			createTimelineSelectedStatusActivityResult("copy", {
				filter: "audit",
				label: "timeline audit 12:00:06",
				query: "control preview",
				selectedIndex: 0,
				total: 2,
			}),
			createTimelineSelectedStatusActivityResult("export", {
				filter: "audit",
				label: "timeline audit 12:00:06",
				path: "/Users/bonjin/.config/picos/audit/picos-audit-selected.log",
				selectedIndex: 1,
				total: 2,
			}),
		];

		expect(createStatusActivityResultTimelineSearch(history, 0)).toEqual({
			filter: "audit",
			query: "control preview",
			message:
				"status activity result timeline search timeline selected copy filter=audit query=control preview",
		});
		expect(createStatusActivityResultTimelineSearch(history, 1)).toEqual({
			filter: "audit",
			query: "timeline audit 12:00:06",
			message:
				"status activity result timeline search timeline selected export filter=audit query=timeline audit 12:00:06",
		});
	});

	test("replays the latest result audit jump when the selected result cannot jump", () => {
		const history = [
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			},
		];
		const latestIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=palette visible=2/5",
			message:
				"status activity result timeline search palette source palette visible=2/5",
		});
		const selectedIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		});

		expect(latestIntent).toBeDefined();
		expect(selectedIntent).toBeDefined();
		expect(
			createStatusActivityResultTimelineSearchReplay(history, 0, latestIntent),
		).toEqual({
			filter: "audit",
			query: "action=source source=palette visible=2/5",
			message:
				"status activity result audit jump replay latest action=source source=palette visible=2/5",
		});
		expect(
			createStatusActivityResultTimelineSearchReplay(
				history,
				0,
				latestIntent,
				selectedIntent,
			),
		).toEqual({
			filter: "audit",
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result audit jump replay selected action=source source=evidence visible=1/3",
		});
		expect(
			createStatusActivityResultTimelineSearchReplay(history, 0),
		).toBeUndefined();
	});

	test("adds stale audit jump recovery hints to replay warnings", () => {
		const history = [
			{
				source: "cleanup" as const,
				action: "jump-cleanup" as const,
				message: "cleanup activity selected; jumping to selected cleanup shelf",
			},
		];
		const staleIntent = {
			label:
				"status activity result audit jump action=source source=palette visible=2/5",
			copyText:
				"action=source source=palette visible=2/5\nstatus activity result timeline search palette source palette visible=2/5\nfilter=timeline",
			selectedRow: 1,
			expanded: false,
			lines: 3,
			preview: "action=source source=palette visible=2/5",
			auditMessage:
				'clipboard intent status-activity label="status activity result audit jump action=source source=palette visible=2/5" selectedRow=1 expanded=false lines=3 preview="action=source source=palette visible=2/5"',
		};

		expect(
			createStatusActivityResultTimelineSearchReplayWarning(
				history,
				0,
				staleIntent,
			),
		).toBe("no status activity result audit jump fix=P audit jump/new result");
		expect(
			createStatusActivityResultTimelineSearchReplayWarning(history, 0),
		).toBe("no status activity result audit jump");
	});

	test("formats replay warnings as searchable timeline audit messages", () => {
		expect(
			formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
				"no status activity result audit jump fix=P audit jump/new result",
			),
		).toBe(
			"status activity result audit jump warning no status activity result audit jump fix=P audit jump/new result",
		);
		expect(formatStatusActivityResultAuditJumpReplayWarningAuditMessage()).toBe(
			"status activity result audit jump warning no status activity result audit jump",
		);
	});

	test("creates timeline searches for latest stale replay warning audit events", () => {
		const olderStaleWarning =
			formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
				"no status activity result audit jump fix=P audit jump/new result older",
			);
		const latestStaleWarning =
			formatStatusActivityResultAuditJumpReplayWarningAuditMessage(
				"no status activity result audit jump fix=P audit jump/new result",
			);
		const newerPlainWarning =
			formatStatusActivityResultAuditJumpReplayWarningAuditMessage();

		expect(
			createStatusActivityResultAuditJumpReplayWarningTimelineSearch([
				{ message: olderStaleWarning },
				{ message: latestStaleWarning },
				{ message: newerPlainWarning },
			]),
		).toEqual({
			filter: "audit",
			query: latestStaleWarning,
			message:
				"status activity result audit jump warning timeline search fix=P audit jump/new result",
		});
		expect(
			createStatusActivityResultAuditJumpReplayWarningTimelineSearch([
				{ message: newerPlainWarning },
			]),
		).toBeUndefined();
	});

	test("creates copy intents for status result audit jumps", () => {
		const jump = {
			filter: "audit" as const,
			query: "action=source source=evidence visible=1/3",
			message:
				"status activity result timeline search palette source evidence visible=1/3",
		};
		const intent = createStatusActivityResultTimelineSearchIntent(jump);

		expect(intent).toEqual({
			label:
				"status activity result audit jump action=source source=evidence visible=1/3",
			copyText:
				"action=source source=evidence visible=1/3\nstatus activity result timeline search palette source evidence visible=1/3\nfilter=audit",
			selectedRow: 1,
			expanded: false,
			lines: 3,
			preview: "action=source source=evidence visible=1/3",
			auditMessage:
				'clipboard intent status-activity label="status activity result audit jump action=source source=evidence visible=1/3" selectedRow=1 expanded=false lines=3 preview="action=source source=evidence visible=1/3"',
		});
		if (!intent) {
			throw new Error("expected status activity result audit jump intent");
		}
		expect(createStatusActivityCopyIntentTimelineSearch([intent], 0)).toEqual({
			filter: "audit",
			query:
				"status activity result audit jump action=source source=evidence visible=1/3",
			message:
				"status activity copy intent timeline search status activity result audit jump action=source source=evidence visible=1/3",
		});
		expect(createStatusActivityResultTimelineSearchIntent()).toBeUndefined();
		expect(getLatestStatusActivityResultAuditJumpIntent([intent])).toEqual(
			intent,
		);
		const secondIntent = createStatusActivityResultTimelineSearchIntent({
			filter: "audit",
			query: "action=source source=palette visible=0/3",
			message:
				"status activity result timeline search palette source palette visible=0/3",
		});
		if (!secondIntent) {
			throw new Error(
				"expected second status activity result audit jump intent",
			);
		}
		expect(
			getStatusActivityResultAuditJumpIntentCount([
				intent,
				secondIntent,
				{
					label: "status activity cleanup jump-cleanup",
					copyText:
						"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf",
					selectedRow: 1,
					expanded: false,
					lines: 2,
					preview: "cleanup jump-cleanup",
					auditMessage:
						'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=1 expanded=false lines=2 preview="cleanup jump-cleanup"',
				},
			]),
		).toBe(2);
		expect(
			getLatestStatusActivityResultAuditJumpIntent([
				{
					label: "status activity cleanup jump-cleanup",
					copyText:
						"cleanup jump-cleanup\ncleanup activity selected; jumping to selected cleanup shelf",
					selectedRow: 1,
					expanded: false,
					lines: 2,
					preview: "cleanup jump-cleanup",
					auditMessage:
						'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=1 expanded=false lines=2 preview="cleanup jump-cleanup"',
				},
			]),
		).toBeUndefined();
	});
});
