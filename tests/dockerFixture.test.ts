import { expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, win32 } from "node:path";
import {
	createDockerFixture,
	createDockerFixtureBuildPlan,
	type DockerFixture,
	type ProcessTreeTerminationDependencies,
	ProcessTreeTerminationError,
	runWithDockerFixture,
	terminateProcessTree,
} from "../scripts/support/dockerFixture";

const ENGINE_FORMAT =
	"{{.ServerVersion}}\\t{{.Containers}}\\t{{.ContainersRunning}}\\t{{.ContainersPaused}}\\t{{.ContainersStopped}}\\t{{.Images}}";
const CONTAINER_FORMAT =
	"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.State}}\\t{{.Status}}";
const TEST_WAIT_TIMEOUT_MS = 2_000;

type ProcessTreeTerminationErrorShape = ProcessTreeTerminationError & {
	cause?: unknown;
};

test("Docker fixture plans a Bun-compiled executable for both platform families", () => {
	const entrypoint = resolve(
		process.cwd(),
		"scripts/support/dockerFixtureEntrypoint.ts",
	);
	expect(
		createDockerFixtureBuildPlan("/tmp/picos-docker-fixture", "darwin"),
	).toEqual({
		executable: "/tmp/picos-docker-fixture/docker",
		command: [
			process.execPath,
			"build",
			entrypoint,
			"--compile",
			"--outfile",
			"/tmp/picos-docker-fixture/docker",
		],
	});
	expect(
		createDockerFixtureBuildPlan("C:\\picos-docker-fixture", "win32"),
	).toEqual({
		executable: win32.join("C:\\picos-docker-fixture", "docker.exe"),
		command: [
			process.execPath,
			"build",
			entrypoint,
			"--compile",
			"--outfile",
			win32.join("C:\\picos-docker-fixture", "docker.exe"),
		],
	});
});

test("Docker fixture process cleanup waits for descendants to terminate", async () => {
	const directory = await mkdtemp(join(tmpdir(), "picos-process-tree-"));
	const ready = join(directory, "descendant-ready");
	const marker = join(directory, "descendant-survived");
	const descendantSource =
		"const { writeFileSync } = require('node:fs'); writeFileSync(process.env.PICOS_FIXTURE_READY, 'descendant-ready'); setTimeout(() => writeFileSync(process.env.PICOS_FIXTURE_MARKER, 'survived'), 500); setInterval(() => {}, 1_000);";
	const parentSource = `const { spawn } = require("node:child_process"); spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], { stdio: "ignore", env: process.env }); setInterval(() => {}, 1_000);`;
	const child = spawn(process.execPath, ["-e", parentSource], {
		detached: process.platform !== "win32",
		env: {
			...process.env,
			PICOS_FIXTURE_MARKER: marker,
			PICOS_FIXTURE_READY: ready,
		},
		stdio: "ignore",
	});
	try {
		await waitForFile(ready);
		await terminateProcessTree(child);
		await delay(750);
		expect(existsSync(marker)).toBe(false);
	} finally {
		if (child.exitCode === null) await terminateProcessTree(child);
		await rm(directory, { recursive: true, force: true });
	}
});

