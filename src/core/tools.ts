import { promises as dns } from "node:dns";
import tls from "node:tls";
import { type SafeExecOptions, safeExec } from "../utils/safeExec";
import {
	assertSafeHost,
	assertSafePort,
	runPing,
	runTcpConnect,
} from "./command";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type ToolId =
	| "dns"
	| "whois"
	| "ip-info"
	| "port-check"
	| "telnet"
	| "tls"
	| "ping"
	| "traceroute";

export type ToolDefinition = {
	id: ToolId;
	name: string;
	description: string;
	fields: {
		key: string;
		label: string;
		placeholder: string;
	}[];
};

export type ToolResultSection = {
	label: string;
	lines: string[];
};

export type ToolResult = {
	title: string;
	sections: ToolResultSection[];
	rawOutput: string;
};

type ToolRuntime = {
	fetch?: ToolFetch;
	platform?: SupportedPlatform;
	timeoutMs?: number;
	runner?: ToolCommandRunner;
	connect?: (host: string, port: number, timeoutMs: number) => Promise<void>;
	inspectTls?: (
		host: string,
		port: number,
		timeoutMs: number,
	) => Promise<TlsInspection>;
	now?: () => number;
};

type ToolFetch = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

type ToolCommandRunner = (
	command: string,
	args: string[],
	options?: SafeExecOptions,
) => Promise<SafeExecResult>;

type TracerouteCommand = {
	command: string;
	args: string[];
};

export type TlsInspection = {
	host: string;
	port: number;
	authorized: boolean;
	protocol: string;
	cipher: string;
	subject: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	subjectAltName: string;
	certificateCount: number;
};

const TARGET_PATTERN = /^[a-zA-Z0-9_.:-]+$/;

const toolDefinitions: ToolDefinition[] = [
	{
		id: "dns",
		name: "DNS Lookup",
		description: "Resolve DNS, reverse DNS, MX, CNAME, A, and AAAA records.",
		fields: [{ key: "target", label: "Target", placeholder: "example.com" }],
	},
	{
		id: "whois",
		name: "WHOIS/RDAP Lookup",
		description: "Read public registration metadata through RDAP.",
		fields: [{ key: "target", label: "Target", placeholder: "github.com" }],
	},
	{
		id: "ip-info",
		name: "IP Information",
		description: "Read ASN, organization, country, and reverse DNS metadata.",
		fields: [{ key: "ip", label: "IP", placeholder: "8.8.8.8" }],
	},
	{
		id: "port-check",
		name: "TCP Port Check",
		description: "Check TCP connectivity to a host and port.",
		fields: [
			{ key: "host", label: "Host", placeholder: "github.com" },
			{ key: "port", label: "Port", placeholder: "443" },
		],
	},
	{
		id: "telnet",
		name: "Telnet TCP Check",
		description:
			"Run a familiar telnet-style TCP reachability check without opening a shell session.",
		fields: [
			{ key: "host", label: "Host", placeholder: "github.com" },
			{ key: "port", label: "Port", placeholder: "443" },
		],
	},
	{
		id: "tls",
		name: "TLS Inspector",
		description: "Inspect TLS protocol, cipher, and certificate metadata.",
		fields: [{ key: "target", label: "Target", placeholder: "github.com:443" }],
	},
	{
		id: "ping",
		name: "Ping",
		description: "Measure reachability with the platform ping command.",
		fields: [{ key: "target", label: "Target", placeholder: "8.8.8.8" }],
	},
	{
		id: "traceroute",
		name: "Traceroute",
		description: "Trace the network path to a target host.",
		fields: [{ key: "target", label: "Target", placeholder: "8.8.8.8" }],
	},
];

export function getToolDefinitions(): ToolDefinition[] {
	return toolDefinitions.map((tool) => ({
		...tool,
		fields: tool.fields.map((field) => ({ ...field })),
	}));
}

