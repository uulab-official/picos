import { createReleaseCommandPlan } from "../src/core/releaseCommands";
import { VERSION } from "../src/core/version";

type PackageJson = {
	version: string;
};

const version = process.argv[2];
const notesFile = readOption("--notes-file") ?? "release-notes.md";
const remote = readOption("--remote") ?? "origin";
const publish = process.argv.includes("--publish");

if (!version) {
	throw new Error(
		"Usage: bun scripts/releaseCommands.ts <version> [--notes-file path] [--remote name] [--publish]",
	);
}

const packageJson = (await Bun.file("package.json").json()) as PackageJson;
const changelog = await Bun.file("CHANGELOG.md").text();
const plan = createReleaseCommandPlan({
	changelog,
	notesFile,
	packageVersion: packageJson.version,
	publish,
	remote,
	runtimeVersion: VERSION,
	version,
});

console.log("picos release command plan");
console.log("");
console.log(`target: ${plan.title}`);
console.log(`tag: ${plan.tag}`);
console.log("");

if (plan.issues.length) {
	for (const issue of plan.issues) {
		console.log(`BLOCKED ${issue}`);
	}
	process.exit(1);
}

for (const command of plan.commands) {
	console.log(command);
}

console.log("");
console.log("dry-run only; review these commands before running them manually");

function readOption(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index < 0) {
		return undefined;
	}
	return process.argv[index + 1];
}
