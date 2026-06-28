import net from "node:net";
import { safeExec } from "../utils/safeExec";
import type {
	PingCommand,
	PingOptions,
	SafeExecResult,
	SupportedPlatform,
	TcpConnectOptions,
	TcpConnectResult,
} from "./types";

const HOST_PATTERN = /^[a-zA-Z0-9_.:-]+$/;

export function assertSafeHost(host: string): string {
	const normalized = host.trim();
	if (
		!normalized ||
		normalized.length > 253 ||
		normalized.startsWith("-") ||
		!HOST_PATTERN.test(normalized)
	) {
		throw new Error(`Invalid host: ${host}`);
	}
	return normalized;
}

export function buildPingCommand(
	host: string,
	platform: SupportedPlatform = process.platform,
	options: PingOptions | number = {},
): PingCommand {
	const safeHost = assertSafeHost(host);
	const normalized = normalizePingOptions(
		typeof options === "number" ? { count: options } : options,
	);

	if (platform === "win32") {
		return {
			command: "ping",
			args: [
				"-n",
				String(normalized.count),
				"-w",
				String(normalized.timeoutMs),
				safeHost,
			],
		};
	}

	if (platform === "linux") {
		return {
			command: "ping",
			args: [
				"-c",
				String(normalized.count),
				"-W",
				String(Math.ceil(normalized.timeoutMs / 1000)),
				safeHost,
			],
		};
	}

	return {
		command: "ping",
		args: [
			"-c",
			String(normalized.count),
			"-W",
			String(normalized.timeoutMs),
			safeHost,
		],
	};
}

export async function runPing(
	host: string,
	platform: SupportedPlatform = process.platform,
	options: PingOptions | number = {},
): Promise<SafeExecResult> {
	const normalized = normalizePingOptions(
		typeof options === "number" ? { count: options } : options,
	);
	const { command, args } = buildPingCommand(host, platform, normalized);
	return safeExec(command, args, { timeoutMs: normalized.timeoutMs + 1000 });
}

export function normalizePingOptions(
	options: PingOptions = {},
): Required<PingOptions> {
	const count = options.count ?? 4;
	const timeoutMs = options.timeoutMs ?? 10000;

	if (!Number.isInteger(count) || count < 1 || count > 10) {
		throw new Error("Invalid ping count");
	}
	if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) {
		throw new Error("Invalid ping timeout");
	}

	return { count, timeoutMs };
}

export function assertSafePort(port: string | number): number {
	const value = typeof port === "number" ? port : Number(port);
	if (!Number.isInteger(value) || value < 1 || value > 65535) {
		throw new Error(`Invalid port: ${port}`);
	}
	return value;
}

type TcpConnectRuntime = TcpConnectOptions & {
	connect?: (host: string, port: number, timeoutMs: number) => Promise<void>;
	now?: () => number;
};

function normalizeTcpTimeout(timeoutMs = 5000): number {
	if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) {
		throw new Error("Invalid connect timeout");
	}
	return timeoutMs;
}

function connectSocket(
	host: string,
	port: number,
	timeoutMs: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const socket = net.createConnection({ host, port });
		const timer = setTimeout(() => {
			socket.destroy();
			reject(new Error("timeout"));
		}, timeoutMs);

		socket.once("connect", () => {
			clearTimeout(timer);
			socket.end();
			resolve();
		});
		socket.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

export async function runTcpConnect(
	host: string,
	port: string | number,
	options: TcpConnectRuntime = {},
): Promise<TcpConnectResult> {
	const safeHost = assertSafeHost(host);
	const safePort = assertSafePort(port);
	const timeoutMs = normalizeTcpTimeout(options.timeoutMs);
	const now = options.now ?? Date.now;
	const connect = options.connect ?? connectSocket;
	const started = now();

	try {
		await connect(safeHost, safePort, timeoutMs);
		return {
			host: safeHost,
			port: safePort,
			reachable: true,
			elapsedMs: Math.max(0, now() - started),
		};
	} catch (caught) {
		return {
			host: safeHost,
			port: safePort,
			reachable: false,
			elapsedMs: Math.max(0, now() - started),
			error: caught instanceof Error ? caught.message : String(caught),
		};
	}
}
