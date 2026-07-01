import { describe, expect, test } from "bun:test";
import { formatStatusDialogPreviewRows } from "../src/tui/statusDialogPreview";

describe("Status dialog preview strip", () => {
	test("compacts multiple pending Status dialog previews into one strip", () => {
		expect(
			formatStatusDialogPreviewRows([
				{
					kind: "external-open",
					rows: [
						"EXTERNAL OPEN GitHub Release",
						"risk=write privilege=user confirmed=false",
						"confirm open external link locked",
						"url=https://github.com/uulab-official/picos/releases/tag/v0.3.0",
						"command=open https://github.com/uulab-official/picos/releases/tag/v0.3.0",
					],
					promptRows: [
						":external-open open external link enter=open esc=cancel",
					],
				},
				{
					kind: "file-open",
					rows: [
						"FILE OPEN cleanup-export",
						"risk=read privilege=user confirmed=false",
						"confirm open file locked",
						"path=/Users/me/.config/picos/cleanup/picos-cleanup-all.md",
						"reason=type open file to launch system opener",
					],
					promptRows: [
						"CONFIG ORIGIN Routes scope=routes.filters",
						":file-open open file enter=open esc=cancel",
					],
				},
			]),
		).toEqual([
			"STATUS DIALOG PREVIEW active=external-open count=2",
			"> external-open EXTERNAL OPEN GitHub Release",
			"  confirm open external link locked",
			"  url=https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			"  :external-open open external link enter=open esc=cancel",
			"  file-open FILE OPEN cleanup-export",
			"  confirm open file locked",
			"  path=/Users/me/.config/picos/cleanup/picos-cleanup-all.md",
			"  CONFIG ORIGIN Routes scope=routes.filters",
			"controls=type exact phrase enter=confirm esc=cancel",
		]);
	});

	test("keeps an empty Status dialog preview strip useful", () => {
		expect(formatStatusDialogPreviewRows([])).toEqual([
			"STATUS DIALOG PREVIEW active=none count=0",
			"no pending Status dialog previews",
			"controls=type exact phrase enter=confirm esc=cancel",
		]);
	});
});
