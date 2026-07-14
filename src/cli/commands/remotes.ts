import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { readConfig } from "../../config/store";
import { type FileProvider, formatDirEntries } from "../../core/files";
import {
	formatRemoteProfiles,
	formatRemoteProviderStatus,
	selectRemoteKnownHostsConnectCandidate,
} from "../../core/remotes";
import {
	connectReadOnlySftpFileProvider,
	DEFAULT_SFTP_MAX_READ_BYTES,
	formatReadOnlySftpConnectionAuditMessage,
	formatSftpProfileUri,
	MAX_SFTP_READ_BYTES,
	normalizeSftpHostKeyFingerprint,
} from "../../core/sftp";
import type { SftpRemoteProfile } from "../../core/types";

type RemoteCommandOptionValue = string | number | Array<string | number>;

export type RemoteCommandOptions = {
	list?: RemoteCommandOptionValue;
	read?: RemoteCommandOptionValue;
	knownHosts?: RemoteCommandOptionValue;
	fingerprint?: RemoteCommandOptionValue;
	confirm?: RemoteCommandOptionValue;
	timeout?: RemoteCommandOptionValue;
	maxBytes?: RemoteCommandOptionValue;
};

export type GuardedRemoteFileRequest = {
	operation: "list" | "read";
	path: string;
	knownHostsPath: string;
	requestedFingerprint?: string;
	confirm: string;
	timeoutMs: number;
	maxBytes: number;
};

const DEFAULT_REMOTE_TIMEOUT_MS = 15_000;
const MAX_KNOWN_HOSTS_BYTES = 4 * 1024 * 1024;

export async function remotesCommand(): Promise<void> {
	const config = await readConfig();
	console.log(formatRemoteProfiles(config.remoteProfiles));
}

export async function remoteCommand(
	id: string,
	options: RemoteCommandOptions = {},
): Promise<void> {
	const config = await readConfig();
	const profile = config.remoteProfiles.find((item) => item.id === id);
	if (!profile) {
		throw new Error(`Unknown remote profile: ${id}`);
	}

	let request: GuardedRemoteFileRequest | undefined;
	try {
		request = createGuardedRemoteFileRequest(id, options);
	} catch (caught) {
		if (options.list !== undefined || options.read !== undefined) {
			console.error(
				formatGuardedRemoteFailureAuditMessage(
					profile,
					caught instanceof Error ? caught.message : String(caught),
				),
			);
		}
		throw caught;
	}
	if (!request) {
		console.log(await formatRemoteProviderStatus(profile));
		return;
	}

	await runGuardedRemoteFileRequest(profile, request);
}

export function createGuardedRemoteFileRequest(
	id: string,
	options: RemoteCommandOptions,
): GuardedRemoteFileRequest | undefined {
	if (options.list !== undefined && options.read !== undefined) {
		throw new Error("Choose exactly one remote operation: --list or --read");
	}
	if (options.list === undefined && options.read === undefined) {
		return undefined;
	}
	const list = normalizeRemoteTextOption(options.list, "--list");
	const read = normalizeRemoteTextOption(options.read, "--read");
	const confirm = normalizeRemoteTextOption(options.confirm, "--confirm");
	const knownHosts = normalizeRemoteTextOption(
		options.knownHosts,
		"--known-hosts",
	);
	const requestedFingerprint = normalizeRemoteTextOption(
		options.fingerprint,
		"--fingerprint",
	);
	const timeout = normalizeRemoteTextOption(options.timeout, "--timeout");
	const maxBytes = normalizeRemoteTextOption(options.maxBytes, "--max-bytes");
	const expectedConfirm = `connect remote ${id}`;
	if (confirm !== expectedConfirm) {
		throw new Error(`Remote reads require --confirm "${expectedConfirm}"`);
	}
	const requestedPath = read ?? list ?? ".";
	return {
		operation: read !== undefined ? "read" : "list",
		path: requestedPath.trim() || ".",
		knownHostsPath: resolveLocalRemotePath(knownHosts ?? "~/.ssh/known_hosts"),
		requestedFingerprint,
		confirm: expectedConfirm,
		timeoutMs: parseRemoteIntegerOption(
			timeout,
			"--timeout",
			DEFAULT_REMOTE_TIMEOUT_MS,
			1_000,
			60_000,
		),
		maxBytes: parseRemoteIntegerOption(
			maxBytes,
			"--max-bytes",
			DEFAULT_SFTP_MAX_READ_BYTES,
			1,
			MAX_SFTP_READ_BYTES,
		),
	};
}

