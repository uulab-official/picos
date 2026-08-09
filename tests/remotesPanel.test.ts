import { describe, expect, test } from "bun:test";
import {
	createRemoteKnownHostsCandidatePreview,
	createRemoteKnownHostsPasteReview,
} from "../src/core/remotes";
import {
	type ReadOnlySftpConnectionDiagnostic,
	startReadOnlySftpConnectionDiagnostic,
} from "../src/core/sftp";
import type { SftpRemoteProfile } from "../src/core/types";
import {
	canStartRemoteConnection,
	classifyRemoteConnectionPublication,
	classifyRemoteDisconnectPublication,
	classifyRemoteProfileSavePublication,
	moveRemoteProfileSelection,
	prepareRemoteConnectionCancellation,
	prepareRemoteConnectPrompt,
	prepareRemoteConnectSubmission,
	prepareRemoteDisconnect,
	prepareRemoteHistoryClipboardInput,
	prepareRemoteHistoryExportInput,
	prepareRemoteHostKeyEvidenceSubmission,
	prepareRemoteHostTrustSubmission,
	prepareRemoteKnownHostsCandidateSubmission,
	prepareRemoteKnownHostsEvidenceHandoff,
	prepareRemoteKnownHostsEvidenceHandoffOpen,
	prepareRemoteKnownHostsEvidenceHandoffSelection,
	prepareRemoteKnownHostsPasteSelection,
	prepareRemoteKnownHostsPasteSubmission,
	prepareRemotePasteNumberInput,
	prepareRemoteProfileCommand,
	prepareRemoteProfileStage,
	prepareRemotePromptInput,
	prepareRemoteRetry,
	resolveRemoteEvidenceResultOptions,
	resolveRemoteProfileSelection,
} from "../src/tui/remotesPanel";

const profile: SftpRemoteProfile = {
	id: "prod",
	kind: "sftp",
	host: "prod.example.com",
	port: 2222,
	username: "deploy",
	root: "/srv/app",
};

const knownHostsLine =
	"[prod.example.com]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPicosRemotePanel";

function createDiagnostic(
	status: ReadOnlySftpConnectionDiagnostic["status"],
): ReadOnlySftpConnectionDiagnostic {
	const started = startReadOnlySftpConnectionDiagnostic(
		profile,
		"SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
		undefined,
		1_000,
	);
	return { ...started, status };
}

