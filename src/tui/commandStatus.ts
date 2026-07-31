export type CommandStatus = "idle" | "running";

// The status indicator is shared by every long-running action, so it cannot be a
// plain flag. With two actions in flight the first to finish would report idle
// while the second was still working, which is the same class of defect as a
// superseded run publishing onto the current one: shared state written by whoever
// happens to finish first. Counting entries makes the indicator describe the
// session rather than the last action to return.
//
// These live outside `App.tsx` because nothing under `tests/` touches that file,
// so the invariants below would otherwise be unverified.
export function beginCommandStatusCount(count: number): number {
	return Math.max(0, count) + 1;
}

// Floored at zero, so an unbalanced end from a path that returned without a
// matching begin cannot drive the count negative and strand the indicator on
// running for the rest of the session.
export function endCommandStatusCount(count: number): number {
	return Math.max(0, count - 1);
}

export function resolveCommandStatus(count: number): CommandStatus {
	return count > 0 ? "running" : "idle";
}
