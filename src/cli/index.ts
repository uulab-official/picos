import cac from "cac";
import { render } from "ink";
import React from "react";
import { VERSION } from "../core/version";
import { App } from "../tui/App";
import { configCommand } from "./commands/config";
import { connectCommand } from "./commands/connect";
import { dnsCommand } from "./commands/dns";
import { doctorCommand } from "./commands/doctor";
import { infoCommand } from "./commands/info";
import { pingCommand } from "./commands/ping";

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
	if (argv.length === 0) {
		render(React.createElement(App));
		return;
	}

	const cli = cac("picos");

	cli.command("ui", "Open the picos TUI dashboard").action(() => {
		render(React.createElement(App));
	});

	cli
		.command("info", "Print network and system summary")
		.option("--full", "Print full OS inventory")
		.action(infoCommand);
	cli.command("doctor", "Run network diagnostics").action(doctorCommand);
	cli
		.command("ping <host>", "Run a ping test")
		.option("--count <n>", "Number of echo requests")
		.option("--timeout <ms>", "Ping timeout in milliseconds")
		.action(pingCommand);
	cli
		.command("connect <host> <port>", "Run a safe TCP connect check")
		.option("--timeout <ms>", "TCP connect timeout in milliseconds")
		.action(connectCommand);
	cli.command("dns [action]", "Show DNS information").action(dnsCommand);
	cli
		.command("config [action] [key] [value]", "Show or update config")
		.action(configCommand);
	cli.command("version", "Print picos version").action(() => {
		console.log(VERSION);
	});

	cli.help();
	cli.version(VERSION);

	cli.parse(["node", "picos", ...argv], { run: false });
	if (!cli.matchedCommand) {
		cli.outputHelp();
		process.exitCode = 1;
		return;
	}

	await cli.runMatchedCommand();
}
