import { describe, expect, test } from "bun:test";
import { defaultConfig, mergeConfig } from "../src/config/schema";
import {
	createRemoteConnectPreview,
	createRemoteFileContext,
	createRemoteFileRequestPreview,
	createRemoteHostKeyCompareDetail,
	createRemoteHostKeyEvidence,
	createRemoteHostKeyEvidenceInput,
	createRemoteHostKeyTrustDecisionPreview,
	createRemoteKnownHostsCandidatePreview,
	createRemoteKnownHostsParserPreview,
	createRemoteKnownHostsReadPreview,
	createRemoteKnownHostsReadResult,
	createRemoteKnownHostsSourcePreview,
	createRemoteReadOnlyAdapterContract,
	createRemoteTransportProbe,
	formatRemoteAdapterBoundaryRows,
	formatRemoteConnectConfirmationAuditMessage,
	formatRemoteConnectPreviewRows,
	formatRemoteFileRequestPreviewRows,
	formatRemoteHandoffBoundaryRows,
	formatRemoteHostKeyCompareDetailRows,
	formatRemoteHostKeyEvidenceInputAuditMessage,
	formatRemoteHostKeyEvidenceInputPromptRows,
	formatRemoteHostKeyEvidenceInputRows,
	formatRemoteHostKeyEvidenceRows,
	formatRemoteHostKeyTrustDecisionPreviewRows,
	formatRemoteHostKeyTrustReviewAuditMessage,
	formatRemoteHostReviewAuditMessage,
	formatRemoteHostReviewRows,
	formatRemoteKnownHostsCandidatePreviewRows,
	formatRemoteKnownHostsParserPreviewRows,
	formatRemoteKnownHostsReadPreviewRows,
	formatRemoteKnownHostsReadResultRows,
	formatRemoteKnownHostsSourcePreviewRows,
	formatRemoteProfiles,
	formatRemoteProviderStatus,
	formatRemoteReadOnlyAdapterContractRows,
	formatRemoteTransportProbeRows,
	normalizeRemoteProfiles,
	parseRemoteKnownHostsCandidates,
	parseRemoteKnownHostsCandidatesFromReadResult,
	parseRemoteProfileCommand,
	submitRemoteConnectConfirmation,
	submitRemoteHostKeyEvidenceInput,
	submitRemoteHostKeyTrustReview,
} from "../src/core/remotes";

