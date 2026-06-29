import type { SftpRemoteProfile } from "./types";

type RemoteProfileInput = Record<string, unknown>;

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
