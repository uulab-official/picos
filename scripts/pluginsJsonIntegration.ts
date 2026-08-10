import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import {
	createDockerFixture,
	type DockerFixtureMode,
	terminateProcessTree,
} from "./support/dockerFixture";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type PluginDocument = {
	schemaVersion: number;
	command: string;
	status: string;
	error?: { code?: string; message?: string };
	data?: {
		status?: string;
		evidence?: Array<{
			id?: string;
			supported?: boolean;
			success?: boolean;
			exitCode?: number | null;
			truncated?: boolean;
		}>;
		clientVersion?: string | null;
		context?: string | null;
		engineVersion?: string | null;
		containerCounts?: Record<string, number | null>;
		imageCount?: number | null;
		returnedContainerCount?: number;
		containers?: unknown[];
	};
};

const PROCESS_TIMEOUT_MS = 60_000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const ENGINE_FORMAT =
	"{{.ServerVersion}}\\t{{.Containers}}\\t{{.ContainersRunning}}\\t{{.ContainersPaused}}\\t{{.ContainersStopped}}\\t{{.Images}}";
const CONTAINER_FORMAT =
	"{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.State}}\\t{{.Status}}";

await assertExactFixtureArguments();

const completed = await runPicosWithFixture("completed", [
	"plugins",
	"docker",
	"--json",
]);
assert.equal(completed.exitCode, 0);
assert.equal(completed.stderr, "");
const completedDocument = parseSingleJson(completed.stdout, "completed Docker");
assert.equal(completedDocument.status, "completed");
assert.equal(completedDocument.data?.status, "completed");
assert.equal(completedDocument.data?.clientVersion, "28.3.0");
assert.equal(completedDocument.data?.context, "fixture-context");
assert.equal(completedDocument.data?.engineVersion, "28.3.0");
assert.deepEqual(completedDocument.data?.containerCounts, {
	total: 3,
	running: 1,
	paused: 1,
	stopped: 1,
});
assert.equal(completedDocument.data?.imageCount, 12);
assert.equal(completedDocument.data?.returnedContainerCount, 2);
assert.equal(completedDocument.data?.containers?.length, 2);
assertCollectorEvidence(completedDocument, true, "completed Docker");

const partial = await runPicosWithFixture("partial", [
	"plugins",
	"docker",
	"--json",
]);
assert.equal(partial.exitCode, 0);
assert.equal(partial.stderr, "");
const partialDocument = parseSingleJson(partial.stdout, "partial Docker");
assert.equal(partialDocument.status, "completed");
assert.equal(partialDocument.data?.status, "partial");
assert.equal(partial.stdout.includes("fixture-secret"), false);
assert.equal(hasProperty(partialDocument, "diagnostic"), false);
assert.equal(partialDocument.data?.engineVersion, null);
assert.equal(partialDocument.data?.returnedContainerCount, 0);
assertCollectorEvidence(partialDocument, true, "partial Docker");

const unsupported = await runPicosWithEmptyPath([
	"plugins",
	"docker",
	"--json",
]);
assert.equal(unsupported.exitCode, 0);
assert.equal(unsupported.stderr, "");
const unsupportedDocument = parseSingleJson(
	unsupported.stdout,
	"unsupported Docker",
);
assert.equal(unsupportedDocument.status, "completed");
assert.equal(unsupportedDocument.data?.status, "unsupported");
assertUnsupportedEvidence(unsupportedDocument);

const unknown = await runPicosWithEmptyPath(["plugins", "missing", "--json"]);
assert.equal(unknown.exitCode, 1);
assert.equal(unknown.stderr, "");
const unknownDocument = parseSingleJson(unknown.stdout, "unknown plugin");
assert.equal(unknownDocument.status, "failed");
assert.equal(unknownDocument.error?.code, "PICOS_LOCAL_INSPECTOR_FAILED");
assertCollectorEvidence(unknownDocument, false, "unknown plugin");

console.log(
	"Plugin JSON integration complete: completed, partial, unsupported, and unknown-plugin contracts verified",
);

function assertCollectorEvidence(
	document: PluginDocument,
	clientExists: boolean,
	label: string,
): void {
	const evidence = document.data?.evidence;
	if (!clientExists) {
		assert.ok(
			!evidence || evidence.length < 4,
			`${label} must not publish four collector rows without a Docker client`,
		);
		return;
	}
	assert.ok(
		Array.isArray(evidence),
		`${label} must publish collector evidence`,
	);
	assert.equal(evidence.length, 4, `${label} collector evidence count`);
	assert.deepEqual(
		evidence.map((item) => item.id),
		["client", "context", "engine", "containers"],
		`${label} collector evidence ids`,
	);
}

