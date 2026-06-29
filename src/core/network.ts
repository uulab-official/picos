import { getServers } from "node:dns";
import { lookup } from "node:dns/promises";
import { hostname, networkInterfaces, platform } from "node:os";
import * as linux from "../adapters/linux";
import * as macos from "../adapters/macos";
import * as windows from "../adapters/windows";
import { safeExec } from "../utils/safeExec";
import type {
	NetworkGroupKind,
	NetworkGroupSummary,
	NetworkInterfaceKind,
	NetworkInterfaceMap,
	NetworkInterfaceSummary,
	NetworkSummary,
	SupportedPlatform,
} from "./types";

export function summarizeNetworkInterfaces(
	interfaces: NetworkInterfaceMap,
	dnsServers: string[],
	options: {
		host?: string;
		platform?: SupportedPlatform;
		gateway?: string;
		publicIp?: string;
	} = {},
): NetworkSummary {
	const summaries = Object.entries(interfaces)
		.map(([name, addresses]) => summarizeInterface(name, addresses ?? []))
		.filter((summary): summary is NetworkInterfaceSummary => Boolean(summary));
	const primaryInterface =
		summaries.find((summary) => summary.ipv4) ?? summaries[0];
	const networkGroups = summarizeNetworkGroups(summaries);

	return {
		status: primaryInterface ? "online" : "offline",
		host: options.host ?? hostname(),
		platform: options.platform ?? platform(),
		interfaces: summaries,
		networkGroups,
		primaryInterface,
		gateway: options.gateway,
		dnsServers,
		publicIp: options.publicIp,
	};
}

export async function getNetworkSummary(): Promise<NetworkSummary> {
	const gateway = await getDefaultGateway();
	const publicIp = await lookupPublicIp();

	return summarizeNetworkInterfaces(networkInterfaces(), getServers(), {
		gateway,
		publicIp,
	});
}

export async function getDefaultGateway(
	targetPlatform: SupportedPlatform = process.platform,
): Promise<string | undefined> {
	const adapter =
		targetPlatform === "win32"
			? windows
			: targetPlatform === "linux"
				? linux
				: macos;
	const { command, args } = adapter.gatewayCommand();
	const result = await safeExec(command, args, { timeoutMs: 5000 });

	if (!result.success) {
		return undefined;
	}

	return adapter.parseGateway(result.stdout);
}

export async function lookupPublicIp(): Promise<string | undefined> {
	try {
		const response = await fetch("https://api.ipify.org?format=json", {
			signal: AbortSignal.timeout(3000),
		});
		if (!response.ok) {
			return undefined;
		}
		const body = (await response.json()) as { ip?: string };
		return body.ip;
	} catch {
		return undefined;
	}
}

export async function canResolve(host = "example.com"): Promise<boolean> {
	try {
		await lookup(host);
		return true;
	} catch {
		return false;
	}
}

export async function canFetchInternet(): Promise<boolean> {
	try {
		const response = await fetch("https://example.com", {
			method: "HEAD",
			signal: AbortSignal.timeout(5000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

function summarizeInterface(
	name: string,
	addresses: NonNullable<NetworkInterfaceMap[string]>,
): NetworkInterfaceSummary | undefined {
	const external = addresses.filter((address) => !address.internal);
	if (external.length === 0) {
		return undefined;
	}

	const ipv4 = external.find((address) => address.family === "IPv4");
	const ipv6 = external.find((address) => address.family === "IPv6");
	const kind = inferInterfaceKind(
		name,
		addresses.some((address) => address.internal),
	);

	return {
		name,
		status: ipv4 || ipv6 ? "connected" : "disconnected",
		kind,
		ipv4: ipv4?.address,
		ipv6: ipv6?.address,
		ipv4Cidr: ipv4?.cidr ?? undefined,
		ipv6Cidr: ipv6?.cidr ?? undefined,
		netmask: ipv4?.netmask ?? ipv6?.netmask,
		mac: ipv4?.mac ?? ipv6?.mac,
	};
}

export function inferInterfaceKind(
	name: string,
	internal: boolean,
): NetworkInterfaceKind {
	const normalized = name.toLowerCase();
	if (internal || normalized.startsWith("lo")) {
		return "loopback";
	}
	if (
		normalized.startsWith("utun") ||
		normalized.startsWith("tun") ||
		normalized.startsWith("tap") ||
		normalized.startsWith("ppp") ||
		normalized.includes("vpn") ||
		normalized.includes("wireguard") ||
		normalized.startsWith("wg")
	) {
		return "vpn";
	}
	if (
		normalized.startsWith("docker") ||
		normalized.startsWith("veth") ||
		normalized.startsWith("br-") ||
		normalized.includes("container")
	) {
		return "container";
	}
	if (normalized.startsWith("bridge") || normalized.startsWith("br")) {
		return "bridge";
	}
	if (
		normalized.startsWith("en") ||
		normalized.startsWith("eth") ||
		normalized.startsWith("wlan") ||
		normalized.startsWith("wi-fi") ||
		normalized.startsWith("wifi")
	) {
		return "wifiOrEthernet";
	}
	return "unknown";
}

export function classifyNetworkAddress(
	address: string | undefined,
	interfaceKind: NetworkInterfaceKind,
): NetworkGroupKind {
	if (!address) {
		return "unassigned";
	}
	if (interfaceKind === "loopback" || isLoopbackAddress(address)) {
		return "loopback";
	}
	if (interfaceKind === "vpn") {
		return "vpn";
	}
	if (interfaceKind === "container" || interfaceKind === "bridge") {
		return "container";
	}
	if (isLinkLocalAddress(address)) {
		return "linkLocal";
	}
	if (isPrivateIpv4(address)) {
		return "lan";
	}
	return "public";
}

function summarizeNetworkGroups(
	interfaces: NetworkInterfaceSummary[],
): NetworkGroupSummary[] {
	const groups = new Map<NetworkGroupKind, NetworkGroupSummary>();

	for (const item of interfaces) {
		for (const address of [item.ipv4, item.ipv6]) {
			const kind = classifyNetworkAddress(address, item.kind);
			if (kind === "unassigned") {
				continue;
			}
			const group = groups.get(kind) ?? {
				kind,
				label: networkGroupLabel(kind),
				interfaces: [],
				addresses: [],
			};
			if (!group.interfaces.includes(item.name)) {
				group.interfaces.push(item.name);
			}
			if (address && !group.addresses.includes(address)) {
				group.addresses.push(address);
			}
			groups.set(kind, group);
		}
	}

	return [...groups.values()];
}

function networkGroupLabel(kind: NetworkGroupKind): string {
	const labels: Record<NetworkGroupKind, string> = {
		lan: "LAN",
		loopback: "Loopback",
		vpn: "VPN",
		container: "Container",
		linkLocal: "Link-local",
		public: "Public",
		unassigned: "Unassigned",
	};
	return labels[kind];
}

function isPrivateIpv4(address: string): boolean {
	const parts = address.split(".").map((part) => Number(part));
	if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
		return false;
	}
	const [first, second] = parts;
	return (
		first === 10 ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}

function isLoopbackAddress(address: string): boolean {
	return address.startsWith("127.") || address === "::1";
}

function isLinkLocalAddress(address: string): boolean {
	return (
		address.startsWith("169.254.") || address.toLowerCase().startsWith("fe80:")
	);
}
