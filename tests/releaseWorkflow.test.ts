import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("release workflows", () => {
	test("runs release readiness checks in CI", () => {
		const ci = readFileSync(".github/workflows/ci.yml", "utf8");

		expect(ci).toContain("Release readiness");
		expect(ci).toContain("bun run release:check");
	});

	test("keeps npm publishing behind a manual dry-run-first workflow", () => {
		expect(existsSync(".github/workflows/release.yml")).toBe(true);
		const release = readFileSync(".github/workflows/release.yml", "utf8");

		expect(release).toContain("workflow_dispatch");
		expect(release).toContain("dry_run");
		expect(release).toContain("default: true");
		expect(release).toContain("bun run release:check");
		expect(release).toContain("NPM_TOKEN");
		expect(release).toContain("npm publish --access public");
		expect(release).toContain("github.event.inputs.dry_run != 'true'");
	});
});
