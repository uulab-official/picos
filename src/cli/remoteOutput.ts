import type { FileEntry, FileReadResult } from "../core/files";
import type { SftpRemoteProfile } from "../core/types";

export const REMOTE_JSON_SCHEMA_VERSION = 1;
const REMOTE_JSON_TEXT_MAX_LENGTH = 4_096;

export type RemoteJsonOperation = "list" | "read";

type RemoteJsonSession = {
	root: string;
	fingerprint: string;
	network: "closed" | "unknown";
	capabilities: Array<"list" | "stat" | "read">;
	writes: "locked";
	exec: "unsupported";
};

export type RemoteJsonSuccessInput = {
	profile: SftpRemoteProfile;
	operation: RemoteJsonOperation;
	path: string;
	timeoutMs: number;
	maxBytes: number;
	root: string;
	fingerprint: string;
	entries?: FileEntry[];
	file?: FileReadResult;
};

export type RemoteJsonFailureInput = {
	id: string;
	profile?: SftpRemoteProfile;
	operation?: RemoteJsonOperation;
	path?: string;
	timeoutMs?: number;
	maxBytes?: number;
	message: string;
	fingerprint?: string;
	network?: "closed" | "unknown";
};

export function formatRemoteJsonSuccess(input: RemoteJsonSuccessInput): string {
	const data =
		input.operation === "list"
			? {
					count: input.entries?.length ?? 0,
					entries: (input.entries ?? []).map((entry) => ({
						name: sanitizeRemoteOutputText(entry.name),
						path: sanitizeRemoteOutputText(entry.name),
						type: entry.type,
						size: entry.size ?? null,
						modifiedAt: entry.modifiedAt?.toISOString() ?? null,
						readonly: entry.readonly,
					})),
				}
			: {
					file: input.file
						? {
								path: sanitizeRemoteOutputText(input.path),
								content: input.file.content,
								encoding: input.file.encoding,
								truncated: input.file.truncated,
								contentBytes: Buffer.byteLength(input.file.content, "utf8"),
								maxBytes: input.maxBytes,
							}
						: null,
				};

	return JSON.stringify(
		{
			schemaVersion: REMOTE_JSON_SCHEMA_VERSION,
			command: "remote",
			status: "completed",
			operation: input.operation,
			profile: formatRemoteJsonProfile(input.profile),
			request: {
				path: sanitizeRemoteOutputText(input.path),
				timeoutMs: input.timeoutMs,
				...(input.operation === "read" ? { maxBytes: input.maxBytes } : {}),
			},
			session: formatRemoteJsonSession({
				root: input.root,
				fingerprint: input.fingerprint,
				network: "closed",
				capabilities: ["list", "stat", "read"],
				writes: "locked",
				exec: "unsupported",
			}),
			data,
		},
		null,
		2,
	);
}

export function formatRemoteJsonFailure(input: RemoteJsonFailureInput): string {
	return JSON.stringify(
		{
			schemaVersion: REMOTE_JSON_SCHEMA_VERSION,
			command: "remote",
			status: "failed",
			operation: input.operation ?? null,
			profile: input.profile
				? formatRemoteJsonProfile(input.profile)
				: { id: input.id },
			request:
				input.path === undefined &&
				input.timeoutMs === undefined &&
				input.maxBytes === undefined
					? null
					: {
							path:
								input.path === undefined
									? null
									: sanitizeRemoteOutputText(input.path),
							...(input.timeoutMs === undefined
								? {}
								: { timeoutMs: input.timeoutMs }),
							...(input.operation !== "read" || input.maxBytes === undefined
								? {}
								: { maxBytes: input.maxBytes }),
						},
			session: formatRemoteJsonSession({
				root: input.profile?.root ?? "unknown",
				fingerprint: input.fingerprint ?? "SHA256:unknown",
				network: input.network ?? "closed",
				capabilities: ["list", "stat", "read"],
				writes: "locked",
				exec: "unsupported",
			}),
			error: {
				code: "PICOS_REMOTE_OPERATION_FAILED",
				message: sanitizeRemoteOutputText(input.message),
			},
		},
		null,
		2,
	);
}

function formatRemoteJsonProfile(profile: SftpRemoteProfile) {
	return {
		id: profile.id,
		kind: profile.kind,
		host: profile.host,
		port: profile.port,
		username: profile.username,
		root: sanitizeRemoteOutputText(profile.root),
	};
}

export function sanitizeRemoteOutputText(value: string): string {
	const redacted = value.replace(
		/sftp:\/\/([^\s/:@]+):[^\s/@]*@/giu,
		"sftp://$1:[REDACTED]@",
	);
	if (redacted.length <= REMOTE_JSON_TEXT_MAX_LENGTH) return redacted;
	return `${redacted.slice(0, REMOTE_JSON_TEXT_MAX_LENGTH - 3)}...`;
}

function formatRemoteJsonSession(
	session: RemoteJsonSession,
): RemoteJsonSession {
	return { ...session, root: sanitizeRemoteOutputText(session.root) };
}
