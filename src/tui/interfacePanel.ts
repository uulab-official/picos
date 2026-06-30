import type {
	NetworkGroupSummary,
	NetworkInterfaceSummary,
	NetworkSummary,
	SupportedPlatform,
} from "../core/types";

export type InterfaceDetailView = "list" | "detail" | "stats" | "platform";

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
		return [header, ...formatInterfaceDetailRows(summary, selected)].slice(
			0,
			visibleRows,
		);
	}
	if (view === "stats") {
		return [header, ...formatInterfaceStatsRows(selected)].slice(
			0,
			visibleRows,
		);
	}
	if (view === "platform") {
		return [header, ...formatInterfacePlatformRows(summary)].slice(
			0,
			visibleRows,
		);
	}

	return [header, ...formatInterfaceListRows(summary, selectedIndex)].slice(
		0,
		visibleRows,
	);
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
		...summary.networkGroups.map(formatNetworkGroupRow),
	];
}

function formatNetworkGroupRow(group: NetworkGroupSummary): string {
	return `GROUP ${group.label} interfaces=${group.interfaces.join(",") || "-"} addresses=${group.addresses.join(",") || "-"}`;
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

function clip(value: string, width: number): string {
	if (value.length <= width) {
		return value;
	}
	return `${value.slice(0, Math.max(0, width - 3))}...`;
}
