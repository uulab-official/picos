import { describe, expect, test } from "bun:test";
import {
	createVersionBumpPlan,
	nextVersion,
	updatePackageJsonVersion,
	updateVersionSource,
} from "../src/core/versioning";

describe("versioning helpers", () => {
	test("computes the next semantic version", () => {
		expect(nextVersion("0.2.0", "patch")).toBe("0.2.1");
		expect(nextVersion("0.2.0", "minor")).toBe("0.3.0");
		expect(nextVersion("0.2.0", "major")).toBe("1.0.0");
		expect(() => nextVersion("0.2", "patch")).toThrow("Invalid version");
	});

	test("plans a synchronized version bump", () => {
		expect(
			createVersionBumpPlan({
				currentPackageVersion: "0.2.0",
				currentRuntimeVersion: "0.2.0",
				targetVersion: "0.3.0",
			}),
		).toEqual({
			targetVersion: "0.3.0",
			ready: true,
			changes: [
				{ file: "package.json", from: "0.2.0", to: "0.3.0" },
				{ file: "src/core/version.ts", from: "0.2.0", to: "0.3.0" },
			],
			issues: [],
		});
	});

	test("rejects stale or backwards version plans", () => {
		expect(
			createVersionBumpPlan({
				currentPackageVersion: "0.2.0",
				currentRuntimeVersion: "0.2.1",
				targetVersion: "0.3.0",
			}).issues,
		).toContain("package.json and runtime VERSION are not synchronized");

		expect(
			createVersionBumpPlan({
				currentPackageVersion: "0.2.0",
				currentRuntimeVersion: "0.2.0",
				targetVersion: "0.1.9",
			}).issues,
		).toContain("target version must be greater than current version");
	});

	test("updates package and runtime version sources", () => {
		expect(
			updatePackageJsonVersion(
				'{\n\t"name": "@uulab/picos",\n\t"version": "0.2.0"\n}\n',
				"0.3.0",
			),
		).toContain('"version": "0.3.0"');
		expect(
			updateVersionSource('export const VERSION = "0.2.0";\n', "0.3.0"),
		).toBe('export const VERSION = "0.3.0";\n');
	});
});
