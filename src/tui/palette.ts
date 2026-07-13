import type { ActionPreviewPlan, PicosAction } from "../core/actions";
import type { ConsoleAuditExportPlan } from "../core/auditLog";
import type { NetworkInterfaceSummary, SupportedPlatform } from "../core/types";
import type {
	ConfigManagedShelfTarget,
	ConfigWorkspaceItem,
	ConfigWorkspaceItemKey,
} from "./configPanel";
import {
	formatConfigManagedShelfFocusRows,
	formatConfigManagedShelfLandingRows,
	formatConfigRecoveryPaletteRows,
	getConfigManagedShelfActionFocusTarget,
	getConfigRecoveryActionFocusTarget,
} from "./configPanel";
import type { PortProcessControlPreview } from "./endpointPanel";
import { getNextIndex } from "./navigation";
import type {
	StatusActivityCopyIntentTimelineSearch,
	StatusActivityResultTimelineJumpFilter,
	StatusActivityToolsEvidenceSearchRecovery,
} from "./statusActivityQueue";
import type {
	ToolHistoryArchiveRetentionPlan,
	ToolHistoryEvidenceFilter,
	ToolHistoryExportIndexItem,
} from "./toolHistory";
import { createToolRunPlan, getToolRunActionMetadata } from "./toolHistory";

export type CommandPaletteState = {
	active: boolean;
	selectedIndex: number;
	query: string;
};

export function openCommandPalette(): CommandPaletteState {
	return {
		active: true,
		selectedIndex: 0,
		query: "",
	};
}

export function closeCommandPalette(
	state: CommandPaletteState,
): CommandPaletteState {
	return {
		...state,
		active: false,
	};
}

export function moveCommandPalette(
	state: CommandPaletteState,
	total: number,
	direction: "next" | "previous",
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		selectedIndex: getNextIndex(state.selectedIndex, total, direction),
	};
}

export function appendCommandPaletteQuery(
	state: CommandPaletteState,
	input: string,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	const printableInput = input.replace(/[^\x20-\x7e]/g, "");
	if (printableInput.length === 0) {
		return state;
	}

	return {
		...state,
		query: `${state.query}${printableInput}`,
		selectedIndex: 0,
	};
}

export function backspaceCommandPaletteQuery(
	state: CommandPaletteState,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		query: state.query.slice(0, -1),
		selectedIndex: 0,
	};
}

