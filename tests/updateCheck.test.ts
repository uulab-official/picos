import { describe, expect, test } from "bun:test";
import {
	checkForPackageUpdate,
	formatUpdateCheckRows,
} from "../src/core/updateCheck";

describe("update check", () => {
	test("reports an npm update without executing an installer", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			fetch: async () =>
				new Response(JSON.stringify({ version: "0.3.0" }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		});

		expect(result).toEqual({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			latestVersion: "0.3.0",
			status: "update-available",
			registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
			installHint: "npm install -g @uulab/picos@0.3.0",
		});
		expect(formatUpdateCheckRows(result)).toEqual([
			"PICOS UPDATE CHECK",
			"package=@uulab/picos current=0.2.0 latest=0.3.0",
			"status=update-available",
			"install=npm install -g @uulab/picos@0.3.0",
			"registry=https://registry.npmjs.org/@uulab%2Fpicos/latest",
		]);
	});

	test("reports up-to-date versions", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.3.0",
			fetch: async () => new Response(JSON.stringify({ version: "0.3.0" })),
		});

		expect(result.status).toBe("up-to-date");
		expect(formatUpdateCheckRows(result)).toContain("status=up-to-date");
		expect(formatUpdateCheckRows(result)).not.toContain(
			"install=npm install -g @uulab/picos@0.3.0",
		);
	});

	test("keeps registry errors visible as read-only diagnostics", async () => {
		const result = await checkForPackageUpdate({
			packageName: "@uulab/picos",
			currentVersion: "0.2.0",
			fetch: async () => new Response("nope", { status: 503 }),
		});

		expect(result.status).toBe("unknown");
		expect(result.error).toBe("npm registry responded 503");
		expect(formatUpdateCheckRows(result)).toContain(
			"error=npm registry responded 503",
		);
	});
});