function assertUnsupportedEvidence(document: PluginDocument): void {
	const evidence = document.data?.evidence;
	assert.ok(
		Array.isArray(evidence),
		"unsupported Docker must publish evidence",
	);
	assert.equal(evidence.length, 1, "unsupported Docker evidence count");
	assert.equal(evidence[0]?.id, "client");
	assert.equal(evidence[0]?.supported, false);
	assert.equal(evidence[0]?.success, false);
}

async function assertExactFixtureArguments(): Promise<void> {
	const fixture = await createDockerFixture("completed");
	const { executable } = fixture;
	try {
		for (const args of [
			["--version"],
			["context", "show"],
			["info", "--format", ENGINE_FORMAT],
			["ps", "--all", "--format", CONTAINER_FORMAT],
		]) {
			const result = await runFixture(executable, args, fixture.environment);
			assert.equal(result.exitCode, 0, args.join(" "));
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
			const result = await runFixture(executable, args, fixture.environment);
			assert.notEqual(result.exitCode, 0, args.join(" "));
		}
	} finally {
		await fixture.cleanup();
	}
}

async function runPicosWithFixture(
	mode: DockerFixtureMode,
	args: string[],
): Promise<CommandResult> {
	const fixture = await createDockerFixture(mode);
	try {
		return await runPicos(args, fixture.environment);
	} finally {
		await fixture.cleanup();
	}
}

function runPicosWithEmptyPath(args: string[]): Promise<CommandResult> {
	return runPicos(args, { PATH: "", Path: "" });
}

async function runPicos(
	args: string[],
	environment: NodeJS.ProcessEnv,
): Promise<CommandResult> {
	const processHandle = spawn(process.execPath, ["src/bin/picos.ts", ...args], {
		cwd: process.cwd(),
		detached: process.platform !== "win32",
		env: { ...process.env, ...environment },
		shell: false,
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});
	const completion = Promise.all([
		readChildOutput(processHandle.stdout),
		readChildOutput(processHandle.stderr),
		waitForExitCode(processHandle),
	]);
	let timeout: number | undefined;
	const deadline = new Promise<undefined>((resolve) => {
		timeout = setTimeout(resolve, PROCESS_TIMEOUT_MS);
	});
	const completed = await Promise.race([completion, deadline]).finally(() => {
		if (timeout) clearTimeout(timeout);
	});
	if (!completed) {
		await terminateProcessTree(processHandle);
		await completion;
		throw new Error(
			`picos plugin process exceeded ${PROCESS_TIMEOUT_MS}ms: ${args.join(" ")}`,
		);
	}
	const [stdout, stderr, exitCode] = completed;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

function readChildOutput(
	stream: NodeJS.ReadableStream | null,
): Promise<string> {
	if (!stream) return Promise.resolve("");
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on("data", (chunk: Buffer | string) => {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		});
		stream.once("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		stream.once("error", reject);
	});
}

function waitForExitCode(child: ChildProcess): Promise<number> {
	if (child.exitCode !== null || child.signalCode !== null) {
		return Promise.resolve(child.exitCode ?? 1);
	}
	return new Promise((resolve, reject) => {
		child.once("exit", (exitCode) => resolve(exitCode ?? 1));
		child.once("error", reject);
	});
}

function parseSingleJson(stdout: string, label: string): PluginDocument {
	assert.ok(stdout.startsWith("{"), `${label} did not start with JSON`);
	assert.ok(stdout.endsWith("}"), `${label} returned truncated JSON`);
	assert.ok(
		Buffer.byteLength(stdout, "utf8") < MAX_JSON_BYTES,
		`${label} exceeded the ${MAX_JSON_BYTES}-byte JSON bound`,
	);
	const document = JSON.parse(stdout) as PluginDocument;
	assert.equal(hasProperty(document, "rawOutput"), false);
	assert.equal(hasProperty(document, "diagnostic"), false);
	return document;
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

function hasProperty(value: unknown, property: string): boolean {
	if (Array.isArray(value))
		return value.some((item) => hasProperty(item, property));
	if (!value || typeof value !== "object") return false;
	if (Object.hasOwn(value, property)) return true;
	return Object.values(value).some((item) => hasProperty(item, property));
}
