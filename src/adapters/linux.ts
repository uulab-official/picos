import type { ActionPreviewCommand } from "../core/actions";
import type { NetworkInterfaceStatsMap, PingCommand } from "../core/types";

export function clipboardWriteCommand(): {
	command: string;
	args: string[];
	stdin: true;
} {
	return { command: "xclip", args: ["-selection", "clipboard"], stdin: true };
}

export function gatewayCommand(): { command: string; args: string[] } {
	return { command: "ip", args: ["route", "show", "default"] };
}

export function parseGateway(stdout: string): string | undefined {
	const match = stdout.match(/\bvia\s+(\S+)/);
	return match?.[1];
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-c", String(count), host] };
}

export function interfaceStatsCommand(): { command: string; args: string[] } {
	return { command: "ip", args: ["-s", "link"] };
}

export function osLogCommand(limit = 50): {
	source: string;
	command: string;
	args: string[];
	note: string;
} {
	return {
		source: "systemd-journal",
		command: "journalctl",
		args: ["-n", String(limit), "--no-pager", "-o", "short-iso"],
		note: "recent systemd journal entries",
	};
}

export function controlPreviewCommand(
	actionId: string,
): ActionPreviewCommand | undefined {
	if (actionId === "dns.flush") {
		return {
			adapter: "linux",
			command: "sudo",
			args: ["resolvectl", "flush-caches"],
			note: "flush local systemd-resolved DNS cache",
		};
	}
	if (actionId === "interface.disable") {
		return {
			adapter: "linux",
			command: "sudo",
			args: ["ip", "link", "set", "<interface>", "down"],
			note: "disable a network interface",
		};
	}
	if (actionId === "route.add") {
		return {
			adapter: "linux",
			command: "sudo",
			args: ["ip", "route", "add", "<destination>", "via", "<gateway>"],
			note: "add a route table entry",
		};
	}
	if (actionId === "service.restart") {
		return {
			adapter: "linux",
			command: "sudo",
			args: ["systemctl", "restart", "<service>"],
			note: "restart a systemd service",
		};
	}
	if (actionId === "process.terminate") {
		return {
			adapter: "linux",
			command: "kill",
			args: ["-TERM", "<pid>"],
			note: "terminate a selected user-owned process",
		};
	}
	return undefined;
}

export function parseInterfaceStats(stdout: string): NetworkInterfaceStatsMap {
	const stats: NetworkInterfaceStatsMap = {};
	let currentName: string | undefined;
	let awaiting: "rx" | "tx" | undefined;

	for (const line of stdout.split("\n")) {
		const header = line.match(/^\d+:\s+([^:]+):.*\bmtu\s+(\d+)/);
		if (header) {
			currentName = header[1]?.split("@")[0];
			const mtu = parsePositiveInteger(header[2]);
			if (currentName) {
				stats[currentName] = compactStats({ ...stats[currentName], mtu });
			}
			awaiting = undefined;
			continue;
		}

		const trimmed = line.trim();
		if (!currentName || !trimmed) {
			continue;
		}
		if (trimmed.startsWith("RX:")) {
			awaiting = "rx";
			continue;
		}
		if (trimmed.startsWith("TX:")) {
			awaiting = "tx";
			continue;
		}
		if (!awaiting) {
			continue;
		}

		const values = trimmed.split(/\s+/);
		const bytes = parsePositiveInteger(values[0]);
		const packets = parsePositiveInteger(values[1]);
		stats[currentName] = compactStats({
			...stats[currentName],
			...(awaiting === "rx"
				? { rxBytes: bytes, rxPackets: packets }
				: { txBytes: bytes, txPackets: packets }),
		});
		awaiting = undefined;
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
