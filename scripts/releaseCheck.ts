import { existsSync } from "node:fs";
import {
	createReleaseChecklist,
	describeDistributionPolicy,
} from "../src/core/release";
import { VERSION } from "../src/core/version";

type PackageJson = {
	name: string;
	version: string;
	files?: string[];
	publishConfig?: {
		access?: string;
	};
};

const packageJson = (await Bun.file("package.json").json()) as PackageJson;
const checklist = createReleaseChecklist({
	packageName: packageJson.name,
	packageVersion: packageJson.version,
	runtimeVersion: VERSION,
	publishAccess: packageJson.publishConfig?.access,
	files: packageJson.files ?? [],
});
const policy = describeDistributionPolicy();

console.log("picos release check");
console.log("");
console.log(
	`npm publish required for install: ${policy.npmPublishRequiredForInstall ? "yes" : "no"}`,
);
console.log(
	`GitHub Release required for npm publish: ${policy.githubReleaseRequiredForNpmPublish ? "yes" : "no"}`,
);
console.log(
	`GitHub Release recommended: ${policy.githubReleaseRecommended ? "yes" : "no"}`,
);
console.log("");

for (const item of checklist) {
	console.log(`${item.status === "pass" ? "PASS" : "FAIL"} ${item.label}`);
	if (item.detail && item.status === "fail") {
		console.log(`  ${item.detail}`);
	}
}

const distExists = existsSync("dist/bin/picos.js");
console.log(`${distExists ? "PASS" : "FAIL"} dist/bin/picos.js exists`);

if (checklist.some((item) => item.status === "fail") || !distExists) {
	process.exitCode = 1;
}
