import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	ActionPreviewCommand,
	ActionPreviewConfirmation,
	ActionPreviewPlan,
} from "../core/actions";
import {
	type ConfigCleanupPreview,
	createConfigCleanupPreview,
	submitConfigCleanupConfirmation,
} from "../core/configCleanup";
import {
	type ConnectionSort,
	type ConnectionsResult,
	filterConnections,
	formatConnections,
	sortConnections,
} from "../core/connections";
import {
	type ControlExecutionPlan,
	type ControlExecutionPolicy,
	createControlExecutionPlan,
	defaultControlExecutionPolicy,
	formatControlExecutionRows,
} from "../core/controlExecution";
import type { FileOpenOrigin } from "../core/fileOpen";
import {
	filterListeningPorts,
	formatPorts,
	type PortSort,
	type PortsResult,
	sortListeningPorts,
} from "../core/ports";
import type { ProcessFileSnapshot } from "../core/processes";
import type {
	ActiveConnection,
	ListeningPort,
	ProcessSummary,
} from "../core/types";
import { joinPathLike } from "../utils/pathStyle";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import { clampIndex } from "./navigation";

export type EndpointProcessRequest = {
	pid: string;
	command: string;
};

export type EndpointDetailView = "detail" | "raw" | "process";

export type EndpointHandoffKind = "connections" | "ports";

export type EndpointHandoffPlan = {
	path: string;
	content: string;
	label: string;
	kind: EndpointHandoffKind;
	origin?: FileOpenOrigin;
	view: EndpointDetailView;
};

export type EndpointFilterCleanupPreview = {
	kind: EndpointHandoffKind;
	count: number;
	confirmationPhrase: string;
	cleanup: ConfigCleanupPreview;
	rows: string[];
};

export type EndpointFilterCleanupConfirmation =
	| {
			action: "notice";
			confirmed: false;
			kind: EndpointHandoffKind;
			message: string;
			notice: EndpointPanelNotice;
			presets: string[];
			removed: 0;
	  }
	| {
			action: "apply";
			confirmed: true;
			copyPreview: false;
			kind: EndpointHandoffKind;
			message: string;
			notice: EndpointPanelNotice;
			presets: string[];
			processControlPreview: false;
			removed: number;
			selectedIndex: number;
	  };

export type EndpointPanelNotice = {
	level: "info" | "warn";
	message: string;
};

export type EndpointPanelInputDecision =
	| { kind: "no-op" }
	| { kind: "notice"; notice: EndpointPanelNotice }
	| {
			kind: "command";
			scope: EndpointHandoffKind;
			command:
				| "filter"
				| "cleanup"
				| "export"
				| "open"
				| "inspect-process"
				| "inspect-policy"
				| "control"
				| "sort"
				| "copy";
			notice?: EndpointPanelNotice;
	  }
	| {
			kind: "inspect-policy";
			scope: "ports";
			port: ListeningPort;
			inspectorVisible: boolean;
			io: { kind: "load-process-files"; pid: string } | { kind: "none" };
			notice: EndpointPanelNotice;
	  }
	| {
			kind: "control";
			scope: "ports";
			preview: PortProcessControlPreview;
			copyPreview: false;
			notice: EndpointPanelNotice;
	  }
	| {
			kind: "detail";
			view: EndpointDetailView;
			copyPreview: false;
			processControlPreview: false;
			notice: EndpointPanelNotice;
	  }
	| {
			kind: "filter";
			filter: string;
			selectedIndex: number;
			copyPreview: false;
			processControlPreview: false;
			notice: EndpointPanelNotice;
	  }
	| {
			kind: "save-preset";
			presets: string[];
			copyPreview: false;
			processControlPreview: false;
			notice: EndpointPanelNotice;
	  }
	| {
			kind: "selection";
			selectedIndex: number;
			copyPreview: false;
			processControlPreview: false;
	  };

export type EndpointFilterTransition = {
	filter: string;
	presets: string[];
	selectedIndex: number;
	copyPreview: false;
	processControlPreview: false;
	notice: EndpointPanelNotice;
};

export type PortProcessControlKind = "terminate";

export type PortProcessControlPreview = {
	actionId: "process.terminate";
	kind: PortProcessControlKind;
	port: ListeningPort;
	confirmationPhrase: string;
	risk: "destructive";
	privilege: "user";
	enabled: false;
	rows: string[];
};

export type PortProcessControlConfirmation = {
	actionId: "process.terminate";
	status: "confirmed-disabled" | "rejected";
	expectedPhrase: string;
	receivedPhrase: string;
	confirmed: boolean;
	executionEnabled: false;
	risk: "destructive";
	privilege: "user";
	port: ListeningPort;
};

export type PortProcessControlFileEvidenceIssue = {
	status: "unavailable" | "error";
	pid: string;
	reason: string;
};

export function nextEndpointDetailView(
	view: EndpointDetailView,
): EndpointDetailView {
	if (view === "detail") {
		return "raw";
	}
	if (view === "raw") {
		return "process";
	}
	return "detail";
}

export function getEndpointDetailViewShortcut(
	input: string,
	options: { home?: boolean; end?: boolean } = {},
): EndpointDetailView | undefined {
	if (options.home) {
		return "detail";
	}
	if (options.end) {
		return "process";
	}
	if (input === "1") {
		return "detail";
	}
	if (input === "2") {
		return "raw";
	}
	if (input === "3") {
		return "process";
	}
	return undefined;
}

