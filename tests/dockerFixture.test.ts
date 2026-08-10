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

test("Docker fixture confirms a post-POSIX-policy terminal race before cleanup", async () => {
	await verifyPostPolicyTerminalRace("linux");
});

test("Docker fixture confirms a post-Windows-policy terminal race before cleanup", async () => {
	await verifyPostPolicyTerminalRace("win32");
});

test("Docker fixture bounds emergency direct-child exit waits and retains unsafe cleanup", async () => {
	const directory = await mkdtemp(join(tmpdir(), "picos-exit-timeout-"));
	let cleanupCalls = 0;
	let directChildTerminationCalls = 0;
	let waitForExitCalls = 0;
	let releaseEmergencyWait: (() => void) | undefined;
	let termination: Promise<unknown> | undefined;
	const fixture: DockerFixture = {
		directory,
		executable: join(directory, "docker"),
		environment: {},
		cleanup: async () => {
			cleanupCalls += 1;
			await rm(directory, { recursive: true, force: true });
		},
	};
	const child = await spawnDemonstrablyLiveChild(
		"emergency wait timeout child",
	);
	const treeKillFailure = new Error("emergency wait tree-kill failure");
	const emergencyWaitGate = new Promise<void>((resolve) => {
		releaseEmergencyWait = resolve;
	});

	try {
		termination = captureFailure(() =>
			runWithDockerFixture(
				"completed",
				() =>
					terminateProcessTree(child, {
						platform: "linux",
						terminatePosixProcessGroup: () => {
							throw treeKillFailure;
						},
						terminateDirectChild: () => {
							directChildTerminationCalls += 1;
						},
						waitForExit: async () => {
							waitForExitCalls += 1;
							await emergencyWaitGate;
						},
					}),
				async () => fixture,
			),
		);
		const caught = await waitForPromise(
			termination,
			"emergency direct-child wait did not settle",
			2_500,
		);
		const terminationError = caught as ProcessTreeTerminationErrorShape;
		expect(caught).toBeInstanceOf(ProcessTreeTerminationError);
		expect(terminationError.cleanupSafe).toBe(false);
		expect(terminationError.cause).toBe(treeKillFailure);
		expect(terminationError.emergencyCleanupFailure).toBeInstanceOf(Error);
		expect(
			(terminationError.emergencyCleanupFailure as Error).message,
		).toContain("within 2000ms");
		expect(directChildTerminationCalls).toBe(1);
		expect(waitForExitCalls).toBe(1);
		expect(cleanupCalls).toBe(0);
		expect(existsSync(directory)).toBe(true);
	} finally {
		releaseEmergencyWait?.();
		if (isChildLive(child)) child.kill("SIGKILL");
		await waitForChildExit(child, "emergency wait timeout child cleanup");
		await termination?.catch(() => undefined);
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

async function verifyPostPolicyTerminalRace(
	platform: "linux" | "win32",
): Promise<void> {
	const directory = await mkdtemp(
		join(tmpdir(), `picos-${platform}-terminal-race-`),
	);
	const events: string[] = [];
	let cleanupCalls = 0;
	let policyCalls = 0;
	let waitForExitCalls = 0;
	let emergencyCleanupCalls = 0;
	let waitObservedTerminal = false;
	let policySettled = false;
	let observedPolicyFailure: unknown;
	let terminationSettled = false;
	let releaseWait: (() => void) | undefined;
	let policyPromise: Promise<void> | undefined;
	let termination: Promise<void> | undefined;
	const fixture: DockerFixture = {
		directory,
		executable: join(directory, "docker"),
		environment: {},
		cleanup: async () => {
			cleanupCalls += 1;
			events.push("cleanup");
			await rm(directory, { recursive: true, force: true });
		},
	};
	const child = await spawnDemonstrablyLiveChild(
		`${platform} post-policy terminal-race child`,
	);
	const childPid = child.pid;
	if (!childPid) throw new Error(`${platform} terminal-race child PID missing`);
	const treeKillFailure = new Error(`${platform} exact terminal-race failure`);
	const waitGate = new Promise<void>((resolve) => {
		releaseWait = resolve;
	});
	const terminateTreeThenFail = (pid: number): Promise<void> => {
		policyCalls += 1;
		events.push("policy-called");
		policyPromise = (async () => {
			expect(pid).toBe(childPid);
			expect(isChildLive(child)).toBe(true);
			if (!child.kill("SIGKILL") && isChildLive(child)) {
				throw new Error(`${platform} injected policy could not stop child`);
			}
			await waitForChildExit(child, `${platform} injected policy child exit`);
			expect(isChildLive(child)).toBe(false);
			events.push("child-terminal");
			policySettled = true;
			events.push("policy-threw");
			throw treeKillFailure;
		})();
		void policyPromise.catch((caught) => {
			observedPolicyFailure = caught;
		});
		return policyPromise;
	};
	const dependencies: ProcessTreeTerminationDependencies = {
		platform,
		terminateDirectChild: () => {
			emergencyCleanupCalls += 1;
		},
		waitForExit: async () => {
			waitForExitCalls += 1;
			waitObservedTerminal = !isChildLive(child);
			events.push("wait-called");
			await waitForPromise(
				waitGate,
				`${platform} terminal-race wait gate did not settle`,
			);
			events.push("wait-settled");
		},
	};
	if (platform === "win32") {
		dependencies.terminateWindowsProcessTree = terminateTreeThenFail;
	} else {
		dependencies.terminatePosixProcessGroup = terminateTreeThenFail;
	}

	try {
		expect(isChildLive(child)).toBe(true);
		termination = runWithDockerFixture(
			"completed",
			() => terminateProcessTree(child, dependencies),
			async () => fixture,
		).then(() => {
			terminationSettled = true;
			events.push("termination-resolved");
		});
		await waitForCondition(
			() => policySettled && waitForExitCalls === 1,
			`${platform} post-policy terminal race did not reach exit confirmation`,
		);
		expect(policyCalls).toBe(1);
		expect(observedPolicyFailure).toBe(treeKillFailure);
		expect(waitForExitCalls).toBe(1);
		expect(waitObservedTerminal).toBe(true);
		expect(emergencyCleanupCalls).toBe(0);
		expect(events).toEqual([
			"policy-called",
			"child-terminal",
			"policy-threw",
			"wait-called",
		]);
		expect(terminationSettled).toBe(false);
		expect(cleanupCalls).toBe(0);
		expect(existsSync(directory)).toBe(true);

		if (!releaseWait) throw new Error(`${platform} terminal-race wait lost`);
		releaseWait();
		await waitForPromise(
			termination,
			`${platform} post-policy terminal-race termination did not settle`,
		);
		expect(terminationSettled).toBe(true);
		expect(cleanupCalls).toBe(1);
		expect(existsSync(directory)).toBe(false);
		expect(events).toEqual([
			"policy-called",
			"child-terminal",
			"policy-threw",
			"wait-called",
			"wait-settled",
			"cleanup",
			"termination-resolved",
		]);
	} finally {
		releaseWait?.();
		await policyPromise?.catch(() => undefined);
		await termination?.catch(() => undefined);
		if (isChildLive(child)) child.kill("SIGKILL");
		await waitForChildExit(child, `${platform} terminal-race child cleanup`);
		await rm(directory, { recursive: true, force: true });
	}
}

async function spawnDemonstrablyLiveChild(
	label: string,
): Promise<ChildProcess> {
	const child = spawn(
		process.execPath,
		[
			"-e",
			"if (!process.send) process.exit(2); process.send('ready'); setInterval(() => {}, 1_000);",
		],
		{ stdio: ["ignore", "ignore", "ignore", "ipc"] },
	);
	try {
		await waitForPromise(
			new Promise<void>((resolve, reject) => {
				child.once("message", (message) => {
					if (message === "ready") resolve();
					else reject(new Error(`${label} sent an unexpected ready message`));
				});
				child.once("error", reject);
				child.once("exit", (exitCode, signal) => {
					reject(
						new Error(
							`${label} exited before ready (${exitCode ?? signal ?? "unknown"})`,
						),
					);
				});
			}),
			`${label} did not become ready`,
		);
		expect(isChildLive(child)).toBe(true);
		return child;
	} catch (caught) {
		if (isChildLive(child)) child.kill("SIGKILL");
		await waitForChildExit(child, `${label} failed-start cleanup`);
		throw caught;
	}
}

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
