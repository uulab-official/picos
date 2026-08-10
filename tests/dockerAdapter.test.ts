import { describe, expect, test } from "bun:test";
import { getDockerCommandPlans } from "../src/adapters/docker";

describe("Docker adapter", () => {
	test("exposes read-only Docker command plans", () => {
		// Break caught: adding a mutating Docker command to this collector plan.
		expect(getDockerCommandPlans()).toEqual([
			{ id: "client", command: "docker", args: ["--version"] },
			{ id: "context", command: "docker", args: ["context", "show"] },
			expect.objectContaining({
				id: "engine",
				command: "docker",
				args: ["info", "--format", expect.any(String)],
			}),
			expect.objectContaining({
				id: "containers",
				command: "docker",
				args: ["ps", "--all", "--format", expect.any(String)],
			}),
		]);
		expect(JSON.stringify(getDockerCommandPlans())).not.toMatch(
			/\b(?:start|stop|restart|rm|remove|pull|push|exec)\b/,
		);
	});
});
