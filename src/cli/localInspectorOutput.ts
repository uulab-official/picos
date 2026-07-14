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
import {
	filterRouteEntries,
	type RoutePathResult,
	type RouteSort,
	type RouteTableResult,
	sortRouteEntries,
} from "../core/routes";
import type {
	NetworkInterfaceSummary,
	NetworkSummary,
	SystemInventory,
	SystemSummary,
} from "../core/types";
import { ReportedCliError } from "./errors";

export const LOCAL_INSPECTOR_JSON_SCHEMA_VERSION = 1;
export const LOCAL_INSPECTOR_JSON_ENTRY_LIMIT = 10_000;
export const LOCAL_INSPECTOR_JSON_MAX_BYTES = 4 * 1024 * 1024;
const LOCAL_INSPECTOR_JSON_TEXT_LIMIT = 4_096;
const LOCAL_INSPECTOR_JSON_REDACTION_SCAN_LIMIT = 16_384;
const LOCAL_INSPECTOR_JSON_ROW_BUDGET =
	LOCAL_INSPECTOR_JSON_MAX_BYTES - 512 * 1024;

export type LocalInspectorCommand =
	| "info"
	| "routes"
	| "route"
	| "connections"
	| "ports"
	| "doctor"
	| "dns"
	| "tools";

type InfoJsonInput =
	| {
			scope: "summary";
			system: SystemSummary;
			network: NetworkSummary;
	  }
	| {
			scope: "full";
			inventory: SystemInventory;
	  };

type InspectorQuery = {
	filter?: string | number;
	sort: { key: string; direction: "asc" | "desc" };
};

type InspectorSourceResult = {
	command?: string;
	args?: string[];
	success?: boolean;
	exitCode?: number | null;
	truncated?: boolean;
};

class LocalInspectorSourceError extends Error {
	constructor(
		message: string,
		readonly source: InspectorSourceResult,
	) {
		super(message);
		this.name = "LocalInspectorSourceError";
	}
}

export function parseLocalJsonFlag(value: unknown): boolean {
	if (value === undefined || value === false) return false;
	if (value === true || value === "true") return true;
	if (value === "false") return false;
	throw new Error("--json is a boolean flag");
}

export function isLocalJsonRequested(value: unknown): boolean {
	if (value === true || value === "true") return true;
	if (Array.isArray(value)) return value.some(isLocalJsonRequested);
	return false;
}

export function assertLocalJsonOptions(options: {
	json?: unknown;
	raw?: unknown;
}): boolean {
	const json = parseLocalJsonFlag(options.json);
	if (json && options.raw !== undefined && options.raw !== false) {
		throw new Error("--raw cannot be combined with --json");
	}
	return json;
}

export function formatInfoJson(input: InfoJsonInput): string {
	const data =
		input.scope === "full"
			? normalizeFullInventory(input.inventory)
			: {
					system: normalizeSystem(input.system),
					network: normalizeNetwork(input.network),
				};

	return stringifyCompleted("info", {
		scope: input.scope,
		data,
	});
}

export function formatConnectionsJson(
	result: ConnectionsResult,
	query: InspectorQuery & { sort: ConnectionSort },
): string {
	assertSourceCompleted(result, "Connections");
	const visible = sortConnections(
		filterConnections(result.connections, query.filter),
		query.sort,
	);
	const limited = limitEntries(visible, normalizeConnection);

	return stringifyCompletedRows(
		"connections",
		limited.entries,
		limited.truncated,
		(connections, truncated) => ({
			request: formatQuery(query),
			source: formatSource(
				result.command,
				result.args,
				result.success,
				result.exitCode,
				result.truncated,
			),
			data: {
				totalCount: result.connections.length,
				visibleCount: visible.length,
				returnedCount: connections.length,
				limit: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
				byteLimit: LOCAL_INSPECTOR_JSON_MAX_BYTES,
				truncated,
				connections,
			},
		}),
	);
}