test("Docker fixture awaits terminal races before resolving", async () => {
	for (const platform of ["linux", "win32"] as const) {
		const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
		let releaseWait: (() => void) | undefined;
		let termination: Promise<void> | undefined;
		try {
			await waitForChildExit(child, `${platform} terminal race child`);
			let treeKillCalled = false;
			let waitStarted = false;
			let waitSettled = false;
			let terminationSettled = false;
			const waitGate = new Promise<void>((resolve) => {
				releaseWait = resolve;
			});
			const treeKillFailure = new Error(`${platform} terminal-race failure`);
			const dependencies: ProcessTreeTerminationDependencies =
				platform === "win32"
					? {
							platform,
							terminateWindowsProcessTree: async () => {
								treeKillCalled = true;
								throw treeKillFailure;
							},
							waitForExit: async () => {
								waitStarted = true;
								await waitGate;
								waitSettled = true;
							},
						}
					: {
							platform,
							terminatePosixProcessGroup: () => {
								treeKillCalled = true;
								throw treeKillFailure;
							},
							waitForExit: async () => {
								waitStarted = true;
								await waitGate;
								waitSettled = true;
							},
						};

			termination = terminateProcessTree(child, dependencies).then(() => {
				terminationSettled = true;
			});
			await waitForCondition(
				() => waitStarted,
				`${platform} terminal-race wait did not start`,
			);
			expect(treeKillCalled).toBe(false);
			expect(waitSettled).toBe(false);
			expect(terminationSettled).toBe(false);

			if (!releaseWait) throw new Error(`${platform} terminal-race wait lost`);
			releaseWait();
			await waitForPromise(
				termination,
				`${platform} terminal-race termination did not settle`,
			);
			expect(waitSettled).toBe(true);
			expect(terminationSettled).toBe(true);
		} finally {
			releaseWait?.();
			await termination?.catch(() => undefined);
		}
	}
});

