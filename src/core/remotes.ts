import { createFileProvider } from "./files";
import type { SftpRemoteProfile } from "./types";

type RemoteProfileInput = Record<string, unknown>;

export type RemoteFileContext = {
	id: string;
	kind: "sftp";
	label: string;
	root: string;
	status: "adapter pending";
	writes: "locked";
};

export function normalizeRemoteProfiles(input: unknown): SftpRemoteProfile[] {
	if (!Array.isArray(input)) {
		return [];
	}

	return input
		.map((item) =>
			item && typeof item === "object"
				? normalizeSftpProfile(item as RemoteProfileInput)
				: undefined,
		)
		.filter((profile): profile is SftpRemoteProfile => profile !== undefined);
}

export function parseRemoteProfileCommand(
	input: string,
): SftpRemoteProfile | undefined {
	const parts = input.trim().split(/\s+/).filter(Boolean);
	const [id, authority, ...rest] = parts;
	if (!id || !authority?.includes("@")) {
		return undefined;
	}

	const [username, hostPort] = authority.split("@");
	const hostPortMatch = /^(?<host>[^:]+)(?::(?<port>\d+))?$/.exec(hostPort);
	const host = hostPortMatch?.groups?.host;
	const rawPort = hostPortMatch?.groups?.port;
	const root = rest.find((part) => !part.startsWith("key=")) ?? ".";
	const keyPath = rest
		.find((part) => part.startsWith("key="))
		?.slice("key=".length);
	const [profile] = normalizeRemoteProfiles([
		{
			id,
			host,
			port: rawPort ? Number(rawPort) : undefined,
			username,
			root,
			keyPath,
		},
	]);
	return profile;
}

export function formatRemoteProfiles(profiles: SftpRemoteProfile[]): string {
	if (!profiles.length) {
		return "No remote profiles configured.";
	}

	return profiles
		.map((profile) => {
			const key = profile.keyPath ? ` key=${profile.keyPath}` : "";
			return `${profile.id.padEnd(16)} sftp://${profile.username}@${profile.host}:${profile.port} root=${profile.root}${key}`;
		})
		.join("\n");
}

export async function formatRemoteProviderStatus(
	profile: SftpRemoteProfile,
): Promise<string> {
	const context = await createRemoteFileContext(profile);

	return [
		`Profile: ${context.id}`,
		`Provider: ${context.kind}`,
		`Root: ${context.root}`,
		`Status: ${context.status}`,
		"Writes: locked until host and path confirmation",
	].join("\n");
}

export async function createRemoteFileContext(
	profile: SftpRemoteProfile,
): Promise<RemoteFileContext> {
	const provider = createFileProvider({ kind: "sftp", profile });
	return {
		id: profile.id,
		kind: "sftp",
		label: profile.id,
		root: await provider.pwd(),
		status: "adapter pending",
		writes: "locked",
	};
}

function normalizeSftpProfile(
	input: RemoteProfileInput,
): SftpRemoteProfile | undefined {
	const id = readTrimmed(input.id);
	const host = readTrimmed(input.host);
	const username = readTrimmed(input.username);
	const root = readTrimmed(input.root) ?? ".";
	const keyPath = readTrimmed(input.keyPath);
	const port = normalizePort(input.port);

	if (!id || !host || !username || !port) {
		return undefined;
	}

	if (!/^[A-Za-z0-9._-]{1,64}$/.test(id) || /\s/.test(host)) {
		return undefined;
	}

	return {
		id,
		kind: "sftp",
		host,
		port,
		username,
		root,
		...(keyPath ? { keyPath } : {}),
	};
}

function readTrimmed(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed || undefined;
}

function normalizePort(value: unknown): number | undefined {
	if (value === undefined) {
		return 22;
	}

	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < 1 ||
		value > 65535
	) {
		return undefined;
	}

	return value;
}