export function getFilteredPaletteActions(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction[] {
	const queryTokens = normalizePaletteSearchText(state.query)
		.split(" ")
		.filter(Boolean);
	if (queryTokens.length === 0) {
		return actions;
	}

	return actions.filter((action) => {
		const haystack = normalizePaletteSearchText(
			[
				action.id,
				action.title,
				action.description,
				action.category,
				action.risk,
				action.privilege,
			].join(" "),
		);
		return queryTokens.every((token) => haystack.includes(token));
	});
}

export function getPaletteAction(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction | undefined {
	if (!state.active) {
		return undefined;
	}

	return getFilteredPaletteActions(actions, state)[state.selectedIndex];
}

export type CommandPalettePreviewContext = {
	controlPreview?: ActionPreviewPlan;
	portProcessPreview?: PortProcessControlPreview;
	toolsEvidenceSearchRecovery?: StatusActivityToolsEvidenceSearchRecovery;
	selectedToolsEvidenceSearchMatchIndex?: number;
	selectedToolExport?: ToolHistoryExportIndexItem;
	selectedToolExportIndex?: number;
	totalToolExports?: number;
	toolExportFilter?: ToolHistoryEvidenceFilter;
	toolExportQuery?: string;
	toolArchiveRetentionPlan?: ToolHistoryArchiveRetentionPlan;
	selectedProcessEvidenceExport?: ConsoleAuditExportPlan;
	selectedProcessEvidenceExportIndex?: number;
	totalProcessEvidenceExports?: number;
	selectedRemoteKnownHostsEvidenceExport?: ConsoleAuditExportPlan;
	selectedRemoteKnownHostsEvidenceExportIndex?: number;
	totalRemoteKnownHostsEvidenceExports?: number;
	selectedStatusActivityResultTimelineJump?: StatusActivityCopyIntentTimelineSearch;
	selectedStatusActivityResultTimelineJumpIndex?: number;
	totalStatusActivityResultTimelineJumps?: number;
	configWorkspaceItems?: ConfigWorkspaceItem[];
	configManagedShelfCounts?: Partial<Record<ConfigManagedShelfTarget, number>>;
	statusActivityResultTimelineJumpFilter?: StatusActivityResultTimelineJumpFilter;
	nextStatusActivityResultTimelineJumpFilter?: StatusActivityResultTimelineJumpFilter;
	statusResultJumpClassFilter?: StatusActivityResultTimelineJumpFilter;
	visibleStatusActivityResultTimelineJumps?: number;
	allStatusActivityResultTimelineJumps?: number;
	selectedInterface?: NetworkInterfaceSummary;
	selectedInterfacePlatform?: SupportedPlatform;
	defaultToolTarget?: string;
	publicIp?: string;
};

export function formatCommandPaletteActionPreviewRows(
	action: PicosAction | undefined,
	context: CommandPalettePreviewContext = {},
): string[] {
	if (!action) {
		return [];
	}
	if (
		action.id !== "status.toolsEvidence.matchOpen" &&
		action.id !== "status.toolsEvidence.matchArchive" &&
		action.id !== "status.toolsEvidence.archive" &&
		action.id !== "status.toolsEvidence.retention" &&
		action.id !== "status.processEvidence.select" &&
		action.id !== "status.processEvidence.open" &&
		action.id !== "status.processEvidence.search" &&
		action.id !== "status.remoteKnownHostsEvidence.select" &&
		action.id !== "status.remoteKnownHostsEvidence.open" &&
		action.id !== "status.remoteKnownHostsEvidence.search" &&
		action.id !== "status.remoteKnownHostsEvidence.copy" &&
		action.id !== "status.remoteKnownHostsEvidence.export" &&
		action.id !== "status.resultJump.select" &&
		action.id !== "status.resultJump.open" &&
		action.id !== "status.resultJump.filter" &&
		action.id !== "config.statusResultJumpClass.focus" &&
		action.id !== "config.safetyPolicy.focus" &&
		action.id !== "config.editorSaveMode.focus" &&
		action.id !== "config.auditRetention.focus" &&
		action.id !== "config.toolTargetRetention.focus" &&
		action.id !== "remote.knownHosts.select" &&
		!getToolRunActionMetadata(action.id) &&
		!getConfigRecoveryActionFocusTarget(action.id) &&
		!getConfigManagedShelfActionFocusTarget(action.id) &&
		!context.portProcessPreview &&
		!context.controlPreview
	) {
		return [];
	}

	if (context.portProcessPreview) {
		return formatPortProcessControlPalettePreviewRows(
			context.portProcessPreview,
		);
	}

	if (context.controlPreview) {
		if (action.id === "interface.disable") {
			return formatInterfaceControlPalettePreviewRows(action, context);
		}
		return formatControlActionPalettePreviewRows(context.controlPreview);
	}

	if (getToolRunActionMetadata(action.id)) {
		return formatToolDirectRunPalettePreviewRows(action, context);
	}

	if (action.id === "remote.knownHosts.select") {
		return formatRemoteKnownHostsSelectPalettePreviewRows(action);
	}

	if (action.id === "status.toolsEvidence.archive") {
		return formatToolEvidenceArchivePalettePreviewRows(context);
	}

	if (action.id === "status.toolsEvidence.retention") {
		return formatToolEvidenceRetentionPalettePreviewRows(context);
	}

	if (
		action.id === "status.processEvidence.select" ||
		action.id === "status.processEvidence.open" ||
		action.id === "status.processEvidence.search"
	) {
		return formatProcessEvidencePalettePreviewRows(action, context);
	}

	if (
		action.id === "status.remoteKnownHostsEvidence.select" ||
		action.id === "status.remoteKnownHostsEvidence.open" ||
		action.id === "status.remoteKnownHostsEvidence.search" ||
		action.id === "status.remoteKnownHostsEvidence.copy" ||
		action.id === "status.remoteKnownHostsEvidence.export"
	) {
		return formatRemoteKnownHostsEvidencePalettePreviewRows(action, context);
	}

	if (
		action.id === "status.resultJump.select" ||
		action.id === "status.resultJump.open"
	) {
		return formatStatusActivityResultJumpPalettePreviewRows(action, context);
	}

	if (action.id === "status.resultJump.filter") {
		return formatStatusActivityResultJumpFilterPalettePreviewRows(context);
	}

	if (action.id === "config.statusResultJumpClass.focus") {
		return formatConfigStatusResultJumpClassPalettePreviewRows(context);
	}

	if (
		action.id === "config.safetyPolicy.focus" ||
		action.id === "config.editorSaveMode.focus" ||
		action.id === "config.auditRetention.focus" ||
		action.id === "config.toolTargetRetention.focus"
	) {
		return formatConfigWorkspaceFocusPalettePreviewRows(action.id, context);
	}

	const configShelfTarget = getConfigManagedShelfActionFocusTarget(action.id);
	if (configShelfTarget) {
		return formatConfigManagedShelfPalettePreviewRows(
			configShelfTarget,
			context.configManagedShelfCounts?.[configShelfTarget],
		);
	}

	const configRecoveryTarget = getConfigRecoveryActionFocusTarget(action.id);
	if (configRecoveryTarget) {
		return formatConfigRecoveryPaletteRows(configRecoveryTarget);
	}

	const recovery = context.toolsEvidenceSearchRecovery;
	if (!recovery || recovery.items.length === 0) {
		return [
			"selected tools match unavailable",
			"hint=run tools evidence search",
		];
	}

	const selected =
		Math.max(
			0,
			Math.floor(context.selectedToolsEvidenceSearchMatchIndex ?? 0),
		) % recovery.items.length;
	const item = recovery.items[selected];
	const actionVerb =
		action.id === "status.toolsEvidence.matchOpen"
			? "file-open"
			: "archive tools export";
	const rows = [
		`selected tools match ${recovery.target} ${selected + 1}/${recovery.items.length} ${item.fileName}`,
		`query=${recovery.query || "-"} scope=${item.scope} runs=${item.runCount}`,
	];

	if (
		action.id === "status.toolsEvidence.matchArchive" &&
		recovery.target === "archive"
	) {
		rows.push("blocked=archived Tools evidence matches are already archived");
	} else {
		rows.push(`confirm=${actionVerb} path=${item.path}`);
	}
	return rows;
}

function normalizePaletteSearchText(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ");
}

function formatToolDirectRunPalettePreviewRows(
	action: PicosAction,
	context: CommandPalettePreviewContext,
): string[] {
	const metadata = getToolRunActionMetadata(action.id);
	if (!metadata) {
		return [];
	}
	const target = getPaletteToolDefaultTarget(metadata.actionId, context);
	const plan = createToolRunPlan(
		metadata.actionId,
		metadata.defaultTarget,
		undefined,
		target,
	);
	return [
		`tools direct run ${metadata.title}`,
		`action=${metadata.actionId} tool=${metadata.toolId} risk=${action.risk} privilege=${action.privilege}`,
		`target default=${plan ? plan.args.join(" ") : target} placeholder=${metadata.placeholder}`,
		`cli=${plan ? formatPaletteToolCli(plan.toolId, plan.args) : metadata.cli}`,
		"dispatch=enter opens Tools target prompt",
	];
}

function formatRemoteKnownHostsSelectPalettePreviewRows(
	action: PicosAction,
): string[] {
	return [
		"remote known_hosts select",
		`action=${action.id} risk=${action.risk} privilege=${action.privilege}`,
		"prompt=:remote-known-hosts-select accepts=12,#12,candidate 12",
		"guards=localRead=false network=not-opened trust=not-applied knownHostsWrite=false",
		"dispatch=enter opens Remotes known_hosts selection prompt",
	];
}

function getPaletteToolDefaultTarget(
	actionId: string,
	context: CommandPalettePreviewContext,
): string {
	const fallback =
		getToolRunActionMetadata(actionId)?.defaultTarget ?? "example.com";
	if (actionId === "tools.ipInfo") {
		return context.publicIp ?? fallback;
	}
	if (actionId === "network.connect") {
		const target = context.defaultToolTarget?.trim();
		return target ? `${target} 443` : fallback;
	}
	if (actionId === "tools.tls") {
		const target = context.defaultToolTarget?.trim();
		if (!target) {
			return fallback;
		}
		return target.includes(":") ? target : `${target}:443`;
	}
	return context.defaultToolTarget?.trim() || fallback;
}

function formatPaletteToolCli(toolId: string, args: string[]): string {
	return `picos tools ${toolId} ${args.join(" ")}`.trim();
}

function formatConfigManagedShelfPalettePreviewRows(
	target: ConfigManagedShelfTarget,
	count: number | undefined,
): string[] {
	const landingRows = formatConfigManagedShelfLandingRows(target);
	const focusRows = formatConfigManagedShelfFocusRows(target);
	const countRow = formatConfigManagedShelfPaletteCountRow(target, count);
	return [
		landingRows[1].replace("source=config ", "config shelf "),
		landingRows[2],
		...(countRow ? [countRow] : []),
		focusRows[2],
		focusRows[3],
	];
}

function formatConfigManagedShelfPaletteCountRow(
	target: ConfigManagedShelfTarget,
	count: number | undefined,
): string | undefined {
	if (count === undefined) {
		return undefined;
	}
	const labels: Record<ConfigManagedShelfTarget, string> = {
		network: "interfaces",
		routes: "routeFilters",
		connections: "connectionFilters",
		ports: "portFilters",
		tools: "toolTargetPresets",
		logs: "logProfiles",
		remotes: "remoteProfiles",
	};
	return `counts=${labels[target]} ${count}`;
}

function formatInterfaceControlPalettePreviewRows(
	action: PicosAction,
	context: CommandPalettePreviewContext,
): string[] {
	const controlPreview = context.controlPreview;
	if (!controlPreview) {
		return [];
	}
	const selected = context.selectedInterface;
	const targetRows = selected
		? [
				`interface control target=${selected.name} ${selected.status} ${selected.kind}`,
				`address=${selected.ipv4Cidr ?? selected.ipv4 ?? selected.ipv6Cidr ?? selected.ipv6 ?? "-"} mtu=${selected.mtu ?? "-"} rx=${formatPaletteBytes(selected.rxBytes)} tx=${formatPaletteBytes(selected.txBytes)}`,
				`source=${context.selectedInterfacePlatform ?? "-"} action=${action.id} locked`,
			]
		: [
				"interface control target=- unavailable",
				`source=${context.selectedInterfacePlatform ?? "-"} action=${action.id} locked`,
			];
	return [
		...targetRows,
		...formatControlActionPalettePreviewRows(controlPreview),
	];
}

function formatPaletteBytes(value?: number): string {
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

function formatConfigStatusResultJumpClassPalettePreviewRows(
	context: CommandPalettePreviewContext,
): string[] {
	const current =
		getConfigWorkspacePreviewValue(
			context,
			"statusResultJumpClassFilter",
			undefined,
		) ??
		context.statusResultJumpClassFilter ??
		context.statusActivityResultTimelineJumpFilter ??
		"all";
	return [
		"config target=statusResultJumpClassFilter",
		`current=${current}`,
		"section=display action=focus Config row",
		"controls=+/- cycle all/process/timeline/tools/source",
	];
}

function formatConfigWorkspaceFocusPalettePreviewRows(
	actionId: string,
	context: CommandPalettePreviewContext,
): string[] {
	if (actionId === "config.safetyPolicy.focus") {
		const mode = getConfigWorkspacePreviewValue(
			context,
			"controlExecutionMode",
			"disabled",
		);
		const adminDryRun = getConfigWorkspacePreviewValue(
			context,
			"allowAdminDryRun",
			"false",
		);
		const editorSave = getConfigWorkspacePreviewValue(
			context,
			"editorSaveMode",
			"disabled",
		);
		return [
			"config target=controlExecutionMode",
			`current mode=${mode} adminDryRun=${adminDryRun} editorSave=${editorSave}`,
			"section=safety action=focus Config row",
			"controls=P presets safe/user/admin +/- cycle selected row",
		];
	}

	if (actionId === "config.editorSaveMode.focus") {
		return [
			"config target=editorSaveMode",
			`current=${getConfigWorkspacePreviewValue(context, "editorSaveMode", "disabled")}`,
			"section=safety action=focus Config row",
			"controls=+/- cycle disabled/local-write",
		];
	}

	if (actionId === "config.auditRetention.focus") {
		return [
			"config target=auditArchiveRetentionLimit",
			`current=${getConfigWorkspacePreviewValue(
				context,
				"auditArchiveRetentionLimit",
				"10",
			)}`,
			"section=retention action=focus Config row",
			"controls=+/- clamp 1..60 archived audit logs",
		];
	}

	return [
		"config target=toolTargetPresetLimit",
		`current=${getConfigWorkspacePreviewValue(
			context,
			"toolTargetPresetLimit",
			"8",
		)}`,
		"section=retention action=focus Config row",
		"controls=+/- clamp 1..24 saved tool targets",
	];
}

function getConfigWorkspacePreviewValue(
	context: CommandPalettePreviewContext,
	key: ConfigWorkspaceItemKey,
	fallback: string | undefined,
): string | undefined {
	const item = context.configWorkspaceItems?.find((candidate) => {
		return candidate.key === key;
	});
	return item ? String(item.value) : fallback;
}

function formatStatusActivityResultJumpFilterPalettePreviewRows(
	context: CommandPalettePreviewContext,
): string[] {
	const current = context.statusActivityResultTimelineJumpFilter ?? "all";
	const next = context.nextStatusActivityResultTimelineJumpFilter ?? "process";
	const visible = Math.max(
		0,
		Math.floor(context.visibleStatusActivityResultTimelineJumps ?? 0),
	);
	const total = Math.max(
		visible,
		Math.floor(
			context.allStatusActivityResultTimelineJumps ??
				context.totalStatusActivityResultTimelineJumps ??
				visible,
		),
	);
	return [
		"result jump class filter",
		`current=${current} next=${next}`,
		`visible=${visible}/${total}`,
		"dispatch=cycle Status ^ filter",
	];
}

function formatStatusActivityResultJumpPalettePreviewRows(
	action: PicosAction,
	context: CommandPalettePreviewContext,
): string[] {
	const jump = context.selectedStatusActivityResultTimelineJump;
	if (!jump) {
		return [
			"selected result jump unavailable",
			"hint=select a Status Activity result row with a Timeline jump",
		];
	}
	const total = Math.max(
		1,
		Math.floor(context.totalStatusActivityResultTimelineJumps ?? 1),
	);
	const selected = Math.min(
		Math.max(
			0,
			Math.floor(context.selectedStatusActivityResultTimelineJumpIndex ?? 0),
		),
		total - 1,
	);
	return [
		`selected result jump ${selected + 1}/${total} filter=${jump.filter}`,
		formatResultJumpTargetRow(jump.query),
		`query=${jump.query}`,
		action.id === "status.resultJump.select"
			? "action=select next Status result Timeline jump"
			: `timeline-search=${jump.filter} message=${jump.message}`,
	];
}

function formatResultJumpTargetRow(query: string): string {
	const processTarget = parseProcessControlAuditTarget(query);
	if (processTarget) {
		return processTarget.pid
			? `target=process-control pid:${processTarget.pid} action=${processTarget.action}`
			: `target=process-control status:${processTarget.status ?? "unknown"} action=${processTarget.action}`;
	}
	return `target=filter-query ${query}`;
}

function formatProcessEvidencePalettePreviewRows(
	action: PicosAction,
	context: CommandPalettePreviewContext,
): string[] {
	const selected = context.selectedProcessEvidenceExport;
	if (!selected) {
		return [
			"selected process evidence unavailable",
			"hint=export or recover a process-control audit jump",
		];
	}
	const selectedIndex = Math.max(
		0,
		Math.floor(context.selectedProcessEvidenceExportIndex ?? 0),
	);
	const total = Math.max(1, context.totalProcessEvidenceExports ?? 1);
	const fileName = selected.path.split(/[\\/]/).pop() ?? selected.path;
	return [
		`selected process evidence ${selectedIndex + 1}/${total} ${fileName}`,
		`target=${formatProcessEvidenceTarget(selected.query)} events=${selected.eventCount}`,
		`query=${selected.query ?? "-"}`,
		action.id === "status.processEvidence.select"
			? "action=select next recovered process evidence"
			: `${action.id === "status.processEvidence.open" ? "confirm=file-open" : "timeline-search=audit"} path=${selected.path}`,
	];
}

function formatProcessEvidenceTarget(query: string | undefined): string {
	const target = query ? parseProcessControlAuditTarget(query) : undefined;
	if (!target) {
		return "unknown";
	}
	return target.pid
		? `pid:${target.pid}`
		: `status:${target.status ?? "unknown"}`;
}

function parseProcessControlAuditTarget(
	query: string,
): { action: string; pid?: string; status?: string } | undefined {
	const evidenceMatch = query.match(
		/(?:^| )(?:palette process evidence audit|status evidence process audit) action=(\S+)(?: .*?)?(?:target="?pid:([^" ]+)"?|status=(\S+))/,
	);
	if (evidenceMatch) {
		return {
			action: evidenceMatch[1] ?? "unknown",
			...(evidenceMatch[2] ? { pid: evidenceMatch[2] } : {}),
			...(evidenceMatch[3] ? { status: evidenceMatch[3] } : {}),
		};
	}
	const match = query.match(
		/(?:^| )palette process control audit action=(\S+)(?: .*?)?(?:pid=(\S+)|status=(\S+))/,
	);
	if (!match) {
		return undefined;
	}
	return {
		action: match[1] ?? "unknown",
		...(match[2] ? { pid: match[2] } : {}),
		...(match[3] ? { status: match[3] } : {}),
	};
}

function formatRemoteKnownHostsEvidencePalettePreviewRows(
	action: PicosAction,
	context: CommandPalettePreviewContext,
): string[] {
	const selected = context.selectedRemoteKnownHostsEvidenceExport;
	if (!selected) {
		return [
			"selected remote known_hosts evidence unavailable",
			"hint=export or recover a Remotes known_hosts selection-history audit log",
		];
	}
	const selectedIndex = Math.max(
		0,
		Math.floor(context.selectedRemoteKnownHostsEvidenceExportIndex ?? 0),
	);
	const total = Math.max(1, context.totalRemoteKnownHostsEvidenceExports ?? 1);
	const fileName = selected.path.split(/[\\/]/).pop() ?? selected.path;
	const handoff =
		action.id === "status.remoteKnownHostsEvidence.select"
			? "action=select next recovered remote known_hosts evidence"
			: action.id === "status.remoteKnownHostsEvidence.open"
				? `confirm=file-open path=${selected.path}`
				: action.id === "status.remoteKnownHostsEvidence.search"
					? `timeline-search=audit path=${selected.path}`
					: action.id === "status.remoteKnownHostsEvidence.copy"
						? `confirm=clipboard handoff=remote-known-hosts path=${selected.path}`
						: `audit-export=selected-handoff path=${selected.path}`;
	return [
		`selected remote known_hosts evidence ${selectedIndex + 1}/${total} ${fileName}`,
		`target=${formatRemoteKnownHostsEvidenceTarget(selected.query)} events=${selected.eventCount}`,
		`query=${selected.query ?? "-"}`,
		handoff,
	];
}

function formatRemoteKnownHostsEvidenceTarget(
	query: string | undefined,
): string {
	const target = parseRemoteKnownHostsEvidenceTarget(query);
	return target ?? "unknown";
}

function parseRemoteKnownHostsEvidenceTarget(
	query: string | undefined,
): string | undefined {
	const match = query?.match(/^remote known_hosts selection history (.+)$/);
	return match?.[1]?.trim() || undefined;
}

function formatPortProcessControlPalettePreviewRows(
	preview: PortProcessControlPreview,
): string[] {
	const state = preview.enabled ? "ready" : "locked";
	const port = preview.port;
	return [
		`port process control ${preview.actionId} ${state}`,
		`risk=${preview.risk} privilege=${preview.privilege} confirm=${preview.confirmationPhrase}`,
		`target port=${port.localAddress}:${port.localPort} pid=${port.pid} process=${port.command} user=${port.user}`,
		"dryRun no process signal will be sent",
	];
}

function formatControlActionPalettePreviewRows(
	preview: ActionPreviewPlan,
): string[] {
	const state = preview.enabled ? "ready" : "locked";
	return [
		`control preview ${preview.actionId} ${state} dryRun=${preview.dryRun}`,
		`risk=${preview.risk} privilege=${preview.privilege}${preview.confirmationPhrase ? ` confirm=${preview.confirmationPhrase}` : ""}`,
		...(preview.commandPreview
			? [
					`adapter=${preview.commandPreview.adapter} command=${formatPalettePreviewCommand(preview.commandPreview)}`,
				]
			: []),
		...(preview.blockedReason ? [`blocked=${preview.blockedReason}`] : []),
	];
}

function formatPalettePreviewCommand(
	commandPreview: NonNullable<ActionPreviewPlan["commandPreview"]>,
): string {
	return [commandPreview.command, ...commandPreview.args].join(" ");
}

function formatToolEvidenceArchivePalettePreviewRows(
	context: CommandPalettePreviewContext,
): string[] {
	const item = context.selectedToolExport;
	if (!item) {
		return [
			"selected tools export unavailable",
			"hint=refresh Tools evidence or clear filters",
		];
	}
	const total = Math.max(1, Math.floor(context.totalToolExports ?? 1));
	const selected = Math.min(
		Math.max(0, Math.floor(context.selectedToolExportIndex ?? 0)),
		total - 1,
	);
	return [
		`selected tools export ${selected + 1}/${total} ${item.fileName}`,
		`filter=${context.toolExportFilter ?? "any"} query=${context.toolExportQuery?.trim() || "-"} scope=${item.scope} runs=${item.runCount}`,
		`confirm=archive tools export path=${item.path}`,
	];
}

function formatToolEvidenceRetentionPalettePreviewRows(
	context: CommandPalettePreviewContext,
): string[] {
	const plan = context.toolArchiveRetentionPlan;
	if (!plan) {
		return [
			"tools archive retention unavailable",
			"hint=refresh archived Tools evidence",
		];
	}
	const rows = [
		`tools archive retention max=${plan.maxItems} candidates=${plan.candidateItems.length}`,
		`keep=${plan.retainedItems.length} remove=${plan.candidateItems.length}`,
		...plan.candidateItems.slice(0, 1).map((item) => `remove ${item.fileName}`),
		`confirm=${plan.confirmationPhrase}`,
	];
	if (plan.candidateItems.length === 0) {
		rows.splice(2, 0, "blocked=no archived Tools exports beyond retention");
	}
	return rows;
}
