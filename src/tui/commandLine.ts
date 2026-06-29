export type CommandLineState = {
	active: boolean;
	prompt: string;
	value: string;
};

export type CommandLineInput = {
	input?: string;
	backspace?: boolean;
};

export function openCommandLine(prompt: string): CommandLineState {
	return {
		active: true,
		prompt,
		value: "",
	};
}

export function closeCommandLine(state: CommandLineState): CommandLineState {
	return {
		...state,
		active: false,
		value: "",
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
