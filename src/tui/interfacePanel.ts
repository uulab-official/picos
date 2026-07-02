import { getControlPreviewCommand } from "../core/controlPreview";
import type {
	NetworkGroupSummary,
	NetworkInterfaceSummary,
	NetworkSummary,
	SupportedPlatform,
} from "../core/types";

export type InterfaceDetailView =
	| "list"
	| "detail"
	| "stats"
	| "platform"
	| "source";

export function nextInterfaceDetailView(
	view: InterfaceDetailView,
): InterfaceDetailView {
	if (view === "list") {
		return "detail";
	}
	if (view === "detail") {
		return "stats";
	}
	if (view === "stats") {
		return "platform";
	}
	if (view === "platform") {
		return "source";
	}
	return "list";
}

export function getNextInterfaceIndex(
	selectedIndex: number,
	total: number,
	direction: "up" | "down",
): number {
	if (total <= 0) {
		return 0;
	}
	const current = Math.min(Math.max(selectedIndex, 0), total - 1);
	if (direction === "down") {
		return (current + 1) % total;
	}
	return (current - 1 + total) % total;
}

export function formatInterfaceWorkspaceRows(
	summary: NetworkSummary,
	visibleRows: number,
	options: {
		selectedIndex?: number;
		view?: InterfaceDetailView;
	} = {},
): string[] {
	const view = options.view ?? "list";
	const selectedIndex = getSelectedIndex(
		summary.interfaces.length,
		options.selectedIndex,
	);
	const selected =
		selectedIndex === undefined ? undefined : summary.interfaces[selectedIndex];
	const header = `SUMMARY interfaces=${summary.interfaces.length} selected=${selected?.name ?? "-"} view=${view}`;

	if (view === "detail") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected),
			...formatInterfaceDetailRows(summary, selected),
		].slice(0, visibleRows);
	}
	if (view === "stats") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected),
			...formatInterfaceStatsRows(selected),
		].slice(0, visibleRows);
	}
	if (view === "platform") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected),
			...formatInterfacePlatformRows(summary),
		].slice(0, visibleRows);
	}
	if (view === "source") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected),
			...formatInterfaceSourceRows(summary, selected),
		].slice(0, visibleRows);
	}

	return [
		header,
		...formatSelectedInterfaceSummaryRows(summary, selected),
		...formatInterfaceListRows(summary, selectedIndex),
	].slice(0, visibleRows);
}

export function formatSelectedInterfaceSummaryRows(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
): string[] {
	if (!selected) {
		return ["SELECTED none"];
	}
	const group = getSelectedInterfaceGroup(summary.networkGroups, selected.name);
	const primary =
		summary.primaryInterface?.name === selected.name ? "yes" : "no";
	const status = selected.status === "connected" ? "up" : "down";
	return [
		`SELECTED ${selected.name} ${status} ${selected.kind} group=${group?.label ?? "-"} primary=${primary}`,
		`ADDR ipv4=${selected.ipv4Cidr ?? selected.ipv4 ?? "-"} ipv6=${selected.ipv6Cidr ?? selected.ipv6 ?? "-"} mac=${selected.mac ?? "-"} netmask=${selected.netmask ?? "-"}`,
		`LINK mtu=${selected.mtu ?? "-"} rx=${formatTraffic(selected.rxBytes, selected.rxPackets)} tx=${formatTraffic(selected.txBytes, selected.txPackets)}`,
		`ROUTE gateway=${summary.gateway ?? "-"} dns=${formatDnsCompact(summary.dnsServers)} public=${summary.publicIp ?? "-"}`,
		`SOURCE os=${summary.platform} stats=${platformStatsSource(summary.platform)} actions=R refresh Tab panes K locked controls`,
	];
}

export function formatInterfaceSourceRows(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
): string[] {
	const name = selected?.name ?? "-";
	return [
		`SOURCE RAW ${name}`,
		`inventory=node:os.networkInterfaces interface=${name}`,
		formatSourceCommandRow("stats", platformStatsSource(summary.platform), {
			command: platformStatsCommand(summary.platform),
		}),
		formatSourceCommandRow("gateway", platformGatewaySource(summary.platform), {
			command: platformGatewayCommand(summary.platform),
		}),
		`dns=node:dns.getServers servers=${formatDnsCompact(summary.dnsServers)}`,
		...formatInterfaceControlPreviewRows(summary.platform),
	];
}

function getSelectedIndex(
	total: number,
	selectedIndex: number | undefined,
): number | undefined {
	if (total <= 0) {
		return undefined;
	}
	return Math.min(Math.max(selectedIndex ?? 0, 0), total - 1);
}

function formatInterfaceListRows(
	summary: NetworkSummary,
	selectedIndex: number | undefined,
): string[] {
	const rows = summary.interfaces.map((item, index) => {
		const marker = index === selectedIndex ? ">" : " ";
		const address =
			item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "-";
		return `${marker} ${clip(item.name, 8).padEnd(8)} ${clip(item.kind, 14).padEnd(14)} ${item.status === "connected" ? "up  " : "down"} ${clip(address, 20).padEnd(20)} mtu=${item.mtu ?? "-"}`;
	});
	return [
		...rows,
		`GROUPS ${formatGroupSummary(summary.networkGroups)}`,
		`gateway=${summary.gateway ?? "-"} dns=${summary.dnsServers.join(", ") || "-"} public=${summary.publicIp ?? "-"}`,
	];
}

