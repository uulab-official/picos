import { describe, expect, test } from "bun:test";
import {
	appendClipboardConfirmationInput,
	backspaceClipboardConfirmationInput,
	createClipboardConfirmationState,
	submitClipboardConfirmation,
} from "../src/tui/clipboardDialog";
import { createClipboardPreview } from "../src/tui/clipboardPreview";

describe("TUI clipboard confirmation dialog", () => {
	test("edits confirmation text for the selected clipboard preview", () => {
		const state = createClipboardConfirmationState(
			createClipboardPreview({
				source: "connection",
				label: "selected connection",
				copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
			}),
		);

		expect(
			backspaceClipboardConfirmationInput(
				appendClipboardConfirmationInput(
					appendClipboardConfirmationInput(state, "c"),
					"o",
				),
			),
		).toMatchObject({
			active: true,
			value: "c",
			preview: expect.objectContaining({
				copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
			}),
		});
	});

	test("refuses wrong confirmation without spawning a clipboard command", async () => {
		const preview = createClipboardPreview({
			source: "port",
			label: "selected port",
			copyText: "*:3000 node pid=12345",
		});
		let called = false;

		const outcome = await submitClipboardConfirmation(
			{ active: true, preview, value: "cop" },
			{
				platform: "darwin",
				runner: async () => {
					called = true;
					return {
						command: "pbcopy",
						args: [],
						stdout: "",
						stderr: "",
						exitCode: 0,
						success: true,
					};
				},
			},
		);

		expect(called).toBeFalse();
		expect(outcome).toEqual({
			state: { active: false, value: "" },
			event: {
				level: "warn",
				message: "clipboard locked selected port via pbcopy",
			},
			result: expect.objectContaining({
				success: false,
				audit: expect.objectContaining({
					confirmed: false,
					preview: "*:3000 node pid=12345",
				}),
			}),
		});
	});

	test("executes exact copy confirmation and reports an audit event", async () => {
		const preview = createClipboardPreview({
			source: "process-resource",
			label: "file 12 cwd",
			copyText: "/Users/bonjin/Documents/workspace/uulab/picos",
		});
		const calls: unknown[] = [];

		const outcome = await submitClipboardConfirmation(
			{ active: true, preview, value: "copy" },
			{
				platform: "darwin",
				runner: async (...args) => {
					calls.push(args);
					return {
						command: "pbcopy",
						args: [],
						stdout: "",
						stderr: "",
						exitCode: 0,
						success: true,
					};
				},
			},
		);

		expect(calls).toEqual([
			[
				"pbcopy",
				[],
				{ stdin: "/Users/bonjin/Documents/workspace/uulab/picos" },
			],
		]);
		expect(outcome).toEqual({
			state: { active: false, value: "" },
			event: {
				level: "ok",
				message: "clipboard copied file 12 cwd via pbcopy",
			},
			result: expect.objectContaining({
				success: true,
				audit: expect.objectContaining({
					action: "clipboard.write",
					confirmed: true,
					adapter: "pbcopy",
				}),
			}),
		});
	});
});
