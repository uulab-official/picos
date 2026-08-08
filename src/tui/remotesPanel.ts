import type { ConsoleAuditExportPlan } from "../core/auditLog";
import {
	createRemoteConnectPreview,
	createRemoteHostKeyEvidenceInput,
	createRemoteHostKeyTrustDecisionPreview,
	createRemoteKnownHostsCandidatePreview,
	createRemoteKnownHostsCandidatePreviewFromPasteReview,
	createRemoteKnownHostsPasteReview,
	createRemoteKnownHostsPasteReviewFromSession,
	formatRemoteConnectConfirmationAuditMessage,
	formatRemoteHostKeyEvidenceInputAuditMessage,
	formatRemoteHostKeyTrustReviewAuditMessage,
	getSelectedRemoteKnownHostsCandidate,
	moveRemoteKnownHostsPasteReviewSelection,
	parseRemoteKnownHostsCandidateSelectionInput,
	parseRemoteProfileCommand,
	type RemoteConnectConfirmation,
	type RemoteHostKeyEvidenceInputSession,
	type RemoteHostKeyTrustReviewConfirmation,
	type RemoteKnownHostsCandidate,
	type RemoteKnownHostsCandidateSession,
	type RemoteKnownHostsPasteReviewSession,
	recordRemoteHostKeyEvidenceInputSession,
	recordRemoteKnownHostsCandidateSession,
	recordRemoteKnownHostsPasteReviewSession,
	selectRemoteKnownHostsPasteReviewCandidate,
	selectRemoteKnownHostsPasteReviewCandidateFromInput,
	submitRemoteConnectConfirmation,
	submitRemoteHostKeyEvidenceInput,
	submitRemoteHostKeyTrustReview,
} from "../core/remotes";
import {
	finishReadOnlySftpConnectionDiagnostic,
	formatReadOnlySftpConnectionAuditMessage,
	type ReadOnlySftpConnectionDiagnostic,
	type ReadOnlySftpConnectionOutcome,
	requestReadOnlySftpConnectionCancellation,
} from "../core/sftp";
import type { SftpRemoteProfile } from "../core/types";
import type { ClipboardPreview } from "./clipboardPreview";
import type { ConsoleEvent } from "./events";
import { clampIndex } from "./navigation";
import {
	createRemoteConnectStatusActivityResult,
	createRemoteHostKeyEvidenceInputStatusActivityResult,
	createRemoteHostKeyTrustReviewStatusActivityResult,
	createRemoteKnownHostsEvidenceHandoffOpenCopyIntent,
	createRemoteKnownHostsPasteSelectionStatusActivityResult,
	createRemoteKnownHostsSelectionHistoryEvidenceAuditExportPlan,
	createRemoteKnownHostsSelectionHistoryEvidenceClipboardPreview,
	createRemoteKnownHostsSelectionHistoryEvidencePaletteStatusActivityResult,
	createStatusActivityCopyIntentRecord,
	createStatusActivityResultTimelineJumpPaletteResult,
	filterStatusActivityResultHistoryIndexes,
	formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage,
	formatStatusActivityCopyIntentAuditMessage,
	formatStatusActivityResultTimelineJumpPaletteAuditMessage,
	getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff,
	moveStatusActivityResultHistoryFilteredSelection,
	type StatusActivityCopyIntentRecord,
	type StatusActivityResult,
} from "./statusActivityQueue";
import { prepareTimelineSearchJumpTransition } from "./timelinePanel";

export type RemotesPanelNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

export type RemoteProfileSelection = {
	profile: SftpRemoteProfile | undefined;
	selectedIndex: number;
};

export type RemoteConnectSubmission =
	| {
			kind: "blocked";
			reason:
				| "no-profile"
				| "no-host-key"
				| "revoked-host-key"
				| "confirmation-mismatch"
				| "connection-busy";
			selectedIndex: number;
			closeCommandLine: true;
			notice: RemotesPanelNotice;
			confirmation?: RemoteConnectConfirmation;
			auditMessage?: string;
			activityResult?: StatusActivityResult;
	  }
	| {
			kind: "connect";
			profile: SftpRemoteProfile;
			candidate: RemoteKnownHostsCandidate;
			selectedIndex: number;
			closeCommandLine: true;
			confirmation: RemoteConnectConfirmation;
			auditMessage: string;
			activityResult: StatusActivityResult;
			notice: RemotesPanelNotice;
	  };

export function resolveRemoteProfileSelection(
	profiles: SftpRemoteProfile[],
	selectedIndex: number,
): RemoteProfileSelection {
	const repairedIndex = clampIndex(selectedIndex, profiles.length);
	return {
		profile: profiles[repairedIndex],
		selectedIndex: repairedIndex,
	};
}

