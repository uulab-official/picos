import type { OperationPreset } from "../core/types";

// Run state for the Operations workspace, shaped after the read-only SFTP session
// diagnostic in `src/core/sftp.ts`: every transition returns a new value rather
// than mutating, so a row can re-render while the run is still in flight.
//
// One deviation from `2026-07-29-operations-workspace-options.md` is deliberate.
// That document proposed `status=sampling`, which only reads correctly for a
// monitor preset; the workspace runs all three kinds, so the in-flight status is
// `running` and the sample counter carries the kind-specific meaning.
export type OperationRunStatus =
	| "running"
	| "cancelling"
	| "completed"
	| "cancelled"
	| "failed";

export type OperationRunProgress = {
	presetId: string;
	kind: OperationPreset["kind"];
	status: OperationRunStatus;
	requestedCount: number;
	returnedCount: number;
	intervalMs: number;
	startedAt: number;
	finishedAt?: number;
	durationMs?: number;
	message: string;
};

export function startOperationRun(
	preset: OperationPreset,
	now = Date.now(),
): OperationRunProgress {
	return {
		presetId: preset.id,
		kind: preset.kind,
		status: "running",
		// Only a monitor preset takes more than one reading, so the other kinds
		// report a single unit of work rather than a meaningless zero.
		requestedCount: preset.kind === "monitor" ? preset.samples : 1,
		returnedCount: 0,
		intervalMs: preset.kind === "monitor" ? preset.intervalMs : 0,
		startedAt: now,
		message: "running read-only inspector",
	};
}

export function advanceOperationRun(
	progress: OperationRunProgress,
	returnedCount: number,
): OperationRunProgress {
	if (progress.status !== "running" && progress.status !== "cancelling") {
		return progress;
	}
	const clamped = Math.min(
		Math.max(returnedCount, progress.returnedCount),
		progress.requestedCount,
	);
	return clamped === progress.returnedCount
		? progress
		: { ...progress, returnedCount: clamped };
}

// Only monitor sampling has a window to interrupt. A logs or process run is a
// single collector call already bounded by its own timeout, with no partial
// result worth keeping, so asking to stop one is a no-op rather than an error.
export function requestOperationRunCancellation(
	progress: OperationRunProgress,
): OperationRunProgress {
	return progress.status === "running" && progress.kind === "monitor"
		? {
				...progress,
				status: "cancelling",
				message: "cancellation requested; finishing current sample",
			}
		: progress;
}

export function finishOperationRun(
	progress: OperationRunProgress,
	status: Extract<OperationRunStatus, "completed" | "cancelled" | "failed">,
	message: string,
	now = Date.now(),
): OperationRunProgress {
	return {
		...progress,
		status,
		finishedAt: now,
		durationMs: Math.max(0, now - progress.startedAt),
		message,
	};
}

export function formatOperationRunProgressRows(
	progress?: OperationRunProgress,
): string[] {
	if (!progress) {
		return [
			"OPERATIONS RUN CONTROL none",
			"status=idle preset=none sample=0/0 interval=- elapsed=-",
			"controls=enter run selected preset",
		];
	}
	const elapsed =
		progress.durationMs === undefined ? "running" : `${progress.durationMs}ms`;
	const interval = progress.kind === "monitor" ? progress.intervalMs : "-";
	return [
		`OPERATIONS RUN CONTROL ${progress.presetId}`,
		`status=${progress.status} preset=${progress.presetId} sample=${progress.returnedCount}/${progress.requestedCount} interval=${interval} elapsed=${elapsed}`,
		`kind=${progress.kind} ${progress.message}`,
		`controls=${formatOperationRunControls(progress)}`,
	];
}

// Fixed leading two words and a closed status set, so the Status Activity parser
// can pick these up with the same shape it already uses for `remote connect`.
export function formatOperationRunAuditMessage(
	progress: OperationRunProgress,
): string | undefined {
	const status = auditStatus(progress.status);
	return status
		? `operations run ${status} ${progress.presetId} samples=${progress.returnedCount}/${progress.requestedCount}`
		: undefined;
}

function auditStatus(status: OperationRunStatus): string | undefined {
	if (status === "running") {
		// Emitted as its own row on purpose: without it a run cancelled before its
		// second sample would leave no trace that it started at all.
		return "started";
	}
	// `cancelling` is transient and is followed by a terminal `cancelled` row, so
	// it would only duplicate the audit trail.
	return status === "cancelling" ? undefined : status;
}

function formatOperationRunControls(progress: OperationRunProgress): string {
	if (progress.status === "running" || progress.status === "cancelling") {
		return progress.kind === "monitor"
			? "X cancel run"
			: "run is a single bounded call · no cancel";
	}
	return progress.status === "completed"
		? "enter run again"
		: "R retry via exact confirmation · enter run again";
}