export function normalizeToolTarget(target: string): string {
	const normalized = target.trim();
	if (
		!normalized ||
		normalized.length > 253 ||
		normalized.startsWith("-") ||
		!TARGET_PATTERN.test(normalized)
	) {
		throw new Error(`Invalid target: ${target}`);
	}
	return normalized;
}

export async function runTool(
	id: string,
	args: string[],
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const toolId = normalizeToolId(id);

	if (toolId === "dns") {
		return runDnsLookup(requiredArg(args, 0, "target"));
	}
	if (toolId === "whois") {
		return runWhoisLookup(requiredArg(args, 0, "target"), runtime);
	}
	if (toolId === "ip-info") {
		return runIpInfo(requiredArg(args, 0, "ip"), runtime);
	}
	if (toolId === "port-check") {
		return runPortCheck(
			requiredArg(args, 0, "host"),
			requiredArg(args, 1, "port"),
			runtime,
		);
	}
	if (toolId === "telnet") {
		return runPortCheck(
			requiredArg(args, 0, "host"),
			requiredArg(args, 1, "port"),
			runtime,
			{
				commandId: "telnet",
				title: "Telnet TCP Check",
			},
		);
	}
	if (toolId === "tls") {
		return runTlsInspect(requiredArg(args, 0, "target"), runtime);
	}
	if (toolId === "ping") {
		return runPingTool(requiredArg(args, 0, "target"), runtime);
	}
	if (toolId === "traceroute") {
		return runTraceroute(requiredArg(args, 0, "target"), runtime);
	}

	throw new Error(`Unknown tool: ${id}`);
}

export async function runDnsLookup(target: string): Promise<ToolResult> {
	const safeTarget = normalizeToolTarget(target);
	const sections: ToolResultSection[] = [];
	const rawLines = [`$ picos tools dns ${safeTarget}`];

	if (isIpAddressLike(safeTarget)) {
		const reverse = await settle(() => dns.reverse(safeTarget));
		sections.push({
			label: "Reverse DNS",
			lines: reverse.ok ? reverse.value : [reverse.error],
		});
		rawLines.push(...sectionToRaw(sections.at(-1)));
		return { title: "DNS Lookup", sections, rawOutput: rawLines.join("\n") };
	}

	const [a, aaaa, mx, cname] = await Promise.all([
		settle(() => dns.resolve4(safeTarget)),
		settle(() => dns.resolve6(safeTarget)),
		settle(() => dns.resolveMx(safeTarget)),
		settle(() => dns.resolveCname(safeTarget)),
	]);

	sections.push({
		label: "Summary",
		lines: [
			`Query: ${safeTarget}`,
			`A: ${a.ok ? a.value.length : 0}`,
			`AAAA: ${aaaa.ok ? aaaa.value.length : 0}`,
			`MX: ${mx.ok ? mx.value.length : 0}`,
			`CNAME: ${cname.ok ? cname.value.length : 0}`,
		],
	});
	sections.push({
		label: "A Records",
		lines: a.ok ? a.value : [a.error],
	});
	sections.push({
		label: "AAAA Records",
		lines: aaaa.ok ? aaaa.value : [aaaa.error],
	});
	sections.push({
		label: "MX Records",
		lines: mx.ok
			? mx.value.map((record) => `${record.priority} ${record.exchange}`)
			: [mx.error],
	});
	sections.push({
		label: "CNAME Records",
		lines: cname.ok ? cname.value : [cname.error],
	});

	for (const section of sections) {
		rawLines.push(...sectionToRaw(section));
	}

	return {
		title: "DNS Lookup",
		sections,
		rawOutput: rawLines.join("\n"),
	};
}