const ENDPOINT_WORKSPACE_HINT_ENTRIES: readonly {
	key: string;
	label?: string;
	kinds?: readonly EndpointHandoffKind[];
	hint?: boolean;
	intent:
		| "filter"
		| "clear-filter"
		| "save-preset"
		| "preset"
		| "cleanup"
		| "export"
		| "open"
		| "inspect-process"
		| "inspect-policy"
		| "control"
		| "detail"
		| "select"
		| "sort"
		| "copy";
}[] = [
	{ key: "f", label: "filter", intent: "filter" },
	{ key: "F", hint: false, intent: "clear-filter" },
	{ key: "P", label: "save", intent: "save-preset" },
	{ key: "]", label: "preset", intent: "preset" },
	{ key: "D", label: "cleanup", intent: "cleanup" },
	{ key: "e", label: "export", intent: "export" },
	{ key: "o", label: "open", intent: "open" },
	{ key: "enter", label: "process", intent: "inspect-process" },
	{
		key: "I",
		label: "inspector",
		kinds: ["ports"],
		intent: "inspect-policy",
	},
	{ key: "K", label: "control", kinds: ["ports"], intent: "control" },
	{ key: "tab/1-3", label: "detail", intent: "detail" },
	{ key: "home/end", intent: "detail" },
	{ key: "j/k", label: "select", intent: "select" },
	{ key: "s", hint: false, intent: "sort" },
	{ key: "c", hint: false, intent: "copy" },
];

export function repairEndpointSelection(index: number, total: number): number {
	return clampIndex(index, total);
}

export function selectFirstEndpointResult(total: number): number {
	return repairEndpointSelection(0, total);
}

export function moveEndpointSelection(
	index: number,
	total: number,
	direction: "next" | "previous",
): number {
	if (total <= 0) {
		return clampIndex(index, total);
	}
	const current = clampIndex(index, total);
	const offset = direction === "next" ? 1 : -1;
	return clampIndex((current + offset + total) % total, total);
}

export function resolveEndpointSelectedRow<T>(
	rows: readonly T[],
	selectedIndex: number,
): T | undefined {
	if (!rows.length) {
		return undefined;
	}
	return rows[clampIndex(selectedIndex, rows.length)];
}

export function prepareEndpointFilterTransition(
	input:
		| {
				kind: "connections";
				rows: readonly ActiveConnection[];
				presets: string[];
				query: string;
		  }
		| {
				kind: "ports";
				rows: readonly ListeningPort[];
				presets: string[];
				query: string;
		  },
): EndpointFilterTransition {
	const filter = input.query.trim();
	const matches =
		input.kind === "connections"
			? filterConnections([...input.rows], filter).length
			: filterListeningPorts([...input.rows], filter).length;
	return {
		filter,
		presets: filter
			? saveEndpointFilterPreset(input.presets, filter)
			: input.presets,
		selectedIndex: selectFirstEndpointResult(matches),
		copyPreview: false,
		processControlPreview: false,
		notice: {
			level: matches ? "info" : "warn",
			message: filter
				? `${input.kind} filter ${filter} matches ${matches}`
				: `${input.kind} filter cleared`,
		},
	};
}

