import { getServers } from "node:dns";
import { lookup } from "node:dns/promises";
import { hostname, networkInterfaces, platform } from "node:os";
import * as linux from "../adapters/linux";
import * as macos from "../adapters/macos";
import * as windows from "../adapters/windows";
import { safeExec } from "../utils/safeExec";
import type {
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

	return {
		status: primaryInterface ? "online" : "offline",
		host: options.host ?? hostname(),
		platform: options.platform ?? platform(),
		interfaces: summaries,
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

	return {
		name,
		status: ipv4 || ipv6 ? "connected" : "disconnected",
		ipv4: ipv4?.address,
		ipv6: ipv6?.address,
		mac: ipv4?.mac ?? ipv6?.mac,
	};
}
