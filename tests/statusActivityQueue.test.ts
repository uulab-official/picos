import { describe, expect, test } from "bun:test";
import {
	formatStatusActivityDetailRows,
	formatStatusActivityQueueRows,
	moveStatusActivitySource,
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
			"controls=,/. activity source · detail mirrors the selected Status console",
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
			"controls=,/. activity source · detail mirrors the selected Status console",
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
});
