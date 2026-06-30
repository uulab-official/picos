import { describe, expect, test } from "bun:test";
import {
	createChangelogFinalizePlan,
	finalizeChangelog,
	parseChangelogFinalizeArgs,
} from "../src/core/changelog";

const changelog = `# Changelog

## [Unreleased]

### Added

- Release note helper
- Version helper

### Fixed

- Packaging guardrail

## [0.2.0] - 2026-06-28

### Added

- Initial release
`;

describe("changelog finalize helpers", () => {
	test("moves unreleased entries into a dated version section", () => {
		expect(
			finalizeChangelog(changelog, {
				version: "0.3.0",
				date: "2026-06-30",
			}),
		).toBe(`# Changelog

## [Unreleased]

### Added

## [0.3.0] - 2026-06-30

### Added

- Release note helper
- Version helper

### Fixed

- Packaging guardrail

## [0.2.0] - 2026-06-28

### Added

- Initial release
`);
	});

	test("reports a dry-run plan before writing the changelog", () => {
		expect(
			createChangelogFinalizePlan(changelog, {
				version: "0.3.0",
				date: "2026-06-30",
			}),
		).toEqual({
			issues: [],
			preview:
				"## [0.3.0] - 2026-06-30\n\n### Added\n\n- Release note helper\n- Version helper\n\n### Fixed\n\n- Packaging guardrail",
			ready: true,
			targetHeading: "## [0.3.0] - 2026-06-30",
		});
	});

	test("rejects invalid release metadata and empty sections", () => {
		expect(() =>
			finalizeChangelog(changelog, {
				version: "0.3",
				date: "2026-06-30",
			}),
		).toThrow("Invalid version");
		expect(() =>
			finalizeChangelog(changelog, {
				version: "0.3.0",
				date: "2026/06/30",
			}),
		).toThrow("Invalid date");
		expect(() =>
			finalizeChangelog("# Changelog\n\n## [Unreleased]\n", {
				version: "0.3.0",
				date: "2026-06-30",
			}),
		).toThrow("Unreleased changelog section is empty or missing");
	});

	test("reports invalid dry-run plans without throwing", () => {
		expect(
			createChangelogFinalizePlan("# Changelog\n\n## [Unreleased]\n", {
				version: "0.3.0",
				date: "2026-06-30",
			}),
		).toEqual({
			issues: ["Unreleased changelog section is empty or missing"],
			preview: "",
			ready: false,
			targetHeading: "## [0.3.0] - 2026-06-30",
		});
	});

	test("parses optional date and write flag independently", () => {
		expect(
			parseChangelogFinalizeArgs(["0.3.0", "--write"], "2026-06-30"),
		).toEqual({
			date: "2026-06-30",
			version: "0.3.0",
			write: true,
		});
		expect(
			parseChangelogFinalizeArgs(
				["0.3.0", "2026-07-01", "--write"],
				"2026-06-30",
			),
		).toEqual({
			date: "2026-07-01",
			version: "0.3.0",
			write: true,
		});
	});
});
