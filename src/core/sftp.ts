import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { posix, resolve } from "node:path";
import type {
	Client,
	ConnectConfig,
	FileEntryWithStats,
	SFTPWrapper,
	Stats,
} from "ssh2";
import type { FileEntry, FileEntryType, FileProvider } from "./files";
import type { SftpRemoteProfile } from "./types";

export type ReadOnlySftpSessionEntry = {
	name: string;
	type: FileEntryType;
	size: number;
	modifiedAt?: Date;
};

export type ReadOnlySftpSessionStat = Omit<ReadOnlySftpSessionEntry, "name">;

export type ReadOnlySftpSession = {
	realpath(path: string): Promise<string>;
	list(path: string): Promise<ReadOnlySftpSessionEntry[]>;
	read(path: string, maxBytes: number): Promise<Buffer>;
	stat(path: string): Promise<ReadOnlySftpSessionStat>;
	close(): Promise<void>;
};

export type ConnectReadOnlySftpOptions = {
	expectedHostKeyFingerprint: string;
	readyTimeoutMs?: number;
	agentPath?: string;
	signal?: AbortSignal;
	connect?: (
		profile: SftpRemoteProfile,
		options: Required<
			Pick<ConnectReadOnlySftpOptions, "expectedHostKeyFingerprint">
		> &
			Omit<
				ConnectReadOnlySftpOptions,
				"expectedHostKeyFingerprint" | "connect"
			>,
	) => Promise<ReadOnlySftpSession>;
};

export type ReadOnlySftpConnectionOutcome = {
	status: "connected" | "completed" | "failed" | "cancelled";
	id: string;
	target: string;
	host: string;
	port: number;
	fingerprint: string;
	network?: "opened" | "closed" | "unknown";
	message: string;
};

export type ReadOnlySftpConnectionDiagnosticStatus =
	| "connecting"
	| "cancelling"
	| "connected"
	| "failed"
	| "cancelled"
	| "disconnected";

export type ReadOnlySftpConnectionDiagnostic = {
	id: string;
	target: string;
	fingerprint: string;
	status: ReadOnlySftpConnectionDiagnosticStatus;
	attempt: number;
	startedAt: number;
	finishedAt?: number;
	durationMs?: number;
	message: string;
};

export class ReadOnlySftpConnectionCancelledError extends Error {
	readonly code = "PICOS_SFTP_CANCELLED";

	constructor(message = "SFTP connection cancelled") {
		super(message);
		this.name = "ReadOnlySftpConnectionCancelledError";
	}
}

export const DEFAULT_SFTP_MAX_READ_BYTES = 256 * 1024;
export const MAX_SFTP_READ_BYTES = 1024 * 1024;
const MAX_SFTP_DIRECTORY_ENTRIES = 10_000;
const MAX_SFTP_DIRECTORY_NAME_BYTES = 1024 * 1024;
const DEFAULT_READY_TIMEOUT_MS = 10_000;
const SFTP_EOF_STATUS_CODE = 1;

export async function connectReadOnlySftpFileProvider(
	profile: SftpRemoteProfile,
	options: ConnectReadOnlySftpOptions,
): Promise<FileProvider> {
	const expectedHostKeyFingerprint = normalizeSftpHostKeyFingerprint(
		options.expectedHostKeyFingerprint,
	);
	if (!expectedHostKeyFingerprint) {
		throw new Error(
			"SFTP connect requires a trusted SHA256 host key fingerprint",
		);
	}
	if (options.signal?.aborted) {
		throw new ReadOnlySftpConnectionCancelledError();
	}
	const connect = options.connect ?? connectSsh2Session;
	const session = await connect(profile, {
		expectedHostKeyFingerprint,
		readyTimeoutMs: options.readyTimeoutMs,
		agentPath: options.agentPath,
		signal: options.signal,
	});
	try {
		const resolvedRoot = await session.realpath(profile.root);
		if (options.signal?.aborted) {
			throw new ReadOnlySftpConnectionCancelledError();
		}
		return createReadOnlySftpFileProvider(profile, session, resolvedRoot);
	} catch (caught) {
		await session.close().catch(() => undefined);
		if (options.signal?.aborted) {
			throw new ReadOnlySftpConnectionCancelledError();
		}
		throw caught;
	}
}

