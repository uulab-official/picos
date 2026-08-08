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

export type FileHistoryNotice = {
	level: "info";
	message: string;
};

export type FileNavigationTransition = {
	targetPath: string;
	backHistory: string[];
	forwardHistory: string[];
	changed: boolean;
};

export function prepareFileNavigation(input: {
	root: string;
	targetPath: string;
	backHistory: string[];
	forwardHistory: string[];
}): FileNavigationTransition {
	if (input.targetPath === input.root) {
		return {
			targetPath: input.targetPath,
			backHistory: input.backHistory,
			forwardHistory: input.forwardHistory,
			changed: false,
		};
	}

	return {
		targetPath: input.targetPath,
		backHistory: pushFileHistory(input.backHistory, input.root),
		forwardHistory: [],
		changed: true,
	};
}

export type FileHistoryMoveTransition = {
	targetPath?: string;
	backHistory: string[];
	forwardHistory: string[];
	notice: FileHistoryNotice;
};

export function prepareFileHistoryMove(input: {
	direction: "back" | "forward";
	root: string;
	backHistory: string[];
	forwardHistory: string[];
}): FileHistoryMoveTransition {
	if (input.direction === "back") {
		const next = popFileHistory(input.backHistory);
		if (!next.previousRoot) {
			return {
				backHistory: input.backHistory,
				forwardHistory: input.forwardHistory,
				notice: { level: "info", message: "no previous file location" },
			};
		}
		return {
			targetPath: next.previousRoot,
			backHistory: next.history,
			forwardHistory: pushFileForwardHistory(input.forwardHistory, input.root),
			notice: { level: "info", message: `back to ${next.previousRoot}` },
		};
	}

	const next = popFileForwardHistory(input.forwardHistory);
	if (!next.nextRoot) {
		return {
			backHistory: input.backHistory,
			forwardHistory: input.forwardHistory,
			notice: { level: "info", message: "no forward file location" },
		};
	}
	return {
		targetPath: next.nextRoot,
		backHistory: pushFileHistory(input.backHistory, input.root),
		forwardHistory: next.history,
		notice: { level: "info", message: `forward to ${next.nextRoot}` },
	};
}
