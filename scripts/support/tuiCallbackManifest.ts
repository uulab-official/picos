import type { TuiCallbackManifestRow } from "../tuiCallbackAudit";

const callbackNames = [
	"log",
	"beginCommand",
	"endCommand",
	"recordStatusActivityResult",
	"syncConfigSessionState",
	"saveConfigWorkspaceAdjustment",
	"submitConfigTextCommand",
	"applyNextConfigPolicyPreset",
	"openConfigResetConfirmation",
	"submitConfigResetCommand",
	"previewFile",
	"loadFiles",
	"refreshFiles",
	"disconnectRemoteFiles",
	"openSelectedFileEntry",
	"goToParentDirectory",
	"jumpToLocation",
	"jumpToNextLocation",
	"submitPathCommand",
	"submitRouteDestinationCommand",
	"submitRouteFilterCommand",
	"runToolPlan",
	"submitToolCommand",
	"applyToolPromptCommandLineInput",
	"submitEditorAppendLineCommand",
	"submitEditorInsertLineCommand",
	"submitEditorReplaceLineCommand",
	"undoEditorEdit",
	"deleteSelectedEditorLine",
	"submitEditorSaveConfirmationCommand",
	"submitToolHistoryFilterCommand",
	"submitToolHistoryCleanupCommand",
	"submitToolTargetLabelCommand",
	"submitToolTargetValueCommand",
	"submitToolTargetActionCommand",
	"submitToolTargetCleanupCommand",
	"submitToolTargetPresetCommand",
	"submitEndpointFilterCommand",
	"submitRouteFilterCleanupCommand",
	"submitEndpointFilterCleanupCommand",
	"submitPortProcessControlCommand",
	"openPalettePortProcessControlPreview",
	"submitTimelineSearchCommand",
	"submitTimelineSearchCleanupCommand",
	"submitLogSearchCommand",
	"submitLogsCleanupCommand",
	"submitControlConfirmationCommand",
	"runControlExecutionAttempt",
	"submitClipboardCommand",
	"goBackFileHistory",
	"goForwardFileHistory",
	"openSelectedFileOperation",
	"submitFileOperationDestinationCommand",
	"submitFileOperationConfirmCommand",
	"openClipboardConfirmation",
	"openSelectedUpdateHandoffClipboard",
	"openSelectedUpdateHandoffExternal",
	"submitExternalOpenCommand",
	"submitFileOpenCommand",
	"refreshHandoffIndex",
	"refreshAuditExportIndex",
	"refreshAuditExportArchiveIndex",
	"openSelectedHandoffFile",
	"openSelectedAuditExportFile",
	"openSelectedAuditExportArchiveFile",
	"openAuditArchiveRetentionPreview",
	"openInterfaceAuditArchiveRetentionPreview",
	"openSelectedAuditExportArchive",
	"openSelectedInterfaceEvidenceArchive",
	"openSelectedCleanupExportFile",
	"openSelectedToolExportFile",
	"openSelectedToolExportArchiveFile",
	"openSelectedStatusActivityToolsEvidenceSearchMatchFile",
	"openSelectedStatusActivityToolsEvidenceSearchMatchArchive",
	"openSelectedToolExportArchive",
	"openToolArchiveRetentionPreview",
	"cycleToolEvidenceFilter",
	"openToolEvidenceSearchPrompt",
	"submitToolEvidenceSearchCommand",
	"cycleInterfaceEvidenceStateFilter",
	"openInterfaceEvidenceSearchPrompt",
	"submitInterfaceEvidenceSearchCommand",
	"saveCurrentInterfaceEvidenceSearchPreset",
	"cycleInterfaceEvidenceSearchPreset",
	"openSelectedCleanupExportArchive",
	"archiveSelectedHandoffFile",
	"exportToolHistory",
	"exportRouteHandoff",
	"exportInterfaceSourceHandoff",
	"openInterfaceSourceHandoff",
	"openRouteHandoff",
	"exportEndpointHandoff",
	"openEndpointHandoff",
	"selectRemoteProfile",
	"submitRemoteProfileCommand",
	"submitRemoteConnectCommand",
	"cancelPendingRemoteConnect",
	"cancelOperationRun",
	"runSelectedOperationPreset",
	"submitRemoteHostKeyEvidenceInputCommand",
	"submitRemoteKnownHostsCandidateCommand",
	"submitRemoteKnownHostsPasteReviewCommand",
	"moveRemoteKnownHostsPasteReviewSelectionCommand",
	"selectRemoteKnownHostsPasteReviewCandidateCommand",
	"submitRemoteKnownHostsPasteSelectionCommand",
	"submitRemoteHostTrustReviewCommand",
	"inspectSelectedEndpointProcess",
	"openSelectedProcessFile",
	"refresh",
	"cycleStatusActivityResultHistoryFilter",
	"cycleStatusActivityResultTimelineJumpFilter",
	"getSelectedTimelineEvidenceTrailResultOptions",
	"selectNextTimelineEvidenceTrailExport",
	"cycleTimelineEvidenceTrailSourceFilter",
	"jumpSelectedTimelineEvidenceTrailSearch",
	"openSelectedTimelineEvidenceTrailExport",
	"getSelectedProcessControlEvidenceResultOptions",
	"selectNextProcessControlEvidenceExport",
	"jumpSelectedProcessControlEvidenceSearch",
	"openSelectedProcessControlEvidenceExport",
	"getSelectedRemoteKnownHostsSelectionEvidenceResultOptions",
	"selectNextRemoteKnownHostsSelectionEvidenceExport",
	"jumpSelectedRemoteKnownHostsSelectionEvidenceSearch",
	"openSelectedRemoteKnownHostsSelectionEvidenceExport",
	"openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff",
	"exportSelectedRemoteKnownHostsSelectionEvidenceHandoff",
	"getSelectedInterfaceConfirmationEvidenceResultOptions",
	"selectNextInterfaceConfirmationEvidenceExport",
	"jumpSelectedInterfaceConfirmationEvidenceSearch",
	"openSelectedInterfaceConfirmationEvidenceExport",
	"selectNextStatusActivityResultTimelineJump",
	"selectNextRemoteKnownHostsEvidenceHandoff",
	"openSelectedRemoteKnownHostsEvidenceHandoff",
	"openSelectedStatusActivityResultTimelineJump",
	"applyConfigManagedShelfStateEffects",
	"runAction",
	"openCleanupHandoffPrompt",
	"dismissCleanupHandoff",
	"dismissConfigShelfLanding",
	"runConfigShelfFocusAction",
	"jumpToConfigManagedShelf",
	"reopenCleanupHandoffHistory",
	"refreshCleanupExportIndex",
	"refreshCleanupExportArchiveIndex",
	"refreshToolExportIndex",
	"refreshToolExportArchiveIndex",
	"submitCleanupExportArchiveCommand",
	"submitToolExportArchiveCommand",
	"submitAuditExportArchiveCommand",
	"submitAuditArchiveRetentionCommand",
	"submitToolArchiveRetentionCommand",
	"submitDnsServerProposalCommand",
	"openInterfaceStateProposal",
	"submitInterfaceConfirmationCommand",
	"exportCleanupHandoffHistory",
	"useInput",
] as const;

