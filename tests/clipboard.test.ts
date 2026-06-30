import { describe, expect, test } from "bun:test";
import { clipboardWriteCommand as linuxClipboardWriteCommand } from "../src/adapters/linux";
import { clipboardWriteCommand as macosClipboardWriteCommand } from "../src/adapters/macos";
import { clipboardWriteCommand as windowsClipboardWriteCommand } from "../src/adapters/windows";
import {
	buildClipboardWritePlan,
	createClipboardAuditEvent,
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
});
