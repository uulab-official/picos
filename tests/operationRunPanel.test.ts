import { describe, expect, test } from "bun:test";
import {
	advanceOperationRun,
	canStartOperationRun,
	finishMonitorOperationRun,
	finishOperationRun,
	formatOperationRunAuditMessage,
	formatOperationRunProgressRows,
	formatOperationsWorkspaceRows,
	requestOperationRunCancellation,
	selectOperationPreset,
	startOperationRun,
} from "../src/tui/operationRunPanel";

const monitorPreset = {
	id: "pulse",
	kind: "monitor",
	samples: 10,
	intervalMs: 500,
} as const;

const logsPreset = {
	id: "errors",
	kind: "logs",
	limit: 20,
	level: "fail",
	filter: "",
} as const;

describe("operations run control", () => {
	test("starts a monitor run with the preset sample window", () => {
		const run = startOperationRun(monitorPreset, 1000);

		expect(run).toEqual({
			presetId: "pulse",
			kind: "monitor",
			status: "running",
			requestedCount: 10,
			returnedCount: 0,
			intervalMs: 500,
			startedAt: 1000,
			message: "running read-only inspector",
		});
		expect(formatOperationRunProgressRows(run)).toEqual([
			"OPERATIONS RUN CONTROL pulse",
			"status=running preset=pulse sample=0/10 interval=500 elapsed=running",
			"kind=monitor running read-only inspector",
			"controls=X cancel run",
		]);
	});

	test("reports a single unit of work for kinds that take one reading", () => {
		const run = startOperationRun(logsPreset, 1000);

		expect(run.requestedCount).toBe(1);
		expect(run.intervalMs).toBe(0);
		expect(formatOperationRunProgressRows(run)[1]).toBe(
			"status=running preset=errors sample=0/1 interval=- elapsed=running",
		);
		// A logs run is one collector call bounded by its own timeout, so there is
		// no window to interrupt and the control row says so instead of offering a
		// key that would do nothing.
		expect(formatOperationRunProgressRows(run).at(-1)).toBe(
			"controls=run is a single bounded call · no cancel",
		);
	});

	test("advances the sample counter monotonically within the window", () => {
		const run = startOperationRun(monitorPreset, 1000);

		expect(advanceOperationRun(run, 3).returnedCount).toBe(3);
		// Never walks backwards, even if a later report arrives out of order.
		expect(
			advanceOperationRun(advanceOperationRun(run, 3), 2).returnedCount,
		).toBe(3);
		// Never exceeds what was requested.
		expect(advanceOperationRun(run, 99).returnedCount).toBe(10);
		// An unchanged count returns the same value rather than a new object, so a
		// re-render is not triggered for every no-op report.
		const advanced = advanceOperationRun(run, 3);
		expect(advanceOperationRun(advanced, 3)).toBe(advanced);
	});

	test("only offers cancellation for the kind that has a window to stop", () => {
		const monitorRun = startOperationRun(monitorPreset, 1000);
		const cancelling = requestOperationRunCancellation(monitorRun);

		expect(cancelling.status).toBe("cancelling");
		expect(cancelling.message).toBe(
			"cancellation requested; finishing current sample",
		);
		// Still cancellable-looking in the control row, because the current sample
		// is still in flight until the collector returns.
		expect(formatOperationRunProgressRows(cancelling).at(-1)).toBe(
			"controls=X cancel run",
		);

		const logsRun = startOperationRun(logsPreset, 1000);

		expect(requestOperationRunCancellation(logsRun)).toBe(logsRun);
		// A finished run cannot be cancelled either.
		const done = finishOperationRun(monitorRun, "completed", "done", 1500);
		expect(requestOperationRunCancellation(done)).toBe(done);
	});

	test("records duration and a retry control on a stopped run", () => {
		const stopped = finishOperationRun(
			advanceOperationRun(startOperationRun(monitorPreset, 1000), 3),
			"cancelled",
			"stopped by operator",
			1750,
		);

		expect(stopped.durationMs).toBe(750);
		expect(formatOperationRunProgressRows(stopped)).toEqual([
			"OPERATIONS RUN CONTROL pulse",
			"status=cancelled preset=pulse sample=3/10 interval=500 elapsed=750ms",
			"kind=monitor stopped by operator",
			"controls=R retry via exact confirmation · enter run again",
		]);
	});

	test("formats an idle control block when nothing has run", () => {
		expect(formatOperationRunProgressRows()).toEqual([
			"OPERATIONS RUN CONTROL none",
			"status=idle preset=none sample=0/0 interval=- elapsed=-",
			"controls=enter run selected preset",
		]);
	});

	test("emits audit rows with a fixed prefix and a closed status set", () => {
		const run = startOperationRun(monitorPreset, 1000);

		// `started` is its own row so a run cancelled before its second sample still
		// leaves a trace that it ran.
		expect(formatOperationRunAuditMessage(run)).toBe(
			"operations run started pulse samples=0/10",
		);

		const partial = advanceOperationRun(run, 3);

		// `cancelling` is transient and is followed by a terminal row, so it would
		// only duplicate the trail.
		expect(
			formatOperationRunAuditMessage(requestOperationRunCancellation(partial)),
		).toBeUndefined();
		expect(
			formatOperationRunAuditMessage(
				finishOperationRun(partial, "cancelled", "stopped", 1750),
			),
		).toBe("operations run cancelled pulse samples=3/10");
		expect(
			formatOperationRunAuditMessage(
				finishOperationRun(
					advanceOperationRun(run, 10),
					"completed",
					"done",
					1750,
				),
			),
		).toBe("operations run completed pulse samples=10/10");
	});
});

