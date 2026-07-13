import { isIP } from "node:net";
import type { NetworkInterfaceSummary, SupportedPlatform } from "./types";

export type DnsServerProposalStatus = "ready" | "invalid";

export type DnsServerProposalTarget = {
	scope: "system" | "interface";
	name: string;
	label: string;
	platform?: SupportedPlatform;
	status?: NetworkInterfaceSummary["status"];
	kind?: NetworkInterfaceSummary["kind"];
	ipv4?: string;
	ipv6?: string;
	primary: boolean;
};

export type DnsServerProposal = {
	actionId: "dns.servers.set";
	status: DnsServerProposalStatus;
	risk: "write";
	privilege: "admin";
	enabled: false;
	confirmationPhrase: "set dns servers";
	currentServers: string[];
	proposedServers: string[];
	invalidServers: string[];
	addedServers: string[];
	removedServers: string[];
	rawInput: string;
	target: DnsServerProposalTarget;
	preflight: string[];
};

export function createDnsServerProposal(
	input: string,
	currentServers: string[] = [],
	target: DnsServerProposalTarget = createDnsServerProposalTarget(),
): DnsServerProposal {
	const proposedServers = normalizeDnsServerList(input);
	const invalidServers = proposedServers.filter((server) => isIP(server) === 0);
	const current = normalizeDnsServerList(currentServers.join(" "));
	const addedServers = proposedServers.filter(
		(server) => !current.includes(server),
	);
	const removedServers = current.filter(
		(server) => !proposedServers.includes(server),
	);
	const status: DnsServerProposalStatus =
		proposedServers.length > 0 && invalidServers.length === 0
			? "ready"
			: "invalid";

	return {
		actionId: "dns.servers.set",
		status,
		risk: "write",
		privilege: "admin",
		enabled: false,
		confirmationPhrase: "set dns servers",
		currentServers: current,
		proposedServers,
		invalidServers,
		addedServers,
		removedServers,
		rawInput: input.trim(),
		target,
		preflight: [
			`scope=${target.scope} target=${target.name}`,
			`targetStatus=${target.status ?? "-"} kind=${target.kind ?? "-"} primary=${target.primary ? "yes" : "no"} platform=${target.platform ?? "-"}`,
			"willModify=dns-server-list persistentConfig=platform-dependent",
			"requires=interface-or-service admin confirmation dry-run-policy",
			"adapterDryRun=proposal-only",
			"rollback=restore previous DNS server list from current snapshot",
		],
	};
}

export function createDnsServerProposalTarget(
	selected?: NetworkInterfaceSummary,
	options: {
		platform?: SupportedPlatform;
		primaryInterfaceName?: string;
	} = {},
): DnsServerProposalTarget {
	if (!selected) {
		return {
			scope: "system",
			name: "system",
			label: "system resolver",
			platform: options.platform,
			primary: false,
		};
	}

	return {
		scope: "interface",
		name: selected.name,
		label: `${selected.name} ${selected.kind}`,
		platform: options.platform,
		status: selected.status,
		kind: selected.kind,
		ipv4: selected.ipv4Cidr ?? selected.ipv4,
		ipv6: selected.ipv6Cidr ?? selected.ipv6,
		primary: selected.name === options.primaryInterfaceName,
	};
}

export function formatDnsServerProposalTargetRows(
	target: DnsServerProposalTarget,
	options: {
		selectedIndex?: number;
		totalTargets?: number;
	} = {},
): string[] {
	return [
		"DNS TARGET",
		`target=${target.label} scope=${target.scope} selected=${formatTargetIndex(options.selectedIndex, options.totalTargets)}`,
		`status=${target.status ?? "-"} kind=${target.kind ?? "-"} primary=${target.primary ? "yes" : "no"} platform=${target.platform ?? "-"}`,
		`address ipv4=${target.ipv4 ?? "-"} ipv6=${target.ipv6 ?? "-"}`,
		"controls=T target S proposal C clear",
	];
}

export function formatDnsServerProposalRows(
	proposal: DnsServerProposal | undefined,
): string[] {
	if (!proposal) {
		return [
			"DNS SERVER PROPOSAL",
			"status=empty action=dns.servers.set locked",
			"controls=S propose servers · example: 1.1.1.1 8.8.8.8",
		];
	}

	return [
		"DNS SERVER PROPOSAL",
		`status=${proposal.status} action=${proposal.actionId} locked enabled=${proposal.enabled}`,
		`proposalTarget=${proposal.target.label} scope=${proposal.target.scope}`,
		`risk=${proposal.risk} privilege=${proposal.privilege} confirm=${proposal.confirmationPhrase}`,
		`current=${formatDnsServerList(proposal.currentServers)}`,
		`proposed=${formatDnsServerList(proposal.proposedServers)}`,
		`added=${formatDnsServerList(proposal.addedServers)} removed=${formatDnsServerList(proposal.removedServers)}`,
		...(proposal.invalidServers.length
			? [`invalid=${proposal.invalidServers.join(",")}`]
			: []),
		"PREFLIGHT",
		...proposal.preflight,
		"execution=disabled no DNS settings will be changed",
	];
}

function normalizeDnsServerList(input: string): string[] {
	const seen = new Set<string>();
	const servers: string[] = [];
	for (const token of input.split(/[,\s]+/)) {
		const server = token.trim();
		if (!server || seen.has(server)) {
			continue;
		}
		seen.add(server);
		servers.push(server);
	}
	return servers;
}

function formatDnsServerList(servers: string[]): string {
	return servers.length ? servers.join(",") : "-";
}

function formatTargetIndex(
	index: number | undefined,
	total: number | undefined,
): string {
	if (index === undefined || !total) {
		return "-";
	}
	return `${index + 1}/${total}`;
}
