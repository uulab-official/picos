import { createHash } from "node:crypto";
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

export type RemoteHostKeyEvidence = {
	id: string;
	provider: "sftp";
	host: string;
	port: number | "-";
	target: string;
	status: "unverified";
	trust: "blocked";
	fingerprint: {
		algorithm: "sha256";
		value: "unknown";
		source: "not-collected";
	};
	knownHost: "not-checked";
	verification: "required";
	confirm: string;
	execution: {
		importsTransport: false;
		opensSocket: false;
		readsRemote: false;
		mutatesRemote: false;
	};
};

export type RemoteHostKeyEvidenceInput = {
	id: string;
	provider: "sftp";
	target: string;
	lookup: string;
	status: "missing" | "provided";
	source: "provided-host-key-fingerprint";
	fingerprint: string;
	parserInput: "missing" | "available";
	confirm: string;
	execution: {
		importsTransport: false;
		opensSocket: false;
		readsLocal: false;
		parsesKnownHosts: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteHostKeyEvidenceInputConfirmation = {
	input: RemoteHostKeyEvidenceInput;
	status: "recorded-blocked" | "rejected";
	fingerprint: string;
	parserInput: "missing" | "available";
	networkOpened: false;
	hostKeyScanned: false;
	trustApplied: false;
	knownHostsWritten: false;
	remoteMutated: false;
	message: string;
};

export type RemoteHostKeyEvidenceInputSession = Record<string, string>;

export type RemoteKnownHostsSourcePreview = {
	id: string;
	provider: "sftp";
	lookup: string;
	status: "not-read";
	source: "local-files";
	paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"];
	match: "unknown";
	hashed: "unknown";
	fingerprint: "sha256:unknown";
	confirm: string;
	execution: {
		readsLocal: false;
		importsTransport: false;
		opensSocket: false;
		scansHostKey: false;
		mutatesRemote: false;
	};
};

export type RemoteKnownHostsReadPreview = {
	id: string;
	provider: "sftp";
	lookup: string;
	status: "locked";
	source: "local-known-hosts";
	paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"];
	allowedBase: "~/.ssh";
	risk: "read";
	privilege: "user";
	parser: "not-run";
	match: "unknown";
	confirm: string;
	execution: {
		readsLocal: false;
		importsTransport: false;
		opensSocket: false;
		scansHostKey: false;
		mutatesRemote: false;
	};
};

export type RemoteKnownHostsReadResult = {
	id: string;
	provider: "sftp";
	lookup: string;
	status: "locked" | "provided";
	source: "local-known-hosts-read-result";
	path: "~/.ssh/known_hosts" | "none";
	bytes: number;
	lines: number;
	parserInput: "available" | "missing";
	confirm: string;
	execution: {
		readsLocal: false;
		usesProvidedContent: boolean;
		opensSocket: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteKnownHostsParserPreview = {
	id: string;
	provider: "sftp";
	lookup: string;
	status: "locked";
	source: "local-known-hosts";
	parser: "planned";
	formats: ["plain", "hashed", "marker", "cert-authority"];
	match: "unknown";
	candidates: 0;
	selected: "none";
	fingerprint: "sha256:unknown";
	trustDecision: "blocked";
	confirm: string;
	execution: {
		readsLocal: false;
		parsesRows: false;
		opensSocket: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteKnownHostsCandidate = {
	index: number;
	sourceLine: number;
	marker: "none" | "@cert-authority" | "@revoked" | "other";
	hostPattern: string;
	hostKind: "plain" | "hashed" | "pattern";
	keyType: string;
	fingerprint: string;
	match: "matched";
	trust: "candidate-only";
};

export type RemoteKnownHostsCandidatePreview = {
	id: string;
	provider: "sftp";
	lookup: string;
	status: "not-parsed" | "parsed-injected";
	source: "provided-known-hosts" | "local-known-hosts-read-result";
	candidates: RemoteKnownHostsCandidate[];
	selected: number | "none";
	match: "matched" | "unknown";
	decision: "blocked";
	execution: {
		readsLocal: false;
		parsesInjectedContent: boolean;
		opensSocket: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteKnownHostsCandidateSession = Record<
	string,
	RemoteKnownHostsCandidatePreview
>;

export type RemoteHostKeyTrustDecisionPreview = {
	id: string;
	provider: "sftp";
	target: string;
	lookup: string;
	status: "locked";
	collectedFingerprint: "sha256:unknown";
	knownHostsFingerprint: "sha256:unknown";
	match: "unknown";
	decision: "blocked";
	inputs: {
		hostKeyEvidence: "required";
		knownHostsParser: "required";
		hostReview: "required";
	};
	confirm: string;
	connectConfirm: string;
	execution: {
		importsTransport: false;
		opensSocket: false;
		readsLocal: false;
		parsesRows: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteHostKeyCompareDetail = {
	id: string;
	provider: "sftp";
	target: string;
	lookup: string;
	collectedFingerprint: string;
	candidateCount: number;
	selectedCandidate: number | "none";
	knownHostsCandidateFingerprint: string;
	candidateSource: RemoteKnownHostsCandidatePreview["source"] | "none";
	selectedCandidateLine: number | "none";
	selectedCandidateHost: string | "none";
	selectedCandidateKeyType: string | "none";
	match:
		| "candidate-only"
		| "evidence-only"
		| "matched"
		| "mismatch"
		| "unknown";
	decision: "blocked";
	confirm: string;
	execution: {
		importsTransport: false;
		opensSocket: false;
		readsLocal: false;
		parsesRows: false;
		scansHostKey: false;
		trustsHost: false;
		mutatesRemote: false;
	};
};

export type RemoteHostKeyTrustReviewConfirmation = {
	preview: RemoteHostKeyTrustDecisionPreview;
	status: "confirmed-blocked" | "rejected";
	input: string;
	networkOpened: false;
	trustApplied: false;
	knownHostsWritten: false;
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

export function createRemoteHostKeyEvidence(
	profile?: SftpRemoteProfile,
): RemoteHostKeyEvidence {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		host: profile?.host ?? "none",
		port: profile?.port ?? "-",
		target: profile ? formatSftpRoot(profile) : "none",
		status: "unverified",
		trust: "blocked",
		fingerprint: {
			algorithm: "sha256",
			value: "unknown",
			source: "not-collected",
		},
		knownHost: "not-checked",
		verification: "required",
		confirm: profile ? `connect remote ${profile.id}` : "select remote profile",
		execution: {
			importsTransport: false,
			opensSocket: false,
			readsRemote: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteHostKeyEvidenceRows(
	evidence: RemoteHostKeyEvidence = createRemoteHostKeyEvidence(),
): string[] {
	return [
		`REMOTE HOST KEY EVIDENCE ${evidence.id}`,
		`host=${evidence.host} port=${evidence.port} provider=${evidence.provider} status=${evidence.status} trust=${evidence.trust}`,
		`fingerprint=${evidence.fingerprint.algorithm}:${evidence.fingerprint.value} source=${evidence.fingerprint.source} knownHost=${evidence.knownHost}`,
		`target=${evidence.target}`,
		`guards=hostReview ${evidence.verification} exactConfirm="${evidence.confirm}" readAdapter=${evidence.id === "none" ? "blocked-until-profile" : "blocked-until-fingerprint"}`,
		`execution=willImport=${evidence.execution.importsTransport} willConnect=${evidence.execution.opensSocket} willRead=${evidence.execution.readsRemote} willMutate=${evidence.execution.mutatesRemote}`,
		evidence.id === "none"
			? "next=select remote profile · no fingerprint collection"
			: "next=collect fingerprint evidence before adapter evaluation",
	];
}

export function createRemoteHostKeyEvidenceInput(
	profile?: SftpRemoteProfile,
	fingerprint?: string,
): RemoteHostKeyEvidenceInput {
	const hasProvidedFingerprint = typeof fingerprint === "string";
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		target: profile ? formatSftpRoot(profile) : "none",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: hasProvidedFingerprint ? "provided" : "missing",
		source: "provided-host-key-fingerprint",
		fingerprint: hasProvidedFingerprint ? fingerprint : "sha256:unknown",
		parserInput: hasProvidedFingerprint ? "available" : "missing",
		confirm: profile
			? `compare host key ${profile.id}`
			: "select remote profile",
		execution: {
			importsTransport: false,
			opensSocket: false,
			readsLocal: false,
			parsesKnownHosts: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteHostKeyEvidenceInputRows(
	input: RemoteHostKeyEvidenceInput = createRemoteHostKeyEvidenceInput(),
): string[] {
	return [
		`REMOTE HOST KEY EVIDENCE INPUT ${input.id}`,
		`target=${input.target} lookup=${input.lookup} provider=${input.provider} status=${input.status} source=${input.source}`,
		`fingerprint=${input.fingerprint} parserInput=${input.parserInput}`,
		`guards=providedFingerprint exactConfirm="${input.confirm}" trust=blocked rawTransport=not-opened`,
		`execution=willImport=${input.execution.importsTransport} willConnect=${input.execution.opensSocket} willReadLocal=${input.execution.readsLocal} willParseKnownHosts=${input.execution.parsesKnownHosts} willScan=${input.execution.scansHostKey} willTrust=${input.execution.trustsHost} willMutate=${input.execution.mutatesRemote}`,
		input.id === "none"
			? "next=select remote profile · no host-key evidence input"
			: input.parserInput === "available"
				? "next=compare provided host-key evidence with selected known_hosts candidate"
				: "next=provide host-key fingerprint evidence after collection boundary",
	];
}

export function formatRemoteHostKeyEvidenceInputPromptRows(
	input: RemoteHostKeyEvidenceInput = createRemoteHostKeyEvidenceInput(),
	value = "",
): string[] {
	return [
		`:remote-host-key-evidence ${value}  confirm="${input.confirm}" enter=record esc=cancel`,
	];
}

export function createRemoteHostKeyEvidenceInputFromSession(
	profile: SftpRemoteProfile | undefined,
	session: RemoteHostKeyEvidenceInputSession = {},
): RemoteHostKeyEvidenceInput {
	const fingerprint = profile ? session[profile.id] : undefined;
	return createRemoteHostKeyEvidenceInput(profile, fingerprint);
}

export function submitRemoteHostKeyEvidenceInput(
	input: RemoteHostKeyEvidenceInput,
	fingerprint: string,
): RemoteHostKeyEvidenceInputConfirmation {
	const normalizedFingerprint = fingerprint.trim();
	const hasFingerprint = normalizedFingerprint.length > 0;
	return {
		input,
		status: hasFingerprint ? "recorded-blocked" : "rejected",
		fingerprint: hasFingerprint ? normalizedFingerprint : "sha256:unknown",
		parserInput: hasFingerprint ? "available" : "missing",
		networkOpened: false,
		hostKeyScanned: false,
		trustApplied: false,
		knownHostsWritten: false,
		remoteMutated: false,
		message: hasFingerprint
			? `remote host key evidence input recorded ${input.id} ${normalizedFingerprint}`
			: `remote host key evidence input rejected ${input.id}`,
	};
}

export function recordRemoteHostKeyEvidenceInputSession(
	session: RemoteHostKeyEvidenceInputSession,
	confirmation: RemoteHostKeyEvidenceInputConfirmation,
): RemoteHostKeyEvidenceInputSession {
	if (
		confirmation.status !== "recorded-blocked" ||
		confirmation.input.id === "none" ||
		confirmation.parserInput !== "available"
	) {
		return session;
	}
	return {
		...session,
		[confirmation.input.id]: confirmation.fingerprint,
	};
}

export function createRemoteKnownHostsSourcePreview(
	profile?: SftpRemoteProfile,
): RemoteKnownHostsSourcePreview {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: "not-read",
		source: "local-files",
		paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"],
		match: "unknown",
		hashed: "unknown",
		fingerprint: "sha256:unknown",
		confirm: profile ? `connect remote ${profile.id}` : "select remote profile",
		execution: {
			readsLocal: false,
			importsTransport: false,
			opensSocket: false,
			scansHostKey: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteKnownHostsSourcePreviewRows(
	preview: RemoteKnownHostsSourcePreview = createRemoteKnownHostsSourcePreview(),
): string[] {
	return [
		`REMOTE KNOWN_HOSTS SOURCE ${preview.id}`,
		`lookup=${preview.lookup} provider=${preview.provider} status=${preview.status} source=${preview.source}`,
		`paths=${preview.paths.join(", ")}`,
		`match=${preview.match} hashed=${preview.hashed} fingerprint=${preview.fingerprint}`,
		`guards=localReadPreview hostReview exactConfirm="${preview.confirm}"`,
		`execution=willReadLocal=${preview.execution.readsLocal} willImport=${preview.execution.importsTransport} willConnect=${preview.execution.opensSocket} willScan=${preview.execution.scansHostKey} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no local file read"
			: "next=preview local known_hosts lookup before fingerprint collection",
	];
}

export function createRemoteKnownHostsReadPreview(
	profile?: SftpRemoteProfile,
): RemoteKnownHostsReadPreview {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: "locked",
		source: "local-known-hosts",
		paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"],
		allowedBase: "~/.ssh",
		risk: "read",
		privilege: "user",
		parser: "not-run",
		match: "unknown",
		confirm: profile
			? `read known_hosts ${profile.id}`
			: "select remote profile",
		execution: {
			readsLocal: false,
			importsTransport: false,
			opensSocket: false,
			scansHostKey: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteKnownHostsReadPreviewRows(
	preview: RemoteKnownHostsReadPreview = createRemoteKnownHostsReadPreview(),
): string[] {
	return [
		`REMOTE KNOWN_HOSTS READ PREVIEW ${preview.id}`,
		`lookup=${preview.lookup} provider=${preview.provider} status=${preview.status} source=${preview.source}`,
		`paths=${preview.paths.join(", ")} allowedBase=${preview.allowedBase}`,
		`risk=${preview.risk} privilege=${preview.privilege} parser=${preview.parser} match=${preview.match}`,
		`guards=localFileBoundary exactConfirm="${preview.confirm}" hostReview=required`,
		`execution=willReadLocal=${preview.execution.readsLocal} willImport=${preview.execution.importsTransport} willConnect=${preview.execution.opensSocket} willScan=${preview.execution.scansHostKey} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no local file read"
			: "next=confirm local known_hosts read preview before parsing trust rows",
	];
}

function countKnownHostsContentLines(content: string): number {
	const trimmed = content.trimEnd();
	return trimmed ? trimmed.split(/\r\n|\n|\r/).length : 0;
}

function countKnownHostsContentBytes(content: string): number {
	return new TextEncoder().encode(content).length;
}

export function createRemoteKnownHostsReadResult(
	profile?: SftpRemoteProfile,
	content?: string,
): RemoteKnownHostsReadResult {
	const hasProvidedContent = typeof content === "string";
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: hasProvidedContent ? "provided" : "locked",
		source: "local-known-hosts-read-result",
		path: hasProvidedContent ? "~/.ssh/known_hosts" : "none",
		bytes: hasProvidedContent ? countKnownHostsContentBytes(content) : 0,
		lines: hasProvidedContent ? countKnownHostsContentLines(content) : 0,
		parserInput: hasProvidedContent ? "available" : "missing",
		confirm: profile
			? `read known_hosts ${profile.id}`
			: "select remote profile",
		execution: {
			readsLocal: false,
			usesProvidedContent: hasProvidedContent,
			opensSocket: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteKnownHostsReadResultRows(
	result: RemoteKnownHostsReadResult = createRemoteKnownHostsReadResult(),
): string[] {
	return [
		`REMOTE KNOWN_HOSTS READ RESULT ${result.id}`,
		`lookup=${result.lookup} provider=${result.provider} status=${result.status} source=${result.source}`,
		`path=${result.path} bytes=${result.bytes} lines=${result.lines} parserInput=${result.parserInput}`,
		`guards=localReadPreview exactConfirm="${result.confirm}" rawContent=hidden`,
		`execution=willReadLocal=${result.execution.readsLocal} usedProvidedContent=${result.execution.usesProvidedContent} willConnect=${result.execution.opensSocket} willScan=${result.execution.scansHostKey} willTrust=${result.execution.trustsHost} willMutate=${result.execution.mutatesRemote}`,
		result.id === "none"
			? "next=select remote profile · no known_hosts read result"
			: result.parserInput === "available"
				? "next=parse provided read result into known_hosts candidates"
				: "next=confirm local read preview before parser input",
	];
}

export function createRemoteKnownHostsParserPreview(
	profile?: SftpRemoteProfile,
): RemoteKnownHostsParserPreview {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: "locked",
		source: "local-known-hosts",
		parser: "planned",
		formats: ["plain", "hashed", "marker", "cert-authority"],
		match: "unknown",
		candidates: 0,
		selected: "none",
		fingerprint: "sha256:unknown",
		trustDecision: "blocked",
		confirm: profile
			? `parse known_hosts ${profile.id}`
			: "select remote profile",
		execution: {
			readsLocal: false,
			parsesRows: false,
			opensSocket: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteKnownHostsParserPreviewRows(
	preview: RemoteKnownHostsParserPreview = createRemoteKnownHostsParserPreview(),
): string[] {
	return [
		`REMOTE KNOWN_HOSTS PARSER PREVIEW ${preview.id}`,
		`lookup=${preview.lookup} provider=${preview.provider} status=${preview.status} source=${preview.source}`,
		`parser=${preview.parser} formats=${preview.formats.join(",")} match=${preview.match}`,
		`candidates=${preview.candidates} selected=${preview.selected} fingerprint=${preview.fingerprint} trustDecision=${preview.trustDecision}`,
		`guards=localReadRequired exactConfirm="${preview.confirm}" hostReview=required`,
		`execution=willReadLocal=${preview.execution.readsLocal} willParse=${preview.execution.parsesRows} willConnect=${preview.execution.opensSocket} willScan=${preview.execution.scansHostKey} willTrust=${preview.execution.trustsHost} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no parser run"
			: "next=confirm parser preview after local known_hosts read boundary",
	];
}

export function parseRemoteKnownHostsCandidates(
	lookup: string,
	content: string,
): RemoteKnownHostsCandidate[] {
	const normalizedLookup = normalizeKnownHostsLookup(lookup);
	if (!normalizedLookup) {
		return [];
	}
	const candidates: RemoteKnownHostsCandidate[] = [];
	for (const [lineIndex, rawLine] of content.split(/\r?\n/).entries()) {
		const parsed = parseKnownHostsLine(rawLine, lineIndex + 1);
		if (!parsed) {
			continue;
		}
		for (const hostPattern of parsed.hostPatterns) {
			if (!knownHostsPatternMatchesLookup(hostPattern, normalizedLookup)) {
				continue;
			}
			candidates.push({
				index: candidates.length + 1,
				sourceLine: parsed.sourceLine,
				marker: parsed.marker,
				hostPattern,
				hostKind: getKnownHostsPatternKind(hostPattern),
				keyType: parsed.keyType,
				fingerprint: createKnownHostsFingerprint(parsed.keyBlob),
				match: "matched",
				trust: "candidate-only",
			});
		}
	}
	return candidates;
}

export function createRemoteKnownHostsCandidatePreview(
	profile?: SftpRemoteProfile,
	content?: string,
	source: RemoteKnownHostsCandidatePreview["source"] = "provided-known-hosts",
): RemoteKnownHostsCandidatePreview {
	const lookup = profile ? `${profile.host}:${profile.port}` : "none";
	const hasInjectedContent = typeof content === "string";
	const candidates =
		profile && hasInjectedContent
			? parseRemoteKnownHostsCandidates(lookup, content)
			: [];
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		lookup,
		status: hasInjectedContent ? "parsed-injected" : "not-parsed",
		source,
		candidates,
		selected: candidates[0]?.index ?? "none",
		match: candidates.length > 0 ? "matched" : "unknown",
		decision: "blocked",
		execution: {
			readsLocal: false,
			parsesInjectedContent: hasInjectedContent,
			opensSocket: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function createRemoteKnownHostsCandidatePreviewFromSession(
	profile: SftpRemoteProfile | undefined,
	session: RemoteKnownHostsCandidateSession = {},
): RemoteKnownHostsCandidatePreview {
	return profile
		? (session[profile.id] ?? createRemoteKnownHostsCandidatePreview(profile))
		: createRemoteKnownHostsCandidatePreview();
}

export function recordRemoteKnownHostsCandidateSession(
	session: RemoteKnownHostsCandidateSession,
	preview: RemoteKnownHostsCandidatePreview,
): RemoteKnownHostsCandidateSession {
	if (
		preview.id === "none" ||
		preview.status !== "parsed-injected" ||
		preview.candidates.length === 0 ||
		preview.selected === "none"
	) {
		return session;
	}
	return {
		...session,
		[preview.id]: preview,
	};
}

export function parseRemoteKnownHostsCandidatesFromReadResult(
	profile?: SftpRemoteProfile,
	content?: string,
): RemoteKnownHostsCandidatePreview {
	return createRemoteKnownHostsCandidatePreview(
		profile,
		content,
		"local-known-hosts-read-result",
	);
}

export function formatRemoteKnownHostsCandidatePreviewRows(
	preview: RemoteKnownHostsCandidatePreview = createRemoteKnownHostsCandidatePreview(),
): string[] {
	const rows = [
		`REMOTE KNOWN_HOSTS CANDIDATES ${preview.id}`,
		`lookup=${preview.lookup} provider=${preview.provider} status=${preview.status} source=${preview.source}`,
		`candidates=${preview.candidates.length} selected=${preview.selected} match=${preview.match} decision=${preview.decision}`,
	];
	if (preview.candidates.length === 0) {
		rows.push("no known_hosts candidates for selected lookup");
	} else {
		rows.push(
			...preview.candidates.slice(0, 3).map((candidate) => {
				const marker = candidate.index === preview.selected ? ">" : " ";
				return `${marker} #${candidate.index} line=${candidate.sourceLine} marker=${candidate.marker} host=${candidate.hostPattern} kind=${candidate.hostKind} key=${candidate.keyType} fingerprint=${candidate.fingerprint} trust=${candidate.trust}`;
			}),
		);
	}
	rows.push(
		`execution=willReadLocal=${preview.execution.readsLocal} parsedInjected=${preview.execution.parsesInjectedContent} willConnect=${preview.execution.opensSocket} willScan=${preview.execution.scansHostKey} willTrust=${preview.execution.trustsHost} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no candidate parsing"
			: "next=compare selected candidate with collected host key evidence before trust review",
	);
	return rows;
}

export function createRemoteHostKeyTrustDecisionPreview(
	profile?: SftpRemoteProfile,
): RemoteHostKeyTrustDecisionPreview {
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		target: profile ? formatSftpRoot(profile) : "none",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		status: "locked",
		collectedFingerprint: "sha256:unknown",
		knownHostsFingerprint: "sha256:unknown",
		match: "unknown",
		decision: "blocked",
		inputs: {
			hostKeyEvidence: "required",
			knownHostsParser: "required",
			hostReview: "required",
		},
		confirm: profile
			? `review host trust ${profile.id}`
			: "select remote profile",
		connectConfirm: profile
			? `connect remote ${profile.id}`
			: "select remote profile",
		execution: {
			importsTransport: false,
			opensSocket: false,
			readsLocal: false,
			parsesRows: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteHostKeyTrustDecisionPreviewRows(
	preview: RemoteHostKeyTrustDecisionPreview = createRemoteHostKeyTrustDecisionPreview(),
): string[] {
	return [
		`REMOTE HOST KEY TRUST DECISION ${preview.id}`,
		`target=${preview.target} lookup=${preview.lookup} provider=${preview.provider} status=${preview.status}`,
		`collected=${preview.collectedFingerprint} knownHosts=${preview.knownHostsFingerprint} match=${preview.match} decision=${preview.decision}`,
		`inputs=hostKeyEvidence:${preview.inputs.hostKeyEvidence} knownHostsParser:${preview.inputs.knownHostsParser} hostReview:${preview.inputs.hostReview}`,
		`guards=compareOnly exactConfirm="${preview.confirm}" connectConfirm="${preview.connectConfirm}"`,
		`execution=willImport=${preview.execution.importsTransport} willConnect=${preview.execution.opensSocket} willReadLocal=${preview.execution.readsLocal} willParse=${preview.execution.parsesRows} willScan=${preview.execution.scansHostKey} willTrust=${preview.execution.trustsHost} willMutate=${preview.execution.mutatesRemote}`,
		preview.id === "none"
			? "next=select remote profile · no trust decision"
			: "next=collect host key evidence and parse known_hosts before trust decision",
	];
}

export function createRemoteHostKeyCompareDetail(
	profile?: SftpRemoteProfile,
	candidatePreview?: RemoteKnownHostsCandidatePreview,
	evidenceInput?: RemoteHostKeyEvidenceInput,
): RemoteHostKeyCompareDetail {
	const selectedCandidate =
		typeof candidatePreview?.selected === "number"
			? candidatePreview.candidates.find(
					(candidate) => candidate.index === candidatePreview.selected,
				)
			: undefined;
	const collectedFingerprint =
		evidenceInput?.parserInput === "available"
			? evidenceInput.fingerprint
			: "sha256:unknown";
	const knownHostsFingerprint =
		selectedCandidate?.fingerprint ?? "sha256:unknown";
	const match = selectedCandidate
		? collectedFingerprint === "sha256:unknown"
			? "candidate-only"
			: collectedFingerprint === selectedCandidate.fingerprint
				? "matched"
				: "mismatch"
		: collectedFingerprint !== "sha256:unknown"
			? "evidence-only"
			: "unknown";
	return {
		id: profile?.id ?? "none",
		provider: "sftp",
		target: profile ? formatSftpRoot(profile) : "none",
		lookup: profile ? `${profile.host}:${profile.port}` : "none",
		collectedFingerprint,
		candidateCount: candidatePreview?.candidates.length ?? 0,
		selectedCandidate: selectedCandidate?.index ?? "none",
		knownHostsCandidateFingerprint: knownHostsFingerprint,
		candidateSource: selectedCandidate
			? (candidatePreview?.source ?? "none")
			: "none",
		selectedCandidateLine: selectedCandidate?.sourceLine ?? "none",
		selectedCandidateHost: selectedCandidate?.hostPattern ?? "none",
		selectedCandidateKeyType: selectedCandidate?.keyType ?? "none",
		match,
		decision: "blocked",
		confirm: profile
			? `review host trust ${profile.id}`
			: "select remote profile",
		execution: {
			importsTransport: false,
			opensSocket: false,
			readsLocal: false,
			parsesRows: false,
			scansHostKey: false,
			trustsHost: false,
			mutatesRemote: false,
		},
	};
}

export function formatRemoteHostKeyCompareDetailRows(
	detail: RemoteHostKeyCompareDetail = createRemoteHostKeyCompareDetail(),
): string[] {
	return [
		`REMOTE HOST KEY COMPARE DETAIL ${detail.id}`,
		`target=${detail.target} lookup=${detail.lookup} provider=${detail.provider}`,
		`collected=${detail.collectedFingerprint} candidates=${detail.candidateCount} selected=${detail.selectedCandidate} knownHosts=${detail.knownHostsCandidateFingerprint}`,
		`candidateSource=${detail.candidateSource} line=${detail.selectedCandidateLine} host=${detail.selectedCandidateHost} key=${detail.selectedCandidateKeyType}`,
		`match=${detail.match} decision=${detail.decision} confirm="${detail.confirm}"`,
		`execution=willImport=${detail.execution.importsTransport} willConnect=${detail.execution.opensSocket} willReadLocal=${detail.execution.readsLocal} willParse=${detail.execution.parsesRows} willScan=${detail.execution.scansHostKey} willTrust=${detail.execution.trustsHost} willMutate=${detail.execution.mutatesRemote}`,
		detail.id === "none"
			? "next=select remote profile · no compare detail"
			: detail.match === "matched"
				? "next=review blocked trust decision; matched evidence remains read-only"
				: detail.match === "mismatch"
					? "next=review blocked trust decision; fingerprint mismatch requires operator attention"
					: detail.match === "candidate-only"
						? "next=collect host key evidence before trust review; candidate comparison is read-only"
						: detail.match === "evidence-only"
							? "next=parse known_hosts candidates before trust review; evidence remains read-only"
							: "next=collect evidence and parse known_hosts candidates before compare detail",
	];
}

export function submitRemoteHostKeyTrustReview(
	preview: RemoteHostKeyTrustDecisionPreview,
	input: string,
): RemoteHostKeyTrustReviewConfirmation {
	const normalizedInput = input.trim();
	const confirmed = normalizedInput === preview.confirm;
	return {
		preview,
		status: confirmed ? "confirmed-blocked" : "rejected",
		input: normalizedInput,
		networkOpened: false,
		trustApplied: false,
		knownHostsWritten: false,
		message: confirmed
			? `remote host trust review blocked ${preview.id} ${preview.target}`
			: `remote host trust review confirmation rejected ${preview.id}`,
	};
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

export function formatRemoteHostKeyTrustReviewAuditMessage(
	confirmation: RemoteHostKeyTrustReviewConfirmation,
): string {
	const { preview } = confirmation;
	return [
		"remote host trust review audit",
		"action=review",
		`id=${preview.id}`,
		`target=${quoteAuditField(preview.target)}`,
		`status=${confirmation.status}`,
		`match=${preview.match}`,
		`decision=${preview.decision}`,
		`collected=${preview.collectedFingerprint}`,
		`knownHosts=${preview.knownHostsFingerprint}`,
		"network=not-opened",
		"trust=not-applied",
		"knownHostsWrite=false",
		`confirm=${quoteAuditField(preview.confirm)}`,
		`connectConfirm=${quoteAuditField(preview.connectConfirm)}`,
	].join(" ");
}

export function formatRemoteHostKeyEvidenceInputAuditMessage(
	confirmation: RemoteHostKeyEvidenceInputConfirmation,
): string {
	const { input } = confirmation;
	return [
		"remote host key evidence input audit",
		"action=evidence",
		`id=${input.id}`,
		`target=${quoteAuditField(input.target)}`,
		`lookup=${input.lookup}`,
		`status=${confirmation.status}`,
		`fingerprint=${confirmation.fingerprint}`,
		`parserInput=${confirmation.parserInput}`,
		"network=not-opened",
		`scan=${confirmation.hostKeyScanned}`,
		"trust=not-applied",
		`knownHostsWrite=${confirmation.knownHostsWritten}`,
		`remoteMutate=${confirmation.remoteMutated}`,
		`confirm=${quoteAuditField(input.confirm)}`,
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
		...formatRemoteHostKeyEvidenceRows(createRemoteHostKeyEvidence(profile)),
		"",
		...formatRemoteHostKeyEvidenceInputRows(
			createRemoteHostKeyEvidenceInput(profile),
		),
		"",
		...formatRemoteKnownHostsSourcePreviewRows(
			createRemoteKnownHostsSourcePreview(profile),
		),
		"",
		...formatRemoteKnownHostsReadPreviewRows(
			createRemoteKnownHostsReadPreview(profile),
		),
		"",
		...formatRemoteKnownHostsReadResultRows(
			createRemoteKnownHostsReadResult(profile),
		),
		"",
		...formatRemoteKnownHostsParserPreviewRows(
			createRemoteKnownHostsParserPreview(profile),
		),
		"",
		...formatRemoteKnownHostsCandidatePreviewRows(
			createRemoteKnownHostsCandidatePreview(profile),
		),
		"",
		...formatRemoteHostKeyTrustDecisionPreviewRows(
			createRemoteHostKeyTrustDecisionPreview(profile),
		),
		"",
		...formatRemoteHostKeyCompareDetailRows(
			createRemoteHostKeyCompareDetail(profile),
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

type ParsedKnownHostsLine = {
	sourceLine: number;
	marker: RemoteKnownHostsCandidate["marker"];
	hostPatterns: string[];
	keyType: string;
	keyBlob: string;
};

function parseKnownHostsLine(
	rawLine: string,
	sourceLine: number,
): ParsedKnownHostsLine | undefined {
	const line = rawLine.trim();
	if (!line || line.startsWith("#")) {
		return undefined;
	}
	const parts = line.split(/\s+/);
	const first = parts[0];
	const hasMarker = first?.startsWith("@") ?? false;
	const marker = normalizeKnownHostsMarker(hasMarker ? first : undefined);
	const hostField = hasMarker ? parts[1] : first;
	const keyType = hasMarker ? parts[2] : parts[1];
	const keyBlob = hasMarker ? parts[3] : parts[2];
	if (!hostField || !keyType || !keyBlob) {
		return undefined;
	}
	return {
		sourceLine,
		marker,
		hostPatterns: hostField.split(",").filter(Boolean),
		keyType,
		keyBlob,
	};
}

function normalizeKnownHostsMarker(
	marker?: string,
): RemoteKnownHostsCandidate["marker"] {
	if (marker === "@cert-authority" || marker === "@revoked") {
		return marker;
	}
	return marker ? "other" : "none";
}

function normalizeKnownHostsLookup(
	lookup: string,
): { host: string; port: number } | undefined {
	const trimmed = lookup.trim();
	const bracketMatch = trimmed.match(/^\[([^\]]+)\]:(\d+)$/);
	if (bracketMatch) {
		const port = Number(bracketMatch[2]);
		return port >= 1 && port <= 65535
			? { host: bracketMatch[1] as string, port }
			: undefined;
	}
	const lastColon = trimmed.lastIndexOf(":");
	if (lastColon <= 0) {
		return trimmed ? { host: trimmed, port: 22 } : undefined;
	}
	const host = trimmed.slice(0, lastColon);
	const port = Number(trimmed.slice(lastColon + 1));
	if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
		return undefined;
	}
	return { host, port };
}

function knownHostsPatternMatchesLookup(
	pattern: string,
	lookup: { host: string; port: number },
): boolean {
	const bracketMatch = pattern.match(/^\[([^\]]+)\]:(\d+)$/);
	if (bracketMatch) {
		return (
			bracketMatch[1] === lookup.host && Number(bracketMatch[2]) === lookup.port
		);
	}
	if (pattern.startsWith("|")) {
		return false;
	}
	if (lookup.port !== 22) {
		return false;
	}
	if (pattern.includes("*") || pattern.includes("?")) {
		return knownHostsWildcardMatches(pattern, lookup.host);
	}
	return pattern === lookup.host;
}

function knownHostsWildcardMatches(pattern: string, host: string): boolean {
	const wildcard = Array.from(pattern)
		.map((character) => {
			if (character === "*") {
				return ".*";
			}
			if (character === "?") {
				return ".";
			}
			return character.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
		})
		.join("");
	return new RegExp(`^${wildcard}$`).test(host);
}

function getKnownHostsPatternKind(
	pattern: string,
): RemoteKnownHostsCandidate["hostKind"] {
	if (pattern.startsWith("|")) {
		return "hashed";
	}
	return pattern.includes("*") || pattern.includes("?") ? "pattern" : "plain";
}

function createKnownHostsFingerprint(keyBlob: string): string {
	const digest = createHash("sha256")
		.update(Buffer.from(keyBlob, "base64"))
		.digest("base64")
		.replace(/=+$/g, "");
	return `SHA256:${digest}`;
}

function quoteAuditField(value: string): string {
	return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
