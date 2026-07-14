import assert from "node:assert/strict";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type OperationsDocument = {
	schemaVersion: number;
	command: string;
	status: string;
	request?: Record<string, unknown>;
	source?: Record<string, unknown>;
	error?: { code?: string; message?: string };
	data?: Record<string, unknown>;
};

const PROCESS_TIMEOUT_MS = 60_000;

const monitorResult = await runPicos(["monitor", "--json"]);
const monitor = assertCompleted(monitorResult, "monitor");
assert.equal(monitor.request?.operation, "snapshot");
assert.equal(typeof monitor.data?.uptimeSeconds, "number");
assert.equal(typeof monitor.data?.processCount, "number");
assert.ok(Array.isArray(monitor.data?.topProcesses));
assertDataOmits(monitorResult.stdout, ["rawOutput", '"commandLine"']);

const pid = String(process.pid);
const processResult = await runPicos(["process", pid, "--json"]);
const processDocument = assertCompleted(processResult, "process");
assert.equal(processDocument.request?.pid, process.pid);
assert.equal(processDocument.request?.files, false);
assert.equal(
	(processDocument.data?.detail as Record<string, unknown>).pid,
	process.pid,
);
assertDataOmits(processResult.stdout, ["rawOutput", '"detail":{"command"']);

const processFilesResult = await runPicos([
	"process",
	pid,
	"--files",
	"--json",
]);
const processFiles = assertCompleted(processFilesResult, "process");
assert.equal(processFiles.request?.files, true);
const files = processFiles.data?.files as Record<string, unknown>;
assert.equal(files.requested, true);
assert.equal(typeof files.available, "boolean");
assert.ok(Array.isArray(files.entries));
assertDataOmits(processFilesResult.stdout, ["rawOutput"]);

const logsResult = await runPicos([
	"logs",
	"--limit",
	"5",
	"--level",
	"all",
	"--json",
]);
assert.ok(
	logsResult.exitCode === 0 || logsResult.exitCode === 1,
	logsResult.stderr,
);
assert.equal(logsResult.stderr, "");
const logs = parseSingleJson(logsResult.stdout, "logs");
assert.equal(logs.schemaVersion, 1);
assert.equal(logs.command, "logs");
assert.ok(logs.status === "completed" || logs.status === "failed");
assert.equal(logs.request?.limit, 5);
if (logs.status === "completed") {
	assert.ok(Array.isArray(logs.data?.entries));
} else {
	assert.equal(logs.error?.code, "PICOS_LOCAL_INSPECTOR_FAILED");
}
assertDataOmits(logsResult.stdout, ["rawOutput"]);

for (const [args, command] of [
	[["logs", "--limit", "0", "--json"], "logs"],
	[["logs", "--limit", "201", "--json"], "logs"],
	[["logs", "--level", "debug", "--json"], "logs"],
	[["process", "0", "--json"], "process"],
	[["process", "--json"], "process"],
] as const) {
	const result = await runPicos([...args]);
	assert.equal(result.exitCode, 1, args.join(" "));
	assert.equal(result.stderr, "", `${args.join(" ")} wrote stderr`);
	const document = parseSingleJson(result.stdout, command);
	assert.equal(document.command, command);
	assert.equal(document.status, "failed");
	assert.equal(document.error?.code, "PICOS_LOCAL_INSPECTOR_FAILED");
}

console.log(
	"Operations JSON integration complete: 4 live and 5 deterministic failure contracts verified",
);

function assertCompleted(
	result: CommandResult,
	command: string,
): OperationsDocument {
	assert.equal(result.exitCode, 0, result.stderr);
	assert.equal(result.stderr, "");
	const document = parseSingleJson(result.stdout, command);
	assert.equal(document.schemaVersion, 1);
	assert.equal(document.command, command);
	assert.equal(document.status, "completed");
	return document;
}

function assertDataOmits(stdout: string, markers: string[]): void {
	for (const marker of markers) {
		assert.equal(
			stdout.includes(marker),
			false,
			`unexpected JSON marker: ${marker}`,
		);
	}
}

async function runPicos(args: string[]): Promise<CommandResult> {
	const processHandle = Bun.spawn(
		[process.execPath, "src/bin/picos.ts", ...args],
		{
			cwd: process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const completion = Promise.all([
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
		processHandle.exited,
	]);
	let timeout: number | undefined;
	const deadline = new Promise<undefined>((resolve) => {
		timeout = setTimeout(resolve, PROCESS_TIMEOUT_MS);
	});
	const completed = await Promise.race([completion, deadline]).finally(() => {
		if (timeout) clearTimeout(timeout);
	});
	if (!completed) {
		processHandle.kill("SIGKILL");
		await Promise.race([processHandle.exited, delay(1_000)]);
		throw new Error(
			`picos operations process exceeded ${PROCESS_TIMEOUT_MS}ms: ${args.join(" ")}`,
		);
	}
	const [stdout, stderr, exitCode] = completed;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

function parseSingleJson(stdout: string, command: string): OperationsDocument {
	assert.ok(stdout.startsWith("{"), `${command} did not start with JSON`);
	assert.ok(stdout.endsWith("}"), `${command} returned truncated JSON`);
	return JSON.parse(stdout) as OperationsDocument;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