export function startReadOnlySftpConnectionDiagnostic(
	profile: SftpRemoteProfile,
	fingerprint: string,
	previous?: ReadOnlySftpConnectionDiagnostic,
	now = Date.now(),
): ReadOnlySftpConnectionDiagnostic {
	return {
		id: profile.id,
		target: formatSftpProfileUri(profile),
		fingerprint,
		status: "connecting",
		attempt: previous?.id === profile.id ? previous.attempt + 1 : 1,
		startedAt: now,
		message: "opening host-verified read-only SFTP session",
	};
}

export function requestReadOnlySftpConnectionCancellation(
	diagnostic: ReadOnlySftpConnectionDiagnostic,
): ReadOnlySftpConnectionDiagnostic {
	return diagnostic.status === "connecting"
		? {
				...diagnostic,
				status: "cancelling",
				message: "cancellation requested; closing transport",
			}
		: diagnostic;
}

export function finishReadOnlySftpConnectionDiagnostic(
	diagnostic: ReadOnlySftpConnectionDiagnostic,
	status: Extract<
		ReadOnlySftpConnectionDiagnosticStatus,
		"connected" | "failed" | "cancelled" | "disconnected"
	>,
	message: string,
	now = Date.now(),
): ReadOnlySftpConnectionDiagnostic {
	return {
		...diagnostic,
		status,
		finishedAt: now,
		durationMs: Math.max(0, now - diagnostic.startedAt),
		message,
	};
}

export function formatReadOnlySftpConnectionDiagnosticRows(
	diagnostic?: ReadOnlySftpConnectionDiagnostic,
): string[] {
	if (!diagnostic) {
		return [
			"REMOTE SESSION CONTROL none",
			"status=idle attempt=0 duration=- network=closed",
			"target=none",
			"capabilities=list,stat,read writes=locked exec=unsupported",
			"controls=c exact-confirm connect",
		];
	}
	const network =
		diagnostic.status === "connected"
			? "opened"
			: diagnostic.status === "connecting"
				? "opening"
				: diagnostic.status === "cancelling"
					? "closing"
					: "closed";
	const duration =
		diagnostic.durationMs === undefined
			? "running"
			: `${diagnostic.durationMs}ms`;
	const controls =
		diagnostic.status === "connecting" || diagnostic.status === "cancelling"
			? "X cancel pending connection"
			: diagnostic.status === "failed" || diagnostic.status === "cancelled"
				? "R retry via exact confirmation · c new connect"
				: diagnostic.status === "connected"
					? "Files L disconnect · remote writes locked"
					: "c exact-confirm reconnect";
	return [
		`REMOTE SESSION CONTROL ${diagnostic.id}`,
		`status=${diagnostic.status} attempt=${diagnostic.attempt} duration=${duration} network=${network}`,
		`target=${diagnostic.target}`,
		`hostKey=${diagnostic.fingerprint} capabilities=list,stat,read writes=locked exec=unsupported`,
		`message=${quoteSftpAuditValue(diagnostic.message)}`,
		`controls=${controls}`,
	];
}

export function isReadOnlySftpConnectionCancelledError(
	caught: unknown,
): caught is ReadOnlySftpConnectionCancelledError {
	return (
		caught instanceof ReadOnlySftpConnectionCancelledError ||
		(caught instanceof Error &&
			"code" in caught &&
			caught.code === "PICOS_SFTP_CANCELLED")
	);
}

export function createReadOnlySftpFileProvider(
	profile: SftpRemoteProfile,
	session: ReadOnlySftpSession,
	resolvedRoot = profile.root,
): FileProvider {
	const rootPath = normalizeRemotePath(resolvedRoot);
	const rootUri = formatSftpUri(profile, rootPath);

	return {
		kind: "sftp",
		async pwd() {
			return rootUri;
		},
		async list(path) {
			const remotePath = resolveSftpProviderPath(profile, rootPath, path);
			const entries = await session.list(remotePath);
			assertBoundedSftpDirectory(entries);
			return entries
				.filter((entry) => entry.name !== "." && entry.name !== "..")
				.map(
					(entry): FileEntry => ({
						name: entry.name,
						path: formatSftpUri(profile, posix.join(remotePath, entry.name)),
						type: entry.type,
						size: entry.size,
						modifiedAt: entry.modifiedAt,
						readonly: true,
					}),
				)
				.sort(compareSftpEntries);
		},
		async read(path, readOptions = {}) {
			const remotePath = resolveSftpProviderPath(profile, rootPath, path);
			const maxBytes = Math.min(
				MAX_SFTP_READ_BYTES,
				Math.max(
					1,
					Math.floor(readOptions.maxBytes ?? DEFAULT_SFTP_MAX_READ_BYTES),
				),
			);
			const info = await session.stat(remotePath);
			if (info.type !== "file") {
				throw new Error(`SFTP read requires a regular file: ${remotePath}`);
			}
			const content = await session.read(remotePath, maxBytes);
			return {
				path: formatSftpUri(profile, remotePath),
				content: content.subarray(0, maxBytes).toString("utf8"),
				encoding: "utf8",
				truncated: info.size > maxBytes || content.byteLength > maxBytes,
			};
		},
		async write() {
			throw new Error("Remote SFTP writes are disabled in read-only sessions");
		},
		async stat(path) {
			const remotePath = resolveSftpProviderPath(profile, rootPath, path);
			const info = await session.stat(remotePath);
			return {
				name: remotePath === "/" ? "/" : posix.basename(remotePath),
				path: formatSftpUri(profile, remotePath),
				type: info.type,
				size: info.size,
				modifiedAt: info.modifiedAt,
				readonly: true,
			};
		},
		async close() {
			await session.close();
		},
	};
}

