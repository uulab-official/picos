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
	NetworkInterfaceStatsMap,
	NetworkInterfaceSummary,
	NetworkSourceOutput,
	NetworkSourceOutputKey,
	NetworkSummary,
	SafeExecResult,
	SupportedPlatform,
} from "./types";

const DEFAULT_NETWORK_SOURCE_OUTPUT_LINES = 12;

export function summarizeNetworkInterfaces(
	interfaces: NetworkInterfaceMap,
	dnsServers: string[],
	options: {
		host?: string;
		platform?: SupportedPlatform;
		gateway?: string;
		publicIp?: string;
		interfaceStats?: NetworkInterfaceStatsMap;
		sourceOutputs?: NetworkSourceOutput[];
		macosServiceNamesByDevice?: Record<string, string>;
	} = {},
): NetworkSummary {
	const summaries = Object.entries(interfaces)
		.map(([name, addresses]) =>
			summarizeInterface(name, addresses ?? [], options.interfaceStats?.[name]),
		)
		.filter((summary): summary is NetworkInterfaceSummary => Boolean(summary));
	const sortedSummaries = sortNetworkInterfaces(summaries);
	const primaryInterface =
		sortedSummaries.find((summary) => summary.ipv4) ?? sortedSummaries[0];
	const networkGroups = summarizeNetworkGroups(sortedSummaries);

	return {
		status: primaryInterface ? "online" : "offline",
		host: options.host ?? hostname(),
		platform: options.platform ?? platform(),
		interfaces: sortedSummaries,
		networkGroups,
		primaryInterface,
		gateway: options.gateway,
		dnsServers,
		publicIp: options.publicIp,
		sourceOutputs: options.sourceOutputs,
		macosServiceNamesByDevice: options.macosServiceNamesByDevice,
	};
}

export function sortNetworkInterfaces(
	interfaces: NetworkInterfaceSummary[],
): NetworkInterfaceSummary[] {
	return [...interfaces].sort(
		(left, right) =>
			interfaceKindRank(left.kind) - interfaceKindRank(right.kind) ||
			left.name.localeCompare(right.name, undefined, {
				numeric: true,
				sensitivity: "base",
			}),
	);
}

export async function getNetworkSummary(): Promise<NetworkSummary> {
	const targetPlatform = process.platform;
	const interfaces = networkInterfaces();
	const [gatewayResult, publicIp, statsResult, hardwarePortsResult] =
		await Promise.all([
			getDefaultGatewayWithSource(targetPlatform),
			lookupPublicIp(),
			getInterfaceStatsWithSource(targetPlatform),
			getMacosHardwarePortsWithSource(targetPlatform),
		]);

	return summarizeNetworkInterfaces(interfaces, getServers(), {
		gateway: gatewayResult.gateway,
		publicIp,
		interfaceStats: statsResult.stats,
		sourceOutputs: [
			createNetworkInventorySourceOutput(interfaces),
			statsResult.sourceOutput,
			gatewayResult.sourceOutput,
			...(hardwarePortsResult?.sourceOutput
				? [hardwarePortsResult.sourceOutput]
				: []),
		],
		macosServiceNamesByDevice: hardwarePortsResult?.servicesByDevice,
	});
}

function interfaceKindRank(kind: NetworkInterfaceKind): number {
	const ranks: Record<NetworkInterfaceKind, number> = {
		wifiOrEthernet: 0,
		vpn: 1,
		bridge: 2,
		container: 3,
		linkLocal: 4,
		loopback: 5,
		unknown: 6,
	};
	return ranks[kind];
}

export async function getInterfaceStats(
	targetPlatform: SupportedPlatform = process.platform,
): Promise<NetworkInterfaceStatsMap> {
	return (await getInterfaceStatsWithSource(targetPlatform)).stats;
}

async function getInterfaceStatsWithSource(
	targetPlatform: SupportedPlatform,
): Promise<{
	stats: NetworkInterfaceStatsMap;
	sourceOutput: NetworkSourceOutput;
}> {
	const adapter =
		targetPlatform === "win32"
			? windows
			: targetPlatform === "linux"
				? linux
				: macos;
	const { command, args } = adapter.interfaceStatsCommand();
	const result = await safeExec(command, args, { timeoutMs: 5000 });
	const sourceOutput = createNetworkSourceOutput(
		"interface-stats",
		"Interface stats",
		command,
		args,
		result,
	);

	if (!result.success) {
		return { stats: {}, sourceOutput };
	}

	return { stats: adapter.parseInterfaceStats(result.stdout), sourceOutput };
}

