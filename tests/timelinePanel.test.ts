import { describe, expect, test } from "bun:test";
import type { ConsoleEvent } from "../src/tui/events";
import {
	formatTimelineWorkspaceRows,
	nextTimelineFilter,
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
		id: "12:00:04-info-raw",
		level: "info",
		time: "12:00:04",
		message: "raw.view queued for adapter implementation",
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

		expect(sequence).toEqual(["audit", "action", "raw", "all", "audit"]);
	});

	test("formats all timeline events with summary counters", () => {
		expect(formatTimelineWorkspaceRows(events, 8, "all")).toEqual([
			"SUMMARY events=5 audit=1 action=3 raw=1 filter=all",
			"TIMELINE",
			"[12:00:00] INFO action picos console booted",
			"[12:00:01] RUN  action network.inspect started",
			"[12:00:02] OK   action routes listed 8",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			"[12:00:04] INFO raw    raw.view queued for adapter implementation",
			"FILTERS t cycle · timeline.export writes audit file",
		]);
	});

	test("filters audit events and keeps terminal height bounded", () => {
		expect(formatTimelineWorkspaceRows(events, 4, "audit")).toEqual([
			"SUMMARY events=1/5 audit=1 action=3 raw=1 filter=audit",
			"TIMELINE",
			"[12:00:03] WARN audit  clipboard locked selected port via xclip",
			"FILTERS t cycle · timeline.export writes audit file",
		]);
	});
});