export function createSftpHostKeyFingerprint(key: Buffer): string {
	const digest = createHash("sha256")
		.update(key)
		.digest("base64")
		.replace(/=+$/g, "");
	return `SHA256:${digest}`;
}

export function normalizeSftpHostKeyFingerprint(
	fingerprint: string,
): string | undefined {
	const trimmed = fingerprint.trim();
	if (!/^SHA256:[A-Za-z0-9+/]{43}=?$/.test(trimmed)) {
		return undefined;
	}
	return trimmed.replace(/=+$/g, "");
}

export function formatReadOnlySftpConnectionAuditMessage(
	outcome: ReadOnlySftpConnectionOutcome,
): string {
	return [
		"remote connect audit",
		`id=${outcome.id}`,
		`status=${outcome.status}`,
		`target=${quoteSftpAuditValue(outcome.target)}`,
		`fingerprint=${outcome.fingerprint}`,
		`network=${outcome.network ?? (outcome.status === "connected" ? "opened" : "closed")}`,
		"capabilities=list,stat,read",
		"writes=locked",
		`message=${quoteSftpAuditValue(outcome.message)}`,
	].join(" ");
}

export function formatSftpUri(
	profile: SftpRemoteProfile,
	remotePath: string,
): string {
	const path = normalizeRemotePath(remotePath);
	return formatSftpAuthorityPath(profile, path);
}

export function formatSftpProfileUri(profile: SftpRemoteProfile): string {
	const path = profile.root.startsWith("/") ? profile.root : `/${profile.root}`;
	return formatSftpAuthorityPath(profile, path);
}

export function resolveSftpProviderPath(
	profile: SftpRemoteProfile,
	rootPath: string,
	input: string,
): string {
	const trimmed = input.trim();
	if (trimmed.startsWith("sftp://")) {
		const url = new URL(trimmed);
		const port = Number(url.port || 22);
		if (
			decodeURIComponent(url.username) !== profile.username ||
			stripIpv6Brackets(url.hostname) !== stripIpv6Brackets(profile.host) ||
			port !== profile.port
		) {
			throw new Error("SFTP path targets a different remote profile");
		}
		return normalizeRemotePath(decodeURIComponent(url.pathname));
	}
	if (trimmed.startsWith("/")) {
		return normalizeRemotePath(trimmed);
	}
	return normalizeRemotePath(posix.resolve(rootPath, trimmed || "."));
}

