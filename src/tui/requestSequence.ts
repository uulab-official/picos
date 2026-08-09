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

export function beginRequestWithPublication(
	currentRequest: number,
	currentPublication: number,
): { requestToken: number; publicationToken: number } {
	return {
		requestToken: beginRequest(currentRequest),
		publicationToken: beginRequest(currentPublication),
	};
}

// A request is stale as soon as a newer one has started. Compared rather than
// tested against a boolean, so an older request cannot mistake a newer one's
// arrival for its own completion.
export function isStaleRequest(current: number, token: number): boolean {
	return current !== token;
}

export function classifyRequestPublication(
	current: number,
	token: number,
): "current" | "stale" {
	return isStaleRequest(current, token) ? "stale" : "current";
}

export type CurrentBatchReadOutcome<Active, Archive> =
	| { status: "success"; active: Active; archive: Archive }
	| { status: "failure"; error: unknown };

export async function coordinateCurrentBatchRead<
	Active,
	Archive,
	CurrentState,
	Transition,
>(input: {
	readActive: () => Promise<Active>;
	readArchive: () => Promise<Archive>;
	getCurrentState: () => CurrentState;
	classify: (input: {
		currentState: CurrentState;
		outcome: CurrentBatchReadOutcome<Active, Archive>;
	}) => Transition;
}): Promise<Transition> {
	try {
		const [active, archive] = await Promise.all([
			input.readActive(),
			input.readArchive(),
		]);
		return input.classify({
			currentState: input.getCurrentState(),
			outcome: { status: "success", active, archive },
		});
	} catch (error) {
		return input.classify({
			currentState: input.getCurrentState(),
			outcome: { status: "failure", error },
		});
	}
}
