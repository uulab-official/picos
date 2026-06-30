export type ChangelogFinalizeOptions = {
	version: string;
	date: string;
};

export type ChangelogFinalizePlan = {
	ready: boolean;
	targetHeading: string;
	issues: string[];
	preview: string;
};

export type ChangelogFinalizeArgs = ChangelogFinalizeOptions & {
	write: boolean;
};

const unreleasedHeading = "## [Unreleased]";

export function parseChangelogFinalizeArgs(
	args: string[],
	fallbackDate: string,
): ChangelogFinalizeArgs {
	const positional = args.filter((arg) => arg !== "--write");
	return {
		version: positional[0] ?? "",
		date: positional[1] ?? fallbackDate,
		write: args.includes("--write"),
	};
}

export function createChangelogFinalizePlan(
	changelog: string,
	options: ChangelogFinalizeOptions,
): ChangelogFinalizePlan {
	const issues = validateOptions(options);
	const targetHeading = createTargetHeading(options);
	let preview = "";

	if (!issues.length) {
		try {
			preview = `${targetHeading}\n\n${extractUnreleasedSection(changelog)}`;
		} catch (error) {
			issues.push(error instanceof Error ? error.message : String(error));
		}
	}

	return {
		ready: issues.length === 0,
		targetHeading,
		issues,
		preview,
	};
}

export function finalizeChangelog(
	changelog: string,
	options: ChangelogFinalizeOptions,
): string {
	const issues = validateOptions(options);
	if (issues.length) {
		throw new Error(issues[0]);
	}

	const lines = changelog.split(/\r?\n/);
	const section = locateUnreleasedSection(lines);
	const unreleasedBody = lines.slice(section.start + 1, section.end);
	const normalizedBody = normalizeSectionBody(unreleasedBody);
	if (!normalizedBody.length) {
		throw new Error("Unreleased changelog section is empty or missing");
	}

	const replacement = [
		unreleasedHeading,
		"",
		"### Added",
		"",
		createTargetHeading(options),
		"",
		...normalizedBody,
		"",
	];

	return [
		...lines.slice(0, section.start),
		...replacement,
		...lines.slice(section.end),
	]
		.join("\n")
		.replace(/\n*$/, "\n");
}

function createTargetHeading(options: ChangelogFinalizeOptions): string {
	return `## [${options.version}] - ${options.date}`;
}

function extractUnreleasedSection(changelog: string): string {
	const lines = changelog.split(/\r?\n/);
	const section = locateUnreleasedSection(lines);
	const body = normalizeSectionBody(
		lines.slice(section.start + 1, section.end),
	);
	if (!body.length) {
		throw new Error("Unreleased changelog section is empty or missing");
	}
	return body.join("\n");
}

function locateUnreleasedSection(lines: string[]): {
	start: number;
	end: number;
} {
	const start = lines.findIndex((line) => line.trim() === unreleasedHeading);
	if (start < 0) {
		throw new Error("Unreleased changelog section is empty or missing");
	}

	const nextHeading = lines.findIndex(
		(line, index) => index > start && line.startsWith("## ["),
	);

	return {
		start,
		end: nextHeading >= 0 ? nextHeading : lines.length,
	};
}

function normalizeSectionBody(lines: string[]): string[] {
	const body = [...lines];
	while (body.length && body[0]?.trim() === "") {
		body.shift();
	}
	while (body.length && body.at(-1)?.trim() === "") {
		body.pop();
	}
	return body;
}

function validateOptions(options: ChangelogFinalizeOptions): string[] {
	const issues: string[] = [];
	if (!/^\d+\.\d+\.\d+$/.test(options.version)) {
		issues.push(`Invalid version: ${options.version}`);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
		issues.push(`Invalid date: ${options.date}`);
	}
	return issues;
}
