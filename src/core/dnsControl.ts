import { isIP } from "node:net";

export type DnsServerProposalStatus = "ready" | "invalid";

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
	preflight: string[];
};

export function createDnsServerProposal(
	input: string,
	currentServers: string[] = [],
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
		preflight: [
			"scope=selected resolver configuration",
			"willModify=dns-server-list persistentConfig=platform-dependent",
			"requires=interface-or-service admin confirmation dry-run-policy",
			"adapterDryRun=proposal-only",
			"rollback=restore previous DNS server list from current snapshot",
		],
	};
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