const wiringReasons = {
	log: "React setter/event publication",
	beginCommand: "React setter/event publication",
	endCommand: "React setter/event publication",
	applyConfigManagedShelfStateEffects: "React setter/event publication",
	refreshFiles: "direct I/O invocation",
	refresh: "direct I/O invocation",
} as const;

const delegatedCallbacks = {
	previewFile: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates file preview outcome classification",
	},
	loadFiles: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason:
			"delegates provider generation eligibility and sequenced listing publication classification",
	},
	openSelectedFileEntry: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates selected file open eligibility",
	},
	goToParentDirectory: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates parent navigation transition",
	},
	jumpToLocation: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates location navigation transition",
	},
	jumpToNextLocation: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates next-location selection",
	},
	submitPathCommand: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates typed path navigation transition",
	},
	goBackFileHistory: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates backward history transition",
	},
	goForwardFileHistory: {
		owner: "src/tui/fileWorkspaceTransitions.ts",
		reason: "delegates forward history transition",
	},
	openSelectedFileOperation: {
		owner: "src/tui/fileOperationDialog.ts",
		reason: "delegates selected operation launch guard",
	},
	submitFileOperationDestinationCommand: {
		owner: "src/tui/fileOperationDialog.ts",
		reason: "delegates operation destination transition",
	},
	submitFileOperationConfirmCommand: {
		owner: "src/tui/fileOperationDialog.ts",
		reason: "delegates operation confirmation planning",
	},
	submitEditorAppendLineCommand: {
		owner: "src/tui/editorBuffer.ts",
		reason: "delegates editor append transition",
	},
	submitEditorInsertLineCommand: {
		owner: "src/tui/editorBuffer.ts",
		reason: "delegates editor insert transition",
	},
	submitEditorReplaceLineCommand: {
		owner: "src/tui/editorBuffer.ts",
		reason: "delegates editor replace transition",
	},
	undoEditorEdit: {
		owner: "src/tui/editorBuffer.ts",
		reason: "delegates editor undo transition",
	},
	deleteSelectedEditorLine: {
		owner: "src/tui/editorBuffer.ts",
		reason: "delegates editor delete transition",
	},
	applyToolPromptCommandLineInput: {
		owner: "src/tui/commandLine.ts",
		reason: "delegates typed tool prompt input transition",
	},
	submitToolTargetLabelCommand: {
		owner: "src/tui/toolHistory.ts",
		reason: "delegates selected-target label transition",
	},
	submitToolTargetValueCommand: {
		owner: "src/tui/toolHistory.ts",
		reason: "delegates selected-target value transition",
	},
	submitToolTargetActionCommand: {
		owner: "src/tui/toolHistory.ts",
		reason: "delegates selected-target action transition",
	},
	submitToolTargetCleanupCommand: {
		owner: "src/tui/toolHistory.ts",
		reason: "delegates selected-target cleanup transition",
	},
	submitToolTargetPresetCommand: {
		owner: "src/tui/toolHistory.ts",
		reason: "delegates selected-target save transition",
	},
	syncConfigSessionState: {
		owner: "src/tui/configPanel.ts",
		reason: "applies pure config-session synchronization intent",
	},
	saveConfigWorkspaceAdjustment: {
		owner: "src/tui/configPanel.ts",
		reason: "delegates selected config adjustment and operator notice",
	},
	submitConfigTextCommand: {
		owner: "src/tui/configPanel.ts",
		reason: "delegates editable config selection and validation intent",
	},
	applyNextConfigPolicyPreset: {
		owner: "src/tui/configPanel.ts",
		reason:
			"delegates policy selection, full config merge, and per-row notice levels",
	},
	openConfigResetConfirmation: {
		owner: "src/tui/configPanel.ts",
		reason:
			"delegates reset preview, command-line prompt, and preview-open notice",
	},
	submitConfigResetCommand: {
		owner: "src/tui/configPanel.ts",
		reason:
			"delegates reset confirmation, bounded config write intent, and notice",
	},
	dismissConfigShelfLanding: {
		owner: "src/tui/configPanel.ts",
		reason: "delegates managed-shelf landing dismissal guard and notice",
	},
	runConfigShelfFocusAction: {
		owner: "src/tui/configPanel.ts",
		reason:
			"delegates shelf guard, preset/filter selection, state effects, recovery, and notice",
	},
	jumpToConfigManagedShelf: {
		owner: "src/tui/configPanel.ts",
		reason:
			"delegates shelf cursor effects, landing target, and exact jump notice",
	},
	reopenCleanupHandoffHistory: {
		owner: "src/tui/statusActivityQueue.ts",
		reason: "delegates cleanup-history selection, reopen intent, and notice",
	},
} as const;

