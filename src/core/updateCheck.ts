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

export type PackageUpdateFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export type PackageUpdateCheckOptions = {
	packageName: string;
	currentVersion: string;
	fetch?: PackageUpdateFetch;
};

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

function createNpmLatestUrl(packageName: string): string {
	const encodedName = encodeURIComponent(packageName).replace("%40", "@");
	return `https://registry.npmjs.org/${encodedName}/latest`;
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
