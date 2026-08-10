import { expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, win32 } from "node:path";
import {
	createDockerFixture,
	createDockerFixtureBuildPlan,
	type ProcessTreeTerminationDependencies,
	terminateProcessTree,
} from "../scripts/support/dockerFixture";

const ENGINE_FORMAT =
	"{{.ServerVersion}}\\t{{.Containers}}\\t{{.ContainersRunning}}\\t{{.ContainersPaused}}\\t{{.ContainersStopped}}\\t{{.Images}}";
const CONTAINER_FORMAT =
	"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.State}}\\t{{.Status}}";

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
			await waitForChildExit(child);
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
	const deadline = Date.now() + 1_000;
	while (!existsSync(path)) {
		if (Date.now() >= deadline) {
			throw new Error(`fixture descendant did not become ready: ${path}`);
		}
		await delay(25);
	}
}

async function waitForChildExit(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null || child.signalCode !== null) return;
	await new Promise<void>((resolve, reject) => {
		child.once("exit", () => resolve());
		child.once("error", reject);
	});
}
