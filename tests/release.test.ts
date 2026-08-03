import { describe, expect, test } from "bun:test";
import {
	createReleaseChecklist,
	createReleaseHealthReport,
	describeDistributionPolicy,
	formatReleaseHealthRows,
	getVersionSyncStatus,
} from "../src/core/release";
import { VERSION } from "../src/core/version";
import { formatReleaseHealthJson } from "../src/cli/diagnosticOutput";

type PackageJson = {
	name: string;
	version: string;
	publishConfig?: {
		access?: string;
	};
	files?: string[];
};

const packageJson = (await Bun.file("package.json").json()) as PackageJson;

describe("release readiness", () => {
	test("keeps package and runtime versions synchronized", () => {
		expect(getVersionSyncStatus(packageJson.version, VERSION)).toEqual({
			packageVersion: packageJson.version,
			runtimeVersion: VERSION,
			synchronized: true,
		});
	});

	test("documents npm and GitHub release responsibilities separately", () => {
		expect(describeDistributionPolicy()).toEqual({
			npmPublishRequiredForInstall: true,
			githubReleaseRequiredForNpmPublish: false,
			githubReleaseRecommended: true,
		});
	});

	test("marks public scoped package metadata as release-ready", () => {
		expect(
			createReleaseChecklist({
				packageName: packageJson.name,
				packageVersion: packageJson.version,
				runtimeVersion: VERSION,
				publishAccess: packageJson.publishConfig?.access,
				files: packageJson.files ?? [],
			}),
		).toEqual([
			{ label: "package/runtime versions match", status: "pass" },
			{ label: "scoped package publishes publicly", status: "pass" },
			{ label: "dist build output included in package", status: "pass" },
			{ label: "README included in package", status: "pass" },
			{ label: "LICENSE included in package", status: "pass" },
			{ label: "CHANGELOG included in package", status: "pass" },
		]);
	});

	test("creates a release health report across package metadata and workflows", () => {
		const report = createReleaseHealthReport({
			packageName: packageJson.name,
			packageVersion: packageJson.version,
			runtimeVersion: VERSION,
			publishAccess: packageJson.publishConfig?.access,
			files: packageJson.files ?? [],
			distExists: true,
			ciWorkflow: "run: bun run verify\nrun: bun run release:check\n",
			releaseWorkflow: [
				"workflow_dispatch:",
				"  dry_run:",
				"    default: true",
				"NODE_AUTH_TOKEN: secrets.NPM_TOKEN",
				"if: github.event.inputs.dry_run != 'true'",
				"npm publish --access public",
			].join("\n"),
		});

		expect(report).toEqual({
			status: "pass",
			passCount: 12,
			failCount: 0,
			items: [
				{ label: "package/runtime versions match", status: "pass" },
				{ label: "scoped package publishes publicly", status: "pass" },
				{ label: "dist build output included in package", status: "pass" },
				{ label: "README included in package", status: "pass" },
				{ label: "LICENSE included in package", status: "pass" },
				{ label: "CHANGELOG included in package", status: "pass" },
				{ label: "dist/bin/picos.js exists", status: "pass" },
				{ label: "CI runs verify", status: "pass" },
				{ label: "CI runs release check", status: "pass" },
				{ label: "release workflow is manual", status: "pass" },
				{ label: "release workflow defaults to dry-run", status: "pass" },
				{ label: "npm publish requires NPM_TOKEN", status: "pass" },
			],
		});
		expect(formatReleaseHealthRows(report)).toEqual([
			"PICOS RELEASE HEALTH",
			"status=pass pass=12 fail=0",
			"PASS package/runtime versions match",
			"PASS scoped package publishes publicly",
			"PASS dist build output included in package",
			"PASS README included in package",
			"PASS LICENSE included in package",
			"PASS CHANGELOG included in package",
			"PASS dist/bin/picos.js exists",
			"PASS CI runs verify",
			"PASS CI runs release check",
			"PASS release workflow is manual",
			"PASS release workflow defaults to dry-run",
			"PASS npm publish requires NPM_TOKEN",
		]);
	});

	test("formats release health as one structured document", () => {
		const report = createReleaseHealthReport({
			packageName: "@uulab/picos",
			packageVersion: "0.2.0",
			runtimeVersion: "0.2.0",
			publishAccess: "public",
			files: ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
			distExists: true,
			ciWorkflow: "run: bun run verify\nrun: bun run release:check\n",
			releaseWorkflow: "workflow_dispatch:\ndry_run: default: true",
		});
		const result = JSON.parse(formatReleaseHealthJson(report));

		expect(result).toMatchObject({
			schemaVersion: 1,
			command: "release-health",
			status: "completed",
			data: {
				status: "fail",
				passCount: report.passCount,
				failCount: report.failCount,
			},
		});
		expect(result.data.checks.length).toBe(report.items.length);
	});

	test("reports release health blockers with details", () => {
		const report = createReleaseHealthReport({
			packageName: "@uulab/picos",
			packageVersion: "0.2.0",
			runtimeVersion: "0.3.0",
			publishAccess: "restricted",
			files: ["README.md"],
			distExists: false,
			ciWorkflow: "run: bun test\n",
			releaseWorkflow: "workflow_dispatch:\nnpm publish --access public\n",
		});

		expect(report.status).toBe("fail");
		expect(report.failCount).toBeGreaterThan(0);
		expect(formatReleaseHealthRows(report)).toContain(
			"FAIL package/runtime versions match :: 0.2.0 vs 0.3.0",
		);
		expect(formatReleaseHealthRows(report)).toContain(
			"FAIL release workflow defaults to dry-run :: dry_run input must default to true",
		);
	});
});
