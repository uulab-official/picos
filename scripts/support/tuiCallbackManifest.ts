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
	"applyToolsInputIoEffect",
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
	"applyEndpointIoEffect",
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
	refreshFiles: "direct I/O invocation",
	refresh: "direct I/O invocation",
} as const;

const delegatedCallbacks = {
	disconnectRemoteFiles: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates remote-session guard, active-attempt ownership, shared-sequence terminal publication, and exact notice while App retains restore, abort, and close I/O",
	},
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
	applyToolsInputIoEffect: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"applies complete Tools persistence, run, and export intents while App retains config, collector, and export I/O",
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
	submitRouteFilterCommand: {
		owner: "src/tui/routePanel.ts",
		reason: "delegates route filter normalization, matching, state, and notice",
	},
	submitRouteFilterCleanupCommand: {
		owner: "src/tui/routePanel.ts",
		reason: "delegates route cleanup confirmation and exact notice",
	},
	submitEndpointFilterCommand: {
		owner: "src/tui/endpointPanel.ts",
		reason:
			"delegates scoped endpoint filter normalization, matching, selection repair, and notice",
	},
	submitEndpointFilterCleanupCommand: {
		owner: "src/tui/endpointPanel.ts",
		reason: "delegates scoped endpoint cleanup confirmation and exact notice",
	},
	submitPortProcessControlCommand: {
		owner: "src/tui/endpointPanel.ts",
		reason:
			"delegates selected PID guard, exact process-control confirmation, locked execution plan, and audit notices",
	},
	openPalettePortProcessControlPreview: {
		owner: "src/tui/endpointPanel.ts",
		reason:
			"delegates selected PID availability, preview state, named prompt routing, and exact palette notice",
	},
	submitControlConfirmationCommand: {
		owner: "src/tui/actionControlTransitions.ts",
		reason:
			"delegates preview eligibility, exact confirmation, simulation state, execution reset, and audit notices",
	},
	runControlExecutionAttempt: {
		owner: "src/tui/actionControlTransitions.ts",
		reason:
			"delegates preview guard, shared request-token publication, execution intent, stale result classification, and audit outcome while App retains config and runner I/O",
	},
	runAction: {
		owner:
			"src/tui/actionControlTransitions.ts + src/tui/actionRunTransitions.ts + src/tui/configPanel.ts + src/tui/interfacePanel.ts",
		reason:
			"delegates catalog lookup, metadata and safety guards, read-versus-mutation routing, preview state, and exact notices while App retains existing feature-owner handoffs and I/O",
	},
	submitTimelineSearchCommand: {
		owner: "src/tui/timelinePanel.ts",
		reason:
			"delegates timeline search normalization, newest selection, presets, and notice",
	},
	submitTimelineSearchCleanupCommand: {
		owner: "src/tui/timelinePanel.ts",
		reason: "delegates timeline cleanup confirmation and exact notice",
	},
	submitLogSearchCommand: {
		owner: "src/tui/logPanel.ts",
		reason:
			"delegates logs search normalization, matching, presets, and notice",
	},
	submitLogsCleanupCommand: {
		owner: "src/tui/logPanel.ts",
		reason: "delegates logs cleanup confirmation and exact notice",
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
	refreshHandoffIndex: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates sequenced handoff refresh publication and selection repair",
	},
	refreshAuditExportIndex: {
		owner: "src/tui/statusEvidence.ts + src/tui/statusActivityQueue.ts",
		reason:
			"delegates sequenced audit refresh publication and atomic active-plus-archive recovered-family selection repair",
	},
	refreshAuditExportArchiveIndex: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates sequenced audit archive refresh publication and atomic active-plus-archive interface selection repair",
	},
	openSelectedHandoffFile: {
		owner: "src/tui/statusEvidence.ts",
		reason: "delegates selected handoff open eligibility, plan, and notice",
	},
	openSelectedAuditExportFile: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates selected audit export open eligibility, plan, and notice",
	},
	openSelectedAuditExportArchiveFile: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates selected archived audit export open eligibility, plan, and notice",
	},
	openAuditArchiveRetentionPreview: {
		owner: "src/tui/statusEvidence.ts",
		reason: "delegates audit archive retention eligibility, plan, and notice",
	},
	openInterfaceAuditArchiveRetentionPreview: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates interface evidence retention eligibility, plan, and notice",
	},
	openSelectedAuditExportArchive: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates selected audit export archive eligibility and confirmation",
	},
	openSelectedInterfaceEvidenceArchive: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates selected interface evidence archive eligibility and confirmation",
	},
	openSelectedCleanupExportFile: {
		owner: "src/tui/statusEvidence.ts + src/tui/cleanupIndex.ts",
		reason:
			"delegates selected cleanup export open eligibility, plan, and notice",
	},
	openSelectedToolExportFile: {
		owner: "src/tui/statusEvidence.ts + src/tui/toolHistory.ts",
		reason:
			"delegates selected Tools export open eligibility, plan, and notice",
	},
	openSelectedToolExportArchiveFile: {
		owner: "src/tui/statusEvidence.ts + src/tui/toolHistory.ts",
		reason:
			"delegates selected archived Tools export open eligibility, plan, and notice",
	},
	openSelectedStatusActivityToolsEvidenceSearchMatchFile: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered Tools match selection, open eligibility, plan, activity result, and exact notice",
	},
	openSelectedStatusActivityToolsEvidenceSearchMatchArchive: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered Tools match selection, archive eligibility, confirmation, activity result, and exact notice",
	},
	openSelectedToolExportArchive: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"delegates selected Tools export archive eligibility and confirmation",
	},
	openToolArchiveRetentionPreview: {
		owner: "src/tui/statusEvidence.ts + src/tui/toolHistory.ts",
		reason: "delegates Tools archive retention eligibility, plan, and notice",
	},
	openSelectedCleanupExportArchive: {
		owner: "src/tui/cleanupIndex.ts",
		reason:
			"delegates selected cleanup export archive eligibility and confirmation",
	},
	archiveSelectedHandoffFile: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates selected handoff archive eligibility, target, and notice",
	},
	exportToolHistory: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"delegates filtered selected Tools history resolution, export eligibility, plan, and notice",
	},
	exportInterfaceSourceHandoff: {
		owner: "src/tui/interfacePanel.ts",
		reason:
			"delegates selected interface source-handoff eligibility, selection repair, plan, and notice",
	},
	openInterfaceSourceHandoff: {
		owner: "src/tui/interfacePanel.ts",
		reason:
			"delegates selected interface source-handoff eligibility, selection repair, plan, and notice",
	},
	selectNextTimelineEvidenceTrailExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason: "delegates recovered Timeline evidence selection and exact notice",
	},
	jumpSelectedTimelineEvidenceTrailSearch: {
		owner: "src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates clamped Timeline evidence selection, search jump, activity result, and newest-result notice",
	},
	openSelectedTimelineEvidenceTrailExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered Timeline selection, master index, open eligibility, plan, activity result, and exact notice",
	},
	selectNextProcessControlEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason: "delegates recovered process evidence selection and exact notice",
	},
	jumpSelectedProcessControlEvidenceSearch: {
		owner: "src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates clamped process evidence selection, search jump, activity result, and newest-result notice",
	},
	openSelectedProcessControlEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered process selection, master index, open eligibility, plan, activity result, and exact notice",
	},
	selectRemoteProfile: {
		owner: "src/tui/remotesPanel.ts",
		reason: "delegates clamped remote profile selection and staging guard",
	},
	submitRemoteProfileCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates remote profile parsing, command cleanup, repaired selection, and exact notices while App retains config I/O",
	},
	submitRemoteConnectCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates profile/key eligibility, global revoked-key blocking, exact-byte confirmation, busy state, and sequence/run-token publication classification",
	},
	cancelPendingRemoteConnect: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates active run-token cancellation eligibility, cancelling diagnostic, and exact notice",
	},
	submitRemoteHostKeyEvidenceInputCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates host-key evidence confirmation, session state, activity result, and exact notices",
	},
	submitRemoteKnownHostsCandidateCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates known_hosts candidate parsing, session state, and exact notice",
	},
	submitRemoteKnownHostsPasteReviewCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates paste normalization, review/candidate session state, and exact notice",
	},
	moveRemoteKnownHostsPasteReviewSelectionCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates paste candidate movement, paired session state, activity result, and exact notice",
	},
	selectRemoteKnownHostsPasteReviewCandidateCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates numbered paste candidate selection, paired session state, activity result, and exact notice",
	},
	submitRemoteKnownHostsPasteSelectionCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates typed paste candidate selection, command cleanup, paired session state, activity result, and exact notice",
	},
	submitRemoteHostTrustReviewCommand: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates exact-byte host trust confirmation, audit/activity result, and exact notice",
	},
	getSelectedRemoteKnownHostsSelectionEvidenceResultOptions: {
		owner: "src/tui/remotesPanel.ts",
		reason: "delegates clamped remote evidence result options",
	},
	selectNextRemoteKnownHostsSelectionEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered remote known_hosts evidence selection and exact notice",
	},
	jumpSelectedRemoteKnownHostsSelectionEvidenceSearch: {
		owner: "src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates clamped remote known_hosts selection, search jump, activity result, and newest-result notice",
	},
	openSelectedRemoteKnownHostsSelectionEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates recovered remote known_hosts selection, master index, open eligibility, plan, activity result, and exact notice",
	},
	openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates remote known_hosts clipboard handoff eligibility, intent, palette evidence, and exact notice",
	},
	exportSelectedRemoteKnownHostsSelectionEvidenceHandoff: {
		owner: "src/tui/remotesPanel.ts",
		reason:
			"delegates remote known_hosts export handoff eligibility, plan, and palette evidence while App retains audit write I/O",
	},
	selectNextRemoteKnownHostsEvidenceHandoff: {
		owner: "src/tui/remotesPanel.ts + src/tui/statusActivityQueue.ts",
		reason:
			"delegates filtered remote evidence handoff selection, reset state, focus intent, and exact notice",
	},
	openSelectedRemoteKnownHostsEvidenceHandoff: {
		owner:
			"src/tui/remotesPanel.ts + src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates remote evidence handoff selection, Timeline jump, copy intent, palette evidence, and exact notices",
	},
	selectNextInterfaceConfirmationEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason: "delegates recovered interface evidence selection and exact notice",
	},
	jumpSelectedInterfaceConfirmationEvidenceSearch: {
		owner: "src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates combined clamped interface selection, search jump, activity result, and newest-result notice",
	},
	openSelectedInterfaceConfirmationEvidenceExport: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates combined interface selection, active-or-archive master index, open eligibility, plan, activity result, and exact notice",
	},
	openSelectedStatusActivityResultTimelineJump: {
		owner: "src/tui/statusActivityQueue.ts + src/tui/timelinePanel.ts",
		reason:
			"delegates status-activity handoff guard, replay intent, Timeline state, activity result, and newest-result notice",
	},
	refreshCleanupExportIndex: {
		owner: "src/tui/cleanupIndex.ts",
		reason:
			"delegates sequenced cleanup export refresh publication and selection repair",
	},
	refreshCleanupExportArchiveIndex: {
		owner: "src/tui/cleanupIndex.ts",
		reason:
			"delegates sequenced cleanup archive refresh publication and selection repair",
	},
	refreshToolExportIndex: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"delegates sequenced Tools export refresh publication and filtered selection repair",
	},
	refreshToolExportArchiveIndex: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"delegates sequenced Tools archive refresh publication and filtered selection repair",
	},
	submitCleanupExportArchiveCommand: {
		owner: "src/tui/cleanupIndex.ts",
		reason: "delegates exact cleanup archive confirmation and execution plan",
	},
	submitToolExportArchiveCommand: {
		owner: "src/tui/toolHistory.ts",
		reason:
			"delegates exact Tools export archive confirmation and execution plan",
	},
	submitAuditExportArchiveCommand: {
		owner: "src/tui/statusEvidence.ts",
		reason:
			"delegates exact audit export archive confirmation and execution plan",
	},
	submitAuditArchiveRetentionCommand: {
		owner: "src/tui/statusEvidence.ts",
		reason: "delegates exact audit retention confirmation and execution plan",
	},
	submitToolArchiveRetentionCommand: {
		owner: "src/tui/toolHistory.ts + src/tui/statusEvidence.ts",
		reason:
			"delegates exact Tools retention confirmation, execution plan, mutation ownership, and failure publication",
	},
	submitDnsServerProposalCommand: {
		owner: "src/tui/dnsPanel.ts",
		reason:
			"delegates DNS target resolution, locked proposal intent, confirmation eligibility, and notice",
	},
	openInterfaceStateProposal: {
		owner: "src/tui/interfacePanel.ts",
		reason:
			"delegates selected interface resolution, locked state-proposal eligibility, and notice",
	},
	submitInterfaceConfirmationCommand: {
		owner: "src/tui/interfacePanel.ts",
		reason:
			"delegates interface confirmation eligibility, exact audit result, and notice",
	},
	cancelOperationRun: {
		owner: "src/tui/operationRunPanel.ts",
		reason:
			"delegates active-token cancellation eligibility, cancelling progress, and exact notice",
	},
	runSelectedOperationPreset: {
		owner: "src/tui/operationRunPanel.ts + src/tui/statusActivityQueue.ts",
		reason:
			"delegates selected preset eligibility, run-token progress and terminal publication, cancellation ownership, stale failure history, and exact audit/status results while App retains collector I/O",
	},
	applyEndpointIoEffect: {
		owner: "src/tui/processPanel.ts + src/tui/endpointPanel.ts",
		reason:
			"applies complete endpoint persistence and inspection intents with atomic sequenced publication while App retains config and collector I/O",
	},
	openSelectedProcessFile: {
		owner: "src/tui/processPanel.ts + src/tui/fileWorkspaceTransitions.ts",
		reason:
			"delegates selected process resource resolution, open eligibility, and exact notice while App retains provider I/O",
	},
} as const;

