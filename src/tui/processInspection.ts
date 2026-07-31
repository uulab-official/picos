// Two callbacks write the process detail and file snapshot state, and both do so
// after awaiting a collector that can take seconds: inspecting the process behind a
// selected endpoint, and loading file evidence for a port. Neither checked whether
// its own request was still the newest, so with two in flight the slower one won
// and the workspace could show one process's detail beside another's open files.
//
// They share one sequence rather than holding one each, because sharing is what
// makes the cross-callback case safe: whichever request started last is the only
// one allowed to write, no matter which callback issued it.
//
// This lives outside `App.tsx` because nothing under `tests/` touches that file,
// so the invariants below would otherwise be unverified.
export function beginProcessInspection(current: number): number {
	return current + 1;
}

// A request is stale as soon as a newer one has started. Compared rather than
// checked for equality against a boolean, so an older request cannot mistake a
// newer one's arrival for its own.
export function isStaleProcessInspection(
	current: number,
	token: number,
): boolean {
	return current !== token;
}
