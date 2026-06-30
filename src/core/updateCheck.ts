import {
	type ActionPreviewCommand,
	type ActionPreviewPlan,
	createActionPreviewPlan,
} from "./actions";
import type { SupportedPlatform } from "./types";

export type UpdateCheckStatus = "up-to-date" | "update-available" | "unknown";

export type PackageUpdateCheckResult = {
	packageName: string;
	currentVersion: string;
	latestVersion?: string;
	status: UpdateCheckStatus;
	registryUrl: string;
	installHint?: string;
	error?: string;
};

export type GitHubReleaseCheckResult = {
	owner: string;
	repo: string;
	currentVersion: string;
	latestVersion?: string;
	tagName?: string;
	releaseName?: string;
	status: UpdateCheckStatus;
	apiUrl: string;
	releaseUrl?: string;
	error?: string;
};

export type UpdateApplyPreview = {
	actionId: "picos.update.apply";
	risk: "write";
	privilege: "user";
	enabled: false;
	confirmationPhrase: "update picos";
	command: "npm";
	args: string[];
	packageName: string;
	currentVersion: string;
	latestVersion: string;
	blockedReason: "confirmation-required";
};

export type UpdateReleaseHandoff = {
	packageName: string;
	currentVersion: string;
	latestVersion: string;
	npmUrl: string;
	githubReleaseUrl: string;
	changelogUrl: string;
};

export type UpdateReleaseHandoffLink = {
	key: "npm" | "github" | "changelog";
	label: string;
	url: string;
};

export type PackageUpdateFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export type PackageUpdateCheckOptions = {
	packageName: string;
	currentVersion: string;
	fetch?: PackageUpdateFetch;
};

export type GitHubReleaseCheckOptions = {
	owner: string;
	repo: string;
	currentVersion: string;
	fetch?: PackageUpdateFetch;
};

export async function checkForGitHubReleaseUpdate({
	owner,
	repo,
	currentVersion,
	fetch: fetchImpl = fetch,
}: GitHubReleaseCheckOptions): Promise<GitHubReleaseCheckResult> {
	const apiUrl = createGitHubLatestReleaseUrl(owner, repo);

	try {
		const response = await fetchImpl(apiUrl, {
			headers: { accept: "application/vnd.github+json" },
		});
		if (!response.ok) {
			throw new Error(`GitHub API responded ${response.status}`);
		}

		const payload = (await response.json()) as {
			tag_name?: unknown;
			name?: unknown;
			html_url?: unknown;
		};
		if (typeof payload.tag_name !== "string") {
			throw new Error("GitHub release response did not include a tag");
		}

		const latestVersion = normalizeReleaseTag(payload.tag_name);
		const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;
		return {
			owner,
			repo,
			currentVersion,
			latestVersion,
			tagName: payload.tag_name,
			releaseName:
				typeof payload.name === "string" ? payload.name : payload.tag_name,
			status: updateAvailable ? "update-available" : "up-to-date",
			apiUrl,
			releaseUrl:
				typeof payload.html_url === "string" ? payload.html_url : undefined,
		};
	} catch (caught) {
		return {
			owner,
			repo,
			currentVersion,
			status: "unknown",
			apiUrl,
			error: caught instanceof Error ? caught.message : String(caught),
		};
	}
}

export async function checkForPackageUpdate({
	packageName,
	currentVersion,
	fetch: fetchImpl = fetch,
}: PackageUpdateCheckOptions): Promise<PackageUpdateCheckResult> {
	const registryUrl = createNpmLatestUrl(packageName);

	try {
		const response = await fetchImpl(registryUrl);
		if (!response.ok) {
			throw new Error(`npm registry responded ${response.status}`);
		}

		const payload = (await response.json()) as { version?: unknown };
		if (typeof payload.version !== "string") {
			throw new Error("npm registry response did not include a version");
		}

		const latestVersion = payload.version;
		const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;
		return {
			packageName,
			currentVersion,
			latestVersion,
			status: updateAvailable ? "update-available" : "up-to-date",
			registryUrl,
			installHint: updateAvailable
				? `npm install -g ${packageName}@${latestVersion}`
				: undefined,
		};
	} catch (caught) {
		return {
			packageName,
			currentVersion,
			status: "unknown",
			registryUrl,
			error: caught instanceof Error ? caught.message : String(caught),
		};
	}
}

export function formatGitHubReleaseCheckRows(
	result: GitHubReleaseCheckResult,
): string[] {
	return [
		"PICOS GITHUB RELEASE CHECK",
		`repo=${result.owner}/${result.repo} current=${result.currentVersion} latest=${result.latestVersion ?? "-"} tag=${result.tagName ?? "-"}`,
		...(result.releaseName ? [`name=${result.releaseName}`] : []),
		`status=${result.status}`,
		...(result.releaseUrl ? [`release=${result.releaseUrl}`] : []),
		...(result.error ? [`error=${result.error}`] : []),
		`api=${result.apiUrl}`,
	];
}