export function moveRemoteProfileSelection(
	profiles: SftpRemoteProfile[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (profiles.length === 0) {
		return clampIndex(selectedIndex, profiles.length);
	}
	const current = clampIndex(selectedIndex, profiles.length);
	const offset = direction === "next" ? 1 : -1;
	return clampIndex(
		(current + offset + profiles.length) % profiles.length,
		profiles.length,
	);
}

export type RemoteProfileStageTransition =
	| {
			kind: "stage";
			profile: SftpRemoteProfile;
			selectedIndex: number;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteProfileStage(
	profiles: SftpRemoteProfile[],
	selectedIndex: number,
): RemoteProfileStageTransition {
	const selection = resolveRemoteProfileSelection(profiles, selectedIndex);
	return selection.profile
		? {
				kind: "stage",
				profile: selection.profile,
				selectedIndex: selection.selectedIndex,
			}
		: {
				kind: "notice",
				notice: { level: "warn", message: "no remote profile selected" },
			};
}

export type RemoteProfileCommandTransition =
	| {
			kind: "save";
			profile: SftpRemoteProfile;
			closeCommandLine: true;
			selectedIndex: 0;
			successNotice: RemotesPanelNotice;
	  }
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: RemotesPanelNotice;
	  };

export function prepareRemoteProfileCommand(
	value: string,
): RemoteProfileCommandTransition {
	const profile = parseRemoteProfileCommand(value);
	if (!profile) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message:
					"remote profile requires: <id> <user@host[:port]> [root] [key=path]",
			},
		};
	}
	return {
		kind: "save",
		profile,
		closeCommandLine: true,
		selectedIndex: 0,
		successNotice: {
			level: "ok",
			message: `remote profile saved ${profile.id} ${profile.host}`,
		},
	};
}

export function canStartRemoteConnection(
	diagnostic?: ReadOnlySftpConnectionDiagnostic,
): boolean {
	return (
		diagnostic?.status !== "connecting" && diagnostic?.status !== "cancelling"
	);
}

export type RemoteConnectPromptTransition =
	| {
			kind: "prompt";
			prompt: "remote-connect";
			value: "";
			preview: ReturnType<typeof createRemoteConnectPreview>;
			selectedIndex: number;
			notice: RemotesPanelNotice;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteConnectPrompt(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	candidateSession?: RemoteKnownHostsCandidateSession;
	pasteReviewSession?: RemoteKnownHostsPasteReviewSession;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
}): RemoteConnectPromptTransition {
	const selection = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	);
	if (!selection.profile) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no remote profile selected" },
		};
	}
	if (!canStartRemoteConnection(input.diagnostic)) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: `remote connect already in flight ${input.diagnostic?.id ?? selection.profile.id} status=${input.diagnostic?.status ?? "connecting"}`,
			},
		};
	}
	const candidate = resolveRemoteHostKeyCandidate(
		selection.profile,
		input.candidateSession,
		input.pasteReviewSession,
	).candidate;
	const preview = createRemoteConnectPreview(selection.profile, {
		hostKeyFingerprint: candidate?.fingerprint,
	});
	return {
		kind: "prompt",
		prompt: "remote-connect",
		value: "",
		preview,
		selectedIndex: selection.selectedIndex,
		notice: {
			level: "info",
			message: `remote connect preview opened ${preview.confirm}`,
		},
	};
}

export function prepareRemoteConnectSubmission(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	candidateSession?: RemoteKnownHostsCandidateSession;
	pasteReviewSession?: RemoteKnownHostsPasteReviewSession;
	receivedConfirmation: string;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
}): RemoteConnectSubmission {
	const selection = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	);
	const profile = selection.profile;
	if (!profile) {
		return {
			kind: "blocked",
			reason: "no-profile",
			selectedIndex: selection.selectedIndex,
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote connect requires a selected profile",
			},
		};
	}
	if (!canStartRemoteConnection(input.diagnostic)) {
		return {
			kind: "blocked",
			reason: "connection-busy",
			selectedIndex: selection.selectedIndex,
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: `remote connect already in flight ${input.diagnostic?.id ?? profile.id} status=${input.diagnostic?.status ?? "connecting"}`,
			},
		};
	}

	const candidateResolution = resolveRemoteHostKeyCandidate(
		profile,
		input.candidateSession,
		input.pasteReviewSession,
	);
	if (!candidateResolution.candidate) {
		const confirmation = createExactRemoteConnectConfirmation(
			createRemoteConnectPreview(profile),
			input.receivedConfirmation,
		);
		return {
			kind: "blocked",
			reason: candidateResolution.revoked ? "revoked-host-key" : "no-host-key",
			selectedIndex: selection.selectedIndex,
			closeCommandLine: true,
			confirmation,
			auditMessage: formatRemoteConnectConfirmationAuditMessage(confirmation),
			activityResult: createRemoteConnectStatusActivityResult(confirmation),
			notice: {
				level: "warn",
				message: candidateResolution.revoked
					? `remote connect blocked ${profile.id}: selected known_hosts fingerprint is revoked`
					: `remote connect blocked ${profile.id}: select a known_hosts candidate with K or P before connecting`,
			},
		};
	}

	const preview = createRemoteConnectPreview(profile, {
		hostKeyFingerprint: candidateResolution.candidate.fingerprint,
	});
	const confirmation = createExactRemoteConnectConfirmation(
		preview,
		input.receivedConfirmation,
	);
	const auditMessage =
		formatRemoteConnectConfirmationAuditMessage(confirmation);
	const activityResult = createRemoteConnectStatusActivityResult(confirmation);
	if (confirmation.status !== "confirmed-ready") {
		return {
			kind: "blocked",
			reason: "confirmation-mismatch",
			selectedIndex: selection.selectedIndex,
			closeCommandLine: true,
			confirmation,
			auditMessage,
			activityResult,
			notice: { level: "warn", message: confirmation.message },
		};
	}

	return {
		kind: "connect",
		profile,
		candidate: candidateResolution.candidate,
		selectedIndex: selection.selectedIndex,
		closeCommandLine: true,
		confirmation,
		auditMessage,
		activityResult,
		notice: { level: "info", message: confirmation.message },
	};
}