export function prepareEndpointPanelInput(input: {
	kind: EndpointHandoffKind;
	input: string;
	view: EndpointDetailView;
	filter: string;
	presets: string[];
	rows: readonly (ActiveConnection | ListeningPort)[];
	visibleRows?: readonly (ActiveConnection | ListeningPort)[];
	selectedIndex: number;
	home?: boolean;
	end?: boolean;
	tab?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	processControlInspector?: boolean;
}): EndpointPanelInputDecision {
	const visibleRows = input.visibleRows ?? input.rows;
	const normalizedInput = input.downArrow
		? "j"
		: input.upArrow
			? "k"
			: input.input;
	const entry = ENDPOINT_WORKSPACE_HINT_ENTRIES.find(
		(candidate) =>
			(!candidate.kinds || candidate.kinds.includes(input.kind)) &&
			(candidate.key === normalizedInput ||
				(candidate.key === "enter" && normalizedInput === "\r") ||
				(candidate.key === "j/k" && ["j", "k"].includes(normalizedInput)) ||
				(candidate.key === "tab/1-3" &&
					(input.tab || ["1", "2", "3"].includes(normalizedInput))) ||
				(candidate.key === "home/end" && (input.home || input.end))),
	);
	if (!entry) {
		return { kind: "no-op" };
	}
	if (entry.intent === "detail") {
		const view =
			getEndpointDetailViewShortcut(normalizedInput, {
				home: input.home,
				end: input.end,
			}) ?? nextEndpointDetailView(input.view);
		return {
			kind: "detail",
			view,
			copyPreview: false,
			processControlPreview: false,
			notice: { level: "info", message: `${input.kind} detail ${view}` },
		};
	}
	if (entry.intent === "select") {
		return {
			kind: "selection",
			selectedIndex: moveEndpointSelection(
				input.selectedIndex,
				visibleRows.length,
				normalizedInput === "j" ? "next" : "previous",
			),
			copyPreview: false,
			processControlPreview: false,
		};
	}
	if (entry.intent === "clear-filter") {
		return {
			kind: "filter",
			filter: "",
			selectedIndex: selectFirstEndpointResult(input.rows.length),
			copyPreview: false,
			processControlPreview: false,
			notice: {
				level: "info",
				message: `${input.kind} filter cleared`,
			},
		};
	}
	if (entry.intent === "save-preset") {
		const filter = input.filter.trim();
		return filter
			? {
					kind: "save-preset",
					presets: saveEndpointFilterPreset(input.presets, filter),
					copyPreview: false,
					processControlPreview: false,
					notice: {
						level: "info",
						message: `${input.kind} preset saved ${filter}`,
					},
				}
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: `no ${input.kind} filter to save`,
					},
				};
	}
	if (entry.intent === "cleanup") {
		const preview = createEndpointFilterCleanupPreview(
			input.kind,
			input.presets,
		);
		return preview
			? {
					kind: "command",
					scope: input.kind,
					command: "cleanup",
					notice: {
						level: "warn",
						message: `${input.kind} filter cleanup confirm ${preview.confirmationPhrase}`,
					},
				}
			: {
					kind: "notice",
					notice: {
						level: "warn",
						message: `no ${input.kind} filter presets to clean`,
					},
				};
	}
	if (entry.intent === "preset") {
		const filter = nextEndpointFilterPreset(input.presets, input.filter);
		if (!filter) {
			return {
				kind: "notice",
				notice: {
					level: "warn",
					message: `no ${input.kind} filter presets`,
				},
			};
		}
		const matches =
			input.kind === "connections"
				? filterConnections(input.rows as ActiveConnection[], filter).length
				: filterListeningPorts(input.rows as ListeningPort[], filter).length;
		return {
			kind: "filter",
			filter,
			selectedIndex: selectFirstEndpointResult(matches),
			copyPreview: false,
			processControlPreview: false,
			notice: {
				level: matches ? "info" : "warn",
				message: `${input.kind} preset ${filter} matches ${matches}`,
			},
		};
	}
	if (entry.intent === "copy") {
		if (!resolveEndpointSelectedRow(visibleRows, input.selectedIndex)) {
			return {
				kind: "notice",
				notice: {
					level: "warn",
					message:
						input.kind === "connections"
							? "no connection selected"
							: "no port selected",
				},
			};
		}
		return { kind: "command", scope: input.kind, command: "copy" };
	}
	const selectedRow = resolveEndpointSelectedRow(
		visibleRows,
		input.selectedIndex,
	);
	if (
		["inspect-process", "inspect-policy", "control"].includes(entry.intent) &&
		!selectedRow
	) {
		const message =
			entry.intent === "inspect-process"
				? "no endpoint process selected"
				: entry.intent === "inspect-policy"
					? "no port process policy to inspect"
					: "no port process selected";
		return { kind: "notice", notice: { level: "warn", message } };
	}
	if (entry.intent === "inspect-policy" || entry.intent === "control") {
		const port = selectedRow as ListeningPort;
		if (!createProcessRequest(port.pid)) {
			return {
				kind: "notice",
				notice: {
					level: "warn",
					message:
						entry.intent === "inspect-policy"
							? "no port process policy to inspect"
							: "no port process selected",
				},
			};
		}
		if (entry.intent === "inspect-policy") {
			const inspectorVisible = !input.processControlInspector;
			return {
				kind: "inspect-policy",
				scope: "ports",
				port,
				inspectorVisible,
				io: inspectorVisible
					? { kind: "load-process-files", pid: port.pid }
					: { kind: "none" },
				notice: {
					level: "info",
					message: inspectorVisible
						? `ports process policy inspector ${port.pid}`
						: "ports process policy inspector hidden",
				},
			};
		}
		const preview = createPortProcessControlPreview(port);
		return {
			kind: "control",
			scope: "ports",
			preview,
			copyPreview: false,
			notice: {
				level: "warn",
				message: `ports process control confirm ${preview.confirmationPhrase}`,
			},
		};
	}
	return {
		kind: "command",
		scope: input.kind,
		command: entry.intent,
		...(entry.intent === "filter"
			? {
					notice: {
						level: "info" as const,
						message: `${input.kind} filter opened`,
					},
				}
			: {}),
	};
}

export function getEndpointWorkspaceHintKeys(
	kind: EndpointHandoffKind,
): string[] {
	return ENDPOINT_WORKSPACE_HINT_ENTRIES.filter(
		(entry) =>
			entry.hint !== false && (!entry.kinds || entry.kinds.includes(kind)),
	).map((entry) => entry.key);
}

export function formatEndpointWorkspaceHintRow(
	kind: EndpointHandoffKind,
): string {
	const lead = kind === "connections" ? "active endpoints" : "listening ports";
	const hints = ENDPOINT_WORKSPACE_HINT_ENTRIES.filter(
		(entry) =>
			entry.hint !== false && (!entry.kinds || entry.kinds.includes(kind)),
	).map((entry) => (entry.label ? `${entry.key} ${entry.label}` : entry.key));
	return [lead, ...hints].join(" · ");
}

export function saveEndpointFilterPreset(
	presets: string[],
	query: string,
): string[] {
	const normalized = query.trim();
	if (!normalized) {
		return presets;
	}
	return [
		normalized,
		...presets.filter((preset) => preset !== normalized),
	].slice(0, 6);
}

export function nextEndpointFilterPreset(
	presets: string[],
	currentQuery: string,
): string | undefined {
	if (presets.length === 0) {
		return undefined;
	}
	const current = currentQuery.trim();
	const index = presets.indexOf(current);
	return presets[(index + 1) % presets.length] ?? presets[0];
}

