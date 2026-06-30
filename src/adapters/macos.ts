import type { ActionPreviewCommand } from "../core/actions";
import type { NetworkInterfaceStatsMap, PingCommand } from "../core/types";

export function clipboardWriteCommand(): {
	command: string;
	args: string[];
	stdin: true;
} {
	return { command: "pbcopy", args: [], stdin: true };
}

export function gatewayCommand(): { command: string; args: string[] } {
	return { command: "route", args: ["-n", "get", "default"] };
}

export function parseGateway(stdout: string): string | undefined {
	const line = stdout
		.split("\n")
		.map((value) => value.trim())
		.find((value) => value.startsWith("gateway:"));
	return line?.split(/\s+/).at(1);
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-c", String(count), host] };
}

export function interfaceStatsCommand(): { command: string; args: string[] } {
	return { command: "netstat", args: ["-ibn"] };
}

export function osLogCommand(): {
	source: string;
	command: string;
	args: string[];
	note: string;
} {
	return {
		source: "macos-unified-log",
		command: "log",
		args: [
			"show",
			"--style",
			"compact",
			"--last",
			"2m",
			"--predicate",
			'process != ""',
		],
		note: "recent unified system log entries",
	};
}

export function controlPreviewCommand(
	actionId: string,
): ActionPreviewCommand | undefined {
	if (actionId === "dns.flush") {
		return {
			adapter: "macos",
			command: "sudo",
			args: ["dscacheutil", "-flushcache"],
			note: "flush local DNS resolver cache",
		};
	}
	if (actionId === "interface.disable") {
		return {
			adapter: "macos",
			command: "sudo",
			args: ["networksetup", "-setnetworkserviceenabled", "<service>", "off"],
			note: "disable a network service",
		};
	}
	if (actionId === "route.add") {
		return {
			adapter: "macos",
			command: "sudo",
			args: ["route", "add", "<destination>", "<gateway>"],
			note: "add a route table entry",
		};
	}
	if (actionId === "service.restart") {
		return {
			adapter: "macos",
			command: "sudo",
			args: ["launchctl", "kickstart", "-k", "system/<service>"],
			note: "restart a launchd service",
		};
	}
	return undefined;
}

export function parseInterfaceStats(stdout: string): NetworkInterfaceStatsMap {
	const stats: NetworkInterfaceStatsMap = {};

	for (const line of stdout.split("\n")) {
		const trimmed = line.trim();
		if (
			!trimmed ||
			trimmed.startsWith("Name ") ||
			trimmed.startsWith("-") ||
			!trimmed.includes("<Link#")
		) {
			continue;
		}

		const parts = trimmed.split(/\s+/);
		const [name, mtuText] = parts;
		if (!name || !mtuText || parts.length < 10) {
			continue;
		}

		const mtu = parsePositiveInteger(mtuText);
		const rxPackets = parsePositiveInteger(parts[4]);
		const rxBytes = parsePositiveInteger(parts[6]);
		const txPackets = parsePositiveInteger(parts[7]);
		const txBytes = parsePositiveInteger(parts[9]);
		stats[name] = compactStats({ mtu, rxPackets, rxBytes, txPackets, txBytes });
	}

	return stats;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
	if (!value || value === "-") {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function compactStats(
	stats: NetworkInterfaceStatsMap[string],
): NetworkInterfaceStatsMap[string] {
	return Object.fromEntries(
		Object.entries(stats).filter(([, value]) => value !== undefined),
	);
}
