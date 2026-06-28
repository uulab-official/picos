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

export function formatConnections(result: ConnectionsResult): string {
	const lines = ["picos connections", ""];
	lines.push("[Summary]");
	lines.push(`Connections: ${result.connections.length}`);
	lines.push("");
	lines.push("[Active]");
	for (const connection of result.connections.slice(0, 100)) {
		lines.push(
			`${connection.protocol.padEnd(6)} ${formatEndpoint(connection.localAddress, connection.localPort).padEnd(28)} ${formatEndpoint(connection.remoteAddress, connection.remotePort).padEnd(28)} ${connection.state ?? "-"}${connection.pid ? ` pid=${connection.pid}` : ""}`,
		);
	}
	return lines.join("\n");
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