export function createEndpointFilterCleanupPreview(
	kind: EndpointHandoffKind,
	presets: string[],
): EndpointFilterCleanupPreview | undefined {
	const normalized = presets.map((preset) => preset.trim()).filter(Boolean);
	if (!normalized.length) {
		return undefined;
	}
	const labelPrefix = kind === "connections" ? "Connections" : "Ports";
	const cleanup = createConfigCleanupPreview({
		id: `${kind}.filters`,
		label: `${labelPrefix} filter presets`,
		scope: kind,
		count: normalized.length,
		verb: "clear",
	});
	return {
		kind,
		count: normalized.length,
		confirmationPhrase: cleanup.confirmationPhrase,
		cleanup,
		rows: [
			"ENDPOINT FILTER CLEANUP",
			`kind=${kind} presets=${normalized.length}`,
			`confirm ${cleanup.confirmationPhrase} locked`,
		],
	};
}

export function submitEndpointFilterCleanupConfirmation(
	kind: EndpointHandoffKind,
	presets: string[],
	confirmation: string,
	rowCount = 0,
): EndpointFilterCleanupConfirmation {
	const preview = createEndpointFilterCleanupPreview(kind, presets);
	if (!preview) {
		const message = `${kind} filter cleanup unavailable`;
		return {
			action: "notice",
			confirmed: false,
			kind,
			message,
			notice: { level: "warn", message },
			presets,
			removed: 0,
		};
	}
	const cleanupConfirmation = submitConfigCleanupConfirmation(
		preview.cleanup,
		confirmation,
	);
	if (!cleanupConfirmation.confirmed) {
		const message = `${kind} filter cleanup rejected`;
		return {
			action: "notice",
			confirmed: false,
			kind,
			message,
			notice: { level: "warn", message },
			presets,
			removed: 0,
		};
	}
	const message = `${kind} filter cleanup removed ${preview.count} presets`;
	return {
		action: "apply",
		confirmed: true,
		copyPreview: false,
		kind,
		message,
		notice: { level: "info", message },
		presets: [],
		processControlPreview: false,
		removed: preview.count,
		selectedIndex: selectFirstEndpointResult(rowCount),
	};
}

export function getSelectedConnectionProcessRequest(
	connections: ActiveConnection[],
	selectedIndex: number,
): EndpointProcessRequest | undefined {
	const connection =
		connections[getSelectedIndex(connections.length, selectedIndex) ?? -1];
	return createProcessRequest(connection?.pid);
}

export function getSelectedPortProcessRequest(
	ports: ListeningPort[],
	selectedIndex: number,
): EndpointProcessRequest | undefined {
	const port = ports[getSelectedIndex(ports.length, selectedIndex) ?? -1];
	return createProcessRequest(port?.pid);
}

export function createSelectedPortProcessControlPreview(
	ports: ListeningPort[],
	selectedIndex: number,
	kind: PortProcessControlKind = "terminate",
): PortProcessControlPreview | undefined {
	const port = ports[getSelectedIndex(ports.length, selectedIndex) ?? -1];
	if (!port || !createProcessRequest(port.pid)) {
		return undefined;
	}
	return createPortProcessControlPreview(port, kind);
}

function createPortProcessControlPreview(
	port: ListeningPort,
	kind: PortProcessControlKind = "terminate",
): PortProcessControlPreview {
	const confirmationPhrase = `kill pid ${port.pid}`;
	const target = `port=${port.localAddress}:${port.localPort} pid=${port.pid} process=${port.command} user=${port.user}`;
	return {
		actionId: "process.terminate",
		kind,
		port,
		confirmationPhrase,
		risk: "destructive",
		privilege: "user",
		enabled: false,
		rows: [
			"PORT PROCESS CONTROL",
			"action=process.terminate status=locked risk=destructive privilege=user",
			`target ${target}`,
			`confirm ${confirmationPhrase} locked`,
			"dryRun no process signal will be sent",
		],
	};
}

export function submitPortProcessControlConfirmation(
	preview: PortProcessControlPreview,
	confirmation: string,
): PortProcessControlConfirmation {
	const expectedPhrase = preview.confirmationPhrase;
	const receivedPhrase = confirmation.trim();
	const confirmed = receivedPhrase === expectedPhrase;
	return {
		actionId: preview.actionId,
		status: confirmed ? "confirmed-disabled" : "rejected",
		expectedPhrase,
		receivedPhrase,
		confirmed,
		executionEnabled: false,
		risk: preview.risk,
		privilege: preview.privilege,
		port: preview.port,
	};
}

export function formatPortProcessControlConfirmationAuditMessage(
	confirmation: PortProcessControlConfirmation,
): string {
	return [
		`port process control ${confirmation.actionId}`,
		`status=${confirmation.status}`,
		`risk=${confirmation.risk}`,
		`privilege=${confirmation.privilege}`,
		`executionEnabled=${confirmation.executionEnabled}`,
		`port=${confirmation.port.localAddress}:${confirmation.port.localPort}`,
		`pid=${confirmation.port.pid}`,
		`process=${confirmation.port.command}`,
		`user=${confirmation.port.user}`,
	].join(" ");
}

export function createPortProcessControlExecutionPlan(
	preview: PortProcessControlPreview,
	confirmation: PortProcessControlConfirmation | undefined,
	commandPreview?: ActionPreviewCommand,
	policy: ControlExecutionPolicy = defaultControlExecutionPolicy,
): ControlExecutionPlan {
	const hydratedCommandPreview = commandPreview
		? hydratePortProcessControlCommand(commandPreview, preview.port.pid)
		: undefined;
	return createControlExecutionPlan(
		createPortProcessControlActionPreviewPlan(preview, hydratedCommandPreview),
		confirmation
			? createPortProcessControlActionConfirmation(
					confirmation,
					hydratedCommandPreview,
				)
			: undefined,
		policy,
	);
}

