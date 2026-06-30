import { existsSync, readFileSync } from "node:fs";
import {
	createReleaseHealthReport,
	formatReleaseHealthRows,
} from "../../core/release";
import { VERSION } from "../../core/version";

type ReleaseHealthPackageJson = {
	name: string;
	version: string;
	files?: string[];
	publishConfig?: {
		access?: string;
	};
};

export async function releaseHealthCommand(
	options: {
		packageJson?: ReleaseHealthPackageJson;
		ciWorkflow?: string;
		releaseWorkflow?: string;
		distExists?: boolean;
	} = {},
): Promise<void> {
	const packageJson =
		options.packageJson ??
		((await Bun.file("package.json").json()) as ReleaseHealthPackageJson);
	const ciWorkflow =
		options.ciWorkflow ?? readOptionalTextFile(".github/workflows/ci.yml");
	const releaseWorkflow =
		options.releaseWorkflow ??
		readOptionalTextFile(".github/workflows/release.yml");
	const report = createReleaseHealthReport({
		packageName: packageJson.name,
		packageVersion: packageJson.version,
		runtimeVersion: VERSION,
		publishAccess: packageJson.publishConfig?.access,
		files: packageJson.files ?? [],
		distExists: options.distExists ?? existsSync("dist/bin/picos.js"),
		ciWorkflow,
		releaseWorkflow,
	});

	console.log(formatReleaseHealthRows(report).join("\n"));
	if (report.status === "fail") {
		process.exitCode = 1;
	}
}

function readOptionalTextFile(path: string): string {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}
