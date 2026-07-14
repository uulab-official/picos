import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Client, type SFTPWrapper } from "ssh2";
import { defaultConfig, getConfigPathForPlatform } from "../src/config/schema";
import { writeConfig } from "../src/config/store";
import { createSftpHostKeyFingerprint } from "../src/core/sftp";
import {
	type SftpIntegrationFixture,
	startSftpIntegrationFixture,
} from "./support/sftpFixture";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

const REMOTE_PROCESS_TIMEOUT_MS = 20_000;

const directory = await mkdtemp(join(tmpdir(), "picos-sftp-integration-"));
let fixture: SftpIntegrationFixture | undefined;

try {
	fixture = await startSftpIntegrationFixture();
	const keyPath = join(directory, "id_ed25519");
	const knownHostsPath = join(directory, "known_hosts");
	await writeFile(keyPath, fixture.clientPrivateKey, { mode: 0o600 });
	await writeFile(knownHostsPath, fixture.knownHosts, "utf8");

	const environment = createIsolatedEnvironment(directory);
	const configPath = getConfigPathForPlatform(
		process.platform,
		directory,
		environment,
	);
	await mkdir(dirname(configPath), { recursive: true });
	await writeConfig(
		{
			...defaultConfig,
			remoteProfiles: [
				{
					id: "fixture",
					kind: "sftp",
					host: fixture.host,
					port: fixture.port,
					username: fixture.username,
					root: fixture.root,
					keyPath,
				},
			],
		},
		configPath,
	);

	const list = await runPicosRemote(
		[
			"--list",
			".",
			"--known-hosts",
			knownHostsPath,
			"--confirm",
			"connect remote fixture",
			"--json",
		],
		environment,
	);
	assert.equal(list.exitCode, 0, list.stderr);
	const listResult = JSON.parse(list.stdout);
	assert.equal(listResult.schemaVersion, 1);
	assert.equal(listResult.status, "completed");
	assert.equal(listResult.operation, "list");
	assert.equal(listResult.session.network, "closed");
	assert.equal(listResult.session.writes, "locked");
	assert.deepEqual(
		listResult.data.entries.map((entry: { name: string }) => entry.name),
		["logs", "README.md"],
	);
	assert.match(list.stderr, /status=completed/);
	assert.match(list.stderr, /network=closed/);

	const read = await runPicosRemote(
		[
			"--read",
			"README.md",
			"--max-bytes",
			"8",
			"--known-hosts",
			knownHostsPath,
			"--confirm",
			"connect remote fixture",
			"--json",
		],
		environment,
	);
	assert.equal(read.exitCode, 0, read.stderr);
	const readResult = JSON.parse(read.stdout);
	assert.equal(readResult.status, "completed");
	assert.equal(readResult.operation, "read");
	assert.equal(readResult.data.file.content, "picos in");
	assert.equal(readResult.data.file.contentBytes, 8);
	assert.equal(readResult.data.file.truncated, true);
	assert.equal(readResult.data.file.maxBytes, 8);

	const connectionCount = fixture.metrics.connections;
	const rejected = await runPicosRemote(
		["--list", ".", "--known-hosts", knownHostsPath, "--json"],
		environment,
	);
	assert.equal(rejected.exitCode, 1);
	assert.equal(JSON.parse(rejected.stdout).status, "failed");
	assert.match(rejected.stderr, /status=failed/);
	assert.equal(rejected.stderr.split("\n").length, 1);
	assert.equal(fixture.metrics.connections, connectionCount);
	const parseRejected = await runPicosRemote(["--read", "--json"], environment);
	assert.equal(parseRejected.exitCode, 1);
	const parseResult = JSON.parse(parseRejected.stdout);
	assert.equal(parseResult.schemaVersion, 1);
	assert.equal(parseResult.status, "failed");
	assert.equal(parseResult.operation, "read");
	assert.deepEqual(parseResult.profile, { id: "fixture" });
	assert.equal(parseResult.request, null);
	assert.equal(parseRejected.stderr.split("\n").length, 1);
	assert.equal(fixture.metrics.connections, connectionCount);

	const unknownProfile = await runPicosRemote(
		["--list", ".", "--confirm", "connect remote missing", "--json"],
		environment,
		"missing",
	);
	assert.equal(unknownProfile.exitCode, 1);
	const unknownResult = JSON.parse(unknownProfile.stdout);
	assert.equal(unknownResult.status, "failed");
	assert.equal(unknownResult.operation, "list");
	assert.deepEqual(unknownResult.profile, { id: "missing" });
	assert.deepEqual(unknownResult.request, { path: "." });
	assert.equal(unknownProfile.stderr.split("\n").length, 1);
	assert.equal(fixture.metrics.connections, connectionCount);

	await verifyReadOnlyServerGuards(fixture);
	assert.equal(fixture.metrics.writeAttempts, 1);
	assert.equal(fixture.metrics.execAttempts, 1);
	assert.equal(fixture.metrics.authenticated, 3);
	assert.equal(fixture.metrics.closed, 3);

	await writeFile(configPath, "{\n", "utf8");
	const invalidConfig = await runPicosRemote(
		["--list", ".", "--confirm", "connect remote fixture", "--json"],
		environment,
	);
	assert.equal(invalidConfig.exitCode, 1);
	assert.equal(JSON.parse(invalidConfig.stdout).status, "failed");
	assert.equal(JSON.parse(invalidConfig.stdout).operation, "list");
	assert.equal(invalidConfig.stderr.split("\n").length, 1);
	assert.equal(fixture.metrics.connections, 3);

	console.log(
		`SFTP integration complete: list/read JSON verified, ${fixture.metrics.closed} sessions closed`,
	);
} finally {
	try {
		await fixture?.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

async function runPicosRemote(
	args: string[],
	environment: NodeJS.ProcessEnv,
	id = "fixture",
): Promise<CommandResult> {
	const processHandle = Bun.spawn(
		["bun", "src/bin/picos.ts", "remote", id, ...args],
		{
			cwd: process.cwd(),
			env: { ...process.env, ...environment },
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		processHandle.kill("SIGKILL");
	}, REMOTE_PROCESS_TIMEOUT_MS);
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(processHandle.stdout).text(),
		new Response(processHandle.stderr).text(),
		processHandle.exited,
	]).finally(() => clearTimeout(timeout));
	if (timedOut) {
		throw new Error(
			`picos remote integration process exceeded ${REMOTE_PROCESS_TIMEOUT_MS}ms`,
		);
	}
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function verifyReadOnlyServerGuards(
	fixture: SftpIntegrationFixture,
): Promise<void> {
	const client = new Client();
	const expectedClosedSessions = fixture.metrics.closed + 1;
	const closed = new Promise<void>((resolveClosed) =>
		client.once("close", resolveClosed),
	);
	try {
		await new Promise<void>((resolveReady, rejectReady) => {
			client
				.once("ready", resolveReady)
				.once("error", rejectReady)
				.connect({
					host: fixture.host,
					port: fixture.port,
					username: fixture.username,
					privateKey: fixture.clientPrivateKey,
					hostVerifier: (key: Buffer) =>
						createSftpHostKeyFingerprint(key) === fixture.hostFingerprint,
					readyTimeout: REMOTE_PROCESS_TIMEOUT_MS,
				});
		});
		const sftp = await new Promise<SFTPWrapper>((resolveSftp, rejectSftp) =>
			client.sftp((error, channel) =>
				error ? rejectSftp(error) : resolveSftp(channel),
			),
		);
		const writeError = await new Promise<Error | undefined>((resolveWrite) =>
			sftp.writeFile("/srv/app/README.md", "blocked", (error) =>
				resolveWrite(error ?? undefined),
			),
		);
		assert.ok(writeError, "fixture must reject SFTP writes");
		sftp.end();

		const execError = await new Promise<Error | undefined>((resolveExec) =>
			client.exec("echo blocked", (error, channel) => {
				channel?.close();
				resolveExec(error ?? undefined);
			}),
		);
		assert.ok(execError, "fixture must reject SSH exec requests");
	} finally {
		client.end();
		await closed;
		await waitForMetric(
			() => fixture.metrics.closed >= expectedClosedSessions,
			"fixture server did not observe the SSH session closing",
		);
	}
}

async function waitForMetric(
	predicate: () => boolean,
	message: string,
): Promise<void> {
	const deadline = Date.now() + 2_000;
	while (!predicate()) {
		if (Date.now() >= deadline) throw new Error(message);
		await Bun.sleep(10);
	}
}

function createIsolatedEnvironment(directory: string): NodeJS.ProcessEnv {
	return {
		HOME: directory,
		USERPROFILE: directory,
		APPDATA: join(directory, "AppData", "Roaming"),
		XDG_CONFIG_HOME: join(directory, ".config"),
	};
}
