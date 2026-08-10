import type { DeveloperPluginEvidence } from "../core/pluginTypes";

export type DockerCommandPlan = Pick<
	DeveloperPluginEvidence,
	"id" | "command" | "args"
>;

const dockerEngineFormat =
	"{{.ServerVersion}}\\t{{.Containers}}\\t{{.ContainersRunning}}\\t{{.ContainersPaused}}\\t{{.ContainersStopped}}\\t{{.Images}}";
const dockerContainerFormat =
	"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.State}}\\t{{.Status}}";

export function getDockerCommandPlans(): DockerCommandPlan[] {
	return [
		{ id: "client", command: "docker", args: ["--version"] },
		{ id: "context", command: "docker", args: ["context", "show"] },
		{
			id: "engine",
			command: "docker",
			args: ["info", "--format", dockerEngineFormat],
		},
		{
			id: "containers",
			command: "docker",
			args: ["ps", "--all", "--format", dockerContainerFormat],
		},
	];
}
