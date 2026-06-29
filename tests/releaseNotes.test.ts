import { describe, expect, test } from "bun:test";
import {
	buildReleaseNotes,
	createReleaseTag,
	extractUnreleasedSection,
} from "../src/core/releaseNotes";

const changelog = `# Changelog

## [Unreleased]

### Added

- Feature A
- Feature B

### Security

- Safety fix

## [0.2.0] - 2026-06-28

### Added

- Old feature
`;

describe("release notes helpers", () => {
	test("extracts the unreleased changelog section", () => {
		expect(extractUnreleasedSection(changelog)).toBe(
			"### Added\n\n- Feature A\n- Feature B\n\n### Security\n\n- Safety fix",
		);
	});

	test("creates release tags from semver", () => {
		expect(createReleaseTag("0.3.0")).toBe("v0.3.0");
		expect(() => createReleaseTag("0.3")).toThrow("Invalid version");
	});

	test("builds a release note draft", () => {
		expect(
			buildReleaseNotes({
				version: "0.3.0",
				changelog,
			}),
		).toBe(`# picos v0.3.0

Tag: v0.3.0

### Added

- Feature A
- Feature B

### Security

- Safety fix

## Verification

- bun run verify
- bun run release:check
`);
	});
});
