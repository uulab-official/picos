export function extractUnreleasedSection(changelog: string): string {
	const lines = changelog.split(/\r?\n/);
	const start = lines.findIndex((line) => line.trim() === "## [Unreleased]");
	if (start < 0) {
		throw new Error("Unreleased changelog section is empty or missing");
	}
	const nextHeading = lines.findIndex(
		(line, index) => index > start && line.startsWith("## ["),
	);
	const end = nextHeading >= 0 ? nextHeading : lines.length;
	const section = lines
		.slice(start + 1, end)
		.join("\n")
		.trim();
	if (!section) {
		throw new Error("Unreleased changelog section is empty or missing");
	}
	return section;
}

export function createReleaseTag(version: string): string {
	assertVersion(version);
	return `v${version}`;
}

export function buildReleaseNotes(input: {
	version: string;
	changelog: string;
}): string {
	const tag = createReleaseTag(input.version);
	const unreleased = extractUnreleasedSection(input.changelog);
	return `# picos ${tag}

Tag: ${tag}

${unreleased}

## Verification

- bun run verify
- bun run release:check
`;
}

function assertVersion(version: string): void {
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		throw new Error(`Invalid version: ${version}`);
	}
}
