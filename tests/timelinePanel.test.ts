import { describe, expect, test } from "bun:test";
import type { ConsoleEvent } from "../src/tui/events";
import {
	filterTimelineEvents,
	formatTimelineWorkspaceRows,
	nextTimelineFilter,
	nextTimelineSearchPreset,
	saveTimelineSearchPreset,
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
			"FILTERS t cycle · f search · P save · ] preset · timeline.export writes audit file",
		]);
	});

	test("filters audit events and keeps terminal height bounded", () => {
		expect(formatTimelineWorkspaceRows(events, 5, "audit")).toEqual([
			"SUMMARY events=2/7 network=1 audit=2 action=3 raw=1 filter=audit",
			"TIMELINE",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			'[12:00:06] WARN audit  control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
			"FILTERS t cycle · f search · P save · ] preset · timeline.export writes audit file",
		]);
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
				"FILTERS t cycle · f search · P save · ] preset · timeline.export writes audit file",
			],
		);
	});

	test("filters network state-change events separately from actions", () => {
		expect(formatTimelineWorkspaceRows(events, 4, "network")).toEqual([
			"SUMMARY events=1/7 network=1 audit=2 action=3 raw=1 filter=network",
			"TIMELINE",
			"[12:00:04] INFO network network public ip 203.0.113.10 -> 203.0.113.11",
			"FILTERS t cycle · f search · P save · ] preset · timeline.export writes audit file",
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
			"FILTERS t cycle · f search · P save · ] preset · timeline.export writes audit file",
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
});