export async function runWhoisLookup(
	target: string,
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const safeTarget = normalizeToolTarget(target);
	const fetcher = runtime.fetch ?? fetch;
	const kind = isIpAddressLike(safeTarget) ? "ip" : "domain";
	const url = `https://rdap.org/${kind}/${safeTarget}`;
	const response = await fetcher(url, {
		signal: AbortSignal.timeout(runtime.timeoutMs ?? 10000),
	});
	const data = (await response.json()) as Record<string, unknown>;
	const sections = [
		{
			label: "RDAP",
			lines: [
				`Target: ${safeTarget}`,
				`Status: ${response.status}`,
				`Handle: ${stringValue(data.handle)}`,
				`Name: ${stringValue(data.name)}`,
				`Object: ${stringValue(data.objectClassName)}`,
			],
		},
	];

	return {
		title: "WHOIS/RDAP Lookup",
		sections,
		rawOutput: `$ picos tools whois ${safeTarget}\n${JSON.stringify(data, null, 2)}`,
	};
}

export async function runIpInfo(
	ip: string,
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const safeIp = normalizeToolTarget(ip);
	const fetcher = runtime.fetch ?? fetch;
	const response = await fetcher(`https://ipinfo.io/${safeIp}/json`, {
		signal: AbortSignal.timeout(runtime.timeoutMs ?? 10000),
	});
	const data = (await response.json()) as Record<string, unknown>;
	const sections = [
		{
			label: "IP Information",
			lines: [
				`IP: ${stringValue(data.ip)}`,
				`Hostname: ${stringValue(data.hostname)}`,
				`Organization: ${stringValue(data.org)}`,
				`City: ${stringValue(data.city)}`,
				`Region: ${stringValue(data.region)}`,
				`Country: ${stringValue(data.country)}`,
			],
		},
	];

	return {
		title: "IP Information",
		sections,
		rawOutput: `$ picos tools ip-info ${safeIp}\n${JSON.stringify(data, null, 2)}`,
	};
}

export async function runPortCheck(
	host: string,
	port: string,
	runtime: ToolRuntime = {},
	options: { commandId?: "port-check" | "telnet"; title?: string } = {},
): Promise<ToolResult> {
	const commandId = options.commandId ?? "port-check";
	const result = await runTcpConnect(host, port, {
		timeoutMs: runtime.timeoutMs,
		connect: runtime.connect,
		now: runtime.now,
	});
	const timeoutMs = runtime.timeoutMs ?? 5000;
	const sections = [
		{
			label: "Target",
			lines: [
				`Host: ${result.host}`,
				`Port: ${result.port}`,
				`Command: picos tools ${commandId} ${result.host} ${result.port}`,
				`Timeout: ${timeoutMs}ms`,
			],
		},
		{
			label: "Status",
			lines: [
				result.reachable ? "OPEN" : "CLOSED",
				`Elapsed: ${result.elapsedMs}ms`,
				...(result.error ? [`Error: ${result.error}`] : []),
			],
		},
	];

	return {
		title: options.title ?? "TCP Port Check",
		sections,
		rawOutput: [
			`$ picos tools ${commandId} ${result.host} ${result.port}`,
			...sections.flatMap(sectionToRaw),
		].join("\n"),
	};
}

export async function runTlsInspect(
	target: string,
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const { host, port } = splitHostPort(target, 443);
	const timeoutMs = runtime.timeoutMs ?? 10000;
	const inspected = await (runtime.inspectTls ?? inspectTls)(
		host,
		port,
		timeoutMs,
	);
	const sections = [
		{
			label: "Target",
			lines: [
				`Host: ${inspected.host}`,
				`Port: ${inspected.port}`,
				`Command: picos tools tls ${inspected.host}:${inspected.port}`,
				`Timeout: ${timeoutMs}ms`,
			],
		},
		{
			label: "Status",
			lines: [
				`Authorized: ${inspected.authorized ? "yes" : "no"}`,
				`Protocol: ${inspected.protocol}`,
				`Cipher: ${inspected.cipher}`,
			],
		},
		{
			label: "Certificate",
			lines: [
				`Subject: ${inspected.subject}`,
				`Issuer: ${inspected.issuer}`,
				`Valid From: ${inspected.validFrom}`,
				`Valid To: ${inspected.validTo}`,
				`SAN: ${inspected.subjectAltName}`,
				`Chain Certificates: ${inspected.certificateCount}`,
			],
		},
	];

	return {
		title: "TLS Inspector",
		sections,
		rawOutput: [
			`$ picos tools tls ${inspected.host}:${inspected.port}`,
			...sections.flatMap(sectionToRaw),
		].join("\n"),
	};
}

