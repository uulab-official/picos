export type CommandLineState = {
	active: boolean;
	prompt: string;
	value: string;
	fieldIndex?: number;
	fieldTouchedIndexes?: number[];
};

export type CommandLineInput = {
	input?: string;
	backspace?: boolean;
};

export type CommandLineOpenOptions = {
	value?: string;
	fieldIndex?: number;
	fieldTouchedIndexes?: number[];
};

export function openCommandLine(
	prompt: string,
	options: CommandLineOpenOptions = {},
): CommandLineState {
	const state: CommandLineState = {
		active: true,
		prompt,
		value: options.value ?? "",
	};
	if (options.fieldIndex !== undefined) {
		state.fieldIndex = Math.max(0, options.fieldIndex);
	}
	const touchedIndexes = normalizeFieldIndexes(
		options.fieldTouchedIndexes ?? [],
	);
	if (touchedIndexes.length) {
		state.fieldTouchedIndexes = touchedIndexes;
	}
	return state;
}

export function closeCommandLine(state: CommandLineState): CommandLineState {
	return {
		...state,
		active: false,
		value: "",
	};
}

export function moveCommandLineField(
	state: CommandLineState,
	total: number,
	direction: "next" | "previous",
): CommandLineState {
	if (!state.active || total <= 0) {
		return state;
	}
	const current = Math.min(Math.max(state.fieldIndex ?? 0, 0), total - 1);
	const offset = direction === "next" ? 1 : -1;
	return {
		...state,
		fieldIndex: (current + offset + total) % total,
	};
}

export function isCommandLineFieldTouched(state: CommandLineState): boolean {
	return (state.fieldTouchedIndexes ?? []).includes(state.fieldIndex ?? 0);
}

export function markCommandLineFieldTouched(
	state: CommandLineState,
): CommandLineState {
	const fieldIndex = Math.max(0, state.fieldIndex ?? 0);
	return {
		...state,
		fieldTouchedIndexes: normalizeFieldIndexes([
			...(state.fieldTouchedIndexes ?? []),
			fieldIndex,
		]),
	};
}

export function applyCommandLineInput(
	state: CommandLineState,
	event: CommandLineInput,
): CommandLineState {
	if (!state.active) {
		return state;
	}

	if (event.backspace) {
		return {
			...state,
			value: state.value.slice(0, -1),
		};
	}

	if (event.input?.length !== 1 || event.input < " ") {
		return state;
	}

	return {
		...state,
		value: `${state.value}${event.input}`,
	};
}

function normalizeFieldIndexes(indexes: number[]): number[] {
	return Array.from(
		new Set(
			indexes
				.filter((index) => Number.isInteger(index) && index >= 0)
				.map((index) => Math.floor(index)),
		),
	).sort((left, right) => left - right);
}
