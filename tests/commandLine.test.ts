import { describe, expect, test } from "bun:test";
import {
	applyCommandLineInput,
	closeCommandLine,
	moveCommandLineField,
	openCommandLine,
} from "../src/tui/commandLine";

describe("TUI command line", () => {
	test("opens a prompt with an empty buffer", () => {
		expect(openCommandLine("path")).toEqual({
			active: true,
			prompt: "path",
			value: "",
		});
	});

	test("edits text and handles backspace", () => {
		let state = openCommandLine("path");
		state = applyCommandLineInput(state, { input: "~" });
		state = applyCommandLineInput(state, { input: "/" });
		state = applyCommandLineInput(state, { input: "D" });
		state = applyCommandLineInput(state, { backspace: true });

		expect(state.value).toBe("~/");
	});

	test("ignores control input and closes cleanly", () => {
		const state = applyCommandLineInput(openCommandLine("path"), {
			input: "\r",
		});

		expect(state.value).toBe("");
		expect(closeCommandLine(state)).toEqual({
			active: false,
			prompt: "path",
			value: "",
		});
	});

	test("tracks optional field focus for form prompts", () => {
		expect(openCommandLine("tool:network.connect", { fieldIndex: 0 })).toEqual({
			active: true,
			prompt: "tool:network.connect",
			value: "",
			fieldIndex: 0,
		});
		expect(
			moveCommandLineField(
				openCommandLine("tool:network.connect", { fieldIndex: 0 }),
				2,
				"next",
			).fieldIndex,
		).toBe(1);
		expect(
			moveCommandLineField(
				openCommandLine("tool:network.connect", { fieldIndex: 0 }),
				2,
				"previous",
			).fieldIndex,
		).toBe(1);
		expect(moveCommandLineField(openCommandLine("path"), 0, "next")).toEqual(
			openCommandLine("path"),
		);
	});
});
