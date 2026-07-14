import assert from "node:assert/strict";
import { createServer, type Server } from "node:net";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type DiagnosticDocument = {
	schemaVersion: number;
	command: string;
	status: string;
	request?: Record<string, unknown>;
	source?: { kind?: string; success?: boolean };
	error?: { code?: string; message?: string };
	data?: Record<string, unknown>;
};

const PROCESS_TIMEOUT_MS = 60_000;

const dnsResult = await runPicos(["dns", "--json"]);
assertCompleted(dnsResult, "dns");
const dnsDocument = parseSingleJson(dnsResult.stdout, "dns");
assert.equal(dnsDocument.request?.operation, "show");
assert.equal(dnsDocument.source?.kind, "node");
assert.ok(Array.isArray(dnsDocument.data?.servers));

const listResult = await runPicos(["tools", "list", "--json"]);
assertCompleted(listResult, "tools");
const listDocument = parseSingleJson(listResult.stdout, "tools");
assert.equal(listDocument.request?.operation, "list");
assert.equal(listDocument.data?.toolCount, 8);
assert.equal((listDocument.data?.tools as unknown[]).length, 8);

const server = await listenOnLoopback();
try {
	const address = server.address();
	assert.ok(address && typeof address === "object");
	const portResult = await runPicos([
		"tools",
		"port-check",
		"127.0.0.1",
		String(address.port),
		"--timeout",
		"2000",
		"--json",
	]);
	assertCompleted(portResult, "tools");
	const portDocument = parseSingleJson(portResult.stdout, "tools");
	assert.equal(portDocument.request?.operation, "run");
	assert.equal(portDocument.request?.tool, "port-check");
	assert.equal(portDocument.source?.kind, "tcp");
	assert.equal(portDocument.source?.success, true);
	assert.equal(
		(portDocument.data?.result as Record<string, unknown>).reachable,
		true,
	);
} finally {
	await closeServer(server);
}

const doctorResult = await runPicos(["doctor", "--json"]);
assert.ok(
	doctorResult.exitCode === 0 || doctorResult.exitCode === 1,
	doctorResult.stderr,
);
assert.equal(doctorResult.stderr, "");
const doctorDocument = parseSingleJson(doctorResult.stdout, "doctor");
assert.equal(doctorDocument.status, "completed");
assert.equal(doctorDocument.data?.checkCount, 8);
const doctorChecks = doctorDocument.data?.checks as Array<{
	id: string;
	status: string;
}>;
assert.equal(doctorChecks.length, 8);
assert.deepEqual(
	doctorChecks.map((check) => check.id),
	[
		"interface",
		"ipv4",
		"gateway",
		"dns-config",
		"dns-resolve",
		"internet",
		"default-ping",
		"public-ip",
	],
);

for (const [args, command, status, code] of [
	[["dns", "flush", "--json"], "dns", "blocked", "PICOS_ACTION_LOCKED"],
	[
		["dns", "unsafe", "--json"],
		"dns",
		"failed",
		"PICOS_LOCAL_INSPECTOR_FAILED",
	],
	[
		["tools", "unknown", "--json"],
		"tools",
		"failed",
		"PICOS_LOCAL_INSPECTOR_FAILED",
	],
	[
		["tools", "port-check", "example.com", "--json"],
		"tools",
		"failed",
		"PICOS_LOCAL_INSPECTOR_FAILED",
	],
	[
		["tools", "ping", "example.com", "--timeout", "99", "--json"],
		"tools",
		"failed",
		"PICOS_LOCAL_INSPECTOR_FAILED",
	],
	[
		["tools", "ping", "example.com", "--raw", "--json"],
		"tools",
		"failed",
		"PICOS_LOCAL_INSPECTOR_FAILED",
	],
] as const) {
	const result = await runPicos([...args]);
	assert.equal(result.exitCode, 1, args.join(" "));
	assert.equal(result.stderr, "", `${args.join(" ")} wrote stderr`);
	const document = parseSingleJson(result.stdout, command);
	assert.equal(document.command, command);
	assert.equal(document.status, status);
	assert.equal(document.error?.code, code);
}

console.log(
	"Diagnostics JSON integration complete: 4 live and 6 deterministic guarded/failure contracts verified",
);

function assertCompleted(result: CommandResult, command: string): void {
	assert.equal(result.exitCode, 0, result.stderr);
	assert.equal(result.stderr, "");
	const document = parseSingleJson(result.stdout, command);
	assert.equal(document.schemaVersion, 1);
	assert.equal(document.command, command);
	assert.equal(document.status, "completed");
	assert.equal(result.stdout.includes('"rawOutput"'), false);
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
			`picos diagnostics process exceeded ${PROCESS_TIMEOUT_MS}ms: ${args.join(" ")}`,
		);
	}
	const [stdout, stderr, exitCode] = completed;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

function parseSingleJson(stdout: string, command: string): DiagnosticDocument {
	assert.ok(stdout.startsWith("{"), `${command} did not start with JSON`);
	assert.ok(stdout.endsWith("}"), `${command} returned truncated JSON`);
	return JSON.parse(stdout) as DiagnosticDocument;
}

function listenOnLoopback(): Promise<Server> {
	return new Promise((resolve, reject) => {
		const server = createServer((socket) => socket.end());
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			server.off("error", reject);
			resolve(server);
		});
	});
}

function closeServer(server: Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
