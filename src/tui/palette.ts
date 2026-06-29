import type { PicosAction } from "../core/actions";
import { getNextIndex } from "./navigation";

export type CommandPaletteState = {
	active: boolean;
	selectedIndex: number;
	query: string;
};

export function openCommandPalette(): CommandPaletteState {
	return {
		active: true,
		selectedIndex: 0,
		query: "",
	};
}

export function closeCommandPalette(
	state: CommandPaletteState,
): CommandPaletteState {
	return {
		...state,
		active: false,
	};
}

export function moveCommandPalette(
	state: CommandPaletteState,
	total: number,
	direction: "next" | "previous",
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		selectedIndex: getNextIndex(state.selectedIndex, total, direction),
	};
}

export function appendCommandPaletteQuery(
	state: CommandPaletteState,
	input: string,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	const printableInput = input.replace(/[^\x20-\x7e]/g, "");
	if (printableInput.length === 0) {
		return state;
	}

	return {
		...state,
		query: `${state.query}${printableInput}`,
		selectedIndex: 0,
	};
}

export function backspaceCommandPaletteQuery(
	state: CommandPaletteState,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		query: state.query.slice(0, -1),
		selectedIndex: 0,
	};
}

export function getFilteredPaletteActions(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction[] {
	const query = state.query.trim().toLowerCase();
	if (query.length === 0) {
		return actions;
	}

	return actions.filter((action) =>
		[
			action.id,
			action.title,
			action.description,
			action.category,
			action.risk,
			action.privilege,
		]
			.join(" ")
			.toLowerCase()
			.includes(query),
	);
}

export function getPaletteAction(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction | undefined {
	if (!state.active) {
		return undefined;
	}

	return getFilteredPaletteActions(actions, state)[state.selectedIndex];
}