const commandInputDelegatedCallbacks = {
	recordStatusActivityResult: {
		owner: "src/tui/statusActivityQueue.ts",
		reason:
			"delegates bounded status-result history append and selection reset publication",
	},
	submitRouteDestinationCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates route destination normalization, cancellation guard, and exact notice",
	},
	runToolPlan: {
		owner: "src/tui/toolHistory.ts + src/tui/navigation.ts",
		reason:
			"delegates history append and newest-result selection while App retains tool I/O",
	},
	submitToolCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates typed tool prompt resolution, run-plan guard, and exact notice",
	},
	submitEditorSaveConfirmationCommand: {
		owner: "src/tui/appOwners.ts + src/tui/editorBuffer.ts",
		reason:
			"delegates editor presence and exact-confirm guards while App retains provider I/O",
	},
	submitToolHistoryFilterCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates normalized filter, selected result, preset intent, and exact notice",
	},
	submitToolHistoryCleanupCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates exact cleanup confirmation, bounded preset result, and notice",
	},
	submitClipboardCommand: {
		owner: "src/tui/clipboardDialog.ts",
		reason: "delegates exact clipboard confirmation and terminal dialog state",
	},
	openClipboardConfirmation: {
		owner: "src/tui/appOwners.ts + src/tui/clipboardDialog.ts",
		reason:
			"delegates clipboard preview eligibility, dialog state, and exact notice",
	},
	openSelectedUpdateHandoffClipboard: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates selected update-link resolution and clipboard handoff intent",
	},
	openSelectedUpdateHandoffExternal: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates selected update-link resolution and external-open intent",
	},
	submitExternalOpenCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates missing-plan guard and confirmation plan construction while App retains I/O",
	},
	submitFileOpenCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates missing-plan guard and confirmation plan construction while App retains I/O",
	},
	cycleToolEvidenceFilter: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates evidence target, filter, selection reset, and exact notice",
	},
	openToolEvidenceSearchPrompt: {
		owner: "src/tui/appOwners.ts",
		reason: "delegates evidence target, prompt focus effects, and exact notice",
	},
	submitToolEvidenceSearchCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates query normalization, visible count, selection reset, and audit result",
	},
	cycleInterfaceEvidenceStateFilter: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates interface evidence filter, visible count, focus effects, and audit result",
	},
	openInterfaceEvidenceSearchPrompt: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates interface search prompt value, focus effects, and exact notice",
	},
	submitInterfaceEvidenceSearchCommand: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates interface query, visible count, selection reset, and audit result",
	},
	saveCurrentInterfaceEvidenceSearchPreset: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates empty-query guard, bounded preset save, and exact notice",
	},
	cycleInterfaceEvidenceSearchPreset: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates preset selection, visible count, focus effects, and audit result",
	},
	exportRouteHandoff: {
		owner: "src/tui/routePanel.ts",
		reason:
			"delegates route snapshot guard and handoff plan while App retains file I/O",
	},
	openRouteHandoff: {
		owner: "src/tui/routePanel.ts",
		reason:
			"delegates route snapshot guard and handoff plan while App retains file I/O",
	},
	exportEndpointHandoff: {
		owner: "src/tui/endpointPanel.ts",
		reason:
			"delegates scoped snapshot resolution and handoff plan while App retains file I/O",
	},
	openEndpointHandoff: {
		owner: "src/tui/endpointPanel.ts",
		reason:
			"delegates scoped snapshot resolution and handoff plan while App retains file I/O",
	},
	cycleStatusActivityResultHistoryFilter: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates result filter, selected history index, palette effects, and notice",
	},
	cycleStatusActivityResultTimelineJumpFilter: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates timeline-jump filter, selected index, palette effects, and notice",
	},
	getSelectedTimelineEvidenceTrailResultOptions: {
		owner: "src/tui/appOwners.ts",
		reason: "delegates recovered evidence selection repair",
	},
	cycleTimelineEvidenceTrailSourceFilter: {
		owner: "src/tui/statusActivityQueue.ts",
		reason: "delegates trail source filter, selection repair, and exact notice",
	},
	getSelectedProcessControlEvidenceResultOptions: {
		owner: "src/tui/appOwners.ts",
		reason: "delegates recovered process evidence selection repair",
	},
	getSelectedInterfaceConfirmationEvidenceResultOptions: {
		owner: "src/tui/appOwners.ts",
		reason: "delegates recovered interface evidence selection repair",
	},
	selectNextStatusActivityResultTimelineJump: {
		owner: "src/tui/appOwners.ts",
		reason:
			"delegates empty-history guard, filtered selection, palette effects, and notice",
	},
	openCleanupHandoffPrompt: {
		owner: "src/tui/appOwners.ts + src/tui/cleanupIndex.ts",
		reason:
			"delegates active cleanup plan guard, prompt ownership, and exact notice",
	},
	dismissCleanupHandoff: {
		owner: "src/tui/appOwners.ts + src/tui/cleanupIndex.ts",
		reason: "delegates active cleanup dismissal guard and exact notice",
	},
	exportCleanupHandoffHistory: {
		owner: "src/tui/appOwners.ts + src/tui/cleanupIndex.ts",
		reason:
			"delegates selected cleanup export guard and plan while App retains file I/O",
	},
	useInput: {
		owner:
			"src/tui/appInputDispatcher.ts + src/tui/commandLine.ts + src/tui/commandCancellation.ts + src/tui/fileWorkspaceTransitions.ts + src/tui/processPanel.ts + src/tui/configPanel.ts",
		reason:
			"delegates modal precedence, screen/focus routing, key ownership, prompt routing, selection movement, and notices; App normalizes Ink keys and applies typed state or I/O effects",
	},
} as const;

