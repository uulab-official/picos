import { describe, expect, test } from "bun:test";
import { submitActionPreviewConfirmation } from "../src/core/actions";
import {
	createControlExecutionPlan,
	runControlExecutionPlan,
} from "../src/core/controlExecution";
import {
	checkForGitHubReleaseUpdate,
	checkForPackageUpdate,
	createUpdateApplyActionPreviewPlan,
	createUpdateApplyPreview,
	createUpdateReleaseHandoff,
	formatGitHubReleaseCheckRows,
	formatUpdateApplyPreviewRows,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	getSelectedUpdateReleaseHandoffLink,
	getUpdateReleaseHandoffLinks,
} from "../src/core/updateCheck";

describe("update check", () => {
	test("reports the latest GitHub Release without downloading assets", async () => {
		const result = await checkForGitHubReleaseUpdate({
			owner: "uulab-official",
			repo: "picos",
			currentVersion: "0.2.0",
			fetch: async () =>
				new Response(
					JSON.stringify({
						tag_name: "v0.3.0",
						name: "picos v0.3.0",
						html_url:
							"https://github.com/uulab-official/picos/releases/tag/v0.3.0",
					}),
					{
						status: 200,
						headers: { "content-type": "application/json" },
					},
				),
		});

		expect(result).toEqual({
			owner: "uulab-official",
			repo: "picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			tagName: "v0.3.0",
			releaseName: "picos v0.3.0",
			status: "update-available",
			apiUrl:
				"https://api.github.com/repos/uulab-official/picos/releases/latest",
			releaseUrl: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
		});
		expect(formatGitHubReleaseCheckRows(result)).toEqual([
			"PICOS GITHUB RELEASE CHECK",
			"repo=uulab-official/picos current=0.2.0 latest=0.3.0 tag=v0.3.0",
			"name=picos v0.3.0",
			"status=update-available",
			"release=https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			"api=https://api.github.com/repos/uulab-official/picos/releases/latest",
		]);
	});

	test("keeps GitHub Release errors visible as read-only diagnostics", async () => {
		const result = await checkForGitHubReleaseUpdate({
			owner: "uulab-official",
			repo: "picos",
			currentVersion: "0.2.0",
			fetch: async () => new Response("not found", { status: 404 }),
		});

		expect(result.status).toBe("unknown");
		expect(result.error).toBe("GitHub API responded 404");
		expect(formatGitHubReleaseCheckRows(result)).toContain(
			"error=GitHub API responded 404",
		);
	});

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

	test("creates a control execution preview for npm dry-run self-updates", () => {
		const preview = createUpdateApplyPreview({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});
		if (!preview) {
			throw new Error("expected update apply preview");
		}

		const plan = createUpdateApplyActionPreviewPlan(preview, "darwin");

		expect(plan).toEqual({
			actionId: "picos.update.apply",
			title: "Apply picos update",
			risk: "write",
			privilege: "user",
			enabled: false,
			dryRun: true,
			confirmationPhrase: "update picos",
			blockedReason: "disabled-by-default",
			commandPreview: {
				adapter: "macos",
				command: "npm",
				args: ["install", "-g", "@uulab/picos@0.3.0", "--dry-run"],
				note: "npm package manager dry-run for picos self-update",
				dryRunExecutable: true,
			},
			preview: [
				"Risk: write",
				"Privilege: user",
				"Platform: darwin",
				'Confirmation: type "update picos"',
				"Adapter: macos",
				"Command: npm install -g @uulab/picos@0.3.0 --dry-run",
				"Dry run: no OS command will be executed",
			],
		});
	});

	test("runs self-update npm dry-run only after policy and confirmation allow it", async () => {
		const preview = createUpdateApplyPreview({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});
		if (!preview) {
			throw new Error("expected update apply preview");
		}
		const actionPlan = createUpdateApplyActionPreviewPlan(preview, "darwin");
		const confirmation = submitActionPreviewConfirmation(
			actionPlan,
			"update picos",
		);
		const executionPlan = createControlExecutionPlan(actionPlan, confirmation, {
			mode: "dry-run",
			allowAdminDryRun: false,
		});
		const calls: Array<{ command: string; args: string[] }> = [];

		const result = await runControlExecutionPlan(
			executionPlan,
			async (command, args) => {
				calls.push({ command, args });
				return {
					command,
					args,
					exitCode: 0,
					success: true,
					stdout: "dry run ok",
					stderr: "",
				};
			},
		);

		expect(executionPlan.status).toBe("dry-run-ready");
		expect(executionPlan.blockers).toEqual([]);
		expect(calls).toEqual([
			{
				command: "npm",
				args: ["install", "-g", "@uulab/picos@0.3.0", "--dry-run"],
			},
		]);
		expect(result.success).toBe(true);
		expect(result.stdout).toBe("dry run ok");
		expect(result.audit.status).toBe("dry-run-executed");
		expect(result.audit.command).toBe(
			"npm install -g @uulab/picos@0.3.0 --dry-run",
		);
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