export async function runGuardedRemoteFileRequest(
	profile: SftpRemoteProfile,
	request: GuardedRemoteFileRequest,
	dependencies: {
		readKnownHosts?: (path: string, signal?: AbortSignal) => Promise<string>;
		connect?: typeof connectReadOnlySftpFileProvider;
		writeOutput?: (value: string) => void;
		writeDiagnostic?: (value: string) => void;
	} = {},
): Promise<void> {
	const readKnownHosts = dependencies.readKnownHosts ?? readBoundedKnownHosts;
	const connect = dependencies.connect ?? connectReadOnlySftpFileProvider;
	const writeOutput = dependencies.writeOutput ?? console.log;
	const writeDiagnostic = dependencies.writeDiagnostic ?? console.error;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
	let provider: FileProvider | undefined;
	let fingerprint =
		normalizeSftpHostKeyFingerprint(request.requestedFingerprint ?? "") ??
		"SHA256:unknown";
	try {
		const expectedConfirm = `connect remote ${profile.id}`;
		if (request.confirm !== expectedConfirm) {
			throw new Error(`Remote reads require confirmation ${expectedConfirm}`);
		}
		const knownHosts = await runAbortableRemoteOperation(
			() => readKnownHosts(request.knownHostsPath, controller.signal),
			controller.signal,
		);
		const candidate = selectRemoteKnownHostsConnectCandidate(
			profile,
			knownHosts,
			request.requestedFingerprint,
		);
		fingerprint = candidate.fingerprint;
		provider = await connect(profile, {
			expectedHostKeyFingerprint: candidate.fingerprint,
			readyTimeoutMs: request.timeoutMs,
			signal: controller.signal,
		});
		const openedProvider = provider;
		const root = await runAbortableRemoteOperation(
			() => openedProvider.pwd(),
			controller.signal,
		);
		const output =
			request.operation === "list"
				? formatDirEntries(
						await runAbortableRemoteOperation(
							() => openedProvider.list(request.path),
							controller.signal,
						),
					)
				: (
						await runAbortableRemoteOperation(
							() =>
								openedProvider.read(request.path, {
									maxBytes: request.maxBytes,
								}),
							controller.signal,
						)
					).content;
		if (controller.signal.aborted) {
			throw new Error(`Remote ${request.operation} timed out`);
		}
		await openedProvider.close?.();
		provider = undefined;
		if (controller.signal.aborted) {
			throw new Error(`Remote ${request.operation} timed out`);
		}
		writeOutput(output);
		writeDiagnostic(
			formatReadOnlySftpConnectionAuditMessage({
				status: "completed",
				id: profile.id,
				target: root,
				host: profile.host,
				port: profile.port,
				fingerprint,
				network: "closed",
				message: `CLI read-only ${request.operation} path=${JSON.stringify(request.path)}`,
			}),
		);
	} catch (caught) {
		const timedOut = controller.signal.aborted;
		const baseMessage = timedOut
			? `CLI remote ${request.operation} timed out after ${request.timeoutMs}ms`
			: caught instanceof Error
				? caught.message
				: String(caught);
		const cleanup = await closeRemoteProvider(provider);
		if (cleanup.closed) {
			provider = undefined;
		}
		const message = cleanup.error
			? `${baseMessage}; session close failed: ${cleanup.error.message}`
			: baseMessage;
		writeDiagnostic(
			formatGuardedRemoteFailureAuditMessage(profile, message, {
				cancelled: timedOut,
				fingerprint,
				network: cleanup.closed ? "closed" : "unknown",
			}),
		);
		throw new Error(message, { cause: caught });
	} finally {
		clearTimeout(timeout);
	}
}

export function formatGuardedRemoteFailureAuditMessage(
	profile: SftpRemoteProfile,
	message: string,
	options: {
		cancelled?: boolean;
		fingerprint?: string;
		network?: "closed" | "unknown";
	} = {},
): string {
	return formatReadOnlySftpConnectionAuditMessage({
		status: options.cancelled ? "cancelled" : "failed",
		id: profile.id,
		target: formatSftpProfileUri(profile),
		host: profile.host,
		port: profile.port,
		fingerprint: options.fingerprint ?? "SHA256:unknown",
		network: options.network ?? "closed",
		message,
	});
}

async function readBoundedKnownHosts(
	path: string,
	signal?: AbortSignal,
): Promise<string> {
	const info = await stat(path);
	if (!info.isFile()) {
		throw new Error(`known_hosts must be a regular file: ${path}`);
	}
	if (info.size > MAX_KNOWN_HOSTS_BYTES) {
		throw new Error(
			`known_hosts exceeds ${MAX_KNOWN_HOSTS_BYTES} byte safety limit`,
		);
	}
	const content = await readFile(path, { encoding: "utf8", signal });
	if (Buffer.byteLength(content, "utf8") > MAX_KNOWN_HOSTS_BYTES) {
		throw new Error(
			`known_hosts exceeds ${MAX_KNOWN_HOSTS_BYTES} byte safety limit`,
		);
	}
	return content;
}

async function closeRemoteProvider(
	provider?: FileProvider,
): Promise<{ closed: boolean; error?: Error }> {
	if (!provider?.close) return { closed: true };
	try {
		await provider.close();
		return { closed: true };
	} catch (caught) {
		return {
			closed: false,
			error: caught instanceof Error ? caught : new Error(String(caught)),
		};
	}
}

function runAbortableRemoteOperation<T>(
	operation: () => Promise<T>,
	signal: AbortSignal,
): Promise<T> {
	if (signal.aborted) {
		return Promise.reject(new Error("Remote operation timed out"));
	}
	return new Promise<T>((resolveOperation, rejectOperation) => {
		let settled = false;
		const finish = (callback: () => void) => {
			if (settled) return;
			settled = true;
			signal.removeEventListener("abort", onAbort);
			callback();
		};
		const onAbort = () =>
			finish(() => rejectOperation(new Error("Remote operation timed out")));
		signal.addEventListener("abort", onAbort, { once: true });
		operation().then(
			(value) => finish(() => resolveOperation(value)),
			(caught) => finish(() => rejectOperation(caught)),
		);
	});
}

function resolveLocalRemotePath(path: string): string {
	const trimmed = path.trim();
	if (trimmed === "~") return homedir();
	if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
		return resolve(homedir(), trimmed.slice(2));
	}
	return resolve(trimmed);
}

function normalizeRemoteTextOption(
	value: RemoteCommandOptionValue | undefined,
	name: string,
): string | undefined {
	if (value === undefined) return undefined;
	const values = Array.isArray(value) ? value : [value];
	if (values.length !== 1) {
		throw new Error(`${name} must be provided exactly once`);
	}
	return String(values[0]);
}

function parseRemoteIntegerOption(
	value: string | undefined,
	name: string,
	fallback: number,
	minimum: number,
	maximum: number,
): number {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
		throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
	}
	return parsed;
}
