import { describe, expect, test } from "bun:test";
import {
	formatPluginCatalogJson,
	formatPluginSnapshotJson,
} from "../src/cli/pluginOutput";
import { getDeveloperPluginCatalog } from "../src/core/plugins";
import { createDockerSnapshotFixture } from "./support/pluginFixtures";

describe("plugin CLI JSON output", () => {
	test("formats the approved built-in plugin catalog as one completed document", () => {
		// Break caught: catalog automation omits its versioned request, safety
		// contract, or built-in plugin entry.
		const catalog = JSON.parse(
			formatPluginCatalogJson(getDeveloperPluginCatalog()),
		);

		expect(catalog).toMatchObject({
			schemaVersion: 1,
			command: "plugins",
			status: "completed",
			request: { action: "list", id: null },
			data: {
				totalCount: 1,
				plugins: [{ id: "docker", mutations: "locked" }],
			},
		});
	});

	test("normalizes partial plugin snapshots without raw source diagnostics", () => {
		// Break caught: a partial inspection overwrites the command outcome,
		// drops contract or collector evidence, or exposes collector secrets.
		const partial = JSON.parse(
			formatPluginSnapshotJson(
				createDockerSnapshotFixture({
					status: "partial",
					sourceTruncated: true,
					evidence: [
						{
							id: "client",
							command: "docker",
							args: ["version", "SECRET_TOKEN=raw-secret-output"],
							supported: true,
							success: false,
							exitCode: 1,
							truncated: true,
							diagnostic: "SECRET_TOKEN=raw-secret-output",
						},
					],
				}),
			),
		);

		expect(partial).toMatchObject({
			schemaVersion: 1,
			command: "plugins",
			status: "completed",
			request: { action: "inspect", id: "docker" },
			data: {
				id: "docker",
				status: "partial",
				contract: { id: "docker", mutations: "locked" },
				sourceTruncated: true,
				resultTruncated: false,
				evidence: [
					{
						id: "client",
						command: "docker",
						success: false,
						exitCode: 1,
						truncated: true,
					},
				],
			},
		});
		expect(JSON.stringify(partial)).not.toContain("raw-secret-output");
	});
});
