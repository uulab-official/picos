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
