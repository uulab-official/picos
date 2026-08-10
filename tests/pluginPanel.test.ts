import { describe, expect, test } from "bun:test";
import {
	formatSystemPluginRowColor,
	formatSystemPluginRows,
} from "../src/tui/pluginPanel";
import { createDockerSnapshotFixture } from "./support/pluginFixtures";

describe("system plugin panel", () => {
	test("formats compact bounded Docker snapshot rows", () => {
		// Break caught: the System panel loses Docker status, safety posture, or
		// bounded collection evidence when it condenses a plugin snapshot.
		const docker = createDockerSnapshotFixture({
			status: "partial",
			data: { engineVersion: null },
			evidence: [
				{
					id: "engine",
					command: "docker",
					args: ["info"],
					supported: true,
					success: false,
					exitCode: 1,
					truncated: false,
				},
			],
		});

		expect(formatSystemPluginRows([docker], 6)).toEqual([
			"DEVELOPER PLUGINS",
			"docker partial · built-in · read-only · mutations locked",
			"context=default client=28.3.0 engine=-",
			"containers=0/200 resultTruncated=false sourceTruncated=false",
			expect.stringContaining("engine warn"),
		]);
	});

	test("reports when no registered plugin snapshots are available", () => {
		// Break caught: the System panel makes an empty plugin inventory look like
		// a populated-but-hidden section.
		expect(formatSystemPluginRows([], 6)).toContain(
			"no registered plugin snapshots",
		);
	});

	test("assigns status-aware colors to plugin rows", () => {
		// Break caught: a degraded Docker state renders as neutral text instead of
		// an operator-visible warning in the System panel.
		expect(formatSystemPluginRowColor("DEVELOPER PLUGINS")).toBe("cyan");
		expect(formatSystemPluginRowColor("docker partial")).toBe("yellow");
		expect(formatSystemPluginRowColor("context=default")).toBe("gray");
	});
});
