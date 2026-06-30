import { describe, expect, test } from "bun:test";
import { getActionCatalog } from "../src/core/actions";
import {
	appendCommandPaletteQuery,
	backspaceCommandPaletteQuery,
	closeCommandPalette,
	getFilteredPaletteActions,
	getPaletteAction,
	moveCommandPalette,
	openCommandPalette,
} from "../src/tui/palette";

describe("TUI command palette", () => {
	test("opens and closes around the first action", () => {
		const state = openCommandPalette();

		expect(state).toEqual({ active: true, selectedIndex: 0, query: "" });
		expect(closeCommandPalette(state)).toEqual({
			active: false,
			selectedIndex: 0,
			query: "",
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
		const state = { active: true, selectedIndex: 2, query: "" };

		expect(getPaletteAction(actions, state)?.id).toBe("doctor.run");
		expect(
			getPaletteAction(actions, {
				active: true,
				selectedIndex: 999,
				query: "",
			}),
		).toBe(undefined);
	});

	test("filters actions by query text and resets selection", () => {
		let state = openCommandPalette();
		state = moveCommandPalette(state, 3, "next");
		state = appendCommandPaletteQuery(state, "route");

		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(state.query).toBe("route");
		expect(state.selectedIndex).toBe(0);
		expect(actions.map((action) => action.id)).toContain("routes.inspect");
		expect(getPaletteAction(getActionCatalog(), state)?.id).toBe(
			"routes.inspect",
		);
	});

	test("finds the TCP connect action with a telnet query", () => {
		const state = appendCommandPaletteQuery(openCommandPalette(), "telnet");
		const actions = getFilteredPaletteActions(getActionCatalog(), state);

		expect(actions.map((action) => action.id)).toContain("network.connect");
	});

	test("edits query with backspace and ignores control input", () => {
		let state = openCommandPalette();
		state = appendCommandPaletteQuery(state, "dns");
		state = appendCommandPaletteQuery(state, "\u0003");
		state = backspaceCommandPaletteQuery(state);

		expect(state.query).toBe("dn");
		const inactiveState = { ...state, active: false };
		expect(backspaceCommandPaletteQuery(inactiveState)).toBe(inactiveState);
	});
});
