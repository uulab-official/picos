import {
	type ConnectionSort,
	type ConnectionsResult,
	filterConnections,
	sortConnections,
} from "../core/connections";
import {
	filterListeningPorts,
	type PortSort,
	type PortsResult,
	sortListeningPorts,
} from "../core/ports";

export function formatConnectionsWorkspaceRows(
	result: ConnectionsResult,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		filter?: string;
		selectedIndex?: number;
		sort?: ConnectionSort;
	} = {},
): string[] {
	const filtered = filterConnections(result.connections, options.filter);
	const sorted = sortConnections(filtered, options.sort);
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
			options.sort ? `sort=${options.sort.key} ${options.sort.direction}` : "",
			options.filter?.trim() ? `filter=${options.filter.trim()}` : "",
			`command=${result.command} ${result.args.join(" ")}`,
		]
			.filter(Boolean)
			.join(" ")
			.trim(),
		"ACTIVE",
		...(endpointRows.length
			? endpointRows
			: ["no active connections detected"]),
		...formatConnectionDetailRows(
			selectedConnection,
			selectedIndex,
			sorted.length,
			options.copyPreview ?? false,
		),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
	return fitRows(rows, visibleRows, "connections");
}

export function formatPortsWorkspaceRows(
	result: PortsResult,
	visibleRows: number,
	options: {
		copyPreview?: boolean;
		filter?: string;
		selectedIndex?: number;
		sort?: PortSort;
	} = {},
): string[] {
	const filtered = filterListeningPorts(result.ports, options.filter);
	const sorted = sortListeningPorts(filtered, options.sort);
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
			options.sort ? `sort=${options.sort.key} ${options.sort.direction}` : "",
			options.filter?.trim() ? `filter=${options.filter.trim()}` : "",
			`command=${result.command} ${result.args.join(" ")}`,
		]
			.filter(Boolean)
			.join(" ")
			.trim(),
		"LISTENING",
		...(portRows.length ? portRows : ["no listening ports detected"]),
		...formatPortDetailRows(
			selectedPort,
			selectedIndex,
			sorted.length,
			options.copyPreview ?? false,
		),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
	return fitRows(rows, visibleRows, "ports");
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
): string[] {
	if (!connection || selectedIndex === undefined) {
		return [];
	}
	const endpoint = `${connection.localAddress}:${connection.localPort} -> ${connection.remoteAddress}:${connection.remotePort}`;
	return [
		`DETAIL connection ${selectedIndex + 1}/${total}`,
		`local ${connection.localAddress}:${connection.localPort}`,
		`remote ${connection.remoteAddress}:${connection.remotePort}`,
		`state ${connection.state ?? "-"}${connection.pid ? ` pid=${connection.pid}` : ""}`,
		...(copyPreview ? [`COPY PREVIEW ${endpoint}`] : []),
	];
}

function formatPortDetailRows(
	port: PortsResult["ports"][number] | undefined,
	selectedIndex: number | undefined,
	total: number,
	copyPreview: boolean,
): string[] {
	if (!port || selectedIndex === undefined) {
		return [];
	}
	const endpoint = `${port.localAddress}:${port.localPort}`;
	return [
		`DETAIL port ${selectedIndex + 1}/${total}`,
		`listen ${endpoint}`,
		`process ${port.command} pid=${port.pid} user=${port.user}`,
		...(copyPreview
			? [`COPY PREVIEW ${endpoint} ${port.command} pid=${port.pid}`]
			: []),
	];
}

function countLabel(visible: number, total: number): string {
	return visible === total ? String(visible) : `${visible}/${total}`;
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
