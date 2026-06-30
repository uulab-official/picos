export type VersionSyncStatus = {
	packageVersion: string;
	runtimeVersion: string;
	synchronized: boolean;
};

export type DistributionPolicy = {
	npmPublishRequiredForInstall: true;
	githubReleaseRequiredForNpmPublish: false;
	githubReleaseRecommended: true;
};

export type ReleaseChecklistItem = {
	label: string;
	status: "pass" | "fail";
	detail?: string;
};

export type ReleaseHealthReport = {
	status: "pass" | "fail";
	passCount: number;
	failCount: number;
	items: ReleaseChecklistItem[];
};

export function getVersionSyncStatus(
	packageVersion: string,
	runtimeVersion: string,
): VersionSyncStatus {
	return {
		packageVersion,
		runtimeVersion,
		synchronized: packageVersion === runtimeVersion,
	};
}

export function describeDistributionPolicy(): DistributionPolicy {
	return {
		npmPublishRequiredForInstall: true,
		githubReleaseRequiredForNpmPublish: false,
		githubReleaseRecommended: true,
	};
}

export function createReleaseChecklist(input: {
	packageName: string;
	packageVersion: string;
	runtimeVersion: string;
	publishAccess?: string;
	files: string[];
}): ReleaseChecklistItem[] {
	const versionStatus = getVersionSyncStatus(
		input.packageVersion,
		input.runtimeVersion,
	);
	return [
		check(
			"package/runtime versions match",
			versionStatus.synchronized,
			`${input.packageVersion} vs ${input.runtimeVersion}`,
		),
		check(
			"scoped package publishes publicly",
			!input.packageName.startsWith("@") || input.publishAccess === "public",
			"publishConfig.access must be public for first public scoped publish",
		),
		check(
			"dist build output included in package",
			input.files.includes("dist"),
			"files must include dist",
		),
		check(
			"README included in package",
			input.files.includes("README.md"),
			"files must include README.md",
		),
		check(
			"LICENSE included in package",
			input.files.includes("LICENSE"),
			"files must include LICENSE",
		),
		check(
			"CHANGELOG included in package",
			input.files.includes("CHANGELOG.md"),
			"files must include CHANGELOG.md",
		),
	];
}

export function createReleaseHealthReport(input: {
	packageName: string;
	packageVersion: string;
	runtimeVersion: string;
	publishAccess?: string;
	files: string[];
	distExists: boolean;
	ciWorkflow: string;
	releaseWorkflow: string;
}): ReleaseHealthReport {
	const items = [
		...createReleaseChecklist(input),
		check("dist/bin/picos.js exists", input.distExists, "run bun run build"),
		check(
			"CI runs verify",
			input.ciWorkflow.includes("bun run verify"),
			"ci.yml must run bun run verify",
		),
		check(
			"CI runs release check",
			input.ciWorkflow.includes("bun run release:check"),
			"ci.yml must run bun run release:check",
		),
		check(
			"release workflow is manual",
			input.releaseWorkflow.includes("workflow_dispatch"),
			"release.yml must use workflow_dispatch",
		),
		check(
			"release workflow defaults to dry-run",
			input.releaseWorkflow.includes("dry_run") &&
				input.releaseWorkflow.includes("default: true"),
			"dry_run input must default to true",
		),
		check(
			"npm publish requires NPM_TOKEN",
			input.releaseWorkflow.includes("NPM_TOKEN") &&
				input.releaseWorkflow.includes("npm publish --access public") &&
				input.releaseWorkflow.includes("dry_run != 'true'"),
			"npm publish must require NPM_TOKEN and dry_run != 'true'",
		),
	];
	const passCount = items.filter((item) => item.status === "pass").length;
	const failCount = items.length - passCount;
	return {
		status: failCount ? "fail" : "pass",
		passCount,
		failCount,
		items,
	};
}

export function formatReleaseHealthRows(report: ReleaseHealthReport): string[] {
	return [
		"PICOS RELEASE HEALTH",
		`status=${report.status} pass=${report.passCount} fail=${report.failCount}`,
		...report.items.map((item) =>
			item.status === "pass"
				? `PASS ${item.label}`
				: `FAIL ${item.label} :: ${item.detail ?? "check failed"}`,
		),
	];
}

function check(
	label: string,
	passed: boolean,
	detail: string,
): ReleaseChecklistItem {
	return passed ? { label, status: "pass" } : { label, status: "fail", detail };
}
