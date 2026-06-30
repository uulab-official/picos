import {
	createChangelogFinalizePlan,
	finalizeChangelog,
	parseChangelogFinalizeArgs,
} from "../src/core/changelog";

const { version, date, write } = parseChangelogFinalizeArgs(
	process.argv.slice(2),
	new Date().toISOString().slice(0, 10),
);
const changelogPath = "CHANGELOG.md";

if (!version) {
	throw new Error(
		"Usage: bun scripts/finalizeChangelog.ts <version> [date] [--write]",
	);
}

const changelog = await Bun.file(changelogPath).text();
const plan = createChangelogFinalizePlan(changelog, { version, date });

console.log(`picos changelog ${write ? "write" : "plan"}`);
console.log("");
console.log(`target: ${plan.targetHeading}`);

if (plan.issues.length) {
	console.log("");
	for (const issue of plan.issues) {
		console.log(`FAIL ${issue}`);
	}
	process.exit(1);
}

console.log("");
console.log(plan.preview);

if (!write) {
	console.log("");
	console.log("dry-run only; add --write to update CHANGELOG.md");
	process.exit(0);
}

await Bun.write(changelogPath, finalizeChangelog(changelog, { version, date }));
console.log("");
console.log("updated CHANGELOG.md");
