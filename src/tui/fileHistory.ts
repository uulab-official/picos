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
