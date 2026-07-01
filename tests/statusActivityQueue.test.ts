import { describe, expect, test } from "bun:test";
import { formatStatusActivityQueueRows } from "../src/tui/statusActivityQueue";

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
});
