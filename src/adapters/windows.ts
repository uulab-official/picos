import type { ActionPreviewCommand } from "../core/actions";
import type { NetworkInterfaceStatsMap, PingCommand } from "../core/types";

export function clipboardWriteCommand(): {
	command: string;
	args: string[];
	stdin: true;
} {
	return { command: "clip.exe", args: [], stdin: true };
}

export function gatewayCommand(): { command: string; args: string[] } {
	return {
		command: "powershell",
		args: [
			"-NoProfile",
			"-Command",
			"(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop",
		],
	};
}

export function parseGateway(stdout: string): string | undefined {
	return stdout.trim().split(/\s+/).find(Boolean);
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-n", String(count), host] };
}

export function interfaceStatsCommand(): { command: string; args: string[] } {
	return {
		command: "powershell",
		args: [
			"-NoProfile",
			"-Command",
			"$adapters = Get-NetAdapter | ForEach-Object { $s = Get-NetAdapterStatistics -Name $_.Name; [pscustomobject]@{ Name = $_.Name; Mtu = $_.MtuSize; ReceivedBytes = $s.ReceivedBytes; SentBytes = $s.SentBytes; ReceivedUnicastPackets = $s.ReceivedUnicastPackets; SentUnicastPackets = $s.SentUnicastPackets } }; $adapters | ConvertTo-Json",
		],
	};
}

export function controlPreviewCommand(
	actionId: string,
): ActionPreviewCommand | undefined {
	if (actionId === "dns.flush") {
		return {
			adapter: "windows",
			command: "powershell",
			args: ["-NoProfile", "-Command", "Clear-DnsClientCache -WhatIf"],
			note: "flush local DNS resolver cache with WhatIf preview",
			dryRunExecutable: true,
		};
	}
	if (actionId === "interface.disable") {
		return {
			adapter: "windows",
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				"Disable-NetAdapter -Name '<interface>' -Confirm:$false -WhatIf",
			],
			note: "disable a network adapter with WhatIf preview",
			dryRunExecutable: true,
		};
	}
	if (actionId === "route.add") {
		return {
			adapter: "windows",
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				"New-NetRoute -DestinationPrefix '<destination>' -NextHop '<gateway>' -WhatIf",
			],
			note: "add a route table entry with WhatIf preview",
			dryRunExecutable: true,
		};
	}
	if (actionId === "service.restart") {
		return {
			adapter: "windows",
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				"Restart-Service -Name '<service>' -WhatIf",
			],
			note: "restart a Windows service with WhatIf preview",
			dryRunExecutable: true,
		};
	}
	return undefined;
}

export function parseInterfaceStats(stdout: string): NetworkInterfaceStatsMap {
	const jsonStats = parseJsonStats(stdout);
	if (Object.keys(jsonStats).length > 0) {
		return jsonStats;
	}

	const stats: NetworkInterfaceStatsMap = {};
	for (const line of stdout.split("\n")) {
		const trimmed = line.trim();
		if (
			!trimmed ||
			trimmed.startsWith("Name ") ||
			trimmed.startsWith("-") ||
			trimmed.startsWith("{") ||
			trimmed.startsWith("[")
		) {
			continue;
		}

		const parts = trimmed.split(/\s{2,}/);
		if (parts.length < 5) {
			continue;
		}

		const [name, rxBytes, txBytes, rxPackets, txPackets] = parts;
		if (!name) {
			continue;
		}
		stats[name] = compactStats({
			rxBytes: parsePositiveInteger(rxBytes),
			txBytes: parsePositiveInteger(txBytes),
			rxPackets: parsePositiveInteger(rxPackets),
			txPackets: parsePositiveInteger(txPackets),
		});
	}

	return stats;
}

function parseJsonStats(stdout: string): NetworkInterfaceStatsMap {
	try {
		const parsed = JSON.parse(stdout.trim()) as unknown;
		const rows = Array.isArray(parsed) ? parsed : [parsed];
		const stats: NetworkInterfaceStatsMap = {};

		for (const row of rows) {
			if (!row || typeof row !== "object") {
				continue;
			}
			const record = row as Record<string, unknown>;
			const name = typeof record.Name === "string" ? record.Name : undefined;
			if (!name) {
				continue;
			}
			stats[name] = compactStats({
				mtu: numericRecordValue(record.Mtu),
				rxBytes: numericRecordValue(record.ReceivedBytes),
				txBytes: numericRecordValue(record.SentBytes),
				rxPackets: numericRecordValue(record.ReceivedUnicastPackets),
				txPackets: numericRecordValue(record.SentUnicastPackets),
			});
		}

		return stats;
	} catch {
		return {};
	}
}

function numericRecordValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
		return value;
	}
	if (typeof value === "string") {
		return parsePositiveInteger(value);
	}
	return undefined;
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
