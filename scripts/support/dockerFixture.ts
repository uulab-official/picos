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
	terminatePosixProcessGroup?(pid: number): void | Promise<void>;
	terminateWindowsProcessTree?(pid: number): Promise<void>;
	terminateDirectChild?(child: ChildProcess): void;
	waitForExit?(child: ChildProcess): Promise<void>;
	confirmProcessTreeTerminated?(pid: number): boolean | Promise<boolean>;
};

export class ProcessTreeTerminationError extends Error {
	readonly cleanupSafe = false;
	readonly emergencyCleanupFailure?: unknown;

	constructor(
		message: string,
		cause: unknown,
		emergencyCleanupFailure?: unknown,
	) {
		super(message, { cause });
		this.name = "ProcessTreeTerminationError";
		this.emergencyCleanupFailure = emergencyCleanupFailure;
	}
}

const DOCKER_FIXTURE_ENTRYPOINT = fileURLToPath(
	new URL("./dockerFixtureEntrypoint.ts", import.meta.url),
);
const PROCESS_EXIT_TIMEOUT_MS = 2_000;

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

export async function runWithDockerFixture<T>(
	mode: DockerFixtureMode,
	run: (fixture: DockerFixture) => Promise<T>,
	createFixture: (
		fixtureMode: DockerFixtureMode,
	) => Promise<DockerFixture> = createDockerFixture,
): Promise<T> {
	const fixture = await createFixture(mode);
	let cleanupSafe = true;
	try {
		return await run(fixture);
	} catch (caught) {
		cleanupSafe = !(caught instanceof ProcessTreeTerminationError);
		throw caught;
	} finally {
		if (cleanupSafe) await fixture.cleanup();
	}
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
		confirmProcessTreeTerminated: () => false,
		...overrides,
	};

	if (hasTerminalState(child)) {
		try {
			await waitForExitWithinDeadline(child, dependencies.waitForExit);
		} catch (waitForExitFailure) {
			throw new ProcessTreeTerminationError(
				`terminal child exit could not be confirmed for child ${child.pid ?? "unknown"}: ${formatError(waitForExitFailure)}`,
				waitForExitFailure,
			);
		}
		return;
	}

	try {
		if (!child.pid) {
			throw new Error("child process has no pid");
		}
		if (dependencies.platform === "win32") {
			await dependencies.terminateWindowsProcessTree(child.pid);
		} else {
			await dependencies.terminatePosixProcessGroup(child.pid);
		}
	} catch (treeKillFailure) {
		const failure = new ProcessTreeTerminationError(
			`process tree termination failed for child ${child.pid ?? "unknown"}: ${formatError(treeKillFailure)}`,
			treeKillFailure,
		);
		if (hasTerminalState(child)) {
			try {
				await waitForExitWithinDeadline(child, dependencies.waitForExit);
			} catch (waitForExitFailure) {
				throw new ProcessTreeTerminationError(
					`${failure.message}; terminal child exit could not be confirmed: ${formatError(waitForExitFailure)}`,
					treeKillFailure,
					waitForExitFailure,
				);
			}
			try {
				await confirmProcessTreeTerminationWithinDeadline(
					child,
					dependencies.confirmProcessTreeTerminated,
				);
			} catch (treeProofFailure) {
				throw new ProcessTreeTerminationError(
					`${failure.message}; process tree termination could not be proven: ${formatError(treeProofFailure)}`,
					treeKillFailure,
					treeProofFailure,
				);
			}
			return;
		}

		try {
			dependencies.terminateDirectChild(child);
			await waitForExitWithinDeadline(child, dependencies.waitForExit);
		} catch (emergencyCleanupFailure) {
			throw new ProcessTreeTerminationError(
				`${failure.message}; emergency direct-child cleanup also failed: ${formatError(emergencyCleanupFailure)}`,
				treeKillFailure,
				emergencyCleanupFailure,
			);
		}
		throw failure;
	}

	try {
		await waitForExitWithinDeadline(child, dependencies.waitForExit);
	} catch (waitForExitFailure) {
		throw new ProcessTreeTerminationError(
			`process tree termination could not confirm child ${child.pid ?? "unknown"}: ${formatError(waitForExitFailure)}`,
			waitForExitFailure,
		);
	}
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
	let exitCode: number | null;
	try {
		exitCode = await waitForExitCode(taskkillProcess, PROCESS_EXIT_TIMEOUT_MS);
	} catch (caught) {
		taskkillProcess.kill("SIGKILL");
		throw caught;
	}
	if (exitCode !== 0) {
		throw new Error(`taskkill failed for process tree ${pid}`);
	}
}

function waitForExit(child: ChildProcess): Promise<void> {
	return waitForExitCode(child, PROCESS_EXIT_TIMEOUT_MS).then(() => undefined);
}

async function waitForExitWithinDeadline(
	child: ChildProcess,
	wait: (target: ChildProcess) => Promise<void>,
): Promise<void> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(
				new Error(
					`child ${child.pid ?? "unknown"} did not exit within ${PROCESS_EXIT_TIMEOUT_MS}ms`,
				),
			);
		}, PROCESS_EXIT_TIMEOUT_MS);
	});
	try {
		await Promise.race([wait(child), deadline]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

async function confirmProcessTreeTerminationWithinDeadline(
	child: ChildProcess,
	confirm: (pid: number) => boolean | Promise<boolean>,
): Promise<void> {
	const pid = child.pid;
	if (!pid) throw new Error("child process has no pid for tree confirmation");
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(
				new Error(
					`process tree ${pid} was not confirmed terminated within ${PROCESS_EXIT_TIMEOUT_MS}ms`,
				),
			);
		}, PROCESS_EXIT_TIMEOUT_MS);
	});
	try {
		const confirmed = await Promise.race([
			Promise.resolve().then(() => confirm(pid)),
			deadline,
		]);
		if (!confirmed) {
			throw new Error(`process tree ${pid} termination remains unproven`);
		}
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

function hasTerminalState(child: ChildProcess): boolean {
	return child.exitCode !== null || child.signalCode !== null;
}

function formatError(caught: unknown): string {
	return caught instanceof Error ? caught.message : String(caught);
}

function waitForExitCode(
	child: ChildProcess,
	timeoutMs: number,
): Promise<number | null> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return Promise.resolve(child.exitCode);
	}
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(
				new Error(
					`child ${child.pid ?? "unknown"} did not exit within ${timeoutMs}ms`,
				),
			);
		}, timeoutMs);
		const onExit = (exitCode: number | null) => {
			cleanup();
			resolve(exitCode);
		};
		const onError = (caught: Error) => {
			cleanup();
			reject(caught);
		};
		const cleanup = () => {
			clearTimeout(timeout);
			child.off("exit", onExit);
			child.off("error", onError);
		};
		child.once("exit", onExit);
		child.once("error", onError);
	});
}
