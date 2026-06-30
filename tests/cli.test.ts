import { describe, expect, test } from "bun:test";
import { createCli } from "../src/cli";

describe("CLI command registry", () => {
	test("exposes telnet as a TCP connect reachability alias", () => {
		const cli = createCli();
		const commandNames = cli.commands.map((command) => command.name);

		expect(commandNames).toContain("connect");
		expect(commandNames).toContain("telnet");
		const telnet = cli.commands.find((command) => command.name === "telnet");
		expect(telnet?.rawName).toBe("telnet <host> <port>");
	});
});
