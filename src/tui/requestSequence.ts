// Several TUI callbacks write state after awaiting a collector that can take
// seconds, and none of the schedulers wait for the previous run. Without a
// sequence the slower request wins, so an older result overwrites a newer one.
//
// The mechanism lives here; the counter does not. Each group of state that must
// stay consistent owns its own ref, and every writer of that group shares it.
// Sharing within a group is the point: two writers holding separate counters
// would each consider itself current while overwriting the other. Separating
// across groups is equally deliberate, so a slow process inspection does not
// discard a fresh network refresh.
//
// This lives outside `App.tsx` because nothing under `tests/` touches that file,
// so the invariants below would otherwise be unverified.
export function beginRequest(current: number): number {
	return current + 1;
}

// A request is stale as soon as a newer one has started. Compared rather than
// tested against a boolean, so an older request cannot mistake a newer one's
// arrival for its own completion.
export function isStaleRequest(current: number, token: number): boolean {
	return current !== token;
}