export function formatPortsJson(
	result: PortsResult,
	query: InspectorQuery & { sort: PortSort },
): string {
	assertSourceCompleted(result, "Listening ports");
	const visible = sortListeningPorts(
		filterListeningPorts(result.ports, query.filter),
		query.sort,
	);
	const limited = limitEntries(visible, normalizePort);

	return stringifyCompletedRows(
		"ports",
		limited.entries,
		limited.truncated,
		(ports, truncated) => ({
			request: formatQuery(query),
			source: formatSource(
				result.command,
				result.args,
				result.success,
				result.exitCode,
				result.truncated,
			),
			data: {
				totalCount: result.ports.length,
				visibleCount: visible.length,
				returnedCount: ports.length,
				limit: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
				byteLimit: LOCAL_INSPECTOR_JSON_MAX_BYTES,
				truncated,
				ports,
			},
		}),
	);
}

export function formatRoutesJson(
	result: RouteTableResult,
	query: InspectorQuery & { sort: RouteSort },
): string {
	assertSourceCompleted(result, "Route table");
	const filter = normalizeQuery(query.filter);
	const visible = sortRouteEntries(
		filterRouteEntries(result.routes, filter ?? undefined),
		query.sort,
	);
	const limited = limitEntries(visible, normalizeRoute);

	return stringifyCompletedRows(
		"routes",
		limited.entries,
		limited.truncated,
		(routes, truncated) => ({
			request: formatQuery(query),
			source: formatSource(
				result.command,
				result.args,
				result.success,
				result.exitCode,
				result.truncated,
			),
			data: {
				totalCount: result.routes.length,
				visibleCount: visible.length,
				returnedCount: routes.length,
				limit: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
				byteLimit: LOCAL_INSPECTOR_JSON_MAX_BYTES,
				truncated,
				diagnostics: result.diagnostics.slice(0, 100).map((diagnostic) => ({
					status: diagnostic.status,
					label: sanitizeText(diagnostic.label),
					detail: diagnostic.detail ? sanitizeText(diagnostic.detail) : null,
				})),
				routes,
			},
		}),
	);
}

export function formatRoutePathJson(result: RoutePathResult): string {
	assertSourceCompleted(result, "Route path");
	return stringifyCompleted("route", {
		request: { destination: sanitizeText(result.destination) },
		source:
			result.command && result.args
				? formatSource(
						result.command,
						result.args,
						result.success,
						result.exitCode,
						result.truncated,
					)
				: null,
		data: {
			destination: sanitizeText(result.destination),
			gateway: result.gateway ? sanitizeText(result.gateway) : null,
			interfaceName: result.interfaceName
				? sanitizeText(result.interfaceName)
				: null,
			sourceIp: result.sourceIp ? sanitizeText(result.sourceIp) : null,
		},
	});
}

export function formatLocalInspectorJsonFailure(input: {
	command: LocalInspectorCommand;
	message: string;
	request?: Record<string, unknown>;
	source?: InspectorSourceResult;
}): string {
	return JSON.stringify(
		{
			schemaVersion: LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
			command: input.command,
			status: "failed",
			limits: { maxBytes: LOCAL_INSPECTOR_JSON_MAX_BYTES },
			request: input.request ? sanitizeRequest(input.request) : null,
			source: input.source ? formatOptionalSource(input.source) : null,
			error: {
				code: "PICOS_LOCAL_INSPECTOR_FAILED",
				message: sanitizeText(input.message),
			},
		},
		null,
		2,
	);
}

export function reportLocalInspectorJsonFailure(
	command: LocalInspectorCommand,
	caught: unknown,
	options: {
		request?: Record<string, unknown>;
		writeOutput?: (value: string) => void;
	} = {},
): never {
	const message = caught instanceof Error ? caught.message : String(caught);
	(options.writeOutput ?? console.log)(
		formatLocalInspectorJsonFailure({
			command,
			message,
			request: options.request,
			source:
				caught instanceof LocalInspectorSourceError ? caught.source : undefined,
		}),
	);
	throw new ReportedCliError(message, { cause: caught });
}

