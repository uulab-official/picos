import { describe, expect, test } from "bun:test";
import { releaseHealthCommand } from "../src/cli/commands/releaseHealth";
import { VERSION } from "../src/core/version";

describe("release health CLI command", () => {
	test("prints release health rows from injected project files", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await releaseHealthCommand({
				packageJson: {
					name: "@uulab/picos",
					version: VERSION,
					publishConfig: { access: "public" },
					files: ["dist", "README.md", "CHANGELOG.md", "LICENSE"],
				},
				distExists: true,
				ciWorkflow: "run: bun run verify\nrun: bun run release:check\n",
				releaseWorkflow: [
					"workflow_dispatch:",
					"dry_run:",
					"  default: true",
					"NODE_AUTH_TOKEN: secrets.NPM_TOKEN",
					"if: github.event.inputs.dry_run != 'true'",
					"npm publish --access public",
				].join("\n"),
			});
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PICOS RELEASE HEALTH");
		expect(writes.join("\n")).toContain("status=pass pass=12 fail=0");
		expect(writes.join("\n")).toContain("PASS CI runs verify");
		expect(writes.join("\n")).toContain("PASS npm publish requires NPM_TOKEN");
	});
});
