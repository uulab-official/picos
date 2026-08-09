import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getControlPreviewCommand } from "../core/controlPreview";
import {
	createInterfaceStateProposal,
	formatInterfaceConfirmationAuditMessage,
	formatInterfaceConfirmationResultRows,
	formatInterfaceStateProposalRows,
	type InterfaceConfirmationResult,
	type InterfaceStateProposal,
	type InterfaceStateProposalAction,
	submitInterfaceConfirmation,
} from "../core/interfaceControl";
import type {
	NetworkGroupSummary,
	NetworkInterfaceSummary,
	NetworkSourceOutput,
	NetworkSummary,
	SupportedPlatform,
} from "../core/types";
import { joinPathLike } from "../utils/pathStyle";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import { clampIndex } from "./navigation";

export type InterfaceDetailView =
	| "list"
	| "detail"
	| "stats"
	| "platform"
	| "source";

export type InterfaceSourceHandoffPlan = {
	path: string;
	content: string;
	label: string;
	view: "source";
};

export type InterfacePanelHandoffContext = {
	baseDir: string;
	generatedAt?: Date;
};

export type InterfacePanelNotice = {
	level: "info" | "warn" | "fail";
	message: string;
};

export type SelectedInterface = {
	selected: NetworkInterfaceSummary | undefined;
	selectedIndex: number;
};

export type InterfaceControlUnavailableReason =
	| "no-interface"
	| "selection-out-of-range"
	| "missing-control-target"
	| "unsupported-platform";

export type InterfaceControlIntent =
	| {
			kind: "available";
			keys: ["D", "U", "K", "enter", "C"];
			row: "K locked controls";
			selectedIndex: number;
	  }
	| {
			kind: "unavailable";
			keys: [];
			reason: InterfaceControlUnavailableReason;
			row: string;
			selectedIndex: number;
	  };

export type InterfaceSelectionTransition =
	| {
			kind: "selection";
			selectedIndex: number;
			copyPreview: false;
			proposal: undefined;
			confirmationResult: undefined;
	  }
	| { kind: "no-op"; selectedIndex: number };

export type InterfaceSourceHandoffTransition =
	| { kind: "handoff"; plan: InterfaceSourceHandoffPlan; selectedIndex: number }
	| { kind: "notice"; notice: InterfacePanelNotice };

export type InterfaceConfirmationTransition =
	| {
			kind: "confirmation";
			result: InterfaceConfirmationResult;
			notice: InterfacePanelNotice;
	  }
	| { kind: "notice"; notice: InterfacePanelNotice };

export type InterfacePanelInputDecision =
	| { kind: "no-op"; notice?: InterfacePanelNotice }
	| { kind: "notice"; notice: InterfacePanelNotice }
	| {
			kind: "detail";
			view: InterfaceDetailView;
			copyPreview: false;
			notice: InterfacePanelNotice;
	  }
	| {
			kind: "proposal";
			proposal: InterfaceStateProposal;
			confirmationResult: undefined;
			selectedIndex: number;
			notice: InterfacePanelNotice;
	  }
	| {
			kind: "confirmation";
			prompt: "interface-confirm";
			notice: InterfacePanelNotice;
	  }
	| {
			kind: "clear";
			proposal: undefined;
			confirmationResult: undefined;
			notice: InterfacePanelNotice;
	  }
	| { kind: "copy"; preview: ClipboardPreview }
	| {
			kind: "source-handoff";
			action: "export" | "open";
			baseDir: string;
			plan: InterfaceSourceHandoffPlan;
			selectedIndex: number;
	  };

export function resolveSelectedInterface(
	summary: NetworkSummary | undefined,
	selectedIndex: number,
): SelectedInterface {
	const total = summary?.interfaces.length ?? 0;
	const index = clampIndex(selectedIndex, total);
	return {
		selected: total ? summary?.interfaces[index] : undefined,
		selectedIndex: index,
	};
}

