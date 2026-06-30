import { describe, expect, test } from "bun:test";
import { clipboardWriteCommand as linuxClipboardWriteCommand } from "../src/adapters/linux";
import { clipboardWriteCommand as macosClipboardWriteCommand } from "../src/adapters/macos";
import { clipboardWriteCommand as windowsClipboardWriteCommand } from "../src/adapters/windows";
import {
	buildClipboardWritePlan,
	createClipboardAuditEvent,
	runClipboardWritePlan,
} from "../src/core/clipboard";
import { createClipboardPreview } from "../src/tui/clipboardPreview";

describe("clipboard write planning", () => {
	test("builds platform clipboard adapter commands without shell interpolation", () => {
		expect(macosClipboardWriteCommand()).toEqual({
			command: "pbcopy",
			args: [],
			stdin: true,
		});
		expect(linuxClipboardWriteCommand()).toEqual({
			command: "xclip",
			args: ["-selection", "clipboard"],
			stdin: true,
		});
		expect(windowsClipboardWriteCommand()).toEqual({
			command: "clip.exe",
			args: [],
			stdin: true,
		});
	});

	test("keeps clipboard writes locked until exact confirmation", () => {
		const preview = createClipboardPreview({
			source: "process-resource",
			label: "socket 3 socket",
			copyText: "TCP 127.0.0.1:3000",
		});

		expect(buildClipboardWritePlan(preview, { platform: "darwin" })).toEqual({
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "copy",
			confirmed: false,
			enabled: false,
			reason: "type copy to allow clipboard write",
			previewText: "TCP 127.0.0.1:3000",
			source: "process-resource",
			label: "socket 3 socket",
			adapter: { command: "pbcopy", args: [], stdin: true },
		});
		expect(
			buildClipboardWritePlan(preview, {
				confirmation: "copy",
				platform: "darwin",
			}),
		).toMatchObject({
			confirmed: true,
			enabled: true,
			reason: "confirmed",
		});
	});

	test("creates audit events for confirmed clipboard write attempts", () => {
		const preview = createClipboardPreview({
			source: "connection",
			label: "selected connection",
			copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
		});
		const plan = buildClipboardWritePlan(preview, {
			confirmation: "copy",
			platform: "linux",
		});

		expect(createClipboardAuditEvent(plan, "2026-06-30T00:00:00.000Z")).toEqual(
			{
				at: "2026-06-30T00:00:00.000Z",
				action: "clipboard.write",
				risk: "write",
				privilege: "user",
				source: "connection",
				label: "selected connection",
				confirmed: true,
				adapter: "xclip",
				preview: "127.0.0.1:3000 -> 127.0.0.1:52000",
			},
		);
	});

	test("refuses to execute locked clipboard write plans", async () => {
		const preview = createClipboardPreview({
			source: "port",
			label: "selected port",
			copyText: "*:3000 node pid=12345",
		});
		let called = false;

		const result = await runClipboardWritePlan(
			buildClipboardWritePlan(preview, { platform: "darwin" }),
			async () => {
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
		);

		expect(called).toBeFalse();
		expect(result).toEqual({
			success: false,
			audit: expect.objectContaining({
				action: "clipboard.write",
				confirmed: false,
				adapter: "pbcopy",
				preview: "*:3000 node pid=12345",
			}),
			error: "Clipboard write is locked: type copy to allow clipboard write",
		});
	});

	test("executes confirmed clipboard write plans through stdin runners", async () => {
		const preview = createClipboardPreview({
			source: "connection",
			label: "selected connection",
			copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
		});
		const calls: unknown[] = [];

		const result = await runClipboardWritePlan(
			buildClipboardWritePlan(preview, {
				confirmation: "copy",
				platform: "darwin",
			}),
			async (...args) => {
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
		);

		expect(calls).toEqual([
			["pbcopy", [], { stdin: "127.0.0.1:3000 -> 127.0.0.1:52000" }],
		]);
		expect(result).toEqual({
			success: true,
			audit: expect.objectContaining({
				confirmed: true,
				adapter: "pbcopy",
			}),
		});
	});

	test("returns platform fallback hints when clipboard tools fail", async () => {
		const preview = createClipboardPreview({
			source: "port",
			label: "selected port",
			copyText: "*:3000 node pid=12345",
		});

		const result = await runClipboardWritePlan(
			buildClipboardWritePlan(preview, {
				confirmation: "copy",
				platform: "linux",
			}),
			async () => ({
				command: "xclip",
				args: ["-selection", "clipboard"],
				stdout: "",
				stderr: "spawn xclip ENOENT",
				exitCode: 1,
				success: false,
			}),
		);

		expect(result).toEqual({
			success: false,
			audit: expect.objectContaining({
				confirmed: true,
				adapter: "xclip",
			}),
			error: "spawn xclip ENOENT",
			hint: "Install xclip or wl-clipboard, then retry clipboard copy.",
		});
	});
});
