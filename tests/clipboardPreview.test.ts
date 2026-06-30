import { describe, expect, test } from "bun:test";
import {
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "../src/tui/clipboardPreview";

describe("clipboard preview", () => {
	test("builds locked confirmed previews for selected console values", () => {
		const preview = createClipboardPreview({
			source: "connection",
			label: "selected endpoint",
			copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
		});

		expect(preview).toEqual({
			source: "connection",
			label: "selected endpoint",
			copyText: "127.0.0.1:3000 -> 127.0.0.1:52000",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(formatClipboardPreviewRows(preview)).toEqual([
			"CLIPBOARD PREVIEW connection",
			"label selected endpoint",
			"copy 127.0.0.1:3000 -> 127.0.0.1:52000",
			"confirm copy locked",
		]);
	});

	test("builds locked previews for update handoff links", () => {
		const preview = createClipboardPreview({
			source: "update-handoff",
			label: "GitHub Release",
			copyText: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
		});

		expect(preview.source).toBe("update-handoff");
		expect(formatClipboardPreviewRows(preview)).toEqual([
			"CLIPBOARD PREVIEW update-handoff",
			"label GitHub Release",
			"copy https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			"confirm copy locked",
		]);
	});

	test("formats optional clipboard preview details before confirmation", () => {
		const preview = createClipboardPreview({
			source: "tool-row",
			label: "network.connect example.com:443 status row 2",
			copyText: "Elapsed: 42ms",
			details: ["path b row", "section status row 2/2"],
		});

		expect(formatClipboardPreviewRows(preview)).toEqual([
			"CLIPBOARD PREVIEW tool-row",
			"label network.connect example.com:443 status row 2",
			"detail path b row",
			"detail section status row 2/2",
			"copy Elapsed: 42ms",
			"confirm copy locked",
		]);
	});

	test("clips multiline clipboard preview copy rows when requested", () => {
		const preview = createClipboardPreview({
			source: "tool-output",
			label: "tools.tcp raw output",
			copyText:
				"first line is longer than the modal budget\nsecond line\nthird line\nfourth line",
			details: ["path c raw"],
		});

		expect(
			formatClipboardPreviewRows(preview, {
				maxCopyLines: 3,
				maxCopyLineLength: 18,
			}),
		).toEqual([
			"CLIPBOARD PREVIEW tool-output",
			"label tools.tcp raw output",
			"detail path c raw",
			"copy first line is l...",
			"copy second line",
			"copy third line",
			"copy ... 1 more line",
			"confirm copy locked",
		]);
	});

	test("rejects empty clipboard preview values", () => {
		expect(() =>
			createClipboardPreview({
				source: "process-resource",
				label: "socket",
				copyText: "   ",
			}),
		).toThrow("Clipboard preview requires text");
	});
});
