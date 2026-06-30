import { safeExec } from "../utils/safeExec";
import type {
	ActiveConnection,
	SafeExecResult,
	SupportedPlatform,
} from "./types";

export type ConnectionsResult = {
	command: string;
	args: string[];
	connections: ActiveConnection[];
	rawOutput: string;
};

export type ConnectionSortKey =
	| "protocol"
	| "local"
	| "localPort"
	| "remote"
	| "remotePort"
	| "state"
	| "pid";

export type ConnectionSort = {
	key: ConnectionSortKey;
	direction: "asc" | "desc";
};

const connectionSortCycle: ConnectionSort[] = [
	{ key: "state", direction: "asc" },
	{ key: "remote", direction: "asc" },
	{ key: "remotePort", direction: "asc" },
	{ key: "local", direction: "asc" },
	{ key: "localPort", direction: "asc" },
	{ key: "protocol", direction: "asc" },
	{ key: "pid", direction: "asc" },
	{ key: "pid", direction: "desc" },
];

export function buildConnectionsCommand(
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } {
	if (platform === "win32") {
		return { command: "netstat", args: ["-ano"] };
	}
	return { command: "netstat", args: ["-an"] };
}

export async function getActiveConnections(
	platform: SupportedPlatform = process.platform,
): Promise<ConnectionsResult> {
	const command = buildConnectionsCommand(platform);
	const result = await safeExec(command.command, command.args, {
		timeoutMs: 10000,
	});
	return {
		...command,
		connections: parseConnections(result.stdout || result.stderr),
		rawOutput: formatRawCommand(result),
	};
}

export function parseConnections(input: string): ActiveConnection[] {
	const connections: ActiveConnection[] = [];

	for (const line of input.split(/\r?\n/)) {
		const parts = line.trim().split(/\s+/).filter(Boolean);
		const protocol = parts[0]?.toLowerCase();
		if (!protocol?.startsWith("tcp") && !protocol?.startsWith("udp")) {
			continue;
		}

		const parsed = parseConnectionParts(protocol, parts);
		if (parsed) {
			connections.push(parsed);
		}
	}

	return connections;
}

export function filterConnections(
	connections: ActiveConnection[],
	query: string | number | undefined,
): ActiveConnection[] {
	const normalized = normalizeFilterQuery(query);
	if (!normalized) {
		return connections;
	}
	return connections.filter((connection) =>
		connectionSearchText(connection).includes(normalized),
	);
}

function normalizeFilterQuery(query: string | number | undefined): string {
	return query === undefined ? "" : String(query).trim().toLowerCase();
}

export function parseConnectionSort(value: string | undefined): ConnectionSort {
	if (!value) {
		return { key: "state", direction: "asc" };
	}
	const direction = value.startsWith("-") ? "desc" : "asc";
	const key = value.replace(/^-/, "");
	if (!isConnectionSortKey(key)) {
		throw new Error(`Invalid connection sort: ${value}`);
	}
	return { key, direction };
}

export function sortConnections(
	connections: ActiveConnection[],
	sort: ConnectionSort = { key: "state", direction: "asc" },
): ActiveConnection[] {
	return connections
		.map((connection, index) => ({ connection, index }))
		.sort((left, right) => {
			const compared = compareConnection(
				left.connection,
				right.connection,
				sort.key,
			);
			return (
				(sort.direction === "desc" ? -compared : compared) ||
				left.index - right.index
			);
		})
		.map((item) => item.connection);
}

export function nextConnectionSort(current: ConnectionSort): ConnectionSort {
	const index = connectionSortCycle.findIndex(
		(item) => item.key === current.key && item.direction === current.direction,
	);
	return (
		connectionSortCycle[(index + 1) % connectionSortCycle.length] ??
		connectionSortCycle[0]
	);
}