const commandInputDelegatedNames = new Set(
	Object.keys(commandInputDelegatedCallbacks),
);

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

const evidenceLifecycleDelegatedCallbacks = new Set([
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
	"openSelectedCleanupExportArchive",
	"archiveSelectedHandoffFile",
	"exportToolHistory",
	"selectNextTimelineEvidenceTrailExport",
	"jumpSelectedTimelineEvidenceTrailSearch",
	"openSelectedTimelineEvidenceTrailExport",
	"selectNextProcessControlEvidenceExport",
	"jumpSelectedProcessControlEvidenceSearch",
	"openSelectedProcessControlEvidenceExport",
	"selectNextRemoteKnownHostsSelectionEvidenceExport",
	"jumpSelectedRemoteKnownHostsSelectionEvidenceSearch",
	"openSelectedRemoteKnownHostsSelectionEvidenceExport",
	"selectNextInterfaceConfirmationEvidenceExport",
	"jumpSelectedInterfaceConfirmationEvidenceSearch",
	"openSelectedInterfaceConfirmationEvidenceExport",
	"openSelectedStatusActivityResultTimelineJump",
	"refreshCleanupExportIndex",
	"refreshCleanupExportArchiveIndex",
	"refreshToolExportIndex",
	"refreshToolExportArchiveIndex",
	"submitCleanupExportArchiveCommand",
	"submitToolExportArchiveCommand",
	"submitAuditExportArchiveCommand",
	"submitAuditArchiveRetentionCommand",
	"submitToolArchiveRetentionCommand",
]);

