import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { fileURLToPath } from "node:url";

export type DockerFixtureMode = "completed" | "partial";

export type DockerFixtureBuildPlan = {
	executable: string;
	command: string[];
};

export type DockerFixture = {
	directory: string;
	executable: string;
	environment: NodeJS.ProcessEnv;
	cleanup(): Promise<void>;
};

export type ProcessTreeTerminationDependencies = {
	platform?: NodeJS.Platform;
	terminatePosixProcessGroup?(pid: number): void;
	terminateWindowsProcessTree?(pid: number): Promise<void>;
	terminateDirectChild?(child: ChildProcess): void;
	waitForExit?(child: ChildProcess): Promise<void>;
};

const DOCKER_FIXTURE_ENTRYPOINT = fileURLToPath(
	new URL("./dockerFixtureEntrypoint.ts", import.meta.url),
);

export function createDockerFixtureBuildPlan(
	directory: string,
	platform: NodeJS.Platform = process.platform,
): DockerFixtureBuildPlan {
	const executable =
		platform === "win32"
			? win32.join(directory, "docker.exe")
			: join(directory, "docker");
	return {
		executable,
		command: [
			process.execPath,
			"build",
			DOCKER_FIXTURE_ENTRYPOINT,
			"--compile",
			"--outfile",
			executable,
		],
	};
}

export async function createDockerFixture(
	mode: DockerFixtureMode,
): Promise<DockerFixture> {
	const directory = await mkdtemp(join(tmpdir(), "picos-docker-fixture-"));
	const buildPlan = createDockerFixtureBuildPlan(directory);

	try {
		await compileDockerFixture(buildPlan);
	} catch (caught) {
		await rm(directory, { recursive: true, force: true });
		throw caught;
	}

	return {
		directory,
		executable: buildPlan.executable,
		environment: {
			PATH: directory,
			Path: directory,
			PICOS_DOCKER_FIXTURE_MODE: mode,
		},
		cleanup: () => rm(directory, { recursive: true, force: true }),
	};
}

export async function terminateProcessTree(
	child: ChildProcess,
	overrides: ProcessTreeTerminationDependencies = {},
): Promise<void> {
	const dependencies = {
		platform: process.platform,
		terminatePosixProcessGroup: (pid: number) => {
			process.kill(-pid, "SIGKILL");
		},
		terminateWindowsProcessTree,
		terminateDirectChild: (target: ChildProcess) => {
			if (!target.kill("SIGKILL") && !hasTerminalState(target)) {
				throw new Error(
					`could not terminate direct child ${target.pid ?? "unknown"}`,
				);
			}
		},
		waitForExit,
		...overrides,
	};

	if (hasTerminalState(child)) {
		await dependencies.waitForExit(child);
		return;
	}

	try {
		if (!child.pid) {
			throw new Error("child process has no pid");
		}
		if (dependencies.platform === "win32") {
			await dependencies.terminateWindowsProcessTree(child.pid);
		} else {
			dependencies.terminatePosixProcessGroup(child.pid);
		}
	} catch (treeKillFailure) {
		if (hasTerminalState(child)) {
			await dependencies.waitForExit(child);
			return;
		}

		const failure = new Error(
			`process tree termination failed for child ${child.pid ?? "unknown"}: ${formatError(treeKillFailure)}`,
			{ cause: treeKillFailure },
		);
		try {
			dependencies.terminateDirectChild(child);
			await dependencies.waitForExit(child);
		} catch (emergencyCleanupFailure) {
			throw new Error(
				`${failure.message}; emergency direct-child cleanup also failed: ${formatError(emergencyCleanupFailure)}`,
				{ cause: failure },
			);
		}
		throw failure;
	}

	await dependencies.waitForExit(child);
}

async function compileDockerFixture(
	plan: DockerFixtureBuildPlan,
): Promise<void> {
	const processHandle = Bun.spawn(plan.command, {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
		processHandle.exited,
	]);
	if (exitCode === 0) return;
	throw new Error(
		`Docker fixture compiler exited ${exitCode}: ${(stderr || stdout).trim()}`,
	);
}

async function terminateWindowsProcessTree(pid: number): Promise<void> {
	const systemRoot =
		process.env.SystemRoot ?? process.env.SYSTEMROOT ?? "C:\\Windows";
	const taskkill = win32.join(
		win32.isAbsolute(systemRoot) ? systemRoot : "C:\\Windows",
		"System32",
		"taskkill.exe",
	);
	const taskkillProcess = spawn(taskkill, ["/PID", String(pid), "/T", "/F"], {
		shell: false,
		stdio: "ignore",
		windowsHide: true,
	});
	if ((await waitForExitCode(taskkillProcess)) !== 0) {
		throw new Error(`taskkill failed for process tree ${pid}`);
	}
}

function waitForExit(child: ChildProcess): Promise<void> {
	return waitForExitCode(child).then(() => undefined);
}

function hasTerminalState(child: ChildProcess): boolean {
	return child.exitCode !== null || child.signalCode !== null;
}

function formatError(caught: unknown): string {
	return caught instanceof Error ? caught.message : String(caught);
}

function waitForExitCode(child: ChildProcess): Promise<number | null> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return Promise.resolve(child.exitCode);
	}
	return new Promise((resolve, reject) => {
		child.once("exit", (exitCode) => resolve(exitCode));
		child.once("error", reject);
	});
}
