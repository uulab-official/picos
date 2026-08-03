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
import { ReportedCliError } from "../errors";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import {
	deliverCliOutput,
	isCliOutputWriteError,
	writeCliOutput,
} from "../output";
import {
	formatRemoteJsonFailure,
	formatRemoteProfilesJson,
	formatRemoteJsonSuccess,
	sanitizeRemoteOutputText,
} from "../remoteOutput";

type RemoteCommandOptionValue =
	| string
	| number
	| boolean
	| Array<string | number | boolean>;

export type RemoteCommandOptions = {
	list?: RemoteCommandOptionValue;
	read?: RemoteCommandOptionValue;
	knownHosts?: RemoteCommandOptionValue;
	fingerprint?: RemoteCommandOptionValue;
	confirm?: RemoteCommandOptionValue;
	timeout?: RemoteCommandOptionValue;
	maxBytes?: RemoteCommandOptionValue;
	json?: RemoteCommandOptionValue;
};

export type GuardedRemoteFileRequest = {
	operation: "list" | "read";
	path: string;
	knownHostsPath: string;
	requestedFingerprint?: string;
	confirm: string;
	timeoutMs: number;
	maxBytes: number;
	output: "text" | "json";
};

const DEFAULT_REMOTE_TIMEOUT_MS = 15_000;
const MAX_KNOWN_HOSTS_BYTES = 4 * 1024 * 1024;

export async function remotesCommand(
	options: { json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const config = await readConfig();
		if (json) {
			await writeCliOutput(formatRemoteProfilesJson(config.remoteProfiles));
			return;
		}
		console.log(formatRemoteProfiles(config.remoteProfiles));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("remotes", caught, {
				request: { action: "list" },
			});
		}
		throw caught;
	}
}

