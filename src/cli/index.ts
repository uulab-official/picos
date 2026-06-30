import cac from "cac";
import { render } from "ink";
import React from "react";
import { VERSION } from "../core/version";
import { App } from "../tui/App";
import { configCommand } from "./commands/config";
import { connectCommand } from "./commands/connect";
import { connectionsCommand } from "./commands/connections";
import { dnsCommand } from "./commands/dns";
import { doctorCommand } from "./commands/doctor";
import {
	catCommand,
	dirCommand,
	drivesCommand,
	locationsCommand,
	lsCommand,
	pwdCommand,
	typeCommand,
} from "./commands/files";
import { infoCommand } from "./commands/info";
import { pingCommand } from "./commands/ping";
import { portsCommand } from "./commands/ports";
import { processCommand } from "./commands/process";
import { releaseHealthCommand } from "./commands/releaseHealth";
import { remoteCommand, remotesCommand } from "./commands/remotes";
import { routeCommand, routesCommand } from "./commands/routes";
import { toolsCommand } from "./commands/tools";
import { updateCommand } from "./commands/update";

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
	cli.command("pwd", "Print current picos file root").action(pwdCommand);
	cli
		.command("locations", "List system file locations")
		.action(locationsCommand);
	cli
		.command("remotes", "List configured remote file profiles")
		.action(remotesCommand);
	cli
		.command("remote <id>", "Inspect a remote file profile provider")
		.action(remoteCommand);
	cli
		.command("drives", "List system drives and file locations")
		.action(drivesCommand);
	cli.command("dir [path]", "List local files in DOS style").action(dirCommand);
	cli.command("ls [path]", "List local files").action(lsCommand);
	cli.command("type <path>", "Print a local text file").action(typeCommand);
	cli.command("cat <path>", "Print a local text file").action(catCommand);
	cli
		.command("ping <host>", "Run a ping test")
		.option("--count <n>", "Number of echo requests")
		.option("--timeout <ms>", "Ping timeout in milliseconds")
		.action(pingCommand);
	cli
		.command("connect <host> <port>", "Run a safe TCP connect check")
		.option("--timeout <ms>", "TCP connect timeout in milliseconds")
		.action(connectCommand);
	cli
		.command("routes", "Inspect local route table")
		.option("--raw", "Print raw route command output")
		.option(
			"--sort <key>",
			"Sort routes by default, destination, gateway, interface, family, metric, or prefix with - for descending",
		)
		.action(routesCommand);
	cli
		.command("route <destination>", "Inspect route path to a destination")
		.action(routeCommand);
	cli
		.command("connections", "List active network connections")
		.option("--raw", "Print raw connections command output")
		.option(
			"--filter <query>",
			"Filter connections by address, port, state, protocol, or PID",
		)
		.option(
			"--sort <key>",
			"Sort connections by protocol, local, localPort, remote, remotePort, state, pid, or prefix with - for descending",
		)
		.action(connectionsCommand);
	cli
		.command("ports", "List listening TCP ports")
		.option("--raw", "Print raw ports command output")
		.option(
			"--filter <query>",
			"Filter ports by address, port, process, PID, user, or protocol",
		)
		.option(
			"--sort <key>",
			"Sort ports by protocol, address, port, process, pid, user, or prefix with - for descending",
		)
		.action(portsCommand);
	cli
		.command("process <pid>", "Inspect one local process by PID")
		.option("--files", "Include cwd and open file snapshot where available")
		.action(processCommand);
	cli
		.command("tools [name] [...args]", "Run lazyifconfig-style Tools Hub")
		.option("--timeout <ms>", "Tool timeout in milliseconds")
		.option("--raw", "Print raw tool output")
		.action(toolsCommand);
	cli
		.command("update", "Check npm for a newer picos version")
		.action(updateCommand);
	cli
		.command("release-health", "Check release automation health")
		.action(releaseHealthCommand);
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
