import { safeExec } from "../utils/safeExec";
import { normalizeToolTarget } from "./tools";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type RouteFamily = "ipv4" | "ipv6" | "unknown";

export type RouteEntry = {
	destination: string;
	gateway: string;
	interfaceName: string;
	family: RouteFamily;
	flags?: string;
	metric?: number;
	protocol?: string;
};

export type RouteSortKey =
	| "default"
	| "destination"
	| "gateway"
	| "interface"
	| "family"
	| "metric";

export type SortDirection = "asc" | "desc";

export type RouteSort = {
	key: RouteSortKey;
	direction: SortDirection;
};

const routeSortCycle: RouteSort[] = [
	{ key: "default", direction: "asc" },
	{ key: "destination", direction: "asc" },
	{ key: "gateway", direction: "asc" },
	{ key: "interface", direction: "asc" },
	{ key: "family", direction: "asc" },
	{ key: "metric", direction: "asc" },
	{ key: "metric", direction: "desc" },
];

export type RouteDiagnostic = {
	status: "pass" | "warn";
	label: string;
	detail?: string;
};

export type RouteTableResult = {
	command: string;
	args: string[];
	routes: RouteEntry[];
	diagnostics: RouteDiagnostic[];
	rawOutput: string;
};

export type RoutePathResult = {
	destination: string;
	gateway?: string;
	interfaceName?: string;
	sourceIp?: string;
	rawOutput: string;
};

export function buildRouteTableCommand(
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } {
	if (platform === "linux") {
		return { command: "ip", args: ["route", "show", "table", "all"] };
	}
	if (platform === "win32") {
		return { command: "route", args: ["PRINT"] };
	}
	return { command: "netstat", args: ["-rn"] };
}

export function buildRoutePathCommand(
	destination: string,
	platform: SupportedPlatform = process.platform,
): { command: string; args: string[] } {
	const safeDestination = normalizeToolTarget(destination);
	if (platform === "linux") {
		return { command: "ip", args: ["route", "get", safeDestination] };
	}
	if (platform === "win32") {
		return { command: "route", args: ["PRINT", safeDestination] };
	}
	return { command: "route", args: ["-n", "get", safeDestination] };
}

export async function runRouteTable(
	platform: SupportedPlatform = process.platform,
): Promise<RouteTableResult> {
	const routeCommand = buildRouteTableCommand(platform);
	const result = await safeExec(routeCommand.command, routeCommand.args, {
		timeoutMs: 10000,
	});
	const routes = parseRoutes(result.stdout || result.stderr, platform);
	return {
		...routeCommand,
		routes,
		diagnostics: diagnoseRoutes(routes),
		rawOutput: formatRawCommand(result),
	};
}

export async function runRoutePath(
	destination: string,
	platform: SupportedPlatform = process.platform,
): Promise<RoutePathResult> {
	const routeCommand = buildRoutePathCommand(destination, platform);
	const result = await safeExec(routeCommand.command, routeCommand.args, {
		timeoutMs: 10000,
	});
	const rawOutput = formatRawCommand(result);
	if (platform === "linux") {
		return parseLinuxRoutePath(destination, result.stdout || result.stderr);
	}
	if (platform === "darwin") {
		return parseMacosRoutePath(destination, result.stdout || result.stderr);
	}
	return { destination, rawOutput };
}

export function parseRoutes(
	output: string,
	platform: SupportedPlatform = process.platform,
): RouteEntry[] {
	if (platform === "linux") {
		return parseLinuxIpRoutes(output);
	}
	if (platform === "win32") {
		return parseWindowsRoutePrint(output);
	}
	return parseMacosNetstatRoutes(output);
}

