export function pushFileHistory(history: string[], root: string): string[] {
	if (history.at(-1) === root) {
		return history;
	}

	return [...history, root];
}

export function popFileHistory(history: string[]): {
	history: string[];
	previousRoot?: string;
} {
	if (!history.length) {
		return { history: [], previousRoot: undefined };
	}

	return {
		history: history.slice(0, -1),
		previousRoot: history.at(-1),
	};
}

export function pushFileForwardHistory(
	history: string[],
	root: string,
): string[] {
	return pushFileHistory(history, root);
}

export function popFileForwardHistory(history: string[]): {
	history: string[];
	nextRoot?: string;
} {
	if (!history.length) {
		return { history: [], nextRoot: undefined };
	}

	return {
		history: history.slice(0, -1),
		nextRoot: history.at(-1),
	};
}
