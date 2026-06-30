import type { ConnectionsResult } from "../core/connections";
import type { PortsResult } from "../core/ports";

export function formatConnectionsWorkspaceRows(
	result: ConnectionsResult,
	visibleRows: number,
): string[] {
	const established = result.connections.filter(
		(connection) => connection.state === "ESTABLISHED",
	).length;
	const endpointRows = result.connections.map(
		(connection) =>
			`${connection.protocol.padEnd(6)} ${clip(`${connection.localAddress}:${connection.localPort}`, 24).padEnd(24)} ${clip(`${connection.remoteAddress}:${connection.remotePort}`, 24).padEnd(24)} ${connection.state ?? "-"}`,
	);
	const rows = [
		`SUMMARY connections=${result.connections.length} established=${established} command=${result.command} ${result.args.join(" ")}`.trim(),
		"ACTIVE",
		...(endpointRows.length
			? endpointRows
			: ["no active connections detected"]),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
	return fitRows(rows, visibleRows, "connections");
}

export function formatPortsWorkspaceRows(
	result: PortsResult,
	visibleRows: number,
): string[] {
	const portRows = result.ports.map(
		(port) =>
			`${port.protocol.padEnd(6)} ${clip(`${port.localAddress}:${port.localPort}`, 24).padEnd(24)} ${clip(port.command, 18).padEnd(18)} ${port.pid.padEnd(7)} ${clip(port.user, 12)}`,
	);
	const rows = [
		`SUMMARY ports=${result.ports.length} command=${result.command} ${result.args.join(" ")}`.trim(),
		"LISTENING",
		...(portRows.length ? portRows : ["no listening ports detected"]),
		"RAW OUTPUT",
		...formatRawOutputRows(result.rawOutput, Math.max(0, visibleRows - 4)),
	];
	return fitRows(rows, visibleRows, "ports");
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