export type RemoteHostKeyEvidenceSubmission =
	| {
			kind: "confirmation";
			closeCommandLine: true;
			confirmation: ReturnType<typeof submitRemoteHostKeyEvidenceInput>;
			session: RemoteHostKeyEvidenceInputSession;
			auditMessage: string;
			activityResult: StatusActivityResult;
			notice: RemotesPanelNotice;
	  }
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: RemotesPanelNotice;
	  };

export function prepareRemoteHostKeyEvidenceSubmission(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	value: string;
	session?: RemoteHostKeyEvidenceInputSession;
}): RemoteHostKeyEvidenceSubmission {
	const profile = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	).profile;
	if (!profile) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote host key evidence input requires a selected profile",
			},
		};
	}
	const confirmation = submitRemoteHostKeyEvidenceInput(
		createRemoteHostKeyEvidenceInput(profile),
		input.value,
	);
	return {
		kind: "confirmation",
		closeCommandLine: true,
		confirmation,
		session: recordRemoteHostKeyEvidenceInputSession(
			input.session ?? {},
			confirmation,
		),
		auditMessage: formatRemoteHostKeyEvidenceInputAuditMessage(confirmation),
		activityResult:
			createRemoteHostKeyEvidenceInputStatusActivityResult(confirmation),
		notice: { level: "warn", message: confirmation.message },
	};
}

export type RemoteKnownHostsCandidateSubmission =
	| {
			kind: "candidates";
			closeCommandLine: true;
			preview: ReturnType<typeof createRemoteKnownHostsCandidatePreview>;
			session: RemoteKnownHostsCandidateSession;
			notice: RemotesPanelNotice;
	  }
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: RemotesPanelNotice;
	  };

export function prepareRemoteKnownHostsCandidateSubmission(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	value: string;
	session?: RemoteKnownHostsCandidateSession;
}): RemoteKnownHostsCandidateSubmission {
	const profile = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	).profile;
	if (!profile) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message:
					"remote known_hosts candidate input requires a selected profile",
			},
		};
	}
	const preview = createRemoteKnownHostsCandidatePreview(
		profile,
		input.value,
		"provided-known-hosts",
	);
	return {
		kind: "candidates",
		closeCommandLine: true,
		preview,
		session: recordRemoteKnownHostsCandidateSession(
			input.session ?? {},
			preview,
		),
		notice: {
			level: preview.candidates.length ? "info" : "warn",
			message: `remote known_hosts candidate ${preview.status} ${preview.id} candidates=${preview.candidates.length} selected=${preview.selected}`,
		},
	};
}

export type RemoteKnownHostsPasteSubmission =
	| {
			kind: "review";
			closeCommandLine: true;
			review: ReturnType<typeof createRemoteKnownHostsPasteReview>;
			preview: ReturnType<
				typeof createRemoteKnownHostsCandidatePreviewFromPasteReview
			>;
			candidateSession: RemoteKnownHostsCandidateSession;
			pasteReviewSession: RemoteKnownHostsPasteReviewSession;
			notice: RemotesPanelNotice;
	  }
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: RemotesPanelNotice;
	  };