describe("operations workspace rows", () => {
	test("lists saved presets with the CLI description and a run control block", () => {
		expect(
			formatOperationsWorkspaceRows([monitorPreset, logsPreset], {
				selectedIndex: 0,
				visibleRows: 20,
			}),
		).toEqual([
			"OPERATIONS PRESETS saved=2 max=12",
			"> 001 pulse monitor samples=10 interval=500ms",
			"  002 errors logs limit=20 level=fail filter=-",
			"managed-by=picos operations · run only · edits are CLI-only",
			"OPERATIONS RUN CONTROL none",
			"status=idle preset=none sample=0/0 interval=- elapsed=-",
			"controls=enter run selected preset",
		]);
	});

	test("points an empty shelf at the CLI that owns it", () => {
		expect(
			formatOperationsWorkspaceRows([], { selectedIndex: 0, visibleRows: 20 }),
		).toEqual([
			"OPERATIONS PRESETS saved=0 max=12",
			"no saved operation presets · picos operations save <id> <kind>",
			"managed-by=picos operations · run only · edits are CLI-only",
			"OPERATIONS RUN CONTROL none",
			"status=idle preset=none sample=0/0 interval=- elapsed=-",
			"controls=enter run selected preset",
		]);
	});

	test("shows the active run beneath the list", () => {
		const run = advanceOperationRun(startOperationRun(monitorPreset, 1000), 4);

		expect(
			formatOperationsWorkspaceRows([monitorPreset], {
				selectedIndex: 0,
				visibleRows: 20,
				run,
			}),
		).toEqual([
			"OPERATIONS PRESETS saved=1 max=12",
			"> 001 pulse monitor samples=10 interval=500ms",
			"managed-by=picos operations · run only · edits are CLI-only",
			"OPERATIONS RUN CONTROL pulse",
			"status=running preset=pulse sample=4/10 interval=500 elapsed=running",
			"kind=monitor running read-only inspector",
			"controls=X cancel run",
		]);
	});
});

describe("operations run cancellation window", () => {
	const singleSamplePreset = {
		id: "once",
		kind: "monitor",
		samples: 1,
		intervalMs: 500,
	} as const;

	test("does not offer cancellation for a single-sample monitor run", () => {
		const run = startOperationRun(singleSamplePreset, 1000);

		// The predicate that observes cancellation runs between samples, so a
		// one-sample run has nowhere to check. Offering the key would advertise
		// something that cannot happen.
		expect(requestOperationRunCancellation(run)).toBe(run);
		expect(formatOperationRunProgressRows(run).at(-1)).toBe(
			"controls=run is a single bounded call · no cancel",
		);
	});

	test("offers cancellation as soon as more than one sample is requested", () => {
		const run = startOperationRun({ ...singleSamplePreset, samples: 2 }, 1000);

		expect(requestOperationRunCancellation(run).status).toBe("cancelling");
		expect(formatOperationRunProgressRows(run).at(-1)).toBe(
			"controls=X cancel run",
		);
	});

	test("clamps a selection that outlived the preset it pointed at", () => {
		// A preset removed through the CLI while the TUI is open shrinks the list
		// under a held selection. Without clamping the cursor marks nothing.
		const rows = formatOperationsWorkspaceRows([monitorPreset], {
			selectedIndex: 5,
			visibleRows: 20,
		});

		expect(rows[1]).toBe("> 001 pulse monitor samples=10 interval=500ms");
		expect(
			formatOperationsWorkspaceRows([], {
				selectedIndex: 5,
				visibleRows: 20,
			})[1],
		).toBe("no saved operation presets · picos operations save <id> <kind>");
	});
});

describe("operations run decisions", () => {
	test("treats a cancelling run as in flight, not as idle", () => {
		const running = startOperationRun(monitorPreset, 1000);

		expect(canStartOperationRun(undefined)).toBeTrue();
		expect(canStartOperationRun(running)).toBeFalse();
		// The defect this guards: `cancelling` read as idle allowed a second run to
		// start and clear the first run's cancellation.
		expect(
			canStartOperationRun(requestOperationRunCancellation(running)),
		).toBeFalse();
		expect(
			canStartOperationRun(
				finishOperationRun(running, "completed", "done", 1500),
			),
		).toBeTrue();
		expect(
			canStartOperationRun(
				finishOperationRun(running, "cancelled", "stopped", 1500),
			),
		).toBeTrue();
	});

	test("resolves a selection that outran the shelf", () => {
		expect(selectOperationPreset([monitorPreset, logsPreset], 1)?.id).toBe(
			"errors",
		);
		expect(selectOperationPreset([monitorPreset, logsPreset], 9)?.id).toBe(
			"errors",
		);
		expect(selectOperationPreset([monitorPreset], -1)?.id).toBe("pulse");
		expect(selectOperationPreset([], 0)).toBeUndefined();
	});

	test("words a monitor outcome from what was actually collected", () => {
		const running = startOperationRun(monitorPreset, 1000);

		expect(finishMonitorOperationRun(running, 10, false, 1750)).toMatchObject({
			status: "completed",
			returnedCount: 10,
			message: "collected 10 samples",
			durationMs: 750,
		});
		expect(finishMonitorOperationRun(running, 3, true, 1750)).toMatchObject({
			status: "cancelled",
			returnedCount: 3,
			message: "stopped after 3 of 10 samples",
		});
		// A count beyond the request is clamped before it reaches the wording, so the
		// row can never read "collected 99 samples" for a ten-sample window.
		expect(finishMonitorOperationRun(running, 99, false, 1750).message).toBe(
			"collected 10 samples",
		);
	});
});