export function parseLinuxIpRoutes(output: string): RouteEntry[] {
	const routes: RouteEntry[] = [];
	for (const line of output.split(/\r?\n/)) {
		const parts = line.trim().split(/\s+/).filter(Boolean);
		if (!parts.length || !isLinuxRouteLine(line)) {
			continue;
		}
		const destination = parts[0] ?? "unknown";
		const interfaceName = valueAfter(parts, "dev") ?? "-";
		const gateway = valueAfter(parts, "via") ?? "link";
		routes.push({
			destination,
			gateway,
			interfaceName,
			family:
				destination.includes(":") || gateway.includes(":") ? "ipv6" : "ipv4",
			metric: numberAfter(parts, "metric"),
			protocol: valueAfter(parts, "proto"),
		});
	}
	return routes;
}

export function parseMacosNetstatRoutes(output: string): RouteEntry[] {
	const routes: RouteEntry[] = [];
	let family: RouteFamily = "unknown";
	for (const line of output.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === "Internet:" || trimmed.startsWith("Internet ")) {
			family = "ipv4";
			continue;
		}
		if (trimmed === "Internet6:" || trimmed.startsWith("Internet6 ")) {
			family = "ipv6";
			continue;
		}
		const parts = trimmed.split(/\s+/).filter(Boolean);
		if (
			family === "unknown" ||
			parts.length < 4 ||
			parts[0] === "Destination"
		) {
			continue;
		}
		routes.push({
			destination: parts[0] ?? "-",
			gateway: parts[1] ?? "-",
			flags: parts[2],
			interfaceName: parts[3] ?? "-",
			family,
		});
	}
	return routes;
}

export function parseWindowsRoutePrint(output: string): RouteEntry[] {
	const routes: RouteEntry[] = [];
	let family: RouteFamily = "unknown";
	let active = false;

	for (const line of output.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.startsWith("IPv4 Route Table")) {
			family = "ipv4";
			active = false;
			continue;
		}
		if (trimmed.startsWith("IPv6 Route Table")) {
			family = "ipv6";
			active = false;
			continue;
		}
		if (trimmed.startsWith("Active Routes:")) {
			active = true;
			continue;
		}
		if (!active || trimmed.startsWith("Network") || trimmed.startsWith("=")) {
			continue;
		}
		const parts = trimmed.split(/\s+/).filter(Boolean);
		if (family === "ipv4" && parts.length >= 5) {
			routes.push({
				destination:
					parts[0] === "0.0.0.0" && parts[1] === "0.0.0.0"
						? "default"
						: `${parts[0]}/${parts[1]}`,
				gateway: parts[2] ?? "-",
				interfaceName: parts[3] ?? "-",
				metric: Number(parts[4]),
				family,
			});
		}
	}

	return routes;
}

export function diagnoseRoutes(routes: RouteEntry[]): RouteDiagnostic[] {
	const defaults = routes.filter((route) => route.destination === "default");
	const diagnostics: RouteDiagnostic[] = [
		defaults.length
			? {
					status: "pass",
					label: "Default route present",
					detail: `${defaults.length} default route(s)`,
				}
			: { status: "warn", label: "Default route missing" },
	];

	if (defaults.length > 1) {
		diagnostics.push({
			status: "warn",
			label: "Multiple default routes",
			detail: defaults.map((route) => route.interfaceName).join(", "),
		});
	}

	const missingInterfaces = routes.filter(
		(route) => route.interfaceName === "-",
	);
	if (missingInterfaces.length > 0) {
		diagnostics.push({
			status: "warn",
			label: "Routes with unknown interface",
			detail: String(missingInterfaces.length),
		});
	}

	return diagnostics;
}

export function parseRouteSort(value: string | undefined): RouteSort {
	if (!value) {
		return { key: "default", direction: "asc" };
	}
	const direction: SortDirection = value.startsWith("-") ? "desc" : "asc";
	const key = value.replace(/^-/, "");
	if (!isRouteSortKey(key)) {
		throw new Error(`Invalid route sort: ${value}`);
	}
	return { key, direction };
}

export function sortRouteEntries(
	routes: RouteEntry[],
	sort: RouteSort = { key: "default", direction: "asc" },
): RouteEntry[] {
	return routes
		.map((route, index) => ({ route, index }))
		.sort((left, right) => {
			const compared = compareRoutes(left.route, right.route, sort.key);
			const directed = sort.direction === "desc" ? -compared : compared;
			return directed || left.index - right.index;
		})
		.map((item) => item.route);
}

