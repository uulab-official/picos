import { describe, expect, test } from "bun:test";
import { createCli } from "../src/cli";
import { createGuardedRemoteFileRequest } from "../src/cli/commands/remotes";

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
});
