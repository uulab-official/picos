import { describe, expect, test } from "bun:test";
import {
	createReleaseChecklist,
	describeDistributionPolicy,
	getVersionSyncStatus,
} from "../src/core/release";
import { VERSION } from "../src/core/version";

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
});
