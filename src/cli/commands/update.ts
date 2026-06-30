import {
	checkForGitHubReleaseUpdate,
	checkForPackageUpdate,
	createUpdateReleaseHandoff,
	formatGitHubReleaseCheckRows,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	type GitHubReleaseCheckOptions,
	type PackageUpdateCheckOptions,
} from "../../core/updateCheck";
import { VERSION } from "../../core/version";

type UpdateCommandOptions = Partial<PackageUpdateCheckOptions> & {
	releaseFetch?: GitHubReleaseCheckOptions["fetch"];
};

export async function updateCommand(
	options: UpdateCommandOptions = {},
): Promise<void> {
	const result = await checkForPackageUpdate({
		packageName: options.packageName ?? "@uulab/picos",
		currentVersion: options.currentVersion ?? VERSION,
		fetch: options.fetch,
	});
	const releaseResult = await checkForGitHubReleaseUpdate({
		owner: "uulab-official",
		repo: "picos",
		currentVersion: options.currentVersion ?? VERSION,
		fetch: options.releaseFetch,
	});

	const handoff = createUpdateReleaseHandoff(result);
	console.log(
		[
			...formatUpdateCheckRows(result),
			"",
			...formatGitHubReleaseCheckRows(releaseResult),
			...(handoff ? ["", ...formatUpdateReleaseHandoffRows(handoff)] : []),
		].join("\n"),
	);
}
