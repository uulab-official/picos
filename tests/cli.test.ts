import { describe, expect, test } from "bun:test";
import { createCli, runCli } from "../src/cli";
import { createGuardedRemoteFileRequest } from "../src/cli/commands/remotes";
import { isReportedCliError } from "../src/cli/errors";

describe("CLI command registry", () => {
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
		]) {
			const command = cli.commands.find((candidate) => candidate.name === name);
			expect(
				command?.options.some((option) => option.name === "json"),
			).toBeTrue();
		}
	});

	test("reports invalid operations JSON requests as one failure document", async () => {
		for (const args of [
			["logs", "--limit", "0", "--json"],
			["logs", "--level", "debug", "--json"],
			["process", "0", "--json"],
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