function formatInterfaceDetailRows(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
): string[] {
	if (!selected) {
		return ["DETAIL no interface selected"];
	}
	return [
		`DETAIL ${selected.name} status=${selected.status} kind=${selected.kind}`,
		`IPv4 ${selected.ipv4Cidr ?? selected.ipv4 ?? "-"} netmask=${selected.netmask ?? "-"}`,
		`IPv6 ${selected.ipv6Cidr ?? selected.ipv6 ?? "-"}`,
		`MAC ${selected.mac ?? "-"} MTU ${selected.mtu ?? "-"}`,
		`Gateway ${summary.gateway ?? "-"}`,
		`DNS ${summary.dnsServers.join(", ") || "-"}`,
	];
}

function formatInterfaceStatsRows(
	selected: NetworkInterfaceSummary | undefined,
): string[] {
	if (!selected) {
		return ["STATS no interface selected"];
	}
	return [
		`STATS ${selected.name}`,
		`rxBytes=${formatCompactBytes(selected.rxBytes)} txBytes=${formatCompactBytes(selected.txBytes)}`,
		`rxPackets=${selected.rxPackets ?? "-"} txPackets=${selected.txPackets ?? "-"}`,
		`mtu=${selected.mtu ?? "-"} status=${selected.status}`,
	];
}

function formatInterfacePlatformRows(summary: NetworkSummary): string[] {
	return [
		`PLATFORM ${summary.platform}`,
		`SOURCES node:os.networkInterfaces, ${platformStatsSource(summary.platform)}, route/get gateway, dns.getServers`,
		`PRIMARY ${summary.primaryInterface?.name ?? "-"}`,
		...summary.networkGroups.flatMap(formatNetworkGroupRows),
	];
}

function formatNetworkGroupRows(group: NetworkGroupSummary): string[] {
	return [
		`GROUP ${group.label} scope=${group.scope} interfaces=${group.interfaces.join(",") || "-"} addresses=${group.addresses.join(",") || "-"}`,
		`  hint=${group.hint}`,
	];
}

function getSelectedInterfaceGroup(
	groups: NetworkGroupSummary[],
	interfaceName: string,
): NetworkGroupSummary | undefined {
	return groups.find((group) => group.interfaces.includes(interfaceName));
}

function formatGroupSummary(groups: NetworkGroupSummary[]): string {
	if (groups.length === 0) {
		return "-";
	}
	return groups
		.map((group) => `${group.label}:${group.interfaces.join(",") || "-"}`)
		.join(" | ");
}

function platformStatsSource(platform: SupportedPlatform): string {
	if (platform === "linux") {
		return "ip -s link";
	}
	if (platform === "win32") {
		return "Get-NetAdapterStatistics";
	}
	return "netstat -ib";
}

function platformStatsCommand(platform: SupportedPlatform): string[] {
	if (platform === "linux") {
		return ["ip", "-s", "link"];
	}
	if (platform === "win32") {
		return [
			"powershell",
			"-NoProfile",
			"-Command",
			"Get-NetAdapterStatistics | ConvertTo-Json",
		];
	}
	return ["netstat", "-ibn"];
}

function platformGatewaySource(platform: SupportedPlatform): string {
	if (platform === "linux") {
		return "ip-route";
	}
	if (platform === "win32") {
		return "Get-NetRoute";
	}
	return "route/get";
}

function platformGatewayCommand(platform: SupportedPlatform): string[] {
	if (platform === "linux") {
		return ["ip", "route", "show", "default"];
	}
	if (platform === "win32") {
		return [
			"powershell",
			"-NoProfile",
			"-Command",
			"Get-NetRoute -DestinationPrefix 0.0.0.0/0 | ConvertTo-Json",
		];
	}
	return ["route", "-n", "get", "default"];
}

function formatSourceCommandRow(
	label: string,
	source: string,
	preview: { command: string[] },
): string {
	return `${label}=${source} command="${preview.command.join(" ")}"`;
}

function formatInterfaceControlPreviewRows(
	platform: SupportedPlatform,
): string[] {
	const preview = getControlPreviewCommand("interface.disable", platform);
	if (!preview) {
		return [
			"CONTROL interface.disable risk=write privilege=admin status=locked confirmation=disable interface",
			"adapter=- command=-",
		];
	}
	return [
		"CONTROL interface.disable risk=write privilege=admin status=locked confirmation=disable interface",
		`adapter=${preview.adapter} command="${preview.command} ${preview.args.join(" ")}"`,
		`note=${preview.note}`,
	];
}

function formatCompactBytes(value?: number): string {
	if (value === undefined) {
		return "-";
	}
	const units = ["B", "KB", "MB", "GB", "TB"];
	let amount = value;
	let unit = units[0];
	for (const nextUnit of units) {
		unit = nextUnit;
		if (amount < 1000 || nextUnit === units[units.length - 1]) {
			break;
		}
		amount /= 1000;
	}
	return `${amount.toFixed(unit === "B" ? 0 : 1)}${unit}`;
}

function formatTraffic(bytes?: number, packets?: number): string {
	return `${formatCompactBytes(bytes)}/${packets ?? "-"}pk`;
}

function formatDnsCompact(servers: string[]): string {
	return servers.join(",") || "-";
}

function clip(value: string, width: number): string {
	if (value.length <= width) {
		return value;
	}
	return `${value.slice(0, Math.max(0, width - 3))}...`;
}
