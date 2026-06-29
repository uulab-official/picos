import { getNetworkSummary } from "../../core/network";
import { formatUptime, getSystemSummary } from "../../core/system";
import { createSystemInventory } from "../../core/systemInventory";
import type { SystemInventory } from "../../core/types";

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
					`  ${item.name} ${item.kind} ${item.status} ${item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "-"} mac=${item.mac ?? "-"}`,
			)
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
	];

	return lines.join("\n");
}

export async function infoCommand(
	options: { full?: boolean } = {},
): Promise<void> {
	if (options.full) {
		console.log(formatFullInfo(await createSystemInventory()));
		return;
	}

	const system = getSystemSummary();
	const network = await getNetworkSummary();

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
			`  - ${item.name}: ${item.kind} ${item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "disconnected"}`,
		);
	}
}
