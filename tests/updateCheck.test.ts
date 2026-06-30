import { describe, expect, test } from "bun:test";
import {
	checkForPackageUpdate,
	createUpdateApplyPreview,
	createUpdateReleaseHandoff,
	formatUpdateApplyPreviewRows,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	getSelectedUpdateReleaseHandoffLink,
	getUpdateReleaseHandoffLinks,
} from "../src/core/updateCheck";

describe("update check", () => {
	test("reports an npm update without executing an installer", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			fetch: async () =>
				new Response(JSON.stringify({ version: "0.3.0" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		});

		expect(result).toEqual({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});
		expect(formatUpdateCheckRows(result)).toEqual([
			"PICOS UPDATE CHECK",
			"package=@uulab/picos current=0.2.0 latest=0.3.0",
			"status=update-available",
			"install=npm install -g @uulab/picos@0.3.0",
			"registry=https://registry.npmjs.org/@uulab%2Fpicos/latest",
		]);
	});

	test("reports up-to-date versions", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.3.0",
			fetch: async () => new Response(JSON.stringify({ version: "0.3.0" })),
		});

		expect(result.status).toBe("up-to-date");
		expect(formatUpdateCheckRows(result)).toContain("status=up-to-date");
		expect(formatUpdateCheckRows(result)).not.toContain(
			"install=npm install -g @uulab/picos@0.3.0",
		);
	});

	test("keeps registry errors visible as read-only diagnostics", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			fetch: async () => new Response("nope", { status: 503 }),
		});

		expect(result.status).toBe("unknown");
		expect(result.error).toBe("npm registry responded 503");
		expect(formatUpdateCheckRows(result)).toContain(
			"error=npm registry responded 503",
		);
	});

	test("creates a locked self-update apply preview from an available update", () => {
		const preview = createUpdateApplyPreview({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});

		expect(preview).toBeDefined();
		if (!preview) {
			throw new Error("expected update apply preview");
		}
		expect(preview).toEqual({
			actionId: "picos.update.apply",
			risk: "write",
			privilege: "user",
			enabled: false,
			confirmationPhrase: "update picos",
			command: "npm",
			args: ["install", "-g", "@uulab/picos@0.3.0", "--dry-run"],
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			blockedReason: "confirmation-required",
		});
		expect(formatUpdateApplyPreviewRows(preview)).toEqual([
			"PICOS UPDATE APPLY PREVIEW",
			"state=locked risk=write privilege=user",
			"package=@uulab/picos current=0.2.0 latest=0.3.0",
			"confirm=update picos",
			"command=npm install -g @uulab/picos@0.3.0 --dry-run",
			"blocked=confirmation-required",
		]);
	});

	test("refuses self-update apply preview when no newer version is known", () => {
		expect(
			createUpdateApplyPreview({
				packageName: "@uulab/picos",
				currentVersion: "0.3.0",
				latestVersion: "0.3.0",
				status: "up-to-date",
				registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			}),
		).toBeUndefined();
	});

	test("creates release-note handoff rows for known updates", () => {
		const handoff = createUpdateReleaseHandoff({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});

		expect(handoff).toBeDefined();
		if (!handoff) {
			throw new Error("expected update release handoff");
		}
		expect(handoff).toEqual({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			npmUrl: "https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
			githubReleaseUrl:
				"https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			changelogUrl:
				"https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
		});
		expect(formatUpdateReleaseHandoffRows(handoff)).toEqual([
			"PICOS UPDATE RELEASE HANDOFF",
			"package=@uulab/picos current=0.2.0 latest=0.3.0",
			"npm=https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
			"github=https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			"changelog=https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
		]);
		expect(getUpdateReleaseHandoffLinks(handoff)).toEqual([
			{
				key: "npm",
				label: "npm package",
				url: "https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
			},
			{
				key: "github",
				label: "GitHub Release",
				url: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			},
			{
				key: "changelog",
				label: "CHANGELOG",
				url: "https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
			},
		]);
		expect(getSelectedUpdateReleaseHandoffLink(handoff, 4)).toEqual({
			key: "github",
			label: "GitHub Release",
			url: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
		});
	});

	test("does not create release-note handoff rows without a latest version", () => {
		expect(
			createUpdateReleaseHandoff({
				packageName: "@uulab/picos",
				currentVersion: "0.2.0",
				status: "unknown",
				registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
				error: "npm registry responded 404",
			}),
		).toBeUndefined();
	});
});