export function formatPortProcessControlExecutionRows(
	preview: PortProcessControlPreview,
	confirmation: PortProcessControlConfirmation | undefined,
	commandPreview?: ActionPreviewCommand,
	policy: ControlExecutionPolicy = defaultControlExecutionPolicy,
): string[] {
	return formatControlExecutionRows(
		createPortProcessControlExecutionPlan(
			preview,
			confirmation,
			commandPreview,
			policy,
		),
	);
}

export function formatPortProcessControlInspectorRows(
	preview: PortProcessControlPreview,
	commandPreview?: ActionPreviewCommand,
	policy: ControlExecutionPolicy = defaultControlExecutionPolicy,
	files?: ProcessFileSnapshot,
	fileEvidenceIssue?: PortProcessControlFileEvidenceIssue,
): string[] {
	const executionRows = formatPortProcessControlExecutionRows(
		preview,
		undefined,
		commandPreview,
		policy,
	);
	return [
		"PORT CONTROL",
		`target=${preview.port.localAddress}:${preview.port.localPort} pid=${preview.port.pid} process=${preview.port.command}`,
		...formatPortProcessControlFileEvidenceRows(
			preview,
			files,
			fileEvidenceIssue,
		),
		...executionRows.slice(1),
		`drilldown enter=process picos process ${preview.port.pid} --files`,
		"files from Processes: enter opens cwd/open file; c copies selected resource",
	];
}

export function getSelectedConnectionClipboardPreview(
	connections: ActiveConnection[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const connection =
		connections[getSelectedIndex(connections.length, selectedIndex) ?? -1];
	if (!connection) {
		return undefined;
	}
	return createClipboardPreview({
		source: "connection",
		label: "selected connection",
		copyText: formatConnectionCopyText(connection),
	});
}

export function getSelectedPortClipboardPreview(
	ports: ListeningPort[],
	selectedIndex: number,
): ClipboardPreview | undefined {
	const port = ports[getSelectedIndex(ports.length, selectedIndex) ?? -1];
	if (!port) {
		return undefined;
	}
	return createClipboardPreview({
		source: "port",
		label: "selected port",
		copyText: formatPortCopyText(port),
	});
}

export function formatConnectionsWorkspaceRows(
	result: ConnectionsResult,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		filter?: string;
		processControlPreview?: boolean;
		processes?: ProcessSummary[];
		presets?: string[];
		selectedIndex?: number;
		shelfFocus?: boolean;
		sort?: ConnectionSort;
		view?: EndpointDetailView;
	} = {},
): string[] {
	const filtered = filterConnections(result.connections, options.filter);
	const sorted = sortConnections(filtered, options.sort);
	const view = options.view ?? "detail";
	const selectedIndex = getSelectedIndex(sorted.length, options.selectedIndex);
	const selectedConnection =
		selectedIndex === undefined ? undefined : sorted[selectedIndex];
	const established = filtered.filter(
		(connection) => connection.state === "ESTABLISHED",
	).length;
	const endpointRows = sorted.map((connection, index) =>
		withSelectionMarker(
			`${connection.protocol.padEnd(6)} ${clip(`${connection.localAddress}:${connection.localPort}`, 24).padEnd(24)} ${clip(`${connection.remoteAddress}:${connection.remotePort}`, 24).padEnd(24)} ${connection.state ?? "-"}`,
			index,
			selectedIndex,
		),
	);
	const rows = [
		[
			`SUMMARY connections=${countLabel(filtered.length, result.connections.length)}`,
			`established=${established}`,
			view !== "detail" ? `view=${view}` : "",
			options.sort ? `sort=${options.sort.key} ${options.sort.direction}` : "",
			options.filter?.trim() ? `filter=${options.filter.trim()}` : "",
			formatEndpointPresetSummary(options.presets),
			`command=${result.command} ${result.args.join(" ")}`,
		]
			.filter(Boolean)
			.join(" ")
			.trim(),
		...(options.shelfFocus
			? formatEndpointPresetShelfControlRows(
					"connections",
					options.presets,
					options.filter,
				)
			: []),
		"ACTIVE",
		...(endpointRows.length
			? endpointRows
			: ["no active connections detected"]),
		...formatConnectionDetailViewRows(
			result,
			selectedConnection,
			selectedIndex,
			sorted.length,
			options.copyPreview ?? false,
			options.processes ?? [],
			view,
			visibleRows,
		),
	];
	return fitRows(rows, visibleRows, "connections");
}

