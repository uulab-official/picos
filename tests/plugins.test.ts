import { describe, expect, test } from "bun:test";
import {
	collectDeveloperPlugin,
	formatDeveloperPluginCatalogRows,
	formatDeveloperPluginSnapshotRows,
	getDeveloperPluginCatalog,
	getDeveloperPluginContract,
} from "../src/core/plugins";
import {
	collectCredentialBearingDockerSnapshot,
	createDockerSnapshotFixture,
	DOCKER_PLUGIN_CREDENTIAL_FIXTURE_SECRETS,
} from "./support/pluginFixtures";

describe("developer plugin registry", () => {
	test("returns fresh read-only catalog contracts", () => {
		// Break caught: callers can mutate the built-in registry contract.
		const first = getDeveloperPluginCatalog();
		expect(first).toEqual([
			expect.objectContaining({
				id: "docker",
				risk: "read",
				mutations: "locked",
			}),
		]);
		const docker = first[0];
		const capability = docker?.capabilities[0];
		expect(capability).toBeDefined();
		if (!capability) throw new Error("Docker capability is required");
		capability.status = "unsupported";
		expect(getDeveloperPluginCatalog()).not.toEqual(first);
	});

	test("gets known contracts and rejects unknown plugin ids", () => {
		// Break caught: an unknown plugin id silently resolves to a contract.
		expect(getDeveloperPluginContract("docker")).toMatchObject({
			id: "docker",
		});
		expect(() => getDeveloperPluginContract("missing" as never)).toThrow(
			"Unknown developer plugin: missing",
		);
	});

	test("dispatches built-in collection through the plugin id", async () => {
		// Break caught: a known plugin id does not select its built-in collector.
		const snapshot = await collectDeveloperPlugin("docker", {
			exec: async () => ({
				command: "docker",
				args: [],
				stdout: "",
				stderr: "spawn docker ENOENT",
				exitCode: 1,
				success: false,
			}),
		});

		expect(snapshot).toMatchObject({ id: "docker", status: "unsupported" });
	});

	test("formats catalog and bounded snapshot rows for consumers", () => {
		// Break caught: catalog or snapshot formatters omit safety and bounded-result state.
		expect(
			formatDeveloperPluginCatalogRows(getDeveloperPluginCatalog()),
		).toEqual([
			"DOCKER Docker",
			"  Source: built-in",
			"  Risk: read",
			"  Mutations: locked",
			"  Client: available (read)",
			"  Context: available (read)",
			"  Engine: available (read)",
			"  Containers: available (read)",
		]);
		expect(
			formatDeveloperPluginSnapshotRows(createDockerSnapshotFixture()),
		).toEqual([
			"DOCKER completed",
			"  Client: 28.3.0",
			"  Context: default",
			"  Engine: 28.3.0",
			"  Containers: 0 returned (limit 200)",
			"  Source truncated: no",
			"  Result truncated: no",
		]);
	});

	test("labels Docker source and result truncation truthfully", () => {
		// Break caught: truncation flags are described as generic bounds, making a
		// complete bounded result sound as if it was cut off.
		const rows = formatDeveloperPluginSnapshotRows(
			createDockerSnapshotFixture({
				sourceTruncated: true,
				resultTruncated: false,
			}),
		);

		expect(rows).toContain("  Source truncated: yes");
		expect(rows).toContain("  Result truncated: no");
		expect(rows.join("\n")).not.toContain("bounded:");
	});

	test("keeps credential-bearing Docker values out of plain snapshot rows", async () => {
		// Break caught: the plain `picos plugins docker` formatter receives raw
		// credential-bearing values from core collection.
		const output = formatDeveloperPluginSnapshotRows(
			await collectCredentialBearingDockerSnapshot(),
		).join("\n");

		for (const secret of DOCKER_PLUGIN_CREDENTIAL_FIXTURE_SECRETS) {
			expect(output).not.toContain(secret);
		}
		expect(output).toContain("client-user:[REDACTED]@");
		expect(output).toContain("context-user:[REDACTED]@");
	});
});
