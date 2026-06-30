export type ReleaseCommandPlanInput = {
	version: string;
	packageVersion: string;
	runtimeVersion: string;
	changelog: string;
	remote?: string;
	notesFile?: string;
	publish?: boolean;
};

export type ReleaseCommandPlan = {
	ready: boolean;
	tag: string;
	title: string;
	issues: string[];
	commands: string[];
};

export function createReleaseCommandPlan(
	input: ReleaseCommandPlanInput,
): ReleaseCommandPlan {
	assertVersion(input.version);

	const tag = `v${input.version}`;
	const title = `picos ${tag}`;
	const issues = collectIssues(input, tag);
	const commands = issues.length ? [] : buildCommands(input, tag, title);

	return {
		ready: issues.length === 0,
		tag,
		title,
		issues,
		commands,
	};
}

function buildCommands(
	input: ReleaseCommandPlanInput,
	tag: string,
	title: string,
): string[] {
	const remote = input.remote ?? "origin";
	const notesFile = input.notesFile ?? "release-notes.md";
	const commands = [
		`git tag -a ${tag} -m "${title}"`,
		`git push ${remote} ${tag}`,
		`gh release create ${tag} --title "${title}" --notes-file ${notesFile}`,
	];

	if (input.publish) {
		commands.push("npm publish --access public");
	}

	return commands;
}

function collectIssues(input: ReleaseCommandPlanInput, tag: string): string[] {
	const issues: string[] = [];
	if (input.packageVersion !== input.version) {
		issues.push(
			`package.json version must match target version: ${input.packageVersion} vs ${input.version}`,
		);
	}
	if (input.runtimeVersion !== input.version) {
		issues.push(
			`runtime VERSION must match target version: ${input.runtimeVersion} vs ${input.version}`,
		);
	}
	if (!hasFinalizedChangelogSection(input.changelog, input.version)) {
		issues.push(`CHANGELOG.md must contain a finalized section for ${tag}`);
	}
	if (containsUnsafeShellCharacters(input.remote ?? "origin")) {
		issues.push("release remote contains unsafe shell characters");
	}
	if (containsUnsafeShellCharacters(input.notesFile ?? "release-notes.md")) {
		issues.push("release notes file contains unsafe shell characters");
	}
	return issues;
}

function hasFinalizedChangelogSection(
	changelog: string,
	version: string,
): boolean {
	const escapedVersion = version.replaceAll(".", "\\.");
	return new RegExp(
		`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`,
		"m",
	).test(changelog);
}

function assertVersion(version: string): void {
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error(`Invalid version: ${version}`);
	}
}

function containsUnsafeShellCharacters(value: string): boolean {
	return /[\r\n;&|`$<>]/.test(value);
}
