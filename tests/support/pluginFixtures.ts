import { collectDockerPlugin } from "../../src/core/dockerPlugin";
import { getDeveloperPluginContract } from "../../src/core/plugins";
import type { DockerPluginSnapshot } from "../../src/core/pluginTypes";
import type { SafeExecResult } from "../../src/core/types";

export const DOCKER_PLUGIN_CREDENTIAL_FIXTURE_SECRETS = [
	"client-password",
	"client-query-secret",
	"context-password",
	"context-query-secret",
	"engine-password",
	"engine-query-secret",
	"id-authorization-secret",
	"name password secret",
	"image-api-secret",
	"state-api-secret",
	"status-token-secret",
	"/Users/operator",
] as const;

export async function collectCredentialBearingDockerSnapshot(): Promise<DockerPluginSnapshot> {
	const results: SafeExecResult[] = [
		createDockerResult(
			"Docker version ssh://client-user:client-password@docker.example?access_token=client-query-secret, build fixture",
		),
		createDockerResult(
			"ssh://context-user:context-password@docker.example/context?token=context-query-secret&safe=1",
		),
		createDockerResult(
			"https://engine-user:engine-password@docker.example?api_key=engine-query-secret\t1\t1\t0\t0\t2",
		),
		createDockerResult(
			'Authorization: Bearer id-authorization-secret\tpassword="name password secret"\tregistry.example/image?api-key=image-api-secret\tX-API-Key: state-api-secret\ttoken: status-token-secret /Users/operator/.docker/config.json',
		),
	];

	return collectDockerPlugin({
		exec: async () => {
			const next = results.shift();
			if (!next) throw new Error("unexpected Docker credential fixture call");
			return next;
		},
	});
}

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

function createDockerResult(stdout: string): SafeExecResult {
	return {
		command: "docker",
		args: [],
		stdout,
		stderr: "",
		exitCode: 0,
		success: true,
		truncated: false,
	};
}
