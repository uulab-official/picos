import { describe, expect, test } from "bun:test";
import type { ConsoleEvent } from "../src/tui/events";
import {
	createTimelineSearchCleanupPreview,
	filterTimelineEvents,
	formatTimelineWorkspaceRows,
	getSelectedTimelineAuditExportPlan,
	getSelectedTimelineClipboardPreview,
	moveTimelineSelection,
	nextTimelineFilter,
	nextTimelineSearchPreset,
	saveTimelineSearchPreset,
	submitTimelineSearchCleanupConfirmation,
	type TimelineFilter,
} from "../src/tui/timelinePanel";

const events: ConsoleEvent[] = [
	{
		id: "12:00:00-info-boot",
		level: "info",
		time: "12:00:00",
		message: "picos console booted",
	},
	{
		id: "12:00:01-run-network",
		level: "run",
		time: "12:00:01",
		message: "network.inspect started",
	},
	{
		id: "12:00:02-ok-routes",
		level: "ok",
		time: "12:00:02",
		message: "routes listed 8",
	},
	{
		id: "12:00:03-warn-clipboard",
		level: "warn",
		time: "12:00:03",
		message: "clipboard locked selected port via xclip",
	},
	{
		id: "12:00:04-info-network-public",
		level: "info",
		time: "12:00:04",
		message: "network public ip 203.0.113.10 -> 203.0.113.11",
	},
	{
		id: "12:00:04-info-raw",
		level: "info",
		time: "12:00:05",
		message: "raw.view queued for adapter implementation",
	},
	{
		id: "12:00:06-warn-control-preview",
		level: "warn",
		time: "12:00:06",
		message:
			'control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
	},
];

