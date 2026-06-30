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