export function prepareRemoteKnownHostsPasteSubmission(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	value: string;
	candidateSession?: RemoteKnownHostsCandidateSession;
	pasteReviewSession?: RemoteKnownHostsPasteReviewSession;
}): RemoteKnownHostsPasteSubmission {
	const selection = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	);
	if (!selection.profile) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote known_hosts paste review requires a selected profile",
			},
		};
	}
	const review = createRemoteKnownHostsPasteReview(
		selection.profile,
		input.value.replaceAll("\\n", "\n"),
	);
	const preview = createRemoteKnownHostsCandidatePreviewFromPasteReview(review);
	return {
		kind: "review",
		closeCommandLine: true,
		review,
		preview,
		pasteReviewSession: recordRemoteKnownHostsPasteReviewSession(
			input.pasteReviewSession ?? {},
			review,
		),
		candidateSession: recordRemoteKnownHostsCandidateSession(
			input.candidateSession ?? {},
			preview,
		),
		notice: {
			level: review.candidates.length ? "info" : "warn",
			message: `remote known_hosts paste review ${review.status} ${review.id} lines=${review.lineCount} candidates=${review.candidates.length} selected=${review.selected}`,
		},
	};
}

export type RemoteKnownHostsPasteSelectionInput =
	| { kind: "move"; direction: "next" | "previous" }
	| { kind: "candidate"; candidateIndex: number; method: "number" | "command" }
	| { kind: "input"; value: string };

export type RemoteKnownHostsPasteSelectionTransition =
	| {
			kind: "selection";
			review: ReturnType<typeof createRemoteKnownHostsPasteReview>;
			preview: ReturnType<
				typeof createRemoteKnownHostsCandidatePreviewFromPasteReview
			>;
			candidateSession: RemoteKnownHostsCandidateSession;
			pasteReviewSession: RemoteKnownHostsPasteReviewSession;
			activityResult: StatusActivityResult;
			notice: RemotesPanelNotice;
			closeCommandLine?: true;
	  }
	| {
			kind: "notice";
			notice: RemotesPanelNotice;
			closeCommandLine?: true;
	  };

export function prepareRemoteKnownHostsPasteSelection(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	candidateSession?: RemoteKnownHostsCandidateSession;
	pasteReviewSession?: RemoteKnownHostsPasteReviewSession;
	selection: RemoteKnownHostsPasteSelectionInput;
}): RemoteKnownHostsPasteSelectionTransition {
	const profile = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	).profile;
	const closeCommandLine = input.selection.kind === "input" ? true : undefined;
	if (!profile) {
		return {
			kind: "notice",
			...(closeCommandLine ? { closeCommandLine } : {}),
			notice: {
				level: "warn",
				message: "remote known_hosts paste selection requires a profile",
			},
		};
	}
	const review = createRemoteKnownHostsPasteReviewFromSession(
		profile,
		input.pasteReviewSession,
	);
	if (review.candidates.length === 0) {
		return {
			kind: "notice",
			...(closeCommandLine ? { closeCommandLine } : {}),
			notice: {
				level: "warn",
				message: `remote known_hosts paste review has no candidates ${profile.id}`,
			},
		};
	}

	let nextReview = review;
	let method: "next" | "previous" | "number" | "command";
	if (input.selection.kind === "move") {
		method = input.selection.direction;
		nextReview = moveRemoteKnownHostsPasteReviewSelection(
			review,
			input.selection.direction,
		);
	} else if (input.selection.kind === "candidate") {
		method = input.selection.method;
		nextReview = selectRemoteKnownHostsPasteReviewCandidate(
			review,
			input.selection.candidateIndex,
		);
	} else {
		method = "command";
		const candidateIndex = parseRemoteKnownHostsCandidateSelectionInput(
			input.selection.value,
		);
		if (candidateIndex === undefined) {
			return {
				kind: "notice",
				closeCommandLine: true,
				notice: {
					level: "warn",
					message: "remote known_hosts paste candidate selection invalid",
				},
			};
		}
		nextReview = selectRemoteKnownHostsPasteReviewCandidateFromInput(
			review,
			input.selection.value,
		);
	}
	if (nextReview === review) {
		const candidateIndex =
			input.selection.kind === "candidate"
				? input.selection.candidateIndex
				: input.selection.kind === "input"
					? parseRemoteKnownHostsCandidateSelectionInput(input.selection.value)
					: review.selected;
		return {
			kind: "notice",
			...(closeCommandLine ? { closeCommandLine } : {}),
			notice: {
				level: "warn",
				message: `remote known_hosts paste candidate ${candidateIndex ?? "none"} unavailable ${profile.id}`,
			},
		};
	}

	const preview =
		createRemoteKnownHostsCandidatePreviewFromPasteReview(nextReview);
	const pasteReviewSession = recordRemoteKnownHostsPasteReviewSession(
		input.pasteReviewSession ?? {},
		nextReview,
	);
	const candidateSession = recordRemoteKnownHostsCandidateSession(
		input.candidateSession ?? {},
		preview,
	);
	const message =
		input.selection.kind === "move"
			? `remote known_hosts paste candidate ${method} ${nextReview.id} selected=${nextReview.selected}/${nextReview.candidates.length}`
			: input.selection.kind === "input"
				? `remote known_hosts paste candidate command selected ${nextReview.id} selected=${nextReview.selected}/${nextReview.candidates.length}`
				: `remote known_hosts paste candidate selected ${nextReview.id} selected=${nextReview.selected}/${nextReview.candidates.length} method=${method}`;
	return {
		kind: "selection",
		review: nextReview,
		preview,
		pasteReviewSession,
		candidateSession,
		activityResult: createRemoteKnownHostsPasteSelectionStatusActivityResult(
			nextReview,
			method,
		),
		notice: { level: "info", message },
		...(closeCommandLine ? { closeCommandLine } : {}),
	};
}

