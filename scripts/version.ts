import { VERSION } from "../src/core/version";
import {
	createVersionBumpPlan,
	nextVersion,
	updatePackageJsonVersion,
	updateVersionSource,
	type VersionBumpKind,
} from "../src/core/versioning";

type PackageJson = {
	version: string;
};

const command = process.argv[2] ?? "plan";
const requested = process.argv[3];
const write = process.argv.includes("--write");
const packagePath = "package.json";
const versionPath = "src/core/version.ts";
const packageSource = await Bun.file(packagePath).text();
const versionSource = await Bun.file(versionPath).text();
const packageJson = JSON.parse(packageSource) as PackageJson;
const targetVersion = resolveTargetVersion(
	command,
	requested,
	packageJson.version,
);
const plan = createVersionBumpPlan({
	currentPackageVersion: packageJson.version,
	currentRuntimeVersion: VERSION,
	targetVersion,
});

console.log(`picos version ${write ? "write" : "plan"}`);
console.log("");

for (const change of plan.changes) {
	console.log(`${change.file}: ${change.from} -> ${change.to}`);
}

if (plan.issues.length) {
	console.log("");
	for (const issue of plan.issues) {
		console.log(`FAIL ${issue}`);
	}
	process.exit(1);
}

if (!write) {
	console.log("");
	console.log("dry-run only; add --write to update version files");
	process.exit(0);
}

await Bun.write(
	packagePath,
	updatePackageJsonVersion(packageSource, targetVersion),
);
await Bun.write(versionPath, updateVersionSource(versionSource, targetVersion));
console.log("");
console.log("updated package.json and src/core/version.ts");

function resolveTargetVersion(
	commandName: string,
	value: string | undefined,
	currentVersion: string,
): string {
	if (commandName === "plan" || commandName === "set") {
		if (!value) {
			throw new Error(`Usage: bun scripts/version.ts ${commandName} <version>`);
		}
		return value;
	}

	if (commandName === "next") {
		return nextVersion(currentVersion, parseBumpKind(value));
	}

	throw new Error(`Unknown version command: ${commandName}`);
}

function parseBumpKind(value: string | undefined): VersionBumpKind {
	if (value === "patch" || value === "minor" || value === "major") {
		return value;
	}
	throw new Error("Usage: bun scripts/version.ts next <patch|minor|major>");
}
