export type VersionBumpKind = "patch" | "minor" | "major";

export type VersionFileChange = {
	file: "package.json" | "src/core/version.ts";
	from: string;
	to: string;
};

export type VersionBumpPlan = {
	targetVersion: string;
	ready: boolean;
	changes: VersionFileChange[];
	issues: string[];
};

export function nextVersion(
	currentVersion: string,
	bump: VersionBumpKind,
): string {
	const parsed = parseVersion(currentVersion);
	const next =
		bump === "major"
			? [parsed.major + 1, 0, 0]
			: bump === "minor"
				? [parsed.major, parsed.minor + 1, 0]
				: [parsed.major, parsed.minor, parsed.patch + 1];
	return next.join(".");
}

export function createVersionBumpPlan(input: {
	currentPackageVersion: string;
	currentRuntimeVersion: string;
	targetVersion: string;
}): VersionBumpPlan {
	const issues: string[] = [];
	let current: ParsedVersion | undefined;
	let target: ParsedVersion | undefined;

	try {
		current = parseVersion(input.currentPackageVersion);
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
	}

	try {
		parseVersion(input.currentRuntimeVersion);
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
	}

	try {
		target = parseVersion(input.targetVersion);
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
	}

	if (input.currentPackageVersion !== input.currentRuntimeVersion) {
		issues.push("package.json and runtime VERSION are not synchronized");
	}

	if (current && target && compareVersions(target, current) <= 0) {
		issues.push("target version must be greater than current version");
	}

	return {
		targetVersion: input.targetVersion,
		ready: issues.length === 0,
		changes: [
			{
				file: "package.json",
				from: input.currentPackageVersion,
				to: input.targetVersion,
			},
			{
				file: "src/core/version.ts",
				from: input.currentRuntimeVersion,
				to: input.targetVersion,
			},
		],
		issues,
	};
}

export function updatePackageJsonVersion(
	source: string,
	targetVersion: string,
): string {
	parseVersion(targetVersion);
	const parsed = JSON.parse(source) as Record<string, unknown>;
	parsed.version = targetVersion;
	return `${JSON.stringify(parsed, null, "\t")}\n`;
}

export function updateVersionSource(
	source: string,
	targetVersion: string,
): string {
	parseVersion(targetVersion);
	const next = source.replace(
		/export const VERSION = "([^"]+)";/,
		`export const VERSION = "${targetVersion}";`,
	);
	if (next === source) {
		throw new Error("VERSION export not found");
	}
	return next;
}

type ParsedVersion = {
	major: number;
	minor: number;
	patch: number;
};

function parseVersion(version: string): ParsedVersion {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid version: ${version}`);
	}
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	};
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
	for (const key of ["major", "minor", "patch"] as const) {
		if (a[key] !== b[key]) {
			return a[key] - b[key];
		}
	}
	return 0;
}
