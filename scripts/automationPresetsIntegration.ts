import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type AutomationDocument = {
	schemaVersion: number;
	command: string;
	status: string;
	request?: Record<string, unknown>;
	source?: Record<string, unknown>;
	error?: { code?: string; message?: string };
	data?: Record<string, unknown>;
};

const PROCESS_TIMEOUT_MS = 60_000;
const tempRoot = await mkdtemp(join(tmpdir(), "picos-automation-presets-"));
const home = join(tempRoot, "home");
const xdg = join(tempRoot, "xdg");
const appData = join(tempRoot, "appdata");
await Promise.all(
	[home, xdg, appData].map((path) => mkdir(path, { recursive: true })),
);
const environment = {
	...process.env,
	HOME: home,
	USERPROFILE: home,
	XDG_CONFIG_HOME: xdg,
	APPDATA: appData,
	BUN_INSTALL_CACHE_DIR: join(tempRoot, "bun-cache"),
};

try {
	const kinds = assertCompleted(
		await runPicos(["operations", "kinds", "--json"]),
		"operations",
	);
	assert.equal(kinds.request?.operation, "kinds");
	assert.equal(kinds.request?.kind, null);
	assert.equal(kinds.data?.totalCount, 3);
	assert.equal(kinds.data?.returnedCount, 3);
	assert.equal("path" in (kinds.source ?? {}), false);
	assert.ok(
		Array.isArray(kinds.data?.kinds),
		"published contract kinds must be an array",
	);
	assert.ok(
		kinds.data?.confirmations,
		"published contract confirmations must be present",
	);
	const kindContracts = kinds.data?.kinds as Array<{
		kind: string;
		command: string;
		fields: Array<{ name: string; option: string; required: boolean }>;
	}>;
	assert.deepEqual(
		kindContracts.map((contract) => contract.kind),
		["monitor", "logs", "process"],
	);
	const confirmations = kinds.data?.confirmations as {
		save: string;
		remove: string;
	};
	assert.equal(confirmations.save, "save operation preset <id>");
	assert.equal(confirmations.remove, "remove operation preset <id>");
	const limits = kinds.data?.limits as {
		idPattern: string;
		idNormalization: string;
	};
	assert.equal(limits.idPattern, "^[a-z0-9][a-z0-9._-]*$");
	assert.equal(limits.idNormalization, "trim-lowercase");

	const monitorKind = assertCompleted(
		await runPicos(["operations", "kinds", "monitor", "--json"]),
		"operations",
	);
	assert.equal(monitorKind.request?.kind, "monitor");
	assert.equal(monitorKind.data?.totalCount, 3);
	assert.equal(monitorKind.data?.returnedCount, 1);
	assert.equal("path" in (monitorKind.source ?? {}), false);
	const monitorKinds = monitorKind.data?.kinds as Array<{ kind: string }>;
	assert.ok(Array.isArray(monitorKinds), "filtered kinds must be an array");
	assert.equal(monitorKinds.length, 1);
	assert.equal(monitorKinds[0]?.kind, "monitor");

	const empty = assertCompleted(
		await runPicos(["operations", "--json"]),
		"operations",
	);
	assert.equal(empty.request?.operation, "list");
	assert.equal(empty.data?.totalCount, 0);
	assert.deepEqual(empty.data?.presets, []);
	assert.equal(empty.source?.location, "user-config");
	assert.equal("path" in (empty.source ?? {}), false);

	const monitorFields = kindContracts[0]?.fields ?? [];
	const samplesOption = requireContractOption(monitorFields, "samples");
	const intervalOption = requireContractOption(monitorFields, "intervalMs");
	const monitorSave = assertCompleted(
		await runPicos([
			"operations",
			"save",
			"pulse",
			"monitor",
			samplesOption,
			"2",
			intervalOption,
			"250",
			"--confirm",
			confirmations.save.replace("<id>", "pulse"),
			"--json",
		]),
		"operations",
	);
	assert.equal(monitorSave.request?.presetId, "pulse");

	const monitorRun = assertCompleted(
		await runPicos(["operations", "run", "pulse", "--json"]),
		"monitor",
	);
	assert.equal(monitorRun.request?.presetId, "pulse");
	assert.equal(monitorRun.request?.operation, "sample");
	assert.equal(monitorRun.data?.requestedCount, 2);
	assert.equal(monitorRun.data?.returnedCount, 2);
	assert.ok(Array.isArray(monitorRun.data?.samples));
	assertDataOmits(JSON.stringify(monitorRun), ["rawOutput", '"commandLine"']);

	assertCompleted(
		await runPicos([
			"operations",
			"save",
			"errors",
			"logs",
			"--limit",
			"5",
			"--level",
			"fail",
			"--filter",
			"error",
			"--confirm",
			"save operation preset errors",
			"--json",
		]),
		"operations",
	);
	const logsResult = await runPicos(["operations", "run", "errors", "--json"]);
	assert.ok(logsResult.exitCode === 0 || logsResult.exitCode === 1);
	assert.equal(logsResult.stderr, "");
	const logs = parseSingleJson(logsResult.stdout, "logs preset");
	if (logs.status === "completed") {
		assert.equal(logs.command, "logs");
		assert.equal(logs.request?.presetId, "errors");
		assert.ok(Array.isArray(logs.data?.entries));
	} else {
		assert.equal(logs.command, "operations");
		assert.equal(logs.error?.code, "PICOS_LOCAL_INSPECTOR_FAILED");
	}
	assertDataOmits(logsResult.stdout, ["rawOutput"]);

	assertCompleted(
		await runPicos([
			"operations",
			"save",
			"self",
			"process",
			"--pid",
			String(process.pid),
			"--files",
			"--confirm",
			"save operation preset self",
			"--json",
		]),
		"operations",
	);
	const processRun = assertCompleted(
		await runPicos(["operations", "run", "self", "--json"]),
		"process",
	);
	assert.equal(processRun.request?.presetId, "self");
	assert.equal(processRun.request?.pid, process.pid);
	assert.equal(processRun.request?.files, true);
	assertDataOmits(JSON.stringify(processRun), [
		"rawOutput",
		'"detail":{"command"',
	]);

	const list = assertCompleted(
		await runPicos(["operations", "list", "--json"]),
		"operations",
	);
	assert.equal(list.data?.totalCount, 3);
	assert.deepEqual(
		(list.data?.presets as Array<{ id: string }>).map((preset) => preset.id),
		["self", "errors", "pulse"],
	);

	// Each case pairs its arguments with a substring of the message its own guard
	// produces, so a case that starts failing earlier or later than intended is
	// caught instead of passing on the shared failure envelope. `requestKind` and
	// `requestPresetId` are only set where the echoed value is worth pinning.
	const failureCases: {
		args: string[];
		errorIncludes: string;
		requestKind?: string | null;
		requestPresetId?: string | null;
	}[] = [
		{
			args: [
				"operations",
				"save",
				"blocked",
				"monitor",
				"--confirm",
				"wrong",
				"--json",
			],
			errorIncludes: 'pass --confirm "save operation preset blocked"',
			requestPresetId: "blocked",
		},
		{
			args: [
				"operations",
				"save",
				"too-long",
				"monitor",
				"--samples",
				"60",
				"--interval",
				"60000",
				"--confirm",
				"save operation preset too-long",
				"--json",
			],
			errorIncludes: "exceeds 300000 milliseconds",
			requestPresetId: "too-long",
		},
		{
			args: ["operations", "run", "missing", "--json"],
			errorIncludes: "Operation preset not found: missing",
			requestPresetId: "missing",
		},
		{
			args: ["operations", "sample", "--json"],
			errorIncludes: "Unknown operations action",
		},
		{
			args: ["operations", "kinds", "bogus", "--json"],
			errorIncludes: "expected monitor, logs, or process",
			requestKind: "bogus",
			requestPresetId: null,
		},
		// The two `kinds` failures echo `request.kind` differently, which is easy to
		// get wrong in docs: an unknown kind echoes the rejected input, but a
		// surplus argument echoes the kind that was accepted before it.
		{
			args: ["operations", "kinds", "monitor", "extra", "--json"],
			errorIncludes: "Unexpected argument after kind",
			requestKind: "monitor",
			requestPresetId: null,
		},
		{
			args: [
				"operations",
				"save",
				"UPPER",
				"monitor",
				"--confirm",
				"save operation preset UPPER",
				"--json",
			],
			errorIncludes: 'pass --confirm "save operation preset upper"',
			// Deliberately the raw input rather than `upper`: the catch block echoes
			// the id as typed, while the expected phrase uses the normalized form. A
			// consumer that correlates a failure by `presetId` sees the raw spelling.
			requestPresetId: "UPPER",
		},
		{
			args: [
				"operations",
				"save",
				".leading-dot",
				"monitor",
				"--confirm",
				"save operation preset .leading-dot",
				"--json",
			],
			errorIncludes: "Invalid operation preset id",
			requestPresetId: ".leading-dot",
		},
	];

	for (const {
		args,
		errorIncludes,
		requestKind,
		requestPresetId,
	} of failureCases) {
		const result = await runPicos([...args]);
		assert.equal(result.exitCode, 1, args.join(" "));
		assert.equal(result.stderr, "");
		const document = parseSingleJson(result.stdout, "operations failure");
		assert.equal(document.command, "operations");
		assert.equal(document.status, "failed");
		assert.equal(document.error?.code, "PICOS_LOCAL_INSPECTOR_FAILED");
		// The action is the one request field every case shares. The unknown-action
		// case supplies no id, so `presetId` is absent from its document; the other
		// echoed fields are pinned per case instead of uniformly.
		assert.equal(document.request?.operation, args[1], args.join(" "));
		assert.ok(
			document.error?.message?.includes(errorIncludes),
			`${args.join(" ")} -> ${document.error?.message}`,
		);
		if (requestKind !== undefined) {
			assert.equal(document.request?.kind, requestKind, args.join(" "));
		}
		if (requestPresetId !== undefined) {
			assert.equal(document.request?.presetId, requestPresetId, args.join(" "));
		}
	}

	const unchanged = assertCompleted(
		await runPicos(["operations", "list", "--json"]),
		"operations",
	);
	assert.equal(unchanged.data?.totalCount, 3);

	const removed = assertCompleted(
		await runPicos([
			"operations",
			"remove",
			"self",
			"--confirm",
			confirmations.remove.replace("<id>", "self"),
			"--json",
		]),
		"operations",
	);
	assert.equal(removed.data?.totalCount, 2);

	console.log(
		"Automation presets integration complete: published contract, filtered kind lookup, monitor/logs/process save-run contracts, and 8 guarded failures verified",
	);
} finally {
	await rm(tempRoot, { recursive: true, force: true });
}

function requireContractOption(
	fields: Array<{ name: string; option: string }>,
	name: string,
): string {
	const option = fields.find((field) => field.name === name)?.option;
	if (!option) {
		throw new Error(`published contract is missing the ${name} option`);
	}
	return option;
}

function assertCompleted(
	result: CommandResult,
	command: string,
): AutomationDocument {
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
			env: environment,
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
			`picos automation process exceeded ${PROCESS_TIMEOUT_MS}ms: ${args.join(" ")}`,
		);
	}
	const [stdout, stderr, exitCode] = completed;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

function parseSingleJson(stdout: string, label: string): AutomationDocument {
	assert.ok(stdout.startsWith("{"), `${label} did not start with JSON`);
	assert.ok(stdout.endsWith("}"), `${label} returned truncated JSON`);
	return JSON.parse(stdout) as AutomationDocument;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
