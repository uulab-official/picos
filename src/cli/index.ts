import cac from "cac";
import { render } from "ink";
import React from "react";
import { VERSION } from "../core/version";
import { App } from "../tui/App";
import { configCommand } from "./commands/config";
import { connectCommand, telnetCommand } from "./commands/connect";
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
import { handoffsCommand } from "./commands/handoffs";
import { infoCommand } from "./commands/info";
import { logsCommand } from "./commands/logs";
import { monitorCommand } from "./commands/monitor";
import { pingCommand } from "./commands/ping";
import { portsCommand } from "./commands/ports";
import { processCommand } from "./commands/process";
import { releaseHealthCommand } from "./commands/releaseHealth";
import {
	remoteCommand,
	remotesCommand,
	reportRemoteCliParseFailure,
} from "./commands/remotes";
import { routeCommand, routesCommand } from "./commands/routes";
import { toolsCommand } from "./commands/tools";
import { updateCommand } from "./commands/update";
import { ReportedCliError } from "./errors";
import { reportLocalInspectorCliParseFailure } from "./localInspectorOutput";

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
	if (argv.length === 0) {
		render(React.createElement(App));
		return;
	}

	const cli = createCli();

	try {
		cli.parse(["node", "picos", ...argv], { run: false });
	} catch (caught) {
		if (reportRemoteCliParseFailure(argv, caught)) {
			throw new ReportedCliError(
				caught instanceof Error ? caught.message : String(caught),
				{ cause: caught },
			);
		}
		if (reportLocalInspectorCliParseFailure(argv, caught)) {
			throw new ReportedCliError(
				caught instanceof Error ? caught.message : String(caught),
				{ cause: caught },
			);
		}
		throw caught;
	}
	if (!cli.matchedCommand) {
		cli.outputHelp();
		process.exitCode = 1;
		return;
	}

	try {
		await cli.runMatchedCommand();
	} catch (caught) {
		if (caught instanceof ReportedCliError) throw caught;
		if (reportRemoteCliParseFailure(argv, caught)) {
			throw new ReportedCliError(
				caught instanceof Error ? caught.message : String(caught),
				{ cause: caught },
			);
		}
		if (reportLocalInspectorCliParseFailure(argv, caught)) {
			throw new ReportedCliError(
				caught instanceof Error ? caught.message : String(caught),
				{ cause: caught },
			);
		}
		throw caught;
	}
}

export function createCli(): ReturnType<typeof cac> {
	const cli = cac("picos");

	cli.command("ui", "Open the picos TUI dashboard").action(() => {
		render(React.createElement(App));
	});

	cli
		.command("info", "Print network and system summary")
		.option("--full", "Print full OS inventory")
		.option("--json", "Emit one structured local inventory result")
		.action(infoCommand);
	cli
		.command("monitor", "Print a live system monitor snapshot")
		.option("--json", "Emit one structured system-monitor result")
		.action(monitorCommand);
	cli
		.command("logs", "Read recent OS log entries")
		.option("--limit <n>", "Maximum number of log entries")
		.option("--filter <query>", "Filter log rows by level, index, or text")
		.option("--level <level>", "Filter by severity: all, warn, fail, or info")
		.option("--json", "Emit one structured OS-log result")
		.action(logsCommand);
	cli
		.command("doctor", "Run network diagnostics")
		.option("--json", "Emit one structured diagnostic result")
		.action(doctorCommand);
	cli.command("pwd", "Print current picos file root").action(pwdCommand);
	cli
		.command("locations", "List system file locations")
		.action(locationsCommand);
	cli
		.command("remotes", "List configured remote file profiles")
		.action(remotesCommand);
	cli
		.command("remote <id>", "Inspect or read from a remote file profile")
		.option("--list <path>", "List a remote directory after guarded connect")
		.option("--read <path>", "Read a remote text file after guarded connect")
		.option("--known-hosts <path>", "Use a local OpenSSH known_hosts file")
		.option("--fingerprint <sha256>", "Select one matching known_hosts key")
		.option("--confirm <phrase>", "Exact phrase: connect remote <id>")
		.option("--timeout <ms>", "Connection and operation timeout")
		.option("--max-bytes <n>", "Maximum remote file bytes to read")
		.option("--json", "Emit one structured JSON result for list/read")
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
		.command("telnet <host> <port>", "Alias for a safe TCP connect check")
		.option("--timeout <ms>", "TCP connect timeout in milliseconds")
		.action(telnetCommand);
	cli
		.command("routes", "Inspect local route table")
		.option("--raw", "Print raw route command output")
		.option("--json", "Emit one structured route-table result")
		.option(
			"--filter <query>",
			"Filter routes by destination, gateway, interface, family, metric, protocol, or flags",
		)
		.option(
			"--sort <key>",
			"Sort routes by default, destination, gateway, interface, family, metric, or prefix with - for descending",
		)
		.action(routesCommand);
	cli
		.command("route <destination>", "Inspect route path to a destination")
		.option("--json", "Emit one structured route-path result")
		.action(routeCommand);
	cli
		.command("connections", "List active network connections")
		.option("--raw", "Print raw connections command output")
		.option("--json", "Emit one structured connections result")
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
		.option("--json", "Emit one structured listening-ports result")
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
		.option("--json", "Emit one structured process-inspection result")
		.action(processCommand);
	cli
		.command("tools [name] [...args]", "Run lazyifconfig-style Tools Hub")
		.option("--timeout <ms>", "Tool timeout in milliseconds")
		.option("--raw", "Print raw tool output")
		.option("--json", "Emit one structured tool result")
		.action(toolsCommand);
	cli
		.command("update", "Check npm for a newer picos version")
		.action(updateCommand);
	cli
		.command("handoffs", "List route and endpoint handoff files")
		.option("--archive <path>", "Archive a picos route/endpoint handoff file")
		.action(handoffsCommand);
	cli
		.command("release-health", "Check release automation health")
		.action(releaseHealthCommand);
	cli
		.command("dns [action]", "Show DNS information")
		.option("--json", "Emit one structured resolver result")
		.action(dnsCommand);
	cli
		.command("config [action] [key] [value]", "Show or update config")
		.action(configCommand);
	cli.command("version", "Print picos version").action(() => {
		console.log(VERSION);
	});

	cli.help();
	cli.version(VERSION);

	return cli;
}