test("Docker fixture cleans a confirmed terminal race", async () => {
	const directory = await mkdtemp(
		join(tmpdir(), "picos-terminal-process-tree-"),
	);
	let cleanupCalls = 0;
	const fixture: DockerFixture = {
		directory,
		executable: join(directory, "docker"),
		environment: {},
		cleanup: async () => {
			cleanupCalls += 1;
			await rm(directory, { recursive: true, force: true });
		},
	};
	const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
	try {
		await waitForChildExit(child, "confirmed terminal race child");
		let waitForExitCalled = false;
		await runWithDockerFixture(
			"completed",
			async () => {
				await terminateProcessTree(child, {
					platform: "linux",
					terminatePosixProcessGroup: () => {
						throw new Error("terminal race group failure");
					},
					waitForExit: async () => {
						waitForExitCalled = true;
					},
				});
			},
			async () => fixture,
		);
		expect(waitForExitCalled).toBe(true);
		expect(cleanupCalls).toBe(1);
		expect(existsSync(directory)).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("Docker fixture marks live failed tree cleanup unsafe and preserves its original failure", async () => {
	for (const platform of ["linux", "win32"] as const) {
		const child = spawn(
			process.execPath,
			["-e", "setInterval(() => {}, 1_000)"],
			{
				detached: process.platform !== "win32",
				stdio: "ignore",
			},
		);
		try {
			const treeKillFailure = new Error(`${platform} exact tree-kill failure`);
			const dependencies: ProcessTreeTerminationDependencies =
				platform === "win32"
					? {
							platform,
							terminateWindowsProcessTree: async () => {
								throw treeKillFailure;
							},
						}
					: {
							platform,
							terminatePosixProcessGroup: () => {
								throw treeKillFailure;
							},
						};
			const caught = await captureFailure(() =>
				terminateProcessTree(child, dependencies),
			);
			const terminationError = caught as ProcessTreeTerminationErrorShape;
			expect(caught).toBeInstanceOf(ProcessTreeTerminationError);
			expect(terminationError.cleanupSafe).toBe(false);
			expect(terminationError.message).toContain(treeKillFailure.message);
			expect(terminationError.cause).toBe(treeKillFailure);
			await waitForChildExit(child, `${platform} emergency child cleanup`);
			expect(isChildLive(child)).toBe(false);
		} finally {
			if (isChildLive(child)) await terminateProcessTree(child);
		}
	}
});

test("Docker fixture keeps an unsafe descendant fixture for explicit teardown", async () => {
	const directory = await mkdtemp(join(tmpdir(), "picos-unsafe-process-tree-"));
	const ready = join(directory, "descendant-ready");
	const descendantPidPath = join(directory, "descendant-pid");
	const marker = join(directory, "descendant-survived");
	let cleanupCalls = 0;
	let parent: ChildProcess | undefined;
	let descendantPid: number | undefined;
	const fixture: DockerFixture = {
		directory,
		executable: join(directory, "docker"),
		environment: {},
		cleanup: async () => {
			cleanupCalls += 1;
			await rm(directory, { recursive: true, force: true });
		},
	};

	try {
		const treeKillFailure = new Error("descendant tree-kill failure");
		const descendantSource =
			"const { writeFileSync } = require('node:fs'); writeFileSync(process.env.PICOS_FIXTURE_READY, 'descendant-ready'); writeFileSync(process.env.PICOS_FIXTURE_DESCENDANT_PID, String(process.pid)); setTimeout(() => writeFileSync(process.env.PICOS_FIXTURE_MARKER, 'survived'), 500); setInterval(() => {}, 1_000);";
		const parentSource = `const { spawn } = require("node:child_process"); spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], { stdio: "ignore", env: process.env }); setInterval(() => {}, 1_000);`;
		const caught = await captureFailure(() =>
			runWithDockerFixture(
				"completed",
				async () => {
					parent = spawn(process.execPath, ["-e", parentSource], {
						detached: process.platform !== "win32",
						env: {
							...process.env,
							PICOS_FIXTURE_DESCENDANT_PID: descendantPidPath,
							PICOS_FIXTURE_MARKER: marker,
							PICOS_FIXTURE_READY: ready,
						},
						stdio: "ignore",
					});
					await waitForFile(ready);
					await waitForFile(descendantPidPath);
					descendantPid = Number(await readFile(descendantPidPath, "utf8"));
					await terminateProcessTree(parent, {
						platform: "linux",
						terminatePosixProcessGroup: () => {
							throw treeKillFailure;
						},
					});
				},
				async () => fixture,
			),
		);
		const terminationError = caught as ProcessTreeTerminationErrorShape;
		expect(caught).toBeInstanceOf(ProcessTreeTerminationError);
		expect(terminationError.cleanupSafe).toBe(false);
		expect(terminationError.cause).toBe(treeKillFailure);
		expect(cleanupCalls).toBe(0);
		expect(existsSync(directory)).toBe(true);
		expect(descendantPid).toBeGreaterThan(0);
		if (!descendantPid) throw new Error("unsafe descendant PID missing");
		expect(isProcessLive(descendantPid)).toBe(true);
	} finally {
		if (descendantPid) {
			await terminateProcessByPid(descendantPid, "unsafe descendant teardown");
		}
		if (parent && isChildLive(parent)) await terminateProcessTree(parent);
		await delay(750);
		expect(existsSync(marker)).toBe(false);
		await rm(directory, { recursive: true, force: true });
	}
});

test("Docker fixture rejects a live child when process-tree termination fails", async () => {
	const treeKillFailures = [
		{
			platform: "linux",
			terminatePosixProcessGroup: () => {
				throw new Error("simulated process-group failure");
			},
		},
		{
			platform: "win32",
			terminateWindowsProcessTree: async () => {
				throw new Error("simulated taskkill failure");
			},
		},
	] satisfies ProcessTreeTerminationDependencies[];

	for (const dependencies of treeKillFailures) {
		const child = spawn(
			process.execPath,
			["-e", "setInterval(() => {}, 1_000)"],
			{
				detached: process.platform !== "win32",
				stdio: "ignore",
			},
		);
		try {
			expect(child.exitCode === null && child.signalCode === null).toBe(true);
			await expect(terminateProcessTree(child, dependencies)).rejects.toThrow(
				"process tree",
			);
			await waitForChildExit(child, "process-tree cleanup child");
			expect(child.exitCode === null && child.signalCode === null).toBe(false);
		} finally {
			if (child.exitCode === null && child.signalCode === null) {
				await terminateProcessTree(child);
			}
		}
	}
});

test("Docker fixture builds a current-platform standalone executable", async () => {
	const fixture = await createDockerFixture("completed");
	try {
		const { executable } = fixture;
		const expectedName = process.platform === "win32" ? "docker.exe" : "docker";
		expect(basename(executable)).toBe(expectedName);
		expect(executable).toBe(join(fixture.environment.PATH ?? "", expectedName));
		expect((await readFile(executable)).subarray(0, 4)).toEqual(
			(await readFile(process.execPath)).subarray(0, 4),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("Docker fixture accepts only the exact collector argument arrays", async () => {
	const fixture = await createDockerFixture("completed");
	const { executable } = fixture;
	try {
		for (const args of [
			["--version"],
			["context", "show"],
			["info", "--format", ENGINE_FORMAT],
			["ps", "--all", "--format", CONTAINER_FORMAT],
		]) {
			expect(
				(await runFixture(executable, args, fixture.environment)).exitCode,
			).toBe(0);
		}

		for (const args of [
			[],
			["--version", "extra"],
			["context"],
			["context", "show", "extra"],
			["info", "--format"],
			["info", "--format", "unexpected"],
			["info", "--format", ENGINE_FORMAT, "extra"],
			["ps", "--all", "--format"],
			["ps", "--all", "--format", "unexpected"],
			["ps", "--all", "--format", CONTAINER_FORMAT, "extra"],
		]) {
			expect(
				(await runFixture(executable, args, fixture.environment)).exitCode,
			).not.toBe(0);
		}
	} finally {
		await fixture.cleanup();
	}
});

async function runFixture(
	executable: string,
	args: string[],
	environment: NodeJS.ProcessEnv,
): Promise<{ exitCode: number }> {
	const processHandle = Bun.spawn([executable, ...args], {
		env: { ...process.env, ...environment },
		stdout: "ignore",
		stderr: "ignore",
	});
	return { exitCode: await processHandle.exited };
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForFile(path: string): Promise<void> {
	await waitForCondition(
		() => existsSync(path),
		`fixture descendant did not become ready: ${path}`,
	);
}

async function waitForChildExit(
	child: ChildProcess,
	label: string,
): Promise<void> {
	if (child.exitCode !== null || child.signalCode !== null) return;
	await waitForPromise(
		new Promise<void>((resolve, reject) => {
			child.once("exit", () => resolve());
			child.once("error", reject);
		}),
		label,
	);
}

async function waitForCondition(
	condition: () => boolean,
	label: string,
	timeoutMs = TEST_WAIT_TIMEOUT_MS,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (!condition()) {
		if (Date.now() >= deadline)
			throw new Error(`${label} within ${timeoutMs}ms`);
		await delay(25);
	}
}

function waitForPromise<T>(
	promise: Promise<T>,
	label: string,
	timeoutMs = TEST_WAIT_TIMEOUT_MS,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`${label} within ${timeoutMs}ms`));
		}, timeoutMs);
		promise.then(
			(value) => {
				clearTimeout(timeout);
				resolve(value);
			},
			(caught) => {
				clearTimeout(timeout);
				reject(caught);
			},
		);
	});
}

async function captureFailure(
	action: () => Promise<unknown>,
): Promise<unknown> {
	try {
		await action();
	} catch (caught) {
		return caught;
	}
	throw new Error("expected process-tree operation to reject");
}

function isChildLive(child: ChildProcess): boolean {
	return child.exitCode === null && child.signalCode === null;
}

async function terminateProcessByPid(
	pid: number,
	label: string,
): Promise<void> {
	try {
		process.kill(pid, "SIGKILL");
	} catch (caught) {
		if (!isMissingProcessError(caught)) throw caught;
	}
	await waitForCondition(() => !isProcessLive(pid), `${label} did not exit`);
}

function isProcessLive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (caught) {
		if (isMissingProcessError(caught)) return false;
		throw caught;
	}
}

function isMissingProcessError(caught: unknown): boolean {
	return caught instanceof Error && "code" in caught && caught.code === "ESRCH";
}