export function getInterfaceControlIntent(input: {
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): InterfaceControlIntent {
	const total = input.summary?.interfaces.length ?? 0;
	if (!input.summary || total <= 0) {
		return createUnavailableInterfaceControlIntent("no-interface");
	}
	if (input.selectedIndex < 0 || input.selectedIndex >= total) {
		return createUnavailableInterfaceControlIntent("selection-out-of-range");
	}
	const selected = input.summary.interfaces[input.selectedIndex];
	const proposal = createInterfaceStateProposal(selected, "disable", {
		platform: input.summary.platform,
		primaryInterfaceName: input.summary.primaryInterface?.name,
		macosServiceNamesByDevice: input.summary.macosServiceNamesByDevice,
	});
	if (proposal.controlTarget?.confidence === "exact") {
		return {
			kind: "available",
			keys: ["D", "U", "K", "enter", "C"],
			row: "K locked controls",
			selectedIndex: input.selectedIndex,
		};
	}
	return createUnavailableInterfaceControlIntent(
		proposal.controlTarget?.source === "unsupported-platform"
			? "unsupported-platform"
			: "missing-control-target",
		input.selectedIndex,
	);
}

export function prepareInterfaceSelectionTransition(input: {
	direction: "up" | "down";
	selectedIndex: number;
	summary: NetworkSummary | undefined;
}): InterfaceSelectionTransition {
	const total = input.summary?.interfaces.length ?? 0;
	if (total <= 0) {
		return { kind: "no-op", selectedIndex: 0 };
	}
	const current = clampIndex(input.selectedIndex, total);
	const selectedIndex =
		input.direction === "down"
			? (current + 1) % total
			: (current - 1 + total) % total;
	if (selectedIndex === input.selectedIndex) {
		return { kind: "no-op", selectedIndex };
	}
	return {
		kind: "selection",
		selectedIndex,
		copyPreview: false,
		proposal: undefined,
		confirmationResult: undefined,
	};
}

export function prepareInterfaceSourceHandoff(input: {
	action: "export" | "open";
	baseDir: string;
	generatedAt?: Date;
	selectedIndex: number;
	summary: NetworkSummary | undefined;
	view: InterfaceDetailView;
}): InterfaceSourceHandoffTransition {
	if (!input.summary) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no interface summary loaded" },
		};
	}
	if (input.view !== "source") {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: `interface source ${input.action} is available from source pane`,
			},
		};
	}
	const selected = resolveSelectedInterface(input.summary, input.selectedIndex);
	if (!selected.selected) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: `no interface source evidence to ${input.action}`,
			},
		};
	}
	const plan = createInterfaceSourceHandoffPlan(input.summary, {
		baseDir: input.baseDir,
		generatedAt: input.generatedAt,
		selected: selected.selected,
	});
	return plan
		? { kind: "handoff", plan, selectedIndex: selected.selectedIndex }
		: {
				kind: "notice",
				notice: {
					level: "warn",
					message: `no interface source evidence to ${input.action}`,
				},
			};
}

export function prepareInterfaceConfirmationTransition(input: {
	proposal: InterfaceStateProposal | undefined;
	receivedPhrase: string;
}): InterfaceConfirmationTransition {
	if (!input.proposal) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "interface confirmation missing proposal",
			},
		};
	}
	const result = submitInterfaceConfirmation(
		input.proposal,
		input.receivedPhrase,
	);
	return {
		kind: "confirmation",
		result,
		notice: {
			level: result.confirmed ? "warn" : "fail",
			message: formatInterfaceConfirmationAuditMessage(result),
		},
	};
}