export async function getDefaultGateway(
	targetPlatform: SupportedPlatform = process.platform,
): Promise<string | undefined> {
	return (await getDefaultGatewayWithSource(targetPlatform)).gateway;
}

async function getDefaultGatewayWithSource(
	targetPlatform: SupportedPlatform,
): Promise<{
	gateway: string | undefined;
	sourceOutput: NetworkSourceOutput;
}> {
	const adapter =
		targetPlatform === "win32"
			? windows
			: targetPlatform === "linux"
				? linux
				: macos;
	const { command, args } = adapter.gatewayCommand();
	const result = await safeExec(command, args, { timeoutMs: 5000 });
	const sourceOutput = createNetworkSourceOutput(
		"gateway",
		"Default gateway",
		command,
		args,
		result,
	);

	if (!result.success) {
		return { gateway: undefined, sourceOutput };
	}

	return { gateway: adapter.parseGateway(result.stdout), sourceOutput };
}

async function getMacosHardwarePortsWithSource(
	targetPlatform: SupportedPlatform,
): Promise<
	| {
			servicesByDevice: Record<string, string>;
			sourceOutput: NetworkSourceOutput;
	  }
	| undefined
> {
	if (targetPlatform !== "darwin") {
		return undefined;
	}
	const { command, args } = macos.hardwarePortsCommand();
	const result = await safeExec(command, args, { timeoutMs: 5000 });
	const sourceOutput = createNetworkSourceOutput(
		"hardware-ports",
		"macOS hardware ports",
		command,
		args,
		result,
	);

	return {
		servicesByDevice: result.success
			? macos.parseHardwarePorts(result.stdout)
			: {},
		sourceOutput,
	};
}

export function createNetworkInventorySourceOutput(
	interfaces: NetworkInterfaceMap,
	options: { maxLines?: number } = {},
): NetworkSourceOutput {
	const rows = Object.entries(interfaces)
		.sort(([left], [right]) =>
			left.localeCompare(right, undefined, {
				numeric: true,
				sensitivity: "base",
			}),
		)
		.flatMap(([name, addresses]) =>
			(addresses ?? []).map((address) =>
				[
					name,
					address.family,
					address.cidr ?? address.address,
					address.internal ? "internal" : "external",
					`mac=${address.mac}`,
				].join(" "),
			),
		);

	return createNetworkSourceOutput(
		"interface-inventory",
		"Interface inventory",
		"node:os",
		["networkInterfaces()"],
		{
			command: "node:os",
			args: ["networkInterfaces()"],
			stdout: rows.length > 0 ? rows.join("\n") : "no interfaces",
			stderr: "",
			exitCode: 0,
			success: true,
		},
		options,
	);
}

export function createNetworkSourceOutput(
	key: NetworkSourceOutputKey,
	label: string,
	command: string,
	args: string[],
	result: SafeExecResult,
	options: { maxLines?: number } = {},
): NetworkSourceOutput {
	const maxLines = Math.max(
		1,
		options.maxLines ?? DEFAULT_NETWORK_SOURCE_OUTPUT_LINES,
	);
	const rawOutput = [
		result.stdout,
		result.stderr ? `stderr: ${result.stderr}` : "",
	]
		.filter(Boolean)
		.join("\n");
	const lines = (rawOutput || "(no output)")
		.split(/\r?\n/)
		.filter((line) => line.length > 0);
	const visible = lines.slice(0, maxLines);

	return {
		key,
		label,
		command,
		args,
		output: visible.join("\n"),
		lineCount: lines.length,
		shownLines: visible.length,
		truncated: lines.length > visible.length,
		success: result.success,
		exitCode: result.exitCode,
	};
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
	stats: NetworkInterfaceStatsMap[string] = {},
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
		...stats,
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
				scope: networkGroupScope(kind),
				hint: networkGroupHint(kind),
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

function networkGroupScope(kind: NetworkGroupKind): string {
	const scopes: Record<NetworkGroupKind, string> = {
		lan: "private",
		loopback: "host",
		vpn: "tunnel",
		container: "virtual",
		linkLocal: "local",
		public: "internet",
		unassigned: "none",
	};
	return scopes[kind];
}

function networkGroupHint(kind: NetworkGroupKind): string {
	const hints: Record<NetworkGroupKind, string> = {
		lan: "RFC1918 private network for local devices",
		loopback: "local host-only traffic",
		vpn: "tunnel interface likely carries private or corporate routes",
		container: "local virtualization or container bridge network",
		linkLocal: "self-assigned local segment without routed internet",
		public: "publicly routable address exposed on this host",
		unassigned: "no routable address assigned",
	};
	return hints[kind];
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