export function formatPortsWorkspaceRows(
	result: PortsResult,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		filter?: string;
		processControlPreview?: boolean;
		processes?: ProcessSummary[];
		presets?: string[];
		selectedIndex?: number;
		shelfFocus?: boolean;
		sort?: PortSort;
		view?: EndpointDetailView;
	} = {},
): string[] {
	const filtered = filterListeningPorts(result.ports, options.filter);
	const sorted = sortListeningPorts(filtered, options.sort);
	const view = options.view ?? "detail";
	const selectedIndex = getSelectedIndex(sorted.length, options.selectedIndex);
	const selectedPort =
		selectedIndex === undefined ? undefined : sorted[selectedIndex];
	const portRows = sorted.map((port, index) =>
		withSelectionMarker(
			`${port.protocol.padEnd(6)} ${clip(`${port.localAddress}:${port.localPort}`, 24).padEnd(24)} ${clip(port.command, 18).padEnd(18)} ${port.pid.padEnd(7)} ${clip(port.user, 12)}`,
			index,
			selectedIndex,
		),
	);
	const rows = [
		[
			`SUMMARY ports=${countLabel(filtered.length, result.ports.length)}`,
			view !== "detail" ? `view=${view}` : "",
			options.sort ? `sort=${options.sort.key} ${options.sort.direction}` : "",
			options.filter?.trim() ? `filter=${options.filter.trim()}` : "",
			formatEndpointPresetSummary(options.presets),
			`command=${result.command} ${result.args.join(" ")}`,
		]
			.filter(Boolean)
			.join(" ")
			.trim(),
		...(options.shelfFocus
			? formatEndpointPresetShelfControlRows(
					"ports",
					options.presets,
					options.filter,
				)
			: []),
		"LISTENING",
		...(portRows.length ? portRows : ["no listening ports detected"]),
		...formatPortDetailViewRows(
			result,
			selectedPort,
			selectedIndex,
			sorted.length,
			options.copyPreview ?? false,
			options.processControlPreview ?? false,
			options.processes ?? [],
			view,
			visibleRows,
		),
	];
	return fitRows(rows, visibleRows, "ports");
}

