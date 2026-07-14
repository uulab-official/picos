import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type LocalInspectorDocument = {
	schemaVersion: number;
	command: string;
	status: string;
	scope: string;
	source: {
		command: string;
		args: string[];
		success: boolean;
		exitCode: number | null;
		truncated: boolean;
	};
	request: { destination: string };
	error: { code: string };
	data: {
		system: { hostname: string };
		network: { interfaces: unknown[]; sources: unknown[] };
		returnedCount: number;
		visibleCount: number;
		limit: number;
		truncated: boolean;
	};
};

const PROCESS_TIMEOUT_MS = 25_000;
const LOCAL_INSPECTOR_JSON_MAX_BYTES = 4 * 1024 * 1024;

const successfulCommands = [
	["info", "--json"],
	["info", "--full", "--json"],
	["connections", "--json", "--sort", "remotePort"],
	["ports", "--json", "--sort", "port"],
	["routes", "--json", "--sort", "default"],
	["route", "8.8.8.8", "--json"],
] as const;

const results: CommandResult[] = [];
for (const args of successfulCommands) {
	results.push(await runPicos([...args]));
}

for (const [index, result] of results.entries()) {
	const args = successfulCommands[index];
	assert.equal(result.exitCode, 0, `${args?.join(" ")}: ${result.stderr}`);
	assert.equal(result.stderr, "", `${args?.join(" ")} wrote stderr`);
	const document = parseSingleJson(result.stdout, args?.[0] ?? "unknown");
	assert.equal(document.schemaVersion, 1);
	assert.equal(document.command, args?.[0]);
	assert.equal(document.status, "completed");
	assert.equal(result.stdout.includes('"rawOutput"'), false);
}

const info = parseSingleJson(results[0]?.stdout ?? "", "info");
assert.equal(info.scope, "summary");
assert.equal(typeof info.data.system.hostname, "string");
assert.ok(Array.isArray(info.data.network.interfaces));
assert.ok(Array.isArray(info.data.network.sources));
const fullInfo = parseSingleJson(results[1]?.stdout ?? "", "info");
assert.equal(fullInfo.scope, "full");
assert.ok(Array.isArray((fullInfo.data as { sources?: unknown[] }).sources));
const processSection = (
	fullInfo.data as unknown as {
		processes: {
			totalCount: number;
			returnedCount: number;
			limit: number;
			truncated: boolean;
		};
	}
).processes;
assert.equal(processSection.limit, 10_000);
assert.equal(
	processSection.returnedCount,
	Math.min(processSection.totalCount, processSection.limit),
);
assert.equal(
	processSection.truncated,
	processSection.totalCount > processSection.returnedCount,
);

for (const [index, key] of [
	[2, "connections"],
	[3, "ports"],
	[4, "routes"],
] as const) {
	const document = parseSingleJson(results[index]?.stdout ?? "", key);
	assert.equal(typeof document.source.command, "string");
	assert.equal(typeof document.source.success, "boolean");
	assert.ok(document.data.returnedCount <= document.data.limit);
	assert.equal(
		document.data.truncated,
		document.data.visibleCount > document.data.returnedCount,
	);
}

const route = parseSingleJson(results[5]?.stdout ?? "", "route");
assert.equal(route.request.destination, "8.8.8.8");
assert.equal(typeof route.source.success, "boolean");

for (const args of [
	["routes", "--raw", "--json"],
	["routes", "--sort", "unsafe", "--json"],
	["route", "--json=true"],
]) {
	const result = await runPicos(args);
	assert.equal(result.exitCode, 1, args.join(" "));
	assert.equal(result.stderr, "", `${args.join(" ")} wrote stderr`);
	const document = parseSingleJson(result.stdout, args[0] ?? "unknown");
	assert.equal(document.schemaVersion, 1);
	assert.equal(document.command, args[0]);
	assert.equal(document.status, "failed");
	assert.equal(document.error.code, "PICOS_LOCAL_INSPECTOR_FAILED");
}

const unavailableCommandPath = await createUnavailableCommandPath();
try {
	const missingUtility = await runPicos(["routes", "--json"], {
		PATH: unavailableCommandPath,
		Path: unavailableCommandPath,
	});
	assert.equal(missingUtility.exitCode, 1);
	assert.equal(missingUtility.stderr, "");
	const missingUtilityDocument = parseSingleJson(
		missingUtility.stdout,
		"routes",
	);
	assert.equal(missingUtilityDocument.status, "failed");
	assert.equal(typeof missingUtilityDocument.source.command, "string");
	assert.ok(missingUtilityDocument.source.command.length > 0);
	assert.ok(Array.isArray(missingUtilityDocument.source.args));
	assert.equal(missingUtilityDocument.source.success, false);
	assert.notEqual(missingUtilityDocument.source.exitCode, 0);
	assert.equal(missingUtilityDocument.source.truncated, false);
} finally {
	await rm(unavailableCommandPath, { recursive: true, force: true });
}

const largeOutput = await runCommand([
	process.execPath,
	"scripts/support/localInspectorOutputFixture.ts",
]);
assert.equal(largeOutput.exitCode, 0, largeOutput.stderr);
assert.equal(largeOutput.stderr, "");
assert.ok(Buffer.byteLength(largeOutput.stdout, "utf8") > 64 * 1024);
assert.ok(
	Buffer.byteLength(largeOutput.stdout, "utf8") <=
		LOCAL_INSPECTOR_JSON_MAX_BYTES,
);
const largeDocument = parseSingleJson(largeOutput.stdout, "connections");
assert.equal(largeDocument.status, "completed");
assert.equal(largeDocument.data.truncated, true);
assert.ok(largeDocument.data.returnedCount < largeDocument.data.visibleCount);

console.log(
	`Local inspector integration complete: ${results.length} success and 4 failure JSON contracts verified`,
);

async function runPicos(
	args: string[],
	environment: Record<string, string> = {},
): Promise<CommandResult> {
	return runCommand(
		[process.execPath, "src/bin/picos.ts", ...args],
		environment,
	);
}

async function runCommand(
	command: string[],
	environment: Record<string, string> = {},
): Promise<CommandResult> {
	const processHandle = Bun.spawn(command, {
		cwd: process.cwd(),
		env: { ...process.env, ...environment },
		stdout: "pipe",
		stderr: "pipe",
	});
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
			`picos local inspector process exceeded ${PROCESS_TIMEOUT_MS}ms: ${command.join(" ")}`,
		);
	}
	const [stdout, stderr, exitCode] = completed;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function createUnavailableCommandPath(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "picos-missing-command-"));
	const command =
		process.platform === "linux"
			? "ip"
			: process.platform === "win32"
				? "route"
				: "netstat";
	const target = join(
		directory,
		process.platform === "win32" ? `${command}.exe` : command,
	);
	if (process.platform === "win32") {
		await copyFile(process.execPath, target);
	} else {
		await writeFile(target, "#!/bin/sh\nexit 23\n", { mode: 0o755 });
	}
	return directory;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseSingleJson(
	stdout: string,
	command: string,
): LocalInspectorDocument {
	assert.ok(stdout.startsWith("{"), `${command} did not start with JSON`);
	assert.ok(stdout.endsWith("}"), `${command} returned truncated JSON`);
	return JSON.parse(stdout) as LocalInspectorDocument;
}
