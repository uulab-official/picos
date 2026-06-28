import { safeExec } from "../utils/safeExec";
import type { ListeningPort, SafeExecResult, SupportedPlatform } from "./types";

export type PortsResult = {
	command: string;
	args: string[];
	ports: ListeningPort[];
	rawOutput: string;
};

export function buildPortsCommand(
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } {
	if (platform === "linux") {
		return { command: "ss", args: ["-ltnp"] };
	}
	if (platform === "win32") {
		return { command: "netstat", args: ["-ano"] };
	}
	return { command: "lsof", args: ["-nP", "-iTCP", "-sTCP:LISTEN"] };
}

export async function getListeningPorts(
	platform: SupportedPlatform = process.platform,
): Promise<PortsResult> {
	const command = buildPortsCommand(platform);
	const result = await safeExec(command.command, command.args, {
		timeoutMs: 10000,
	});
	return {
		...command,
		ports: parseListeningPorts(result.stdout || result.stderr),
		rawOutput: formatRawCommand(result),
	};
}

export function parseListeningPorts(input: string): ListeningPort[] {
	if (looksLikeWindowsNetstat(input)) {
		return parseWindowsNetstatPorts(input);
	}
	if (input.split(/\r?\n/).some((line) => parseSsRow(line))) {
		return parseSsListeningPorts(input);
	}
	return parseLsofListeningPorts(input);
}

export function parseLsofListeningPorts(input: string): ListeningPort[] {
	const ports: ListeningPort[] = [];
	for (const line of input.split(/\r?\n/).slice(1)) {
		const parts = line.trim().split(/\s+/).filter(Boolean);
		if (parts.length < 9) {
			continue;
		}
		const name = parts[8]?.replace(/\s*\(LISTEN\)$/, "") ?? "-";
		const [localAddress, localPort] = splitEndpoint(name);
		ports.push({
			protocol: (parts[7] ?? "tcp").toLowerCase(),
			localAddress,
			localPort,
			pid: parts[1] ?? "-",
			command: parts[0] ?? "-",
			user: parts[2] ?? "-",
		});
	}
	return ports;
}

export function parseSsListeningPorts(input: string): ListeningPort[] {
	const ports: ListeningPort[] = [];
	for (const line of input.split(/\r?\n/)) {
		const parsed = parseSsRow(line);
		if (!parsed) {
			continue;
		}
		const [localAddress, localPort] = splitEndpoint(parsed.localEndpoint);
		ports.push({
			protocol: parsed.protocol,
			localAddress,
			localPort,
			pid: parseSsPid(parsed.process) ?? "-",
			command: parseSsCommand(parsed.process) ?? "-",
			user: "-",
		});
	}
	return ports;
}

export function parseWindowsNetstatPorts(input: string): ListeningPort[] {
	const ports: ListeningPort[] = [];
	for (const line of input.split(/\r?\n/)) {
		const parts = line.trim().split(/\s+/).filter(Boolean);
		if (
			parts.length < 5 ||
			!parts[0]?.toLowerCase().startsWith("tcp") ||
			parts[3] !== "LISTENING"
		) {
			continue;
		}
		const [localAddress, localPort] = splitEndpoint(parts[1] ?? "-");
		const pid = parts[4] ?? "-";
		ports.push({
			protocol: "tcp",
			localAddress,
			localPort,
			pid,
			command: `pid:${pid}`,
			user: "-",
		});
	}
	return ports;
}

export function formatPorts(result: PortsResult): string {
	const lines = ["picos ports", ""];
	lines.push("[Summary]");
	lines.push(`Listening Ports: ${result.ports.length}`);
	lines.push("");
	lines.push("[Listening]");
	for (const port of result.ports.slice(0, 100)) {
		lines.push(
			`${port.protocol.padEnd(6)} ${`${port.localAddress}:${port.localPort}`.padEnd(28)} ${port.command.padEnd(18)} pid=${port.pid} user=${port.user}`,
		);
	}
	return lines.join("\n");
}

function looksLikeWindowsNetstat(input: string): boolean {
	return (
		(input.includes("Proto") || input.includes("프로토콜")) &&
		input.includes("PID") &&
		input.split(/\r?\n/).some((line) => line.trim().startsWith("TCP"))
	);
}

function parseSsRow(
	line: string,
): { protocol: string; localEndpoint: string; process: string } | undefined {
	const parts = line.trim().split(/\s+/).filter(Boolean);
	const first = parts[0];
	if (first === "LISTEN" && parts.length >= 4) {
		return {
			protocol: "tcp",
			localEndpoint: parts[3] ?? "-",
			process: parts[5] ?? "",
		};
	}
	if (
		["tcp", "tcp6", "udp", "udp6"].includes(first ?? "") &&
		parts.length >= 5
	) {
		return {
			protocol: first ?? "tcp",
			localEndpoint: parts[4] ?? "-",
			process: parts[6] ?? "",
		};
	}
	return undefined;
}

function parseSsCommand(processInfo: string): string | undefined {
	const match = processInfo.match(/"([^"]+)"/);
	return match?.[1];
}

function parseSsPid(processInfo: string): string | undefined {
	const match = processInfo.match(/pid=(\d+)/);
	return match?.[1];
}

function splitEndpoint(endpoint: string): [string, string] {
	const cleaned = endpoint.trim().replace(/\s*\(LISTEN\)$/, "");
	const bracketMatch = cleaned.match(/^\[([^\]]+)\]:(.+)$/);
	if (bracketMatch) {
		return [bracketMatch[1] || "*", bracketMatch[2] || "*"];
	}
	const colonIndex = cleaned.lastIndexOf(":");
	if (colonIndex > 0) {
		return [
			cleaned.slice(0, colonIndex).replace(/^\[/, "").replace(/\]$/, "") || "*",
			cleaned.slice(colonIndex + 1) || "*",
		];
	}
	const dotIndex = cleaned.lastIndexOf(".");
	if (dotIndex > 0) {
		return [cleaned.slice(0, dotIndex), cleaned.slice(dotIndex + 1)];
	}
	return [cleaned || "*", "*"];
}

function formatRawCommand(result: SafeExecResult): string {
	const output = result.stdout || result.stderr;
	return `$ ${result.command} ${result.args.join(" ")}\n${output}`;
}