export type RemoteHostTrustSubmission =
	| {
			kind: "confirmation";
			closeCommandLine: true;
			confirmation: RemoteHostKeyTrustReviewConfirmation;
			auditMessage: string;
			activityResult: StatusActivityResult;
			notice: RemotesPanelNotice;
	  }
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: RemotesPanelNotice;
	  };

export function prepareRemoteHostTrustSubmission(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	receivedConfirmation: string;
}): RemoteHostTrustSubmission {
	const profile = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	).profile;
	if (!profile) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "remote host trust review requires a selected profile",
			},
		};
	}
	const preview = createRemoteHostKeyTrustDecisionPreview(profile);
	const confirmation =
		input.receivedConfirmation === preview.confirm
			? submitRemoteHostKeyTrustReview(preview, input.receivedConfirmation)
			: {
					preview,
					status: "rejected" as const,
					input: input.receivedConfirmation,
					networkOpened: false as const,
					trustApplied: false as const,
					knownHostsWritten: false as const,
					message: `remote host trust review confirmation rejected ${profile.id}`,
				};
	return {
		kind: "confirmation",
		closeCommandLine: true,
		confirmation,
		auditMessage: formatRemoteHostKeyTrustReviewAuditMessage(confirmation),
		activityResult:
			createRemoteHostKeyTrustReviewStatusActivityResult(confirmation),
		notice: { level: "warn", message: confirmation.message },
	};
}

export type RemoteKnownHostsEvidenceHandoffTransition =
	| {
			kind: "copy";
			preview: ClipboardPreview;
			intent: StatusActivityCopyIntentRecord;
			statusEvidenceKind: "remote-known-hosts";
			notice: RemotesPanelNotice;
			paletteAuditMessage?: string;
			paletteActivityResult?: StatusActivityResult;
	  }
	| {
			kind: "export";
			exportPlan: ConsoleAuditExportPlan;
			statusEvidenceKind: "remote-known-hosts";
			paletteAuditMessage?: string;
			paletteActivityResult?: StatusActivityResult;
	  }
	| {
			kind: "notice";
			notice: RemotesPanelNotice;
			paletteAuditMessage?: string;
			paletteActivityResult?: StatusActivityResult;
	  };

export function resolveRemoteEvidenceResultOptions(
	selectedIndex: number,
	total: number,
): { selectedIndex: number; total: number } {
	const normalizedTotal = Math.max(1, Math.floor(total));
	return {
		selectedIndex: clampIndex(selectedIndex, normalizedTotal),
		total: normalizedTotal,
	};
}

export type RemoteKnownHostsEvidenceHandoffSelectionTransition =
	| {
			kind: "selection";
			selectedIndex: number;
			selected: number;
			total: number;
			resetCopyPreview: true;
			screen?: "status";
			focusArea?: "workspaces";
			notice: RemotesPanelNotice;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteKnownHostsEvidenceHandoffSelection(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	origin?: "keyboard" | "palette";
}): RemoteKnownHostsEvidenceHandoffSelectionTransition {
	const indexes = filterStatusActivityResultHistoryIndexes(
		input.history,
		"evidence-handoffs",
	);
	if (indexes.length === 0) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts evidence handoff results",
			},
		};
	}
	const selectedIndex = moveStatusActivityResultHistoryFilteredSelection(
		input.history,
		input.selectedIndex,
		"next",
		"evidence-handoffs",
	);
	const selected = Math.max(0, indexes.indexOf(selectedIndex));
	return {
		kind: "selection",
		selectedIndex,
		selected: selected + 1,
		total: indexes.length,
		resetCopyPreview: true,
		...(input.origin === "palette"
			? { screen: "status" as const, focusArea: "workspaces" as const }
			: {}),
		notice: {
			level: "info",
			message: `remote known_hosts evidence handoff ${selected + 1}/${indexes.length} row=${selectedIndex + 1}${input.origin === "palette" ? " origin=palette" : ""} ${input.history[selectedIndex]?.message ?? "none"}`,
		},
	};
}

