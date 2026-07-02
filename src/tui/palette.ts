import type { ActionPreviewPlan, PicosAction } from "../core/actions";
import type { ConsoleAuditExportPlan } from "../core/auditLog";
import type {
	ConfigWorkspaceItem,
	ConfigWorkspaceItemKey,
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
	const query = state.query.trim().toLowerCase();
	if (query.length === 0) {
		return actions;
	}

	return actions.filter((action) =>
		[
			action.id,
			action.title,
			action.description,
			action.category,
			action.risk,
			action.privilege,
		]
			.join(" ")
			.toLowerCase()
			.includes(query),
	);
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
	selectedStatusActivityResultTimelineJump?: StatusActivityCopyIntentTimelineSearch;
	selectedStatusActivityResultTimelineJumpIndex?: number;
	totalStatusActivityResultTimelineJumps?: number;
	configWorkspaceItems?: ConfigWorkspaceItem[];
	statusActivityResultTimelineJumpFilter?: StatusActivityResultTimelineJumpFilter;
	nextStatusActivityResultTimelineJumpFilter?: StatusActivityResultTimelineJumpFilter;
	statusResultJumpClassFilter?: StatusActivityResultTimelineJumpFilter;
	visibleStatusActivityResultTimelineJumps?: number;
	allStatusActivityResultTimelineJumps?: number;
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
		action.id !== "status.resultJump.select" &&
		action.id !== "status.resultJump.open" &&
		action.id !== "status.resultJump.filter" &&
		action.id !== "config.statusResultJumpClass.focus" &&
		action.id !== "config.safetyPolicy.focus" &&
		action.id !== "config.editorSaveMode.focus" &&
		action.id !== "config.auditRetention.focus" &&
		action.id !== "config.toolTargetRetention.focus" &&
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
		return formatControlActionPalettePreviewRows(context.controlPreview);
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
