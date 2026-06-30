import { describe, expect, test } from "bun:test";
import { updateCommand } from "../src/cli/commands/update";

describe("update CLI command", () => {
	test("prints read-only update check rows", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await updateCommand({
				packageName: "@uulab/picos",
				currentVersion: "0.2.0",
				fetch: async () => new Response(JSON.stringify({ version: "0.3.0" })),
				releaseFetch: async () =>
					new Response(
						JSON.stringify({
							tag_name: "v0.3.0",
							name: "picos v0.3.0",
							html_url:
								"https://github.com/uulab-official/picos/releases/tag/v0.3.0",
						}),
					),
			});
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PICOS UPDATE CHECK");
		expect(writes.join("\n")).toContain("status=update-available");
		expect(writes.join("\n")).toContain(
			"install=npm install -g @uulab/picos@0.3.0",
		);
		expect(writes.join("\n")).toContain("PICOS UPDATE RELEASE HANDOFF");
		expect(writes.join("\n")).toContain(
			"github=https://github.com/uulab-official/picos/releases/tag/v0.3.0",
		);
		expect(writes.join("\n")).toContain("PICOS GITHUB RELEASE CHECK");
		expect(writes.join("\n")).toContain(
			"repo=uulab-official/picos current=0.2.0 latest=0.3.0 tag=v0.3.0",
		);
		expect(writes.join("\n")).toContain("name=picos v0.3.0");
	});
});
