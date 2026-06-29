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

function check(
	label: string,
	passed: boolean,
	detail: string,
): ReleaseChecklistItem {
	return passed ? { label, status: "pass" } : { label, status: "fail", detail };
}