const networkPanelDelegatedCallbacks = new Set([
	"exportInterfaceSourceHandoff",
	"openInterfaceSourceHandoff",
	"submitRouteFilterCommand",
	"submitRouteFilterCleanupCommand",
	"submitEndpointFilterCommand",
	"submitEndpointFilterCleanupCommand",
	"submitTimelineSearchCommand",
	"submitTimelineSearchCleanupCommand",
	"submitLogSearchCommand",
	"submitLogsCleanupCommand",
	"submitDnsServerProposalCommand",
	"openInterfaceStateProposal",
	"submitInterfaceConfirmationCommand",
]);

const remotePanelDelegatedCallbacks = new Set([
	"disconnectRemoteFiles",
	"selectRemoteProfile",
	"submitRemoteProfileCommand",
	"submitRemoteConnectCommand",
	"cancelPendingRemoteConnect",
	"submitRemoteHostKeyEvidenceInputCommand",
	"submitRemoteKnownHostsCandidateCommand",
	"submitRemoteKnownHostsPasteReviewCommand",
	"moveRemoteKnownHostsPasteReviewSelectionCommand",
	"selectRemoteKnownHostsPasteReviewCandidateCommand",
	"submitRemoteKnownHostsPasteSelectionCommand",
	"submitRemoteHostTrustReviewCommand",
	"getSelectedRemoteKnownHostsSelectionEvidenceResultOptions",
	"openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff",
	"exportSelectedRemoteKnownHostsSelectionEvidenceHandoff",
	"selectNextRemoteKnownHostsEvidenceHandoff",
	"openSelectedRemoteKnownHostsEvidenceHandoff",
]);

