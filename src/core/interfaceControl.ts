import type {
	InterfaceStatus,
	NetworkInterfaceSummary,
	SupportedPlatform,
} from "./types";

export type InterfaceStateProposalAction = "enable" | "disable";
export type InterfaceStateProposalStatus = "ready" | "noop" | "invalid";

export type InterfaceStateProposalTarget = {
	name: string;
	status?: InterfaceStatus;
	kind?: NetworkInterfaceSummary["kind"];
	ipv4?: string;
	ipv6?: string;
	mac?: string;
	mtu?: number;
	primary: boolean;
	platform?: SupportedPlatform;
};

export type InterfaceStateProposal = {
	actionId: "interface.enable" | "interface.disable";
	action: InterfaceStateProposalAction;
	status: InterfaceStateProposalStatus;
	risk: "write";
	privilege: "admin";
	enabled: false;
	confirmationPhrase: "enable interface" | "disable interface";
	target?: InterfaceStateProposalTarget;
	currentStatus?: InterfaceStatus;
	desiredStatus: InterfaceStatus;
	preflight: string[];
};

export function createInterfaceStateProposal(
	selected: NetworkInterfaceSummary | undefined,
	action: InterfaceStateProposalAction,
	options: {
		platform?: SupportedPlatform;
		primaryInterfaceName?: string;
	} = {},
): InterfaceStateProposal {
	const desiredStatus: InterfaceStatus =
		action === "enable" ? "connected" : "disconnected";
	const target = selected
		? createInterfaceStateProposalTarget(selected, options)
		: undefined;
	const status: InterfaceStateProposalStatus = !target
		? "invalid"
		: selected?.status === desiredStatus
			? "noop"
			: "ready";

	return {
		actionId: action === "enable" ? "interface.enable" : "interface.disable",
		action,
		status,
		risk: "write",
		privilege: "admin",
		enabled: false,
		confirmationPhrase:
			action === "enable" ? "enable interface" : "disable interface",
		target,
		currentStatus: selected?.status,
		desiredStatus,
		preflight: [
			`scope=interface target=${target?.name ?? "-"}`,
			`currentStatus=${selected?.status ?? "-"} desiredStatus=${desiredStatus} primary=${target?.primary ? "yes" : "no"} platform=${options.platform ?? "-"}`,
			"willModify=interface-link-state serviceOrAdapter=platform-dependent",
			"requires=selected-interface admin confirmation dry-run-policy",
			"adapterDryRun=proposal-only",
			"rollback=restore previous interface state from current snapshot",
		],
	};
}

export function formatInterfaceStateProposalRows(
	proposal: InterfaceStateProposal | undefined,
): string[] {
	if (!proposal) {
		return [
			"INTERFACE STATE PROPOSAL",
			"status=empty action=interface.enable|interface.disable locked",
			"controls=D disable proposal U enable proposal C clear",
		];
	}

	const target = proposal.target;
	return [
		"INTERFACE STATE PROPOSAL",
		`status=${proposal.status} action=${proposal.actionId} locked enabled=${proposal.enabled}`,
		`target=${target?.name ?? "-"} kind=${target?.kind ?? "-"} primary=${target?.primary ? "yes" : "no"} platform=${target?.platform ?? "-"}`,
		`address ipv4=${target?.ipv4 ?? "-"} ipv6=${target?.ipv6 ?? "-"} mac=${target?.mac ?? "-"} mtu=${target?.mtu ?? "-"}`,
		`transition current=${proposal.currentStatus ?? "-"} desired=${proposal.desiredStatus}`,
		`risk=${proposal.risk} privilege=${proposal.privilege} confirm=${proposal.confirmationPhrase}`,
		"PREFLIGHT",
		...proposal.preflight,
		"execution=disabled no interface state will be changed",
	];
}

function createInterfaceStateProposalTarget(
	selected: NetworkInterfaceSummary,
	options: {
		platform?: SupportedPlatform;
		primaryInterfaceName?: string;
	},
): InterfaceStateProposalTarget {
	return {
		name: selected.name,
		status: selected.status,
		kind: selected.kind,
		ipv4: selected.ipv4Cidr ?? selected.ipv4,
		ipv6: selected.ipv6Cidr ?? selected.ipv6,
		mac: selected.mac,
		mtu: selected.mtu,
		primary: selected.name === options.primaryInterfaceName,
		platform: options.platform,
	};
}