export function prepareInterfacePanelInput(input: {
	input: string;
	selectedIndex: number;
	summary: NetworkSummary | undefined;
	view: InterfaceDetailView;
	proposal?: InterfaceStateProposal;
	handoff?: InterfacePanelHandoffContext;
	tab?: boolean;
}): InterfacePanelInputDecision {
	if (input.tab) {
		const view = nextInterfaceDetailView(input.view);
		return {
			kind: "detail",
			view,
			copyPreview: false,
			notice: { level: "info", message: `interfaces detail ${view}` },
		};
	}
	if (input.input === "D" || input.input === "U") {
		const action: InterfaceStateProposalAction =
			input.input === "D" ? "disable" : "enable";
		const control = getInterfaceControlIntent(input);
		if (control.kind === "unavailable") {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: `interface ${action} proposal unavailable ${control.reason}`,
				},
			};
		}
		const selected = input.summary?.interfaces[control.selectedIndex];
		const proposal = createInterfaceStateProposal(selected, action, {
			platform: input.summary?.platform,
			primaryInterfaceName: input.summary?.primaryInterface?.name,
			macosServiceNamesByDevice: input.summary?.macosServiceNamesByDevice,
		});
		return {
			kind: "proposal",
			proposal,
			confirmationResult: undefined,
			selectedIndex: control.selectedIndex,
			notice: {
				level: proposal.status === "ready" ? "warn" : "info",
				message: `interface ${action} proposal ${proposal.status} target=${proposal.target?.name ?? "-"}`,
			},
		};
	}
	if (input.input === "K" || input.input === "\r") {
		const control = getInterfaceControlIntent(input);
		if (control.kind === "unavailable") {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: `interface confirmation unavailable ${control.reason}`,
				},
			};
		}
		return input.proposal
			? {
					kind: "confirmation",
					prompt: "interface-confirm",
					notice: {
						level: "warn",
						message: `interface confirmation prompt opened type ${input.proposal.confirmationDraft.phrase}`,
					},
				}
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: "open an interface proposal with D or U first",
					},
				};
	}
	if (input.input === "C") {
		const control = getInterfaceControlIntent(input);
		if (control.kind === "unavailable") {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: `interface controls unavailable ${control.reason}`,
				},
			};
		}
		return {
			kind: "clear",
			proposal: undefined,
			confirmationResult: undefined,
			notice: { level: "info", message: "interface state proposal cleared" },
		};
	}
	if (input.input === "c") {
		if (!input.summary || input.view !== "source") {
			return {
				kind: "notice",
				notice: {
					level: "warn",
					message: "interface source copy is available from source pane",
				},
			};
		}
		const selected = resolveSelectedInterface(
			input.summary,
			input.selectedIndex,
		);
		const preview = selected.selected
			? getInterfaceSourceClipboardPreview(input.summary, selected.selected)
			: undefined;
		return preview
			? { kind: "copy", preview }
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: "no interface source evidence selected",
					},
				};
	}
	if (input.input === "e" || input.input === "o") {
		const action = input.input === "e" ? "export" : "open";
		if (!input.summary) {
			return {
				kind: "no-op",
				notice: { level: "warn", message: "no interface summary loaded" },
			};
		}
		if (input.view !== "source") {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: `interface source ${action} is available from source pane`,
				},
			};
		}
		if (
			!resolveSelectedInterface(input.summary, input.selectedIndex).selected
		) {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: `no interface source evidence to ${action}`,
				},
			};
		}
		if (!input.handoff) {
			return {
				kind: "no-op",
				notice: {
					level: "warn",
					message: "interface source handoff context unavailable",
				},
			};
		}
		const transition = prepareInterfaceSourceHandoff({
			action,
			baseDir: input.handoff.baseDir,
			generatedAt: input.handoff.generatedAt,
			selectedIndex: input.selectedIndex,
			summary: input.summary,
			view: input.view,
		});
		if (transition.kind === "notice") {
			return { kind: "no-op", notice: transition.notice };
		}
		return {
			kind: "source-handoff",
			action,
			baseDir: input.handoff.baseDir,
			plan: transition.plan,
			selectedIndex: transition.selectedIndex,
		};
	}
	return { kind: "no-op" };
}

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
	const current = clampIndex(selectedIndex, total);
	if (direction === "down") {
		return (current + 1) % total;
	}
	return (current - 1 + total) % total;
}

