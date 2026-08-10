import { describe, expect, test } from "bun:test";
import { createCli, runCli } from "../src/cli";
import { createGuardedRemoteFileRequest } from "../src/cli/commands/remotes";
import { isReportedCliError } from "../src/cli/errors";

describe("CLI command registry", () => {
	test("registers the optional plugin inspection command with JSON output", () => {
		// Break caught: the plugin automation command is absent, requires an id,
		// or cannot request its one-document JSON representation.
		const cli = createCli();
		const command = cli.commands.find(
			(candidate) => candidate.name === "plugins",
		);

		expect(command?.rawName).toBe("plugins [id]");
		expect(
			command?.options.some((option) => option.name === "json"),
		).toBeTrue();
	});

	test("exposes telnet as a TCP connect reachability alias", () => {
		const cli = createCli();
		const commandNames = cli.commands.map((command) => command.name);

		expect(commandNames).toContain("connect");
		expect(commandNames).toContain("telnet");
		const telnet = cli.commands.find((command) => command.name === "telnet");
		expect(telnet?.rawName).toBe("telnet <host> <port>");
	});

	test("keeps numeric-looking remote paths as strings", () => {
		const cli = createCli();
		const remote = cli.commands.find((command) => command.name === "remote");
		expect(
			remote?.options.find((option) => option.name === "read"),
		).toBeDefined();
		expect(
			remote?.options.find((option) => option.name === "knownHosts"),
		).toBeDefined();
		expect(
			remote?.options.find((option) => option.name === "json"),
		).toBeDefined();
		const parsed = cli.parse(
			[
				"node",
				"picos",
				"remote",
				"prod",
				"--read",
				"2026",
				"--confirm",
				"connect remote prod",
			],
			{ run: false },
		);
		expect(parsed.options.read).toBe(2026);
		expect(
			createGuardedRemoteFileRequest("prod", parsed.options),
		).toMatchObject({ path: "2026", confirm: "connect remote prod" });
	});

	test("registers JSON output on local OS inspectors", () => {
		const cli = createCli();
		for (const name of [
			"info",
			"plugins",
			"routes",
			"route",
			"connections",
			"ports",
			"doctor",
			"dns",
			"tools",
			"monitor",
			"logs",
			"process",
			"operations",
		]) {
			const command = cli.commands.find((candidate) => candidate.name === name);
			expect(
				command?.options.some((option) => option.name === "json"),
			).toBeTrue();
		}
	});

	test("reports unknown plugin JSON requests as one failure document", async () => {
		// Break caught: an unknown plugin can exit without a structured failure or
		// report duplicate JSON documents.
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["plugins", "missing", "--json"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "plugins",
			status: "failed",
			request: { action: "inspect", id: "missing" },
			error: { code: "PICOS_LOCAL_INSPECTOR_FAILED" },
		});
	});

	test("reports malformed JSON before plugins as one failure document", async () => {
		// Break caught: a malformed JSON flag before plugins bypasses the local
		// inspector failure route and prints command help instead.
		const output: string[] = [];
		const stdout: string[] = [];
		const stderr: string[] = [];
		const originalLog = console.log;
		const originalError = console.error;
		const originalStdoutWrite = process.stdout.write;
		const originalStderrWrite = process.stderr.write;
		const originalExitCode = process.exitCode;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		console.error = (value?: unknown) => output.push(String(value));
		process.stdout.write = ((value: string | Uint8Array) => {
			stdout.push(String(value));
			return true;
		}) as typeof process.stdout.write;
		process.stderr.write = ((value: string | Uint8Array) => {
			stderr.push(String(value));
			return true;
		}) as typeof process.stderr.write;
		try {
			await runCli(["--json=maybe", "plugins"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
			console.error = originalError;
			process.stdout.write = originalStdoutWrite;
			process.stderr.write = originalStderrWrite;
			process.exitCode = originalExitCode;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(stdout).toEqual([]);
		expect(stderr).toEqual([]);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "plugins",
			status: "failed",
			error: { code: "PICOS_LOCAL_INSPECTOR_FAILED" },
		});
	});

	test("reports invalid operations JSON requests as one failure document", async () => {
		for (const args of [
			["logs", "--limit", "0", "--json"],
			["logs", "--level", "debug", "--json"],
			["process", "0", "--json"],
			["monitor", "--samples", "61", "--json"],
		] as const) {
			const output: string[] = [];
			const originalLog = console.log;
			let caught: unknown;
			console.log = (value?: unknown) => output.push(String(value));
			try {
				await runCli([...args]);
			} catch (error) {
				caught = error;
			} finally {
				console.log = originalLog;
			}

			expect(isReportedCliError(caught)).toBeTrue();
			expect(output).toHaveLength(1);
			expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
				command: args[0],
				status: "failed",
				error: { code: "PICOS_LOCAL_INSPECTOR_FAILED" },
			});
		}
	});

	test("reports a missing process PID as structured JSON", async () => {
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["--json", "process"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "process",
			status: "failed",
		});
	});

	test("reports diagnostic raw-output conflicts as one JSON failure", async () => {
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["tools", "ping", "example.com", "--raw", "--json"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "tools",
			status: "failed",
			error: { message: "--raw cannot be combined with --json" },
		});
	});

	test("reports local inspector option conflicts as one JSON failure", async () => {
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["routes", "--raw", "--json"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "routes",
			status: "failed",
			error: {
				code: "PICOS_LOCAL_INSPECTOR_FAILED",
				message: "--raw cannot be combined with --json",
			},
		});
	});

	test("reports missing local inspector arguments as one JSON failure", async () => {
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["route", "--json=true"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "route",
			status: "failed",
			error: { code: "PICOS_LOCAL_INSPECTOR_FAILED" },
		});
	});

	test("does not request JSON when the flag is explicitly disabled", async () => {
		for (const jsonFlag of ["--json=false", "--no-json"]) {
			const output: string[] = [];
			const originalLog = console.log;
			let caught: unknown;
			console.log = (value?: unknown) => output.push(String(value));
			try {
				await runCli(["routes", jsonFlag, "--sort", "unsafe"]);
			} catch (error) {
				caught = error;
			} finally {
				console.log = originalLog;
			}

			expect(caught).toBeInstanceOf(Error);
			expect(isReportedCliError(caught)).toBeFalse();
			expect(output).toHaveLength(0);
		}
	});

	test("keeps JSON parser failures structured when the flag precedes the command", async () => {
		const output: string[] = [];
		const originalLog = console.log;
		let caught: unknown;
		console.log = (value?: unknown) => output.push(String(value));
		try {
			await runCli(["--json", "routes", "--sort", "unsafe"]);
		} catch (error) {
			caught = error;
		} finally {
			console.log = originalLog;
		}

		expect(isReportedCliError(caught)).toBeTrue();
		expect(output).toHaveLength(1);
		expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
			command: "routes",
			status: "failed",
		});
	});
});
