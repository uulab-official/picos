import {
	formatOperationPreset,
	MAX_OPERATION_PRESETS,
} from "../core/operationPresets";
import type { OperationPreset } from "../core/types";
import { clampIndex, getVisibleWindow } from "./navigation";

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

// Extracted from the run callback in `App.tsx` on purpose. Nothing under `tests/`
// touches that file, so any decision left inside it is unverified by construction,
// and three of the defects found reviewing this feature lived exactly there. The
// I/O stays in the component; the decisions live here.
//
// `cancelling` is in-flight, not idle. Reading it as idle let a second run start
// while the first was still sampling, and the second run then un-cancelled it.
export function canStartOperationRun(current?: OperationRunProgress): boolean {
	return current?.status !== "running" && current?.status !== "cancelling";
}

// Clamped rather than indexed directly, because the shelf shrinks underneath a
// held selection when a preset is removed through the CLI while the TUI is open.
export function selectOperationPreset(
	presets: OperationPreset[],
	selectedIndex: number,
): OperationPreset | undefined {
	return presets[clampIndex(selectedIndex, presets.length)];
}

// Terminal state for a monitor run, including the wording. Kept here rather than
// composed inline at the call site so the outcome selection and the message are
// both covered by a test.
export function finishMonitorOperationRun(
	progress: OperationRunProgress,
	returnedCount: number,
	cancelled: boolean,
	now = Date.now(),
): OperationRunProgress {
	const advanced = advanceOperationRun(progress, returnedCount);
	return finishOperationRun(
		advanced,
		cancelled ? "cancelled" : "completed",
		cancelled
			? `stopped after ${advanced.returnedCount} of ${advanced.requestedCount} samples`
			: `collected ${advanced.returnedCount} samples`,
		now,
	);
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

// Only monitor sampling has a window to interrupt, and only when more than one
// sample was requested: the predicate that observes cancellation runs between
// samples, so a single-sample run has nowhere to check. A logs or process run is
// likewise one collector call already bounded by its own timeout, with no partial
// result worth keeping. In all those cases asking to stop is a no-op rather than
// an error, and `formatOperationRunControls` says so instead of offering the key.
export function canCancelOperationRun(progress: OperationRunProgress): boolean {
	return progress.kind === "monitor" && progress.requestedCount > 1;
}

export function requestOperationRunCancellation(
	progress: OperationRunProgress,
): OperationRunProgress {
	return progress.status === "running" && canCancelOperationRun(progress)
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
		return canCancelOperationRun(progress)
			? "X cancel run"
			: "run is a single bounded call · no cancel";
	}
	return progress.status === "completed"
		? "enter run again"
		: "R retry via exact confirmation · enter run again";
}

// Preset descriptions reuse the CLI formatter rather than a second layout, so the
// workspace can never describe a preset differently from `picos operations list`.
export function formatOperationsWorkspaceRows(
	presets: OperationPreset[],
	options: {
		selectedIndex: number;
		visibleRows: number;
		run?: OperationRunProgress;
	},
): string[] {
	const controlRows = formatOperationRunProgressRows(options.run);
	const listRows = Math.max(1, options.visibleRows - controlRows.length - 3);
	// Clamped here rather than trusted, because the shelf can shrink underneath a
	// held selection when a preset is removed through the CLI while the TUI is open.
	const selectedIndex = clampIndex(options.selectedIndex, presets.length);
	const window = getVisibleWindow(presets.length, selectedIndex, listRows);
	const rows = [
		`OPERATIONS PRESETS saved=${presets.length} max=${MAX_OPERATION_PRESETS}`,
	];
	if (presets.length === 0) {
		rows.push("no saved operation presets · picos operations save <id> <kind>");
	} else {
		for (const [offset, preset] of presets
			.slice(window.start, window.end)
			.entries()) {
			const index = window.start + offset;
			const marker = index === selectedIndex ? "> " : "  ";
			rows.push(
				`${marker}${String(index + 1).padStart(3, "0")} ${formatOperationPreset(preset)}`,
			);
		}
		if (window.start > 0) {
			rows.push(`hidden above=${window.start}`);
		}
		if (presets.length > window.end) {
			rows.push(`hidden below=${presets.length - window.end}`);
		}
	}
	rows.push("managed-by=picos operations · run only · edits are CLI-only");
	return [...rows, ...controlRows];
}