const filesDelegatedCallbacks = new Set([
	"previewFile",
	"loadFiles",
	"openSelectedFileEntry",
	"goToParentDirectory",
	"jumpToLocation",
	"jumpToNextLocation",
	"submitPathCommand",
	"goBackFileHistory",
	"goForwardFileHistory",
	"openSelectedFileOperation",
	"submitFileOperationDestinationCommand",
	"submitFileOperationConfirmCommand",
]);

const configDelegatedCallbacks = new Set([
	"syncConfigSessionState",
	"saveConfigWorkspaceAdjustment",
	"submitConfigTextCommand",
	"applyNextConfigPolicyPreset",
	"openConfigResetConfirmation",
	"submitConfigResetCommand",
	"dismissConfigShelfLanding",
	"runConfigShelfFocusAction",
	"jumpToConfigManagedShelf",
]);

const statusDelegatedCallbacks = new Set(["reopenCleanupHandoffHistory"]);

export const tuiCallbackManifest: TuiCallbackManifestRow[] = callbackNames.map(
	(name) => {
		const reason = wiringReasons[name as keyof typeof wiringReasons];
		const delegated =
			delegatedCallbacks[name as keyof typeof delegatedCallbacks];
		if (delegated) {
			return {
				name,
				owner: delegated.owner,
				classification: "delegated",
				slice: filesDelegatedCallbacks.has(name)
					? "files-transitions"
					: configDelegatedCallbacks.has(name)
						? "config-transitions"
						: statusDelegatedCallbacks.has(name)
							? "status-transitions"
							: name.startsWith("submitEditor") ||
									name === "undoEditorEdit" ||
									name === "deleteSelectedEditorLine"
								? "editor-transitions"
								: "tool-target-transitions",
				reason: delegated.reason,
			};
		}
		if (name === "useInput") {
			return {
				name,
				owner:
					"src/tui/App.tsx + src/tui/fileWorkspaceTransitions.ts + src/tui/configPanel.ts + src/tui/palette.ts + src/tui/statusActivityQueue.ts",
				classification: "inline-decision",
				slice: "config-palette-transitions",
				reason:
					"Files, Config, Palette, and cleanup-history input delegate guards, selection, transitions, and notices; unrelated workspace branches remain inline",
			};
		}
		return reason
			? {
					name,
					owner: "src/tui/App.tsx",
					classification: "wiring",
					slice: "baseline",
					reason,
				}
			: {
					name,
					owner: "src/tui/App.tsx",
					classification: "inline-decision",
					slice: "baseline",
					reason: "pending state-transition extraction",
				};
	},
);