export type RemoteKnownHostsEvidenceHandoffOpenTransition =
	| {
			kind: "open";
			timeline: ReturnType<typeof prepareTimelineSearchJumpTransition>;
			intent?: StatusActivityCopyIntentRecord;
			paletteAuditMessage?: string;
			paletteActivityResult?: StatusActivityResult;
	  }
	| {
			kind: "notice";
			notice: RemotesPanelNotice;
			paletteActivityResult?: StatusActivityResult;
	  };

export function prepareRemoteKnownHostsEvidenceHandoffOpen(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	events: ConsoleEvent[];
	origin?: "keyboard" | "palette";
}): RemoteKnownHostsEvidenceHandoffOpenTransition {
	const selected = getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff(
		input.history,
		input.selectedIndex,
	);
	if (!selected) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts evidence handoff result selected",
			},
			...(input.origin === "palette"
				? {
						paletteActivityResult:
							createStatusActivityResultTimelineJumpPaletteResult("open"),
					}
				: {}),
		};
	}
	const timeline = prepareTimelineSearchJumpTransition(
		input.events,
		selected.jump,
		{
			messageSuffix: input.origin === "palette" ? " origin=palette" : "",
		},
	);
	const intent = createRemoteKnownHostsEvidenceHandoffOpenCopyIntent(selected, {
		matches: timeline.matches,
	});
	const paletteOptions = {
		historyIndex: selected.historyIndex,
		jump: selected.jump,
		matches: timeline.matches,
		selectedIndex: selected.selected,
		total: selected.total,
	};
	return {
		kind: "open",
		timeline,
		...(intent ? { intent } : {}),
		...(input.origin === "palette"
			? {
					paletteAuditMessage:
						formatStatusActivityResultTimelineJumpPaletteAuditMessage(
							"open",
							paletteOptions,
						),
					paletteActivityResult:
						createStatusActivityResultTimelineJumpPaletteResult(
							"open",
							paletteOptions,
						),
				}
			: {}),
	};
}

export function prepareRemoteKnownHostsEvidenceHandoff(input: {
	action: "copy" | "export";
	plan?: ConsoleAuditExportPlan;
	selectedIndex: number;
	total: number;
	baseDir: string;
	origin?: "keyboard" | "palette";
}): RemoteKnownHostsEvidenceHandoffTransition {
	const options = resolveRemoteEvidenceResultOptions(
		input.selectedIndex,
		input.total,
	);
	const palette =
		input.origin === "palette"
			? {
					paletteAuditMessage:
						formatRemoteKnownHostsSelectionHistoryEvidencePaletteAuditMessage(
							input.action,
							input.plan,
							options,
						),
					paletteActivityResult:
						createRemoteKnownHostsSelectionHistoryEvidencePaletteStatusActivityResult(
							input.action,
							input.plan,
							options,
						),
				}
			: {};
	if (input.action === "copy") {
		const preview =
			createRemoteKnownHostsSelectionHistoryEvidenceClipboardPreview(
				input.plan,
				options,
			);
		const intent = preview
			? createStatusActivityCopyIntentRecord(preview)
			: undefined;
		if (!preview || !intent) {
			return {
				kind: "notice",
				notice: {
					level: "warn",
					message: "no remote known_hosts evidence handoff to copy",
				},
				...palette,
			};
		}
		return {
			kind: "copy",
			preview,
			intent,
			statusEvidenceKind: "remote-known-hosts",
			notice: {
				level: "info",
				message:
					intent.auditMessage ??
					formatStatusActivityCopyIntentAuditMessage(preview),
			},
			...palette,
		};
	}
	const exportPlan =
		createRemoteKnownHostsSelectionHistoryEvidenceAuditExportPlan(input.plan, {
			baseDir: input.baseDir,
			...options,
		});
	if (!exportPlan) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no remote known_hosts evidence handoff to export",
			},
			...palette,
		};
	}
	return {
		kind: "export",
		exportPlan,
		statusEvidenceKind: "remote-known-hosts",
		...palette,
	};
}

export type RemoteRetryTransition =
	| {
			kind: "prompt";
			prompt: "remote-connect";
			value: "";
			expectedConfirmation: string;
			selectedIndex: number;
			notice: RemotesPanelNotice;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteRetry(input: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
}): RemoteRetryTransition {
	const selection = resolveRemoteProfileSelection(
		input.profiles,
		input.selectedIndex,
	);
	const profile = selection.profile;
	if (
		!profile ||
		!input.diagnostic ||
		(input.diagnostic.status !== "failed" &&
			input.diagnostic.status !== "cancelled")
	) {
		return {
			kind: "notice",
			notice: { level: "info", message: "no remote connection to retry" },
		};
	}
	if (profile.id !== input.diagnostic.id) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "select the failed remote profile before retrying",
			},
		};
	}
	const expectedConfirmation = `connect remote ${profile.id}`;
	return {
		kind: "prompt",
		prompt: "remote-connect",
		value: "",
		expectedConfirmation,
		selectedIndex: selection.selectedIndex,
		notice: {
			level: "info",
			message: `remote retry requires exact confirmation ${expectedConfirmation}`,
		},
	};
}

