import { describe, expect, test } from "bun:test";
import {
	applyCommandLineInput,
	applyToolPromptCommandLineInput,
	applyToolTargetCommandLineIntent,
	closeCommandLine,
	getCommandPromptExamples,
	getCommandPromptInputMode,
	getCommandSubmitRoute,
	isCommandLineFieldTouched,
	markCommandLineFieldTouched,
	moveCommandLineField,
	openCommandLine,
	prepareCommandLineTextInput,
	prepareCommandSubmit,
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

	test("applies the command-line intent emitted by a target transition", () => {
		const state = openCommandLine("tool-target-action", {
			value: "dns",
		});

		expect(applyToolTargetCommandLineIntent(state, "close")).toEqual({
			active: false,
			prompt: "tool-target-action",
			value: "",
		});
		expect(applyToolTargetCommandLineIntent(state, "preserve")).toEqual(state);
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

	test("tracks touched fields for form prompts", () => {
		const opened = openCommandLine("tool:network.connect", {
			fieldIndex: 1,
			fieldTouchedIndexes: [0, 0],
		});
		expect(opened.fieldTouchedIndexes).toEqual([0]);
		expect(isCommandLineFieldTouched(opened)).toBe(false);
		const touched = markCommandLineFieldTouched(opened);
		expect(touched.fieldTouchedIndexes).toEqual([0, 1]);
		expect(isCommandLineFieldTouched(touched)).toBe(true);
		expect(markCommandLineFieldTouched(touched).fieldTouchedIndexes).toEqual([
			0, 1,
		]);
		expect(isCommandLineFieldTouched(openCommandLine("path"))).toBe(false);
	});

	test("applies typed input to the selected tool form field", () => {
		let state = openCommandLine("tool:tools.dns");
		state = applyToolPromptCommandLineInput(state, { input: "g" });
		state = applyToolPromptCommandLineInput(state, { input: "o" });
		state = applyToolPromptCommandLineInput(state, { backspace: true });

		expect(state).toEqual({
			active: true,
			prompt: "tool:tools.dns",
			value: "g",
			fieldIndex: 0,
			fieldTouchedIndexes: [0],
		});
	});

	test("owns tool form tab movement and clipboard text editing", () => {
		const tool = prepareCommandLineTextInput({
			commandLine: openCommandLine("tool:network.connect", { fieldIndex: 0 }),
			clipboardConfirmation: { active: false, value: "" },
			input: "",
			tab: true,
		});
		expect(tool.kind).toBe("apply");
		if (tool.kind === "apply") {
			expect(tool.commandLine.fieldIndex).toBe(1);
		}

		const clipboard = prepareCommandLineTextInput({
			commandLine: openCommandLine("clipboard"),
			clipboardConfirmation: { active: true, value: "cop" },
			input: "y",
		});
		expect(clipboard).toMatchObject({
			kind: "apply",
			commandLine: { value: "y" },
			clipboardConfirmation: { value: "copy" },
		});
	});

	test("routes every registered prompt to exactly one submit owner", () => {
		for (const prompt of getCommandPromptExamples()) {
			const route = getCommandSubmitRoute(prompt);
			expect(route?.owner.length).toBeGreaterThan(0);
			expect(route?.effect.length).toBeGreaterThan(0);
		}
	});

	test("preserves submit request fields for the single owned dispatcher", () => {
		expect(
			prepareCommandSubmit({
				active: true,
				prompt: "editor-save",
				value: "save file",
				fieldIndex: 2,
				fieldTouchedIndexes: [2],
			}),
		).toEqual({
			owner: "editorBuffer",
			effect: "submit-editor-save",
			request: {
				prompt: "editor-save",
				value: "save file",
				fieldIndex: 2,
				fieldTouchedIndexes: [2],
			},
		});
	});

	test("derives command editing mode from submit ownership", () => {
		expect(getCommandPromptInputMode("path")).toBe("plain");
		expect(getCommandPromptInputMode("tool:tools.dns")).toBe("tool-form");
		expect(getCommandPromptInputMode("clipboard")).toBe(
			"clipboard-confirmation",
		);
		expect(getCommandPromptInputMode("unknown")).toBeUndefined();
	});

	test("rejects unknown and inherited prompt keys", () => {
		expect(getCommandSubmitRoute("unknown")).toBeUndefined();
		expect(getCommandSubmitRoute("toString")).toBeUndefined();
		expect(getCommandSubmitRoute("__proto__")).toBeUndefined();
		expect(getCommandSubmitRoute("config-notAKey")).toBeUndefined();
		expect(getCommandSubmitRoute("endpoint-filter:bogus")).toBeUndefined();
		expect(
			getCommandSubmitRoute("endpoint-filter-cleanup:bogus"),
		).toBeUndefined();
		expect(getCommandSubmitRoute("tool:not.registered")).toBeUndefined();
	});
});
