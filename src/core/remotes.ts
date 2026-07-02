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

export function formatRemoteHandoffBoundaryRows(options: {
	profile?: SftpRemoteProfile;
	context?: RemoteFileContext;
}): string[] {
	const { profile, context } = options;
	if (!profile) {
		return [
			"REMOTE HANDOFF none",
			"provider=sftp root=none",
			"status=no profile writes=locked session=not staged",
			"controls=j/k select · enter stage · config remotes create profile",
		];
	}

	const root = context?.root ?? formatSftpRoot(profile);
	const staged = context?.id === profile.id;
	const status = context && staged ? context.status : "profile ready";
	return [
		`REMOTE HANDOFF ${profile.id}`,
		`provider=${profile.kind} root=${root}`,
		`status=${status} writes=locked session=${staged ? "staged" : "not staged"}`,
		`controls=enter ${staged ? "restage" : "stage"} · files opens locked SFTP boundary · no network session`,
	];
}

export function formatRemoteHostReviewRows(
	profile?: SftpRemoteProfile,
): string[] {
	if (!profile) {
		return [
			"REMOTE HOST REVIEW none",
			"target=none",
			"identity user=- host=- port=- key=none",
			"policy=read-only adapter=pending writes=locked network=not opened",
			"confirm=select remote profile",
			"controls=j/k select · enter stage context · config remotes create profile",
		];
	}

	return [
		`REMOTE HOST REVIEW ${profile.id}`,
		`target=${formatSftpRoot(profile)}`,
		`identity user=${profile.username} host=${profile.host} port=${profile.port} key=${profile.keyPath ? "configured" : "none"}`,
		"policy=read-only adapter=pending writes=locked network=not opened",
		`confirm=connect remote ${profile.id}`,
		"controls=review host · enter stage context · future connect requires exact confirmation",
	];
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
		"",
		...formatRemoteHandoffBoundaryRows({ profile, context }),
		"",
		...formatRemoteHostReviewRows(profile),
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

function formatSftpRoot(profile: SftpRemoteProfile): string {
	const root = profile.root.startsWith("/") ? profile.root : `/${profile.root}`;
	return `sftp://${profile.username}@${profile.host}:${profile.port}${root}`;
}
