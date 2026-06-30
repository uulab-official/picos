import { safeExec } from "../utils/safeExec";
import type { ListeningPort, SafeExecResult, SupportedPlatform } from "./types";

export type PortsResult = {
	command: string;
	args: string[];
	ports: ListeningPort[];
	rawOutput: string;
};

export type PortSortKey =
	| "protocol"
	| "address"
	| "port"
	| "process"
	| "pid"
	| "user";

export type PortSort = {
	key: PortSortKey;
	direction: "asc" | "desc";
};

const portSortCycle: PortSort[] = [
	{ key: "port", direction: "asc" },
	{ key: "process", direction: "asc" },
	{ key: "address", direction: "asc" },
	{ key: "protocol", direction: "asc" },
	{ key: "user", direction: "asc" },
	{ key: "pid", direction: "asc" },
	{ key: "pid", direction: "desc" },
];

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

export function filterListeningPorts(
	ports: ListeningPort[],
	query: string | number | undefined,
): ListeningPort[] {
	const normalized = normalizeFilterQuery(query);
	if (!normalized) {
		return ports;
	}
	return ports.filter((port) => portSearchText(port).includes(normalized));
}

function normalizeFilterQuery(query: string | number | undefined): string {
	return query === undefined ? "" : String(query).trim().toLowerCase();
}

export function parsePortSort(value: string | undefined): PortSort {
	if (!value) {
		return { key: "port", direction: "asc" };
	}
	const direction = value.startsWith("-") ? "desc" : "asc";
	const key = value.replace(/^-/, "");
	if (!isPortSortKey(key)) {
		throw new Error(`Invalid port sort: ${value}`);
	}
	return { key, direction };
}

export function sortListeningPorts(
	ports: ListeningPort[],
	sort: PortSort = { key: "port", direction: "asc" },
): ListeningPort[] {
	return ports
		.map((port, index) => ({ port, index }))
		.sort((left, right) => {
			const compared = comparePort(left.port, right.port, sort.key);
			return (
				(sort.direction === "desc" ? -compared : compared) ||
				left.index - right.index
			);
		})
		.map((item) => item.port);
}

export function nextPortSort(current: PortSort): PortSort {
	const index = portSortCycle.findIndex(
		(item) => item.key === current.key && item.direction === current.direction,
	);
	return portSortCycle[(index + 1) % portSortCycle.length] ?? portSortCycle[0];
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

export function formatPorts(
	result: PortsResult,
	options: { filter?: string | number; sort?: PortSort } = {},
): string {
	const filtered = filterListeningPorts(result.ports, options.filter);
	const sorted = sortListeningPorts(filtered, options.sort);
	const filter = normalizeFilterQuery(options.filter);
	const lines = ["picos ports", ""];
	lines.push("[Summary]");
	lines.push(
		filtered.length === result.ports.length
			? `Listening Ports: ${filtered.length}`
			: `Listening Ports: ${filtered.length} / ${result.ports.length}`,
	);
	if (filter) {
		lines.push(`Filter: ${filter}`);
	}
	if (options.sort) {
		lines.push(`Sort: ${options.sort.key} ${options.sort.direction}`);
	}
	lines.push("");
	lines.push("[Listening]");
	for (const port of sorted.slice(0, 100)) {
		lines.push(
			`${port.protocol.padEnd(6)} ${`${port.localAddress}:${port.localPort}`.padEnd(28)} ${port.command.padEnd(18)} pid=${port.pid} user=${port.user}`,
		);
	}
	return lines.join("\n");
}

function portSearchText(port: ListeningPort): string {
	return [
		port.protocol,
		port.localAddress,
		port.localPort,
		port.pid,
		port.command,
		port.user,
	]
		.join(" ")
		.toLowerCase();
}

function comparePort(
	left: ListeningPort,
	right: ListeningPort,
	key: PortSortKey,
): number {
	if (key === "port") {
		return compareNumericText(left.localPort, right.localPort);
	}
	if (key === "pid") {
		return compareNumericText(left.pid, right.pid);
	}
	return portSortValue(left, key).localeCompare(
		portSortValue(right, key),
		undefined,
		{
			numeric: true,
			sensitivity: "base",
		},
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

function portSortValue(
	port: ListeningPort,
	key: Exclude<PortSortKey, "port" | "pid">,
): string {
	if (key === "address") {
		return port.localAddress;
	}
	if (key === "process") {
		return port.command;
	}
	return port[key];
}

function isPortSortKey(value: string): value is PortSortKey {
	return ["protocol", "address", "port", "process", "pid", "user"].includes(
		value,
	);
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
