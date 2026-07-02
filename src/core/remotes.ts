import { createFileProvider } from "./files";
import type { SftpRemoteProfile } from "./types";

type RemoteProfileInput = Record<string, unknown>;

export type RemoteHostReviewAuditAction = "view" | "stage";

export type RemoteFileContext = {
	id: string;
	kind: "sftp";
	label: string;
	root: string;
	status: "adapter pending";
	writes: "locked";
};

export type RemoteConnectPreview = {
	id: string;
	target: string;
	host: string;
	port: number;
	username: string;
	key: "configured" | "none";
	hostKey: "unverified";
	transport: "sftp";
	dependency: "@uulab/picos-sftp";
	status: "blocked";
	reason: "sftp-adapter-not-installed";
	risk: "read";
	privilege: "user";
	confirm: string;
	networkOpened: false;
	writes: "locked";
	destructive: "locked";
};

export type RemoteConnectConfirmation = {
	preview: RemoteConnectPreview;
	status: "confirmed-blocked" | "rejected";
	input: string;
	networkOpened: false;
	message: string;
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

export function formatRemoteAdapterBoundaryRows(
	profile?: SftpRemoteProfile,
): string[] {
	const dependency = "@uulab/picos-sftp";
	if (!profile) {
		return [
			"REMOTE ADAPTER BOUNDARY none",
			`transport=sftp dependency=${dependency} status=not installed session=not opened`,
			"target=none",
			"auth=user=- key=none hostKey=unverified",
			"capabilities=list/read planned write locked destructive locked",
			"policy=read-only network=blocked-until-profile confirm=select remote profile",
			"controls=j/k select · enter stage context · config remotes create profile",
		];
	}

	return [
		`REMOTE ADAPTER BOUNDARY ${profile.id}`,
		`transport=sftp dependency=${dependency} status=not installed session=not opened`,
		`target=${formatSftpRoot(profile)}`,
		`auth=user=${profile.username} key=${profile.keyPath ? "configured" : "none"} hostKey=unverified`,
		"capabilities=list/read planned write locked destructive locked",
		`policy=read-only network=blocked-until-confirm confirm=connect remote ${profile.id}`,
		"controls=enter stage context · future connect opens host review dialog first",
	];
}

export function createRemoteConnectPreview(
	profile: SftpRemoteProfile,
): RemoteConnectPreview {
	return {
		id: profile.id,
		target: formatSftpRoot(profile),
		host: profile.host,
		port: profile.port,
		username: profile.username,
		key: profile.keyPath ? "configured" : "none",
		hostKey: "unverified",
		transport: "sftp",
		dependency: "@uulab/picos-sftp",
		status: "blocked",
		reason: "sftp-adapter-not-installed",
		risk: "read",
		privilege: "user",
		confirm: `connect remote ${profile.id}`,
		networkOpened: false,
		writes: "locked",
		destructive: "locked",
	};
}

export function formatRemoteConnectPreviewRows(
	preview?: RemoteConnectPreview,
): string[] {
	if (!preview) {
		return [
			"REMOTE CONNECT PREVIEW none",
			"dialog=host-review action=connect remote status=blocked network=not-opened",
			"target=none",
			"identity user=- host=- port=- key=none hostKey=unverified",
			"risk=read privilege=user writes=locked destructive=locked",
			'confirm="select remote profile" willExecute=false reason=no-remote-profile',
			"controls=j/k select · enter stage context · no socket opened",
		];
	}

	return [
		`REMOTE CONNECT PREVIEW ${preview.id}`,
		`dialog=host-review action=${preview.confirm} status=${preview.status} network=not-opened`,
		`target=${preview.target}`,
		`identity user=${preview.username} host=${preview.host} port=${preview.port} key=${preview.key} hostKey=${preview.hostKey}`,
		`risk=${preview.risk} privilege=${preview.privilege} writes=${preview.writes} destructive=${preview.destructive}`,
		`confirm="${preview.confirm}" willExecute=false reason=${preview.reason}`,
		"controls=future c confirm host review · enter stage context · no socket opened",
	];
}

export function submitRemoteConnectConfirmation(
	preview: RemoteConnectPreview,
	input: string,
): RemoteConnectConfirmation {
	const normalizedInput = input.trim();
	const confirmed = normalizedInput === preview.confirm;
	return {
		preview,
		status: confirmed ? "confirmed-blocked" : "rejected",
		input: normalizedInput,
		networkOpened: false,
		message: confirmed
			? `remote connect blocked ${preview.id} ${preview.target}`
			: `remote connect confirmation rejected ${preview.id}`,
	};
}

export function formatRemoteConnectConfirmationAuditMessage(
	confirmation: RemoteConnectConfirmation,
): string {
	const { preview } = confirmation;
	return [
		"remote connect audit",
		`id=${preview.id}`,
		`target=${quoteAuditField(preview.target)}`,
		`status=${confirmation.status}`,
		`dependency=${preview.dependency}`,
		`reason=${preview.reason}`,
		"network=not-opened",
		`confirm=${quoteAuditField(preview.confirm)}`,
	].join(" ");
}

export function formatRemoteHostReviewAuditMessage(
	action: RemoteHostReviewAuditAction,
	profile: SftpRemoteProfile,
): string {
	return [
		"remote host review audit",
		`action=${action}`,
		`id=${profile.id}`,
		`target=${quoteAuditField(formatSftpRoot(profile))}`,
		`host=${profile.host}`,
		`port=${profile.port}`,
		`user=${profile.username}`,
		`key=${profile.keyPath ? "configured" : "none"}`,
		"policy=read-only",
		"writes=locked",
		"network=not-opened",
		`confirm=${quoteAuditField(`connect remote ${profile.id}`)}`,
	].join(" ");
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
		...formatRemoteAdapterBoundaryRows(profile),
		"",
		...formatRemoteHostReviewRows(profile),
		"",
		...formatRemoteConnectPreviewRows(createRemoteConnectPreview(profile)),
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

function quoteAuditField(value: string): string {
	return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
