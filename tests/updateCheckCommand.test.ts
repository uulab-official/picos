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
			});
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PICOS UPDATE CHECK");
		expect(writes.join("\n")).toContain("status=update-available");
		expect(writes.join("\n")).toContain(
			"install=npm install -g @uulab/picos@0.3.0",
		);
	});
});
