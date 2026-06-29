import type { PicosAction } from "../core/actions";
import { getNextIndex } from "./navigation";

export type CommandPaletteState = {
	active: boolean;
	selectedIndex: number;
};

export function openCommandPalette(): CommandPaletteState {
	return {
		active: true,
		selectedIndex: 0,
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

export function getPaletteAction(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction | undefined {
	if (!state.active) {
		return undefined;
	}

	return actions[state.selectedIndex];
}
