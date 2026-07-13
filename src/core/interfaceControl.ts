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

export type InterfaceControlTargetConfidence =
	| "exact"
	| "candidate"
	| "missing";

export type InterfaceControlTarget = {
	kind: "interface" | "adapter" | "network-service" | "unknown";
	label: string;
	confidence: InterfaceControlTargetConfidence;
	source: string;
	commandPreview: string;
	resolution: string;
};

export type InterfaceDryRunPreview = {
	status: "blocked";
	policy: "proposal-only";
	adapterDryRun: "available" | "unavailable" | "unknown";
	willExecute: false;
	commandPreview: string;
	reason: string;
	blockers: string[];
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
	controlTarget?: InterfaceControlTarget;
	dryRunPreview: InterfaceDryRunPreview;
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
		macosServiceNamesByDevice?: Record<string, string>;
	} = {},
): InterfaceStateProposal {
	const desiredStatus: InterfaceStatus =
		action === "enable" ? "connected" : "disconnected";
	const target = selected
		? createInterfaceStateProposalTarget(selected, options)
		: undefined;
	const controlTarget = target
		? createInterfaceControlTarget(target, action, options)
		: undefined;
	const dryRunPreview = createInterfaceDryRunPreview(controlTarget);
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
		controlTarget,
		dryRunPreview,
		currentStatus: selected?.status,
		desiredStatus,
		preflight: [
			`scope=interface target=${target?.name ?? "-"}`,
			`currentStatus=${selected?.status ?? "-"} desiredStatus=${desiredStatus} primary=${target?.primary ? "yes" : "no"} platform=${options.platform ?? "-"}`,
			`willModify=interface-link-state serviceOrAdapter=${controlTarget?.kind ?? "unknown"} controlTarget=${controlTarget?.label ?? "-"}`,
			`targetResolution=${controlTarget?.resolution ?? "select an interface before preview"}`,
			"requires=selected-interface admin confirmation dry-run-policy",
			`adapterDryRun=${dryRunPreview.adapterDryRun} policy=${dryRunPreview.policy} willExecute=${dryRunPreview.willExecute}`,
			`dryRunBlockers=${dryRunPreview.blockers.join(",")}`,
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
		`controlTarget kind=${proposal.controlTarget?.kind ?? "unknown"} label=${proposal.controlTarget?.label ?? "-"} confidence=${proposal.controlTarget?.confidence ?? "missing"} source=${proposal.controlTarget?.source ?? "-"}`,
		`controlCommand=${proposal.controlTarget?.commandPreview ?? "-"}`,
		`dryRun status=${proposal.dryRunPreview.status} policy=${proposal.dryRunPreview.policy} adapterDryRun=${proposal.dryRunPreview.adapterDryRun} willExecute=${proposal.dryRunPreview.willExecute}`,
		`dryRunCommand=${proposal.dryRunPreview.commandPreview}`,
		`dryRunReason=${proposal.dryRunPreview.reason} blockers=${proposal.dryRunPreview.blockers.join(",")}`,
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

export function createInterfaceDryRunPreview(
	controlTarget: InterfaceControlTarget | undefined,
): InterfaceDryRunPreview {
	const adapterDryRun =
		controlTarget?.source === "Get-NetAdapter.Name"
			? "available"
			: controlTarget
				? "unavailable"
				: "unknown";
	const blockers = [
		"interface-execution-disabled",
		"mutation-controls-disabled",
		...(adapterDryRun === "available" ? [] : ["adapter-dry-run-unavailable"]),
	];

	return {
		status: "blocked",
		policy: "proposal-only",
		adapterDryRun,
		willExecute: false,
		commandPreview: controlTarget?.commandPreview ?? "-",
		reason: blockers[0] ?? "blocked",
		blockers,
	};
}

export function createInterfaceControlTarget(
	target: InterfaceStateProposalTarget,
	action: InterfaceStateProposalAction,
	options: {
		platform?: SupportedPlatform;
		macosServiceNamesByDevice?: Record<string, string>;
	} = {},
): InterfaceControlTarget {
	const platform = options.platform ?? target.platform;
	if (platform === "linux") {
		const state = action === "enable" ? "up" : "down";
		return {
			kind: "interface",
			label: target.name,
			confidence: "exact",
			source: "ip-link-name",
			commandPreview: `sudo ip link set ${quoteCommandToken(target.name)} ${state}`,
			resolution: "selected interface name is the ip-link target",
		};
	}

	if (platform === "win32") {
		const verb =
			action === "enable" ? "Enable-NetAdapter" : "Disable-NetAdapter";
		return {
			kind: "adapter",
			label: target.name,
			confidence: "exact",
			source: "Get-NetAdapter.Name",
			commandPreview: `powershell -NoProfile -Command "${verb} -Name '${escapePowerShellSingleQuoted(target.name)}' -Confirm:$false -WhatIf"`,
			resolution: "selected adapter name is the NetAdapter target",
		};
	}

	if (platform === "darwin") {
		const serviceName = options.macosServiceNamesByDevice?.[target.name];
		const label = serviceName ?? `<service-for-${target.name}>`;
		const state = action === "enable" ? "on" : "off";
		return {
			kind: "network-service",
			label,
			confidence: serviceName ? "exact" : "missing",
			source: "networksetup-hardware-port-map",
			commandPreview: `sudo networksetup -setnetworkserviceenabled ${quoteCommandToken(label)} ${state}`,
			resolution: serviceName
				? `mapped BSD device ${target.name} to network service ${serviceName}`
				: `requires networksetup hardware-port lookup for BSD device ${target.name}`,
		};
	}

	return {
		kind: "unknown",
		label: target.name,
		confidence: "missing",
		source: "unsupported-platform",
		commandPreview: "-",
		resolution: `unsupported platform ${platform ?? "-"}`,
	};
}

function quoteCommandToken(value: string): string {
	if (/^[A-Za-z0-9._/@:-]+$/.test(value)) {
		return value;
	}
	return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function escapePowerShellSingleQuoted(value: string): string {
	return value.replace(/'/g, "''");
}
