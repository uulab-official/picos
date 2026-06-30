import { describe, expect, test } from "bun:test";
import { createReleaseCommandPlan } from "../src/core/releaseCommands";

const finalizedChangelog = `# Changelog

## [Unreleased]

### Added

## [0.3.0] - 2026-06-30

### Added

- Release automation
`;

describe("release command plans", () => {
	test("builds a dry-run command plan for tag release and npm publish", () => {
		expect(
			createReleaseCommandPlan({
				changelog: finalizedChangelog,
				packageVersion: "0.3.0",
				publish: true,
				runtimeVersion: "0.3.0",
				version: "0.3.0",
			}),
		).toEqual({
			commands: [
				'git tag -a v0.3.0 -m "picos v0.3.0"',
				"git push origin v0.3.0",
				'gh release create v0.3.0 --title "picos v0.3.0" --notes-file release-notes.md',
				"npm publish --access public",
			],
			issues: [],
			ready: true,
			tag: "v0.3.0",
			title: "picos v0.3.0",
		});
	});

	test("reports blockers before release commands are copied", () => {
		expect(
			createReleaseCommandPlan({
				changelog: "# Changelog\n\n## [Unreleased]\n",
				packageVersion: "0.2.0",
				runtimeVersion: "0.3.0",
				version: "0.3.0",
			}),
		).toEqual({
			commands: [],
			issues: [
				"package.json version must match target version: 0.2.0 vs 0.3.0",
				"CHANGELOG.md must contain a finalized section for v0.3.0",
			],
			ready: false,
			tag: "v0.3.0",
			title: "picos v0.3.0",
		});
	});

	test("rejects invalid semver targets", () => {
		expect(() =>
			createReleaseCommandPlan({
				changelog: finalizedChangelog,
				packageVersion: "0.3.0",
				runtimeVersion: "0.3.0",
				version: "0.3",
			}),
		).toThrow("Invalid version");
	});

	test("blocks unsafe command option values", () => {
		expect(
			createReleaseCommandPlan({
				changelog: finalizedChangelog,
				notesFile: "release-notes.md; rm -rf .",
				packageVersion: "0.3.0",
				remote: "origin",
				runtimeVersion: "0.3.0",
				version: "0.3.0",
			}),
		).toEqual({
			commands: [],
			issues: ["release notes file contains unsafe shell characters"],
			ready: false,
			tag: "v0.3.0",
			title: "picos v0.3.0",
		});
	});
});