describe("Remotes panel transitions", () => {
	test("does not let an older profile save cancel or replace a newer connection", () => {
		expect(
			classifyRemoteProfileSavePublication({
				currentSaveToken: 3,
				requestSaveToken: 3,
				connectionRunTokenAtStart: 8,
				currentConnectionRunToken: 9,
				ownsPendingConnectionAtStart: false,
			}),
		).toEqual({
			publication: "current",
			publishConfig: true,
			publishSession: false,
			abortPendingConnection: false,
		});

		expect(
			classifyRemoteProfileSavePublication({
				currentSaveToken: 4,
				requestSaveToken: 3,
				connectionRunTokenAtStart: 8,
				currentConnectionRunToken: 8,
				ownsPendingConnectionAtStart: true,
			}),
		).toMatchObject({
			publication: "stale",
			publishConfig: false,
			publishSession: false,
			abortPendingConnection: false,
		});
	});

	test("owns numeric paste-review shortcut parsing", () => {
		expect(prepareRemotePasteNumberInput("7")).toEqual({
			kind: "select",
			candidateIndex: 7,
		});
	});

	test("owns selected-profile guards and exact prompt notices", () => {
		expect(
			prepareRemotePromptInput({
				command: "host-key-evidence",
				profiles: [],
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no remote profile selected" },
		});
		expect(
			prepareRemotePromptInput({
				command: "host-key-evidence",
				profiles: [profile],
				selectedIndex: 4,
			}),
		).toEqual({
			kind: "prompt",
			selectedIndex: 0,
			prompt: "remote-host-key-evidence",
			notice: {
				level: "info",
				message: "remote host key evidence input opened compare host key prod",
			},
		});
		expect(
			prepareRemotePromptInput({
				command: "host-trust",
				profiles: [profile],
				selectedIndex: 0,
			}),
		).toMatchObject({
			kind: "prompt",
			prompt: "remote-host-trust",
			notice: { level: "info" },
		});
	});

	test("owns remote history copy and export eligibility", () => {
		expect(
			prepareRemoteHistoryClipboardInput({
				profiles: [profile],
				selectedIndex: 0,
				results: [],
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts selection history to copy",
			},
		});
		expect(
			prepareRemoteHistoryExportInput({
				profiles: [profile],
				selectedIndex: 0,
				results: [],
				baseDir: "/tmp/picos",
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts selection history to export",
			},
		});
	});

	test("repairs profile selection and leaves an empty profile shelf unselected", () => {
		expect(resolveRemoteProfileSelection([], 4)).toEqual({
			profile: undefined,
			selectedIndex: 0,
		});
		expect(resolveRemoteProfileSelection([profile], -3)).toEqual({
			profile,
			selectedIndex: 0,
		});
	});

	test("owns profile staging and profile command decisions without doing config I/O", () => {
		expect(prepareRemoteProfileStage([], 2)).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no remote profile selected" },
		});
		expect(prepareRemoteProfileStage([profile], 4)).toEqual({
			kind: "stage",
			profile,
			selectedIndex: 0,
		});
		expect(prepareRemoteProfileCommand("not a profile")).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message:
					"remote profile requires: <id> <user@host[:port]> [root] [key=path]",
			},
		});
		expect(
			prepareRemoteProfileCommand(
				"stage alice@stage.example.com:2200 /srv/stage",
			),
		).toMatchObject({
			kind: "save",
			closeCommandLine: true,
			profile: {
				id: "stage",
				host: "stage.example.com",
				port: 2200,
				username: "alice",
				root: "/srv/stage",
			},
		});
	});

	test("moves profile selection with clamped wraparound", () => {
		const stage = { ...profile, id: "stage", host: "stage.example.com" };
		expect(moveRemoteProfileSelection([profile, stage], 0, "previous")).toBe(1);
		expect(moveRemoteProfileSelection([profile, stage], 99, "next")).toBe(0);
		expect(moveRemoteProfileSelection([], 99, "next")).toBe(0);
	});

	test("blocks connect submission when no profile is selected", () => {
		expect(
			prepareRemoteConnectSubmission({
				profiles: [],
				selectedIndex: 9,
				receivedConfirmation: "connect remote prod",
			}),
		).toEqual({
			kind: "blocked",
			reason: "no-profile",
			selectedIndex: 0,
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote connect requires a selected profile",
			},
		});
	});

	test("blocks connect submission when no usable host key is selected", () => {
		expect(
			prepareRemoteConnectSubmission({
				profiles: [profile],
				selectedIndex: 0,
				receivedConfirmation: "connect remote prod",
			}),
		).toMatchObject({
			kind: "blocked",
			reason: "no-host-key",
			selectedIndex: 0,
			notice: {
				level: "warn",
				message:
					"remote connect blocked prod: select a known_hosts candidate with K or P before connecting",
			},
		});
	});

	test("opens connect confirmation only when no connection is already in flight", () => {
		expect(
			prepareRemoteConnectPrompt({
				profiles: [],
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no remote profile selected" },
		});
		expect(
			prepareRemoteConnectPrompt({
				profiles: [profile],
				selectedIndex: 0,
			}),
		).toMatchObject({
			kind: "prompt",
			prompt: "remote-connect",
			value: "",
			preview: { status: "blocked", hostKey: "unverified" },
			notice: {
				level: "info",
				message: "remote connect preview opened connect remote prod",
			},
		});
		expect(
			prepareRemoteConnectPrompt({
				profiles: [profile],
				selectedIndex: 0,
				diagnostic: createDiagnostic("cancelling"),
			}),
		).toMatchObject({
			kind: "notice",
			notice: {
				level: "warn",
				message: "remote connect already in flight prod status=cancelling",
			},
		});
	});

	test("treats a matching revoked fingerprint from either session as a global blocker", () => {
		const selected = createRemoteKnownHostsCandidatePreview(
			profile,
			knownHostsLine,
		);
		const revoked = createRemoteKnownHostsPasteReview(
			profile,
			`@revoked ${knownHostsLine}`,
		);

		expect(
			prepareRemoteConnectSubmission({
				profiles: [profile],
				selectedIndex: 0,
				candidateSession: { prod: selected },
				pasteReviewSession: {
					prod: { ...revoked, selected: "none" },
				},
				receivedConfirmation: "connect remote prod",
			}),
		).toMatchObject({ kind: "blocked", reason: "revoked-host-key" });
	});

	test("stores multi-line paste review and candidate selection as one pure transition", () => {
		const secondKnownHostsLine =
			"[prod.example.com]:2222 ssh-rsa AAAAB3NzaSecondPicosRemotePanel";
		const submitted = prepareRemoteKnownHostsPasteSubmission({
			profiles: [profile],
			selectedIndex: 0,
			value: `${knownHostsLine}\\n${secondKnownHostsLine}`,
		});
		expect(submitted).toMatchObject({
			kind: "review",
			closeCommandLine: true,
			review: { lineCount: 2, selected: 1 },
			preview: { candidates: [{ index: 1 }, { index: 2 }], selected: 1 },
		});
		if (submitted.kind !== "review") {
			throw new Error("expected parsed paste review");
		}

		const moved = prepareRemoteKnownHostsPasteSelection({
			profiles: [profile],
			selectedIndex: 0,
			candidateSession: submitted.candidateSession,
			pasteReviewSession: submitted.pasteReviewSession,
			selection: { kind: "move", direction: "next" },
		});
		expect(moved).toMatchObject({
			kind: "selection",
			review: { selected: 2 },
			preview: { selected: 2 },
			notice: {
				level: "info",
				message: "remote known_hosts paste candidate next prod selected=2/2",
			},
		});
	});

	test("redacts arbitrary input from invalid paste candidate selection results", () => {
		const submitted = prepareRemoteKnownHostsPasteSubmission({
			profiles: [profile],
			selectedIndex: 0,
			value: knownHostsLine,
		});
		if (submitted.kind !== "review") {
			throw new Error("expected parsed paste review");
		}
		const sensitiveInput =
			"credential-user password=super-secret-password -----BEGIN OPENSSH PRIVATE KEY-----";
		const invalid = prepareRemoteKnownHostsPasteSelection({
			profiles: [profile],
			selectedIndex: 0,
			candidateSession: submitted.candidateSession,
			pasteReviewSession: submitted.pasteReviewSession,
			selection: { kind: "input", value: sensitiveInput },
		});

		expect(invalid).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote known_hosts paste candidate selection invalid",
			},
		});
		const published = JSON.stringify(invalid);
		expect(published).not.toContain("credential-user");
		expect(published).not.toContain("super-secret-password");
		expect(published).not.toContain("PRIVATE KEY");
	});

	test("owns provided host-key evidence and one-line known_hosts candidate state", () => {
		const evidence = prepareRemoteHostKeyEvidenceSubmission({
			profiles: [profile],
			selectedIndex: 0,
			value: "SHA256:operator-collected",
		});
		expect(evidence).toMatchObject({
			kind: "confirmation",
			closeCommandLine: true,
			confirmation: {
				status: "recorded-blocked",
				fingerprint: "SHA256:operator-collected",
			},
			session: { prod: "SHA256:operator-collected" },
			notice: {
				level: "warn",
				message: expect.stringContaining(
					"host key evidence input recorded prod",
				),
			},
		});

		const candidate = prepareRemoteKnownHostsCandidateSubmission({
			profiles: [profile],
			selectedIndex: 0,
			value: knownHostsLine,
		});
		expect(candidate).toMatchObject({
			kind: "candidates",
			closeCommandLine: true,
			preview: { selected: 1, candidates: [{ marker: "none" }] },
			session: { prod: { selected: 1 } },
			notice: {
				level: "info",
				message: expect.stringContaining("candidates=1 selected=1"),
			},
		});
	});

	test("rejects confirmation byte mismatches without normalizing the received input", () => {
		const candidate = createRemoteKnownHostsCandidatePreview(
			profile,
			knownHostsLine,
		);
		const receivedConfirmation = " connect remote prod ";
		const transition = prepareRemoteConnectSubmission({
			profiles: [profile],
			selectedIndex: 0,
			candidateSession: { prod: candidate },
			receivedConfirmation,
		});

		expect(transition).toMatchObject({
			kind: "blocked",
			reason: "confirmation-mismatch",
			confirmation: {
				status: "rejected",
				input: receivedConfirmation,
			},
			notice: {
				level: "warn",
				message: "remote connect confirmation rejected prod",
			},
		});
	});

	test("preserves exact host-trust confirmation bytes", () => {
		const receivedConfirmation = "review host trust prod ";
		expect(
			prepareRemoteHostTrustSubmission({
				profiles: [profile],
				selectedIndex: 0,
				receivedConfirmation,
			}),
		).toMatchObject({
			kind: "confirmation",
			closeCommandLine: true,
			confirmation: {
				status: "rejected",
				input: receivedConfirmation,
			},
			notice: {
				level: "warn",
				message: "remote host trust review confirmation rejected prod",
			},
		});
	});

	test("retry after cancellation opens an empty exact-confirm prompt", () => {
		const transition = prepareRemoteRetry({
			profiles: [profile],
			selectedIndex: 0,
			diagnostic: createDiagnostic("cancelled"),
		});

		expect(transition).toEqual({
			kind: "prompt",
			prompt: "remote-connect",
			value: "",
			expectedConfirmation: "connect remote prod",
			selectedIndex: 0,
			notice: {
				level: "info",
				message: "remote retry requires exact confirmation connect remote prod",
			},
		});
	});

	test("treats every non-terminal connection diagnostic as busy", () => {
		expect(
			canStartRemoteConnection(createDiagnostic("connecting")),
		).toBeFalse();
		expect(
			canStartRemoteConnection(createDiagnostic("cancelling")),
		).toBeFalse();
		expect(canStartRemoteConnection(createDiagnostic("failed"))).toBeTrue();
		expect(canStartRemoteConnection(createDiagnostic("cancelled"))).toBeTrue();
	});

	test("moves only the current active connection into cancelling state", () => {
		expect(
			prepareRemoteConnectionCancellation({
				diagnostic: createDiagnostic("connecting"),
				activeRunToken: 7,
				currentRunToken: 7,
				hasPendingConnection: true,
			}),
		).toMatchObject({
			kind: "cancel",
			diagnostic: { status: "cancelling" },
			notice: {
				level: "warn",
				message: "remote connect cancellation requested prod attempt=1",
			},
		});
		expect(
			prepareRemoteConnectionCancellation({
				diagnostic: createDiagnostic("connecting"),
				activeRunToken: 6,
				currentRunToken: 7,
				hasPendingConnection: true,
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "info",
				message: "no pending SFTP connection to cancel",
			},
		});
	});

	test("disconnect takes ownership only of the current pending attempt", () => {
		expect(
			prepareRemoteDisconnect({
				hasRemoteSession: false,
				diagnostic: undefined,
				activeRunToken: undefined,
				currentRunToken: 7,
				hasPendingConnection: false,
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "info",
				message: "no read-only SFTP session connected",
			},
		});
		expect(
			prepareRemoteDisconnect({
				hasRemoteSession: true,
				diagnostic: createDiagnostic("connecting"),
				activeRunToken: 7,
				currentRunToken: 7,
				hasPendingConnection: true,
			}),
		).toEqual({
			kind: "restore-local",
			cancelActiveAttempt: true,
			ownerRunToken: 7,
		});
		expect(
			prepareRemoteDisconnect({
				hasRemoteSession: true,
				diagnostic: createDiagnostic("connecting"),
				activeRunToken: 6,
				currentRunToken: 7,
				hasPendingConnection: true,
			}),
		).toEqual({
			kind: "restore-local",
			cancelActiveAttempt: false,
		});
	});

	test("disconnect publishes terminal diagnostics for every live session state", () => {
		for (const status of ["connecting", "cancelling"] as const) {
			expect(
				classifyRemoteDisconnectPublication({
					currentDiagnosticSequence: 4,
					requestDiagnosticSequence: 4,
					diagnostic: createDiagnostic(status),
				}),
			).toMatchObject({
				status: "current",
				publishCurrent: true,
				diagnostic: {
					status: "cancelled",
					message: "SFTP connection cancelled by operator during disconnect",
				},
			});
		}
		const connected = createDiagnostic("connected");
		expect(
			classifyRemoteDisconnectPublication({
				currentDiagnosticSequence: 4,
				requestDiagnosticSequence: 3,
				diagnostic: connected,
			}),
		).toEqual({ status: "stale", publishCurrent: false });
		expect(
			classifyRemoteDisconnectPublication({
				currentDiagnosticSequence: 4,
				requestDiagnosticSequence: 4,
				diagnostic: connected,
				localRestored: true,
			}),
		).toMatchObject({
			status: "current",
			publishCurrent: true,
			diagnostic: {
				status: "disconnected",
				message: "read-only SFTP session closed by operator",
			},
			notice: {
				level: "info",
				message: "read-only SFTP session closed; local filesystem restored",
			},
		});

		const cancelled = classifyRemoteDisconnectPublication({
			currentDiagnosticSequence: 4,
			requestDiagnosticSequence: 4,
			diagnostic: createDiagnostic("cancelling"),
		});
		if (!cancelled.publishCurrent) {
			throw new Error("expected current terminal disconnect diagnostic");
		}
		expect(
			prepareRemoteRetry({
				profiles: [profile],
				selectedIndex: 0,
				diagnostic: cancelled.diagnostic,
			}),
		).toMatchObject({
			kind: "prompt",
			value: "",
			expectedConfirmation: "connect remote prod",
		});
	});

	test("disconnect retains an established remote session when local restore fails", () => {
		const connected = createDiagnostic("connected");
		const publication = classifyRemoteDisconnectPublication({
			currentDiagnosticSequence: 4,
			requestDiagnosticSequence: 4,
			diagnostic: connected,
			localRestored: false,
		});

		expect(publication).toEqual({
			status: "current",
			publishCurrent: false,
			retainRemoteSession: true,
			notice: {
				level: "fail",
				message:
					"local filesystem restore failed; read-only SFTP session remains connected",
			},
		});
		expect("diagnostic" in publication).toBeFalse();
		expect("auditMessage" in publication).toBeFalse();
		expect(JSON.stringify(publication)).not.toContain("session closed");
		expect(
			prepareRemoteRetry({
				profiles: [profile],
				selectedIndex: 0,
				diagnostic: connected,
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "info", message: "no remote connection to retry" },
		});
	});

	test("connected publication requires a live connecting attempt at every checkpoint", () => {
		const attempt = createDiagnostic("connecting");
		const outcome = {
			status: "connected" as const,
			id: profile.id,
			target: attempt.target,
			host: profile.host,
			port: profile.port,
			fingerprint: attempt.fingerprint,
			message: "read-only SFTP connected entries=1",
		};
		const base = {
			currentDiagnosticSequence: 4,
			requestDiagnosticSequence: 4,
			currentRunToken: 7,
			requestRunToken: 7,
			attempt,
			outcome,
			connectionAborted: false,
			ownsPendingConnection: true,
		};

		expect(
			classifyRemoteConnectionPublication({
				...base,
				currentDiagnostic: attempt,
			}),
		).toMatchObject({ status: "current", publishCurrent: true });
		expect(
			classifyRemoteConnectionPublication({
				...base,
				currentDiagnostic: { ...attempt, status: "cancelling" },
			}),
		).toMatchObject({ status: "stale", publishCurrent: false });
		expect(
			classifyRemoteConnectionPublication({
				...base,
				currentDiagnostic: attempt,
				connectionAborted: true,
			}),
		).toMatchObject({ status: "stale", publishCurrent: false });
		expect(
			classifyRemoteConnectionPublication({
				...base,
				currentRunToken: 8,
				currentDiagnostic: attempt,
			}),
		).toMatchObject({ status: "stale", publishCurrent: false });
	});

	test("suppresses stale success and keeps stale failures as audit evidence", () => {
		const attempt = createDiagnostic("connecting");
		const staleSuccess = classifyRemoteConnectionPublication({
			currentDiagnosticSequence: 3,
			requestDiagnosticSequence: 2,
			currentRunToken: 9,
			requestRunToken: 8,
			attempt,
			outcome: {
				status: "connected",
				id: profile.id,
				target: attempt.target,
				host: profile.host,
				port: profile.port,
				fingerprint: attempt.fingerprint,
				message: "late connection",
			},
		});
		const transition = classifyRemoteConnectionPublication({
			currentDiagnosticSequence: 3,
			requestDiagnosticSequence: 2,
			currentRunToken: 9,
			requestRunToken: 8,
			attempt,
			outcome: {
				status: "failed",
				id: profile.id,
				target: attempt.target,
				host: profile.host,
				port: profile.port,
				fingerprint: attempt.fingerprint,
				message: "socket failed",
			},
		});

		expect(staleSuccess).toMatchObject({
			status: "stale",
			publishCurrent: false,
		});
		expect(staleSuccess.diagnostic).toBeUndefined();
		expect(transition.status).toBe("stale");
		expect(transition.diagnostic).toBeUndefined();
		expect(transition.publishCurrent).toBeFalse();
		expect(transition.auditMessage).toContain("status=failed");
		expect(transition.activityResult.message).toBe(
			"remote connect failed prod prod.example.com:2222",
		);
	});

	test("creates read-only clipboard and export evidence handoff intents", () => {
		const selectedEvidence = {
			path: "/tmp/picos/remote-known-hosts.json",
			content: "",
			eventCount: 2,
			query: "remote known_hosts selection prod",
			scope: "selected" as const,
		};
		const copied = prepareRemoteKnownHostsEvidenceHandoff({
			action: "copy",
			plan: selectedEvidence,
			selectedIndex: 0,
			total: 1,
			baseDir: "/tmp/picos",
			origin: "palette",
		});
		expect(copied).toMatchObject({
			kind: "copy",
			statusEvidenceKind: "remote-known-hosts",
			preview: {
				source: "status-activity",
				copyText: expect.stringContaining("known_hosts evidence selected=1/1"),
			},
			intent: {
				label: expect.stringContaining("remote known_hosts evidence"),
			},
			paletteActivityResult: {
				message: expect.stringContaining(
					"palette remote known_hosts evidence copy",
				),
			},
		});

		expect(
			prepareRemoteKnownHostsEvidenceHandoff({
				action: "export",
				plan: selectedEvidence,
				selectedIndex: 0,
				total: 1,
				baseDir: "/tmp/picos",
			}),
		).toMatchObject({
			kind: "export",
			statusEvidenceKind: "remote-known-hosts",
			exportPlan: {
				eventCount: 1,
				query: expect.stringContaining("remote known_hosts evidence handoff"),
			},
		});
	});

	test("repairs remote evidence result options against the visible export shelf", () => {
		expect(resolveRemoteEvidenceResultOptions(-4, 0)).toEqual({
			selectedIndex: 0,
			total: 1,
		});
		expect(resolveRemoteEvidenceResultOptions(99, 2)).toEqual({
			selectedIndex: 1,
			total: 2,
		});
	});

	test("owns remote evidence handoff result selection and Timeline open intents", () => {
		const result = {
			source: "evidence" as const,
			action: "remote-known-hosts-evidence" as const,
			message:
				"palette remote known_hosts evidence copy 1/1 remote-known-hosts.json target=remote-known-hosts id:prod action=copy",
			detail:
				"target=prod query=remote known_hosts selection prod path=/tmp/picos/remote-known-hosts.json",
		};
		expect(
			prepareRemoteKnownHostsEvidenceHandoffSelection({
				history: [],
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts evidence handoff results",
			},
		});
		expect(
			prepareRemoteKnownHostsEvidenceHandoffSelection({
				history: [result],
				selectedIndex: 0,
				origin: "palette",
			}),
		).toEqual({
			kind: "selection",
			selectedIndex: 0,
			selected: 1,
			total: 1,
			resetCopyPreview: true,
			screen: "status",
			focusArea: "workspaces",
			notice: {
				level: "info",
				message: `remote known_hosts evidence handoff 1/1 row=1 origin=palette ${result.message}`,
			},
		});

		expect(
			prepareRemoteKnownHostsEvidenceHandoffOpen({
				history: [result],
				selectedIndex: 0,
				events: [],
				origin: "palette",
			}),
		).toMatchObject({
			kind: "open",
			timeline: {
				filter: "audit",
				query:
					'palette remote known_hosts evidence audit action=copy target="prod"',
			},
			intent: {
				label: expect.stringContaining("remote known_hosts handoff open"),
			},
			paletteActivityResult: {
				message: expect.stringContaining("palette status result jump open"),
			},
		});
	});
});