describe("timeline TUI panel formatting", () => {
	test("cycles timeline filters for keyboard use", () => {
		const sequence: TimelineFilter[] = [];
		let current: TimelineFilter = "all";
		for (let index = 0; index < 5; index += 1) {
			current = nextTimelineFilter(current);
			sequence.push(current);
		}

		expect(sequence).toEqual(["network", "audit", "action", "raw", "all"]);
	});

	test("formats all timeline events with summary counters", () => {
		expect(formatTimelineWorkspaceRows(events, 9, "all")).toEqual([
			"SUMMARY events=7 network=1 audit=2 action=3 raw=1 filter=all",
			"TIMELINE",
			"[12:00:01] RUN  action network.inspect started",
			"[12:00:02] OK   action routes listed 8",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"[12:00:05] INFO raw    raw.view queued for adapter implementation",
			'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("filters audit events and keeps terminal height bounded", () => {
		expect(formatTimelineWorkspaceRows(events, 5, "audit")).toEqual([
			"SUMMARY events=2/7 network=1 audit=2 action=3 raw=1 filter=audit",
			"TIMELINE",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces status activity copy intent in audit search", () => {
		const copyIntentEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:07-info-status-activity-copy",
				level: "info",
				time: "12:00:07",
				message:
					'clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			},
		];

		expect(
			formatTimelineWorkspaceRows(copyIntentEvents, 5, "audit", {
				query: "status-activity",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=status-activity",
			"TIMELINE",
			'[12:00:07] INFO audit  clipboard intent status-activity label="status activity cleanup jump-cleanup" selectedRow=4 expanded=true lines=3 preview="cleanup jump-cleanup"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("surfaces status activity evidence focus in audit search", () => {
		const focusEvents: ConsoleEvent[] = [
			...events,
			{
				id: "12:00:08-info-status-evidence-focus",
				level: "info",
				time: "12:00:08",
				message:
					'status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
			},
		];

		expect(
			formatTimelineWorkspaceRows(focusEvents, 5, "audit", {
				query: "evidence focus",
			}),
		).toEqual([
			"SUMMARY events=1/8 network=0 audit=1 action=0 raw=0 filter=audit search=evidence focus",
			"TIMELINE",
			'[12:00:08] INFO audit  status activity evidence focus kind=audit shortcut=w selected=2/2 label="picos-audit-selected-2026-07-01T030000000Z.log" path="/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("marks selected timeline rows with a stable cursor", () => {
		expect(
			formatTimelineWorkspaceRows(events, 5, "audit", {
				selectedIndex: 0,
			}),
		).toEqual([
			"SUMMARY events=2/7 network=1 audit=2 action=3 raw=1 filter=audit selected=1/2",
			"TIMELINE",
			"> [12:00:03] WARN audit  clipboard locked selected port via xclip",
			'  [12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("moves timeline selection with wraparound", () => {
		expect(moveTimelineSelection(0, 1, 2)).toBe(1);
		expect(moveTimelineSelection(1, 1, 2)).toBe(0);
		expect(moveTimelineSelection(0, -1, 2)).toBe(1);
		expect(moveTimelineSelection(4, 1, 0)).toBe(0);
	});

	test("classifies control confirmation audit records", () => {
		const confirmationEvents: ConsoleEvent[] = [
			{
				id: "12:00:07-warn-control-confirm",
				level: "warn",
				time: "12:00:07",
				message:
					'control confirmation dns.flush status=confirmed-disabled risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
			},
		];

		expect(formatTimelineWorkspaceRows(confirmationEvents, 4, "audit")).toEqual(
			[
				"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
				"TIMELINE",
				'[12:00:07] WARN audit  control confirmation dns.flush status=confirmed-disabled risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
				"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
			],
		);
	});

	test("classifies control simulation audit records", () => {
		const simulationEvents: ConsoleEvent[] = [
			{
				id: "12:00:08-warn-control-simulation",
				level: "warn",
				time: "12:00:08",
				message:
					'control simulation dns.flush status=blocked-by-policy policy=mutation-disabled approval=required confirmed=true executionEnabled=false blockers=disabled-by-default,mutation-approval-required,admin-approval-required,execution-disabled adapter=macos command="sudo dscacheutil -flushcache"',
			},
		];

		expect(formatTimelineWorkspaceRows(simulationEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			'[12:00:08] WARN audit  control simulation dns.flush status=blocked-by-policy policy=mutation-disabled approval=required confirmed=true executionEnabled=false blockers=disabled-by-default,mutation-approval-required,admin-approval-required,execution-disabled adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("classifies control execution dry-run audit records", () => {
		const executionEvents: ConsoleEvent[] = [
			{
				id: "12:00:09-warn-control-execution",
				level: "warn",
				time: "12:00:09",
				message:
					'control execution dns.flush status=dry-run-executed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
			},
		];

		expect(formatTimelineWorkspaceRows(executionEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			'[12:00:09] WARN audit  control execution dns.flush status=dry-run-executed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("classifies ports file evidence unavailable records as audit", () => {
		const evidenceEvents: ConsoleEvent[] = [
			{
				id: "12:00:11-warn-port-evidence",
				level: "warn",
				time: "12:00:11",
				message:
					"ports file evidence unavailable pid=777 reason=no snapshot returned",
			},
		];

		expect(formatTimelineWorkspaceRows(evidenceEvents, 4, "audit")).toEqual([
			"SUMMARY events=1/1 network=0 audit=1 action=0 raw=0 filter=audit",
			"TIMELINE",
			"[12:00:11] WARN audit  ports file evidence unavailable pid=777 reason=no snapshot returned",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("creates clipboard previews for selected audit timeline rows", () => {
		const preview = getSelectedTimelineClipboardPreview(events, {
			filter: "audit",
			selectedIndex: 1,
		});

		expect(preview).toEqual({
			source: "timeline-audit",
			label: "timeline audit 12:00:06",
			copyText:
				'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			details: ["filter=audit", "eventId=12:00:06-warn-control-preview"],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
	});

	test("creates selected audit export plans for the visible timeline cursor", () => {
		const plan = getSelectedTimelineAuditExportPlan(events, {
			baseDir: "/Users/bonjin/.config/picos",
			filter: "audit",
			generatedAt: new Date("2026-06-30T03:00:00.000Z"),
			query: "control",
			selectedIndex: 0,
		});

		expect(plan).toEqual({
			path: "/Users/bonjin/.config/picos/audit/picos-audit-selected-2026-06-30T030000000Z.log",
			content: [
				"# picos audit log",
				"generatedAt=2026-06-30T03:00:00.000Z",
				"scope=selected",
				"query=control",
				"events=1",
				"",
				'[12:00:06] WARN control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
				"",
			].join("\n"),
			eventCount: 1,
			scope: "selected",
			query: "control",
		});
	});

	test("filters network state-change events separately from actions", () => {
		expect(formatTimelineWorkspaceRows(events, 4, "network")).toEqual([
			"SUMMARY events=1/7 network=1 audit=2 action=3 raw=1 filter=network",
			"TIMELINE",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
	});

	test("searches timeline events and keeps preset helpers stable", () => {
		expect(
			filterTimelineEvents(events, "clipboard").map((event) => event.id),
		).toEqual(["12:00:03-warn-clipboard"]);
		expect(
			formatTimelineWorkspaceRows(events, 5, "all", {
				query: "network",
				presets: ["network", "clipboard"],
			}),
		).toEqual([
			"SUMMARY events=2/7 network=1 audit=0 action=1 raw=0 filter=all search=network presets=network|clipboard",
			"TIMELINE",
			"[12:00:01] RUN  action network.inspect started",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"FILTERS t cycle · j/k select · c copy selected · e export selected · f search · P save · ] preset · D cleanup · timeline.export writes audit file",
		]);
		expect(saveTimelineSearchPreset([], " network ")).toEqual(["network"]);
		expect(saveTimelineSearchPreset(["audit", "network"], "audit")).toEqual([
			"audit",
			"network",
		]);
		expect(nextTimelineSearchPreset(["network", "audit"], "")).toBe("network");
		expect(nextTimelineSearchPreset(["network", "audit"], "network")).toBe(
			"audit",
		);
		expect(nextTimelineSearchPreset([], "network")).toBeUndefined();
	});

	test("requires exact confirmation before clearing timeline search presets", () => {
		const presets = ["network", "clipboard"];
		const preview = createTimelineSearchCleanupPreview(presets);

		expect(preview).toEqual({
			count: 2,
			confirmationPhrase: "clear timeline",
			cleanup: {
				id: "timeline.searches",
				label: "Timeline search presets",
				scope: "timeline",
				count: 2,
				verb: "clear",
				confirmationPhrase: "clear timeline",
				rows: [
					"CONFIG CLEANUP",
					"target=Timeline search presets",
					"scope=timeline count=2",
					"confirm clear timeline locked",
				],
			},
			rows: [
				"TIMELINE SEARCH CLEANUP",
				"presets=2",
				"confirm clear timeline locked",
			],
		});
		expect(
			submitTimelineSearchCleanupConfirmation(presets, "clear timelines"),
		).toEqual({
			confirmed: false,
			message: "timeline search cleanup rejected",
			presets,
			removed: 0,
		});
		expect(
			submitTimelineSearchCleanupConfirmation(presets, " clear timeline "),
		).toEqual({
			confirmed: true,
			message: "timeline search cleanup removed 2 presets",
			presets: [],
			removed: 2,
		});
		expect(createTimelineSearchCleanupPreview([])).toBeUndefined();
	});
});