export function formatInterfaceWorkspaceRows(
	summary: NetworkSummary,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		confirmationResult?: InterfaceConfirmationResult;
		selectedIndex?: number;
		stateProposal?: InterfaceStateProposal;
		view?: InterfaceDetailView;
	} = {},
): string[] {
	const view = options.view ?? "list";
	const selection = resolveSelectedInterface(
		summary,
		options.selectedIndex ?? 0,
	);
	const selectedIndex = summary.interfaces.length
		? selection.selectedIndex
		: undefined;
	const selected = selection.selected;
	const control = getInterfaceControlIntent({
		selectedIndex: options.selectedIndex ?? 0,
		summary,
	});
	const header = `SUMMARY interfaces=${summary.interfaces.length} selected=${selected?.name ?? "-"} view=${view}`;

	if (view === "detail") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected, control.row),
			...formatInterfaceDetailRows(summary, selected),
			...formatOptionalInterfaceStateProposalRows(options.stateProposal),
			...formatInterfaceConfirmationResultRows(options.confirmationResult),
		].slice(0, visibleRows);
	}
	if (view === "stats") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected, control.row),
			...formatInterfaceStatsRows(selected),
			...formatOptionalInterfaceStateProposalRows(options.stateProposal),
			...formatInterfaceConfirmationResultRows(options.confirmationResult),
		].slice(0, visibleRows);
	}
	if (view === "platform") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected, control.row),
			...formatInterfacePlatformRows(summary),
			...formatOptionalInterfaceStateProposalRows(options.stateProposal),
			...formatInterfaceConfirmationResultRows(options.confirmationResult),
		].slice(0, visibleRows);
	}
	if (view === "source") {
		return [
			header,
			...formatSelectedInterfaceSummaryRows(summary, selected, control.row),
			...formatInterfaceSourceRows(summary, selected),
			...(options.copyPreview
				? formatInterfaceSourceClipboardPreviewRows(summary, selected)
				: []),
			...formatOptionalInterfaceStateProposalRows(options.stateProposal),
			...formatInterfaceConfirmationResultRows(options.confirmationResult),
		].slice(0, visibleRows);
	}

	return [
		header,
		...formatSelectedInterfaceSummaryRows(summary, selected, control.row),
		...formatInterfaceListRows(summary, selectedIndex),
		...formatOptionalInterfaceStateProposalRows(options.stateProposal),
		...formatInterfaceConfirmationResultRows(options.confirmationResult),
	].slice(0, visibleRows);
}

export function formatSelectedInterfaceSummaryRows(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
	controlRow = "K locked controls",
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
		`SOURCE os=${summary.platform} stats=${platformStatsSource(summary.platform)} actions=R refresh Tab panes ${controlRow}`,
	];
}

function createUnavailableInterfaceControlIntent(
	reason: InterfaceControlUnavailableReason,
	selectedIndex = 0,
): InterfaceControlIntent {
	return {
		kind: "unavailable",
		keys: [],
		reason,
		row: `controls unavailable ${reason}`,
		selectedIndex,
	};
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
		...formatMacosHardwarePortSourceRows(summary),
		`dns=node:dns.getServers servers=${formatDnsCompact(summary.dnsServers)}`,
		...formatInterfaceRawSourceRows(summary.sourceOutputs ?? [], name),
		...formatInterfaceControlPreviewRows(summary.platform),
	];
}

export function getInterfaceSourceClipboardPreview(
	summary: NetworkSummary,
	selected?: NetworkInterfaceSummary,
): ClipboardPreview | undefined {
	const copyText = formatInterfaceSourceEvidenceText(summary, selected);
	if (!copyText) {
		return undefined;
	}
	const selectedName = selected?.name ?? "-";
	return createClipboardPreview({
		source: "interface-source",
		label: `interface source evidence ${selectedName}`,
		copyText,
		details: [
			`selected=${selectedName} platform=${summary.platform}`,
			`sources=${summary.sourceOutputs?.length ?? 0} gateway=${summary.gateway ?? "-"}`,
		],
	});
}

export function createInterfaceSourceHandoffPlan(
	summary: NetworkSummary,
	options: {
		baseDir: string;
		generatedAt?: Date;
		selected?: NetworkInterfaceSummary;
	},
): InterfaceSourceHandoffPlan | undefined {
	const copyText = formatInterfaceSourceEvidenceText(summary, options.selected);
	if (!copyText) {
		return undefined;
	}
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	const selectedName = options.selected?.name ?? "-";
	const commands =
		summary.sourceOutputs
			?.map((source) => [source.command, ...source.args].join(" "))
			.join("; ") ?? "-";
	return {
		path: joinPathLike(
			options.baseDir,
			"interfaces",
			`picos-interfaces-source-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		label: `interface source evidence ${selectedName}`,
		view: "source",
		content: [
			"# picos interface source handoff",
			`generatedAt=${iso}`,
			"kind=interfaces",
			"view=source",
			`label=interface source evidence ${selectedName}`,
			`command=${commands}`,
			`selected=${selectedName}`,
			`platform=${summary.platform}`,
			"",
			"```txt",
			copyText,
			"```",
			"",
		].join("\n"),
	};
}