export function formatUpdateCheckRows(
	result: PackageUpdateCheckResult,
): string[] {
	return [
		"PICOS UPDATE CHECK",
		`package=${result.packageName} current=${result.currentVersion} latest=${result.latestVersion ?? "-"}`,
		`status=${result.status}`,
		...(result.installHint ? [`install=${result.installHint}`] : []),
		...(result.error ? [`error=${result.error}`] : []),
		`registry=${result.registryUrl}`,
	];
}

export function createUpdateApplyPreview(
	result: PackageUpdateCheckResult,
): UpdateApplyPreview | undefined {
	if (result.status !== "update-available" || !result.latestVersion) {
		return undefined;
	}

	return {
		actionId: "picos.update.apply",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationPhrase: "update picos",
		command: "npm",
		args: [
			"install",
			"-g",
			`${result.packageName}@${result.latestVersion}`,
			"--dry-run",
		],
		packageName: result.packageName,
		currentVersion: result.currentVersion,
		latestVersion: result.latestVersion,
		blockedReason: "confirmation-required",
	};
}

export function formatUpdateApplyPreviewRows(
	preview: UpdateApplyPreview,
): string[] {
	return [
		"PICOS UPDATE APPLY PREVIEW",
		`state=locked risk=${preview.risk} privilege=${preview.privilege}`,
		`package=${preview.packageName} current=${preview.currentVersion} latest=${preview.latestVersion}`,
		`confirm=${preview.confirmationPhrase}`,
		`command=${[preview.command, ...preview.args].join(" ")}`,
		`blocked=${preview.blockedReason}`,
	];
}

export function createUpdateApplyActionPreviewPlan(
	preview: UpdateApplyPreview,
	platform: SupportedPlatform,
): ActionPreviewPlan {
	const plan = createActionPreviewPlan(
		preview.actionId,
		platform,
		createUpdateApplyCommandPreview(preview, platform),
	);
	if (!plan) {
		throw new Error("Update apply action is not registered");
	}
	return plan;
}

export function createUpdateReleaseHandoff(
	result: PackageUpdateCheckResult,
): UpdateReleaseHandoff | undefined {
	if (!result.latestVersion) {
		return undefined;
	}

	return {
		packageName: result.packageName,
		currentVersion: result.currentVersion,
		latestVersion: result.latestVersion,
		npmUrl: `https://www.npmjs.com/package/${result.packageName}/v/${result.latestVersion}`,
		githubReleaseUrl: `https://github.com/uulab-official/picos/releases/tag/v${result.latestVersion}`,
		changelogUrl:
			"https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
	};
}

export function formatUpdateReleaseHandoffRows(
	handoff: UpdateReleaseHandoff,
): string[] {
	return [
		"PICOS UPDATE RELEASE HANDOFF",
		`package=${handoff.packageName} current=${handoff.currentVersion} latest=${handoff.latestVersion}`,
		`npm=${handoff.npmUrl}`,
		`github=${handoff.githubReleaseUrl}`,
		`changelog=${handoff.changelogUrl}`,
	];
}

export function getUpdateReleaseHandoffLinks(
	handoff: UpdateReleaseHandoff,
): UpdateReleaseHandoffLink[] {
	return [
		{ key: "npm", label: "npm package", url: handoff.npmUrl },
		{ key: "github", label: "GitHub Release", url: handoff.githubReleaseUrl },
		{ key: "changelog", label: "CHANGELOG", url: handoff.changelogUrl },
	];
}

export function getSelectedUpdateReleaseHandoffLink(
	handoff: UpdateReleaseHandoff,
	selectedIndex: number,
): UpdateReleaseHandoffLink {
	const links = getUpdateReleaseHandoffLinks(handoff);
	const index = ((selectedIndex % links.length) + links.length) % links.length;
	return links[index];
}

function createNpmLatestUrl(packageName: string): string {
	const encodedName = encodeURIComponent(packageName).replace("%40", "@");
	return `https://registry.npmjs.org/${encodedName}/latest`;
}

function createGitHubLatestReleaseUrl(owner: string, repo: string): string {
	return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
}

function normalizeReleaseTag(tagName: string): string {
	return tagName.replace(/^v/i, "");
}

function createUpdateApplyCommandPreview(
	preview: UpdateApplyPreview,
	platform: SupportedPlatform,
): ActionPreviewCommand {
	return {
		adapter:
			platform === "darwin"
				? "macos"
				: platform === "win32"
					? "windows"
					: "linux",
		command: preview.command,
		args: preview.args,
		note: "npm package manager dry-run for picos self-update",
		dryRunExecutable: true,
	};
}

function compareSemver(left: string, right: string): number {
	const leftParts = parseSemver(left);
	const rightParts = parseSemver(right);

	for (let index = 0; index < leftParts.length; index += 1) {
		const diff = leftParts[index] - rightParts[index];
		if (diff !== 0) {
			return diff;
		}
	}

	return 0;
}

function parseSemver(version: string): [number, number, number] {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		return [0, 0, 0];
	}
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}