const operationRunDelegatedCallbacks = new Set([
	"cancelOperationRun",
	"runSelectedOperationPreset",
	"applyEndpointIoEffect",
	"openSelectedProcessFile",
]);

const actionControlDelegatedCallbacks = new Set([
	"submitPortProcessControlCommand",
	"openPalettePortProcessControlPreview",
	"submitControlConfirmationCommand",
	"runControlExecutionAttempt",
	"runAction",
]);

export const tuiCallbackManifest: TuiCallbackManifestRow[] = callbackNames.map(
	(name) => {
		const reason = wiringReasons[name as keyof typeof wiringReasons];
		const delegated =
			delegatedCallbacks[name as keyof typeof delegatedCallbacks] ??
			commandInputDelegatedCallbacks[
				name as keyof typeof commandInputDelegatedCallbacks
			];
		if (delegated) {
			return {
				name,
				owner: delegated.owner,
				classification: "delegated",
				slice: commandInputDelegatedNames.has(name)
					? "command-input-transitions"
					: filesDelegatedCallbacks.has(name)
						? "files-transitions"
						: configDelegatedCallbacks.has(name)
							? "config-transitions"
							: statusDelegatedCallbacks.has(name)
								? "status-transitions"
								: evidenceLifecycleDelegatedCallbacks.has(name)
									? "evidence-lifecycle-transitions"
									: networkPanelDelegatedCallbacks.has(name)
										? "network-panel-transitions"
										: remotePanelDelegatedCallbacks.has(name)
											? "remote-panel-transitions"
											: operationRunDelegatedCallbacks.has(name)
												? "operation-run-transitions"
												: actionControlDelegatedCallbacks.has(name)
													? "action-control-transitions"
													: name.startsWith("submitEditor") ||
															name === "undoEditorEdit" ||
															name === "deleteSelectedEditorLine"
														? "editor-transitions"
														: "tool-target-transitions",
				reason: delegated.reason,
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