export function reportLocalInspectorCliParseFailure(
	argv: string[],
	caught: unknown,
): boolean {
	if (!argv.some(isLocalJsonArgument)) return false;
	const command = argv.find(isLocalInspectorCommand);
	if (!isLocalInspectorCommand(command)) return false;
	const message = caught instanceof Error ? caught.message : String(caught);
	console.log(formatLocalInspectorJsonFailure({ command, message }));
	return true;
}

function stringifyCompleted(
	command: LocalInspectorCommand,
	payload: Record<string, unknown>,
): string {
	const output = serializeCompleted(command, payload);
	if (Buffer.byteLength(output, "utf8") > LOCAL_INSPECTOR_JSON_MAX_BYTES) {
		throw new Error(
			`Local inspector JSON exceeds ${LOCAL_INSPECTOR_JSON_MAX_BYTES} bytes`,
		);
	}
	return output;
}

export function stringifyLocalInspectorCompleted(
	command: LocalInspectorCommand,
	payload: Record<string, unknown>,
): string {
	return stringifyCompleted(command, payload);
}

function serializeCompleted(
	command: LocalInspectorCommand,
	payload: Record<string, unknown>,
): string {
	return JSON.stringify({
		schemaVersion: LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
		command,
		status: "completed",
		limits: { maxBytes: LOCAL_INSPECTOR_JSON_MAX_BYTES },
		...payload,
	});
}

function stringifyCompletedRows<T>(
	command: LocalInspectorCommand,
	entries: T[],
	alreadyTruncated: boolean,
	createPayload: (entries: T[], truncated: boolean) => Record<string, unknown>,
): string {
	let lower = 0;
	let upper = entries.length;
	let best: string | undefined;
	while (lower <= upper) {
		const count = Math.floor((lower + upper) / 2);
		const visibleEntries = entries.slice(0, count);
		const output = serializeCompleted(
			command,
			createPayload(visibleEntries, alreadyTruncated || count < entries.length),
		);
		if (Buffer.byteLength(output, "utf8") <= LOCAL_INSPECTOR_JSON_MAX_BYTES) {
			best = output;
			lower = count + 1;
		} else {
			upper = count - 1;
		}
	}
	if (best) return best;
	throw new Error(
		`Local inspector JSON exceeds ${LOCAL_INSPECTOR_JSON_MAX_BYTES} bytes without table rows`,
	);
}

