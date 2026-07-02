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

export type RemoteTransportProbe = {
	id: string;
	dependency: "@uulab/picos-sftp";
	installed: false;
	status: "missing";
	probe: "static";
	target: string;
	auth: "user";
	key: "configured" | "none";
	hostKey: "unverified";
	capabilities: {
		list: "planned";
		read: "planned";
		write: "locked";
		destructive: "locked";
	};
	execution: "blocked";
	networkOpened: false;
	willImport: false;
	willConnect: false;
	next: string;
};

export type RemoteReadOnlyAdapterContract = {
	id: string;
	provider: "sftp";
	dependency: "@uulab/picos-sftp";
	adapter: "read-only";
	target: string;
	lifecycle: "planned";
	methods: {
		list: "planned";
		read: "planned";
		stat: "planned";
		write: "locked";
		delete: "locked";
		exec: "unsupported";
	};
	guards: {
		hostReview: true;
		exactConfirm: string;
		writeConfirm: "disabled";
		destructiveConfirm: "disabled";
	};
	execution: {
		importsTransport: false;
		opensSocket: false;
		mutatesRemote: false;
	};
};

export type RemoteFileRequestPreview = {
	id: string;
	provider: "sftp";
	request: "list";
	path: string;
	target: string;
	status: "blocked";
	reason: "adapter-not-connected" | "no-remote-profile";
	risk: "read";
	privilege: "user";
	confirm: string;
	contract: "read-adapter-required";
	writes: "locked";
	destructive: "locked";
	exec: "unsupported";
	execution: {
		importsTransport: false;
		opensSocket: false;
		readsRemote: false;
		mutatesRemote: false;
	};
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

export function createRemoteTransportProbe(
	profile?: SftpRemoteProfile,
): RemoteTransportProbe {
	return {
		id: profile?.id ?? "none",
		dependency: "@uulab/picos-sftp",
		installed: false,
		status: "missing",
		probe: "static",
		target: profile ? formatSftpRoot(profile) : "none",
		auth: "user",
		key: profile?.keyPath ? "configured" : "none",
		hostKey: "unverified",
		capabilities: {
			list: "planned",
			read: "planned",
			write: "locked",
			destructive: "locked",
		},
		execution: "blocked",
		networkOpened: false,
		willImport: false,
		willConnect: false,
		next: profile
			? "install optional adapter · then host review exact confirm"
			: "select remote profile · no socket opened",
	};
}

export function formatRemoteTransportProbeRows(
	probe: RemoteTransportProbe = createRemoteTransportProbe(),
): string[] {
	return [
		`REMOTE TRANSPORT PROBE ${probe.id}`,
		`dependency=${probe.dependency} installed=${probe.installed} status=${probe.status} probe=${probe.probe}`,
		`target=${probe.target}`,
		`auth=${probe.auth}${probe.id === "none" ? "=-" : ""} key=${probe.key} hostKey=${probe.hostKey}`,
		`capabilities=list/read ${probe.capabilities.list} write ${probe.capabilities.write} destructive ${probe.capabilities.destructive}`,
		`execution=${probe.execution} network=not-opened willImport=${probe.willImport} willConnect=${probe.willConnect}`,
		`next=${probe.next}`,
	];
}

export function createRemoteReadOnlyAdapterContract(
	profile?: SftpRemoteProfile,
): RemoteReadOnlyAdapterContract {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		dependency: "@uulab/picos-sftp",
		adapter: "read-only",
		target: profile ? formatSftpRoot(profile) : "none",
		lifecycle: "planned",
		methods: {
			list: "planned",
			read: "planned",
			stat: "planned",
			write: "locked",
			delete: "locked",
			exec: "unsupported",
		},
		guards: {
			hostReview: true,
			exactConfirm: profile
				? `connect remote ${profile.id}`
				: "select remote profile",
			writeConfirm: "disabled",
			destructiveConfirm: "disabled",
		},
		execution: {
			importsTransport: false,
			opensSocket: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteReadOnlyAdapterContractRows(
	contract: RemoteReadOnlyAdapterContract = createRemoteReadOnlyAdapterContract(),
): string[] {
	return [
		`REMOTE READ ADAPTER CONTRACT ${contract.id}`,
		`provider=${contract.provider} dependency=${contract.dependency} adapter=${contract.adapter} lifecycle=${contract.lifecycle}`,
		`target=${contract.target}`,
		`methods=list ${contract.methods.list} read ${contract.methods.read} stat ${contract.methods.stat} write ${contract.methods.write} delete ${contract.methods.delete} exec ${contract.methods.exec}`,
		`guards=hostReview exactConfirm="${contract.guards.exactConfirm}" writeConfirm=${contract.guards.writeConfirm} destructiveConfirm=${contract.guards.destructiveConfirm}`,
		`execution=willImport=${contract.execution.importsTransport} willConnect=${contract.execution.opensSocket} willMutate=${contract.execution.mutatesRemote}`,
		contract.id === "none"
			? "next=select remote profile · no adapter import"
			: "next=implement adapter behind transport probe and host review",
	];
}

export function createRemoteFileRequestPreview(
	profile?: SftpRemoteProfile,
): RemoteFileRequestPreview {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		request: "list",
		path: profile?.root ?? "none",
		target: profile ? formatSftpRoot(profile) : "none",
		status: "blocked",
		reason: profile ? "adapter-not-connected" : "no-remote-profile",
		risk: "read",
		privilege: "user",
		confirm: profile ? `connect remote ${profile.id}` : "select remote profile",
		contract: "read-adapter-required",
		writes: "locked",
		destructive: "locked",
		exec: "unsupported",
		execution: {
			importsTransport: false,
			opensSocket: false,
			readsRemote: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteFileRequestPreviewRows(
	preview: RemoteFileRequestPreview = createRemoteFileRequestPreview(),
): string[] {
	return [
		`REMOTE FILE REQUEST PREVIEW ${preview.id}`,
		`request=${preview.request} provider=${preview.provider} status=${preview.status} reason=${preview.reason}`,
		`path=${preview.path}`,
		`target=${preview.target}`,
		`risk=${preview.risk} privilege=${preview.privilege} contract=${preview.contract}`,
		`guards=hostReview exactConfirm="${preview.confirm}" writes=${preview.writes} destructive=${preview.destructive} exec=${preview.exec}`,
		`execution=willImport=${preview.execution.importsTransport} willConnect=${preview.execution.opensSocket} willRead=${preview.execution.readsRemote} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no adapter import"
			: "next=host review and adapter install before remote list/read",
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
		...formatRemoteTransportProbeRows(createRemoteTransportProbe(profile)),
		"",
		...formatRemoteReadOnlyAdapterContractRows(
			createRemoteReadOnlyAdapterContract(profile),
		),
		"",
		...formatRemoteFileRequestPreviewRows(
			createRemoteFileRequestPreview(profile),
		),
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
