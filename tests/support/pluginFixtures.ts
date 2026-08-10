import { getDeveloperPluginContract } from "../../src/core/plugins";
import type { DockerPluginSnapshot } from "../../src/core/pluginTypes";

export function createDockerSnapshotFixture(
	overrides: Partial<Omit<DockerPluginSnapshot, "data">> & {
		data?: Partial<DockerPluginSnapshot["data"]>;
	} = {},
): DockerPluginSnapshot {
	const { data, ...snapshotOverrides } = overrides;
	return {
		id: "docker",
		contract: getDeveloperPluginContract("docker"),
		status: "completed",
		evidence: [],
		sourceTruncated: false,
		resultTruncated: false,
		data: {
			clientVersion: "28.3.0",
			context: "default",
			engineVersion: "28.3.0",
			containerCounts: { total: 1, running: 1, paused: 0, stopped: 0 },
			imageCount: 2,
			requestedContainerLimit: 200,
			returnedContainerCount: 0,
			containers: [],
			...data,
		},
		...snapshotOverrides,
	};
}