async function connectSsh2Session(
	profile: SftpRemoteProfile,
	options: {
		expectedHostKeyFingerprint: string;
		readyTimeoutMs?: number;
		agentPath?: string;
		signal?: AbortSignal;
	},
): Promise<ReadOnlySftpSession> {
	const { Client: SshClient } = await import("ssh2");
	const client = new SshClient();
	const auth = await createSftpAuthConfig(
		profile,
		options.agentPath,
		options.signal,
	);
	if (options.signal?.aborted) {
		throw new ReadOnlySftpConnectionCancelledError();
	}
	let observedFingerprint = "SHA256:unknown";
	const config: ConnectConfig = {
		host: profile.host,
		port: profile.port,
		username: profile.username,
		readyTimeout: Math.max(
			1_000,
			Math.floor(options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS),
		),
		keepaliveInterval: 10_000,
		keepaliveCountMax: 2,
		hostVerifier(key: Buffer) {
			observedFingerprint = createSftpHostKeyFingerprint(key);
			return observedFingerprint === options.expectedHostKeyFingerprint;
		},
		...auth,
	};

	let detachAbortListener: () => void = () => undefined;
	const sftp = await new Promise<SFTPWrapper>((resolveSession, reject) => {
		let settled = false;
		let abortHandler: (() => void) | undefined;
		const cleanup = () => {
			if (abortHandler) {
				options.signal?.removeEventListener("abort", abortHandler);
			}
		};
		detachAbortListener = cleanup;
		const fail = (error: Error) => {
			client.end();
			cleanup();
			if (settled) {
				return;
			}
			settled = true;
			if (
				observedFingerprint !== "SHA256:unknown" &&
				observedFingerprint !== options.expectedHostKeyFingerprint
			) {
				reject(
					new Error(
						`SFTP host key mismatch expected=${options.expectedHostKeyFingerprint} observed=${observedFingerprint}`,
					),
				);
				return;
			}
			if (
				error instanceof ReadOnlySftpConnectionCancelledError ||
				options.signal?.aborted
			) {
				reject(new ReadOnlySftpConnectionCancelledError());
				return;
			}
			reject(new Error(`SFTP connection failed: ${error.message}`));
		};
		client.on("error", fail);
		client.once("ready", () => {
			client.sftp((error, wrapper) => {
				if (error) {
					fail(error);
					return;
				}
				settled = true;
				resolveSession(wrapper);
			});
		});
		abortHandler = () => fail(new ReadOnlySftpConnectionCancelledError());
		options.signal?.addEventListener("abort", abortHandler, { once: true });
		if (options.signal?.aborted) {
			abortHandler();
			return;
		}
		try {
			client.connect(config);
		} catch (caught) {
			fail(caught instanceof Error ? caught : new Error(String(caught)));
		}
	});

	return createSsh2ReadOnlySession(client, sftp, detachAbortListener);
}

async function createSftpAuthConfig(
	profile: SftpRemoteProfile,
	agentPath?: string,
	signal?: AbortSignal,
): Promise<Pick<ConnectConfig, "agent" | "privateKey">> {
	if (profile.keyPath) {
		const keyPath = resolveHomePath(profile.keyPath);
		try {
			const privateKey = await readFile(keyPath, { signal });
			return { privateKey };
		} catch (caught) {
			if (signal?.aborted) {
				throw new ReadOnlySftpConnectionCancelledError();
			}
			throw new Error("SFTP private key could not be read", { cause: caught });
		}
	}
	const agent = agentPath ?? process.env.SSH_AUTH_SOCK;
	if (!agent) {
		throw new Error(
			"SFTP authentication requires profile keyPath or SSH_AUTH_SOCK",
		);
	}
	return { agent };
}

function createSsh2ReadOnlySession(
	client: Client,
	sftp: SFTPWrapper,
	detachAbortListener: () => void,
): ReadOnlySftpSession {
	let transportClosed = false;
	let closePromise: Promise<void> | undefined;
	client.once("close", () => {
		transportClosed = true;
	});
	return {
		async realpath(path) {
			return new Promise<string>((resolvePath, reject) =>
				sftp.realpath(path, (error, absolutePath) => {
					if (error) reject(error);
					else resolvePath(absolutePath);
				}),
			);
		},
		async list(path) {
			const rows = await readBoundedSftpDirectory(sftp, path);
			return rows.map((entry) => ({
				name: entry.filename,
				type: getSftpStatsType(entry.attrs),
				size: entry.attrs.size,
				modifiedAt: toSftpDate(entry.attrs.mtime),
			}));
		},
		async read(path, maxBytes) {
			return new Promise<Buffer>((resolveBuffer, reject) => {
				const chunks: Buffer[] = [];
				const stream = sftp.createReadStream(path, {
					start: 0,
					end: Math.max(0, maxBytes - 1),
				});
				stream.on("data", (chunk: Buffer | string) =>
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
				);
				stream.once("error", reject);
				stream.once("end", () => resolveBuffer(Buffer.concat(chunks)));
			});
		},
		async stat(path) {
			const stats = await new Promise<Stats>((resolveStats, reject) =>
				sftp.stat(path, (error, value) => {
					if (error) reject(error);
					else resolveStats(value);
				}),
			);
			return {
				type: getSftpStatsType(stats),
				size: stats.size,
				modifiedAt: toSftpDate(stats.mtime),
			};
		},
		async close() {
			detachAbortListener();
			if (transportClosed) return;
			closePromise ??= new Promise<void>((resolveClose, rejectClose) => {
				const timeout = setTimeout(() => {
					client.destroy();
					rejectClose(new Error("SFTP transport close timed out"));
				}, 2_000);
				client.once("close", () => {
					clearTimeout(timeout);
					transportClosed = true;
					resolveClose();
				});
				client.end();
			});
			await closePromise;
		},
	};
}