function normalizeFullInventory(inventory: SystemInventory) {
	const storageSource = inventory.sources?.find(
		(source) => source.key === "storage",
	);
	const processSource = inventory.sources?.find(
		(source) => source.key === "processes",
	);
	const storage = limitEntries(
		inventory.storage,
		(volume) => ({
			filesystem: sanitizeText(volume.filesystem),
			mount: sanitizeText(volume.mount),
			size: volume.size ? sanitizeText(volume.size) : null,
			used: volume.used ? sanitizeText(volume.used) : null,
			available: volume.available ? sanitizeText(volume.available) : null,
			capacity: volume.capacity ? sanitizeText(volume.capacity) : null,
		}),
		LOCAL_INSPECTOR_JSON_ROW_BUDGET / 2,
	);
	const processes = limitEntries(
		inventory.processes,
		(processSummary) => ({
			pid: processSummary.pid,
			name: normalizeProcessName(processSummary.command),
			cpu: processSummary.cpu ? sanitizeText(processSummary.cpu) : null,
			memory: processSummary.memory
				? sanitizeText(processSummary.memory)
				: null,
		}),
		LOCAL_INSPECTOR_JSON_ROW_BUDGET / 2,
	);
	const storageTotalCount = Math.max(
		inventory.storage.length,
		storageSource?.totalCount ?? 0,
	);
	const processTotalCount = Math.max(
		inventory.processes.length,
		processSource?.totalCount ?? 0,
	);
	return {
		system: normalizeSystem(inventory.system),
		hardware: {
			...inventory.hardware,
			cpuModel: sanitizeText(inventory.hardware.cpuModel),
		},
		storage: {
			totalCount: storageTotalCount,
			returnedCount: storage.entries.length,
			limit: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
			truncated: storageTotalCount > storage.entries.length,
			volumes: storage.entries,
		},
		processes: {
			totalCount: processTotalCount,
			returnedCount: processes.entries.length,
			limit: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
			truncated: processTotalCount > processes.entries.length,
			entries: processes.entries,
		},
		network: normalizeNetwork(inventory.network),
		permission: {
			user: sanitizeText(inventory.permission.user),
			isAdmin: inventory.permission.isAdmin,
			detail: sanitizeText(inventory.permission.detail),
		},
		runtime: {
			picosVersion: sanitizeText(inventory.runtime.picosVersion),
			nodeVersion: sanitizeText(inventory.runtime.nodeVersion),
			bunVersion: sanitizeText(inventory.runtime.bunVersion),
			configPath: sanitizeText(inventory.runtime.configPath),
		},
		sources: (inventory.sources ?? []).map((source) => ({
			key: source.key,
			command: source.command ? sanitizeText(source.command) : null,
			args: source.args.map(sanitizeText),
			supported: source.supported,
			success: source.success,
			exitCode: source.exitCode,
			truncated: source.truncated,
			totalCount: source.totalCount ?? null,
		})),
	};
}

function normalizeSystem(system: SystemSummary) {
	return {
		hostname: sanitizeText(system.hostname),
		platform: system.platform,
		arch: sanitizeText(system.arch),
		release: sanitizeText(system.release),
		uptimeSeconds: system.uptimeSeconds,
	};
}

function normalizeNetwork(network: NetworkSummary) {
	return {
		status: network.status,
		host: sanitizeText(network.host),
		platform: network.platform,
		gateway: network.gateway ? sanitizeText(network.gateway) : null,
		dnsServers: network.dnsServers.map(sanitizeText),
		publicIp: network.publicIp ? sanitizeText(network.publicIp) : null,
		primaryInterface: network.primaryInterface
			? normalizeInterface(network.primaryInterface)
			: null,
		interfaces: network.interfaces
			.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
			.map(normalizeInterface),
		networkGroups: network.networkGroups
			.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
			.map((group) => ({
				kind: group.kind,
				label: sanitizeText(group.label),
				scope: sanitizeText(group.scope),
				hint: sanitizeText(group.hint),
				interfaces: group.interfaces.map(sanitizeText),
				addresses: group.addresses.map(sanitizeText),
			})),
		sources: (network.sourceOutputs ?? []).map((source) => ({
			key: source.key,
			label: sanitizeText(source.label),
			command: sanitizeText(source.command),
			args: source.args.map(sanitizeText),
			lineCount: source.lineCount,
			shownLines: source.shownLines,
			truncated: source.truncated,
			success: source.success,
			exitCode: source.exitCode,
		})),
		macosServiceNamesByDevice: Object.fromEntries(
			Object.entries(network.macosServiceNamesByDevice ?? {})
				.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
				.map(([device, service]) => [
					sanitizeText(device),
					sanitizeText(service),
				]),
		),
	};
}

function normalizeInterface(networkInterface: NetworkInterfaceSummary) {
	return {
		name: sanitizeText(networkInterface.name),
		status: networkInterface.status,
		kind: networkInterface.kind,
		ipv4: networkInterface.ipv4 ? sanitizeText(networkInterface.ipv4) : null,
		ipv6: networkInterface.ipv6 ? sanitizeText(networkInterface.ipv6) : null,
		ipv4Cidr: networkInterface.ipv4Cidr
			? sanitizeText(networkInterface.ipv4Cidr)
			: null,
		ipv6Cidr: networkInterface.ipv6Cidr
			? sanitizeText(networkInterface.ipv6Cidr)
			: null,
		netmask: networkInterface.netmask
			? sanitizeText(networkInterface.netmask)
			: null,
		mac: networkInterface.mac ? sanitizeText(networkInterface.mac) : null,
		mtu: networkInterface.mtu ?? null,
		rxBytes: networkInterface.rxBytes ?? null,
		txBytes: networkInterface.txBytes ?? null,
		rxPackets: networkInterface.rxPackets ?? null,
		txPackets: networkInterface.txPackets ?? null,
	};
}