export async function remoteCommand(
	id: string,
	options: RemoteCommandOptions = {},
): Promise<void> {
	let config: Awaited<ReturnType<typeof readConfig>>;
	try {
		config = await readConfig();
	} catch (caught) {
		const message = caught instanceof Error ? caught.message : String(caught);
		if (isRemoteJsonRequested(options)) {
			reportUnresolvedRemoteJsonFailure(id, options, message);
			throw new ReportedCliError(message, { cause: caught });
		}
		throw caught;
	}
	const profile = config.remoteProfiles.find((item) => item.id === id);
	if (!profile) {
		const message = `Unknown remote profile: ${id}`;
		if (isRemoteJsonRequested(options)) {
			reportUnresolvedRemoteJsonFailure(id, options, message);
			throw new ReportedCliError(message);
		}
		throw new Error(message);
	}

	let request: GuardedRemoteFileRequest | undefined;
	try {
		request = createGuardedRemoteFileRequest(id, options);
	} catch (caught) {
		const message = caught instanceof Error ? caught.message : String(caught);
		if (options.list !== undefined || options.read !== undefined) {
			const audit = formatGuardedRemoteFailureAuditMessage(profile, message);
			if (isRemoteJsonRequested(options)) {
				try {
					console.error(audit);
				} catch {
					// Preserve the JSON contract if the diagnostic stream is unavailable.
				}
			} else {
				console.error(audit);
			}
		}
		if (isRemoteJsonRequested(options)) {
			console.log(
				formatRemoteJsonFailure({
					id,
					profile,
					operation: inferRemoteOperation(options),
					path: inferRemotePath(options),
					message,
				}),
			);
			throw new ReportedCliError(message, { cause: caught });
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
	const output = normalizeRemoteBooleanFlag(options.json, "--json")
		? "json"
		: "text";
	if (options.list !== undefined && options.read !== undefined) {
		throw new Error("Choose exactly one remote operation: --list or --read");
	}
	if (options.list === undefined && options.read === undefined) {
		if (output === "json") {
			throw new Error(
				"--json requires exactly one remote operation: --list or --read",
			);
		}
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
		output,
	};
}

export async function runGuardedRemoteFileRequest(
	profile: SftpRemoteProfile,
	request: GuardedRemoteFileRequest,
	dependencies: {
		readKnownHosts?: (path: string, signal?: AbortSignal) => Promise<string>;
		connect?: typeof connectReadOnlySftpFileProvider;
		writeOutput?: (value: string) => unknown;
		writeDiagnostic?: (value: string) => void;
	} = {},
): Promise<void> {
	const readKnownHosts = dependencies.readKnownHosts ?? readBoundedKnownHosts;
	const connect = dependencies.connect ?? connectReadOnlySftpFileProvider;
	const writeOutput = dependencies.writeOutput ?? writeCliOutput;
	const writeDiagnostic = dependencies.writeDiagnostic ?? console.error;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
	let provider: FileProvider | undefined;
	let jsonOutputAttempted = false;
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
		const entries =
			request.operation === "list"
				? await runAbortableRemoteOperation(
						() => openedProvider.list(request.path),
						controller.signal,
					)
				: undefined;
		const file =
			request.operation === "read"
				? await runAbortableRemoteOperation(
						() =>
							openedProvider.read(request.path, {
								maxBytes: request.maxBytes,
							}),
						controller.signal,
					)
				: undefined;
		if (controller.signal.aborted) {
			throw new Error(`Remote ${request.operation} timed out`);
		}
		await openedProvider.close?.();
		provider = undefined;
		if (controller.signal.aborted) {
			throw new Error(`Remote ${request.operation} timed out`);
		}
		if (request.output === "json") jsonOutputAttempted = true;
		await deliverCliOutput(
			writeOutput,
			request.output === "json"
				? formatRemoteJsonSuccess({
						profile,
						operation: request.operation,
						path: request.path,
						timeoutMs: request.timeoutMs,
						maxBytes: request.maxBytes,
						root,
						fingerprint,
						entries,
						file,
					})
				: request.operation === "list"
					? formatDirEntries(entries ?? [])
					: (file?.content ?? ""),
		);
		try {
			writeDiagnostic(
				formatReadOnlySftpConnectionAuditMessage({
					status: "completed",
					id: profile.id,
					target: root,
					host: profile.host,
					port: profile.port,
					fingerprint,
					network: "closed",
					message: `CLI read-only ${request.operation} path=${JSON.stringify(sanitizeRemoteOutputText(request.path))}`,
				}),
			);
		} catch {
			// The completed result is already delivered; a closed diagnostic stream
			// must not turn it into a contradictory process failure.
		}
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
		try {
			writeDiagnostic(
				formatGuardedRemoteFailureAuditMessage(profile, message, {
					cancelled: timedOut,
					fingerprint,
					network: cleanup.closed ? "closed" : "unknown",
				}),
			);
		} catch {
			// JSON output remains the machine-readable terminal result.
		}
		if (isCliOutputWriteError(caught)) throw caught;
		if (request.output === "json" && !jsonOutputAttempted) {
			jsonOutputAttempted = true;
			await deliverCliOutput(
				writeOutput,
				formatRemoteJsonFailure({
					id: profile.id,
					profile,
					operation: request.operation,
					path: request.path,
					message,
					timeoutMs: request.timeoutMs,
					maxBytes: request.maxBytes,
					fingerprint,
					network: cleanup.closed ? "closed" : "unknown",
				}),
			);
			throw new ReportedCliError(message, { cause: caught });
		}
		throw new Error(message, { cause: caught });
	} finally {
		clearTimeout(timeout);
	}
}

export function reportRemoteCliParseFailure(
	argv: string[],
	caught: unknown,
): boolean {
	if (argv[0] !== "remote" || !argv.includes("--json")) return false;
	const id = argv[1]?.trim() || "unknown";
	const options: RemoteCommandOptions = {
		json: true,
		...(argv.includes("--list")
			? { list: readRawOptionValue(argv, "--list") ?? [] }
			: {}),
		...(argv.includes("--read")
			? { read: readRawOptionValue(argv, "--read") ?? [] }
			: {}),
	};
	const message = caught instanceof Error ? caught.message : String(caught);
	reportUnresolvedRemoteJsonFailure(id, options, message);
	return true;
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
		message: sanitizeRemoteOutputText(message),
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

function normalizeRemoteBooleanFlag(
	value: RemoteCommandOptionValue | undefined,
	name: string,
): boolean {
	if (value === undefined || value === false) return false;
	const values = Array.isArray(value) ? value : [value];
	if (values.length !== 1 || values[0] !== true) {
		throw new Error(`${name} is a boolean flag and must be provided once`);
	}
	return true;
}

function isRemoteJsonRequested(options: RemoteCommandOptions): boolean {
	const values = Array.isArray(options.json) ? options.json : [options.json];
	return values.includes(true);
}

function inferRemoteOperation(
	options: RemoteCommandOptions,
): "list" | "read" | undefined {
	if (options.list !== undefined && options.read === undefined) return "list";
	if (options.read !== undefined && options.list === undefined) return "read";
	return undefined;
}

function inferRemotePath(options: RemoteCommandOptions): string | undefined {
	const value = options.read ?? options.list;
	if (Array.isArray(value))
		return value.length === 1 ? String(value[0]) : undefined;
	return value === undefined ? undefined : String(value);
}

function reportUnresolvedRemoteJsonFailure(
	id: string,
	options: RemoteCommandOptions,
	message: string,
): void {
	const operation = inferRemoteOperation(options);
	const path = inferRemotePath(options);
	if (operation) {
		try {
			console.error(formatUnresolvedRemoteFailureAuditMessage(id, message));
		} catch {
			// Preserve the JSON contract if the diagnostic stream is unavailable.
		}
	}
	console.log(
		formatRemoteJsonFailure({
			id,
			operation,
			path,
			message,
		}),
	);
}

function formatUnresolvedRemoteFailureAuditMessage(
	id: string,
	message: string,
): string {
	return formatReadOnlySftpConnectionAuditMessage({
		status: "failed",
		id,
		target: "unknown",
		host: "unknown",
		port: 0,
		fingerprint: "SHA256:unknown",
		network: "closed",
		message: sanitizeRemoteOutputText(message),
	});
}

function readRawOptionValue(argv: string[], name: string): string | undefined {
	const index = argv.indexOf(name);
	const value = index < 0 ? undefined : argv[index + 1];
	return value?.startsWith("--") ? undefined : value;
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
