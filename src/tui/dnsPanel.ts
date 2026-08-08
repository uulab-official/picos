import {
	createDnsServerProposal,
	createDnsServerProposalTarget,
	type DnsServerProposal,
	type DnsServerProposalTarget,
	formatDnsServerProposalRows,
	formatDnsServerProposalTargetRows,
} from "../core/dnsControl";
import type { NetworkInterfaceSummary, NetworkSummary } from "../core/types";
import { clampIndex } from "./navigation";

export type DnsPanelNotice = {
	level: "info" | "warn" | "fail";
	message: string;
};

export type DnsTargetResolution =
	| {
			kind: "target";
			selected: NetworkInterfaceSummary;
			selectedIndex: number;
			target: DnsServerProposalTarget;
	  }
	| { kind: "unavailable"; selectedIndex: 0 };

export type DnsConfirmationEligibility = {
	eligible: boolean;
	phrase: "set dns servers";
	willExecute: false;
	reason: "dns-execution-disabled";
};

export type DnsServerProposalTransition =
	| {
			kind: "proposal";
			proposal: DnsServerProposal;
			selectedIndex: number;
			confirmation: DnsConfirmationEligibility;
			notice: DnsPanelNotice;
	  }
	| { kind: "no-op"; notice: DnsPanelNotice };

export type DnsPanelInputDecision =
	| { kind: "no-op"; notice?: DnsPanelNotice }
	| { kind: "command"; command: "proposal"; notice: DnsPanelNotice }
	| {
			kind: "selection";
			selectedIndex: number;
			proposal: undefined;
			notice: DnsPanelNotice;
	  }
	| { kind: "clear"; proposal: undefined; notice: DnsPanelNotice };

export function resolveDnsTarget(input: {
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): DnsTargetResolution {
	const total = input.summary?.interfaces.length ?? 0;
	if (!total || !input.summary) {
		return { kind: "unavailable", selectedIndex: 0 };
	}
	const selectedIndex = clampIndex(input.selectedIndex, total);
	const selected = input.summary.interfaces[selectedIndex];
	return {
		kind: "target",
		selected,
		selectedIndex,
		target: createDnsServerProposalTarget(selected, {
			platform: input.summary.platform,
			primaryInterfaceName: input.summary.primaryInterface?.name,
		}),
	};
}

export function prepareDnsServerProposalTransition(input: {
	input: string;
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): DnsServerProposalTransition {
	const resolution = resolveDnsTarget(input);
	if (resolution.kind === "unavailable") {
		return {
			kind: "no-op",
			notice: {
				level: "warn",
				message: "no DNS interface target available for server proposal",
			},
		};
	}
	const proposal = createDnsServerProposal(
		input.input,
		input.summary?.dnsServers ?? [],
		resolution.target,
	);
	return {
		kind: "proposal",
		proposal,
		selectedIndex: resolution.selectedIndex,
		confirmation: {
			eligible: proposal.status === "ready",
			phrase: proposal.confirmationPhrase,
			willExecute: false,
			reason: "dns-execution-disabled",
		},
		notice: {
			level: proposal.status === "ready" ? "warn" : "fail",
			message: `dns server proposal ${proposal.status} target=${proposal.target.name} proposed=${proposal.proposedServers.join(",") || "-"}`,
		},
	};
}

export function prepareDnsPanelInput(input: {
	input: string;
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): DnsPanelInputDecision {
	const resolution = resolveDnsTarget(input);
	if (input.input === "S") {
		return resolution.kind === "target"
			? {
					kind: "command",
					command: "proposal",
					notice: { level: "info", message: "dns server proposal opened" },
				}
			: {
					kind: "no-op",
					notice: {
						level: "warn",
						message: "no DNS interface target available for server proposal",
					},
				};
	}
	if (input.input === "T") {
		if (resolution.kind === "unavailable") {
			return { kind: "no-op" };
		}
		const total = input.summary?.interfaces.length ?? 0;
		const selectedIndex = clampIndex(
			(resolution.selectedIndex + 1) % total,
			total,
		);
		const targetName =
			input.summary?.interfaces[selectedIndex]?.name ?? "system";
		return {
			kind: "selection",
			selectedIndex,
			proposal: undefined,
			notice: { level: "info", message: `dns target ${targetName}` },
		};
	}
	if (input.input === "C") {
		return resolution.kind === "target"
			? {
					kind: "clear",
					proposal: undefined,
					notice: { level: "info", message: "dns server proposal cleared" },
				}
			: { kind: "no-op" };
	}
	return { kind: "no-op" };
}

export function formatDnsPanelWorkspaceRows(input: {
	proposal: DnsServerProposal | undefined;
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): { available: boolean; rows: string[] } {
	const resolution = resolveDnsTarget(input);
	if (resolution.kind === "unavailable") {
		return {
			available: false,
			rows: [
				"DNS TARGET",
				"target=unavailable scope=- selected=-",
				`status=- kind=- primary=no platform=${input.summary?.platform ?? "-"}`,
				"address ipv4=- ipv6=-",
				"controls=none no DNS interface target available",
				"DNS SERVER PROPOSAL",
				"status=unavailable action=dns.servers.set locked",
				"controls=none no DNS interface target available",
			],
		};
	}
	return {
		available: true,
		rows: [
			...formatDnsServerProposalTargetRows(resolution.target, {
				selectedIndex: resolution.selectedIndex,
				totalTargets: input.summary?.interfaces.length,
			}),
			...formatDnsServerProposalRows(input.proposal),
		],
	};
}