function formatQuery(query: InspectorQuery) {
	return {
		filter: normalizeQuery(query.filter),
		sort: query.sort,
	};
}

function normalizeQuery(value: string | number | undefined): string | null {
	if (value === undefined) return null;
	const normalized = String(value).trim();
	return normalized || null;
}

function formatSource(
	command: string,
	args: string[],
	success: boolean | undefined,
	exitCode: number | null | undefined,
	truncated: boolean | undefined,
) {
	return {
		command: sanitizeText(command),
		args: args.map(sanitizeText),
		success: success ?? null,
		exitCode: exitCode ?? null,
		truncated: truncated ?? false,
	};
}

function formatOptionalSource(source: InspectorSourceResult) {
	if (!source.command || !source.args) return null;
	return formatSource(
		source.command,
		source.args,
		source.success,
		source.exitCode,
		source.truncated,
	);
}

function assertSourceCompleted(
	result: InspectorSourceResult,
	label: string,
): void {
	if (result.truncated)
		throw new LocalInspectorSourceError(
			`${label} command output was truncated`,
			result,
		);
	if (result.success === false)
		throw new LocalInspectorSourceError(`${label} command failed`, result);
}

function limitEntries<T, U>(
	entries: T[],
	normalize: (entry: T) => U,
	byteBudget = LOCAL_INSPECTOR_JSON_ROW_BUDGET,
): { entries: U[]; truncated: boolean } {
	const limited: U[] = [];
	let bytes = 0;
	for (const entry of entries.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)) {
		const normalized = normalize(entry);
		const entryBytes =
			Buffer.byteLength(JSON.stringify(normalized), "utf8") + 1;
		if (bytes + entryBytes > byteBudget) break;
		limited.push(normalized);
		bytes += entryBytes;
	}
	return {
		entries: limited,
		truncated: entries.length > limited.length,
	};
}

function normalizeConnection(
	connection: ConnectionsResult["connections"][number],
) {
	return {
		protocol: sanitizeText(connection.protocol),
		localAddress: sanitizeText(connection.localAddress),
		localPort: sanitizeText(connection.localPort),
		remoteAddress: sanitizeText(connection.remoteAddress),
		remotePort: sanitizeText(connection.remotePort),
		state: connection.state ? sanitizeText(connection.state) : null,
		pid: connection.pid ? sanitizeText(connection.pid) : null,
	};
}

function normalizePort(port: PortsResult["ports"][number]) {
	return {
		protocol: sanitizeText(port.protocol),
		localAddress: sanitizeText(port.localAddress),
		localPort: sanitizeText(port.localPort),
		pid: sanitizeText(port.pid),
		command: sanitizeText(port.command),
		user: sanitizeText(port.user),
	};
}

function normalizeRoute(route: RouteTableResult["routes"][number]) {
	return {
		destination: sanitizeText(route.destination),
		gateway: sanitizeText(route.gateway),
		interfaceName: sanitizeText(route.interfaceName),
		family: route.family,
		flags: route.flags ? sanitizeText(route.flags) : null,
		metric: route.metric ?? null,
		protocol: route.protocol ? sanitizeText(route.protocol) : null,
	};
}

function sanitizeRequest(
	request: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(request)
			.slice(0, 32)
			.map(([key, value]) => [key, sanitizeRequestValue(value)]),
	);
}