export async function runPingTool(
	target: string,
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const safeTarget = normalizeToolTarget(target);
	const result = await runPing(safeTarget, runtime.platform, {
		count: 4,
		timeoutMs: runtime.timeoutMs ?? 10000,
	});
	return commandResultToToolResult("Ping", result);
}

export async function runTraceroute(
	target: string,
	runtime: ToolRuntime = {},
): Promise<ToolResult> {
	const platform = runtime.platform ?? process.platform;
	const safeTarget = normalizeToolTarget(target);
	const command = buildTracerouteCommand(safeTarget, platform);
	const runner = runtime.runner ?? safeExec;
	const timeoutMs = runtime.timeoutMs ?? 30000;
	const result = await runner(command.command, command.args, { timeoutMs });
	return tracerouteResultToToolResult(safeTarget, platform, timeoutMs, result);
}

export function buildTracerouteCommand(
	target: string,
	platform: SupportedPlatform = process.platform,
): TracerouteCommand {
	const safeTarget = normalizeToolTarget(target);
	if (platform === "win32") {
		return { command: "tracert", args: ["-d", safeTarget] };
	}
	return { command: "traceroute", args: [safeTarget] };
}

export function formatToolResult(result: ToolResult): string {
	const lines = [`picos ${result.title}`, ""];
	for (const section of result.sections) {
		lines.push(`[${section.label}]`);
		lines.push(...section.lines);
		lines.push("");
	}
	return lines.join("\n").trimEnd();
}

function normalizeToolId(id: string): ToolId {
	const aliases: Record<string, ToolId> = {
		dns: "dns",
		"dns-lookup": "dns",
		whois: "whois",
		"whois-lookup": "whois",
		"ip-info": "ip-info",
		"ip-information": "ip-info",
		"port-check": "port-check",
		telnet: "telnet",
		tls: "tls",
		"tls-inspector": "tls",
		ping: "ping",
		traceroute: "traceroute",
	};
	const normalized = aliases[id];
	if (!normalized) {
		throw new Error(`Unknown tool: ${id}`);
	}
	return normalized;
}

function requiredArg(args: string[], index: number, label: string): string {
	const value = args[index];
	if (!value) {
		throw new Error(`Missing ${label}`);
	}
	return value;
}

type Settled<T> =
	| { ok: true; value: T }
	| {
			ok: false;
			error: string;
	  };

async function settle<T>(fn: () => Promise<T>): Promise<Settled<T>> {
	try {
		return { ok: true, value: await fn() };
	} catch (caught) {
		return {
			ok: false,
			error: caught instanceof Error ? caught.message : String(caught),
		};
	}
}

function sectionToRaw(section?: ToolResultSection): string[] {
	if (!section) {
		return [];
	}
	return [`[${section.label}]`, ...section.lines];
}

function isIpAddressLike(value: string): boolean {
	return /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":");
}

function stringValue(value: unknown): string {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	if (typeof value === "number") {
		return String(value);
	}
	return "-";
}

function splitHostPort(
	target: string,
	defaultPort: number,
): {
	host: string;
	port: number;
} {
	const safeTarget = normalizeToolTarget(target);
	const lastColon = safeTarget.lastIndexOf(":");
	if (lastColon > 0 && !safeTarget.includes("]")) {
		const host = assertSafeHost(safeTarget.slice(0, lastColon));
		const port = assertSafePort(safeTarget.slice(lastColon + 1));
		return { host, port };
	}
	return { host: assertSafeHost(safeTarget), port: defaultPort };
}