async function readBoundedSftpDirectory(
	sftp: SFTPWrapper,
	path: string,
): Promise<FileEntryWithStats[]> {
	const handle = await new Promise<Buffer>((resolveHandle, rejectHandle) =>
		sftp.opendir(path, (error, openedHandle) => {
			if (error) rejectHandle(error);
			else resolveHandle(openedHandle);
		}),
	);
	const entries: FileEntryWithStats[] = [];
	let nameBytes = 0;
	try {
		while (true) {
			const batch = await new Promise<FileEntryWithStats[]>(
				(resolveEntries, rejectEntries) =>
					sftp.readdir(handle, (error, rows) => {
						if (isSftpEndOfDirectory(error)) resolveEntries([]);
						else if (error) rejectEntries(error);
						else resolveEntries(Array.isArray(rows) ? rows : []);
					}),
			);
			if (batch.length === 0) break;
			for (const entry of batch) {
				entries.push(entry);
				nameBytes += Buffer.byteLength(entry.filename, "utf8");
				if (
					entries.length > MAX_SFTP_DIRECTORY_ENTRIES ||
					nameBytes > MAX_SFTP_DIRECTORY_NAME_BYTES
				) {
					throw new Error("SFTP directory exceeds safe listing limits");
				}
			}
		}
		return entries;
	} finally {
		await new Promise<void>((resolveClose, rejectClose) =>
			sftp.close(handle, (error) => {
				if (error) rejectClose(error);
				else resolveClose();
			}),
		);
	}
}

function isSftpEndOfDirectory(error: Error | undefined): boolean {
	return (
		error !== undefined &&
		"code" in error &&
		error.code === SFTP_EOF_STATUS_CODE
	);
}

function assertBoundedSftpDirectory(
	entries: Awaited<ReturnType<ReadOnlySftpSession["list"]>>,
): void {
	const nameBytes = entries.reduce(
		(total, entry) => total + Buffer.byteLength(entry.name, "utf8"),
		0,
	);
	if (
		entries.length > MAX_SFTP_DIRECTORY_ENTRIES ||
		nameBytes > MAX_SFTP_DIRECTORY_NAME_BYTES
	) {
		throw new Error("SFTP directory exceeds safe listing limits");
	}
}

function normalizeRemotePath(path: string): string {
	const normalized = posix.normalize(path.startsWith("/") ? path : `/${path}`);
	return normalized === "/." ? "/" : normalized;
}

function resolveHomePath(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/") || path.startsWith("~\\")) {
		return resolve(homedir(), path.slice(2));
	}
	return resolve(path);
}

function getSftpStatsType(stats: Stats): FileEntryType {
	if (stats.isDirectory()) return "directory";
	if (stats.isFile()) return "file";
	if (stats.isSymbolicLink()) return "symlink";
	return "unknown";
}

function toSftpDate(value: number | Date): Date {
	return value instanceof Date ? value : new Date(value * 1000);
}

function compareSftpEntries(left: FileEntry, right: FileEntry): number {
	if (left.type === "directory" && right.type !== "directory") return -1;
	if (left.type !== "directory" && right.type === "directory") return 1;
	return left.name.localeCompare(right.name);
}

function formatSftpHost(host: string): string {
	const normalized = stripIpv6Brackets(host);
	return normalized.includes(":") ? `[${normalized}]` : normalized;
}

function formatSftpAuthorityPath(
	profile: SftpRemoteProfile,
	path: string,
): string {
	return `sftp://${encodeURIComponent(profile.username)}@${formatSftpHost(profile.host)}:${profile.port}${encodeSftpPath(path)}`;
}

function encodeSftpPath(path: string): string {
	return path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

function stripIpv6Brackets(host: string): string {
	return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function quoteSftpAuditValue(value: string): string {
	return `"${value
		.replaceAll("\\", "\\\\")
		.replaceAll("\r", "\\r")
		.replaceAll("\n", "\\n")
		.replaceAll("\t", "\\t")
		.replaceAll('"', '\\"')}"`;
}
