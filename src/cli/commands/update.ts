import {
	checkForPackageUpdate,
	createUpdateReleaseHandoff,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	type PackageUpdateCheckOptions,
} from "../../core/updateCheck";
import { VERSION } from "../../core/version";

export async function updateCommand(
	options: Partial<PackageUpdateCheckOptions> = {},
): Promise<void> {
	const result = await checkForPackageUpdate({
		packageName: options.packageName ?? "@uulab/picos",
		currentVersion: options.currentVersion ?? VERSION,
		fetch: options.fetch,
	});

	const handoff = createUpdateReleaseHandoff(result);
	console.log(
		[
			...formatUpdateCheckRows(result),
			...(handoff ? ["", ...formatUpdateReleaseHandoffRows(handoff)] : []),
		].join("\n"),
	);
}
