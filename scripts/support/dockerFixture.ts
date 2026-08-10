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

export async function terminateProcessTree(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null || child.signalCode !== null) return;
	if (!child.pid) {
		child.kill("SIGKILL");
		await waitForExit(child);
		return;
	}

	if (process.platform === "win32") {
		try {
			await terminateWindowsProcessTree(child.pid);
		} catch {
			// `taskkill` can race a process that has already exited. Directly ending the
			// child is the fallback; the normal path always targets the whole tree first.
			child.kill("SIGKILL");
		}
	} else {
		try {
			process.kill(-child.pid, "SIGKILL");
		} catch {
			child.kill("SIGKILL");
		}
	}
	await waitForExit(child);
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

function waitForExitCode(child: ChildProcess): Promise<number | null> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return Promise.resolve(child.exitCode);
	}
	return new Promise((resolve, reject) => {
		child.once("exit", (exitCode) => resolve(exitCode));
		child.once("error", reject);
	});
}
