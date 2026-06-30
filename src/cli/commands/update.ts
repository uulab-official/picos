import {
	checkForPackageUpdate,
	formatUpdateCheckRows,
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

	console.log(formatUpdateCheckRows(result).join("\n"));
}
