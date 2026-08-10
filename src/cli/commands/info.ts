import { getNetworkSummary } from "../../core/network";
import { formatDeveloperPluginSnapshotRows } from "../../core/plugins";
import { formatUptime, getSystemSummary } from "../../core/system";
import { createSystemInventory } from "../../core/systemInventory";
import type { SystemInventory } from "../../core/types";
import {
	assertLocalJsonOptions,
	formatInfoJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
	sanitizeLocalInspectorText,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export function formatFullInfo(inventory: SystemInventory): string {
	const storageLines = inventory.storage.length
		? inventory.storage.map(
				(volume) =>
					`  ${volume.mount}: ${volume.available ?? "-"} free / ${volume.size ?? "-"}`,
			)
		: ["  - none detected"];
	const processLines = inventory.processes.length
		? inventory.processes.map(
				(process) => `  ${process.pid}: ${process.command}`,
			)
		: ["  - none detected"];
	const networkGroupLines = inventory.network.networkGroups.length
		? inventory.network.networkGroups.map(
				(group) =>
					`  ${group.label}: ${group.interfaces.join(", ") || "-"} (${group.addresses.join(", ") || "-"})`,
			)
		: ["  - no network groups detected"];
	const interfaceLines = inventory.network.interfaces.length
		? inventory.network.interfaces.map(
				(item) =>
					`  ${item.name} ${item.kind} ${item.status} ${item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "-"} mtu=${item.mtu ?? "-"} rx=${item.rxBytes ?? "-"} tx=${item.txBytes ?? "-"} mac=${item.mac ?? "-"}`,
			)
		: ["  - none detected"];
	const sourceLines = (inventory.sources ?? []).map(
		(source) =>
			`  ${source.key}: supported=${source.supported} success=${source.success ?? "-"} exit=${source.exitCode ?? "-"} truncated=${source.truncated}`,
	);
	const pluginLines = inventory.plugins.length
		? inventory.plugins
				.flatMap(formatDeveloperPluginSnapshotRows)
				.map(sanitizeLocalInspectorText)
		: ["  - none detected"];

	const lines = [
		"picos info --full",
		"",
		"System",
		`  Host:      ${inventory.system.hostname}`,
		`  Platform:  ${inventory.system.platform} ${inventory.system.arch}`,
		`  Release:   ${inventory.system.release}`,
		`  Uptime:    ${formatUptime(inventory.system.uptimeSeconds)}`,
		"",
		"Hardware",
		`  CPU:       ${inventory.hardware.cpuModel}`,
		`  Cores:     ${inventory.hardware.cpuCount}`,
		`  Memory:    ${inventory.hardware.freeMemoryBytes}/${inventory.hardware.totalMemoryBytes} bytes free`,
		"",
		"Storage",
		...storageLines,
		"",
		"Processes",
		...processLines,
		"",
		"Network",
		`  Status:    ${inventory.network.status}`,
		`  DNS:       ${inventory.network.dnsServers.join(", ") || "-"}`,
		"  Groups:",
		...networkGroupLines,
		"  Interfaces:",
		...interfaceLines,
		"",
		"Permissions",
		`  User:      ${inventory.permission.user}`,
		`  Level:     ${inventory.permission.detail}`,
		"",
		"Runtime",
		`  picos:     ${inventory.runtime.picosVersion}`,
		`  Node:      ${inventory.runtime.nodeVersion}`,
		`  Bun:       ${inventory.runtime.bunVersion}`,
		`  Config:    ${inventory.runtime.configPath}`,
		"",
		"Plugins",
		...pluginLines,
	];
	if (sourceLines.length > 0) {
		lines.push("", "Sources", ...sourceLines);
	}

	return lines.join("\n");
}

export async function infoCommand(
	options: { full?: boolean; json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		if (options.full) {
			const inventory = await createSystemInventory();
			if (json) {
				await writeCliOutput(formatInfoJson({ scope: "full", inventory }));
			} else {
				console.log(formatFullInfo(inventory));
			}
			return;
		}

		const system = getSystemSummary();
		const network = await getNetworkSummary();
		if (json) {
			await writeCliOutput(
				formatInfoJson({ scope: "summary", system, network }),
			);
			return;
		}

		console.log("picos info");
		console.log("");
		console.log(`Host:      ${system.hostname}`);
		console.log(`Platform:  ${system.platform} ${system.arch}`);
		console.log(`Release:   ${system.release}`);
		console.log(`Status:    ${network.status}`);
		console.log(`Gateway:   ${network.gateway ?? "-"}`);
		console.log(
			`DNS:       ${network.dnsServers.length ? network.dnsServers.join(", ") : "-"}`,
		);
		console.log(`Public IP: ${network.publicIp ?? "-"}`);
		console.log("");
		console.log("Interfaces:");

		if (network.interfaces.length === 0) {
			console.log("  - none detected");
			return;
		}

		for (const item of network.interfaces) {
			console.log(
				`  - ${item.name}: ${item.kind} ${item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "disconnected"} mtu=${item.mtu ?? "-"} rx=${item.rxBytes ?? "-"} tx=${item.txBytes ?? "-"}`,
			);
		}
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("info", caught, {
				request: { scope: options.full ? "full" : "summary" },
			});
		}
		throw caught;
	}
}
