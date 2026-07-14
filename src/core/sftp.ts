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
	status: "connected" | "failed";
	id: string;
	target: string;
	host: string;
	port: number;
	fingerprint: string;
	message: string;
};

const DEFAULT_MAX_READ_BYTES = 256 * 1024;
const DEFAULT_READY_TIMEOUT_MS = 10_000;

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
		throw new Error("SFTP connection cancelled");
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
		return createReadOnlySftpFileProvider(profile, session, resolvedRoot);
	} catch (caught) {
		await session.close().catch(() => undefined);
		throw caught;
	}
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
			const maxBytes = Math.max(
				1,
				Math.floor(readOptions.maxBytes ?? DEFAULT_MAX_READ_BYTES),
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
		`network=${outcome.status === "connected" ? "opened" : "closed"}`,
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
	const auth = await createSftpAuthConfig(profile, options.agentPath);
	if (options.signal?.aborted) {
		throw new Error("SFTP connection cancelled");
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
		abortHandler = () => fail(new Error("SFTP connection cancelled"));
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
): Promise<Pick<ConnectConfig, "agent" | "privateKey">> {
	if (profile.keyPath) {
		const keyPath = resolveHomePath(profile.keyPath);
		const privateKey = await readFile(keyPath);
		return { privateKey };
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
			const rows = await new Promise<FileEntryWithStats[]>(
				(resolveRows, reject) =>
					sftp.readdir(path, (error, entries) => {
						if (error) reject(error);
						else resolveRows(entries ?? []);
					}),
			);
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
			client.end();
		},
	};
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