describe("remote profiles", () => {
	test("defaults to no configured remote profiles", () => {
		expect(defaultConfig.remoteProfiles).toEqual([]);
		expect(formatRemoteProfiles([])).toBe("No remote profiles configured.");
	});

	test("normalizes safe SFTP profile fields and drops secrets", () => {
		const profiles = normalizeRemoteProfiles([
			{
				id: "prod",
				host: "example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
				password: "never-store-me",
			},
		]);

		expect(profiles).toEqual([
			{
				id: "prod",
				kind: "sftp",
				host: "example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			},
		]);
		expect(JSON.stringify(profiles)).not.toContain("never-store-me");
	});

	test("ignores invalid remote profile entries", () => {
		expect(
			normalizeRemoteProfiles([
				{ id: "bad host", host: "example.com", username: "me" },
				{ id: "missing-user", host: "example.com" },
				{ id: "bad-port", host: "example.com", username: "me", port: 70000 },
			]),
		).toEqual([]);
	});

	test("merges remote profiles from config input", () => {
		expect(
			mergeConfig({
				remoteProfiles: [
					{
						id: "dev",
						host: "dev.example.com",
						username: "alice",
					},
				],
			}).remoteProfiles,
		).toEqual([
			{
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			},
		]);
	});

	test("formats remote profiles without exposing secrets", () => {
		const output = formatRemoteProfiles([
			{
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			},
		]);

		expect(output).toContain("dev");
		expect(output).toContain("sftp://alice@dev.example.com:22");
		expect(output).toContain("root=.");
	});

	test("parses one-line remote profile commands", () => {
		expect(
			parseRemoteProfileCommand(
				"prod deploy@example.com:2222 /srv/app key=~/.ssh/id_ed25519",
			),
		).toEqual({
			id: "prod",
			kind: "sftp",
			host: "example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});
		expect(parseRemoteProfileCommand("dev alice@dev.example.com")).toEqual({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: ".",
		});
		expect(
			parseRemoteProfileCommand("bad host alice@example.com"),
		).toBeUndefined();
		expect(parseRemoteProfileCommand("prod example.com")).toBeUndefined();
	});

	test("formats remote provider status without opening a network session", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("Profile: dev");
		expect(output).toContain("Provider: sftp");
		expect(output).toContain("Root: sftp://alice@dev.example.com:22/srv/app");
		expect(output).toContain("Status: adapter pending");
		expect(output).toContain("REMOTE HANDOFF dev");
		expect(output).toContain("session=staged");
		expect(output).toContain("REMOTE ADAPTER BOUNDARY dev");
		expect(output).toContain(
			"dependency=@uulab/picos-sftp status=not installed",
		);
		expect(output).toContain("REMOTE TRANSPORT PROBE dev");
		expect(output).toContain(
			"execution=blocked network=not-opened willImport=false willConnect=false",
		);
		expect(output).toContain("REMOTE HOST REVIEW dev");
		expect(output).toContain("network=not opened");
		expect(output).toContain("REMOTE CONNECT PREVIEW dev");
		expect(output).toContain(
			"willExecute=false reason=sftp-adapter-not-installed",
		);
	});

	test("creates a locked remote file context for selected profiles", async () => {
		const context = await createRemoteFileContext({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(context).toEqual({
			id: "dev",
			kind: "sftp",
			label: "dev",
			root: "sftp://alice@dev.example.com:22/srv/app",
			status: "adapter pending",
			writes: "locked",
		});
	});

	test("formats remote handoff boundary rows before and after staging", () => {
		const profile = {
			id: "dev",
			kind: "sftp" as const,
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		};

		expect(formatRemoteHandoffBoundaryRows({ profile })).toEqual([
			"REMOTE HANDOFF dev",
			"provider=sftp root=sftp://alice@dev.example.com:22/srv/app",
			"status=profile ready writes=locked session=not staged",
			"controls=enter stage · files opens locked SFTP boundary · no network session",
		]);

		expect(
			formatRemoteHandoffBoundaryRows({
				profile,
				context: {
					id: "dev",
					kind: "sftp",
					label: "dev",
					root: "sftp://alice@dev.example.com:22/srv/app",
					status: "adapter pending",
					writes: "locked",
				},
			}),
		).toEqual([
			"REMOTE HANDOFF dev",
			"provider=sftp root=sftp://alice@dev.example.com:22/srv/app",
			"status=adapter pending writes=locked session=staged",
			"controls=enter restage · files opens locked SFTP boundary · no network session",
		]);
	});

	test("formats remote host review rows without secrets or sessions", () => {
		expect(
			formatRemoteHostReviewRows({
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toEqual([
			"REMOTE HOST REVIEW prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"identity user=deploy host=prod.example.com port=2222 key=configured",
			"policy=read-only adapter=pending writes=locked network=not opened",
			"confirm=connect remote prod",
			"controls=review host · enter stage context · future connect requires exact confirmation",
		]);

		expect(
			formatRemoteHostReviewRows({
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			}).join("\n"),
		).not.toContain("password");
	});

	test("formats remote adapter boundary rows before transport exists", () => {
		expect(
			formatRemoteAdapterBoundaryRows({
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toEqual([
			"REMOTE ADAPTER BOUNDARY prod",
			"transport=sftp dependency=@uulab/picos-sftp status=not installed session=not opened",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"auth=user=deploy key=configured hostKey=unverified",
			"capabilities=list/read planned write locked destructive locked",
			"policy=read-only network=blocked-until-confirm confirm=connect remote prod",
			"controls=enter stage context · future connect opens host review dialog first",
		]);

		expect(formatRemoteAdapterBoundaryRows().join("\n")).toBe(
			[
				"REMOTE ADAPTER BOUNDARY none",
				"transport=sftp dependency=@uulab/picos-sftp status=not installed session=not opened",
				"target=none",
				"auth=user=- key=none hostKey=unverified",
				"capabilities=list/read planned write locked destructive locked",
				"policy=read-only network=blocked-until-profile confirm=select remote profile",
				"controls=j/k select · enter stage context · config remotes create profile",
			].join("\n"),
		);
	});

	test("formats remote transport probe rows without importing transport", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteTransportProbe(profile)).toEqual({
			id: "prod",
			dependency: "@uulab/picos-sftp",
			installed: false,
			status: "missing",
			probe: "static",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			auth: "user",
			key: "configured",
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
			next: "install optional adapter · then host review exact confirm",
		});
		expect(
			formatRemoteTransportProbeRows(createRemoteTransportProbe(profile)),
		).toEqual([
			"REMOTE TRANSPORT PROBE prod",
			"dependency=@uulab/picos-sftp installed=false status=missing probe=static",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"auth=user key=configured hostKey=unverified",
			"capabilities=list/read planned write locked destructive locked",
			"execution=blocked network=not-opened willImport=false willConnect=false",
			"next=install optional adapter · then host review exact confirm",
		]);

		expect(formatRemoteTransportProbeRows().join("\n")).toBe(
			[
				"REMOTE TRANSPORT PROBE none",
				"dependency=@uulab/picos-sftp installed=false status=missing probe=static",
				"target=none",
				"auth=user=- key=none hostKey=unverified",
				"capabilities=list/read planned write locked destructive locked",
				"execution=blocked network=not-opened willImport=false willConnect=false",
				"next=select remote profile · no socket opened",
			].join("\n"),
		);
	});

	test("formats remote read-only adapter contract rows without importing transport", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteReadOnlyAdapterContract(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			dependency: "@uulab/picos-sftp",
			adapter: "read-only",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
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
				exactConfirm: "connect remote prod",
				writeConfirm: "disabled",
				destructiveConfirm: "disabled",
			},
			execution: {
				importsTransport: false,
				opensSocket: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteReadOnlyAdapterContractRows(
				createRemoteReadOnlyAdapterContract(profile),
			),
		).toEqual([
			"REMOTE READ ADAPTER CONTRACT prod",
			"provider=sftp dependency=@uulab/picos-sftp adapter=read-only lifecycle=planned",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"methods=list planned read planned stat planned write locked delete locked exec unsupported",
			'guards=hostReview exactConfirm="connect remote prod" writeConfirm=disabled destructiveConfirm=disabled',
			"execution=willImport=false willConnect=false willMutate=false",
			"next=implement adapter behind transport probe and host review",
		]);

		expect(formatRemoteReadOnlyAdapterContractRows().join("\n")).toBe(
			[
				"REMOTE READ ADAPTER CONTRACT none",
				"provider=sftp dependency=@uulab/picos-sftp adapter=read-only lifecycle=planned",
				"target=none",
				"methods=list planned read planned stat planned write locked delete locked exec unsupported",
				'guards=hostReview exactConfirm="select remote profile" writeConfirm=disabled destructiveConfirm=disabled',
				"execution=willImport=false willConnect=false willMutate=false",
				"next=select remote profile · no adapter import",
			].join("\n"),
		);
	});

	test("includes remote read-only adapter contract in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE READ ADAPTER CONTRACT dev");
		expect(output).toContain(
			"methods=list planned read planned stat planned write locked delete locked exec unsupported",
		);
		expect(output).toContain(
			"execution=willImport=false willConnect=false willMutate=false",
		);
	});

	test("formats remote file request preview rows without reading remote files", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteFileRequestPreview(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			request: "list",
			path: "/srv/app",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			status: "blocked",
			reason: "adapter-not-connected",
			risk: "read",
			privilege: "user",
			confirm: "connect remote prod",
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
		});
		expect(
			formatRemoteFileRequestPreviewRows(
				createRemoteFileRequestPreview(profile),
			),
		).toEqual([
			"REMOTE FILE REQUEST PREVIEW prod",
			"request=list provider=sftp status=blocked reason=adapter-not-connected",
			"path=/srv/app",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"risk=read privilege=user contract=read-adapter-required",
			'guards=hostReview exactConfirm="connect remote prod" writes=locked destructive=locked exec=unsupported',
			"execution=willImport=false willConnect=false willRead=false willMutate=false",
			"next=host review and adapter install before remote list/read",
		]);

		expect(formatRemoteFileRequestPreviewRows().join("\n")).toBe(
			[
				"REMOTE FILE REQUEST PREVIEW none",
				"request=list provider=sftp status=blocked reason=no-remote-profile",
				"path=none",
				"target=none",
				"risk=read privilege=user contract=read-adapter-required",
				'guards=hostReview exactConfirm="select remote profile" writes=locked destructive=locked exec=unsupported',
				"execution=willImport=false willConnect=false willRead=false willMutate=false",
				"next=select remote profile · no adapter import",
			].join("\n"),
		);
	});

	test("includes remote file request preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE FILE REQUEST PREVIEW dev");
		expect(output).toContain(
			"request=list provider=sftp status=blocked reason=adapter-not-connected",
		);
		expect(output).toContain(
			"execution=willImport=false willConnect=false willRead=false willMutate=false",
		);
	});

	test("formats remote host key evidence without opening transport", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteHostKeyEvidence(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			host: "prod.example.com",
			port: 2222,
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			status: "unverified",
			trust: "blocked",
			fingerprint: {
				algorithm: "sha256",
				value: "unknown",
				source: "not-collected",
			},
			knownHost: "not-checked",
			verification: "required",
			confirm: "connect remote prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsRemote: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteHostKeyEvidenceRows(createRemoteHostKeyEvidence(profile)),
		).toEqual([
			"REMOTE HOST KEY EVIDENCE prod",
			"host=prod.example.com port=2222 provider=sftp status=unverified trust=blocked",
			"fingerprint=sha256:unknown source=not-collected knownHost=not-checked",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			'guards=hostReview required exactConfirm="connect remote prod" readAdapter=blocked-until-fingerprint',
			"execution=willImport=false willConnect=false willRead=false willMutate=false",
			"next=collect fingerprint evidence before adapter evaluation",
		]);

		expect(formatRemoteHostKeyEvidenceRows().join("\n")).toBe(
			[
				"REMOTE HOST KEY EVIDENCE none",
				"host=none port=- provider=sftp status=unverified trust=blocked",
				"fingerprint=sha256:unknown source=not-collected knownHost=not-checked",
				"target=none",
				'guards=hostReview required exactConfirm="select remote profile" readAdapter=blocked-until-profile',
				"execution=willImport=false willConnect=false willRead=false willMutate=false",
				"next=select remote profile · no fingerprint collection",
			].join("\n"),
		);
	});

	test("includes remote host key evidence in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE HOST KEY EVIDENCE dev");
		expect(output).toContain(
			"fingerprint=sha256:unknown source=not-collected knownHost=not-checked",
		);
		expect(output).toContain(
			"execution=willImport=false willConnect=false willRead=false willMutate=false",
		);
	});

	test("formats remote host key evidence input without scanning hosts", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(
			createRemoteHostKeyEvidenceInput(profile, "SHA256:providedFingerprint"),
		).toEqual({
			id: "prod",
			provider: "sftp",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			lookup: "prod.example.com:2222",
			status: "provided",
			source: "provided-host-key-fingerprint",
			fingerprint: "SHA256:providedFingerprint",
			parserInput: "available",
			confirm: "compare host key prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsLocal: false,
				parsesKnownHosts: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteHostKeyEvidenceInputRows(
				createRemoteHostKeyEvidenceInput(profile, "SHA256:providedFingerprint"),
			),
		).toEqual([
			"REMOTE HOST KEY EVIDENCE INPUT prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp status=provided source=provided-host-key-fingerprint",
			"fingerprint=SHA256:providedFingerprint parserInput=available",
			'guards=providedFingerprint exactConfirm="compare host key prod" trust=blocked rawTransport=not-opened',
			"execution=willImport=false willConnect=false willReadLocal=false willParseKnownHosts=false willScan=false willTrust=false willMutate=false",
			"next=compare provided host-key evidence with selected known_hosts candidate",
		]);

		expect(formatRemoteHostKeyEvidenceInputRows().join("\n")).toBe(
			[
				"REMOTE HOST KEY EVIDENCE INPUT none",
				"target=none lookup=none provider=sftp status=missing source=provided-host-key-fingerprint",
				"fingerprint=sha256:unknown parserInput=missing",
				'guards=providedFingerprint exactConfirm="select remote profile" trust=blocked rawTransport=not-opened',
				"execution=willImport=false willConnect=false willReadLocal=false willParseKnownHosts=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no host-key evidence input",
			].join("\n"),
		);
	});

	test("includes empty remote host key evidence input in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE HOST KEY EVIDENCE INPUT dev");
		expect(output).toContain("fingerprint=sha256:unknown parserInput=missing");
		expect(output).toContain(
			"execution=willImport=false willConnect=false willReadLocal=false willParseKnownHosts=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("formats remote known_hosts source preview without reading local files", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteKnownHostsSourcePreview(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			lookup: "prod.example.com:2222",
			status: "not-read",
			source: "local-files",
			paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"],
			match: "unknown",
			hashed: "unknown",
			fingerprint: "sha256:unknown",
			confirm: "connect remote prod",
			execution: {
				readsLocal: false,
				importsTransport: false,
				opensSocket: false,
				scansHostKey: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteKnownHostsSourcePreviewRows(
				createRemoteKnownHostsSourcePreview(profile),
			),
		).toEqual([
			"REMOTE KNOWN_HOSTS SOURCE prod",
			"lookup=prod.example.com:2222 provider=sftp status=not-read source=local-files",
			"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2",
			"match=unknown hashed=unknown fingerprint=sha256:unknown",
			'guards=localReadPreview hostReview exactConfirm="connect remote prod"',
			"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
			"next=preview local known_hosts lookup before fingerprint collection",
		]);

		expect(formatRemoteKnownHostsSourcePreviewRows().join("\n")).toBe(
			[
				"REMOTE KNOWN_HOSTS SOURCE none",
				"lookup=none provider=sftp status=not-read source=local-files",
				"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2",
				"match=unknown hashed=unknown fingerprint=sha256:unknown",
				'guards=localReadPreview hostReview exactConfirm="select remote profile"',
				"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
				"next=select remote profile · no local file read",
			].join("\n"),
		);
	});

	test("includes remote known_hosts source preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE KNOWN_HOSTS SOURCE dev");
		expect(output).toContain("paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2");
		expect(output).toContain(
			"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
		);
	});

	test("formats remote known_hosts read preview without reading local files", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteKnownHostsReadPreview(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			lookup: "prod.example.com:2222",
			status: "locked",
			source: "local-known-hosts",
			paths: ["~/.ssh/known_hosts", "~/.ssh/known_hosts2"],
			allowedBase: "~/.ssh",
			risk: "read",
			privilege: "user",
			parser: "not-run",
			match: "unknown",
			confirm: "read known_hosts prod",
			execution: {
				readsLocal: false,
				importsTransport: false,
				opensSocket: false,
				scansHostKey: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteKnownHostsReadPreviewRows(
				createRemoteKnownHostsReadPreview(profile),
			),
		).toEqual([
			"REMOTE KNOWN_HOSTS READ PREVIEW prod",
			"lookup=prod.example.com:2222 provider=sftp status=locked source=local-known-hosts",
			"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2 allowedBase=~/.ssh",
			"risk=read privilege=user parser=not-run match=unknown",
			'guards=localFileBoundary exactConfirm="read known_hosts prod" hostReview=required',
			"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
			"next=confirm local known_hosts read preview before parsing trust rows",
		]);

		expect(formatRemoteKnownHostsReadPreviewRows().join("\n")).toBe(
			[
				"REMOTE KNOWN_HOSTS READ PREVIEW none",
				"lookup=none provider=sftp status=locked source=local-known-hosts",
				"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2 allowedBase=~/.ssh",
				"risk=read privilege=user parser=not-run match=unknown",
				'guards=localFileBoundary exactConfirm="select remote profile" hostReview=required',
				"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
				"next=select remote profile · no local file read",
			].join("\n"),
		);
	});

	test("includes remote known_hosts read preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE KNOWN_HOSTS READ PREVIEW dev");
		expect(output).toContain(
			"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2 allowedBase=~/.ssh",
		);
		expect(output).toContain(
			"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
		);
	});

	test("formats remote known_hosts read results without reading local files", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};
		const content =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port\n";

		const result = createRemoteKnownHostsReadResult(profile, content);

		expect(result).toEqual({
			id: "prod",
			provider: "sftp",
			lookup: "prod.example.com:2222",
			status: "provided",
			source: "local-known-hosts-read-result",
			path: "~/.ssh/known_hosts",
			bytes: 78,
			lines: 1,
			parserInput: "available",
			confirm: "read known_hosts prod",
			execution: {
				readsLocal: false,
				usesProvidedContent: true,
				opensSocket: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(formatRemoteKnownHostsReadResultRows(result)).toEqual([
			"REMOTE KNOWN_HOSTS READ RESULT prod",
			"lookup=prod.example.com:2222 provider=sftp status=provided source=local-known-hosts-read-result",
			"path=~/.ssh/known_hosts bytes=78 lines=1 parserInput=available",
			'guards=localReadPreview exactConfirm="read known_hosts prod" rawContent=hidden',
			"execution=willReadLocal=false usedProvidedContent=true willConnect=false willScan=false willTrust=false willMutate=false",
			"next=parse provided read result into known_hosts candidates",
		]);

		expect(formatRemoteKnownHostsReadResultRows().join("\n")).toBe(
			[
				"REMOTE KNOWN_HOSTS READ RESULT none",
				"lookup=none provider=sftp status=locked source=local-known-hosts-read-result",
				"path=none bytes=0 lines=0 parserInput=missing",
				'guards=localReadPreview exactConfirm="select remote profile" rawContent=hidden',
				"execution=willReadLocal=false usedProvidedContent=false willConnect=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no known_hosts read result",
			].join("\n"),
		);
	});

	test("feeds remote known_hosts read results into candidate parsing", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};
		const content =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port";

		const preview = parseRemoteKnownHostsCandidatesFromReadResult(
			profile,
			content,
		);

		expect(preview).toMatchObject({
			id: "prod",
			lookup: "prod.example.com:2222",
			status: "parsed-injected",
			source: "local-known-hosts-read-result",
			selected: 1,
			match: "matched",
			decision: "blocked",
			execution: {
				readsLocal: false,
				parsesInjectedContent: true,
				opensSocket: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(preview.candidates).toHaveLength(1);
		expect(preview.candidates[0]).toMatchObject({
			index: 1,
			sourceLine: 1,
			hostPattern: "[prod.example.com]:2222",
			keyType: "ssh-rsa",
			match: "matched",
			trust: "candidate-only",
		});
	});

	test("includes empty remote known_hosts read result in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE KNOWN_HOSTS READ RESULT dev");
		expect(output).toContain("path=none bytes=0 lines=0 parserInput=missing");
		expect(output).toContain(
			"execution=willReadLocal=false usedProvidedContent=false willConnect=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("formats remote known_hosts parser preview without parsing trust rows", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteKnownHostsParserPreview(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			lookup: "prod.example.com:2222",
			status: "locked",
			source: "local-known-hosts",
			parser: "planned",
			formats: ["plain", "hashed", "marker", "cert-authority"],
			match: "unknown",
			candidates: 0,
			selected: "none",
			fingerprint: "sha256:unknown",
			trustDecision: "blocked",
			confirm: "parse known_hosts prod",
			execution: {
				readsLocal: false,
				parsesRows: false,
				opensSocket: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteKnownHostsParserPreviewRows(
				createRemoteKnownHostsParserPreview(profile),
			),
		).toEqual([
			"REMOTE KNOWN_HOSTS PARSER PREVIEW prod",
			"lookup=prod.example.com:2222 provider=sftp status=locked source=local-known-hosts",
			"parser=planned formats=plain,hashed,marker,cert-authority match=unknown",
			"candidates=0 selected=none fingerprint=sha256:unknown trustDecision=blocked",
			'guards=localReadRequired exactConfirm="parse known_hosts prod" hostReview=required',
			"execution=willReadLocal=false willParse=false willConnect=false willScan=false willTrust=false willMutate=false",
			"next=confirm parser preview after local known_hosts read boundary",
		]);

		expect(formatRemoteKnownHostsParserPreviewRows().join("\n")).toBe(
			[
				"REMOTE KNOWN_HOSTS PARSER PREVIEW none",
				"lookup=none provider=sftp status=locked source=local-known-hosts",
				"parser=planned formats=plain,hashed,marker,cert-authority match=unknown",
				"candidates=0 selected=none fingerprint=sha256:unknown trustDecision=blocked",
				'guards=localReadRequired exactConfirm="select remote profile" hostReview=required',
				"execution=willReadLocal=false willParse=false willConnect=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no parser run",
			].join("\n"),
		);
	});

	test("includes remote known_hosts parser preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE KNOWN_HOSTS PARSER PREVIEW dev");
		expect(output).toContain(
			"parser=planned formats=plain,hashed,marker,cert-authority match=unknown",
		);
		expect(output).toContain(
			"execution=willReadLocal=false willParse=false willConnect=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("parses injected known_hosts candidates without local reads or trust", () => {
		const content = [
			"# comment",
			"prod.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEpJbGNlLXRlc3Qta2V5LWJsb2ItMDAx deploy@prod",
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port",
			"@cert-authority *.example.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICertAuthorityBlob ca",
			"|1|salt|hash ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHashedHostBlob hashed",
			"malformed",
		].join("\n");

		expect(
			parseRemoteKnownHostsCandidates("prod.example.com:2222", content),
		).toEqual([
			{
				index: 1,
				sourceLine: 3,
				marker: "none",
				hostPattern: "[prod.example.com]:2222",
				hostKind: "plain",
				keyType: "ssh-rsa",
				fingerprint: expect.stringMatching(/^SHA256:[A-Za-z0-9+/]+$/),
				match: "matched",
				trust: "candidate-only",
			},
		]);

		expect(
			parseRemoteKnownHostsCandidates("prod.example.com:22", content),
		).toEqual([
			{
				index: 1,
				sourceLine: 2,
				marker: "none",
				hostPattern: "prod.example.com",
				hostKind: "plain",
				keyType: "ssh-ed25519",
				fingerprint: expect.stringMatching(/^SHA256:[A-Za-z0-9+/]+$/),
				match: "matched",
				trust: "candidate-only",
			},
			{
				index: 2,
				sourceLine: 4,
				marker: "@cert-authority",
				hostPattern: "*.example.com",
				hostKind: "pattern",
				keyType: "ssh-ed25519",
				fingerprint: expect.stringMatching(/^SHA256:[A-Za-z0-9+/]+$/),
				match: "matched",
				trust: "candidate-only",
			},
		]);

		expect(
			parseRemoteKnownHostsCandidates("unknown.internal:22", content),
		).toEqual([]);
	});

	test("formats remote known_hosts candidate previews without mutating trust", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};
		const content =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port";
		const preview = createRemoteKnownHostsCandidatePreview(profile, content);

		expect(preview).toEqual({
			id: "prod",
			provider: "sftp",
			lookup: "prod.example.com:2222",
			status: "parsed-injected",
			source: "provided-known-hosts",
			candidates: [
				{
					index: 1,
					sourceLine: 1,
					marker: "none",
					hostPattern: "[prod.example.com]:2222",
					hostKind: "plain",
					keyType: "ssh-rsa",
					fingerprint: expect.stringMatching(/^SHA256:[A-Za-z0-9+/]+$/),
					match: "matched",
					trust: "candidate-only",
				},
			],
			selected: 1,
			match: "matched",
			decision: "blocked",
			execution: {
				readsLocal: false,
				parsesInjectedContent: true,
				opensSocket: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(formatRemoteKnownHostsCandidatePreviewRows(preview)).toEqual([
			"REMOTE KNOWN_HOSTS CANDIDATES prod",
			"lookup=prod.example.com:2222 provider=sftp status=parsed-injected source=provided-known-hosts",
			"candidates=1 selected=1 match=matched decision=blocked",
			expect.stringMatching(
				/^> #1 line=1 marker=none host=\[prod\.example\.com\]:2222 kind=plain key=ssh-rsa fingerprint=SHA256:[A-Za-z0-9+/]+ trust=candidate-only$/,
			),
			"execution=willReadLocal=false parsedInjected=true willConnect=false willScan=false willTrust=false willMutate=false",
			"next=compare selected candidate with collected host key evidence before trust review",
		]);

		expect(formatRemoteKnownHostsCandidatePreviewRows().join("\n")).toBe(
			[
				"REMOTE KNOWN_HOSTS CANDIDATES none",
				"lookup=none provider=sftp status=not-parsed source=provided-known-hosts",
				"candidates=0 selected=none match=unknown decision=blocked",
				"no known_hosts candidates for selected lookup",
				"execution=willReadLocal=false parsedInjected=false willConnect=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no candidate parsing",
			].join("\n"),
		);
	});

	test("includes empty remote known_hosts candidate preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE KNOWN_HOSTS CANDIDATES dev");
		expect(output).toContain(
			"candidates=0 selected=none match=unknown decision=blocked",
		);
		expect(output).toContain(
			"execution=willReadLocal=false parsedInjected=false willConnect=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("formats remote host key trust decision preview without trusting hosts", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteHostKeyTrustDecisionPreview(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			lookup: "prod.example.com:2222",
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
			confirm: "review host trust prod",
			connectConfirm: "connect remote prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsLocal: false,
				parsesRows: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteHostKeyTrustDecisionPreviewRows(
				createRemoteHostKeyTrustDecisionPreview(profile),
			),
		).toEqual([
			"REMOTE HOST KEY TRUST DECISION prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp status=locked",
			"collected=sha256:unknown knownHosts=sha256:unknown match=unknown decision=blocked",
			"inputs=hostKeyEvidence:required knownHostsParser:required hostReview:required",
			'guards=compareOnly exactConfirm="review host trust prod" connectConfirm="connect remote prod"',
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
			"next=collect host key evidence and parse known_hosts before trust decision",
		]);

		expect(formatRemoteHostKeyTrustDecisionPreviewRows().join("\n")).toBe(
			[
				"REMOTE HOST KEY TRUST DECISION none",
				"target=none lookup=none provider=sftp status=locked",
				"collected=sha256:unknown knownHosts=sha256:unknown match=unknown decision=blocked",
				"inputs=hostKeyEvidence:required knownHostsParser:required hostReview:required",
				'guards=compareOnly exactConfirm="select remote profile" connectConfirm="select remote profile"',
				"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no trust decision",
			].join("\n"),
		);
	});

	test("includes remote host key trust decision preview in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE HOST KEY TRUST DECISION dev");
		expect(output).toContain(
			"collected=sha256:unknown knownHosts=sha256:unknown match=unknown decision=blocked",
		);
		expect(output).toContain(
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("formats remote host key compare detail without reading or trusting", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};

		expect(createRemoteHostKeyCompareDetail(profile)).toEqual({
			id: "prod",
			provider: "sftp",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			lookup: "prod.example.com:2222",
			collectedFingerprint: "sha256:unknown",
			candidateCount: 0,
			selectedCandidate: "none",
			knownHostsCandidateFingerprint: "sha256:unknown",
			candidateSource: "none",
			selectedCandidateLine: "none",
			selectedCandidateHost: "none",
			selectedCandidateKeyType: "none",
			match: "unknown",
			decision: "blocked",
			confirm: "review host trust prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsLocal: false,
				parsesRows: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(
			formatRemoteHostKeyCompareDetailRows(
				createRemoteHostKeyCompareDetail(profile),
			),
		).toEqual([
			"REMOTE HOST KEY COMPARE DETAIL prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp",
			"collected=sha256:unknown candidates=0 selected=none knownHosts=sha256:unknown",
			"candidateSource=none line=none host=none key=none",
			'match=unknown decision=blocked confirm="review host trust prod"',
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
			"next=collect evidence and parse known_hosts candidates before compare detail",
		]);

		expect(formatRemoteHostKeyCompareDetailRows().join("\n")).toBe(
			[
				"REMOTE HOST KEY COMPARE DETAIL none",
				"target=none lookup=none provider=sftp",
				"collected=sha256:unknown candidates=0 selected=none knownHosts=sha256:unknown",
				"candidateSource=none line=none host=none key=none",
				'match=unknown decision=blocked confirm="select remote profile"',
				"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
				"next=select remote profile · no compare detail",
			].join("\n"),
		);
	});

	test("formats remote host key compare detail from read-result candidates without trusting", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};
		const content =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port";
		const candidates = parseRemoteKnownHostsCandidatesFromReadResult(
			profile,
			content,
		);
		const detail = createRemoteHostKeyCompareDetail(profile, candidates);

		expect(detail).toEqual({
			id: "prod",
			provider: "sftp",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			lookup: "prod.example.com:2222",
			collectedFingerprint: "sha256:unknown",
			candidateCount: 1,
			selectedCandidate: 1,
			knownHostsCandidateFingerprint: expect.stringMatching(
				/^SHA256:[A-Za-z0-9+/]+$/,
			),
			candidateSource: "local-known-hosts-read-result",
			selectedCandidateLine: 1,
			selectedCandidateHost: "[prod.example.com]:2222",
			selectedCandidateKeyType: "ssh-rsa",
			match: "candidate-only",
			decision: "blocked",
			confirm: "review host trust prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsLocal: false,
				parsesRows: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(formatRemoteHostKeyCompareDetailRows(detail)).toEqual([
			"REMOTE HOST KEY COMPARE DETAIL prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp",
			expect.stringMatching(
				/^collected=sha256:unknown candidates=1 selected=1 knownHosts=SHA256:[A-Za-z0-9+/]+$/,
			),
			"candidateSource=local-known-hosts-read-result line=1 host=[prod.example.com]:2222 key=ssh-rsa",
			'match=candidate-only decision=blocked confirm="review host trust prod"',
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
			"next=collect host key evidence before trust review; candidate comparison is read-only",
		]);
	});

	test("compares provided host key evidence with read-result candidates without trusting", () => {
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		};
		const content =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCfake prod-port";
		const candidates = parseRemoteKnownHostsCandidatesFromReadResult(
			profile,
			content,
		);
		const candidateFingerprint = candidates.candidates[0]?.fingerprint;
		const evidence = createRemoteHostKeyEvidenceInput(
			profile,
			candidateFingerprint,
		);
		const detail = createRemoteHostKeyCompareDetail(
			profile,
			candidates,
			evidence,
		);

		expect(detail).toEqual({
			id: "prod",
			provider: "sftp",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			lookup: "prod.example.com:2222",
			collectedFingerprint: candidateFingerprint,
			candidateCount: 1,
			selectedCandidate: 1,
			knownHostsCandidateFingerprint: candidateFingerprint,
			candidateSource: "local-known-hosts-read-result",
			selectedCandidateLine: 1,
			selectedCandidateHost: "[prod.example.com]:2222",
			selectedCandidateKeyType: "ssh-rsa",
			match: "matched",
			decision: "blocked",
			confirm: "review host trust prod",
			execution: {
				importsTransport: false,
				opensSocket: false,
				readsLocal: false,
				parsesRows: false,
				scansHostKey: false,
				trustsHost: false,
				mutatesRemote: false,
			},
		});
		expect(formatRemoteHostKeyCompareDetailRows(detail)).toEqual([
			"REMOTE HOST KEY COMPARE DETAIL prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp",
			`collected=${candidateFingerprint} candidates=1 selected=1 knownHosts=${candidateFingerprint}`,
			"candidateSource=local-known-hosts-read-result line=1 host=[prod.example.com]:2222 key=ssh-rsa",
			'match=matched decision=blocked confirm="review host trust prod"',
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
			"next=review blocked trust decision; matched evidence remains read-only",
		]);

		expect(
			createRemoteHostKeyCompareDetail(
				profile,
				candidates,
				createRemoteHostKeyEvidenceInput(profile, "SHA256:different"),
			).match,
		).toBe("mismatch");
	});

	test("records provided remote host key evidence input without opening transport", () => {
		const input = createRemoteHostKeyEvidenceInput({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});

		const recorded = submitRemoteHostKeyEvidenceInput(
			input,
			" SHA256:providedFingerprint ",
		);
		expect(recorded).toEqual({
			input,
			status: "recorded-blocked",
			fingerprint: "SHA256:providedFingerprint",
			parserInput: "available",
			networkOpened: false,
			hostKeyScanned: false,
			trustApplied: false,
			knownHostsWritten: false,
			remoteMutated: false,
			message:
				"remote host key evidence input recorded prod SHA256:providedFingerprint",
		});
		expect(formatRemoteHostKeyEvidenceInputAuditMessage(recorded)).toBe(
			'remote host key evidence input audit action=evidence id=prod target="sftp://deploy@prod.example.com:2222/srv/app" lookup=prod.example.com:2222 status=recorded-blocked fingerprint=SHA256:providedFingerprint parserInput=available network=not-opened scan=false trust=not-applied knownHostsWrite=false remoteMutate=false confirm="compare host key prod"',
		);

		const rejected = submitRemoteHostKeyEvidenceInput(input, " ");
		expect(rejected).toEqual({
			input,
			status: "rejected",
			fingerprint: "sha256:unknown",
			parserInput: "missing",
			networkOpened: false,
			hostKeyScanned: false,
			trustApplied: false,
			knownHostsWritten: false,
			remoteMutated: false,
			message: "remote host key evidence input rejected prod",
		});
		expect(formatRemoteHostKeyEvidenceInputAuditMessage(rejected)).toContain(
			"status=rejected",
		);
	});

	test("formats remote host key evidence input prompt rows", () => {
		const input = createRemoteHostKeyEvidenceInput({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});

		expect(formatRemoteHostKeyEvidenceInputPromptRows(input, "")).toEqual([
			':remote-host-key-evidence   confirm="compare host key prod" enter=record esc=cancel',
		]);
		expect(
			formatRemoteHostKeyEvidenceInputPromptRows(
				input,
				"SHA256:providedFingerprint",
			),
		).toEqual([
			':remote-host-key-evidence SHA256:providedFingerprint  confirm="compare host key prod" enter=record esc=cancel',
		]);
		expect(formatRemoteHostKeyEvidenceInputPromptRows()).toEqual([
			':remote-host-key-evidence   confirm="select remote profile" enter=record esc=cancel',
		]);
	});

	test("includes remote host key compare detail in provider status", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("REMOTE HOST KEY COMPARE DETAIL dev");
		expect(output).toContain(
			"collected=sha256:unknown candidates=0 selected=none knownHosts=sha256:unknown",
		);
		expect(output).toContain(
			"candidateSource=none line=none host=none key=none",
		);
		expect(output).toContain(
			"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
		);
	});

	test("records remote host key trust review attempts without trusting hosts", () => {
		const preview = createRemoteHostKeyTrustDecisionPreview({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});

		const confirmed = submitRemoteHostKeyTrustReview(
			preview,
			" review host trust prod ",
		);
		expect(confirmed).toEqual({
			preview,
			status: "confirmed-blocked",
			input: "review host trust prod",
			networkOpened: false,
			trustApplied: false,
			knownHostsWritten: false,
			message:
				"remote host trust review blocked prod sftp://deploy@prod.example.com:2222/srv/app",
		});
		expect(formatRemoteHostKeyTrustReviewAuditMessage(confirmed)).toBe(
			'remote host trust review audit action=review id=prod target="sftp://deploy@prod.example.com:2222/srv/app" status=confirmed-blocked match=unknown decision=blocked collected=sha256:unknown knownHosts=sha256:unknown network=not-opened trust=not-applied knownHostsWrite=false confirm="review host trust prod" connectConfirm="connect remote prod"',
		);

		const rejected = submitRemoteHostKeyTrustReview(preview, "trust prod");
		expect(rejected).toEqual({
			preview,
			status: "rejected",
			input: "trust prod",
			networkOpened: false,
			trustApplied: false,
			knownHostsWritten: false,
			message: "remote host trust review confirmation rejected prod",
		});
		expect(formatRemoteHostKeyTrustReviewAuditMessage(rejected)).toContain(
			"status=rejected",
		);
	});

	test("formats remote connect preview rows without opening transport", () => {
		const preview = createRemoteConnectPreview({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});

		expect(preview).toEqual({
			id: "prod",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			key: "configured",
			hostKey: "unverified",
			transport: "sftp",
			dependency: "@uulab/picos-sftp",
			status: "blocked",
			reason: "sftp-adapter-not-installed",
			risk: "read",
			privilege: "user",
			confirm: "connect remote prod",
			networkOpened: false,
			writes: "locked",
			destructive: "locked",
		});
		expect(formatRemoteConnectPreviewRows(preview)).toEqual([
			"REMOTE CONNECT PREVIEW prod",
			"dialog=host-review action=connect remote prod status=blocked network=not-opened",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"identity user=deploy host=prod.example.com port=2222 key=configured hostKey=unverified",
			"risk=read privilege=user writes=locked destructive=locked",
			'confirm="connect remote prod" willExecute=false reason=sftp-adapter-not-installed',
			"controls=future c confirm host review · enter stage context · no socket opened",
		]);

		expect(formatRemoteConnectPreviewRows().join("\n")).toBe(
			[
				"REMOTE CONNECT PREVIEW none",
				"dialog=host-review action=connect remote status=blocked network=not-opened",
				"target=none",
				"identity user=- host=- port=- key=none hostKey=unverified",
				"risk=read privilege=user writes=locked destructive=locked",
				'confirm="select remote profile" willExecute=false reason=no-remote-profile',
				"controls=j/k select · enter stage context · no socket opened",
			].join("\n"),
		);

		const confirmed = submitRemoteConnectConfirmation(
			preview,
			" connect remote prod ",
		);
		expect(confirmed).toEqual({
			preview,
			status: "confirmed-blocked",
			input: "connect remote prod",
			networkOpened: false,
			message:
				"remote connect blocked prod sftp://deploy@prod.example.com:2222/srv/app",
		});
		expect(formatRemoteConnectConfirmationAuditMessage(confirmed)).toBe(
			'remote connect audit id=prod target="sftp://deploy@prod.example.com:2222/srv/app" status=confirmed-blocked dependency=@uulab/picos-sftp reason=sftp-adapter-not-installed network=not-opened confirm="connect remote prod"',
		);

		expect(submitRemoteConnectConfirmation(preview, "connect prod")).toEqual({
			preview,
			status: "rejected",
			input: "connect prod",
			networkOpened: false,
			message: "remote connect confirmation rejected prod",
		});
	});

	test("formats remote host review audit messages without opening sessions", () => {
		expect(
			formatRemoteHostReviewAuditMessage("stage", {
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toBe(
			'remote host review audit action=stage id=prod target="sftp://deploy@prod.example.com:2222/srv/app" host=prod.example.com port=2222 user=deploy key=configured policy=read-only writes=locked network=not-opened confirm="connect remote prod"',
		);

		expect(
			formatRemoteHostReviewAuditMessage("view", {
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			}),
		).not.toContain("password");
	});
});
