import { existsSync, readFileSync } from "node:fs";
import {
	createReleaseHealthReport,
	formatReleaseHealthRows,
} from "../../core/release";
import { VERSION } from "../../core/version";
import { formatReleaseHealthJson } from "../diagnosticOutput";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

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
		json?: unknown;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
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

		if (json) {
			await writeCliOutput(formatReleaseHealthJson(report));
		} else {
			console.log(formatReleaseHealthRows(report).join("\n"));
		}
		if (report.status === "fail") {
			process.exitCode = 1;
		}
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("release-health", caught, {
				request: { action: "check" },
			});
		}
		throw caught;
	}
}

function readOptionalTextFile(path: string): string {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}