function inspectTls(
	host: string,
	port: number,
	timeoutMs: number,
): Promise<TlsInspection> {
	return new Promise((resolve, reject) => {
		const socket = tls.connect({
			host,
			port,
			servername: host,
			rejectUnauthorized: false,
		});
		const timer = setTimeout(() => {
			socket.destroy();
			reject(new Error("TLS inspection timed out"));
		}, timeoutMs);

		socket.once("secureConnect", () => {
			clearTimeout(timer);
			const certificate = socket.getPeerCertificate();
			const cipher = socket.getCipher();
			const inspection = {
				host,
				port,
				authorized: socket.authorized,
				protocol: socket.getProtocol() ?? "-",
				cipher: cipher?.name ?? "-",
				subject: formatCertificateName(certificate.subject?.CN),
				issuer: formatCertificateName(certificate.issuer?.CN),
				validFrom: certificate.valid_from ?? "-",
				validTo: certificate.valid_to ?? "-",
				subjectAltName: certificate.subjectaltname ?? "-",
				certificateCount: countPeerCertificates(certificate),
			};
			socket.end();
			resolve(inspection);
		});
		socket.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

function countPeerCertificates(certificate: tls.PeerCertificate): number {
	let count = 0;
	let current: PeerCertificateWithIssuer | undefined = certificate;
	const seen = new Set<tls.PeerCertificate>();
	while (current && !seen.has(current)) {
		seen.add(current);
		count += 1;
		const next: PeerCertificateWithIssuer | undefined =
			current.issuerCertificate;
		if (!next || next === current) {
			break;
		}
		current = next;
	}
	return count;
}

type PeerCertificateWithIssuer = tls.PeerCertificate & {
	issuerCertificate?: PeerCertificateWithIssuer;
};

function formatCertificateName(value: string | string[] | undefined): string {
	if (Array.isArray(value)) {
		return value.join(", ");
	}
	return value ?? "-";
}

function tracerouteResultToToolResult(
	target: string,
	platform: SupportedPlatform,
	timeoutMs: number,
	result: SafeExecResult,
): ToolResult {
	const output = result.stdout || result.stderr || "(no output)";
	const outputLines = output.split(/\r?\n/).filter(Boolean);
	const hopLines = parseTracerouteHops(outputLines);
	const sections = [
		{
			label: "Target",
			lines: [
				`Host: ${target}`,
				`Command: ${result.command} ${result.args.join(" ")}`.trimEnd(),
				`Platform: ${platform}`,
				`Timeout: ${timeoutMs}ms`,
			],
		},
		{
			label: "Status",
			lines: [
				`Exit: ${result.exitCode ?? "timeout"}`,
				`Result: ${result.success ? "ok" : "fail"}`,
				`Output Lines: ${outputLines.length}`,
			],
		},
		{
			label: "Hops",
			lines: hopLines.length > 0 ? hopLines : outputLines.slice(0, 40),
		},
	];

	return {
		title: "Traceroute",
		sections,
		rawOutput: [
			`$ ${result.command} ${result.args.join(" ")}`.trimEnd(),
			...sections.flatMap(sectionToRaw),
			"[Source Output]",
			output,
		].join("\n"),
	};
}

function parseTracerouteHops(lines: string[]): string[] {
	return lines
		.map((line) => line.trim())
		.filter((line) => /^\d+\s+/.test(line))
		.map((line) => line.replace(/\s+/g, " "))
		.slice(0, 64);
}

function commandResultToToolResult(
	title: string,
	result: SafeExecResult,
): ToolResult {
	const output = result.stdout || result.stderr || "(no output)";
	return {
		title,
		sections: [
			{
				label: result.success ? "Output" : "Error",
				lines: output.split(/\r?\n/).slice(0, 80),
			},
		],
		rawOutput: `$ ${result.command} ${result.args.join(" ")}\n${output}`,
	};
}