export function nextRouteSort(current: RouteSort): RouteSort {
	const index = routeSortCycle.findIndex(
		(item) => item.key === current.key && item.direction === current.direction,
	);
	return (
		routeSortCycle[(index + 1) % routeSortCycle.length] ?? routeSortCycle[0]
	);
}

export function parseLinuxRoutePath(
	destination: string,
	output: string,
): RoutePathResult {
	const firstLine = output.split(/\r?\n/)[0]?.trim() ?? "";
	const parts = firstLine.split(/\s+/).filter(Boolean);
	return {
		destination,
		gateway: valueAfter(parts, "via"),
		interfaceName: valueAfter(parts, "dev"),
		sourceIp: valueAfter(parts, "src"),
		rawOutput: output,
	};
}

export function parseMacosRoutePath(
	destination: string,
	output: string,
): RoutePathResult {
	const result: RoutePathResult = { destination, rawOutput: output };
	for (const line of output.split(/\r?\n/)) {
		const [key, ...rest] = line.trim().split(/\s+/);
		const value = rest.join(" ");
		if (key === "gateway:") {
			result.gateway = value;
		}
		if (key === "interface:") {
			result.interfaceName = value;
		}
	}
	return result;
}

export function formatRouteTable(
	result: RouteTableResult,
	options: { sort?: RouteSort } = {},
): string {
	const lines = ["picos routes", ""];
	lines.push("[Summary]");
	lines.push(`Routes: ${result.routes.length}`);
	if (options.sort) {
		lines.push(`Sort: ${options.sort.key} ${options.sort.direction}`);
	}
	for (const diagnostic of result.diagnostics) {
		lines.push(`${diagnostic.status.toUpperCase()} ${diagnostic.label}`);
	}
	lines.push("");
	lines.push("[Routes]");
	for (const route of sortRouteEntries(result.routes, options.sort).slice(
		0,
		80,
	)) {
		lines.push(
			`${route.destination.padEnd(18)} ${route.gateway.padEnd(18)} ${route.interfaceName.padEnd(10)} ${route.family}`,
		);
	}
	return lines.join("\n");
}

function compareRoutes(
	left: RouteEntry,
	right: RouteEntry,
	key: RouteSortKey,
): number {
	if (key === "default") {
		return (
			Number(right.destination === "default") -
				Number(left.destination === "default") ||
			compareRouteField(left.destination, right.destination)
		);
	}
	if (key === "metric") {
		return (
			(left.metric ?? Number.POSITIVE_INFINITY) -
			(right.metric ?? Number.POSITIVE_INFINITY)
		);
	}
	return compareRouteField(
		routeSortValue(left, key),
		routeSortValue(right, key),
	);
}

function routeSortValue(
	route: RouteEntry,
	key: Exclude<RouteSortKey, "default" | "metric">,
): string {
	if (key === "interface") {
		return route.interfaceName;
	}
	return route[key];
}

function compareRouteField(left: string, right: string): number {
	return left.localeCompare(right, undefined, {
		numeric: true,
		sensitivity: "base",
	});
}

function isRouteSortKey(value: string): value is RouteSortKey {
	return [
		"default",
		"destination",
		"gateway",
		"interface",
		"family",
		"metric",
	].includes(value);
}

function isLinuxRouteLine(line: string): boolean {
	return (
		line.startsWith("default ") ||
		line.includes(" dev ") ||
		line.startsWith("broadcast ")
	);
}

function valueAfter(parts: string[], key: string): string | undefined {
	const index = parts.indexOf(key);
	return index >= 0 ? parts[index + 1] : undefined;
}

function numberAfter(parts: string[], key: string): number | undefined {
	const value = valueAfter(parts, key);
	if (!value) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function formatRawCommand(result: SafeExecResult): string {
	const output = result.stdout || result.stderr;
	return `$ ${result.command} ${result.args.join(" ")}\n${output}`;
}