export async function writeInterfaceSourceHandoffPlan(
	plan: InterfaceSourceHandoffPlan,
): Promise<InterfaceSourceHandoffPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

function formatOptionalInterfaceStateProposalRows(
	proposal: InterfaceStateProposal | undefined,
): string[] {
	return proposal ? formatInterfaceStateProposalRows(proposal) : [];
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
		`SOURCES node:os.networkInterfaces, ${platformStatsSource(summary.platform)}, route/get gateway${summary.platform === "darwin" ? ", networksetup hardware ports" : ""}, dns.getServers`,
		`PRIMARY ${summary.primaryInterface?.name ?? "-"}`,
		...formatMacosServiceMapRows(summary),
		...summary.networkGroups.flatMap(formatNetworkGroupRows),
	];
}

function formatMacosHardwarePortSourceRows(summary: NetworkSummary): string[] {
	if (summary.platform !== "darwin") {
		return [];
	}
	return [
		formatSourceCommandRow("hardwarePorts", "networksetup", {
			command: ["networksetup", "-listallhardwareports"],
		}),
		`serviceMap=${formatMacosServiceMap(summary.macosServiceNamesByDevice)}`,
	];
}

function formatMacosServiceMapRows(summary: NetworkSummary): string[] {
	if (summary.platform !== "darwin") {
		return [];
	}
	return [
		`MACOS SERVICE MAP ${formatMacosServiceMap(summary.macosServiceNamesByDevice)}`,
	];
}

function formatMacosServiceMap(
	servicesByDevice: Record<string, string> | undefined,
): string {
	const entries = Object.entries(servicesByDevice ?? {}).sort(
		([left], [right]) =>
			left.localeCompare(right, undefined, {
				numeric: true,
				sensitivity: "base",
			}),
	);
	if (entries.length === 0) {
		return "unresolved";
	}
	return entries.map(([device, service]) => `${device}:${service}`).join(", ");
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

function formatInterfaceRawSourceRows(
	sources: NetworkSourceOutput[],
	selectedName: string,
): string[] {
	if (sources.length === 0) {
		return [`RAW RETAINED sources=0 selected=${selectedName}`];
	}
	return [
		`RAW RETAINED sources=${sources.length} selected=${selectedName}`,
		...sources.flatMap((source) => {
			const command = [source.command, ...source.args].join(" ");
			const status = source.success ? "ok" : "fail";
			const truncated = source.truncated ? " truncated=yes" : "";
			const firstLine =
				source.output.split(/\r?\n/).find((line) => line.length > 0) ??
				"(no output)";
			return [
				`raw[${source.key}] ${command} ${status} lines=${source.lineCount} shown=${source.shownLines}${truncated}`,
				`  ${clip(firstLine, 76)}`,
			];
		}),
	];
}

function formatInterfaceSourceClipboardPreviewRows(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
): string[] {
	const preview = getInterfaceSourceClipboardPreview(summary, selected);
	return preview
		? formatClipboardPreviewRows(preview, {
				maxCopyLineLength: 76,
				maxCopyLines: 6,
			})
		: [];
}

function formatInterfaceSourceEvidenceText(
	summary: NetworkSummary,
	selected: NetworkInterfaceSummary | undefined,
): string | undefined {
	const sources = summary.sourceOutputs ?? [];
	if (sources.length === 0) {
		return undefined;
	}
	const selectedName = selected?.name ?? "-";
	return [
		"picos interfaces source",
		"",
		"[Summary]",
		`Selected: ${selectedName}`,
		`Platform: ${summary.platform}`,
		`Gateway: ${summary.gateway ?? "-"}`,
		"",
		...sources.flatMap((source, index) => [
			`${index === 0 ? "" : "\n"}[${source.key}] ${[source.command, ...source.args].join(" ")} ${source.success ? "ok" : "fail"} lines=${source.lineCount} shown=${source.shownLines}${source.truncated ? " truncated=yes" : ""}`,
			source.output,
		]),
	]
		.join("\n")
		.trim();
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