export function createEndpointHandoffPlan(
	kind: "connections",
	options: {
		baseDir: string;
		filter?: string;
		generatedAt?: Date;
		origin?: FileOpenOrigin;
		result: ConnectionsResult;
		sort?: ConnectionSort;
		view?: EndpointDetailView;
	},
): EndpointHandoffPlan;
export function createEndpointHandoffPlan(
	kind: "ports",
	options: {
		baseDir: string;
		filter?: string;
		generatedAt?: Date;
		origin?: FileOpenOrigin;
		result: PortsResult;
		sort?: PortSort;
		view?: EndpointDetailView;
	},
): EndpointHandoffPlan;
export function createEndpointHandoffPlan(
	kind: EndpointHandoffKind,
	options: {
		baseDir: string;
		filter?: string;
		generatedAt?: Date;
		origin?: FileOpenOrigin;
		result: ConnectionsResult | PortsResult;
		sort?: ConnectionSort | PortSort;
		view?: EndpointDetailView;
	},
): EndpointHandoffPlan {
	const view = options.view ?? "raw";
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	const label = `${kind} ${view === "raw" ? "raw output" : "summary"}`;
	const content = getEndpointHandoffContent(kind, options.result, {
		filter: options.filter,
		sort: options.sort,
		view,
	});
	return {
		path: joinPathLike(
			options.baseDir,
			"endpoints",
			`picos-${kind}-${view}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatEndpointHandoffMarkdown(kind, options.result, {
			content,
			filter: options.filter,
			generatedAt: iso,
			label,
			origin: options.origin,
			sort: options.sort,
			view,
		}),
		label,
		kind,
		...(options.origin ? { origin: options.origin } : {}),
		view,
	};
}

export async function writeEndpointHandoffPlan(
	plan: EndpointHandoffPlan,
): Promise<EndpointHandoffPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

function getEndpointHandoffContent(
	kind: EndpointHandoffKind,
	result: ConnectionsResult | PortsResult,
	options: {
		filter?: string;
		sort?: ConnectionSort | PortSort;
		view: EndpointDetailView;
	},
): string {
	if (options.view === "raw") {
		return result.rawOutput;
	}
	if (kind === "connections") {
		return formatConnections(result as ConnectionsResult, {
			filter: options.filter,
			sort: options.sort as ConnectionSort | undefined,
		});
	}
	return formatPorts(result as PortsResult, {
		filter: options.filter,
		sort: options.sort as PortSort | undefined,
	});
}

function formatEndpointHandoffMarkdown(
	kind: EndpointHandoffKind,
	result: ConnectionsResult | PortsResult,
	options: {
		content: string;
		filter?: string;
		generatedAt: string;
		label: string;
		origin?: FileOpenOrigin;
		sort?: ConnectionSort | PortSort;
		view: EndpointDetailView;
	},
): string {
	const filter = options.filter?.trim() ?? "";
	return [
		"# picos endpoint handoff",
		`generatedAt=${options.generatedAt}`,
		`kind=${kind}`,
		`view=${options.view}`,
		`label=${options.label}`,
		`command=${result.command} ${result.args.join(" ")}`.trim(),
		...formatHandoffOriginMetadata(options.origin),
		...(filter ? [`filter=${filter}`] : []),
		...(options.sort
			? [`sort=${options.sort.key} ${options.sort.direction}`]
			: []),
		"",
		"```txt",
		options.content,
		"```",
		"",
	].join("\n");
}

function formatHandoffOriginMetadata(
	origin: FileOpenOrigin | undefined,
): string[] {
	if (!origin) {
		return [];
	}
	return [
		`originKind=${sanitizeHandoffMetadata(origin.kind)}`,
		`originTarget=${sanitizeHandoffMetadata(origin.target)}`,
		`originLabel=${sanitizeHandoffMetadata(origin.label)}`,
		`originScope=${sanitizeHandoffMetadata(origin.scope)}`,
	];
}

function sanitizeHandoffMetadata(value: string): string {
	return value.replaceAll(/\r?\n/g, " ").trim();
}

function getSelectedIndex(
	total: number,
	selectedIndex: number | undefined,
): number | undefined {
	if (selectedIndex === undefined || total <= 0) {
		return undefined;
	}
	return clampIndex(selectedIndex, total);
}

function createProcessRequest(
	pid: string | undefined,
): EndpointProcessRequest | undefined {
	if (!pid || !/^[1-9]\d*$/.test(pid)) {
		return undefined;
	}
	return { pid, command: `picos process ${pid} --files` };
}

function hydratePortProcessControlCommand(
	commandPreview: ActionPreviewCommand,
	pid: string,
): ActionPreviewCommand {
	return {
		...commandPreview,
		command: commandPreview.command.replaceAll("<pid>", pid),
		args: commandPreview.args.map((arg) => arg.replaceAll("<pid>", pid)),
	};
}

function createPortProcessControlActionPreviewPlan(
	preview: PortProcessControlPreview,
	commandPreview: ActionPreviewCommand | undefined,
): ActionPreviewPlan {
	return {
		actionId: preview.actionId,
		title: "Terminate port process",
		risk: preview.risk,
		privilege: preview.privilege,
		enabled: preview.enabled,
		dryRun: true,
		confirmationPhrase: preview.confirmationPhrase,
		blockedReason: "disabled-by-default",
		commandPreview,
		preflight: [
			"scope=selected pid",
			"willModify=process-lifecycle persistentConfig=false connectionDrop=possible",
			"requires=pid ownership confirmation dry-run-policy",
			`adapterDryRun=${commandPreview?.dryRunExecutable ? "available" : commandPreview ? "preview-only" : "missing"}`,
			"rollback=not-available terminated processes must be restarted externally",
		],
		preview: preview.rows,
	};
}

function createPortProcessControlActionConfirmation(
	confirmation: PortProcessControlConfirmation,
	commandPreview: ActionPreviewCommand | undefined,
): ActionPreviewConfirmation {
	return {
		actionId: confirmation.actionId,
		status: confirmation.status,
		expectedPhrase: confirmation.expectedPhrase,
		receivedPhrase: confirmation.receivedPhrase,
		confirmed: confirmation.confirmed,
		executionEnabled: confirmation.executionEnabled,
		risk: confirmation.risk,
		privilege: confirmation.privilege,
		dryRun: true,
		commandPreview,
	};
}

function formatPortProcessControlFileEvidenceRows(
	preview: PortProcessControlPreview,
	files: ProcessFileSnapshot | undefined,
	issue: PortProcessControlFileEvidenceIssue | undefined,
): string[] {
	if (issue && issue.pid === preview.port.pid) {
		return [
			`fileEvidence status=${issue.status} pid=${issue.pid} reason=${formatPortFileEvidenceReason(issue.reason)}`,
		];
	}
	if (!files) {
		return [];
	}
	if (String(files.pid) !== preview.port.pid) {
		return [
			`fileEvidence status=stale selectedPid=${preview.port.pid} cachedPid=${files.pid}`,
		];
	}
	const resourceCount =
		(files.cwd ? 1 : 0) +
		(files.fileEntries.length
			? files.fileEntries.length
			: files.openFiles.length);
	return [
		`fileEvidence status=loaded cwd=${files.cwd ? "yes" : "no"} openFiles=${files.openFiles.length} resources=${resourceCount}`,
	];
}

function formatPortFileEvidenceReason(reason: string): string {
	return reason.trim().replace(/\s+/g, " ") || "unknown";
}

function withSelectionMarker(
	row: string,
	index: number,
	selectedIndex: number | undefined,
): string {
	if (selectedIndex === undefined) {
		return row;
	}
	return `${index === selectedIndex ? ">" : " "} ${row}`;
}

function formatConnectionDetailRows(
	connection: ConnectionsResult["connections"][number] | undefined,
	selectedIndex: number | undefined,
	total: number,
	copyPreview: boolean,
	processes: ProcessSummary[],
): string[] {
	if (!connection || selectedIndex === undefined) {
		return [];
	}
	const endpoint = formatConnectionCopyText(connection);
	const process = findProcessByPid(processes, connection.pid);
	return [
		`DETAIL connection ${selectedIndex + 1}/${total}`,
		`local ${connection.localAddress}:${connection.localPort}`,
		`remote ${connection.remoteAddress}:${connection.remotePort}`,
		`state ${connection.state ?? "-"}${connection.pid ? ` pid=${connection.pid}` : ""}`,
		...formatProcessRows(process, "process"),
		...(copyPreview
			? formatClipboardPreviewRows(
					createClipboardPreview({
						source: "connection",
						label: "selected connection",
						copyText: endpoint,
					}),
				)
			: []),
	];
}

function formatConnectionDetailViewRows(
	result: ConnectionsResult,
	connection: ConnectionsResult["connections"][number] | undefined,
	selectedIndex: number | undefined,
	total: number,
	copyPreview: boolean,
	processes: ProcessSummary[],
	view: EndpointDetailView,
	visibleRows: number,
): string[] {
	if (view === "raw") {
		return [
			"RAW OUTPUT",
			...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
		];
	}
	if (view === "process") {
		return formatEndpointProcessRows(
			"connection",
			connection?.pid,
			selectedIndex,
			total,
			findProcessByPid(processes, connection?.pid),
			"process",
		);
	}
	return [
		...formatConnectionDetailRows(
			connection,
			selectedIndex,
			total,
			copyPreview,
			processes,
		),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
}

function formatPortDetailRows(
	port: PortsResult["ports"][number] | undefined,
	selectedIndex: number | undefined,
	total: number,
	copyPreview: boolean,
	processControlPreview: boolean,
	processes: ProcessSummary[],
): string[] {
	if (!port || selectedIndex === undefined) {
		return [];
	}
	const endpoint = formatPortCopyText(port);
	const process = findProcessByPid(processes, port.pid);
	return [
		`DETAIL port ${selectedIndex + 1}/${total}`,
		`listen ${port.localAddress}:${port.localPort}`,
		`process ${port.command} pid=${port.pid} user=${port.user}`,
		...formatProcessRows(process, "snapshot"),
		...(processControlPreview
			? (createSelectedPortProcessControlPreview([port], 0)?.rows ?? [])
			: []),
		...(copyPreview
			? formatClipboardPreviewRows(
					createClipboardPreview({
						source: "port",
						label: "selected port",
						copyText: endpoint,
					}),
				)
			: []),
	];
}

function formatPortDetailViewRows(
	result: PortsResult,
	port: PortsResult["ports"][number] | undefined,
	selectedIndex: number | undefined,
	total: number,
	copyPreview: boolean,
	processControlPreview: boolean,
	processes: ProcessSummary[],
	view: EndpointDetailView,
	visibleRows: number,
): string[] {
	if (view === "raw") {
		return [
			"RAW OUTPUT",
			...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
		];
	}
	if (view === "process") {
		return formatEndpointProcessRows(
			"port",
			port?.pid,
			selectedIndex,
			total,
			findProcessByPid(processes, port?.pid),
			"snapshot",
		);
	}
	return [
		...formatPortDetailRows(
			port,
			selectedIndex,
			total,
			copyPreview,
			processControlPreview,
			processes,
		),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
}

function formatEndpointProcessRows(
	kind: "connection" | "port",
	pid: string | undefined,
	selectedIndex: number | undefined,
	total: number,
	process: ProcessSummary | undefined,
	processLabel: "process" | "snapshot",
): string[] {
	if (selectedIndex === undefined) {
		return [];
	}
	return [
		`PROCESS ${kind} ${selectedIndex + 1}/${total} pid=${pid ?? "-"}`,
		...formatProcessRows(process, processLabel),
	];
}

function formatConnectionCopyText(connection: ActiveConnection): string {
	return `${connection.localAddress}:${connection.localPort} -> ${connection.remoteAddress}:${connection.remotePort}`;
}

function formatPortCopyText(port: ListeningPort): string {
	return `${port.localAddress}:${port.localPort} ${port.command} pid=${port.pid}`;
}

function findProcessByPid(
	processes: ProcessSummary[],
	pid: string | undefined,
): ProcessSummary | undefined {
	if (!pid) {
		return undefined;
	}
	return processes.find((process) => String(process.pid) === pid);
}

function formatProcessRows(
	process: ProcessSummary | undefined,
	label: "process" | "snapshot",
): string[] {
	if (!process) {
		return [];
	}
	return [
		`${label} ${process.command}`,
		`usage cpu=${process.cpu}% mem=${process.memory}%`,
		`inspect picos process ${process.pid}`,
	];
}

function countLabel(visible: number, total: number): string {
	return visible === total ? String(visible) : `${visible}/${total}`;
}

function formatEndpointPresetSummary(presets: string[] | undefined): string {
	const visible = presets?.slice(0, 3).filter(Boolean) ?? [];
	return visible.length ? `presets=${visible.join("|")}` : "";
}

function formatEndpointPresetShelfControlRows(
	kind: EndpointHandoffKind,
	presets: string[] | undefined,
	filter: string | undefined,
): string[] {
	const normalized = (presets ?? [])
		.map((preset) => preset.trim())
		.filter(Boolean);
	const current = filter?.trim() || "-";
	const next = nextEndpointFilterPreset(normalized, filter ?? "") ?? "-";
	const noun = kind === "connections" ? "connection" : "port";
	const action = normalized.length
		? `enter=cycle ${noun} filter presets  ]=cycle P=save D=cleanup`
		: `enter=open ${noun} filter prompt  P=save D=cleanup`;
	return [
		`SHELF CONTROL ${kind}.filters`,
		`> current=${current} next=${next} saved=${normalized.length}`,
		action,
	];
}

function formatRawOutputRows(rawOutput: string, visibleRows: number): string[] {
	const lines = rawOutput.split(/\r?\n/).filter((line) => line.length > 0);
	if (visibleRows <= 0) {
		return lines.length ? [`↓ ${lines.length} more raw lines`] : [];
	}
	const visible = lines.slice(0, visibleRows);
	const hidden = Math.max(0, lines.length - visible.length);
	return hidden > 0 ? [...visible, `↓ ${hidden} more raw lines`] : visible;
}

function fitRows(rows: string[], visibleRows: number, label: string): string[] {
	if (rows.length <= visibleRows) {
		return rows;
	}
	const rawIndex = rows.indexOf("RAW OUTPUT");
	if (rawIndex < 0) {
		return clipRows(rows, visibleRows, label);
	}
	const fixedRows = rows.slice(0, Math.min(rawIndex, visibleRows - 2));
	const rawRows = [
		"RAW OUTPUT",
		...formatRawOutputRows(rows.slice(rawIndex + 1).join("\n"), 1),
	];
	return [...fixedRows, ...rawRows].slice(0, visibleRows);
}

function clipRows(
	rows: string[],
	visibleRows: number,
	label: string,
): string[] {
	if (rows.length <= visibleRows) {
		return rows;
	}
	if (visibleRows <= 1) {
		return [`↓ ${rows.length} more ${label}`];
	}
	const visible = rows.slice(0, visibleRows - 1);
	return [...visible, `↓ ${rows.length - visible.length} more ${label}`];
}

function clip(value: string, width: number): string {
	return value.length > width
		? `${value.slice(0, Math.max(0, width - 1))}…`
		: value;
}
