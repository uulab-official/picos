import { describe, expect, test } from "bun:test";
import {
	createEditorWritePreview,
	formatEditorWritePreviewRows,
} from "../src/core/fileWritePreview";

describe("editor write preview", () => {
	test("builds locked diff previews for changed editor buffers", () => {
		const preview = createEditorWritePreview({
			path: "/workspace/picos/README.md",
			originalContent: "# picos\nold\nkeep\n",
			nextContent: "# picos\nnew\nkeep\nadded\n",
		});

		expect(preview).toMatchObject({
			kind: "editor-save",
			path: "/workspace/picos/README.md",
			providerKind: "local",
			risk: "write",
			privilege: "user",
			confirmationPhrase: "save file",
			executable: false,
			changed: true,
			stats: {
				additions: 2,
				deletions: 1,
				unchanged: 2,
				originalLines: 3,
				nextLines: 4,
			},
		});
		expect(preview.diffRows).toEqual([
			"  1 | # picos",
			"-  2 | old",
			"+  2 | new",
			"  3 | keep",
			"+  4 | added",
		]);
		expect(formatEditorWritePreviewRows(preview)).toContain(
			"locked confirm=save file executable=false",
		);
	});

	test("keeps unchanged buffers non-executable with an explicit no-change row", () => {
		const preview = createEditorWritePreview({
			path: "/workspace/picos/package.json",
			originalContent: '{\n  "name": "picos"\n}\n',
			nextContent: '{\n  "name": "picos"\n}\n',
			providerKind: "sftp",
		});

		expect(preview.changed).toBe(false);
		expect(preview.reason).toBe("no content changes to save");
		expect(preview.stats).toMatchObject({
			additions: 0,
			deletions: 0,
			unchanged: 3,
			originalLines: 3,
			nextLines: 3,
		});
		expect(preview.diffRows).toEqual(["no changes"]);
		expect(formatEditorWritePreviewRows(preview)).toEqual([
			"EDITOR SAVE PREVIEW",
			"path /workspace/picos/package.json",
			"provider=sftp risk=write privilege=user",
			"changes +0 -0 same=3 original=3 next=3",
			"locked confirm=save file executable=false",
			"reason no content changes to save",
			"DIFF",
			"no changes",
		]);
	});
});
