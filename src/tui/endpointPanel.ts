import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	type ConnectionSort,
	type ConnectionsResult,
	filterConnections,
	formatConnections,
	sortConnections,
} from "../core/connections";
import {
	filterListeningPorts,
	formatPorts,
	type PortSort,
	type PortsResult,
	sortListeningPorts,
} from "../core/ports";
import type {
	ActiveConnection,
	ListeningPort,
	ProcessSummary,
} from "../core/types";
import {
	type ClipboardPreview,
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";

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
	view: EndpointDetailView;
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
		processes?: ProcessSummary[];
		presets?: string[];
		selectedIndex?: number;
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
		processes?: ProcessSummary[];
		presets?: string[];
		selectedIndex?: number;
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
		"LISTENING",
		...(portRows.length ? portRows : ["no listening ports detected"]),
		...formatPortDetailViewRows(
			result,
			selectedPort,
			selectedIndex,
			sorted.length,
			options.copyPreview ?? false,
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
		path: join(
			options.baseDir,
			"endpoints",
			`picos-${kind}-${view}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatEndpointHandoffMarkdown(kind, options.result, {
			content,
			filter: options.filter,
			generatedAt: iso,
			label,
			sort: options.sort,
			view,
		}),
		label,
		kind,
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

function getSelectedIndex(
	total: number,
	selectedIndex: number | undefined,
): number | undefined {
	if (selectedIndex === undefined || total <= 0) {
		return undefined;
	}
	return Math.min(Math.max(selectedIndex, 0), total - 1);
}

function createProcessRequest(
	pid: string | undefined,
): EndpointProcessRequest | undefined {
	if (!pid || !/^[1-9]\d*$/.test(pid)) {
		return undefined;
	}
	return { pid, command: `picos process ${pid} --files` };
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
		...formatPortDetailRows(port, selectedIndex, total, copyPreview, processes),
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