export type RemoteConnectionCancellationTransition =
	| {
			kind: "cancel";
			diagnostic: ReadOnlySftpConnectionDiagnostic;
			notice: RemotesPanelNotice;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteConnectionCancellation(input: {
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
	activeRunToken?: number;
	currentRunToken: number;
	hasPendingConnection: boolean;
}): RemoteConnectionCancellationTransition {
	if (
		!input.hasPendingConnection ||
		input.activeRunToken === undefined ||
		input.activeRunToken !== input.currentRunToken ||
		input.diagnostic?.status !== "connecting"
	) {
		return {
			kind: "notice",
			notice: {
				level: "info",
				message: "no pending SFTP connection to cancel",
			},
		};
	}
	const diagnostic = requestReadOnlySftpConnectionCancellation(
		input.diagnostic,
	);
	return {
		kind: "cancel",
		diagnostic,
		notice: {
			level: "warn",
			message: `remote connect cancellation requested ${diagnostic.id} attempt=${diagnostic.attempt}`,
		},
	};
}

export type RemoteDisconnectTransition =
	| {
			kind: "restore-local";
			cancelActiveAttempt: boolean;
			ownerRunToken?: number;
	  }
	| { kind: "notice"; notice: RemotesPanelNotice };

export function prepareRemoteDisconnect(input: {
	hasRemoteSession: boolean;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
	activeRunToken?: number;
	currentRunToken: number;
	hasPendingConnection: boolean;
}): RemoteDisconnectTransition {
	const hasLiveAttempt =
		input.diagnostic?.status === "connecting" ||
		input.diagnostic?.status === "cancelling";
	if (!input.hasRemoteSession && !hasLiveAttempt) {
		return {
			kind: "notice",
			notice: {
				level: "info",
				message: "no read-only SFTP session connected",
			},
		};
	}
	const ownsActiveAttempt = Boolean(
		hasLiveAttempt &&
			input.hasPendingConnection &&
			input.activeRunToken !== undefined &&
			input.activeRunToken === input.currentRunToken,
	);
	return {
		kind: "restore-local",
		cancelActiveAttempt: ownsActiveAttempt,
		...(ownsActiveAttempt ? { ownerRunToken: input.activeRunToken } : {}),
	};
}

export type RemoteDisconnectPublication =
	| { status: "stale"; publishCurrent: false }
	| {
			status: "current";
			publishCurrent: true;
			diagnostic: ReadOnlySftpConnectionDiagnostic;
			notice: RemotesPanelNotice;
	  }
	| {
			status: "current";
			publishCurrent: false;
			notice: RemotesPanelNotice;
	  };

export function classifyRemoteDisconnectPublication(input: {
	currentDiagnosticSequence: number;
	requestDiagnosticSequence: number;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
	localRestored?: boolean;
}): RemoteDisconnectPublication {
	if (input.currentDiagnosticSequence !== input.requestDiagnosticSequence) {
		return { status: "stale", publishCurrent: false };
	}
	if (
		input.diagnostic?.status === "connecting" ||
		input.diagnostic?.status === "cancelling"
	) {
		return {
			status: "current",
			publishCurrent: true,
			diagnostic: finishReadOnlySftpConnectionDiagnostic(
				input.diagnostic,
				"cancelled",
				"SFTP connection cancelled by operator during disconnect",
			),
			notice: {
				level: "warn",
				message:
					input.localRestored === false
						? "pending read-only SFTP connection cancelled; local filesystem restore failed"
						: "pending read-only SFTP connection cancelled; local filesystem restored",
			},
		};
	}
	const notice = {
		level: "info",
		message: "read-only SFTP session closed; local filesystem restored",
	} as const;
	if (
		input.diagnostic?.status !== "connected" ||
		input.localRestored === false
	) {
		return { status: "current", publishCurrent: false, notice };
	}
	return {
		status: "current",
		publishCurrent: true,
		diagnostic: finishReadOnlySftpConnectionDiagnostic(
			input.diagnostic,
			"disconnected",
			"read-only SFTP session closed by operator",
		),
		notice,
	};
}

export type RemoteConnectionPublication = {
	status: "current" | "stale";
	publishCurrent: boolean;
	diagnostic?: ReadOnlySftpConnectionDiagnostic;
	auditMessage: string;
	activityResult: StatusActivityResult;
	notice: RemotesPanelNotice;
};

export function classifyRemoteConnectionPublication(input: {
	currentDiagnosticSequence: number;
	requestDiagnosticSequence: number;
	currentRunToken: number;
	requestRunToken: number;
	attempt: ReadOnlySftpConnectionDiagnostic;
	currentDiagnostic?: ReadOnlySftpConnectionDiagnostic;
	connectionAborted?: boolean;
	ownsPendingConnection?: boolean;
	outcome: ReadOnlySftpConnectionOutcome & {
		status: "connected" | "failed" | "cancelled";
	};
}): RemoteConnectionPublication {
	const sameAttempt =
		input.currentDiagnostic !== undefined &&
		input.currentDiagnostic.id === input.attempt.id &&
		input.currentDiagnostic.attempt === input.attempt.attempt &&
		input.currentDiagnostic.startedAt === input.attempt.startedAt;
	const currentStatusAllowsOutcome =
		input.outcome.status === "connected"
			? input.currentDiagnostic?.status === "connecting" &&
				!input.connectionAborted &&
				input.ownsPendingConnection !== false
			: input.currentDiagnostic?.status === "connecting" ||
				input.currentDiagnostic?.status === "cancelling";
	const publishCurrent =
		input.currentDiagnosticSequence === input.requestDiagnosticSequence &&
		input.currentRunToken === input.requestRunToken &&
		sameAttempt &&
		currentStatusAllowsOutcome;
	const auditMessage = formatReadOnlySftpConnectionAuditMessage(input.outcome);
	const activityResult: StatusActivityResult = {
		source: "timeline",
		action: "remote-connect",
		message: `remote connect ${input.outcome.status} ${input.outcome.id} ${input.outcome.host}:${input.outcome.port}`,
		detail: `target="${input.outcome.target}" fingerprint=${input.outcome.fingerprint} network=${input.outcome.status === "connected" ? "opened" : "closed"} writes=locked${input.outcome.status === "connected" ? "" : ` reason=${JSON.stringify(input.outcome.message)}`}`,
		detailRows: [input.outcome.message, `audit=${auditMessage}`],
	};
	return {
		status: publishCurrent ? "current" : "stale",
		publishCurrent,
		...(publishCurrent
			? {
					diagnostic: finishReadOnlySftpConnectionDiagnostic(
						input.attempt,
						input.outcome.status,
						input.outcome.message,
					),
				}
			: {}),
		auditMessage,
		activityResult,
		notice: {
			level:
				input.outcome.status === "connected"
					? "ok"
					: input.outcome.status === "cancelled"
						? "warn"
						: "fail",
			message: auditMessage,
		},
	};
}

function resolveRemoteHostKeyCandidate(
	profile: SftpRemoteProfile,
	candidateSession: RemoteKnownHostsCandidateSession = {},
	pasteReviewSession: RemoteKnownHostsPasteReviewSession = {},
): { candidate?: RemoteKnownHostsCandidate; revoked: boolean } {
	const candidate = getSelectedRemoteKnownHostsCandidate(
		profile,
		candidateSession,
		pasteReviewSession,
	);
	const candidates = [
		...(candidateSession[profile.id]?.candidates ?? []),
		...(pasteReviewSession[profile.id]?.candidates ?? []),
	];
	const selectedFingerprint =
		candidate?.fingerprint ??
		getRawSelectedFingerprint(profile, candidateSession, pasteReviewSession);
	const revoked = Boolean(
		selectedFingerprint &&
			candidates.some(
				(item) =>
					item.marker === "@revoked" &&
					item.fingerprint === selectedFingerprint,
			),
	);
	return { candidate: revoked ? undefined : candidate, revoked };
}

function getRawSelectedFingerprint(
	profile: SftpRemoteProfile,
	candidateSession: RemoteKnownHostsCandidateSession,
	pasteReviewSession: RemoteKnownHostsPasteReviewSession,
): string | undefined {
	const paste = pasteReviewSession[profile.id];
	if (paste && paste.selected !== "none") {
		return paste.candidates.find((item) => item.index === paste.selected)
			?.fingerprint;
	}
	const preview = candidateSession[profile.id];
	return preview && preview.selected !== "none"
		? preview.candidates.find((item) => item.index === preview.selected)
				?.fingerprint
		: undefined;
}

function createExactRemoteConnectConfirmation(
	preview: ReturnType<typeof createRemoteConnectPreview>,
	receivedConfirmation: string,
): RemoteConnectConfirmation {
	if (receivedConfirmation === preview.confirm) {
		return submitRemoteConnectConfirmation(preview, receivedConfirmation);
	}
	return {
		preview,
		status: "rejected",
		input: receivedConfirmation,
		networkOpened: false,
		message: `remote connect confirmation rejected ${preview.id}`,
	};
}