function sanitizeRequestValue(value: unknown): unknown {
	if (value === undefined) return null;
	if (typeof value === "string") return sanitizeText(value);
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number"
	) {
		return value;
	}
	if (Array.isArray(value)) {
		return value.slice(0, 32).map(sanitizeRequestValue);
	}
	return sanitizeText(String(value));
}

function sanitizeText(value: string): string {
	const scanValue = value.slice(0, LOCAL_INSPECTOR_JSON_REDACTION_SCAN_LIMIT);
	const redacted = redactSensitiveText(scanValue);
	if (redacted.length <= LOCAL_INSPECTOR_JSON_TEXT_LIMIT) return redacted;
	return `${redacted.slice(0, LOCAL_INSPECTOR_JSON_TEXT_LIMIT - 3)}...`;
}

export function sanitizeLocalInspectorText(value: string): string {
	return sanitizeText(value);
}

function redactSensitiveText(value: string): string {
	let redacted = value;
	let lower = redacted.toLowerCase();
	if (lower.includes("://") && redacted.includes("@")) {
		redacted = redacted.replace(
			/([a-z][a-z0-9+.-]{0,31}:\/\/)([^\s/:@]+):([^\s/@]+)@/giu,
			"$1$2:[REDACTED]@",
		);
	}
	lower = redacted.toLowerCase();
	if (
		redacted.includes("=") &&
		["token", "password", "passwd", "secret", "api_key", "api-key"].some(
			(marker) => lower.includes(marker),
		)
	) {
		redacted = redacted.replace(
			/\b([a-z0-9_]{0,128}(?:token|password|passwd|secret|api[_-]?key)[a-z0-9_]{0,128})=([^\s]+)/giu,
			"$1=[REDACTED]",
		);
	}
	lower = redacted.toLowerCase();
	if (
		[
			"--token",
			"--password",
			"--passwd",
			"--secret",
			"--api-key",
			"--private-key",
		].some((marker) => lower.includes(marker))
	) {
		redacted = redacted.replace(
			/(--(?:token|password|passwd|secret|api-key|private-key(?:-path)?)(?:=|\s+))([^\s]+)/giu,
			"$1[REDACTED]",
		);
	}
	if (
		redacted.includes("/Users/") ||
		redacted.includes("/home/") ||
		/[A-Za-z]:\\Users\\/u.test(redacted)
	) {
		redacted = redacted
			.replace(/\/Users\/[^/\s]+|\/home\/[^/\s]+/gu, "$HOME")
			.replace(/[A-Za-z]:\\Users\\[^\\\s]+/gu, "$HOME");
	}
	lower = redacted.toLowerCase();
	if (lower.includes(".ssh")) {
		redacted = redacted.replace(
			/(?:\$HOME|~)?[\\/]\.ssh[\\/](?:id_(?:rsa|dsa|ecdsa|ed25519)|[^\s]{0,512}private[-_]?key[^\s]{0,512})/giu,
			"$HOME/.ssh/[REDACTED]",
		);
	}
	return redacted;
}

function normalizeProcessName(command: string): string {
	const trimmed = command.trim();
	const executable = trimmed.startsWith('"')
		? (trimmed.match(/^"([^"]+)"/)?.[1] ?? trimmed.slice(1))
		: (trimmed.split(/\s+/u)[0] ?? "unknown");
	return sanitizeText(
		executable.replaceAll("\\", "/").split("/").pop() || "unknown",
	);
}

function isLocalInspectorCommand(
	value: string | undefined,
): value is LocalInspectorCommand {
	return (
		value === "info" ||
		value === "routes" ||
		value === "route" ||
		value === "connections" ||
		value === "ports" ||
		value === "doctor" ||
		value === "dns" ||
		value === "tools"
	);
}

function isLocalJsonArgument(value: string): boolean {
	if (value === "--json") return true;
	if (!value.startsWith("--json=")) return false;
	return value.slice("--json=".length).toLowerCase() !== "false";
}
