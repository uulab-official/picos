const ENGINE_FORMAT =
	"{{.ServerVersion}}\\t{{.Containers}}\\t{{.ContainersRunning}}\\t{{.ContainersPaused}}\\t{{.ContainersStopped}}\\t{{.Images}}";
const CONTAINER_FORMAT =
	"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.State}}\\t{{.Status}}";
const DAEMON_ERROR = "Cannot connect to the Docker daemon token=fixture-secret";
const args = process.argv.slice(2);

if (matches(args, ["--version"])) {
	console.log("Docker version 28.3.0, build fixture");
} else if (matches(args, ["context", "show"])) {
	console.log("fixture-context");
} else if (matches(args, ["info", "--format", ENGINE_FORMAT])) {
	if (process.env.PICOS_DOCKER_FIXTURE_MODE === "partial") {
		console.error(DAEMON_ERROR);
		process.exitCode = 1;
	} else {
		console.log("28.3.0\t3\t1\t1\t1\t12");
	}
} else if (matches(args, ["ps", "--all", "--format", CONTAINER_FORMAT])) {
	if (process.env.PICOS_DOCKER_FIXTURE_MODE === "partial") {
		console.error(DAEMON_ERROR);
		process.exitCode = 1;
	} else {
		console.log(
			"f7e8d9c0b1a2\tfixture-api\tfixture/api:1.0\trunning\tUp 5 minutes",
		);
		console.log(
			"a1b2c3d4e5f6\tfixture-worker\tfixture/worker:1.0\texited\tExited (0) 2 minutes ago",
		);
	}
} else {
	console.error("unexpected Docker fixture arguments");
	process.exitCode = 64;
}

function matches(actual: string[], expected: string[]): boolean {
	return (
		actual.length === expected.length &&
		actual.every((value, index) => value === expected[index])
	);
}