export function formatConnections(
	result: ConnectionsResult,
	options: { filter?: string | number; sort?: ConnectionSort } = {},
): string {
	const filtered = filterConnections(result.connections, options.filter);
	const sorted = sortConnections(filtered, options.sort);
	const filter = normalizeFilterQuery(options.filter);
	const lines = ["picos connections", ""];
	lines.push("[Summary]");
	lines.push(
		filtered.length === result.connections.length
			? `Connections: ${filtered.length}`
			: `Connections: ${filtered.length} / ${result.connections.length}`,
	);
	if (filter) {
		lines.push(`Filter: ${filter}`);
	}
	if (options.sort) {
		lines.push(`Sort: ${options.sort.key} ${options.sort.direction}`);
	}
	lines.push("");
	lines.push("[Active]");
	for (const connection of sorted.slice(0, 100)) {
		lines.push(
			`${connection.protocol.padEnd(6)} ${formatEndpoint(connection.localAddress, connection.localPort).padEnd(28)} ${formatEndpoint(connection.remoteAddress, connection.remotePort).padEnd(28)} ${connection.state ?? "-"}${connection.pid ? ` pid=${connection.pid}` : ""}`,
		);
	}
	return lines.join("\n");
}

function connectionSearchText(connection: ActiveConnection): string {
	return [
		connection.protocol,
		connection.localAddress,
		connection.localPort,
		connection.remoteAddress,
		connection.remotePort,
		connection.state,
		connection.pid,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function compareConnection(
	left: ActiveConnection,
	right: ActiveConnection,
	key: ConnectionSortKey,
): number {
	if (key === "localPort") {
		return compareNumericText(left.localPort, right.localPort);
	}
	if (key === "remotePort") {
		return compareNumericText(left.remotePort, right.remotePort);
	}
	return connectionSortValue(left, key).localeCompare(
		connectionSortValue(right, key),
		undefined,
		{ numeric: true, sensitivity: "base" },
	);
}

function compareNumericText(left: string, right: string): number {
	const leftNumber = Number(left);
	const rightNumber = Number(right);
	if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
		return leftNumber - rightNumber;
	}
	return left.localeCompare(right, undefined, {
		numeric: true,
		sensitivity: "base",
	});
}

function connectionSortValue(
	connection: ActiveConnection,
	key: Exclude<ConnectionSortKey, "localPort" | "remotePort">,
): string {
	if (key === "local") {
		return connection.localAddress;
	}
	if (key === "remote") {
		return connection.remoteAddress;
	}
	return connection[key] ?? "";
}

function isConnectionSortKey(value: string): value is ConnectionSortKey {
	return [
		"protocol",
		"local",
		"localPort",
		"remote",
		"remotePort",
		"state",
		"pid",
	].includes(value);
}

function parseConnectionParts(
	protocol: string,
	parts: string[],
): ActiveConnection | undefined {
	if (parts.length < 4) {
		return undefined;
	}

	const windowsRow = parts[1]?.includes(":") && parts[2]?.includes(":");
	if (windowsRow) {
		const [localAddress, localPort] = splitEndpoint(parts[1] ?? "-");
		const [remoteAddress, remotePort] = splitEndpoint(parts[2] ?? "-");
		return {
			protocol,
			localAddress,
			localPort,
			remoteAddress,
			remotePort,
			state: protocol.startsWith("tcp") ? parts[3] : undefined,
			pid: parts[4],
		};
	}

	if (parts.length < 5) {
		return undefined;
	}

	const [localAddress, localPort] = splitEndpoint(parts[3] ?? "-");
	const [remoteAddress, remotePort] = splitEndpoint(parts[4] ?? "-");
	return {
		protocol,
		localAddress,
		localPort,
		remoteAddress,
		remotePort,
		state: protocol.startsWith("tcp") ? parts[5] : undefined,
	};
}

function splitEndpoint(endpoint: string): [string, string] {
	const cleaned = endpoint.trim();
	const bracketMatch = cleaned.match(/^\[([^\]]+)\]:(.+)$/);
	if (bracketMatch) {
		return [bracketMatch[1] || "*", bracketMatch[2] || "*"];
	}
	const colonIndex = cleaned.lastIndexOf(":");
	if (colonIndex > 0) {
		const host = cleaned
			.slice(0, colonIndex)
			.replace(/^\[/, "")
			.replace(/\]$/, "");
		const port = cleaned.slice(colonIndex + 1);
		return [host || "*", port || "*"];
	}

	const dotIndex = cleaned.lastIndexOf(".");
	if (dotIndex > 0) {
		return [cleaned.slice(0, dotIndex), cleaned.slice(dotIndex + 1)];
	}

	return [cleaned || "*", "*"];
}

function formatEndpoint(address: string, port: string): string {
	return `${address}:${port}`;
}

function formatRawCommand(result: SafeExecResult): string {
	const output = result.stdout || result.stderr;
	return `$ ${result.command} ${result.args.join(" ")}\n${output}`;
}
