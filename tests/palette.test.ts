import { describe, expect, test } from "bun:test";
import { getActionCatalog } from "../src/core/actions";
import {
	closeCommandPalette,
	getPaletteAction,
	moveCommandPalette,
	openCommandPalette,
} from "../src/tui/palette";

describe("TUI command palette", () => {
	test("opens and closes around the first action", () => {
		const state = openCommandPalette();

		expect(state).toEqual({ active: true, selectedIndex: 0 });
		expect(closeCommandPalette(state)).toEqual({
			active: false,
			selectedIndex: 0,
		});
	});

	test("moves selection with wraparound", () => {
		let state = openCommandPalette();
		state = moveCommandPalette(state, 3, "previous");
		expect(state.selectedIndex).toBe(2);

		state = moveCommandPalette(state, 3, "next");
		expect(state.selectedIndex).toBe(0);
	});

	test("returns selected action from the catalog", () => {
		const actions = getActionCatalog();
		const state = { active: true, selectedIndex: 2 };

		expect(getPaletteAction(actions, state)?.id).toBe("doctor.run");
		expect(
			getPaletteAction(actions, { active: true, selectedIndex: 999 }),
		).toBe(undefined);
	});
});
