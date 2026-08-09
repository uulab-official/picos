import { dirname, join } from "node:path";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getConfigPath,
	readConfig,
	resetConfigWorkspaceValues,
	setConfigEndpointFilterPresets,
	setConfigEndpointSort,
	setConfigInterfaceEvidenceSearchPresets,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
	setConfigRouteFilterPresets,
	setConfigToolHistoryPreferences,
	setConfigToolTargetPresets,
	setConfigValue,
	upsertConfigRemoteProfile,
	writeConfig,
} from "../config/store";
import {
	type ActionControlSimulation,
	type ActionPreviewPlan,
	createActionPreviewPlan,
	formatActionPreviewRows,
	formatActionSimulationRows,
	getActionCatalog,
	getActionSummary,
	type PicosAction,
} from "../core/actions";
import {
	archiveConsoleAuditExport,
	type ConsoleAuditArchiveRetentionPlan,
	type ConsoleAuditExportArchivePlan,
	type ConsoleAuditExportIndex,
	type ConsoleAuditExportPlan,
	createConsoleAuditArchiveRetentionPlan,
	createConsoleAuditExportPlan,
	formatConsoleAuditArchiveRetentionRows,
	formatConsoleAuditExportArchiveRows,
	pruneConsoleAuditArchive,
	readConsoleAuditExportArchiveIndex,
	readConsoleAuditExportIndex,
	readLatestConsoleAuditExport,
	writeConsoleAuditExport,
} from "../core/auditLog";
import {
	type ConnectionSort,
	type ConnectionsResult,
	filterConnections,
	getActiveConnections,
	parseConnectionSort,
	sortConnections,
} from "../core/connections";
import {
	type ControlExecutionPlan,
	type ControlExecutionPolicy,
	defaultControlExecutionPolicy,
	formatControlExecutionAuditMessage,
	formatControlExecutionPolicyRows,
	formatControlExecutionRows,
	getControlExecutionPolicyFromConfig,
	runControlExecutionPlan,
} from "../core/controlExecution";
import { getControlPreviewCommand } from "../core/controlPreview";
import type { DnsServerProposal } from "../core/dnsControl";
import { runDoctorChecks } from "../core/doctor";
import {
	type EditorSaveExecutionResult,
	formatEditorSaveExecutionAuditMessage,
	formatEditorSaveExecutionResultRows,
	runEditorSaveExecutionPlan,
} from "../core/editorSaveExecution";
import {
	formatConnectionSortPreference,
	formatPortSortPreference,
} from "../core/endpointSort";
import {
	type ExternalOpenPlan,
	formatExternalOpenPlanRows,
	runExternalOpenPlan,
} from "../core/externalOpen";
import {
	buildFileOpenPlan,
	type FileOpenPlan,
	formatFileOpenOriginRows,
	formatFileOpenPlanRows,
	runFileOpenPlan,
} from "../core/fileOpen";
import { runFileOperationExecutionPlan } from "../core/fileOperations";
import {
	createLocalFileProvider,
	type FileEntry,
	type FileLocation,
	type FileProvider,
	type FileProviderKind,
	getSystemFileLocations,
	getSystemFileRoot,
	withParentDirectoryEntry,
} from "../core/files";
import {
	createEditorWritePreview,
	formatEditorWritePreviewRows,
} from "../core/fileWritePreview";
import {
	archiveHandoffFile,
	type HandoffIndex,
	readHandoffIndex,
} from "../core/handoffIndex";
import {
	formatInterfaceConfirmationPromptRows,
	type InterfaceConfirmationResult,
	type InterfaceStateProposal,
	type InterfaceStateProposalAction,
} from "../core/interfaceControl";
import { nextInterfaceEvidenceSearchPreset } from "../core/interfaceEvidencePreferences";
import { getNetworkSummary } from "../core/network";
import {
	createOsLogSnapshot,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../core/osLogs";
import {
	filterListeningPorts,
	getListeningPorts,
	type PortSort,
	type PortsResult,
	parsePortSort,
	sortListeningPorts,
} from "../core/ports";
import {
	getProcessDetail,
	getProcessFileSnapshot,
	getProcessFileSnapshotWithSource,
	type ProcessDetail,
	type ProcessFileSnapshot,
} from "../core/processes";
import {
	createRemoteFileContext,
	createRemoteFileRequestPreview,
	createRemoteHostKeyCompareDetail,
	createRemoteHostKeyEvidence,
	createRemoteHostKeyEvidenceInput,
	createRemoteHostKeyEvidenceInputFromSession,
	createRemoteHostKeyTrustDecisionPreview,
	createRemoteKnownHostsCandidatePreviewFromPasteReview,
	createRemoteKnownHostsCandidatePreviewFromSession,
	createRemoteKnownHostsParserPreview,
	createRemoteKnownHostsPasteReviewFromSession,
	createRemoteKnownHostsReadPreview,
	createRemoteKnownHostsReadResult,
	createRemoteKnownHostsSourcePreview,
	createRemoteReadOnlyAdapterContract,
	createRemoteTransportProbe,
	formatRemoteAdapterBoundaryRows,
	formatRemoteConnectPreviewRows,
	formatRemoteFileRequestPreviewRows,
	formatRemoteHandoffBoundaryRows,
	formatRemoteHostKeyCompareDetailRows,
	formatRemoteHostKeyEvidenceInputPromptRows,
	formatRemoteHostKeyEvidenceInputRows,
	formatRemoteHostKeyEvidenceRows,
	formatRemoteHostKeyTrustDecisionPreviewRows,
	formatRemoteHostReviewAuditMessage,
	formatRemoteHostReviewRows,
	formatRemoteKnownHostsCandidatePreviewRows,
	formatRemoteKnownHostsParserPreviewRows,
	formatRemoteKnownHostsPasteReviewRows,
	formatRemoteKnownHostsReadPreviewRows,
	formatRemoteKnownHostsReadResultRows,
	formatRemoteKnownHostsSourcePreviewRows,
	formatRemoteReadOnlyAdapterContractRows,
	formatRemoteTransportProbeRows,
	type RemoteFileContext,
	type RemoteHostKeyEvidenceInputSession,
	type RemoteKnownHostsCandidateSession,
	type RemoteKnownHostsPasteReviewSession,
} from "../core/remotes";
import { getRoadmapItems } from "../core/roadmap";
import {
	type RoutePathResult,
	type RouteSort,
	type RouteTableResult,
	runRoutePath,
	runRouteTable,
} from "../core/routes";
import {
	connectReadOnlySftpFileProvider,
	formatReadOnlySftpConnectionDiagnosticRows,
	isReadOnlySftpConnectionCancelledError,
	ReadOnlySftpConnectionCancelledError,
	type ReadOnlySftpConnectionDiagnostic,
} from "../core/sftp";
import { formatUptime } from "../core/system";
import { createSystemInventory } from "../core/systemInventory";
import {
	collectSystemMonitorSeries,
	formatSystemMonitorRows,
	getSystemMonitorSnapshot,
	type SystemMonitorSnapshot,
} from "../core/systemMonitor";
import { runTool } from "../core/tools";
import type {
	ActiveConnection,
	DoctorCheck,
	Language,
	ListeningPort,
	NetworkSummary,
	PicosConfig,
	SftpRemoteProfile,
	SystemInventory,
} from "../core/types";
import {
	checkForGitHubReleaseUpdate,
	checkForPackageUpdate,
	createUpdateApplyActionPreviewPlan,
	createUpdateApplyPreview,
	createUpdateReleaseHandoff,
	formatStatusReleaseConsoleRows,
	type GitHubReleaseCheckResult,
	type PackageUpdateCheckResult,
} from "../core/updateCheck";
import { VERSION } from "../core/version";
import { createTranslator } from "../i18n/catalog";
import { currentPlatform } from "../utils/platform";
import {
	type ActionControlConfirmation,
	classifyControlExecutionFailure,
	classifyControlExecutionResult,
	prepareActionDispatch,
	prepareControlExecutionTransition,
	prepareControlPolicySync,
} from "./actionControlTransitions";
import {
	classifyActionRunOutcome,
	dispatchStatusActionRun,
	getActionRunEffect,
	getInterfaceProposalInput,
	prepareRawToolHistoryView,
	prepareToolActionPrompt,
	type StatusActionRunHandlers,
} from "./actionRunTransitions";
import {
	type GlobalControlExecutionRequest,
	getAppInputOverlay,
	getConfigWorkspaceCommand,
	getEditorWorkspaceCommand,
	getRemotesFocusCommand,
	getStatusWorkspaceCommand,
	getToolsWorkspaceCommand,
	getWorkspaceInputFamily,
	prepareGlobalHotkeyInput,
	prepareGlobalNavigationInput,
	prepareWorkspaceEnterInput,
} from "./appInputDispatcher";
import {
	prepareCleanupHandoffDismissal,
	prepareCleanupHandoffPrompt,
	prepareClipboardConfirmationOpen,
	prepareEditorPromptOpen,
	prepareInterfaceEvidencePresetCycle,
	prepareInterfaceEvidencePresetSave,
	prepareInterfaceEvidenceSearchPrompt,
	prepareInterfaceEvidenceStateFilterCycle,
	prepareStatusActivityResultHistoryFilterCycle,
	prepareStatusActivityResultTimelineJumpFilterCycle,
	prepareStatusActivityResultTimelineJumpSelection,
	prepareToolEvidenceFilterCycle,
	prepareToolEvidenceSearchPrompt,
	resolveRecoveredEvidenceResultOptions,
} from "./appOwners";
import {
	appendCleanupHandoffHistory,
	archiveCleanupHandoffHistoryExport,
	type CleanupHandoffHistory,
	type CleanupHandoffHistoryExportArchivePlan,
	type CleanupHandoffHistoryExportIndex,
	type CleanupJumpAudit,
	type CleanupShelfIndex,
	classifyCleanupExportIndexRefresh,
	createCleanupHandoffActionPlan,
	createCleanupHandoffDismissPlan,
	createCleanupHandoffHistory,
	createCleanupShelfIndex,
	formatCleanupHandoffActionRows,
	formatCleanupHandoffDismissRows,
	formatCleanupHandoffHistoryExportArchiveRows,
	formatCleanupJumpAuditRows,
	formatCleanupOpsConsoleRows,
	readCleanupHandoffHistoryExportArchiveIndex,
	readCleanupHandoffHistoryExportIndex,
	readLatestCleanupHandoffHistoryExport,
	writeCleanupHandoffHistoryExport,
} from "./cleanupIndex";
import {
	type ClipboardConfirmationState,
	clearClipboardConfirmationState,
	submitClipboardWritePlan,
} from "./clipboardDialog";
import { formatClipboardPreviewRows } from "./clipboardPreview";
import { prepareCommandCancellation } from "./commandCancellation";
import {
	applyToolTargetCommandLineIntent,
	type CommandLineState,
	type CommandPrompt,
	closeCommandLine,
	openCommandLine,
	prepareCommandLineTextInput,
	prepareCommandSubmit,
} from "./commandLine";
import {
	beginCommandStatusCount,
	type CommandStatus,
	endCommandStatusCount,
	resolveCommandStatus,
} from "./commandStatus";
import {
	type CommandSubmitContextTable,
	type CommandSubmitResolvedHandlers,
	type CommandSubmitResolvedTransitionMap,
	dispatchCommandSubmitEffect,
	prepareCommandSubmitEffectFromTable,
} from "./commandSubmitTransitions";
import {
	type ConfigManagedShelfStateEffect,
	type ConfigManagedShelfTarget,
	type ConfigWorkspaceItem,
	type ConfigWorkspaceResetPreview,
	createConfigManagedShelfFileOpenOrigin,
	createConfigManagedShelfJumpTransition,
	createConfigSessionSyncIntent,
	createConfigWorkspaceActionFocusTransition,
	createConfigWorkspaceItems,
	formatConfigManagedShelfCleanupBreadcrumbRows,
	formatConfigManagedShelfHandoffRows,
	formatConfigManagedShelfLandingRows,
	formatConfigManagedShelfPromptBreadcrumbRows,
	formatConfigManagedShelfRows,
	formatConfigWorkspaceDetailRows,
	formatConfigWorkspaceRows,
	getConfigManagedShelfActionFocusTarget,
	getConfigManagedShelfHandoff,
	getConfigRecoveryActionFocusTarget,
	prepareConfigManagedShelfFocusAction,
	prepareConfigManagedShelfLandingDismissal,
	prepareConfigRecoveryDirectPromptTransition,
	type prepareConfigWorkspaceAdjustment,
	prepareConfigWorkspaceInput,
	type prepareConfigWorkspaceResetOpenTransition,
	prepareNextConfigPolicyPresetTransition,
	withConfigManagedShelfFocusRows,
} from "./configPanel";
import { formatDnsPanelWorkspaceRows, prepareDnsPanelInput } from "./dnsPanel";
import {
	classifyEditorSaveBufferPublication,
	type EditorBuffer,
	formatEditorBufferLines,
	getEditorBufferState,
	transitionEditorDeleteLine,
	transitionEditorUndo,
} from "./editorBuffer";
import {
	classifyEndpointProcessInspectionPublication,
	createEndpointFilterCleanupPreview,
	createSelectedPortProcessControlPreview,
	type EndpointDetailView,
	type EndpointHandoffInputSnapshot,
	type EndpointHandoffKind,
	type EndpointProcessRequest,
	formatConnectionsWorkspaceRows,
	formatEndpointWorkspaceHintRow,
	formatPortProcessControlExecutionRows,
	formatPortProcessControlInspectorRows,
	formatPortsWorkspaceRows,
	type PortProcessControlFileEvidenceIssue,
	prepareEndpointHandoffForKind,
	prepareEndpointPanelInput,
	prepareEndpointWorkspaceInputEnvelope,
	preparePortProcessControlPalettePreview,
	repairEndpointSelection,
	writeEndpointHandoffPlan,
} from "./endpointPanel";
import { appendEvent, type ConsoleEvent, createEvent } from "./events";
import { type FileFilterState, filterFileEntries } from "./fileFilter";
import {
	applyFileOperationCommandLineTransition,
	type FileOperationDialogState,
	type FileOperationDialogTransition,
	prepareActiveFileOperationDialogInput,
} from "./fileOperationDialog";
import {
	formatFileBreadcrumbRows,
	formatFileProviderBoundaryRows,
	formatSelectedFilePathRows,
} from "./fileSelection";
import {
	classifyFileLoadOutcome,
	classifyFilePreviewOutcome,
	type FileLoadRequest,
	prepareActiveFileFilterInput,
	type prepareFileHistoryNavigation,
	type prepareFileLocationNavigation,
	prepareFileWorkspaceCommandLineInput,
	prepareFileWorkspaceInput,
	type prepareParentFileNavigation,
	prepareSelectedFileOpen,
	type SelectedFileOpenTransition,
} from "./fileWorkspaceTransitions";
import {
	formatInterfaceWorkspaceRows,
	getInterfaceControlIntent,
	type InterfaceDetailView,
	type InterfacePanelInputDecision,
	prepareInterfacePanelInput,
	resolveSelectedInterface,
	writeInterfaceSourceHandoffPlan,
} from "./interfacePanel";
import {
	createLogCleanupPreview,
	formatLogWorkspaceRows,
	type LogFollowHistoryItem,
	type LogProfile,
	prepareLogPanelInput,
} from "./logPanel";
import {
	clampIndex,
	type FocusArea,
	getScreenIndex,
	getVisibleWindow,
	type Screen,
	screenOrder,
} from "./navigation";
import { createNetworkTimelineEvents } from "./networkTimeline";
import {
	classifyOperationRunContinuation,
	formatOperationsWorkspaceRows,
	type OperationRunProgress,
	type OperationRunTerminalTransition,
	prepareMonitorOperationRunCompletion,
	prepareOperationProcessIdentityNotice,
	type prepareOperationRunCancellation,
	prepareOperationRunCompletion,
	prepareOperationRunFailure,
	prepareOperationRunPanelInput,
	prepareOperationRunProgressPublication,
	type prepareOperationRunStart,
	releaseOperationRunCancellation,
} from "./operationRunPanel";
import {
	type CommandPaletteState,
	formatCommandPaletteActionPreviewRows,
	getFilteredPaletteActions,
	openCommandPalette,
	prepareCommandPaletteInput,
} from "./palette";
import {
	classifyProcessInspectionFailure,
	classifyProcessInspectionPublication,
	formatProcessWorkspaceRows,
	prepareProcessPanelInput,
	type SelectedProcessResourceAction,
} from "./processPanel";
import {
	classifyRemoteConnectionPublication,
	classifyRemoteDisconnectPublication,
	classifyRemoteProfileSavePublication,
	prepareRemoteConnectionCancellation,
	prepareRemoteConnectPrompt,
	prepareRemoteDisconnect,
	prepareRemoteHistoryClipboardInput,
	prepareRemoteHistoryExportInput,
	prepareRemoteKnownHostsEvidenceHandoff,
	prepareRemoteKnownHostsEvidenceHandoffOpen,
	prepareRemoteKnownHostsEvidenceHandoffSelection,
	prepareRemoteKnownHostsPasteSelection,
	prepareRemotePasteNumberInput,
	type prepareRemoteProfileStage,
	prepareRemotePromptInput,
	prepareRemoteRetry,
	resolveRemoteEvidenceResultOptions,
	resolveRemoteProfileSelection,
} from "./remotesPanel";
import {
	beginRequest,
	beginRequestWithPublication,
	classifyRequestPublication,
	isStaleRequest,
} from "./requestSequence";
import {
	classifyRoutePathRequestOutcome,
	createRouteFilterCleanupPreview,
	formatRoutePathRows,
	formatRouteWorkspaceRows,
	prepareRoutePanelInput,
	type RouteDetailView,
	type RoutePanelHandoffEffect,
	writeRouteRawHandoffPlan,
} from "./routePanel";
import { computeShellLayout, formatTopBarLine } from "./shell";
import {
	appendStatusActivityCopyIntentHistory,
	appendStatusActivityResultHistory,
	createInterfaceConfirmationStatusActivityResult,
	createOperationRunStatusActivityResult,
	createRemoteHostReviewStatusActivityResult,
	createStatusActivityProcessControlPaletteResult,
	createStatusActivityResultAuditJumpReplayWarningSummary,
	createStatusActivityResultTimelineSearch,
	createStatusActivityResultTimelineSearchReplay,
	createStatusActivityToolsEvidencePaletteResult,
	createStatusActivityToolsEvidenceSearchRecovery,
	createTimelineEvidenceTrailAuditExportPlan,
	createTimelineEvidenceTrailStatusActivityResult,
	createTimelineSelectedStatusActivityResult,
	filterInterfaceConfirmationAuditExportIndex,
	filterTimelineEvidenceTrailAuditExports,
	formatRemoteActivityShelfRows,
	formatRemoteKnownHostsSelectionHistoryRows,
	formatStatusActivityCopyIntentRows,
	formatStatusActivityDetailRows,
	formatStatusActivityProcessControlPaletteAuditMessage,
	formatStatusActivityQueueRows,
	formatStatusActivityResultCopyPreviewRows,
	formatStatusActivityResultHistoryRows,
	formatStatusActivityResultRows,
	formatStatusActivityResultTimelineJumpRows,
	formatStatusActivityToolsEvidencePaletteAuditMessage,
	getLatestStatusActivityResultAuditJumpIntent,
	getSelectedProcessControlAuditExport,
	getSelectedRemoteKnownHostsSelectionHistoryAuditExport,
	getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff,
	getSelectedStatusActivityResultAuditJumpIntent,
	getSelectedStatusActivityResultHistoryClipboardPreview,
	getStatusActivityCopyIntentAuditExportIndex,
	getStatusActivityResultAuditJumpIntentCount,
	getStatusActivityResultTimelineJumpIndexes,
	getStatusActivityResultTimelineJumpSelection,
	nextStatusActivityResultTimelineJumpFilter,
	prepareRecoveredEvidenceOpenTransition,
	prepareRecoveredEvidenceSearchTransition,
	prepareRecoveredEvidenceSelectionTransition,
	prepareStatusActivityResultTimelineHandoffOpenTransition,
	prepareStatusActivityToolsEvidenceMatchArchive,
	prepareStatusActivityToolsEvidenceMatchOpen,
	prepareTimelineEvidenceTrailSourceFilterTransition,
	type StatusActivityCopyIntentEvidenceFocusPlan,
	type StatusActivityCopyIntentRecord,
	type StatusActivityResult,
	type StatusActivityResultHistoryFilter,
	type StatusActivityResultTimelineJumpFilter,
	type StatusActivitySource,
	type StatusActivityToolsEvidenceSearchRecovery,
	type TimelineEvidenceTrailSourceFilter,
	writeInterfaceConfirmationAuditExport,
	writeRemoteKnownHostsSelectionHistoryAuditExport,
	writeStatusActivityCopyIntentAuditExport,
	writeTimelineEvidenceTrailAuditExport,
} from "./statusActivityQueue";
import {
	formatStatusDialogPreviewRows,
	type StatusDialogPreviewGroup,
} from "./statusDialogPreview";
import {
	classifyAuditArchiveRetentionOutcome,
	classifyAuditExportArchiveIndexRefresh,
	classifyAuditExportArchiveOutcome,
	classifyAuditExportIndexRefresh,
	classifyCleanupExportArchiveOutcome,
	classifyHandoffIndexRefresh,
	classifyToolArchiveRetentionOutcome,
	classifyToolExportArchiveOutcome,
	filterInterfaceConfirmationEvidenceExports,
	formatInterfaceEvidenceFilterRows,
	formatStatusEvidenceCommandStripRows,
	formatStatusEvidenceLegacyBridgeRows,
	formatStatusEvidenceSummaryRows,
	formatStatusEvidenceTableDetailRows,
	formatStatusEvidenceTableRows,
	type InterfaceEvidenceStateFilter,
	nextInterfaceEvidenceStateFilter,
	prepareStatusEvidenceActionTransition,
	type StatusEvidenceKind,
} from "./statusEvidence";
import {
	formatStatusAuditWriteFailure,
	formatStatusAuditWriteSuccess,
	formatStatusCleanupHistoryWriteFailure,
	formatStatusCleanupHistoryWriteSuccess,
	formatStatusConfigWriteFailure,
	formatStatusHandoffArchiveFailure,
	formatStatusHandoffArchiveResult,
	prepareStatusWorkspaceInput,
	type StatusAuditWriteEffect,
	type StatusCleanupHistoryWriteEffect,
	type StatusConfigWriteEffect,
	type StatusDialogPlanKey,
	type StatusHandoffArchiveEffect,
	type StatusIndexRefreshEffect,
	type StatusWorkspaceInputEffect,
	type StatusWorkspaceStatePatch,
} from "./statusInputTransitions";
import {
	createTimelineSearchCleanupPreview,
	filterTimelineEvents,
	formatSelectedTimelinePreviewRow,
	formatTimelineWorkspaceRows,
	prepareTimelinePanelInput,
	repairTimelineSelection,
	type TimelineFilter,
} from "./timelinePanel";
import {
	appendToolHistory,
	archiveToolHistoryExport,
	classifyToolHistoryExportIndexRefresh,
	createToolHistoryArchiveRetentionPlan,
	createToolHistoryCleanupPreview,
	createToolRunPlan,
	createToolTargetCleanupPreview,
	filterToolHistoryExportIndex,
	formatToolHistoryArchiveRetentionRows,
	formatToolHistoryExportArchiveRows,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getNewestToolHistoryIndex,
	getSelectedToolCompareClipboardPreview,
	getSelectedToolHistoryExport,
	getSelectedToolOutputClipboardPreview,
	getSelectedToolSectionClipboardPreview,
	getSelectedToolSectionRowClipboardPreview,
	getSelectedToolSummaryClipboardPreview,
	getSelectedToolTargetPreset,
	getToolTargetPresets,
	getVisibleToolHistoryIndex,
	prepareSelectedToolHistoryExportArchive,
	prepareToolHistoryExportEffect,
	prepareToolsWorkspaceInput,
	pruneToolHistoryExportArchive,
	readToolHistoryExportArchiveIndex,
	readToolHistoryExportIndex,
	saveToolHistoryPreset,
	type ToolCopyPreviewMode,
	type ToolHistoryArchiveRetentionPlan,
	type ToolHistoryDetailView,
	type ToolHistoryEvidenceFilter,
	type ToolHistoryExportArchivePlan,
	type ToolHistoryExportIndex,
	type ToolHistoryGroup,
	type ToolHistoryItem,
	type ToolHistorySort,
	type ToolSectionClipboardSelection,
	type ToolsWorkspaceInputEffect,
	type ToolTargetPreset,
	writeToolHistoryExport,
} from "./toolHistory";

const toolPromptPrefix = "tool:";
const endpointFilterPromptPrefix = "endpoint-filter:";
const endpointFilterCleanupPromptPrefix = "endpoint-filter-cleanup:";
const portProcessControlPrompt = "port-process-control";

type CommandTransition<
	Effect extends keyof CommandSubmitResolvedTransitionMap,
> = CommandSubmitResolvedTransitionMap[Effect];

type EndpointInputIoEffect =
	| {
			kind: "endpoint-filter-presets";
			scope: EndpointHandoffKind;
			presets: string[];
	  }
	| {
			kind: "endpoint-sort";
			scope: EndpointHandoffKind;
			sort: ConnectionSort | PortSort;
	  }
	| {
			kind: "inspect-process";
			plan: { scope: EndpointHandoffKind; request: EndpointProcessRequest };
	  }
	| { kind: "load-port-file-evidence"; pid: string };

function createActiveFileOpenOrigin(
	target: ConfigManagedShelfTarget | undefined,
) {
	return target ? createConfigManagedShelfFileOpenOrigin(target) : undefined;
}

function appendLogFollowHistory(
	history: LogFollowHistoryItem[],
	item: Omit<LogFollowHistoryItem, "label">,
): LogFollowHistoryItem[] {
	return [
		...history,
		{
			...item,
			label: new Date().toLocaleTimeString("en-GB", { hour12: false }),
		},
	].slice(-6);
}

type ConfigManagedShelfStateEffectSetters = {
	setScreen: (value: Screen) => void;
	setFocusArea: (value: FocusArea) => void;
	setConfigShelfLandingTarget: (value: ConfigManagedShelfTarget) => void;
	setCommandLine: (value: CommandLineState) => void;
	setSelectedInterfaceIndex: (value: number) => void;
	setRouteDetailView: (value: "table") => void;
	setRouteCopyPreview: (value: false) => void;
	setRouteFilter: (value: string) => void;
	setConnectionCopyPreview: (value: false) => void;
	setConnectionFilter: (value: string) => void;
	setSelectedConnectionIndex: (value: number) => void;
	setPortCopyPreview: (value: false) => void;
	setPortProcessControlPreview: (value: false) => void;
	setPortFilter: (value: string) => void;
	setSelectedPortIndex: (value: number) => void;
	setSelectedToolTargetPresetIndex: (value: number) => void;
	setToolHistoryDetailView: (value: "summary") => void;
	setToolCopyPreview: (value: false) => void;
	setLogLevelFilter: (value: LogProfile["level"]) => void;
	setLogSearchQuery: (value: string) => void;
	setSelectedRemoteIndex: (value: number) => void;
};

function applyConfigManagedShelfStateEffects(
	effects: ConfigManagedShelfStateEffect[],
	setters: ConfigManagedShelfStateEffectSetters,
): void {
	for (const effect of effects) {
		switch (effect.kind) {
			case "screen":
				setters.setScreen(effect.screen);
				break;
			case "focus-area":
				setters.setFocusArea(effect.focusArea);
				break;
			case "shelf-landing":
				setters.setConfigShelfLandingTarget(effect.target);
				break;
			case "command-line":
				setters.setCommandLine(openCommandLine(effect.prompt));
				break;
			case "interface-selection":
				setters.setSelectedInterfaceIndex(effect.index);
				break;
			case "route-detail-view":
				setters.setRouteDetailView(effect.view);
				break;
			case "route-copy-preview":
				setters.setRouteCopyPreview(effect.value);
				break;
			case "route-filter":
				setters.setRouteFilter(effect.value);
				break;
			case "connection-copy-preview":
				setters.setConnectionCopyPreview(effect.value);
				break;
			case "connection-filter":
				setters.setConnectionFilter(effect.value);
				break;
			case "connection-selection":
				setters.setSelectedConnectionIndex(effect.index);
				break;
			case "port-copy-preview":
				setters.setPortCopyPreview(effect.value);
				break;
			case "port-process-preview":
				setters.setPortProcessControlPreview(effect.value);
				break;
			case "port-filter":
				setters.setPortFilter(effect.value);
				break;
			case "port-selection":
				setters.setSelectedPortIndex(effect.index);
				break;
			case "tool-target-selection":
				setters.setSelectedToolTargetPresetIndex(effect.index);
				break;
			case "tool-detail-view":
				setters.setToolHistoryDetailView(effect.view);
				break;
			case "tool-copy-preview":
				setters.setToolCopyPreview(effect.value);
				break;
			case "log-level":
				setters.setLogLevelFilter(effect.value);
				break;
			case "log-query":
				setters.setLogSearchQuery(effect.value);
				break;
			case "remote-selection":
				setters.setSelectedRemoteIndex(effect.index);
				break;
		}
	}
}

export function App(): React.ReactElement {
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const layout = computeShellLayout(columns, rows);
	const actions = useMemo(() => getActionCatalog(), []);
	const actionControlSequenceRef = useRef(0);
	const systemFileRoot = useMemo(() => getSystemFileRoot(), []);
	const fileLocations = useMemo(() => getSystemFileLocations(), []);
	const [editorSaveMode, setEditorSaveMode] =
		useState<PicosConfig["editorSaveMode"]>("disabled");
	const localFileProvider = useMemo(
		() =>
			createLocalFileProvider(systemFileRoot, {
				allowWrites: editorSaveMode === "local-write",
			}),
		[editorSaveMode, systemFileRoot],
	);
	const [remoteFileProvider, setRemoteFileProvider] = useState<FileProvider>();
	const remoteFileProviderRef = useRef<FileProvider | undefined>(undefined);
	const [remoteConnectionDiagnostic, setRemoteConnectionDiagnostic] =
		useState<ReadOnlySftpConnectionDiagnostic>();
	const remoteConnectionDiagnosticRef = useRef<
		ReadOnlySftpConnectionDiagnostic | undefined
	>(undefined);
	// Every writer of the visible remote diagnostic shares this sequence. The
	// connection run token is separate: it identifies the one long-running
	// transport attempt that is allowed to publish onto that diagnostic group.
	const remoteConnectionDiagnosticSequenceRef = useRef(0);
	const remoteConnectionRunTokenRef = useRef(0);
	const remoteProfileSaveTokenRef = useRef(0);
	const activeRemoteConnectionRunTokenRef = useRef<number | undefined>(
		undefined,
	);
	const pendingRemoteConnectRef = useRef<AbortController | undefined>(
		undefined,
	);
	const pendingRemoteFileProviderRef = useRef<FileProvider | undefined>(
		undefined,
	);
	const fileProvider = remoteFileProvider ?? localFileProvider;
	const activeFileProviderRef = useRef(fileProvider);
	const fileProviderGenerationRef = useRef(0);
	const activeFileProviderGenerationRef = useRef(0);
	useEffect(() => {
		remoteFileProviderRef.current = remoteFileProvider;
	}, [remoteFileProvider]);
	useEffect(
		() => () => {
			pendingRemoteConnectRef.current?.abort();
			void pendingRemoteFileProviderRef.current
				?.close?.()
				.catch(() => undefined);
			void remoteFileProviderRef.current?.close?.().catch(() => undefined);
		},
		[],
	);
	const [screen, setScreen] = useState<Screen>("dashboard");
	const [focusArea, setFocusArea] = useState<FocusArea>("workspaces");
	const [summary, setSummary] = useState<NetworkSummary>();
	const summaryRef = useRef<NetworkSummary | undefined>(undefined);
	const [defaultPingHost, setDefaultPingHost] = useState("google.com");
	const [inventory, setInventory] = useState<SystemInventory>();
	const [systemMonitor, setSystemMonitor] = useState<SystemMonitorSnapshot>();
	const [osLogs, setOsLogs] = useState<OsLogSnapshot>();
	const [doctorChecks, setDoctorChecks] = useState<DoctorCheck[]>([]);
	const [selectedActionIndex, setSelectedActionIndex] = useState(0);
	const [actionPreviewPlan, setActionPreviewPlan] =
		useState<ActionPreviewPlan>();
	const [actionConfirmation, setActionConfirmation] =
		useState<ActionControlConfirmation>();
	const [actionSimulation, setActionSimulation] =
		useState<ActionControlSimulation>();
	const [actionExecutionPlan, setActionExecutionPlan] =
		useState<ControlExecutionPlan>();
	const [controlExecutionPolicy, setControlExecutionPolicy] =
		useState<ControlExecutionPolicy>(defaultControlExecutionPolicy);
	const [dnsServerProposal, setDnsServerProposal] =
		useState<DnsServerProposal>();
	const [updateCheckResult, setUpdateCheckResult] =
		useState<PackageUpdateCheckResult>();
	const [githubReleaseCheckResult, setGitHubReleaseCheckResult] =
		useState<GitHubReleaseCheckResult>();
	const [selectedUpdateHandoffIndex, setSelectedUpdateHandoffIndex] =
		useState(0);
	const [selectedCleanupShelfIndex, setSelectedCleanupShelfIndex] = useState(0);
	const [cleanupJumpAudit, setCleanupJumpAudit] = useState<CleanupJumpAudit>();
	const [cleanupHandoffHistory, setCleanupHandoffHistory] = useState<
		CleanupHandoffHistory[]
	>([]);
	const [
		selectedCleanupHandoffHistoryIndex,
		setSelectedCleanupHandoffHistoryIndex,
	] = useState(0);
	const [cleanupExportIndex, setCleanupExportIndex] =
		useState<CleanupHandoffHistoryExportIndex>({
			baseDir: dirname(getConfigPath()),
			items: [],
		});
	const [selectedCleanupExportIndex, setSelectedCleanupExportIndex] =
		useState(0);
	const [cleanupExportArchiveIndex, setCleanupExportArchiveIndex] =
		useState<CleanupHandoffHistoryExportIndex>({
			baseDir: dirname(getConfigPath()),
			items: [],
		});
	const [
		selectedCleanupExportArchiveIndex,
		setSelectedCleanupExportArchiveIndex,
	] = useState(0);
	const [cleanupExportArchivePlan, setCleanupExportArchivePlan] =
		useState<CleanupHandoffHistoryExportArchivePlan>();
	const [toolExportArchivePlan, setToolExportArchivePlan] =
		useState<ToolHistoryExportArchivePlan>();
	const [toolArchiveRetentionPlan, setToolArchiveRetentionPlan] =
		useState<ToolHistoryArchiveRetentionPlan>();
	const [handoffIndex, setHandoffIndex] = useState<HandoffIndex>({
		baseDir: dirname(getConfigPath()),
		items: [],
	});
	const [selectedHandoffIndex, setSelectedHandoffIndex] = useState(0);
	const [auditExportIndex, setAuditExportIndex] =
		useState<ConsoleAuditExportIndex>({
			baseDir: dirname(getConfigPath()),
			items: [],
		});
	const [selectedAuditExportIndex, setSelectedAuditExportIndex] = useState(0);
	const [auditExportArchiveIndex, setAuditExportArchiveIndex] =
		useState<ConsoleAuditExportIndex>({
			baseDir: dirname(getConfigPath()),
			items: [],
		});
	const [selectedAuditExportArchiveIndex, setSelectedAuditExportArchiveIndex] =
		useState(0);
	const [auditExportArchivePlan, setAuditExportArchivePlan] =
		useState<ConsoleAuditExportArchivePlan>();
	const [auditExportArchiveScope, setAuditExportArchiveScope] = useState<
		"all" | "interface"
	>("all");
	const [auditArchiveRetentionPlan, setAuditArchiveRetentionPlan] =
		useState<ConsoleAuditArchiveRetentionPlan>();
	const [auditArchiveRetentionScope, setAuditArchiveRetentionScope] = useState<
		"all" | "interface"
	>("all");
	const [toolExportIndex, setToolExportIndex] =
		useState<ToolHistoryExportIndex>({
			baseDir: join(dirname(getConfigPath()), "tools"),
			items: [],
		});
	const [selectedToolExportIndex, setSelectedToolExportIndex] = useState(0);
	const [toolExportFilter, setToolExportFilter] =
		useState<ToolHistoryEvidenceFilter>("any");
	const [toolExportQuery, setToolExportQuery] = useState("");
	const [toolEvidenceSearchScope, setToolEvidenceSearchScope] = useState<
		"tools" | "tools-archive"
	>("tools");
	const [toolExportArchiveIndex, setToolExportArchiveIndex] =
		useState<ToolHistoryExportIndex>({
			baseDir: join(dirname(getConfigPath()), "tools", "archive"),
			items: [],
		});
	const [selectedToolExportArchiveIndex, setSelectedToolExportArchiveIndex] =
		useState(0);
	const [toolExportArchiveFilter, setToolExportArchiveFilter] =
		useState<ToolHistoryEvidenceFilter>("any");
	const [toolExportArchiveQuery, setToolExportArchiveQuery] = useState("");
	const [externalOpenPlan, setExternalOpenPlan] = useState<ExternalOpenPlan>();
	const [fileOpenPlan, setFileOpenPlan] = useState<FileOpenPlan>();
	const [selectedStatusActivitySource, setSelectedStatusActivitySource] =
		useState<StatusActivitySource>("release");
	const [statusActivityResults, setStatusActivityResults] = useState<
		StatusActivityResult[]
	>([]);
	const [
		selectedStatusActivityResultIndex,
		setSelectedStatusActivityResultIndex,
	] = useState(0);
	const [
		statusActivityResultHistoryFilter,
		setStatusActivityResultHistoryFilter,
	] = useState<StatusActivityResultHistoryFilter>("all");
	const [
		statusActivityResultTimelineJumpFilter,
		setStatusActivityResultTimelineJumpFilter,
	] = useState<StatusActivityResultTimelineJumpFilter>("all");
	const [
		selectedStatusActivityCopyPreviewRowIndex,
		setSelectedStatusActivityCopyPreviewRowIndex,
	] = useState(0);
	const [
		statusActivityCopyPreviewExpanded,
		setStatusActivityCopyPreviewExpanded,
	] = useState(false);
	const [statusActivityCopyIntentHistory, setStatusActivityCopyIntentHistory] =
		useState<StatusActivityCopyIntentRecord[]>([]);
	const [
		selectedStatusActivityCopyIntentIndex,
		setSelectedStatusActivityCopyIntentIndex,
	] = useState(0);
	const [
		selectedStatusActivityResultAuditJumpIndex,
		setSelectedStatusActivityResultAuditJumpIndex,
	] = useState(0);
	const [
		selectedStatusActivityToolsEvidenceSearchMatchIndex,
		setSelectedStatusActivityToolsEvidenceSearchMatchIndex,
	] = useState(0);
	const [
		lastStatusActivityCopyIntentAuditExport,
		setLastStatusActivityCopyIntentAuditExport,
	] = useState<ConsoleAuditExportPlan>();
	const [
		lastTimelineEvidenceTrailAuditExport,
		setLastTimelineEvidenceTrailAuditExport,
	] = useState<ConsoleAuditExportPlan>();
	const [
		timelineEvidenceTrailAuditExports,
		setTimelineEvidenceTrailAuditExports,
	] = useState<ConsoleAuditExportPlan[]>([]);
	const [
		selectedTimelineEvidenceTrailAuditExportIndex,
		setSelectedTimelineEvidenceTrailAuditExportIndex,
	] = useState(0);
	const [
		timelineEvidenceTrailSourceFilter,
		setTimelineEvidenceTrailSourceFilter,
	] = useState<TimelineEvidenceTrailSourceFilter>("all");
	const [processControlAuditExports, setProcessControlAuditExports] = useState<
		ConsoleAuditExportPlan[]
	>([]);
	const [
		selectedProcessControlAuditExportIndex,
		setSelectedProcessControlAuditExportIndex,
	] = useState(0);
	const [
		remoteKnownHostsSelectionAuditExports,
		setRemoteKnownHostsSelectionAuditExports,
	] = useState<ConsoleAuditExportPlan[]>([]);
	const [
		selectedRemoteKnownHostsSelectionAuditExportIndex,
		setSelectedRemoteKnownHostsSelectionAuditExportIndex,
	] = useState(0);
	const selectedRemoteKnownHostsSelectionAuditExport =
		getSelectedRemoteKnownHostsSelectionHistoryAuditExport(
			remoteKnownHostsSelectionAuditExports,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		);
	const [
		interfaceConfirmationAuditExports,
		setInterfaceConfirmationAuditExports,
	] = useState<ConsoleAuditExportPlan[]>([]);
	const [
		interfaceConfirmationAuditArchiveExports,
		setInterfaceConfirmationAuditArchiveExports,
	] = useState<ConsoleAuditExportPlan[]>([]);
	const [
		selectedInterfaceConfirmationAuditExportIndex,
		setSelectedInterfaceConfirmationAuditExportIndex,
	] = useState(0);
	const [interfaceEvidenceStateFilter, setInterfaceEvidenceStateFilter] =
		useState<InterfaceEvidenceStateFilter>("all");
	const [interfaceEvidenceQuery, setInterfaceEvidenceQuery] = useState("");
	const [interfaceEvidenceSearchPresets, setInterfaceEvidenceSearchPresets] =
		useState<string[]>([]);
	const [operationPresets, setOperationPresets] = useState<
		PicosConfig["operationPresets"]
	>([]);
	const [selectedOperationPresetIndex, setSelectedOperationPresetIndex] =
		useState(0);
	const [operationRun, setOperationRun] = useState<OperationRunProgress>();
	// Evidence families publish independent index/state groups, so each family owns
	// a separate request lane. The active audit lane is shared by every recovered
	// audit-derived family because those selections must publish atomically.
	const handoffIndexRequestTokenRef = useRef(0);
	const auditExportIndexRequestTokenRef = useRef(0);
	const auditExportArchiveIndexRequestTokenRef = useRef(0);
	const cleanupExportIndexRequestTokenRef = useRef(0);
	const cleanupExportArchiveIndexRequestTokenRef = useRef(0);
	const toolExportIndexRequestTokenRef = useRef(0);
	const toolExportArchiveIndexRequestTokenRef = useRef(0);
	// Every evidence mutation shares this publication lane because archive and
	// retention callbacks can overlap while targeting the same current selection.
	const evidenceArchiveMutationTokenRef = useRef(0);
	const selectedHandoffIndexRef = useRef(selectedHandoffIndex);
	selectedHandoffIndexRef.current = selectedHandoffIndex;
	const selectedAuditExportIndexRef = useRef(selectedAuditExportIndex);
	selectedAuditExportIndexRef.current = selectedAuditExportIndex;
	const selectedAuditExportArchiveIndexRef = useRef(
		selectedAuditExportArchiveIndex,
	);
	selectedAuditExportArchiveIndexRef.current = selectedAuditExportArchiveIndex;
	const selectedCleanupExportIndexRef = useRef(selectedCleanupExportIndex);
	selectedCleanupExportIndexRef.current = selectedCleanupExportIndex;
	const selectedCleanupExportArchiveIndexRef = useRef(
		selectedCleanupExportArchiveIndex,
	);
	selectedCleanupExportArchiveIndexRef.current =
		selectedCleanupExportArchiveIndex;
	const selectedToolExportIndexRef = useRef(selectedToolExportIndex);
	selectedToolExportIndexRef.current = selectedToolExportIndex;
	const selectedToolExportArchiveIndexRef = useRef(
		selectedToolExportArchiveIndex,
	);
	selectedToolExportArchiveIndexRef.current = selectedToolExportArchiveIndex;
	const selectedTimelineEvidenceTrailAuditExportIndexRef = useRef(
		selectedTimelineEvidenceTrailAuditExportIndex,
	);
	selectedTimelineEvidenceTrailAuditExportIndexRef.current =
		selectedTimelineEvidenceTrailAuditExportIndex;
	const selectedProcessControlAuditExportIndexRef = useRef(
		selectedProcessControlAuditExportIndex,
	);
	selectedProcessControlAuditExportIndexRef.current =
		selectedProcessControlAuditExportIndex;
	const selectedRemoteKnownHostsSelectionAuditExportIndexRef = useRef(
		selectedRemoteKnownHostsSelectionAuditExportIndex,
	);
	selectedRemoteKnownHostsSelectionAuditExportIndexRef.current =
		selectedRemoteKnownHostsSelectionAuditExportIndex;
	const selectedInterfaceConfirmationAuditExportIndexRef = useRef(
		selectedInterfaceConfirmationAuditExportIndex,
	);
	selectedInterfaceConfirmationAuditExportIndexRef.current =
		selectedInterfaceConfirmationAuditExportIndex;
	const interfaceConfirmationAuditExportsRef = useRef(
		interfaceConfirmationAuditExports,
	);
	interfaceConfirmationAuditExportsRef.current =
		interfaceConfirmationAuditExports;
	const interfaceConfirmationAuditArchiveExportsRef = useRef(
		interfaceConfirmationAuditArchiveExports,
	);
	interfaceConfirmationAuditArchiveExportsRef.current =
		interfaceConfirmationAuditArchiveExports;
	const timelineEvidenceTrailSourceFilterRef = useRef(
		timelineEvidenceTrailSourceFilter,
	);
	timelineEvidenceTrailSourceFilterRef.current =
		timelineEvidenceTrailSourceFilter;
	const toolExportFilterRef = useRef(toolExportFilter);
	toolExportFilterRef.current = toolExportFilter;
	const toolExportQueryRef = useRef(toolExportQuery);
	toolExportQueryRef.current = toolExportQuery;
	const toolExportArchiveFilterRef = useRef(toolExportArchiveFilter);
	toolExportArchiveFilterRef.current = toolExportArchiveFilter;
	const toolExportArchiveQueryRef = useRef(toolExportArchiveQuery);
	toolExportArchiveQueryRef.current = toolExportArchiveQuery;
	const interfaceEvidenceStateFilterRef = useRef(interfaceEvidenceStateFilter);
	interfaceEvidenceStateFilterRef.current = interfaceEvidenceStateFilter;
	const interfaceEvidenceQueryRef = useRef(interfaceEvidenceQuery);
	interfaceEvidenceQueryRef.current = interfaceEvidenceQuery;
	// Mirrored into a ref so the sampling loop can read the latest run without
	// re-subscribing, the same way the SFTP connect flow tracks its diagnostic.
	// Shared by both callbacks that write process detail and file snapshot state, so
	// the newest request is the only one allowed to publish regardless of which one
	// issued it.
	const processInspectionTokenRef = useRef(0);
	// Separate from the inspection sequence on purpose: a slow inspection must not
	// discard a fresh refresh, or the reverse.
	const refreshTokenRef = useRef(0);
	// Listings and previews publish different state groups. A slow directory load
	// must not discard a newer preview, and a slow preview must not discard a newer
	// listing, so each group owns a separate sequence.
	const fileLoadTokenRef = useRef(0);
	const filePreviewTokenRef = useRef(0);
	// Load, preview, and refresh retain independent result sequences, but all three
	// write the single current error row and therefore share this publication lane.
	const currentErrorTokenRef = useRef(0);
	const initialFileLoadStartedRef = useRef(false);
	const fileOperationTokenRef = useRef(0);
	const editorSaveTokenRef = useRef(0);
	const editorRevisionRef = useRef(0);
	const routePathTokenRef = useRef(0);
	useEffect(() => {
		if (!remoteFileProvider) {
			// Local provider recreation changes write capability, not listing identity.
			// Keep the current generation so a one-shot startup listing remains valid.
			activeFileProviderRef.current = localFileProvider;
		}
	}, [localFileProvider, remoteFileProvider]);
	const operationRunRef = useRef<OperationRunProgress | undefined>(undefined);
	// Runs are identified by a token rather than tracked with a shared boolean. A
	// boolean let a second run clear the first run's cancellation and then let the
	// superseded loop publish onto the second run's progress; comparing tokens makes
	// a superseded loop unable to do either.
	const operationRunTokenRef = useRef(0);
	const operationRunCancelledTokenRef = useRef(0);
	const interfaceConfirmationEvidenceExports = useMemo(
		() =>
			filterInterfaceConfirmationEvidenceExports(
				interfaceConfirmationAuditExports,
				interfaceConfirmationAuditArchiveExports,
				interfaceEvidenceStateFilter,
				interfaceEvidenceQuery,
			),
		[
			interfaceConfirmationAuditArchiveExports,
			interfaceConfirmationAuditExports,
			interfaceEvidenceQuery,
			interfaceEvidenceStateFilter,
		],
	);
	const statusEvidenceIndexes = useMemo(
		() => ({
			handoffIndex,
			auditExportIndex,
			auditExportArchiveIndex,
			cleanupExportIndex,
			cleanupExportArchiveIndex,
			toolExportIndex,
			toolExportArchiveIndex,
			processControlAuditExports,
			remoteKnownHostsSelectionAuditExports,
			interfaceConfirmationAuditExports,
			interfaceConfirmationAuditArchiveExports,
		}),
		[
			auditExportArchiveIndex,
			auditExportIndex,
			cleanupExportArchiveIndex,
			cleanupExportIndex,
			handoffIndex,
			interfaceConfirmationAuditArchiveExports,
			interfaceConfirmationAuditExports,
			processControlAuditExports,
			remoteKnownHostsSelectionAuditExports,
			toolExportArchiveIndex,
			toolExportIndex,
		],
	);
	const statusEvidenceSelection = useMemo(
		() => ({
			selectedHandoffIndex,
			selectedAuditExportIndex,
			selectedAuditExportArchiveIndex,
			selectedCleanupExportIndex,
			selectedCleanupExportArchiveIndex,
			selectedToolExportIndex,
			selectedToolExportArchiveIndex,
			selectedProcessControlAuditExportIndex,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
			selectedInterfaceConfirmationAuditExportIndex,
			toolExportFilter,
			toolExportArchiveFilter,
			toolExportQuery,
			toolExportArchiveQuery,
			interfaceEvidenceStateFilter,
			interfaceEvidenceQuery,
		}),
		[
			interfaceEvidenceQuery,
			interfaceEvidenceStateFilter,
			selectedAuditExportArchiveIndex,
			selectedAuditExportIndex,
			selectedCleanupExportArchiveIndex,
			selectedCleanupExportIndex,
			selectedHandoffIndex,
			selectedInterfaceConfirmationAuditExportIndex,
			selectedProcessControlAuditExportIndex,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
			selectedToolExportArchiveIndex,
			selectedToolExportIndex,
			toolExportArchiveFilter,
			toolExportArchiveQuery,
			toolExportFilter,
			toolExportQuery,
		],
	);
	const filteredTimelineEvidenceTrailAuditExports = useMemo(
		() =>
			filterTimelineEvidenceTrailAuditExports(
				timelineEvidenceTrailAuditExports,
				timelineEvidenceTrailSourceFilter,
			),
		[timelineEvidenceTrailAuditExports, timelineEvidenceTrailSourceFilter],
	);
	const [
		lastStatusActivityEvidenceFocusPlan,
		setLastStatusActivityEvidenceFocusPlan,
	] = useState<StatusActivityCopyIntentEvidenceFocusPlan>();
	const [selectedStatusEvidenceKind, setSelectedStatusEvidenceKind] =
		useState<StatusEvidenceKind>("handoff");
	const [events, setEvents] = useState<ConsoleEvent[]>([
		createEvent("info", "picos console booted"),
		createEvent("info", "write actions locked by policy"),
	]);
	const [error, setError] = useState<string>();
	const [refreshInterval, setRefreshInterval] = useState(3000);
	const [language, setLanguage] = useState<Language>("en");
	const [commandStatus, setCommandStatus] = useState<CommandStatus>("idle");
	const [fileRoot, setFileRoot] = useState(systemFileRoot);
	const fileRootRef = useRef(fileRoot);
	fileRootRef.current = fileRoot;
	const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
	const [fileHistory, setFileHistory] = useState<string[]>([]);
	const [fileForwardHistory, setFileForwardHistory] = useState<string[]>([]);
	const [fileFilter, setFileFilter] = useState<FileFilterState>({
		active: false,
		query: "",
	});
	const [fileOperationDialog, setFileOperationDialog] =
		useState<FileOperationDialogState>({
			active: false,
		});
	const [selectedFileIndex, setSelectedFileIndex] = useState(0);
	const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
	const selectedFileIndexRef = useRef(selectedFileIndex);
	const selectedLocationIndexRef = useRef(selectedLocationIndex);
	selectedFileIndexRef.current = selectedFileIndex;
	selectedLocationIndexRef.current = selectedLocationIndex;
	const [commandLine, setCommandLine] = useState<CommandLineState>({
		active: false,
		prompt: "path",
		value: "",
	});
	const [clipboardConfirmation, setClipboardConfirmation] =
		useState<ClipboardConfirmationState>({
			active: false,
			value: "",
		});
	const [palette, setPalette] = useState<CommandPaletteState>({
		active: false,
		selectedIndex: 0,
		query: "",
	});
	const [editorPreview, setEditorPreview] = useState<EditorBuffer>();
	const [editorSaveResult, setEditorSaveResult] =
		useState<EditorSaveExecutionResult>();
	const [selectedEditorLineIndex, setSelectedEditorLineIndex] = useState(0);
	const [connectionsResult, setConnectionsResult] =
		useState<ConnectionsResult>();
	const [portsResult, setPortsResult] = useState<PortsResult>();
	const [connectionSort, setConnectionSort] = useState<ConnectionSort>({
		key: "state",
		direction: "asc",
	});
	const [portSort, setPortSort] = useState<PortSort>({
		key: "port",
		direction: "asc",
	});
	const [selectedConnectionIndex, setSelectedConnectionIndex] = useState(0);
	const [selectedPortIndex, setSelectedPortIndex] = useState(0);
	const [selectedInterfaceIndex, setSelectedInterfaceIndex] = useState(0);
	const [selectedDnsTargetIndex, setSelectedDnsTargetIndex] = useState(0);
	const [interfaceDetailView, setInterfaceDetailView] =
		useState<InterfaceDetailView>("list");
	const [interfaceSourceCopyPreview, setInterfaceSourceCopyPreview] =
		useState(false);
	const [interfaceStateProposal, setInterfaceStateProposal] =
		useState<InterfaceStateProposal>();
	const [interfaceConfirmationResult, setInterfaceConfirmationResult] =
		useState<InterfaceConfirmationResult>();
	const [connectionDetailView, setConnectionDetailView] =
		useState<EndpointDetailView>("detail");
	const [portDetailView, setPortDetailView] =
		useState<EndpointDetailView>("detail");
	const [connectionCopyPreview, setConnectionCopyPreview] = useState(false);
	const [portCopyPreview, setPortCopyPreview] = useState(false);
	const [portProcessControlPreview, setPortProcessControlPreview] =
		useState(false);
	const [portProcessControlInspector, setPortProcessControlInspector] =
		useState(false);
	const [connectionFilter, setConnectionFilter] = useState("");
	const [portFilter, setPortFilter] = useState("");
	const [connectionFilterPresets, setConnectionFilterPresets] = useState<
		string[]
	>([]);
	const [portFilterPresets, setPortFilterPresets] = useState<string[]>([]);
	const [selectedProcessDetail, setSelectedProcessDetail] =
		useState<ProcessDetail>();
	const [selectedProcessFiles, setSelectedProcessFiles] =
		useState<ProcessFileSnapshot>();
	const [
		selectedProcessFileEvidenceIssue,
		setSelectedProcessFileEvidenceIssue,
	] = useState<PortProcessControlFileEvidenceIssue>();
	const [selectedProcessFileIndex, setSelectedProcessFileIndex] = useState(0);
	const [processClipboardPreview, setProcessClipboardPreview] = useState(false);
	const [routeTable, setRouteTable] = useState<RouteTableResult>();
	const [routePath, setRoutePath] = useState<RoutePathResult>();
	const [routeSort, setRouteSort] = useState<RouteSort>({
		key: "default",
		direction: "asc",
	});
	const [routeFilter, setRouteFilter] = useState("");
	const [routeFilterPresets, setRouteFilterPresets] = useState<string[]>([]);
	const [routeDetailView, setRouteDetailView] =
		useState<RouteDetailView>("table");
	const [routeCopyPreview, setRouteCopyPreview] = useState(false);
	const [toolHistory, setToolHistory] = useState<ToolHistoryItem[]>([]);
	const [selectedToolHistoryIndex, setSelectedToolHistoryIndex] = useState(0);
	const [selectedToolTargetPresetIndex, setSelectedToolTargetPresetIndex] =
		useState(0);
	const [customToolTargetPresets, setCustomToolTargetPresets] = useState<
		ToolTargetPreset[]
	>([]);
	const [toolTargetPresetLimit, setToolTargetPresetLimit] = useState(8);
	const [auditArchiveRetentionLimit, setAuditArchiveRetentionLimit] =
		useState(10);
	const [selectedConfigIndex, setSelectedConfigIndex] = useState(0);
	const [enableExperimentalControls, setEnableExperimentalControls] =
		useState(false);
	const [showPublicIp, setShowPublicIp] = useState(true);
	const [configResetPreview, setConfigResetPreview] =
		useState<ConfigWorkspaceResetPreview>();
	const [selectedConfigShelfTarget, setSelectedConfigShelfTarget] =
		useState<ConfigManagedShelfTarget>();
	const [configShelfLandingTarget, setConfigShelfLandingTarget] =
		useState<ConfigManagedShelfTarget>();
	const [toolCopyPreview, setToolCopyPreview] =
		useState<ToolCopyPreviewMode>(false);
	const [toolSectionClipboardSelection, setToolSectionClipboardSelection] =
		useState<ToolSectionClipboardSelection>("target");
	const [toolSectionClipboardRowIndex, setToolSectionClipboardRowIndex] =
		useState(0);
	const [toolHistoryFilter, setToolHistoryFilter] = useState("");
	const [toolHistoryFilterPresets, setToolHistoryFilterPresets] = useState<
		string[]
	>([]);
	const [toolHistorySort, setToolHistorySort] =
		useState<ToolHistorySort>("time");
	const [toolHistoryGroup, setToolHistoryGroup] =
		useState<ToolHistoryGroup>("none");
	const [toolHistoryDetailView, setToolHistoryDetailView] =
		useState<ToolHistoryDetailView>("raw");
	const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
	const [timelineSearchQuery, setTimelineSearchQuery] = useState("");
	const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(0);
	const [timelineSearchPresets, setTimelineSearchPresets] = useState<string[]>(
		[],
	);
	const [logSearchQuery, setLogSearchQuery] = useState("");
	const [logSearchPresets, setLogSearchPresets] = useState<string[]>([]);
	const [logLevelFilter, setLogLevelFilter] = useState<OsLogLevelFilter>("all");
	const [logProfiles, setLogProfiles] = useState<LogProfile[]>([]);
	const [logFollowEnabled, setLogFollowEnabled] = useState(false);
	const [logFollowRefreshCount, setLogFollowRefreshCount] = useState(0);
	const [logFollowLastStatus, setLogFollowLastStatus] = useState<
		"idle" | "ok" | "warn" | "fail"
	>("idle");
	const [logFollowHistory, setLogFollowHistory] = useState<
		LogFollowHistoryItem[]
	>([]);
	const [remoteProfiles, setRemoteProfiles] = useState<SftpRemoteProfile[]>([]);
	const [selectedRemoteIndex, setSelectedRemoteIndex] = useState(0);
	const configManagedShelfStateEffectSetters = useMemo(
		() => ({
			setScreen,
			setFocusArea,
			setConfigShelfLandingTarget,
			setCommandLine,
			setSelectedInterfaceIndex,
			setRouteDetailView,
			setRouteCopyPreview,
			setRouteFilter,
			setConnectionCopyPreview,
			setConnectionFilter,
			setSelectedConnectionIndex,
			setPortCopyPreview,
			setPortProcessControlPreview,
			setPortFilter,
			setSelectedPortIndex,
			setSelectedToolTargetPresetIndex,
			setToolHistoryDetailView,
			setToolCopyPreview,
			setLogLevelFilter,
			setLogSearchQuery,
			setSelectedRemoteIndex,
		}),
		[],
	);
	const [remoteHostKeyEvidenceSession, setRemoteHostKeyEvidenceSession] =
		useState<RemoteHostKeyEvidenceInputSession>({});
	const [
		remoteKnownHostsCandidateSession,
		setRemoteKnownHostsCandidateSession,
	] = useState<RemoteKnownHostsCandidateSession>({});
	const [
		remoteKnownHostsPasteReviewSession,
		setRemoteKnownHostsPasteReviewSession,
	] = useState<RemoteKnownHostsPasteReviewSession>({});
	const [remoteFileContext, setRemoteFileContext] =
		useState<RemoteFileContext>();
	const t = useMemo(() => createTranslator(language), [language]);
	const parentFileEntries = useMemo(
		() => withParentDirectoryEntry(fileRoot, fileEntries),
		[fileRoot, fileEntries],
	);
	const displayedFileEntries = useMemo(
		() => filterFileEntries(parentFileEntries, fileFilter),
		[parentFileEntries, fileFilter],
	);
	const connections = connectionsResult?.connections ?? [];
	const ports = portsResult?.ports ?? [];
	const sortedConnections = useMemo(
		() =>
			sortConnections(
				filterConnections(connections, connectionFilter),
				connectionSort,
			),
		[connections, connectionFilter, connectionSort],
	);
	const sortedPorts = useMemo(
		() => sortListeningPorts(filterListeningPorts(ports, portFilter), portSort),
		[portFilter, ports, portSort],
	);
	const toolTargetPresets = useMemo(
		() =>
			getToolTargetPresets(summary, defaultPingHost, customToolTargetPresets),
		[customToolTargetPresets, defaultPingHost, summary],
	);
	const configWorkspaceItems = useMemo(
		() =>
			createConfigWorkspaceItems({
				auditArchiveRetentionLimit,
				allowAdminDryRun: controlExecutionPolicy.allowAdminDryRun,
				controlExecutionMode: controlExecutionPolicy.mode,
				defaultPingHost,
				editorSaveMode,
				language,
				refreshInterval,
				statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter,
				toolTargetPresetLimit,
			}),
		[
			auditArchiveRetentionLimit,
			controlExecutionPolicy.allowAdminDryRun,
			controlExecutionPolicy.mode,
			defaultPingHost,
			editorSaveMode,
			language,
			refreshInterval,
			statusActivityResultTimelineJumpFilter,
			toolTargetPresetLimit,
		],
	);
	const configManagedShelfRows = useMemo(
		() =>
			formatConfigManagedShelfRows({
				auditArchiveRetentionLimit,
				allowAdminDryRun: controlExecutionPolicy.allowAdminDryRun,
				connectionFilterPresets,
				connectionSort: formatConnectionSortPreference(connectionSort),
				controlExecutionMode: controlExecutionPolicy.mode,
				defaultPingHost,
				editorSaveMode,
				enableExperimentalControls,
				interfaceEvidenceSearchPresets,
				language,
				logProfiles,
				logSearchPresets,
				operationPresets,
				portFilterPresets,
				portSort: formatPortSortPreference(portSort),
				refreshInterval,
				remoteProfiles,
				routeFilterPresets,
				showPublicIp,
				statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter,
				theme: "dark",
				toolHistoryDetailView,
				toolHistoryFilterPresets,
				toolHistoryGroup,
				toolHistorySort,
				toolTargetPresetLimit,
				toolTargetPresets: customToolTargetPresets,
			}),
		[
			auditArchiveRetentionLimit,
			connectionFilterPresets,
			connectionSort,
			controlExecutionPolicy.allowAdminDryRun,
			controlExecutionPolicy.mode,
			customToolTargetPresets,
			defaultPingHost,
			editorSaveMode,
			enableExperimentalControls,
			interfaceEvidenceSearchPresets,
			language,
			logProfiles,
			logSearchPresets,
			operationPresets,
			portFilterPresets,
			portSort,
			refreshInterval,
			remoteProfiles,
			routeFilterPresets,
			showPublicIp,
			statusActivityResultTimelineJumpFilter,
			toolHistoryDetailView,
			toolHistoryFilterPresets,
			toolHistoryGroup,
			toolHistorySort,
			toolTargetPresetLimit,
		],
	);
	const configManagedShelfHandoffRows = selectedConfigShelfTarget
		? formatConfigManagedShelfHandoffRows(selectedConfigShelfTarget)
		: [];
	useEffect(() => {
		setSelectedConfigIndex((index) =>
			clampIndex(index, configWorkspaceItems.length),
		);
	}, [configWorkspaceItems.length]);
	const portProcessControlInspectorRows = useMemo(() => {
		if (!portProcessControlInspector || screen !== "ports") {
			return [];
		}
		const preview = createSelectedPortProcessControlPreview(
			sortedPorts,
			selectedPortIndex,
		);
		if (!preview) {
			return ["PORT CONTROL", "no selected listening PID"];
		}
		return formatPortProcessControlInspectorRows(
			preview,
			getControlPreviewCommand(preview.actionId, currentPlatform()),
			controlExecutionPolicy,
			selectedProcessFiles,
			selectedProcessFileEvidenceIssue,
		);
	}, [
		controlExecutionPolicy,
		portProcessControlInspector,
		screen,
		selectedPortIndex,
		selectedProcessFileEvidenceIssue,
		selectedProcessFiles,
		sortedPorts,
	]);
	const cleanupShelfIndex = useMemo(
		() =>
			createCleanupShelfIndex({
				connectionFilterPresets,
				customToolTargetPresets,
				logProfiles,
				logSearchPresets,
				portFilterPresets,
				routeFilterPresets,
				timelineSearchPresets,
				toolHistoryFilterPresets,
			}),
		[
			connectionFilterPresets,
			customToolTargetPresets,
			logProfiles,
			logSearchPresets,
			portFilterPresets,
			routeFilterPresets,
			timelineSearchPresets,
			toolHistoryFilterPresets,
		],
	);

	useEffect(() => {
		setSelectedCleanupShelfIndex((index) =>
			clampIndex(index, cleanupShelfIndex.activeShelves),
		);
	}, [cleanupShelfIndex.activeShelves]);
	const visibleTimelineEvents = useMemo(
		() => filterTimelineEvents(events, timelineSearchQuery, timelineFilter),
		[events, timelineFilter, timelineSearchQuery],
	);
	const latestStatusActivityResultAuditJumpIntent =
		getLatestStatusActivityResultAuditJumpIntent(
			statusActivityCopyIntentHistory,
		);
	const selectedStatusActivityResultAuditJumpIntent =
		getSelectedStatusActivityResultAuditJumpIntent(
			statusActivityCopyIntentHistory,
			selectedStatusActivityResultAuditJumpIndex,
		);
	const statusActivityResultTimelineSearchRecovery =
		createStatusActivityResultTimelineSearchReplay(
			statusActivityResults,
			selectedStatusActivityResultIndex,
			latestStatusActivityResultAuditJumpIntent,
			selectedStatusActivityResultAuditJumpIntent,
		);
	const statusActivityToolsEvidenceSearchRecovery =
		createStatusActivityToolsEvidenceSearchRecovery(
			statusActivityResultTimelineSearchRecovery,
			{
				activeFilter: toolExportFilter,
				activeIndex: toolExportIndex,
				archiveFilter: toolExportArchiveFilter,
				archiveIndex: toolExportArchiveIndex,
			},
		);
	const toolArchiveRetentionPreviewPlan = useMemo(
		() =>
			createToolHistoryArchiveRetentionPlan(toolExportArchiveIndex, {
				maxItems: auditArchiveRetentionLimit,
			}),
		[auditArchiveRetentionLimit, toolExportArchiveIndex],
	);
	useEffect(() => {
		setSelectedTimelineIndex((index) =>
			repairTimelineSelection(index, visibleTimelineEvents.length),
		);
	}, [visibleTimelineEvents.length]);
	useEffect(() => {
		setSelectedConnectionIndex((index) =>
			repairEndpointSelection(index, sortedConnections.length),
		);
	}, [sortedConnections.length]);
	useEffect(() => {
		setSelectedPortIndex((index) =>
			repairEndpointSelection(index, sortedPorts.length),
		);
	}, [sortedPorts.length]);

	const log = useCallback((level: ConsoleEvent["level"], message: string) => {
		setEvents((current) => appendEvent(current, createEvent(level, message)));
	}, []);
	// Counted rather than set directly, because several long-running actions share
	// this indicator and any of them can overlap. Every `beginCommand()` must be
	// paired with exactly one `endCommand()` in a `finally`.
	const runningCommandCountRef = useRef(0);
	const beginCommand = useCallback(() => {
		runningCommandCountRef.current = beginCommandStatusCount(
			runningCommandCountRef.current,
		);
		setCommandStatus(resolveCommandStatus(runningCommandCountRef.current));
	}, []);
	const endCommand = useCallback(() => {
		runningCommandCountRef.current = endCommandStatusCount(
			runningCommandCountRef.current,
		);
		setCommandStatus(resolveCommandStatus(runningCommandCountRef.current));
	}, []);

	const recordStatusActivityResult = useCallback(
		(result: StatusActivityResult) => {
			setStatusActivityResults((history) =>
				appendStatusActivityResultHistory(history, result),
			);
			setSelectedStatusActivityResultIndex(0);
			setSelectedStatusActivityCopyPreviewRowIndex(0);
			setStatusActivityCopyPreviewExpanded(false);
		},
		[],
	);

	const syncConfigSessionState = useCallback((config: PicosConfig) => {
		const intent = createConfigSessionSyncIntent(config);
		setAuditArchiveRetentionLimit(intent.auditArchiveRetentionLimit);
		setToolTargetPresetLimit(intent.toolTargetPresetLimit);
		setLanguage(intent.language);
		setRefreshInterval(intent.refreshInterval);
		setDefaultPingHost(intent.defaultPingHost);
		setEnableExperimentalControls(intent.enableExperimentalControls);
		setEditorSaveMode(intent.editorSaveMode);
		setShowPublicIp(intent.showPublicIp);
		const controlPolicySync = prepareControlPolicySync({
			currentToken: actionControlSequenceRef.current,
			policy: getControlExecutionPolicyFromConfig(intent),
		});
		actionControlSequenceRef.current = controlPolicySync.requestToken;
		setControlExecutionPolicy(controlPolicySync.policy);
		setStatusActivityResultTimelineJumpFilter(
			intent.statusResultJumpClassFilter,
		);
		setInterfaceEvidenceSearchPresets(intent.interfaceEvidenceSearchPresets);
		setOperationPresets(intent.operationPresets);
		setCustomToolTargetPresets(intent.toolTargetPresets as ToolTargetPreset[]);
		setRemoteProfiles(intent.remoteProfiles);
	}, []);

	const saveConfigWorkspaceAdjustment = useCallback(
		async (transition: ReturnType<typeof prepareConfigWorkspaceAdjustment>) => {
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}

			beginCommand();
			try {
				const config = await setConfigValue(
					transition.key,
					String(transition.value),
				);
				const persisted =
					transition.key === "toolTargetPresetLimit"
						? await setConfigToolTargetPresets(config.toolTargetPresets)
						: config;
				syncConfigSessionState(persisted);
				log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `config save failed ${caught.message}`
						: `config save failed ${String(caught)}`,
				);
			} finally {
				endCommand();
			}
		},
		[beginCommand, endCommand, log, syncConfigSessionState],
	);

	const submitConfigTextCommand = useCallback(
		async (transition: CommandTransition<"submit-config-text">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			beginCommand();
			try {
				const config = await setConfigValue(
					transition.key,
					String(transition.value),
				);
				syncConfigSessionState(config);
				log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `config save failed ${caught.message}`
						: `config save failed ${String(caught)}`,
				);
			} finally {
				endCommand();
			}
		},
		[beginCommand, endCommand, log, syncConfigSessionState],
	);

	const applyNextConfigPolicyPreset = useCallback(async () => {
		beginCommand();
		try {
			const config = await readConfig();
			const transition = prepareNextConfigPolicyPresetTransition(config);
			await writeConfig(transition.config);
			syncConfigSessionState(transition.config);
			for (const notice of transition.notices) {
				log(notice.level, notice.message);
			}
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `config policy failed ${caught.message}`
					: `config policy failed ${String(caught)}`,
			);
		} finally {
			endCommand();
		}
	}, [beginCommand, endCommand, log, syncConfigSessionState]);

	const openConfigResetConfirmation = useCallback(
		(
			transition: ReturnType<typeof prepareConfigWorkspaceResetOpenTransition>,
		) => {
			setConfigResetPreview(transition.preview);
			setCommandLine(openCommandLine(transition.commandLinePrompt));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitConfigResetCommand = useCallback(
		async (transition: CommandTransition<"submit-config-reset">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "notice") {
				setConfigResetPreview(undefined);
				log(transition.notice.level, transition.notice.message);
				return;
			}
			beginCommand();
			try {
				const config = await resetConfigWorkspaceValues(transition.values);
				syncConfigSessionState(config);
				setConfigResetPreview(undefined);
				log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `config reset failed ${caught.message}`
						: `config reset failed ${String(caught)}`,
				);
			} finally {
				endCommand();
			}
		},
		[beginCommand, endCommand, log, syncConfigSessionState],
	);

	const previewFile = useCallback(
		async (
			entry: FileEntry,
			options: {
				openEditor?: boolean;
				notice?: { level: "ok" | "info" | "warn" | "fail"; message: string };
			} = {},
		) => {
			const tokens = beginRequestWithPublication(
				filePreviewTokenRef.current,
				currentErrorTokenRef.current,
			);
			const token = tokens.requestToken;
			const errorToken = tokens.publicationToken;
			filePreviewTokenRef.current = token;
			currentErrorTokenRef.current = errorToken;
			try {
				const read = await activeFileProviderRef.current.read(entry.path, {
					maxBytes: 6000,
				});
				const transition = classifyFilePreviewOutcome({
					currentRequestToken: filePreviewTokenRef.current,
					requestToken: token,
					currentErrorRequestToken: currentErrorTokenRef.current,
					errorRequestToken: errorToken,
					entry,
					openEditor: options.openEditor ?? false,
					notice: options.notice,
					outcome: { status: "success", read },
				});
				if (transition.status !== "success") {
					return false;
				}
				editorRevisionRef.current = beginRequest(editorRevisionRef.current);
				setEditorPreview(transition.buffer);
				if (transition.clearSaveResult) {
					setEditorSaveResult(undefined);
				}
				setSelectedEditorLineIndex(transition.selectedLineIndex);
				if (transition.clearError) {
					setError(undefined);
				}
				if (transition.openEditor) {
					setScreen("editor");
					setFocusArea("workspaces");
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
				return true;
			} catch (caught) {
				const transition = classifyFilePreviewOutcome({
					currentRequestToken: filePreviewTokenRef.current,
					requestToken: token,
					currentErrorRequestToken: currentErrorTokenRef.current,
					errorRequestToken: errorToken,
					entry,
					openEditor: options.openEditor ?? false,
					notice: options.notice,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
				if (transition.status === "failure" && transition.publishError) {
					setError(transition.error);
				}
				return false;
			}
		},
		[log],
	);

	const loadFiles = useCallback(
		async (
			request: string | FileLoadRequest,
			source: {
				batch?: { resolvedRoot: string; entries: FileEntry[] };
				switchSession?: {
					provider: FileProvider;
					remoteProvider?: FileProvider;
					remoteContext?: RemoteFileContext;
				};
			} = {},
		) => {
			const nextRequest =
				typeof request === "string" ? { path: request } : request;
			const switchSession = source.switchSession;
			if (
				!switchSession &&
				activeFileProviderGenerationRef.current !==
					fileProviderGenerationRef.current
			) {
				return false;
			}
			const provider = switchSession?.provider ?? activeFileProviderRef.current;
			const tokens = beginRequestWithPublication(
				fileLoadTokenRef.current,
				currentErrorTokenRef.current,
			);
			const token = tokens.requestToken;
			let errorToken = tokens.publicationToken;
			fileLoadTokenRef.current = token;
			currentErrorTokenRef.current = errorToken;
			let requestProviderGeneration = activeFileProviderGenerationRef.current;
			try {
				const [resolvedRoot, entries] = source.batch
					? [source.batch.resolvedRoot, source.batch.entries]
					: await Promise.all([
							provider
								.stat(nextRequest.path)
								.then((entry) => entry.path)
								.catch(() => nextRequest.path),
							provider.list(nextRequest.path),
						]);
				if (switchSession) {
					if (isStaleRequest(fileLoadTokenRef.current, token)) {
						return false;
					}
					requestProviderGeneration = beginRequest(
						fileProviderGenerationRef.current,
					);
					fileProviderGenerationRef.current = requestProviderGeneration;
					filePreviewTokenRef.current = beginRequest(
						filePreviewTokenRef.current,
					);
					errorToken = beginRequest(currentErrorTokenRef.current);
					currentErrorTokenRef.current = errorToken;
				}
				const classifySuccess = () =>
					classifyFileLoadOutcome({
						currentRequestToken: fileLoadTokenRef.current,
						requestToken: token,
						currentErrorRequestToken: currentErrorTokenRef.current,
						errorRequestToken: errorToken,
						currentProviderGeneration: fileProviderGenerationRef.current,
						requestProviderGeneration,
						...(switchSession
							? {
									providerSession: {
										generation: requestProviderGeneration,
										kind: provider.kind,
										remoteContext: switchSession.remoteContext,
									},
								}
							: {}),
						request: nextRequest,
						outcome: { status: "success" as const, resolvedRoot, entries },
						selectedIndex: selectedFileIndexRef.current,
						selectedLocationIndex: selectedLocationIndexRef.current,
						locations: fileLocations,
					});
				const transition = classifySuccess();
				if (transition.status !== "success") {
					return false;
				}
				// Every value in this listing batch has been awaited and classified before
				// any setter runs, so rows, root, history, and selection land together.
				if (
					transition.commitProviderSession &&
					transition.providerSession &&
					switchSession
				) {
					activeFileProviderRef.current = switchSession.provider;
					activeFileProviderGenerationRef.current =
						transition.providerSession.generation;
					remoteFileProviderRef.current = switchSession.remoteProvider;
					setRemoteFileProvider(switchSession.remoteProvider);
					setRemoteFileContext(switchSession.remoteContext);
				}
				fileRootRef.current = transition.root;
				setFileRoot(transition.root);
				setFileEntries(transition.entries);
				selectedFileIndexRef.current = transition.selectedIndex;
				setSelectedFileIndex(transition.selectedIndex);
				selectedLocationIndexRef.current = transition.selectedLocationIndex;
				setSelectedLocationIndex(transition.selectedLocationIndex);
				if (transition.backHistory) {
					setFileHistory(transition.backHistory);
				}
				if (transition.forwardHistory) {
					setFileForwardHistory(transition.forwardHistory);
				}
				if (transition.clearError) {
					setError(undefined);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
				return true;
			} catch (caught) {
				const transition = classifyFileLoadOutcome({
					currentRequestToken: fileLoadTokenRef.current,
					requestToken: token,
					currentErrorRequestToken: currentErrorTokenRef.current,
					errorRequestToken: errorToken,
					currentProviderGeneration: fileProviderGenerationRef.current,
					requestProviderGeneration,
					...(switchSession
						? {
								providerSession: {
									generation: requestProviderGeneration,
									kind: provider.kind,
									remoteContext: switchSession.remoteContext,
								},
							}
						: {}),
					request: nextRequest,
					outcome: { status: "failure", error: caught },
					selectedIndex: selectedFileIndexRef.current,
					selectedLocationIndex: selectedLocationIndexRef.current,
					locations: fileLocations,
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
				if (transition.status === "failure" && transition.publishError) {
					setError(transition.error);
				}
				return false;
			}
		},
		[fileLocations, log],
	);

	const refreshFiles = useCallback(async () => {
		await loadFiles({ path: fileRootRef.current, keepSelection: true });
	}, [loadFiles]);

	const disconnectRemoteFiles = useCallback(async () => {
		const pendingController = pendingRemoteConnectRef.current;
		const pendingProvider = pendingRemoteFileProviderRef.current;
		const diagnostic = remoteConnectionDiagnosticRef.current;
		const intent = prepareRemoteDisconnect({
			hasRemoteSession: Boolean(remoteFileProvider),
			diagnostic,
			activeRunToken: activeRemoteConnectionRunTokenRef.current,
			currentRunToken: remoteConnectionRunTokenRef.current,
			hasPendingConnection: Boolean(pendingController),
		});
		if (intent.kind === "notice") {
			log(intent.notice.level, intent.notice.message);
			return;
		}
		const diagnosticSequence = beginRequest(
			remoteConnectionDiagnosticSequenceRef.current,
		);
		remoteConnectionDiagnosticSequenceRef.current = diagnosticSequence;
		if (intent.cancelActiveAttempt) {
			pendingController?.abort();
			try {
				await pendingProvider?.close?.();
			} catch (caught) {
				log(
					"warn",
					caught instanceof Error
						? `pending SFTP session close failed ${caught.message}`
						: `pending SFTP session close failed ${String(caught)}`,
				);
			}
			if (pendingRemoteConnectRef.current === pendingController) {
				pendingRemoteConnectRef.current = undefined;
			}
			if (pendingRemoteFileProviderRef.current === pendingProvider) {
				pendingRemoteFileProviderRef.current = undefined;
			}
			if (activeRemoteConnectionRunTokenRef.current === intent.ownerRunToken) {
				activeRemoteConnectionRunTokenRef.current = undefined;
			}
		}
		const restored = await loadFiles(
			{
				path: systemFileRoot,
				backHistory: [],
				forwardHistory: [],
				failurePrefix: "local filesystem restore failed",
			},
			{
				switchSession: {
					provider: localFileProvider,
				},
			},
		);
		if (restored) {
			try {
				await remoteFileProvider?.close?.();
			} catch (caught) {
				log(
					"warn",
					caught instanceof Error
						? `SFTP session close failed ${caught.message}`
						: `SFTP session close failed ${String(caught)}`,
				);
			}
		}
		const publication = classifyRemoteDisconnectPublication({
			currentDiagnosticSequence: remoteConnectionDiagnosticSequenceRef.current,
			requestDiagnosticSequence: diagnosticSequence,
			diagnostic,
			localRestored: restored,
		});
		if (publication.status === "current") {
			if (publication.publishCurrent) {
				remoteConnectionDiagnosticRef.current = publication.diagnostic;
				setRemoteConnectionDiagnostic(publication.diagnostic);
			}
			if (restored) {
				setFocusArea("files");
			}
			log(publication.notice.level, publication.notice.message);
		}
	}, [loadFiles, localFileProvider, log, remoteFileProvider, systemFileRoot]);

	const openSelectedFileEntry = useCallback(
		async (transition: SelectedFileOpenTransition) => {
			if (transition.action === "none") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			if (transition.action === "load") {
				await loadFiles(transition.request);
				return;
			}
			await previewFile(transition.entry, {
				openEditor: transition.openEditor,
				notice: transition.notice,
			});
		},
		[loadFiles, log, previewFile],
	);

	const goToParentDirectory = useCallback(
		async (transition: ReturnType<typeof prepareParentFileNavigation>) => {
			if (transition.action === "none") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			await loadFiles(transition.request);
		},
		[loadFiles, log],
	);

	const jumpToLocation = useCallback(
		async (transition: ReturnType<typeof prepareFileLocationNavigation>) => {
			if (transition.action === "none") {
				return;
			}
			await loadFiles(transition.request);
		},
		[loadFiles],
	);

	const jumpToNextLocation = useCallback(
		async (transition: ReturnType<typeof prepareFileLocationNavigation>) => {
			await jumpToLocation(transition);
		},
		[jumpToLocation],
	);

	const submitPathCommand = useCallback(
		async (transition: CommandTransition<"submit-path">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.action === "cancel") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			await loadFiles(transition.request);
		},
		[loadFiles, log],
	);

	const submitRouteDestinationCommand = useCallback(
		async (submission: CommandTransition<"submit-route-destination">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (submission.kind === "notice") {
				log(submission.notice.level, submission.notice.message);
				return;
			}

			const requestToken = beginRequest(routePathTokenRef.current);
			routePathTokenRef.current = requestToken;
			try {
				const result = await runRoutePath(submission.destination);
				const outcome = classifyRoutePathRequestOutcome({
					currentToken: routePathTokenRef.current,
					requestToken,
					destination: submission.destination,
					outcome: { kind: "success", result },
				});
				if (outcome.publishCurrent && outcome.result) {
					setRoutePath(outcome.result);
					setScreen("routes");
				}
				log(outcome.notice.level, outcome.notice.message);
			} catch (caught) {
				const outcome = classifyRoutePathRequestOutcome({
					currentToken: routePathTokenRef.current,
					requestToken,
					destination: submission.destination,
					outcome: { kind: "failure", error: caught },
				});
				log(outcome.notice.level, outcome.notice.message);
			}
		},
		[log],
	);

	const submitRouteFilterCommand = useCallback(
		(transition: CommandTransition<"submit-route-filter">) => {
			setRouteFilter(transition.filter);
			setRouteCopyPreview(transition.copyPreview);
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const runToolPlan = useCallback(
		async (plan: NonNullable<ReturnType<typeof createToolRunPlan>>) => {
			setScreen("tools");
			const result = await runTool(plan.toolId, plan.args, {
				timeoutMs: 10000,
			});
			setToolHistory((current) => {
				const next = appendToolHistory(current, { plan, result });
				setSelectedToolHistoryIndex(getNewestToolHistoryIndex(next));
				return next;
			});
		},
		[],
	);

	const submitToolCommand = useCallback(
		async (submission: CommandTransition<"submit-tool">) => {
			try {
				setCommandLine((current) => closeCommandLine(current));
				if (submission.kind === "notice") {
					log(submission.notice.level, submission.notice.message);
					return;
				}

				await runToolPlan(submission.plan);
				log("ok", `${submission.plan.label} completed`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, runToolPlan],
	);

	const submitEditorAppendLineCommand = useCallback(
		(transition: CommandTransition<"submit-editor-append">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.applies) {
				editorRevisionRef.current = beginRequest(editorRevisionRef.current);
			}
			setEditorPreview(transition.buffer);
			setSelectedEditorLineIndex(transition.selectedLineIndex);
			if (transition.clearSaveResult) setEditorSaveResult(undefined);
			if (transition.notice)
				log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitEditorInsertLineCommand = useCallback(
		(
			transition:
				| CommandTransition<"submit-editor-insert-before">
				| CommandTransition<"submit-editor-insert-after">,
		) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.applies) {
				editorRevisionRef.current = beginRequest(editorRevisionRef.current);
			}
			setEditorPreview(transition.buffer);
			setSelectedEditorLineIndex(transition.selectedLineIndex);
			if (transition.clearSaveResult) setEditorSaveResult(undefined);
			if (transition.notice)
				log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitEditorReplaceLineCommand = useCallback(
		(transition: CommandTransition<"submit-editor-replace">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.applies) {
				editorRevisionRef.current = beginRequest(editorRevisionRef.current);
			}
			setEditorPreview(transition.buffer);
			setSelectedEditorLineIndex(transition.selectedLineIndex);
			if (transition.clearSaveResult) setEditorSaveResult(undefined);
			if (transition.notice)
				log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const undoEditorEdit = useCallback(() => {
		editorRevisionRef.current = beginRequest(editorRevisionRef.current);
		setEditorPreview((current) => {
			const transition = transitionEditorUndo({
				buffer: current,
				selectedLineIndex: selectedEditorLineIndex,
			});
			setSelectedEditorLineIndex(transition.selectedLineIndex);
			if (transition.clearSaveResult) {
				setEditorSaveResult(undefined);
			}
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
			return transition.buffer;
		});
	}, [log, selectedEditorLineIndex]);

	const deleteSelectedEditorLine = useCallback(() => {
		editorRevisionRef.current = beginRequest(editorRevisionRef.current);
		setEditorPreview((current) => {
			const transition = transitionEditorDeleteLine({
				buffer: current,
				selectedLineIndex: selectedEditorLineIndex,
			});
			setSelectedEditorLineIndex(transition.selectedLineIndex);
			if (transition.clearSaveResult) {
				setEditorSaveResult(undefined);
			}
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
			return transition.buffer;
		});
	}, [log, selectedEditorLineIndex]);

	const submitEditorSaveConfirmationCommand = useCallback(
		async (submission: CommandTransition<"submit-editor-save">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (submission.kind === "notice") {
				log(submission.notice.level, submission.notice.message);
				return;
			}
			const requestToken = beginRequest(editorSaveTokenRef.current);
			editorSaveTokenRef.current = requestToken;
			const submittedRevision = editorRevisionRef.current;
			try {
				const { plan, provider } = submission.execution;
				const result = await runEditorSaveExecutionPlan(plan, provider);
				log(
					result.success
						? "ok"
						: plan.reason === "no-content-changes"
							? "info"
							: "warn",
					formatEditorSaveExecutionAuditMessage(result.audit),
				);
				if (isStaleRequest(editorSaveTokenRef.current, requestToken)) return;
				setEditorPreview((current) => {
					const publication = classifyEditorSaveBufferPublication({
						currentRequestToken: editorSaveTokenRef.current,
						requestToken,
						currentRevision: editorRevisionRef.current,
						submittedRevision,
						current,
						submitted: submission.editorPreview,
						success: result.success,
					});
					if (publication.publishResult) {
						setEditorSaveResult(result);
					}
					return publication.buffer;
				});
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `editor save failed ${caught.message}`
						: `editor save failed ${String(caught)}`,
				);
			}
		},
		[log],
	);

	const submitToolHistoryFilterCommand = useCallback(
		(transition: CommandTransition<"submit-tool-history-filter">) => {
			setToolHistoryFilter(transition.filter);
			if (transition.persistPreset) {
				setToolHistoryFilterPresets((current) =>
					saveToolHistoryPreset(current, transition.filter),
				);
			}
			setToolCopyPreview(transition.copyPreview);
			setSelectedToolHistoryIndex(transition.selectedIndex);
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitToolHistoryCleanupCommand = useCallback(
		(confirmation: CommandTransition<"submit-tool-history-cleanup">) => {
			setCommandLine((current) => closeCommandLine(current));
			log(confirmation.notice.level, confirmation.notice.message);
			if (confirmation.kind === "notice") {
				return;
			}
			setToolHistoryFilterPresets(confirmation.presets);
			setToolCopyPreview(confirmation.copyPreview);
			void setConfigToolHistoryPreferences({
				filterPresets: confirmation.presets,
			}).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool history filter cleanup failed ${caught.message}`
						: `tool history filter cleanup failed ${String(caught)}`,
				),
			);
		},
		[log],
	);

	const submitToolTargetLabelCommand = useCallback(
		(transition: CommandTransition<"submit-tool-target-label">) => {
			setCommandLine((current) =>
				applyToolTargetCommandLineIntent(current, transition.commandLine),
			);
			setSelectedToolTargetPresetIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (!transition.changed) {
				return;
			}
			setCustomToolTargetPresets(transition.presets);
			void setConfigToolTargetPresets(transition.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target label save failed ${caught.message}`
						: `tool target label save failed ${String(caught)}`,
				),
			);
			setToolCopyPreview(false);
		},
		[log],
	);

	const submitToolTargetValueCommand = useCallback(
		(transition: CommandTransition<"submit-tool-target-value">) => {
			setCommandLine((current) =>
				applyToolTargetCommandLineIntent(current, transition.commandLine),
			);
			setSelectedToolTargetPresetIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (!transition.changed) {
				return;
			}
			setCustomToolTargetPresets(transition.presets);
			void setConfigToolTargetPresets(transition.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target value save failed ${caught.message}`
						: `tool target value save failed ${String(caught)}`,
				),
			);
			setToolCopyPreview(false);
		},
		[log],
	);

	const submitToolTargetActionCommand = useCallback(
		(transition: CommandTransition<"submit-tool-target-action">) => {
			setCommandLine((current) =>
				applyToolTargetCommandLineIntent(current, transition.commandLine),
			);
			setSelectedToolTargetPresetIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (!transition.changed) {
				return;
			}
			setCustomToolTargetPresets(transition.presets);
			void setConfigToolTargetPresets(transition.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target action save failed ${caught.message}`
						: `tool target action save failed ${String(caught)}`,
				),
			);
			setToolCopyPreview(false);
		},
		[log],
	);

	const submitToolTargetCleanupCommand = useCallback(
		(transition: CommandTransition<"submit-tool-target-cleanup">) => {
			setCommandLine((current) =>
				applyToolTargetCommandLineIntent(current, transition.commandLine),
			);
			setSelectedToolTargetPresetIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (!transition.changed) {
				return;
			}
			setCustomToolTargetPresets(transition.presets);
			void setConfigToolTargetPresets(transition.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target action cleanup failed ${caught.message}`
						: `tool target action cleanup failed ${String(caught)}`,
				),
			);
			setToolCopyPreview(false);
		},
		[log],
	);

	const submitToolTargetPresetCommand = useCallback(
		(transition: CommandTransition<"submit-tool-target-preset">) => {
			setCommandLine((current) =>
				applyToolTargetCommandLineIntent(current, transition.commandLine),
			);
			setSelectedToolTargetPresetIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (!transition.changed) {
				return;
			}
			setCustomToolTargetPresets(transition.presets);
			void setConfigToolTargetPresets(transition.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target preset save failed ${caught.message}`
						: `tool target preset save failed ${String(caught)}`,
				),
			);
			setToolCopyPreview(false);
		},
		[log],
	);

	const submitEndpointFilterCommand = useCallback(
		(transition: CommandTransition<"submit-endpoint-filter">) => {
			if (transition.scope === "connections") {
				setConnectionFilter(transition.filter);
				setConnectionFilterPresets(transition.presets);
				setConnectionCopyPreview(transition.copyPreview);
				setSelectedConnectionIndex(transition.selectedIndex);
				log(transition.notice.level, transition.notice.message);
			} else {
				setPortFilter(transition.filter);
				setPortFilterPresets(transition.presets);
				setPortCopyPreview(transition.copyPreview);
				setPortProcessControlPreview(transition.processControlPreview);
				setSelectedPortIndex(transition.selectedIndex);
				log(transition.notice.level, transition.notice.message);
			}
			setCommandLine((current) => closeCommandLine(current));
		},
		[log],
	);

	const submitRouteFilterCleanupCommand = useCallback(
		(confirmation: CommandTransition<"submit-route-filter-cleanup">) => {
			setCommandLine((current) => closeCommandLine(current));
			setRouteCopyPreview(confirmation.copyPreview);
			log(confirmation.notice.level, confirmation.notice.message);
			if (confirmation.action === "notice") {
				return;
			}
			setRouteFilterPresets(confirmation.presets);
			void setConfigRouteFilterPresets(confirmation.presets).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `route filter cleanup failed ${caught.message}`
						: `route filter cleanup failed ${String(caught)}`,
				),
			);
		},
		[log],
	);

	const submitEndpointFilterCleanupCommand = useCallback(
		(confirmation: CommandTransition<"submit-endpoint-filter-cleanup">) => {
			const kind = confirmation.scope;
			setCommandLine((current) => closeCommandLine(current));
			log(confirmation.notice.level, confirmation.notice.message);
			if (confirmation.action === "notice") {
				return;
			}
			if (kind === "connections") {
				setConnectionFilterPresets(confirmation.presets);
				setConnectionCopyPreview(confirmation.copyPreview);
				setSelectedConnectionIndex(confirmation.selectedIndex);
			} else {
				setPortFilterPresets(confirmation.presets);
				setPortCopyPreview(confirmation.copyPreview);
				setPortProcessControlPreview(confirmation.processControlPreview);
				setSelectedPortIndex(confirmation.selectedIndex);
			}
			void setConfigEndpointFilterPresets(kind, confirmation.presets).catch(
				(caught) =>
					log(
						"fail",
						caught instanceof Error
							? `${kind} filter cleanup failed ${caught.message}`
							: `${kind} filter cleanup failed ${String(caught)}`,
					),
			);
		},
		[log],
	);

	const submitPortProcessControlCommand = useCallback(
		(transition: CommandTransition<"submit-port-process-control">) => {
			setCommandLine((current) => closeCommandLine(current));
			setPortProcessControlPreview(transition.processControlPreview);
			for (const notice of transition.notices) {
				log(notice.level, notice.message);
			}
			if (transition.kind === "confirmation") {
				log(
					"warn",
					formatControlExecutionAuditMessage(transition.executionPlan),
				);
			}
		},
		[log],
	);

	const openPalettePortProcessControlPreview = useCallback(() => {
		const transition = preparePortProcessControlPalettePreview({
			ports: sortedPorts,
			selectedIndex: selectedPortIndex,
		});
		const preview =
			transition.kind === "preview" ? transition.preview : undefined;
		setScreen(transition.screen);
		setFocusArea(transition.focusArea);
		setPortCopyPreview(transition.copyPreview);
		setPortProcessControlPreview(transition.processControlPreview);
		log("info", formatStatusActivityProcessControlPaletteAuditMessage(preview));
		recordStatusActivityResult(
			createStatusActivityProcessControlPaletteResult(preview),
		);
		if (transition.kind === "preview") {
			setCommandLine(openCommandLine(transition.commandLinePrompt));
		}
		log(transition.notice.level, transition.notice.message);
	}, [log, recordStatusActivityResult, selectedPortIndex, sortedPorts]);

	const submitTimelineSearchCommand = useCallback(
		(transition: CommandTransition<"submit-timeline-search">) => {
			setTimelineSearchQuery(transition.query);
			setTimelineSearchPresets(transition.presets);
			setSelectedTimelineIndex(transition.selectedIndex);
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitTimelineSearchCleanupCommand = useCallback(
		(confirmation: CommandTransition<"submit-timeline-search-cleanup">) => {
			setCommandLine((current) => closeCommandLine(current));
			log(confirmation.notice.level, confirmation.notice.message);
			if (confirmation.action === "notice") {
				return;
			}
			setTimelineSearchPresets(confirmation.presets);
		},
		[log],
	);

	const submitLogSearchCommand = useCallback(
		(transition: CommandTransition<"submit-log-search">) => {
			setLogSearchQuery(transition.query);
			setLogSearchPresets(transition.presets);
			if (transition.query) {
				void setConfigLogSearchPresets(transition.presets).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `logs preset save failed ${caught.message}`
							: `logs preset save failed ${String(caught)}`,
					),
				);
			}
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitLogsCleanupCommand = useCallback(
		(confirmation: CommandTransition<"submit-logs-cleanup">) => {
			setCommandLine((current) => closeCommandLine(current));
			log(confirmation.notice.level, confirmation.notice.message);
			if (confirmation.action === "notice") {
				return;
			}
			setLogSearchPresets(confirmation.presets);
			setLogProfiles(confirmation.profiles);
			void (async () => {
				try {
					await setConfigLogSearchPresets(confirmation.presets);
					await setConfigLogProfiles(confirmation.profiles);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error
							? `logs cleanup save failed ${caught.message}`
							: `logs cleanup save failed ${String(caught)}`,
					);
				}
			})();
		},
		[log],
	);

	const submitControlConfirmationCommand = useCallback(
		(transition: CommandTransition<"submit-control-confirmation">) => {
			const requestToken = beginRequest(actionControlSequenceRef.current);
			actionControlSequenceRef.current = requestToken;
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "confirmation") {
				setActionConfirmation(transition.confirmation);
				setActionSimulation(transition.simulation);
				setActionExecutionPlan(transition.executionPlan);
			}
			for (const notice of transition.notices) {
				log(notice.level, notice.message);
			}
		},
		[log],
	);

	const runControlExecutionAttempt = useCallback(
		async (request: GlobalControlExecutionRequest) => {
			const requestToken = beginRequest(actionControlSequenceRef.current);
			actionControlSequenceRef.current = requestToken;
			const { start } = request;
			if (start.kind === "blocked") {
				log(start.notice.level, start.notice.message);
				return;
			}
			try {
				const config = await readConfig();
				const policy = getControlExecutionPolicyFromConfig(config);
				const transition = prepareControlExecutionTransition({
					previewPlan: request.previewPlan,
					confirmation: request.confirmation,
					platform: request.platform,
					updateCheckResult: request.updateCheckResult,
					policy,
					requestToken,
					currentToken: actionControlSequenceRef.current,
				});
				if (transition.kind === "stale") {
					return;
				}
				setControlExecutionPolicy(policy);
				if (transition.executionPlan) {
					setActionExecutionPlan(transition.executionPlan);
				}
				if (transition.kind === "blocked") {
					log(transition.notice.level, transition.notice.message);
					return;
				}

				const result = await runControlExecutionPlan(transition.executionPlan);
				const publication = classifyControlExecutionResult({
					result,
					requestToken,
					currentToken: actionControlSequenceRef.current,
				});
				log(publication.historyNotice.level, publication.historyNotice.message);
				for (const notice of publication.currentNotices) {
					log(notice.level, notice.message);
				}
			} catch (caught) {
				const publication = classifyControlExecutionFailure({
					actionId: start.actionId,
					error: caught,
					requestToken,
					currentToken: actionControlSequenceRef.current,
				});
				log(publication.historyNotice.level, publication.historyNotice.message);
			}
		},
		[log],
	);

	const submitClipboardCommand = useCallback(
		async (transition: CommandTransition<"submit-clipboard">) => {
			if (transition.kind === "notice") {
				setClipboardConfirmation(transition.state);
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			try {
				const outcome = await submitClipboardWritePlan(transition.plan);
				setClipboardConfirmation(outcome.state);
				setCommandLine((current) => closeCommandLine(current));
				log(outcome.event.level, outcome.event.message);
				if (outcome.result.success) {
					setConnectionCopyPreview(false);
					setPortCopyPreview(false);
					setProcessClipboardPreview(false);
					setRouteCopyPreview(false);
					setInterfaceSourceCopyPreview(false);
					setToolCopyPreview(false);
				}
			} catch (caught) {
				setCommandLine((current) => closeCommandLine(current));
				setClipboardConfirmation(clearClipboardConfirmationState());
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log],
	);

	const goBackFileHistory = useCallback(
		async (transition: ReturnType<typeof prepareFileHistoryNavigation>) => {
			if (transition.action === "none") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			await loadFiles(transition.request);
		},
		[loadFiles, log],
	);

	const goForwardFileHistory = useCallback(
		async (transition: ReturnType<typeof prepareFileHistoryNavigation>) => {
			if (transition.action === "none") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			await loadFiles(transition.request);
		},
		[loadFiles, log],
	);

	const openSelectedFileOperation = useCallback(
		(transition: FileOperationDialogTransition) => {
			setFileOperationDialog(transition.dialog);
			setCommandLine((current) =>
				applyFileOperationCommandLineTransition(
					current,
					transition.commandLine,
				),
			);
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
		},
		[log],
	);

	const submitFileOperationDestinationCommand = useCallback(
		(transition: CommandTransition<"submit-file-operation-destination">) => {
			setFileOperationDialog(transition.dialog);
			setCommandLine((current) =>
				applyFileOperationCommandLineTransition(
					current,
					transition.commandLine,
				),
			);
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
		},
		[log],
	);

	const submitFileOperationConfirmCommand = useCallback(
		async (
			transition: CommandTransition<"submit-file-operation-confirmation">,
		) => {
			setFileOperationDialog(transition.dialog);
			setCommandLine((current) =>
				applyFileOperationCommandLineTransition(
					current,
					transition.commandLine,
				),
			);
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
			if (!transition.execution) {
				return;
			}
			const { plan, provider } = transition.execution;

			const token = beginRequest(fileOperationTokenRef.current);
			fileOperationTokenRef.current = token;
			const result = await runFileOperationExecutionPlan(plan, provider);
			if (isStaleRequest(fileOperationTokenRef.current, token)) {
				return;
			}
			log(
				result.success ? "ok" : "fail",
				`file operation ${plan.kind} status=${result.audit.status} path=${plan.path}`,
			);
			if (result.error) {
				log("warn", result.error);
			}
			if (result.success) {
				await refreshFiles();
			}
		},
		[log, refreshFiles],
	);

	const openClipboardConfirmation = useCallback(
		(preview: ClipboardConfirmationState["preview"]) => {
			const transition = prepareClipboardConfirmationOpen(preview);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setClipboardConfirmation(transition.state);
			setCommandLine(openCommandLine(transition.prompt));
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const openSelectedUpdateHandoffClipboard = useCallback(
		(preview: ClipboardConfirmationState["preview"]) => {
			openClipboardConfirmation(preview);
		},
		[openClipboardConfirmation],
	);

	const openSelectedUpdateHandoffExternal = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "external-open-confirmation" }
			>,
		) => {
			setExternalOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
		},
		[],
	);

	const submitExternalOpenCommand = useCallback(
		async (transition: CommandTransition<"submit-external-open">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			setExternalOpenPlan(plan);
			const result = await runExternalOpenPlan(plan);
			log(
				result.success ? "ok" : "fail",
				`external open ${plan.label} confirmed=${plan.confirmed} adapter=${plan.adapter.command}`,
			);
			if (result.error) {
				log("warn", result.error);
			}
		},
		[log],
	);

	const submitFileOpenCommand = useCallback(
		async (transition: CommandTransition<"submit-file-open">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			setFileOpenPlan(plan);
			const result = await runFileOpenPlan(plan);
			log(
				result.success ? "ok" : "fail",
				`file open ${plan.label} confirmed=${plan.confirmed} adapter=${plan.adapter.command}`,
			);
			if (result.error) {
				log("warn", result.error);
			}
		},
		[log],
	);

	const refreshHandoffIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(handoffIndexRequestTokenRef.current);
			handoffIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readHandoffIndex(baseDir);
				const transition = classifyHandoffIndexRefresh({
					currentRequestToken: handoffIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedHandoffIndexRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setHandoffIndex(transition.index);
					setSelectedHandoffIndex(transition.selectedIndex);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyHandoffIndexRefresh({
					currentRequestToken: handoffIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedHandoffIndexRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const refreshAuditExportIndex = useCallback(
		async (
			announce = true,
			selectionIntent: "preserve" | "newest" = "preserve",
		) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(
				auditExportIndexRequestTokenRef.current,
			);
			auditExportIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readConsoleAuditExportIndex(baseDir);
				const transition = classifyAuditExportIndexRefresh({
					currentRequestToken: auditExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex:
						selectionIntent === "newest"
							? 0
							: selectedAuditExportIndexRef.current,
					announce,
					timelineSourceFilter: timelineEvidenceTrailSourceFilterRef.current,
					interfaceConfirmationAuditArchiveExports:
						interfaceConfirmationAuditArchiveExportsRef.current,
					interfaceStateFilter: interfaceEvidenceStateFilterRef.current,
					interfaceQuery: interfaceEvidenceQueryRef.current,
					recoveredSelections: {
						timeline: selectedTimelineEvidenceTrailAuditExportIndexRef.current,
						process: selectedProcessControlAuditExportIndexRef.current,
						remoteKnownHosts:
							selectedRemoteKnownHostsSelectionAuditExportIndexRef.current,
						interface: selectedInterfaceConfirmationAuditExportIndexRef.current,
					},
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setAuditExportIndex(transition.index);
					setSelectedAuditExportIndex(transition.selectedIndex);
					setLastStatusActivityCopyIntentAuditExport(
						transition.lastStatusActivityCopyIntentAuditExport,
					);
					setTimelineEvidenceTrailAuditExports(
						transition.timelineEvidenceTrailAuditExports,
					);
					setLastTimelineEvidenceTrailAuditExport(
						transition.latestTimelineEvidenceTrailAuditExport,
					);
					setSelectedTimelineEvidenceTrailAuditExportIndex(
						transition.selectedTimelineIndex,
					);
					setProcessControlAuditExports(transition.processControlAuditExports);
					setSelectedProcessControlAuditExportIndex(
						transition.selectedProcessIndex,
					);
					setRemoteKnownHostsSelectionAuditExports(
						transition.remoteKnownHostsSelectionAuditExports,
					);
					setSelectedRemoteKnownHostsSelectionAuditExportIndex(
						transition.selectedRemoteKnownHostsIndex,
					);
					setInterfaceConfirmationAuditExports(
						transition.interfaceConfirmationAuditExports,
					);
					interfaceConfirmationAuditExportsRef.current =
						transition.interfaceConfirmationAuditExports;
					selectedInterfaceConfirmationAuditExportIndexRef.current =
						transition.selectedInterfaceIndex;
					setSelectedInterfaceConfirmationAuditExportIndex(
						transition.selectedInterfaceIndex,
					);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyAuditExportIndexRefresh({
					currentRequestToken: auditExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex:
						selectionIntent === "newest"
							? 0
							: selectedAuditExportIndexRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const refreshAuditExportArchiveIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(
				auditExportArchiveIndexRequestTokenRef.current,
			);
			auditExportArchiveIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readConsoleAuditExportArchiveIndex(baseDir);
				const transition = classifyAuditExportArchiveIndexRefresh({
					currentRequestToken: auditExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedAuditExportArchiveIndexRef.current,
					selectedInterfaceIndex:
						selectedInterfaceConfirmationAuditExportIndexRef.current,
					interfaceStateFilter: interfaceEvidenceStateFilterRef.current,
					interfaceQuery: interfaceEvidenceQueryRef.current,
					interfaceConfirmationAuditExports:
						interfaceConfirmationAuditExportsRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setAuditExportArchiveIndex(transition.index);
					setSelectedAuditExportArchiveIndex(transition.selectedIndex);
					setInterfaceConfirmationAuditArchiveExports(
						transition.interfaceConfirmationAuditArchiveExports,
					);
					interfaceConfirmationAuditArchiveExportsRef.current =
						transition.interfaceConfirmationAuditArchiveExports;
					selectedInterfaceConfirmationAuditExportIndexRef.current =
						transition.selectedInterfaceIndex;
					setSelectedInterfaceConfirmationAuditExportIndex(
						transition.selectedInterfaceIndex,
					);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyAuditExportArchiveIndexRefresh({
					currentRequestToken: auditExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedAuditExportArchiveIndexRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const openSelectedHandoffFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedAuditExportFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedAuditExportArchiveFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openAuditArchiveRetentionPreview = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "plan-confirmation" }
			>,
		) => {
			setAuditArchiveRetentionScope("all");
			setAuditArchiveRetentionPlan(
				effect.plan as ConsoleAuditArchiveRetentionPlan,
			);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openInterfaceAuditArchiveRetentionPreview = useCallback(() => {
		const transition = prepareStatusEvidenceActionTransition({
			indexes: statusEvidenceIndexes,
			selection: {
				...statusEvidenceSelection,
				interfaceEvidenceStateFilter: "archived",
			},
			kind: "interface",
			intent: "retention",
			baseDir: auditExportArchiveIndex.baseDir,
			retentionLimit: auditArchiveRetentionLimit,
		});
		log(transition.notice.level, transition.notice.message);
		if (
			transition.kind !== "confirmation" ||
			transition.plan.confirmationPhrase !== "prune audit archive"
		) {
			return;
		}
		setAuditArchiveRetentionScope("interface");
		setAuditArchiveRetentionPlan(transition.plan);
		setExternalOpenPlan(undefined);
		setFileOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("audit-archive-retention"));
		setScreen("status");
		setSelectedStatusEvidenceKind("interface");
	}, [
		auditArchiveRetentionLimit,
		auditExportArchiveIndex.baseDir,
		log,
		statusEvidenceIndexes,
		statusEvidenceSelection,
	]);

	const openSelectedAuditExportArchive = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "plan-confirmation" }
			>,
		) => {
			setAuditExportArchivePlan(effect.plan as ConsoleAuditExportArchivePlan);
			setAuditExportArchiveScope(
				effect.scope === "interface" ? "interface" : "all",
			);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedInterfaceEvidenceArchive = useCallback(() => {
		const transition = prepareStatusEvidenceActionTransition({
			indexes: statusEvidenceIndexes,
			selection: statusEvidenceSelection,
			kind: "interface",
			intent: "archive",
			baseDir: auditExportIndex.baseDir,
		});
		log(transition.notice.level, transition.notice.message);
		if (
			transition.kind !== "confirmation" ||
			transition.plan.confirmationPhrase !== "archive audit export"
		) {
			return;
		}
		setSelectedInterfaceConfirmationAuditExportIndex(transition.selectedIndex);
		setAuditExportArchivePlan(transition.plan);
		setAuditExportArchiveScope("interface");
		setExternalOpenPlan(undefined);
		setFileOpenPlan(undefined);
		setAuditArchiveRetentionPlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("audit-export-archive"));
		setScreen("status");
		setSelectedStatusEvidenceKind("interface");
	}, [
		auditExportIndex.baseDir,
		log,
		statusEvidenceIndexes,
		statusEvidenceSelection,
	]);

	const openSelectedCleanupExportFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedToolExportFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedToolExportArchiveFile = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "open-file-confirmation" }
			>,
		) => {
			setFileOpenPlan(effect.plan);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const openSelectedStatusActivityToolsEvidenceSearchMatchFile =
		useCallback(() => {
			const transition = prepareStatusActivityToolsEvidenceMatchOpen(
				statusActivityToolsEvidenceSearchRecovery,
				selectedStatusActivityToolsEvidenceSearchMatchIndex,
				{
					baseDir: dirname(getConfigPath()),
					platform: currentPlatform(),
				},
			);
			setSelectedStatusActivityToolsEvidenceSearchMatchIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			log("info", transition.auditMessage);
			recordStatusActivityResult(transition.result);
			if (transition.kind === "notice") {
				return;
			}
			setFileOpenPlan(transition.plan);
			setExternalOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setToolExportArchivePlan(undefined);
			setToolArchiveRetentionPlan(undefined);
			setCommandLine(openCommandLine("file-open"));
			setScreen("status");
		}, [
			log,
			recordStatusActivityResult,
			selectedStatusActivityToolsEvidenceSearchMatchIndex,
			statusActivityToolsEvidenceSearchRecovery,
		]);

	const openSelectedStatusActivityToolsEvidenceSearchMatchArchive =
		useCallback(() => {
			const transition = prepareStatusActivityToolsEvidenceMatchArchive(
				statusActivityToolsEvidenceSearchRecovery,
				selectedStatusActivityToolsEvidenceSearchMatchIndex,
				{ baseDir: dirname(getConfigPath()) },
			);
			setSelectedStatusActivityToolsEvidenceSearchMatchIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			log("info", transition.auditMessage);
			recordStatusActivityResult(transition.result);
			if (transition.kind === "notice") {
				return;
			}
			setToolExportArchivePlan(transition.plan);
			setExternalOpenPlan(undefined);
			setFileOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setToolArchiveRetentionPlan(undefined);
			setCommandLine(openCommandLine("tool-export-archive"));
			setScreen("status");
		}, [
			log,
			recordStatusActivityResult,
			selectedStatusActivityToolsEvidenceSearchMatchIndex,
			statusActivityToolsEvidenceSearchRecovery,
		]);

	const openSelectedToolExportArchive = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareSelectedToolHistoryExportArchive({
				baseDir: dirname(getConfigPath()),
				index: toolExportIndex,
				selectedIndex: selectedToolExportIndex,
				filter: toolExportFilter,
				query: toolExportQuery,
			});
			log(transition.notice.level, transition.notice.message);
			if (transition.kind === "notice") {
				if (options.origin === "palette") {
					log(
						"info",
						formatStatusActivityToolsEvidencePaletteAuditMessage("archive"),
					);
					recordStatusActivityResult(
						createStatusActivityToolsEvidencePaletteResult("archive"),
					);
				}
				return;
			}
			setSelectedToolExportIndex(transition.selectedIndex);
			setToolExportArchivePlan(transition.plan);
			setExternalOpenPlan(undefined);
			setFileOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setToolArchiveRetentionPlan(undefined);
			setCommandLine(openCommandLine("tool-export-archive"));
			setScreen("status");
			if (options.origin === "palette") {
				const resultOptions = {
					fileName: transition.item.fileName,
					path: transition.item.path,
					selectedIndex: transition.selectedIndex,
					total: toolExportIndex.items.length,
				};
				log(
					"info",
					formatStatusActivityToolsEvidencePaletteAuditMessage(
						"archive",
						resultOptions,
					),
				);
				recordStatusActivityResult(
					createStatusActivityToolsEvidencePaletteResult(
						"archive",
						resultOptions,
					),
				);
			}
		},
		[
			log,
			recordStatusActivityResult,
			selectedToolExportIndex,
			toolExportFilter,
			toolExportIndex,
			toolExportQuery,
		],
	);

	const openToolArchiveRetentionPreview = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareStatusEvidenceActionTransition({
				indexes: statusEvidenceIndexes,
				selection: statusEvidenceSelection,
				kind: "tools-archive",
				intent: "retention",
				baseDir: dirname(getConfigPath()),
				retentionLimit: auditArchiveRetentionLimit,
			});
			log(transition.notice.level, transition.notice.message);
			if (
				transition.kind !== "confirmation" ||
				transition.plan.confirmationPhrase !== "prune tools archive"
			) {
				return;
			}
			const plan = transition.plan;
			setToolArchiveRetentionPlan(plan);
			setExternalOpenPlan(undefined);
			setFileOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setToolExportArchivePlan(undefined);
			setCommandLine(openCommandLine("tools-archive-retention"));
			setScreen("status");
			if (options.origin === "palette") {
				const resultOptions = {
					candidateCount: plan.candidateItems.length,
					maxItems: plan.maxItems,
				};
				log(
					"info",
					formatStatusActivityToolsEvidencePaletteAuditMessage(
						"retention",
						resultOptions,
					),
				);
				recordStatusActivityResult(
					createStatusActivityToolsEvidencePaletteResult(
						"retention",
						resultOptions,
					),
				);
			}
		},
		[
			auditArchiveRetentionLimit,
			log,
			recordStatusActivityResult,
			statusEvidenceIndexes,
			statusEvidenceSelection,
		],
	);

	const cycleToolEvidenceFilter = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareToolEvidenceFilterCycle({
				origin: options.origin,
				selectedKind:
					selectedStatusEvidenceKind === "tools-archive"
						? "tools-archive"
						: "tools",
				filter:
					selectedStatusEvidenceKind === "tools-archive"
						? toolExportArchiveFilter
						: toolExportFilter,
			});
			if (transition.target === "archive") {
				setToolExportArchiveFilter(transition.filter);
				setSelectedToolExportArchiveIndex(transition.selectedIndex);
			} else {
				setToolExportFilter(transition.filter);
				setSelectedToolExportIndex(transition.selectedIndex);
			}
			setSelectedStatusEvidenceKind(transition.selectedKind);
			log(transition.notice.level, transition.notice.message);
		},
		[
			log,
			selectedStatusEvidenceKind,
			toolExportArchiveFilter,
			toolExportFilter,
		],
	);

	const openToolEvidenceSearchPrompt = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareToolEvidenceSearchPrompt(
				selectedStatusEvidenceKind === "tools-archive"
					? "tools-archive"
					: "tools",
				options.origin,
			);
			setToolEvidenceSearchScope(transition.selectedKind);
			setCommandLine(openCommandLine(transition.prompt));
			setScreen(transition.screen);
			setFocusArea(transition.focusArea);
			log(transition.notice.level, transition.notice.message);
		},
		[log, selectedStatusEvidenceKind],
	);

	const submitToolEvidenceSearchCommand = useCallback(
		(transition: CommandTransition<"submit-tools-evidence-search">) => {
			if (transition.target === "archive") {
				setToolExportArchiveQuery(transition.query);
				setSelectedToolExportArchiveIndex(transition.selectedIndex);
			} else {
				setToolExportQuery(transition.query);
				setSelectedToolExportIndex(transition.selectedIndex);
			}
			setSelectedStatusEvidenceKind(transition.selectedKind);
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
			recordStatusActivityResult(transition.result);
		},
		[log, recordStatusActivityResult],
	);

	const cycleInterfaceEvidenceStateFilter = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareInterfaceEvidenceStateFilterCycle({
				origin: options.origin,
				state: interfaceEvidenceStateFilter,
				query: interfaceEvidenceQuery,
				activeExports: interfaceConfirmationAuditExports,
				archivedExports: interfaceConfirmationAuditArchiveExports,
			});
			setInterfaceEvidenceStateFilter(transition.state);
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			setSelectedStatusEvidenceKind(transition.selectedKind);
			setScreen(transition.screen);
			setFocusArea(transition.focusArea);
			log(transition.notice.level, transition.notice.message);
			recordStatusActivityResult(transition.result);
		},
		[
			interfaceConfirmationAuditArchiveExports,
			interfaceConfirmationAuditExports,
			interfaceEvidenceQuery,
			interfaceEvidenceStateFilter,
			log,
			recordStatusActivityResult,
		],
	);

	const openInterfaceEvidenceSearchPrompt = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareInterfaceEvidenceSearchPrompt(
				interfaceEvidenceQuery,
				options.origin,
			);
			setCommandLine(
				openCommandLine(transition.prompt, { value: transition.value }),
			);
			setSelectedStatusEvidenceKind(transition.selectedKind);
			setScreen(transition.screen);
			setFocusArea(transition.focusArea);
			log(transition.notice.level, transition.notice.message);
		},
		[interfaceEvidenceQuery, log],
	);

	const submitInterfaceEvidenceSearchCommand = useCallback(
		(transition: CommandTransition<"submit-interface-evidence-search">) => {
			setInterfaceEvidenceQuery(transition.query);
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			setSelectedStatusEvidenceKind(transition.selectedKind);
			setCommandLine((current) => closeCommandLine(current));
			log(transition.notice.level, transition.notice.message);
			recordStatusActivityResult(transition.result);
		},
		[log, recordStatusActivityResult],
	);

	const saveCurrentInterfaceEvidenceSearchPreset = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareInterfaceEvidencePresetSave(
				interfaceEvidenceQuery,
				interfaceEvidenceSearchPresets,
			);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setInterfaceEvidenceSearchPresets(transition.presets);
			void setConfigInterfaceEvidenceSearchPresets(transition.presets).catch(
				(caught) =>
					log(
						"fail",
						caught instanceof Error ? caught.message : String(caught),
					),
			);
			log(
				transition.notice.level,
				`${transition.notice.message}${options.origin === "palette" ? " via palette" : ""}`,
			);
		},
		[interfaceEvidenceQuery, interfaceEvidenceSearchPresets, log],
	);

	const cycleInterfaceEvidenceSearchPreset = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareInterfaceEvidencePresetCycle({
				query: interfaceEvidenceQuery,
				presets: interfaceEvidenceSearchPresets,
				state: interfaceEvidenceStateFilter,
				activeExports: interfaceConfirmationAuditExports,
				archivedExports: interfaceConfirmationAuditArchiveExports,
				origin: options.origin,
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setInterfaceEvidenceQuery(transition.query);
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			setSelectedStatusEvidenceKind(transition.selectedKind);
			setScreen(transition.screen);
			setFocusArea(transition.focusArea);
			log(transition.notice.level, transition.notice.message);
			recordStatusActivityResult(transition.result);
		},
		[
			interfaceConfirmationAuditArchiveExports,
			interfaceConfirmationAuditExports,
			interfaceEvidenceQuery,
			interfaceEvidenceSearchPresets,
			interfaceEvidenceStateFilter,
			log,
			recordStatusActivityResult,
		],
	);

	const openSelectedCleanupExportArchive = useCallback(
		(
			effect: Extract<
				StatusWorkspaceInputEffect,
				{ kind: "plan-confirmation" }
			>,
		) => {
			setCleanupExportArchivePlan(
				effect.plan as CleanupHandoffHistoryExportArchivePlan,
			);
			setCommandLine(openCommandLine(effect.prompt));
			setScreen(effect.screen);
		},
		[],
	);

	const archiveSelectedHandoffFile = useCallback(
		async (effect: StatusHandoffArchiveEffect) => {
			try {
				const result = await archiveHandoffFile(effect.baseDir, effect.path);
				const notice = formatStatusHandoffArchiveResult(effect, result);
				log(notice.level, notice.message);
				return result.status === "archived";
			} catch (caught) {
				const notice = formatStatusHandoffArchiveFailure(effect, caught);
				log(notice.level, notice.message);
				return false;
			}
		},
		[log],
	);

	const exportToolHistory = useCallback(
		async (effect: Extract<ToolsWorkspaceInputEffect, { kind: "export" }>) => {
			log(effect.notice.level, effect.notice.message);
			const requestToken = beginRequest(toolExportIndexRequestTokenRef.current);
			toolExportIndexRequestTokenRef.current = requestToken;
			try {
				const written = await writeToolHistoryExport(effect.plan);
				const index = await readToolHistoryExportIndex(
					effect.publication.baseDir,
				);
				const publication = classifyToolHistoryExportIndexRefresh({
					target: effect.publication.target,
					currentRequestToken: toolExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: effect.publication.selectedIndex,
					filter: effect.publication.filter,
					query: effect.publication.query,
					outcome: { status: "success", index },
				});
				if (publication.status === "success") {
					setToolExportIndex(publication.index);
					setSelectedToolExportIndex(publication.selectedIndex);
					setSelectedStatusEvidenceKind("tools");
					setScreen("tools");
				}
				log(
					"ok",
					`tools exported ${written.scope} ${written.itemCount} run(s) ${written.path}`,
				);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log],
	);

	const exportRouteHandoff = useCallback(
		async (handoff: Extract<RoutePanelHandoffEffect, { action: "export" }>) => {
			try {
				const written = await writeRouteRawHandoffPlan(handoff.plan);
				await refreshHandoffIndex(false);
				setScreen("routes");
				log("ok", `routes exported ${written.view} ${written.path}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const exportInterfaceSourceHandoff = useCallback(
		async (
			handoff: Extract<InterfacePanelInputDecision, { kind: "source-handoff" }>,
		) => {
			setSelectedInterfaceIndex(handoff.selectedIndex);
			try {
				const written = await writeInterfaceSourceHandoffPlan(handoff.plan);
				await refreshHandoffIndex(false);
				setScreen("interfaces");
				log("ok", `interfaces exported source ${written.path}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const openInterfaceSourceHandoff = useCallback(
		async (
			handoff: Extract<InterfacePanelInputDecision, { kind: "source-handoff" }>,
		) => {
			setSelectedInterfaceIndex(handoff.selectedIndex);
			try {
				const written = await writeInterfaceSourceHandoffPlan(handoff.plan);
				await refreshHandoffIndex(false);
				const plan = buildFileOpenPlan({
					baseDir: handoff.baseDir,
					source: "interface-handoff",
					label: written.label,
					path: written.path,
					platform: currentPlatform(),
				});
				setFileOpenPlan(plan);
				setExternalOpenPlan(undefined);
				setCommandLine(openCommandLine("file-open"));
				setScreen("status");
				log("info", `file open confirmation opened for ${written.label}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const openRouteHandoff = useCallback(
		async (handoff: Extract<RoutePanelHandoffEffect, { action: "open" }>) => {
			try {
				const written = await writeRouteRawHandoffPlan(handoff.plan);
				await refreshHandoffIndex(false);
				const plan = buildFileOpenPlan({
					baseDir: handoff.baseDir,
					source: "route-handoff",
					label: written.label,
					origin: handoff.origin,
					path: written.path,
					platform: currentPlatform(),
				});
				setFileOpenPlan(plan);
				setExternalOpenPlan(undefined);
				setCommandLine(openCommandLine("file-open"));
				setScreen("status");
				log("info", `file open confirmation opened for ${written.label}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const exportEndpointHandoff = useCallback(
		async (
			kind: "connections" | "ports",
			handoff: EndpointHandoffInputSnapshot,
		) => {
			const { origin: _origin, ...exportInput } = handoff;
			const transition = prepareEndpointHandoffForKind({
				kind,
				...exportInput,
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}

			try {
				const written = await writeEndpointHandoffPlan(transition.plan);
				await refreshHandoffIndex(false);
				setScreen(kind);
				log("ok", `${kind} exported ${written.view} ${written.path}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const openEndpointHandoff = useCallback(
		async (
			kind: "connections" | "ports",
			handoff: EndpointHandoffInputSnapshot,
		) => {
			const { baseDir } = handoff;
			const transition = prepareEndpointHandoffForKind({
				kind,
				...handoff,
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}

			try {
				const written = await writeEndpointHandoffPlan(transition.plan);
				await refreshHandoffIndex(false);
				const plan = buildFileOpenPlan({
					baseDir,
					source: "endpoint-handoff",
					label: written.label,
					origin: written.origin ?? handoff.origin,
					path: written.path,
					platform: currentPlatform(),
				});
				setFileOpenPlan(plan);
				setExternalOpenPlan(undefined);
				setCommandLine(openCommandLine("file-open"));
				setScreen("status");
				log("info", `file open confirmation opened for ${written.label}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log, refreshHandoffIndex],
	);

	const selectRemoteProfile = useCallback(
		async (transition: ReturnType<typeof prepareRemoteProfileStage>) => {
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const profile = transition.profile;
			setSelectedRemoteIndex(transition.selectedIndex);
			pendingRemoteConnectRef.current?.abort();
			const context = await createRemoteFileContext(profile);
			if (remoteFileProvider) {
				if (
					!(await loadFiles(
						{
							path: systemFileRoot,
							backHistory: [],
							forwardHistory: [],
							failurePrefix: "local filesystem restore failed",
						},
						{
							switchSession: {
								provider: localFileProvider,
								remoteContext: context,
							},
						},
					))
				) {
					return;
				}
				try {
					await remoteFileProvider.close?.();
				} catch (caught) {
					log(
						"warn",
						caught instanceof Error
							? `previous SFTP session close failed ${caught.message}`
							: `previous SFTP session close failed ${String(caught)}`,
					);
				}
			} else {
				setRemoteFileContext(context);
			}
			setScreen("files");
			setFocusArea("workspaces");
			log("info", formatRemoteHostReviewAuditMessage("stage", profile));
			recordStatusActivityResult(
				createRemoteHostReviewStatusActivityResult(profile),
			);
			log("info", `remote context selected ${context.label}`);
		},
		[
			localFileProvider,
			loadFiles,
			log,
			recordStatusActivityResult,
			remoteFileProvider,
			systemFileRoot,
		],
	);

	const submitRemoteProfileCommand = useCallback(
		async (transition: CommandTransition<"submit-remote-profile">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const profile = transition.profile;
			const requestSaveToken = beginRequest(remoteProfileSaveTokenRef.current);
			remoteProfileSaveTokenRef.current = requestSaveToken;
			const connectionRunTokenAtStart = remoteConnectionRunTokenRef.current;
			const pendingConnectionAtStart = pendingRemoteConnectRef.current;

			try {
				const nextConfig = await upsertConfigRemoteProfile(profile);
				const publication = classifyRemoteProfileSavePublication({
					currentSaveToken: remoteProfileSaveTokenRef.current,
					requestSaveToken,
					connectionRunTokenAtStart,
					currentConnectionRunToken: remoteConnectionRunTokenRef.current,
					ownsPendingConnectionAtStart: Boolean(
						pendingConnectionAtStart &&
							pendingRemoteConnectRef.current === pendingConnectionAtStart,
					),
				});
				if (!publication.publishConfig) {
					log("info", `remote profile ${profile.id} saved publication=stale`);
					return;
				}
				syncConfigSessionState(nextConfig);
				if (!publication.publishSession) {
					log(transition.successNotice.level, transition.successNotice.message);
					log("info", "newer remote connection preserved after profile save");
					return;
				}
				if (publication.abortPendingConnection) {
					pendingConnectionAtStart?.abort();
				}
				if (remoteFileProvider) {
					if (
						!(await loadFiles(
							{
								path: systemFileRoot,
								backHistory: [],
								forwardHistory: [],
								failurePrefix: "local filesystem restore failed",
							},
							{
								switchSession: {
									provider: localFileProvider,
								},
							},
						))
					) {
						return;
					}
					try {
						await remoteFileProvider.close?.();
					} catch (caught) {
						log(
							"warn",
							caught instanceof Error
								? `previous SFTP session close failed ${caught.message}`
								: `previous SFTP session close failed ${String(caught)}`,
						);
					}
				} else {
					setRemoteFileContext(undefined);
				}
				setSelectedRemoteIndex(transition.selectedIndex);
				setScreen("remotes");
				setFocusArea("workspaces");
				log(transition.successNotice.level, transition.successNotice.message);
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `remote profile save failed ${caught.message}`
						: `remote profile save failed ${String(caught)}`,
				);
			}
		},
		[
			localFileProvider,
			loadFiles,
			log,
			remoteFileProvider,
			syncConfigSessionState,
			systemFileRoot,
		],
	);

	const submitRemoteConnectCommand = useCallback(
		async (transition: CommandTransition<"submit-remote-connect">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			setSelectedRemoteIndex(transition.selectedIndex);
			if (transition.kind === "blocked") {
				if (transition.auditMessage) {
					log("warn", transition.auditMessage);
				}
				if (transition.activityResult) {
					recordStatusActivityResult(transition.activityResult);
				}
				log(transition.notice.level, transition.notice.message);
				return;
			}

			const { candidate, profile } = transition;
			const preview = transition.confirmation.preview;
			const runToken = beginRequest(remoteConnectionRunTokenRef.current);
			remoteConnectionRunTokenRef.current = runToken;
			activeRemoteConnectionRunTokenRef.current = runToken;
			const diagnosticSequence = beginRequest(
				remoteConnectionDiagnosticSequenceRef.current,
			);
			remoteConnectionDiagnosticSequenceRef.current = diagnosticSequence;
			const connectController = new AbortController();
			pendingRemoteConnectRef.current = connectController;
			const { attemptDiagnostic } = transition;
			remoteConnectionDiagnosticRef.current = attemptDiagnostic;
			setRemoteConnectionDiagnostic(attemptDiagnostic);
			const classifyConnectedAttempt = (target: string, message: string) =>
				classifyRemoteConnectionPublication({
					currentDiagnosticSequence:
						remoteConnectionDiagnosticSequenceRef.current,
					requestDiagnosticSequence: diagnosticSequence,
					currentRunToken:
						activeRemoteConnectionRunTokenRef.current ?? Number.NaN,
					requestRunToken: runToken,
					attempt: attemptDiagnostic,
					currentDiagnostic: remoteConnectionDiagnosticRef.current,
					connectionAborted: connectController.signal.aborted,
					ownsPendingConnection:
						pendingRemoteConnectRef.current === connectController,
					outcome: {
						status: "connected",
						id: profile.id,
						target,
						host: profile.host,
						port: profile.port,
						fingerprint: candidate.fingerprint,
						message,
					},
				});
			beginCommand();
			let pendingProvider: FileProvider | undefined;
			try {
				pendingProvider = await connectReadOnlySftpFileProvider(profile, {
					expectedHostKeyFingerprint: candidate.fingerprint,
					signal: connectController.signal,
				});
				if (
					!classifyConnectedAttempt(
						preview.target,
						"read-only SFTP transport connected",
					).publishCurrent
				) {
					throw new ReadOnlySftpConnectionCancelledError();
				}
				pendingRemoteFileProviderRef.current = pendingProvider;
				const root = await pendingProvider.pwd();
				if (
					!classifyConnectedAttempt(root, "read-only SFTP root resolved")
						.publishCurrent
				) {
					throw new ReadOnlySftpConnectionCancelledError();
				}
				const entries = await pendingProvider.list(root);
				if (
					!classifyConnectedAttempt(
						root,
						`read-only SFTP listing loaded entries=${entries.length}`,
					).publishCurrent
				) {
					throw new ReadOnlySftpConnectionCancelledError();
				}
				const connectedContext: RemoteFileContext = {
					id: profile.id,
					kind: "sftp",
					label: profile.id,
					root,
					status: "connected read-only",
					writes: "locked",
					hostKeyFingerprint: candidate.fingerprint,
				};
				const switched = await loadFiles(
					{ path: root, backHistory: [], forwardHistory: [] },
					{
						batch: { resolvedRoot: root, entries },
						switchSession: {
							provider: pendingProvider,
							remoteProvider: pendingProvider,
							remoteContext: connectedContext,
						},
					},
				);
				if (!switched) {
					throw new Error("SFTP provider switch was superseded or failed");
				}
				const publication = classifyConnectedAttempt(
					root,
					`read-only SFTP connected entries=${entries.length}`,
				);
				if (!publication.publishCurrent || !publication.diagnostic) {
					throw new ReadOnlySftpConnectionCancelledError();
				}
				if (pendingRemoteFileProviderRef.current === pendingProvider) {
					pendingRemoteFileProviderRef.current = undefined;
				}
				pendingProvider = undefined;
				pendingRemoteConnectRef.current = undefined;
				activeRemoteConnectionRunTokenRef.current = undefined;
				setScreen("files");
				setFocusArea("files");
				remoteConnectionDiagnosticRef.current = publication.diagnostic;
				setRemoteConnectionDiagnostic(publication.diagnostic);
				log(publication.notice.level, publication.notice.message);
				recordStatusActivityResult(publication.activityResult);
				if (remoteFileProvider) {
					try {
						await remoteFileProvider.close?.();
					} catch (caught) {
						log(
							"warn",
							caught instanceof Error
								? `previous SFTP session close failed ${caught.message}`
								: `previous SFTP session close failed ${String(caught)}`,
						);
					}
				}
			} catch (caught) {
				try {
					await pendingProvider?.close?.();
				} catch {
					// The original connection failure is the useful diagnostic.
				}
				if (pendingRemoteFileProviderRef.current === pendingProvider) {
					pendingRemoteFileProviderRef.current = undefined;
				}
				const cancelled =
					connectController.signal.aborted ||
					isReadOnlySftpConnectionCancelledError(caught);
				const message = cancelled
					? "SFTP connection cancelled by operator"
					: caught instanceof Error
						? caught.message
						: String(caught);
				const outcome = {
					status: cancelled ? ("cancelled" as const) : ("failed" as const),
					id: profile.id,
					target: preview.target,
					host: profile.host,
					port: profile.port,
					fingerprint: candidate.fingerprint,
					message,
				};
				const publication = classifyRemoteConnectionPublication({
					currentDiagnosticSequence:
						remoteConnectionDiagnosticSequenceRef.current,
					requestDiagnosticSequence: diagnosticSequence,
					currentRunToken:
						activeRemoteConnectionRunTokenRef.current ?? Number.NaN,
					requestRunToken: runToken,
					attempt: attemptDiagnostic,
					currentDiagnostic: remoteConnectionDiagnosticRef.current,
					outcome,
				});
				if (publication.publishCurrent && publication.diagnostic) {
					remoteConnectionDiagnosticRef.current = publication.diagnostic;
					setRemoteConnectionDiagnostic(publication.diagnostic);
				}
				// Failure/cancellation is history even when superseded; only the visible
				// diagnostic publication is sequence/token guarded.
				log(publication.notice.level, publication.notice.message);
				recordStatusActivityResult(publication.activityResult);
			} finally {
				if (pendingRemoteConnectRef.current === connectController) {
					pendingRemoteConnectRef.current = undefined;
				}
				if (activeRemoteConnectionRunTokenRef.current === runToken) {
					activeRemoteConnectionRunTokenRef.current = undefined;
				}
				// Unconditional, unlike the pointer cleanup above: the count has to
				// balance even when a newer connect superseded this one, or the shared
				// indicator strands on running for the rest of the session.
				endCommand();
			}
		},
		[
			beginCommand,
			endCommand,
			loadFiles,
			log,
			recordStatusActivityResult,
			remoteFileProvider,
		],
	);

	const cancelPendingRemoteConnect = useCallback(() => {
		const controller = pendingRemoteConnectRef.current;
		const transition = prepareRemoteConnectionCancellation({
			diagnostic: remoteConnectionDiagnosticRef.current,
			activeRunToken: activeRemoteConnectionRunTokenRef.current,
			currentRunToken: remoteConnectionRunTokenRef.current,
			hasPendingConnection: Boolean(controller && !controller.signal.aborted),
		});
		if (transition.kind === "notice") {
			log(transition.notice.level, transition.notice.message);
			return;
		}
		controller?.abort();
		void pendingRemoteFileProviderRef.current?.close?.().catch(() => undefined);
		remoteConnectionDiagnosticRef.current = transition.diagnostic;
		setRemoteConnectionDiagnostic(transition.diagnostic);
		log(transition.notice.level, transition.notice.message);
	}, [log]);

	const cancelOperationRun = useCallback(
		(transition: ReturnType<typeof prepareOperationRunCancellation>) => {
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			operationRunCancelledTokenRef.current = transition.cancelledToken;
			operationRunRef.current = transition.progress;
			setOperationRun(transition.progress);
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const runSelectedOperationPreset = useCallback(
		async (start: ReturnType<typeof prepareOperationRunStart>) => {
			if (start.kind === "notice") {
				log(start.notice.level, start.notice.message);
				return;
			}
			const { preset, token } = start;
			operationRunTokenRef.current = token;
			operationRunRef.current = start.progress;
			setOperationRun(start.progress);
			beginCommand();
			let requestProgress = start.progress;
			try {
				log(start.audit.level, start.audit.message);
				let returned = 0;
				if (preset.kind === "monitor") {
					const series = await collectSystemMonitorSeries(
						{ samples: preset.samples, intervalMs: preset.intervalMs },
						getSystemMonitorSnapshot,
						undefined,
						undefined,
						// `shouldContinue` runs after each sample, which is also the only
						// point where progress is observable, so it doubles as the progress
						// hook rather than widening the core API with a second callback.
						() => {
							returned += 1;
							const publication = prepareOperationRunProgressPublication({
								activeToken: operationRunTokenRef.current,
								requestToken: token,
								progress: requestProgress,
								currentProgress: operationRunRef.current,
								returnedCount: returned,
							});
							requestProgress = publication.progress;
							if (publication.publishCurrent) {
								operationRunRef.current = publication.progress;
								setOperationRun(publication.progress);
							}
							return (
								classifyOperationRunContinuation({
									activeToken: operationRunTokenRef.current,
									requestToken: token,
									cancelledToken: operationRunCancelledTokenRef.current,
								}) === "continue"
							);
						},
					);
					returned = series.samples.length;
					const terminal = prepareMonitorOperationRunCompletion({
						activeToken: operationRunTokenRef.current,
						requestToken: token,
						cancelledToken: operationRunCancelledTokenRef.current,
						progress: requestProgress,
						returnedCount: returned,
						collectorCancelled: series.cancelled,
					});
					if (terminal.kind === "stale") {
						log(terminal.notice.level, terminal.notice.message);
						return;
					}
					requestProgress = terminal.progress;
					setSystemMonitor(series.samples.at(-1));
					operationRunRef.current = terminal.progress;
					setOperationRun(terminal.progress);
					log(terminal.audit.level, terminal.audit.message);
					const result = createOperationRunStatusActivityResult(
						terminal.progress,
					);
					if (result) recordStatusActivityResult(result);
					return;
				}

				let terminal: OperationRunTerminalTransition;
				if (preset.kind === "logs") {
					const snapshot = await createOsLogSnapshot({ limit: preset.limit });
					terminal = prepareOperationRunCompletion({
						activeToken: operationRunTokenRef.current,
						requestToken: token,
						progress: requestProgress,
						returnedCount: 1,
						preset,
					});
					if (terminal.kind === "stale") {
						log(terminal.notice.level, terminal.notice.message);
						return;
					}
					setOsLogs(snapshot);
					setLogLevelFilter(preset.level);
					setLogSearchQuery(preset.filter);
				} else {
					const detail = await getProcessDetail(String(preset.pid));
					terminal = prepareOperationRunCompletion({
						activeToken: operationRunTokenRef.current,
						requestToken: token,
						progress: requestProgress,
						returnedCount: 1,
						preset,
					});
					if (terminal.kind === "stale") {
						log(terminal.notice.level, terminal.notice.message);
						return;
					}
					setSelectedProcessDetail(detail);
					const identityNotice = prepareOperationProcessIdentityNotice(
						preset,
						detail,
					);
					if (identityNotice) {
						log(identityNotice.level, identityNotice.message);
					}
				}
				requestProgress = terminal.progress;
				operationRunRef.current = terminal.progress;
				setOperationRun(terminal.progress);
				log(terminal.audit.level, terminal.audit.message);
				const result = createOperationRunStatusActivityResult(
					terminal.progress,
				);
				if (result) recordStatusActivityResult(result);
			} catch (caught) {
				const failure = prepareOperationRunFailure({
					activeToken: operationRunTokenRef.current,
					requestToken: token,
					progress: requestProgress,
					error: caught,
				});
				if (failure.kind === "failure") {
					requestProgress = failure.progress;
					if (failure.publishCurrent) {
						operationRunRef.current = failure.progress;
						setOperationRun(failure.progress);
					}
					log(failure.audit.level, failure.audit.message);
					const result = createOperationRunStatusActivityResult(
						failure.progress,
					);
					if (result) recordStatusActivityResult(result);
				}
			} finally {
				operationRunCancelledTokenRef.current = releaseOperationRunCancellation(
					token,
					operationRunCancelledTokenRef.current,
				);
				endCommand();
			}
		},
		[beginCommand, endCommand, log, recordStatusActivityResult],
	);

	const submitRemoteHostKeyEvidenceInputCommand = useCallback(
		(transition: CommandTransition<"submit-remote-host-key-evidence">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			log("warn", transition.auditMessage);
			setRemoteHostKeyEvidenceSession(transition.session);
			recordStatusActivityResult(transition.activityResult);
			log(transition.notice.level, transition.notice.message);
		},
		[log, recordStatusActivityResult],
	);

	const submitRemoteKnownHostsCandidateCommand = useCallback(
		(transition: CommandTransition<"submit-remote-known-hosts-candidate">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setRemoteKnownHostsCandidateSession(transition.session);
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const submitRemoteKnownHostsPasteReviewCommand = useCallback(
		(transition: CommandTransition<"submit-remote-known-hosts-paste">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setRemoteKnownHostsPasteReviewSession(transition.pasteReviewSession);
			setRemoteKnownHostsCandidateSession(transition.candidateSession);
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const moveRemoteKnownHostsPasteReviewSelectionCommand = useCallback(
		(direction: "next" | "previous") => {
			const transition = prepareRemoteKnownHostsPasteSelection({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
				selection: { kind: "move", direction },
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setRemoteKnownHostsPasteReviewSession(transition.pasteReviewSession);
			setRemoteKnownHostsCandidateSession(transition.candidateSession);
			recordStatusActivityResult(transition.activityResult);
			log(transition.notice.level, transition.notice.message);
		},
		[
			log,
			recordStatusActivityResult,
			remoteKnownHostsCandidateSession,
			remoteKnownHostsPasteReviewSession,
			remoteProfiles,
			selectedRemoteIndex,
		],
	);

	const selectRemoteKnownHostsPasteReviewCandidateCommand = useCallback(
		(candidateIndex: number, method: "number" | "command" = "number") => {
			const transition = prepareRemoteKnownHostsPasteSelection({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
				selection: { kind: "candidate", candidateIndex, method },
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setRemoteKnownHostsPasteReviewSession(transition.pasteReviewSession);
			setRemoteKnownHostsCandidateSession(transition.candidateSession);
			recordStatusActivityResult(transition.activityResult);
			log(transition.notice.level, transition.notice.message);
		},
		[
			log,
			recordStatusActivityResult,
			remoteKnownHostsCandidateSession,
			remoteKnownHostsPasteReviewSession,
			remoteProfiles,
			selectedRemoteIndex,
		],
	);

	const submitRemoteKnownHostsPasteSelectionCommand = useCallback(
		(transition: CommandTransition<"submit-remote-known-hosts-selection">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setRemoteKnownHostsPasteReviewSession(transition.pasteReviewSession);
			setRemoteKnownHostsCandidateSession(transition.candidateSession);
			recordStatusActivityResult(transition.activityResult);
			log(transition.notice.level, transition.notice.message);
		},
		[log, recordStatusActivityResult],
	);

	const submitRemoteHostTrustReviewCommand = useCallback(
		(transition: CommandTransition<"submit-remote-host-trust">) => {
			if (transition.closeCommandLine) {
				setCommandLine((current) => closeCommandLine(current));
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			log("warn", transition.auditMessage);
			recordStatusActivityResult(transition.activityResult);
			log(transition.notice.level, transition.notice.message);
		},
		[log, recordStatusActivityResult],
	);

	const applyEndpointIoEffect = useCallback(
		async (effect: EndpointInputIoEffect) => {
			if (effect.kind === "endpoint-filter-presets") {
				try {
					await setConfigEndpointFilterPresets(effect.scope, effect.presets);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error
							? `${effect.scope} preset save failed ${caught.message}`
							: `${effect.scope} preset save failed ${String(caught)}`,
					);
				}
				return;
			}
			if (effect.kind === "endpoint-sort") {
				try {
					await setConfigEndpointSort(effect.scope, effect.sort);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error
							? `${effect.scope} sort save failed ${caught.message}`
							: `${effect.scope} sort save failed ${String(caught)}`,
					);
				}
				return;
			}

			const token = beginRequest(processInspectionTokenRef.current);
			processInspectionTokenRef.current = token;
			beginCommand();
			if (effect.kind === "load-port-file-evidence") {
				setSelectedProcessFileEvidenceIssue(undefined);
				try {
					const files = await getProcessFileSnapshot(effect.pid);
					const publication = classifyEndpointProcessInspectionPublication({
						currentToken: processInspectionTokenRef.current,
						requestToken: token,
						pid: effect.pid,
						outcome: { kind: "success", files },
					});
					if (publication.publishCurrent) {
						setSelectedProcessFiles(publication.files);
						setSelectedProcessFileEvidenceIssue(publication.fileEvidenceIssue);
					}
					log(publication.notice.level, publication.notice.message);
				} catch (caught) {
					const publication = classifyEndpointProcessInspectionPublication({
						currentToken: processInspectionTokenRef.current,
						requestToken: token,
						pid: effect.pid,
						outcome: { kind: "failure", error: caught },
					});
					if (publication.publishCurrent) {
						setSelectedProcessFiles(publication.files);
						setSelectedProcessFileEvidenceIssue(publication.fileEvidenceIssue);
					}
					log(publication.notice.level, publication.notice.message);
				} finally {
					endCommand();
				}
				return;
			}

			const { request } = effect.plan;
			try {
				const [detail, fileResult] = await Promise.all([
					getProcessDetail(request.pid),
					getProcessFileSnapshotWithSource(request.pid),
				]);
				const publication = classifyProcessInspectionPublication({
					currentToken: processInspectionTokenRef.current,
					requestToken: token,
					request,
					detail,
					fileResult,
				});
				if (publication.kind === "stale") {
					log(publication.notice.level, publication.notice.message);
					return;
				}
				setSelectedProcessDetail(publication.detail);
				setSelectedProcessFiles(publication.files);
				setSelectedProcessFileEvidenceIssue(publication.fileEvidenceIssue);
				setSelectedProcessFileIndex(publication.selectedFileIndex);
				setProcessClipboardPreview(publication.clipboardPreview);
				setScreen("processes");
				log(publication.notice.level, publication.notice.message);
			} catch (caught) {
				const failure = classifyProcessInspectionFailure({
					currentToken: processInspectionTokenRef.current,
					requestToken: token,
					request,
					error: caught,
				});
				if (failure.publishCurrent) {
					setSelectedProcessFileEvidenceIssue(failure.fileEvidenceIssue);
				}
				log(failure.notice.level, failure.notice.message);
			} finally {
				endCommand();
			}
		},
		[log, beginCommand, endCommand],
	);

	const openSelectedProcessFile = useCallback(
		async (selection: SelectedProcessResourceAction) => {
			if (selection.kind !== "file") {
				log(selection.notice.level, selection.notice.message);
				return;
			}
			const { request } = selection;

			try {
				const entry = await fileProvider.stat(request.path);
				const transition = prepareSelectedFileOpen({
					entries: [entry],
					selectedIndex: 0,
					root: fileRoot,
					backHistory: fileHistory,
					forwardHistory: fileForwardHistory,
					notice: selection.notice,
				});
				if (transition.action === "load") {
					if (await loadFiles(transition.request)) {
						setScreen("files");
						setFocusArea("workspaces");
					}
					return;
				}
				if (transition.action === "preview") {
					await previewFile(transition.entry, {
						openEditor: transition.openEditor,
						notice: transition.notice,
					});
					return;
				}
				log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[
			fileProvider,
			fileForwardHistory,
			fileHistory,
			fileRoot,
			loadFiles,
			log,
			previewFile,
		],
	);

	useEffect(() => {
		if (initialFileLoadStartedRef.current) {
			return;
		}
		initialFileLoadStartedRef.current = true;
		void loadFiles(systemFileRoot);
	}, [loadFiles, systemFileRoot]);

	useEffect(() => {
		const entry = fileEntries.find(
			(item) =>
				item.type === "file" &&
				/\.(md|ts|tsx|json|txt|js|mjs|cjs|yml|yaml)$/i.test(item.name),
		);
		if (!entry || editorPreview) {
			return;
		}

		previewFile(entry).catch(() => undefined);
	}, [editorPreview, fileEntries, previewFile]);

	const refresh = useCallback(async () => {
		const tokens = beginRequestWithPublication(
			refreshTokenRef.current,
			currentErrorTokenRef.current,
		);
		const token = tokens.requestToken;
		const errorToken = tokens.publicationToken;
		refreshTokenRef.current = token;
		currentErrorTokenRef.current = errorToken;
		try {
			const [
				nextSummary,
				nextConnections,
				nextPorts,
				nextRouteTable,
				nextMonitor,
				nextOsLogs,
			] = await Promise.all([
				getNetworkSummary(),
				getActiveConnections().catch(() => undefined),
				getListeningPorts().catch(() => undefined),
				runRouteTable().catch(() => undefined),
				getSystemMonitorSnapshot().catch(() => undefined),
				createOsLogSnapshot({ limit: 24, timeoutMs: 3000 }).catch(
					() => undefined,
				),
			]);
			// Awaited before any write so the batch lands together or not at all. A
			// partial update would pair a fresh summary with a stale inventory, which
			// is how a listening port comes to resolve to the wrong process.
			const nextInventory = await createSystemInventory({
				network: nextSummary,
			});
			// `setInterval` does not wait for the previous run and this batch can
			// exceed the interval, so an older refresh finishing late must not write.
			// The diff below is why it matters most: computing it against a ref that a
			// newer refresh already advanced describes a change that never happened,
			// and those become audit events.
			if (isStaleRequest(refreshTokenRef.current, token)) {
				return;
			}
			if (
				classifyRequestPublication(currentErrorTokenRef.current, errorToken) ===
				"current"
			) {
				setError(undefined);
			}
			const networkEvents = createNetworkTimelineEvents(
				summaryRef.current,
				nextSummary,
			);
			summaryRef.current = nextSummary;
			setSummary(nextSummary);
			if (networkEvents.length) {
				setEvents((current) =>
					networkEvents.reduce(
						(nextEvents, event) => appendEvent(nextEvents, event),
						current,
					),
				);
			}
			setInventory(nextInventory);
			if (nextMonitor) {
				setSystemMonitor(nextMonitor);
			}
			if (nextOsLogs) {
				setOsLogs(nextOsLogs);
			}
			if (nextConnections) {
				setConnectionsResult(nextConnections);
			}
			if (nextPorts) {
				setPortsResult(nextPorts);
			}
			if (nextRouteTable) {
				setRouteTable(nextRouteTable);
			}
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : String(caught);
			// The event log is a history, so it records every failure. `error` is
			// current state, so only the newest refresh may set it: showing a
			// superseded refresh's failure beside a newer success would misdescribe
			// the machine.
			if (
				!isStaleRequest(refreshTokenRef.current, token) &&
				classifyRequestPublication(currentErrorTokenRef.current, errorToken) ===
					"current"
			) {
				setError(message);
			}
			log("fail", message);
		}
	}, [log]);

	const cycleStatusActivityResultHistoryFilter = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareStatusActivityResultHistoryFilterCycle(
				statusActivityResults,
				statusActivityResultHistoryFilter,
				options.origin,
			);
			if (transition.screen) {
				setScreen(transition.screen);
			}
			if (transition.focusArea) {
				setFocusArea(transition.focusArea);
			}
			setStatusActivityResultHistoryFilter(transition.filter);
			const result = transition.result;
			if (result) {
				setStatusActivityResults((history) =>
					appendStatusActivityResultHistory(history, result),
				);
			}
			setSelectedStatusActivityResultIndex(transition.selectedIndex);
			setSelectedStatusActivityCopyPreviewRowIndex(0);
			setStatusActivityCopyPreviewExpanded(false);
			log(transition.notice.level, transition.notice.message);
		},
		[log, statusActivityResultHistoryFilter, statusActivityResults],
	);

	const cycleStatusActivityResultTimelineJumpFilter = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareStatusActivityResultTimelineJumpFilterCycle(
				statusActivityResults,
				statusActivityResultTimelineJumpFilter,
				options.origin,
			);
			if (transition.screen) {
				setScreen(transition.screen);
			}
			if (transition.focusArea) {
				setFocusArea(transition.focusArea);
			}
			setStatusActivityResultTimelineJumpFilter(transition.filter);
			setSelectedStatusActivityResultIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			void setConfigValue(
				"statusResultJumpClassFilter",
				transition.filter,
			).catch((caught) =>
				log(
					"warn",
					caught instanceof Error
						? `status result jump filter persistence failed ${caught.message}`
						: `status result jump filter persistence failed ${String(caught)}`,
				),
			);
		},
		[log, statusActivityResultTimelineJumpFilter, statusActivityResults],
	);

	const getSelectedTimelineEvidenceTrailResultOptions = useCallback(
		() =>
			resolveRecoveredEvidenceResultOptions(
				selectedTimelineEvidenceTrailAuditExportIndex,
				filteredTimelineEvidenceTrailAuditExports.length,
			),
		[
			filteredTimelineEvidenceTrailAuditExports.length,
			selectedTimelineEvidenceTrailAuditExportIndex,
		],
	);

	const selectNextTimelineEvidenceTrailExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			setScreen("status");
			const transition = prepareRecoveredEvidenceSelectionTransition({
				family: "timeline",
				exports: filteredTimelineEvidenceTrailAuditExports,
				selectedIndex:
					getSelectedTimelineEvidenceTrailResultOptions().selectedIndex,
				direction: "next",
				origin: options.origin,
			});
			setSelectedTimelineEvidenceTrailAuditExportIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			filteredTimelineEvidenceTrailAuditExports,
			getSelectedTimelineEvidenceTrailResultOptions,
			log,
			recordStatusActivityResult,
		],
	);

	const cycleTimelineEvidenceTrailSourceFilter = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			setScreen("status");
			const transition = prepareTimelineEvidenceTrailSourceFilterTransition({
				exports: timelineEvidenceTrailAuditExports,
				filter: timelineEvidenceTrailSourceFilter,
				origin: options.origin,
			});
			setTimelineEvidenceTrailSourceFilter(transition.filter);
			setSelectedTimelineEvidenceTrailAuditExportIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			log,
			recordStatusActivityResult,
			timelineEvidenceTrailAuditExports,
			timelineEvidenceTrailSourceFilter,
		],
	);

	const jumpSelectedTimelineEvidenceTrailSearch = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRecoveredEvidenceSearchTransition({
				family: "timeline",
				exports: filteredTimelineEvidenceTrailAuditExports,
				selectedIndex:
					getSelectedTimelineEvidenceTrailResultOptions().selectedIndex,
				events,
				origin: options.origin,
			});
			setSelectedTimelineEvidenceTrailAuditExportIndex(
				transition.selectedIndex,
			);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
			} else {
				setTimelineFilter(transition.timeline.filter);
				setTimelineSearchQuery(transition.timeline.query);
				setSelectedTimelineIndex(transition.timeline.selectedIndex);
				log(
					transition.timeline.notice.level,
					transition.timeline.notice.message,
				);
			}
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				return;
			}
			setScreen("timeline");
		},
		[
			events,
			filteredTimelineEvidenceTrailAuditExports,
			getSelectedTimelineEvidenceTrailResultOptions,
			log,
			recordStatusActivityResult,
		],
	);

	const openSelectedTimelineEvidenceTrailExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRecoveredEvidenceOpenTransition({
				family: "timeline",
				exports: filteredTimelineEvidenceTrailAuditExports,
				selectedIndex:
					getSelectedTimelineEvidenceTrailResultOptions().selectedIndex,
				activeIndex: auditExportIndex,
				archiveIndex: auditExportArchiveIndex,
				baseDir: dirname(getConfigPath()),
				platform: currentPlatform(),
				origin: options.origin,
			});
			setSelectedTimelineEvidenceTrailAuditExportIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				setScreen("status");
				return;
			}
			if (transition.masterSelection?.state === "active") {
				setSelectedAuditExportIndex(transition.masterSelection.selectedIndex);
			} else if (transition.masterSelection?.state === "archived") {
				setSelectedAuditExportArchiveIndex(
					transition.masterSelection.selectedIndex,
				);
			}
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			setFileOpenPlan(transition.plan);
			setExternalOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setCommandLine(openCommandLine("file-open"));
			setScreen("status");
		},
		[
			auditExportArchiveIndex,
			auditExportIndex,
			filteredTimelineEvidenceTrailAuditExports,
			getSelectedTimelineEvidenceTrailResultOptions,
			log,
			recordStatusActivityResult,
		],
	);

	const getSelectedProcessControlEvidenceResultOptions = useCallback(
		() =>
			resolveRecoveredEvidenceResultOptions(
				selectedProcessControlAuditExportIndex,
				processControlAuditExports.length,
			),
		[processControlAuditExports.length, selectedProcessControlAuditExportIndex],
	);

	const selectNextProcessControlEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			setScreen("status");
			const transition = prepareRecoveredEvidenceSelectionTransition({
				family: "process",
				exports: processControlAuditExports,
				selectedIndex:
					getSelectedProcessControlEvidenceResultOptions().selectedIndex,
				direction: "next",
				origin: options.origin,
			});
			setSelectedProcessControlAuditExportIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			getSelectedProcessControlEvidenceResultOptions,
			log,
			processControlAuditExports,
			recordStatusActivityResult,
		],
	);

	const jumpSelectedProcessControlEvidenceSearch = useCallback(
		(options: { origin?: "keyboard" | "palette" | "status-evidence" } = {}) => {
			const transition = prepareRecoveredEvidenceSearchTransition({
				family: "process",
				exports: processControlAuditExports,
				selectedIndex:
					getSelectedProcessControlEvidenceResultOptions().selectedIndex,
				events,
				origin: options.origin,
			});
			setSelectedProcessControlAuditExportIndex(transition.selectedIndex);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
			} else {
				setTimelineFilter(transition.timeline.filter);
				setTimelineSearchQuery(transition.timeline.query);
				setSelectedTimelineIndex(transition.timeline.selectedIndex);
				setScreen("timeline");
				log(
					transition.timeline.notice.level,
					transition.timeline.notice.message,
				);
			}
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			events,
			getSelectedProcessControlEvidenceResultOptions,
			log,
			processControlAuditExports,
			recordStatusActivityResult,
		],
	);

	const openSelectedProcessControlEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRecoveredEvidenceOpenTransition({
				family: "process",
				exports: processControlAuditExports,
				selectedIndex:
					getSelectedProcessControlEvidenceResultOptions().selectedIndex,
				activeIndex: auditExportIndex,
				archiveIndex: auditExportArchiveIndex,
				baseDir: dirname(getConfigPath()),
				platform: currentPlatform(),
				origin: options.origin,
			});
			setSelectedProcessControlAuditExportIndex(transition.selectedIndex);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				setScreen("status");
				return;
			}
			if (transition.masterSelection?.state === "active") {
				setSelectedAuditExportIndex(transition.masterSelection.selectedIndex);
			} else if (transition.masterSelection?.state === "archived") {
				setSelectedAuditExportArchiveIndex(
					transition.masterSelection.selectedIndex,
				);
			}
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			setFileOpenPlan(transition.plan);
			setExternalOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setCommandLine(openCommandLine("file-open"));
			setScreen("status");
		},
		[
			auditExportArchiveIndex,
			auditExportIndex,
			getSelectedProcessControlEvidenceResultOptions,
			log,
			recordStatusActivityResult,
			processControlAuditExports,
		],
	);

	const getSelectedRemoteKnownHostsSelectionEvidenceResultOptions = useCallback(
		() =>
			resolveRemoteEvidenceResultOptions(
				selectedRemoteKnownHostsSelectionAuditExportIndex,
				remoteKnownHostsSelectionAuditExports.length,
			),
		[
			remoteKnownHostsSelectionAuditExports.length,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		],
	);

	const selectNextRemoteKnownHostsSelectionEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			setScreen("status");
			const transition = prepareRecoveredEvidenceSelectionTransition({
				family: "remote-known-hosts",
				exports: remoteKnownHostsSelectionAuditExports,
				selectedIndex: selectedRemoteKnownHostsSelectionAuditExportIndex,
				direction: "next",
				origin: options.origin,
			});
			setSelectedRemoteKnownHostsSelectionAuditExportIndex(
				transition.selectedIndex,
			);
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			log,
			recordStatusActivityResult,
			remoteKnownHostsSelectionAuditExports,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		],
	);

	const jumpSelectedRemoteKnownHostsSelectionEvidenceSearch = useCallback(
		(options: { origin?: "keyboard" | "palette" | "status-evidence" } = {}) => {
			const transition = prepareRecoveredEvidenceSearchTransition({
				family: "remote-known-hosts",
				exports: remoteKnownHostsSelectionAuditExports,
				selectedIndex: selectedRemoteKnownHostsSelectionAuditExportIndex,
				events,
				origin: options.origin,
			});
			setSelectedRemoteKnownHostsSelectionAuditExportIndex(
				transition.selectedIndex,
			);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
			} else {
				setTimelineFilter(transition.timeline.filter);
				setTimelineSearchQuery(transition.timeline.query);
				setSelectedTimelineIndex(transition.timeline.selectedIndex);
				setScreen("timeline");
				log(
					transition.timeline.notice.level,
					transition.timeline.notice.message,
				);
			}
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			events,
			log,
			recordStatusActivityResult,
			remoteKnownHostsSelectionAuditExports,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		],
	);

	const openSelectedRemoteKnownHostsSelectionEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRecoveredEvidenceOpenTransition({
				family: "remote-known-hosts",
				exports: remoteKnownHostsSelectionAuditExports,
				selectedIndex: selectedRemoteKnownHostsSelectionAuditExportIndex,
				activeIndex: auditExportIndex,
				archiveIndex: auditExportArchiveIndex,
				baseDir: dirname(getConfigPath()),
				platform: currentPlatform(),
				origin: options.origin,
			});
			setSelectedRemoteKnownHostsSelectionAuditExportIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				setScreen("status");
				return;
			}
			if (transition.masterSelection?.state === "active") {
				setSelectedAuditExportIndex(transition.masterSelection.selectedIndex);
			} else if (transition.masterSelection?.state === "archived") {
				setSelectedAuditExportArchiveIndex(
					transition.masterSelection.selectedIndex,
				);
			}
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			setFileOpenPlan(transition.plan);
			setExternalOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setCommandLine(openCommandLine("file-open"));
			setScreen("status");
		},
		[
			auditExportArchiveIndex,
			auditExportIndex,
			log,
			recordStatusActivityResult,
			remoteKnownHostsSelectionAuditExports,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
		],
	);

	const openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff =
		useCallback(
			(options: { origin?: "keyboard" | "palette" } = {}) => {
				const resultOptions =
					getSelectedRemoteKnownHostsSelectionEvidenceResultOptions();
				const transition = prepareRemoteKnownHostsEvidenceHandoff({
					action: "copy",
					plan: selectedRemoteKnownHostsSelectionAuditExport,
					...resultOptions,
					baseDir: dirname(getConfigPath()),
					origin: options.origin,
				});
				if (transition.paletteAuditMessage) {
					log("info", transition.paletteAuditMessage);
				}
				if (transition.paletteActivityResult) {
					recordStatusActivityResult(transition.paletteActivityResult);
				}
				if (transition.kind === "notice") {
					log(transition.notice.level, transition.notice.message);
					return;
				}
				if (transition.kind !== "copy") {
					return;
				}
				setStatusActivityCopyIntentHistory((current) =>
					appendStatusActivityCopyIntentHistory(current, transition.intent),
				);
				setSelectedStatusActivityCopyIntentIndex(0);
				setScreen("status");
				setFocusArea("workspaces");
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
				log(transition.notice.level, transition.notice.message);
				openClipboardConfirmation(transition.preview);
			},
			[
				getSelectedRemoteKnownHostsSelectionEvidenceResultOptions,
				log,
				openClipboardConfirmation,
				recordStatusActivityResult,
				selectedRemoteKnownHostsSelectionAuditExport,
			],
		);

	const exportSelectedRemoteKnownHostsSelectionEvidenceHandoff = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const resultOptions =
				getSelectedRemoteKnownHostsSelectionEvidenceResultOptions();
			const transition = prepareRemoteKnownHostsEvidenceHandoff({
				action: "export",
				plan: selectedRemoteKnownHostsSelectionAuditExport,
				...resultOptions,
				baseDir: dirname(getConfigPath()),
				origin: options.origin,
			});
			if (transition.paletteAuditMessage) {
				log("info", transition.paletteAuditMessage);
			}
			if (transition.paletteActivityResult) {
				recordStatusActivityResult(transition.paletteActivityResult);
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			if (transition.kind !== "export") {
				return;
			}
			setScreen("status");
			setFocusArea("workspaces");
			setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			void writeStatusActivityCopyIntentAuditExport(transition.exportPlan)
				.then((written) => {
					setLastStatusActivityCopyIntentAuditExport(written);
					log(
						"ok",
						`remote known_hosts evidence handoff exported ${written.path} events=${written.eventCount}`,
					);
					void refreshAuditExportIndex(false);
				})
				.catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `remote known_hosts evidence handoff export failed ${caught.message}`
							: `remote known_hosts evidence handoff export failed ${String(caught)}`,
					),
				);
		},
		[
			getSelectedRemoteKnownHostsSelectionEvidenceResultOptions,
			log,
			recordStatusActivityResult,
			refreshAuditExportIndex,
			selectedRemoteKnownHostsSelectionAuditExport,
		],
	);

	const getSelectedInterfaceConfirmationEvidenceResultOptions = useCallback(
		() =>
			resolveRecoveredEvidenceResultOptions(
				selectedInterfaceConfirmationAuditExportIndex,
				interfaceConfirmationEvidenceExports.length,
			),
		[
			interfaceConfirmationEvidenceExports.length,
			selectedInterfaceConfirmationAuditExportIndex,
		],
	);

	const selectNextInterfaceConfirmationEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			setScreen("status");
			const exports = interfaceConfirmationEvidenceExports.map(
				({ plan }) => plan,
			);
			const transition = prepareRecoveredEvidenceSelectionTransition({
				family: "interface",
				exports,
				selectedIndex:
					getSelectedInterfaceConfirmationEvidenceResultOptions().selectedIndex,
				direction: "next",
				origin: options.origin,
			});
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			getSelectedInterfaceConfirmationEvidenceResultOptions,
			interfaceConfirmationEvidenceExports,
			log,
			recordStatusActivityResult,
		],
	);

	const jumpSelectedInterfaceConfirmationEvidenceSearch = useCallback(
		(options: { origin?: "keyboard" | "palette" | "status-evidence" } = {}) => {
			const exports = interfaceConfirmationEvidenceExports.map(
				({ plan }) => plan,
			);
			const transition = prepareRecoveredEvidenceSearchTransition({
				family: "interface",
				exports,
				selectedIndex:
					getSelectedInterfaceConfirmationEvidenceResultOptions().selectedIndex,
				events,
				origin: options.origin,
			});
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
			} else {
				setTimelineFilter(transition.timeline.filter);
				setTimelineSearchQuery(transition.timeline.query);
				setSelectedTimelineIndex(transition.timeline.selectedIndex);
				setScreen("timeline");
				log(
					transition.timeline.notice.level,
					transition.timeline.notice.message,
				);
			}
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
		},
		[
			events,
			getSelectedInterfaceConfirmationEvidenceResultOptions,
			interfaceConfirmationEvidenceExports,
			log,
			recordStatusActivityResult,
		],
	);

	const openSelectedInterfaceConfirmationEvidenceExport = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const exports = interfaceConfirmationEvidenceExports.map(
				({ plan }) => plan,
			);
			const transition = prepareRecoveredEvidenceOpenTransition({
				family: "interface",
				exports,
				selectedIndex:
					getSelectedInterfaceConfirmationEvidenceResultOptions().selectedIndex,
				activeIndex: auditExportIndex,
				archiveIndex: auditExportArchiveIndex,
				baseDir: dirname(getConfigPath()),
				platform: currentPlatform(),
				origin: options.origin,
			});
			setSelectedInterfaceConfirmationAuditExportIndex(
				transition.selectedIndex,
			);
			log(transition.notice.level, transition.notice.message);
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				setScreen("status");
				return;
			}
			if (transition.masterSelection?.state === "active") {
				setSelectedAuditExportIndex(transition.masterSelection.selectedIndex);
			} else if (transition.masterSelection?.state === "archived") {
				setSelectedAuditExportArchiveIndex(
					transition.masterSelection.selectedIndex,
				);
			}
			if (transition.statusEvidenceKind) {
				setSelectedStatusEvidenceKind(transition.statusEvidenceKind);
			}
			setFileOpenPlan(transition.plan);
			setExternalOpenPlan(undefined);
			setAuditExportArchivePlan(undefined);
			setAuditArchiveRetentionPlan(undefined);
			setCleanupExportArchivePlan(undefined);
			setCommandLine(openCommandLine("file-open"));
			setScreen("status");
		},
		[
			auditExportArchiveIndex,
			auditExportIndex,
			getSelectedInterfaceConfirmationEvidenceResultOptions,
			interfaceConfirmationEvidenceExports,
			log,
			recordStatusActivityResult,
		],
	);

	const selectNextStatusActivityResultTimelineJump = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareStatusActivityResultTimelineJumpSelection({
				history: statusActivityResults,
				selectedIndex: selectedStatusActivityResultIndex,
				filter: statusActivityResultTimelineJumpFilter,
				origin: options.origin,
			});
			if (transition.screen) {
				setScreen(transition.screen);
			}
			if (transition.focusArea) {
				setFocusArea(transition.focusArea);
			}
			if (transition.result) {
				recordStatusActivityResult(transition.result);
			}
			log(transition.notice.level, transition.notice.message);
			if (transition.kind === "select") {
				setSelectedStatusActivityResultIndex(transition.selectedIndex);
			}
		},
		[
			log,
			recordStatusActivityResult,
			statusActivityResultTimelineJumpFilter,
			statusActivityResults,
			selectedStatusActivityResultIndex,
		],
	);

	const selectNextRemoteKnownHostsEvidenceHandoff = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRemoteKnownHostsEvidenceHandoffSelection({
				history: statusActivityResults,
				selectedIndex: selectedStatusActivityResultIndex,
				origin: options.origin,
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return false;
			}
			if (transition.screen) {
				setScreen(transition.screen);
			}
			if (transition.focusArea) {
				setFocusArea(transition.focusArea);
			}
			setSelectedStatusActivityResultIndex(transition.selectedIndex);
			setSelectedStatusActivityCopyPreviewRowIndex(0);
			setStatusActivityCopyPreviewExpanded(false);
			log(transition.notice.level, transition.notice.message);
			return true;
		},
		[log, selectedStatusActivityResultIndex, statusActivityResults],
	);

	const openSelectedRemoteKnownHostsEvidenceHandoff = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const transition = prepareRemoteKnownHostsEvidenceHandoffOpen({
				history: statusActivityResults,
				selectedIndex: selectedStatusActivityResultIndex,
				events,
				origin: options.origin,
			});
			if (transition.paletteActivityResult) {
				recordStatusActivityResult(transition.paletteActivityResult);
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			if (transition.intent) {
				setStatusActivityCopyIntentHistory((current) =>
					appendStatusActivityCopyIntentHistory(current, transition.intent),
				);
				setSelectedStatusActivityCopyIntentIndex(0);
				log("info", transition.intent.auditMessage);
			}
			setTimelineFilter(transition.timeline.filter);
			setTimelineSearchQuery(transition.timeline.query);
			setSelectedTimelineIndex(transition.timeline.selectedIndex);
			setScreen("timeline");
			log(transition.timeline.notice.level, transition.timeline.notice.message);
			if (transition.paletteAuditMessage) {
				log("info", transition.paletteAuditMessage);
			}
		},
		[
			events,
			log,
			recordStatusActivityResult,
			selectedStatusActivityResultIndex,
			statusActivityResults,
		],
	);

	const openSelectedStatusActivityResultTimelineJump = useCallback(
		(options: { origin?: "keyboard" | "palette" } = {}) => {
			const selectedAuditJumpIntent =
				getSelectedStatusActivityResultAuditJumpIntent(
					statusActivityCopyIntentHistory,
					selectedStatusActivityResultAuditJumpIndex,
				);
			const transition =
				prepareStatusActivityResultTimelineHandoffOpenTransition({
					history: statusActivityResults,
					selectedIndex: selectedStatusActivityResultIndex,
					latestAuditJumpIntent: latestStatusActivityResultAuditJumpIntent,
					selectedAuditJumpIntent,
					events,
					origin: options.origin,
					filter: statusActivityResultTimelineJumpFilter,
				});
			if (transition.auditMessage) {
				log("info", transition.auditMessage);
			}
			if (transition.activityResult) {
				recordStatusActivityResult(transition.activityResult);
			}
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const { intent, timeline } = transition;
			setStatusActivityCopyIntentHistory((current) =>
				intent
					? appendStatusActivityCopyIntentHistory(current, intent)
					: current,
			);
			setSelectedStatusActivityCopyIntentIndex(0);
			if (intent) {
				log("info", intent.auditMessage);
			}
			setTimelineFilter(timeline.filter);
			setTimelineSearchQuery(timeline.query);
			setSelectedTimelineIndex(timeline.selectedIndex);
			setScreen("timeline");
			log(timeline.notice.level, timeline.notice.message);
		},
		[
			events,
			latestStatusActivityResultAuditJumpIntent,
			log,
			recordStatusActivityResult,
			selectedStatusActivityResultAuditJumpIndex,
			selectedStatusActivityResultIndex,
			statusActivityResultTimelineJumpFilter,
			statusActivityCopyIntentHistory,
			statusActivityResults,
		],
	);

	const runAction = useCallback(
		async (requestedAction: PicosAction) => {
			const requestToken = beginRequest(actionControlSequenceRef.current);
			actionControlSequenceRef.current = requestToken;
			const transition = prepareActionDispatch({
				actionId: requestedAction.id,
				platform: currentPlatform(),
				updateCheckResult,
			});
			setActionPreviewPlan(transition.control.previewPlan);
			setActionConfirmation(transition.control.confirmation);
			setActionSimulation(transition.control.simulation);
			setActionExecutionPlan(transition.control.executionPlan);
			if (transition.screen) {
				setScreen(transition.screen);
			}
			if (transition.focusArea) {
				setFocusArea(transition.focusArea);
			}
			log(transition.notice.level, transition.notice.message);
			if (transition.kind !== "run") {
				return;
			}
			const action = transition.action;
			const effect = getActionRunEffect(action.id);
			beginCommand();
			const publishOutcome = (
				outcome: Parameters<typeof classifyActionRunOutcome>[0]["outcome"],
			) => {
				const publication = classifyActionRunOutcome({
					actionId: action.id,
					currentToken: actionControlSequenceRef.current,
					requestToken,
					outcome,
				});
				for (const notice of publication.notices) {
					log(notice.level, notice.message);
				}
				return publication.publishCurrent;
			};

			try {
				if (!effect) {
					throw new Error("read action has no execution effect");
				}
				if (effect === "network-refresh") {
					await refresh();
					publishOutcome({ kind: "success", summary: { kind: "network" } });
				}

				if (effect === "system-inventory") {
					const result = await createSystemInventory();
					if (
						publishOutcome({
							kind: "success",
							summary: { kind: "system-inventory" },
						})
					) {
						setInventory(result);
					}
				}

				if (effect === "logs-read") {
					const snapshot = await createOsLogSnapshot({ limit: 50 });
					if (
						publishOutcome({
							kind: "success",
							summary: {
								kind: "logs",
								count: snapshot.entries.length,
								status: snapshot.status,
							},
						})
					) {
						setOsLogs(snapshot);
						setScreen("logs");
					}
				}

				if (effect === "doctor") {
					const checks = await runDoctorChecks();
					if (
						publishOutcome({
							kind: "success",
							summary: { kind: "doctor", checks },
						})
					) {
						setDoctorChecks(checks);
					}
				}

				if (effect === "config-show") {
					const config = await readConfig();
					publishOutcome({
						kind: "success",
						summary: { kind: "config", path: getConfigPath(), config },
					});
				}

				if (effect === "config-focus") {
					const configFocusTransition =
						createConfigWorkspaceActionFocusTransition(
							action.id,
							configWorkspaceItems,
						);
					if (configFocusTransition) {
						if (configFocusTransition.kind === "focus") {
							setScreen(configFocusTransition.screen);
							setFocusArea(configFocusTransition.focusArea);
							setSelectedConfigIndex(configFocusTransition.selectedIndex);
						}
						log(
							configFocusTransition.notice.level,
							configFocusTransition.notice.message,
						);
					}

					const configRecoveryFocusTarget = getConfigRecoveryActionFocusTarget(
						action.id,
					);
					const configShelfFocusTarget =
						configRecoveryFocusTarget ??
						getConfigManagedShelfActionFocusTarget(action.id);
					if (configShelfFocusTarget) {
						const transition = createConfigManagedShelfJumpTransition(
							configShelfFocusTarget,
							{
								origin: configRecoveryFocusTarget
									? "recovery-palette"
									: "palette",
								counts: {
									network: summary?.interfaces.length ?? 0,
									routes: routeFilterPresets.length,
									connections: connectionFilterPresets.length,
									ports: portFilterPresets.length,
									tools: toolTargetPresets.length,
									logs: logProfiles.length,
									remotes: remoteProfiles.length,
								},
							},
						);
						applyConfigManagedShelfStateEffects(
							transition.effects,
							configManagedShelfStateEffectSetters,
						);
						const promptTransition =
							prepareConfigRecoveryDirectPromptTransition(
								configRecoveryFocusTarget,
								{
									routes: routeFilterPresets.length,
									connections: connectionFilterPresets.length,
									ports: portFilterPresets.length,
									logs: logProfiles.length,
									tools: customToolTargetPresets.length,
									remotes: remoteProfiles.length,
								},
							);
						if (promptTransition.kind === "apply") {
							applyConfigManagedShelfStateEffects(
								promptTransition.effects,
								configManagedShelfStateEffectSetters,
							);
							log(
								promptTransition.notice.level,
								promptTransition.notice.message,
							);
						}
						log(transition.notice.level, transition.notice.message);
					}
				}

				if (effect === "remote-profiles") {
					const config = await readConfig();
					publishOutcome({
						kind: "success",
						summary: {
							kind: "remote-profiles",
							count: config.remoteProfiles.length,
						},
					});
				}

				if (effect === "remote-known-hosts-select") {
					setScreen("remotes");
					setFocusArea("remotes");
					setCommandLine(openCommandLine("remote-known-hosts-select"));
					publishOutcome({
						kind: "success",
						summary: { kind: "remote-known-hosts-prompt" },
					});
				}

				if (effect === "files-list") {
					await refreshFiles();
					publishOutcome({
						kind: "success",
						summary: { kind: "files-list", root: fileRoot },
					});
				}

				if (effect === "files-read") {
					await refreshFiles();
					publishOutcome({
						kind: "success",
						summary: { kind: "files-read" },
					});
				}

				if (effect === "routes-inspect") {
					const result = await runRouteTable();
					if (
						publishOutcome({
							kind: "success",
							summary: { kind: "routes", count: result.routes.length },
						})
					) {
						setRouteTable(result);
					}
				}

				if (effect === "route-prompt") {
					setScreen("routes");
					setCommandLine(openCommandLine("route"));
					publishOutcome({
						kind: "success",
						summary: { kind: "route-prompt" },
					});
				}

				if (effect === "timeline-export") {
					const scopedEvents = filterTimelineEvents(
						events,
						timelineSearchQuery,
						timelineFilter,
					);
					const scoped =
						timelineFilter !== "all" || Boolean(timelineSearchQuery.trim());
					const plan = createConsoleAuditExportPlan(scopedEvents, {
						baseDir: dirname(getConfigPath()),
						origin: createActiveFileOpenOrigin(configShelfLandingTarget),
						query: timelineSearchQuery.trim() || undefined,
						scope: scoped ? "filtered" : undefined,
					});
					const written = await writeConsoleAuditExport(plan);
					publishOutcome({
						kind: "success",
						summary: {
							kind: "timeline-export",
							path: written.path,
							eventCount: written.eventCount,
						},
					});
				}

				if (effect === "tool-prompt") {
					const toolPlan = createToolRunPlan(
						action.id,
						defaultPingHost,
						summaryRef.current,
					);
					if (!toolPlan) {
						throw new Error("tool action has no prompt plan");
					}
					const prompt = prepareToolActionPrompt(toolPlan);
					setScreen(prompt.screen);
					setCommandLine(
						openCommandLine(prompt.prompt, {
							value: prompt.value,
							fieldIndex: prompt.fieldIndex,
						}),
					);
					log(prompt.notice.level, prompt.notice.message);
				}

				if (effect === "raw-view") {
					const rawView = prepareRawToolHistoryView(toolHistory);
					if (rawView.kind === "view") {
						setScreen(rawView.screen);
						setSelectedToolHistoryIndex(rawView.selectedIndex);
					}
					log(rawView.notice.level, rawView.notice.message);
				}

				if (effect === "tools-export") {
					const exportEffect = prepareToolHistoryExportEffect({
						history: toolHistory,
						selectedIndex: selectedToolHistoryIndex,
						scope: "all",
						context: {
							baseDir: dirname(getConfigPath()),
							generatedAt: new Date(),
							publication: {
								selectedIndex: 0,
								filter: toolExportFilter,
								query: toolExportQuery,
							},
						},
					});
					if (exportEffect.kind === "export") {
						await exportToolHistory(exportEffect);
						publishOutcome({
							kind: "success",
							summary: { kind: "notices", notices: [] },
						});
					} else {
						log(exportEffect.notice.level, exportEffect.notice.message);
					}
				}

				if (effect === "update-check") {
					const [result, releaseResult] = await Promise.all([
						checkForPackageUpdate({
							packageName: "@uulab/picos",
							currentVersion: VERSION,
						}),
						checkForGitHubReleaseUpdate({
							owner: "uulab-official",
							repo: "picos",
							currentVersion: VERSION,
						}),
					]);
					if (
						publishOutcome({
							kind: "success",
							summary: {
								kind: "update",
								packageResult: result,
								releaseResult,
							},
						})
					) {
						setUpdateCheckResult(result);
						setGitHubReleaseCheckResult(releaseResult);
						setSelectedUpdateHandoffIndex(0);
						setScreen("status");
					}
				}

				if (effect === "status-owner") {
					dispatchStatusActionRun(action.id as keyof StatusActionRunHandlers, {
						"status.timelineTrail.select": () =>
							selectNextTimelineEvidenceTrailExport({ origin: "palette" }),
						"status.timelineTrail.open": () =>
							openSelectedTimelineEvidenceTrailExport({ origin: "palette" }),
						"status.timelineTrail.search": () =>
							jumpSelectedTimelineEvidenceTrailSearch({ origin: "palette" }),
						"status.timelineTrail.source": () =>
							cycleTimelineEvidenceTrailSourceFilter({ origin: "palette" }),
						"status.processEvidence.select": () =>
							selectNextProcessControlEvidenceExport({ origin: "palette" }),
						"status.processEvidence.open": () =>
							openSelectedProcessControlEvidenceExport({ origin: "palette" }),
						"status.processEvidence.search": () =>
							jumpSelectedProcessControlEvidenceSearch({ origin: "palette" }),
						"status.remoteKnownHostsEvidence.select": () =>
							selectNextRemoteKnownHostsSelectionEvidenceExport({
								origin: "palette",
							}),
						"status.remoteKnownHostsEvidence.open": () =>
							openSelectedRemoteKnownHostsSelectionEvidenceExport({
								origin: "palette",
							}),
						"status.remoteKnownHostsEvidence.search": () =>
							jumpSelectedRemoteKnownHostsSelectionEvidenceSearch({
								origin: "palette",
							}),
						"status.remoteKnownHostsEvidence.copy": () =>
							openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff({
								origin: "palette",
							}),
						"status.remoteKnownHostsEvidence.export": () =>
							exportSelectedRemoteKnownHostsSelectionEvidenceHandoff({
								origin: "palette",
							}),
						"status.remoteKnownHostsEvidence.handoffSelect": () =>
							selectNextRemoteKnownHostsEvidenceHandoff({ origin: "palette" }),
						"status.remoteKnownHostsEvidence.handoffOpen": () =>
							openSelectedRemoteKnownHostsEvidenceHandoff({
								origin: "palette",
							}),
						"status.interfaceEvidence.select": () =>
							selectNextInterfaceConfirmationEvidenceExport({
								origin: "palette",
							}),
						"status.interfaceEvidence.open": () =>
							openSelectedInterfaceConfirmationEvidenceExport({
								origin: "palette",
							}),
						"status.interfaceEvidence.search": () =>
							jumpSelectedInterfaceConfirmationEvidenceSearch({
								origin: "palette",
							}),
						"status.interfaceEvidence.filter": () =>
							cycleInterfaceEvidenceStateFilter({ origin: "palette" }),
						"status.interfaceEvidence.find": () =>
							openInterfaceEvidenceSearchPrompt({ origin: "palette" }),
						"status.interfaceEvidence.presetSave": () =>
							saveCurrentInterfaceEvidenceSearchPreset({ origin: "palette" }),
						"status.interfaceEvidence.presetNext": () =>
							cycleInterfaceEvidenceSearchPreset({ origin: "palette" }),
						"status.interfaceEvidence.archive": () =>
							openSelectedInterfaceEvidenceArchive(),
						"status.interfaceEvidence.retention": () =>
							openInterfaceAuditArchiveRetentionPreview(),
						"status.resultJump.select": () =>
							selectNextStatusActivityResultTimelineJump({ origin: "palette" }),
						"status.resultJump.open": () =>
							openSelectedStatusActivityResultTimelineJump({
								origin: "palette",
							}),
						"status.resultJump.filter": () =>
							cycleStatusActivityResultTimelineJumpFilter({
								origin: "palette",
							}),
						"status.resultHistory.filter": () =>
							cycleStatusActivityResultHistoryFilter({ origin: "palette" }),
						"status.toolsEvidence.filter": () =>
							cycleToolEvidenceFilter({ origin: "palette" }),
						"status.toolsEvidence.search": () =>
							openToolEvidenceSearchPrompt({ origin: "palette" }),
						"status.toolsEvidence.archive": () =>
							openSelectedToolExportArchive({ origin: "palette" }),
						"status.toolsEvidence.retention": () =>
							openToolArchiveRetentionPreview({ origin: "palette" }),
						"status.toolsEvidence.matchOpen": () =>
							openSelectedStatusActivityToolsEvidenceSearchMatchFile(),
						"status.toolsEvidence.matchArchive": () =>
							openSelectedStatusActivityToolsEvidenceSearchMatchArchive(),
					});
				}

				if (effect === "process-guidance") {
					publishOutcome({
						kind: "success",
						summary: { kind: "process-guidance" },
					});
				}

				if (effect === "remote-connect-owner") {
					setScreen("remotes");
					setFocusArea("remotes");
					publishOutcome({
						kind: "success",
						summary: { kind: "remote-connect-guidance" },
					});
				}

				if (effect === "palette-owner") {
					const proposalInput = getInterfaceProposalInput(action.id);
					if (!proposalInput) {
						throw new Error("interface action has no proposal effect");
					}
					const proposal = prepareInterfacePanelInput({
						input: proposalInput,
						selectedIndex: selectedInterfaceIndex,
						summary: summaryRef.current,
						view: interfaceDetailView,
					});
					setScreen("interfaces");
					setFocusArea("workspaces");
					setInterfaceSourceCopyPreview(false);
					if (proposal.kind === "proposal") {
						setSelectedInterfaceIndex(proposal.selectedIndex);
						setInterfaceStateProposal(proposal.proposal);
						setInterfaceConfirmationResult(proposal.confirmationResult);
						log(proposal.notice.level, proposal.notice.message);
					} else if ("notice" in proposal && proposal.notice) {
						log(proposal.notice.level, proposal.notice.message);
					}
				}

				if (effect === "connections-list") {
					const result = await getActiveConnections();
					if (
						publishOutcome({
							kind: "success",
							summary: {
								kind: "connections",
								count: result.connections.length,
							},
						})
					) {
						setConnectionsResult(result);
					}
				}

				if (effect === "ports-list") {
					const result = await getListeningPorts();
					if (
						publishOutcome({
							kind: "success",
							summary: { kind: "ports", count: result.ports.length },
						})
					) {
						setPortsResult(result);
					}
				}
			} catch (caught) {
				publishOutcome({ kind: "failure", error: caught });
			} finally {
				endCommand();
			}
		},
		[
			configManagedShelfStateEffectSetters,
			connectionFilterPresets.length,
			configWorkspaceItems,
			configShelfLandingTarget,
			cycleInterfaceEvidenceSearchPreset,
			cycleStatusActivityResultHistoryFilter,
			cycleStatusActivityResultTimelineJumpFilter,
			cycleToolEvidenceFilter,
			cycleInterfaceEvidenceStateFilter,
			cycleTimelineEvidenceTrailSourceFilter,
			defaultPingHost,
			events,
			exportToolHistory,
			fileRoot,
			exportSelectedRemoteKnownHostsSelectionEvidenceHandoff,
			jumpSelectedInterfaceConfirmationEvidenceSearch,
			jumpSelectedProcessControlEvidenceSearch,
			jumpSelectedRemoteKnownHostsSelectionEvidenceSearch,
			jumpSelectedTimelineEvidenceTrailSearch,
			beginCommand,
			endCommand,
			interfaceDetailView,
			log,
			logProfiles.length,
			openInterfaceAuditArchiveRetentionPreview,
			openInterfaceEvidenceSearchPrompt,
			openToolEvidenceSearchPrompt,
			openSelectedInterfaceConfirmationEvidenceExport,
			openSelectedInterfaceEvidenceArchive,
			openSelectedProcessControlEvidenceExport,
			openSelectedRemoteKnownHostsEvidenceHandoff,
			openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff,
			openSelectedRemoteKnownHostsSelectionEvidenceExport,
			openSelectedStatusActivityResultTimelineJump,
			openSelectedStatusActivityToolsEvidenceSearchMatchArchive,
			openSelectedStatusActivityToolsEvidenceSearchMatchFile,
			openSelectedToolExportArchive,
			openSelectedTimelineEvidenceTrailExport,
			openToolArchiveRetentionPreview,
			portFilterPresets.length,
			refresh,
			refreshFiles,
			remoteProfiles.length,
			routeFilterPresets.length,
			selectNextInterfaceConfirmationEvidenceExport,
			selectNextProcessControlEvidenceExport,
			selectNextRemoteKnownHostsEvidenceHandoff,
			selectNextRemoteKnownHostsSelectionEvidenceExport,
			selectNextStatusActivityResultTimelineJump,
			selectNextTimelineEvidenceTrailExport,
			selectedInterfaceIndex,
			selectedToolHistoryIndex,
			saveCurrentInterfaceEvidenceSearchPreset,
			timelineFilter,
			timelineSearchQuery,
			toolHistory,
			toolExportFilter,
			toolExportQuery,
			toolTargetPresets.length,
			customToolTargetPresets.length,
			summary?.interfaces.length,
			updateCheckResult,
		],
	);

	useEffect(() => {
		const timer = setInterval(refresh, refreshInterval);
		return () => clearInterval(timer);
	}, [refresh, refreshInterval]);

	useEffect(() => {
		if (!logFollowEnabled || screen !== "logs") {
			return;
		}

		let disposed = false;
		const refreshLogs = async () => {
			try {
				const snapshot = await createOsLogSnapshot({
					limit: 50,
					timeoutMs: 3000,
				});
				if (!disposed) {
					setOsLogs(snapshot);
					setLogFollowRefreshCount((count) => Math.min(count + 1, 9999));
					setLogFollowLastStatus(snapshot.status);
					setLogFollowHistory((history) =>
						appendLogFollowHistory(history, {
							status: snapshot.status,
							entries: snapshot.entries.length,
						}),
					);
				}
			} catch (caught) {
				if (!disposed) {
					setLogFollowRefreshCount((count) => Math.min(count + 1, 9999));
					setLogFollowLastStatus("fail");
					setLogFollowHistory((history) =>
						appendLogFollowHistory(history, { status: "fail", entries: 0 }),
					);
					log(
						"fail",
						caught instanceof Error
							? `logs follow failed ${caught.message}`
							: `logs follow failed ${String(caught)}`,
					);
				}
			}
		};

		void refreshLogs();
		const timer = setInterval(refreshLogs, Math.max(1000, refreshInterval));
		return () => {
			disposed = true;
			clearInterval(timer);
		};
	}, [log, logFollowEnabled, refreshInterval, screen]);

	const openCleanupHandoffPrompt = useCallback(() => {
		const transition = prepareCleanupHandoffPrompt(cleanupJumpAudit, screen);
		if (transition.kind === "no-op" || !cleanupJumpAudit) {
			return false;
		}
		setCommandLine(openCommandLine(transition.prompt as CommandPrompt));
		setCleanupHandoffHistory((current) =>
			appendCleanupHandoffHistory(
				current,
				createCleanupHandoffHistory(cleanupJumpAudit, "prompt-opened"),
			),
		);
		setSelectedCleanupHandoffHistoryIndex(0);
		log(transition.notice.level, transition.notice.message);
		return true;
	}, [cleanupJumpAudit, log, screen]);

	const dismissCleanupHandoff = useCallback(() => {
		const transition = prepareCleanupHandoffDismissal(cleanupJumpAudit, screen);
		if (transition.kind === "no-op" || !cleanupJumpAudit) {
			return false;
		}

		setCleanupHandoffHistory((current) =>
			appendCleanupHandoffHistory(
				current,
				createCleanupHandoffHistory(cleanupJumpAudit, "dismissed"),
			),
		);
		setSelectedCleanupHandoffHistoryIndex(0);
		setCleanupJumpAudit(undefined);
		log(transition.notice.level, transition.notice.message);
		return true;
	}, [cleanupJumpAudit, log, screen]);

	const dismissConfigShelfLanding = useCallback(() => {
		const transition = prepareConfigManagedShelfLandingDismissal({
			target: configShelfLandingTarget,
			screen,
		});
		if (transition.kind === "no-op") {
			return false;
		}
		setConfigShelfLandingTarget(undefined);
		log(transition.notice.level, transition.notice.message);
		return true;
	}, [configShelfLandingTarget, log, screen]);

	const runConfigShelfFocusAction = useCallback(() => {
		const transition = prepareConfigManagedShelfFocusAction({
			target: configShelfLandingTarget,
			screen,
			network: { interfaceCount: summary?.interfaces.length ?? 0 },
			routes: {
				presets: routeFilterPresets,
				query: routeFilter,
				entries: routeTable?.routes ?? [],
			},
			connections: {
				presets: connectionFilterPresets,
				query: connectionFilter,
				entries: connections,
			},
			ports: {
				presets: portFilterPresets,
				query: portFilter,
				entries: ports,
			},
			tools: {
				presets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
			},
			logs: {
				profiles: logProfiles,
				level: logLevelFilter,
				query: logSearchQuery,
				entries: osLogs?.entries ?? [],
			},
			remotes: { profileCount: remoteProfiles.length },
		});
		if (transition.kind === "no-op") {
			return false;
		}
		applyConfigManagedShelfStateEffects(
			transition.effects,
			configManagedShelfStateEffectSetters,
		);
		log(transition.notice.level, transition.notice.message);
		return true;
	}, [
		configManagedShelfStateEffectSetters,
		configShelfLandingTarget,
		connectionFilter,
		connectionFilterPresets,
		connections,
		log,
		logLevelFilter,
		logProfiles,
		logSearchQuery,
		osLogs,
		portFilter,
		portFilterPresets,
		ports,
		remoteProfiles.length,
		routeFilter,
		routeFilterPresets,
		routeTable,
		screen,
		selectedToolTargetPresetIndex,
		summary,
		toolTargetPresets,
	]);

	const jumpToConfigManagedShelf = useCallback(
		(transition: ReturnType<typeof createConfigManagedShelfJumpTransition>) => {
			applyConfigManagedShelfStateEffects(
				transition.effects,
				configManagedShelfStateEffectSetters,
			);
			log(transition.notice.level, transition.notice.message);
		},
		[configManagedShelfStateEffectSetters, log],
	);

	const reopenCleanupHandoffHistory = useCallback(
		(patch: StatusWorkspaceStatePatch) => {
			if (patch.cleanupJumpAudit !== undefined) {
				setCleanupJumpAudit(patch.cleanupJumpAudit);
			}
			if (patch.screen !== undefined) {
				setScreen(patch.screen);
			}
		},
		[],
	);

	const refreshCleanupExportIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(
				cleanupExportIndexRequestTokenRef.current,
			);
			cleanupExportIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readCleanupHandoffHistoryExportIndex(baseDir);
				const transition = classifyCleanupExportIndexRefresh({
					target: "active",
					currentRequestToken: cleanupExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedCleanupExportIndexRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setCleanupExportIndex(transition.index);
					setSelectedCleanupExportIndex(transition.selectedIndex);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyCleanupExportIndexRefresh({
					target: "active",
					currentRequestToken: cleanupExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedCleanupExportIndexRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const refreshCleanupExportArchiveIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(
				cleanupExportArchiveIndexRequestTokenRef.current,
			);
			cleanupExportArchiveIndexRequestTokenRef.current = requestToken;
			try {
				const index =
					await readCleanupHandoffHistoryExportArchiveIndex(baseDir);
				const transition = classifyCleanupExportIndexRefresh({
					target: "archive",
					currentRequestToken: cleanupExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedCleanupExportArchiveIndexRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setCleanupExportArchiveIndex(transition.index);
					setSelectedCleanupExportArchiveIndex(transition.selectedIndex);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyCleanupExportIndexRefresh({
					target: "archive",
					currentRequestToken: cleanupExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedCleanupExportArchiveIndexRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const refreshToolExportIndex = useCallback(
		async (
			announce = true,
			selectionIntent: "preserve" | "newest" = "preserve",
		) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(toolExportIndexRequestTokenRef.current);
			toolExportIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readToolHistoryExportIndex(baseDir);
				const transition = classifyToolHistoryExportIndexRefresh({
					target: "active",
					currentRequestToken: toolExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex:
						selectionIntent === "newest"
							? 0
							: selectedToolExportIndexRef.current,
					filter: toolExportFilterRef.current,
					query: toolExportQueryRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setToolExportIndex(transition.index);
					setSelectedToolExportIndex(transition.selectedIndex);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyToolHistoryExportIndexRefresh({
					target: "active",
					currentRequestToken: toolExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex:
						selectionIntent === "newest"
							? 0
							: selectedToolExportIndexRef.current,
					filter: toolExportFilterRef.current,
					query: toolExportQueryRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	const refreshToolExportArchiveIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			const requestToken = beginRequest(
				toolExportArchiveIndexRequestTokenRef.current,
			);
			toolExportArchiveIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readToolHistoryExportArchiveIndex(baseDir);
				const transition = classifyToolHistoryExportIndexRefresh({
					target: "archive",
					currentRequestToken: toolExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedToolExportArchiveIndexRef.current,
					filter: toolExportArchiveFilterRef.current,
					query: toolExportArchiveQueryRef.current,
					announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setToolExportArchiveIndex(transition.index);
					setSelectedToolExportArchiveIndex(transition.selectedIndex);
				}
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			} catch (caught) {
				const transition = classifyToolHistoryExportIndexRefresh({
					target: "archive",
					currentRequestToken: toolExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: selectedToolExportArchiveIndexRef.current,
					filter: toolExportArchiveFilterRef.current,
					query: toolExportArchiveQueryRef.current,
					announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice) {
					log(transition.notice.level, transition.notice.message);
				}
			}
		},
		[log],
	);

	useEffect(() => {
		void refreshHandoffIndex(false);
		void refreshAuditExportIndex(false);
		void refreshAuditExportArchiveIndex(false);
		void refreshCleanupExportIndex(false);
		void refreshCleanupExportArchiveIndex(false);
		void refreshToolExportIndex(false);
		void refreshToolExportArchiveIndex(false);
		readConfig().then(async (config) => {
			syncConfigSessionState(config);
			setRemoteProfiles(config.remoteProfiles);
			setLogProfiles(config.logProfiles);
			setLogSearchPresets(config.logSearchPresets);
			setRouteFilterPresets(config.routeFilterPresets);
			setConnectionSort(parseConnectionSort(config.connectionSort));
			setPortSort(parsePortSort(config.portSort));
			setConnectionFilterPresets(config.connectionFilterPresets);
			setPortFilterPresets(config.portFilterPresets);
			setToolHistoryFilterPresets(config.toolHistoryFilterPresets);
			setToolHistorySort(config.toolHistorySort as ToolHistorySort);
			setToolHistoryGroup(config.toolHistoryGroup as ToolHistoryGroup);
			setToolHistoryDetailView(
				config.toolHistoryDetailView as ToolHistoryDetailView,
			);
			setSelectedRemoteIndex((index) =>
				clampIndex(index, config.remoteProfiles.length),
			);
			const nextT = createTranslator(config.language);
			const bootEvents = [
				createEvent("info", nextT("events.booted")),
				createEvent("info", nextT("events.lockedPolicy")),
			];
			const persisted = await readLatestConsoleAuditExport(
				dirname(getConfigPath()),
			).catch(() => undefined);
			const persistedCleanup = await readLatestCleanupHandoffHistoryExport(
				dirname(getConfigPath()),
			).catch(() => undefined);
			setEvents(
				[
					...(persisted?.events ?? []),
					...(persistedCleanup?.events ?? []),
					...bootEvents,
				].slice(-64),
			);
		});
		refresh();
	}, [
		refresh,
		refreshAuditExportArchiveIndex,
		refreshAuditExportIndex,
		refreshCleanupExportArchiveIndex,
		refreshCleanupExportIndex,
		refreshHandoffIndex,
		refreshToolExportArchiveIndex,
		refreshToolExportIndex,
		syncConfigSessionState,
	]);

	const submitCleanupExportArchiveCommand = useCallback(
		async (transition: CommandTransition<"submit-cleanup-export-archive">) => {
			if (transition.kind === "notice") {
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			const requestToken = beginRequest(
				evidenceArchiveMutationTokenRef.current,
			);
			evidenceArchiveMutationTokenRef.current = requestToken;
			setCleanupExportArchivePlan(plan);
			setCommandLine((current) => closeCommandLine(current));
			const result = await archiveCleanupHandoffHistoryExport(plan);
			const outcome = classifyCleanupExportArchiveOutcome({
				currentToken: evidenceArchiveMutationTokenRef.current,
				requestToken,
				result,
			});
			for (const notice of outcome.notices) {
				log(notice.level, notice.message);
			}
			if (outcome.refreshActive) {
				await refreshCleanupExportIndex(false);
			}
			if (outcome.refreshArchive) {
				await refreshCleanupExportArchiveIndex(false);
			}
		},
		[log, refreshCleanupExportArchiveIndex, refreshCleanupExportIndex],
	);

	const submitToolExportArchiveCommand = useCallback(
		async (transition: CommandTransition<"submit-tool-export-archive">) => {
			if (transition.kind === "notice") {
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			const requestToken = beginRequest(
				evidenceArchiveMutationTokenRef.current,
			);
			evidenceArchiveMutationTokenRef.current = requestToken;
			setToolExportArchivePlan(plan);
			setCommandLine((current) => closeCommandLine(current));
			const result = await archiveToolHistoryExport(plan);
			const outcome = classifyToolExportArchiveOutcome({
				currentToken: evidenceArchiveMutationTokenRef.current,
				requestToken,
				plan,
				result,
			});
			for (const notice of outcome.notices) {
				log(notice.level, notice.message);
			}
			if (outcome.activityResult) {
				recordStatusActivityResult(outcome.activityResult);
			}
			if (outcome.refreshActive) {
				await refreshToolExportIndex(false);
			}
			if (outcome.refreshArchive) {
				await refreshToolExportArchiveIndex(false);
			}
			if (outcome.publishCurrentState && outcome.selectedEvidenceKind) {
				setSelectedStatusEvidenceKind(outcome.selectedEvidenceKind);
			}
		},
		[
			log,
			recordStatusActivityResult,
			refreshToolExportArchiveIndex,
			refreshToolExportIndex,
		],
	);

	const submitAuditExportArchiveCommand = useCallback(
		async (transition: CommandTransition<"submit-audit-export-archive">) => {
			if (transition.kind === "notice") {
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			const requestToken = beginRequest(
				evidenceArchiveMutationTokenRef.current,
			);
			evidenceArchiveMutationTokenRef.current = requestToken;
			setAuditExportArchivePlan(plan);
			setCommandLine((current) => closeCommandLine(current));
			const result = await archiveConsoleAuditExport(plan);
			const outcome = classifyAuditExportArchiveOutcome({
				currentToken: evidenceArchiveMutationTokenRef.current,
				requestToken,
				scope: transition.scope,
				plan,
				result,
			});
			for (const notice of outcome.notices) {
				log(notice.level, notice.message);
			}
			if (outcome.activityResult) {
				recordStatusActivityResult(outcome.activityResult);
			}
			if (outcome.refreshActive) {
				await refreshAuditExportIndex(false);
			}
			if (outcome.refreshArchive) {
				await refreshAuditExportArchiveIndex(false);
			}
			if (outcome.publishCurrentState && outcome.interfaceStateFilter) {
				setInterfaceEvidenceStateFilter(outcome.interfaceStateFilter);
			}
			if (outcome.publishCurrentState && outcome.selectedIndex !== undefined) {
				setSelectedInterfaceConfirmationAuditExportIndex(outcome.selectedIndex);
			}
			if (outcome.publishCurrentState && outcome.selectedEvidenceKind) {
				setSelectedStatusEvidenceKind(outcome.selectedEvidenceKind);
			}
		},
		[
			log,
			recordStatusActivityResult,
			refreshAuditExportArchiveIndex,
			refreshAuditExportIndex,
		],
	);

	const submitAuditArchiveRetentionCommand = useCallback(
		async (transition: CommandTransition<"submit-audit-archive-retention">) => {
			if (transition.kind === "notice") {
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			const requestToken = beginRequest(
				evidenceArchiveMutationTokenRef.current,
			);
			evidenceArchiveMutationTokenRef.current = requestToken;
			setAuditArchiveRetentionPlan(plan);
			setCommandLine((current) => closeCommandLine(current));
			const result = await pruneConsoleAuditArchive(plan);
			const outcome = classifyAuditArchiveRetentionOutcome({
				currentToken: evidenceArchiveMutationTokenRef.current,
				requestToken,
				scope: transition.scope,
				plan,
				result,
			});
			for (const notice of outcome.notices) {
				log(notice.level, notice.message);
			}
			if (outcome.activityResult) {
				recordStatusActivityResult(outcome.activityResult);
			}
			if (outcome.refreshArchive) {
				await refreshAuditExportArchiveIndex(false);
			}
		},
		[log, recordStatusActivityResult, refreshAuditExportArchiveIndex],
	);

	const submitToolArchiveRetentionCommand = useCallback(
		async (transition: CommandTransition<"submit-tools-archive-retention">) => {
			if (transition.kind === "notice") {
				setCommandLine((current) => closeCommandLine(current));
				log(transition.notice.level, transition.notice.message);
				return;
			}
			const plan = transition.plan;
			const requestToken = beginRequest(
				evidenceArchiveMutationTokenRef.current,
			);
			evidenceArchiveMutationTokenRef.current = requestToken;
			setToolArchiveRetentionPlan(plan);
			setCommandLine((current) => closeCommandLine(current));
			const result = await pruneToolHistoryExportArchive(plan);
			const outcome = classifyToolArchiveRetentionOutcome({
				currentToken: evidenceArchiveMutationTokenRef.current,
				requestToken,
				result,
			});
			for (const notice of outcome.notices) {
				log(notice.level, notice.message);
			}
			if (outcome.activityResult) {
				recordStatusActivityResult(outcome.activityResult);
			}
			if (outcome.refreshArchive) {
				await refreshToolExportArchiveIndex(false);
			}
		},
		[log, recordStatusActivityResult, refreshToolExportArchiveIndex],
	);

	const submitDnsServerProposalCommand = useCallback(
		(transition: CommandTransition<"submit-dns-proposal">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "no-op") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setSelectedDnsTargetIndex(transition.selectedIndex);
			setDnsServerProposal(transition.proposal);
			log(transition.notice.level, transition.notice.message);
		},
		[log],
	);

	const openInterfaceStateProposal = useCallback(
		(action: InterfaceStateProposalAction) => {
			const transition = prepareInterfacePanelInput({
				input: action === "disable" ? "D" : "U",
				selectedIndex: selectedInterfaceIndex,
				summary: summaryRef.current,
				view: interfaceDetailView,
			});
			if (transition.kind === "proposal") {
				setSelectedInterfaceIndex(transition.selectedIndex);
				setInterfaceStateProposal(transition.proposal);
				setInterfaceConfirmationResult(transition.confirmationResult);
				log(transition.notice.level, transition.notice.message);
				return;
			}
			if ("notice" in transition && transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
		},
		[interfaceDetailView, log, selectedInterfaceIndex],
	);

	const submitInterfaceConfirmationCommand = useCallback(
		(transition: CommandTransition<"submit-interface-confirmation">) => {
			setCommandLine((current) => closeCommandLine(current));
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			setInterfaceConfirmationResult(transition.result);
			log(transition.notice.level, transition.notice.message);
			recordStatusActivityResult(
				createInterfaceConfirmationStatusActivityResult(transition.result),
			);
		},
		[log, recordStatusActivityResult],
	);

	const exportCleanupHandoffHistory = useCallback(
		async (effect: StatusCleanupHistoryWriteEffect) => {
			try {
				const written = await writeCleanupHandoffHistoryExport(effect.plan);
				const notice = formatStatusCleanupHistoryWriteSuccess(effect, written);
				log(notice.level, notice.message);
				return true;
			} catch (caught) {
				const notice = formatStatusCleanupHistoryWriteFailure(effect, caught);
				log(notice.level, notice.message);
				return false;
			}
		},
		[log],
	);

	const applyToolsInputIoEffect = useCallback(
		async (
			effect: Extract<
				ToolsWorkspaceInputEffect,
				| { kind: "persist-history-preferences" }
				| { kind: "persist-target-presets" }
				| { kind: "run" }
				| { kind: "export" }
			>,
		) => {
			try {
				switch (effect.kind) {
					case "persist-history-preferences":
						await setConfigToolHistoryPreferences(effect.preferences);
						break;
					case "persist-target-presets":
						await setConfigToolTargetPresets(effect.presets);
						break;
					case "run":
						await runToolPlan(effect.plan);
						log("ok", effect.completionNotice);
						break;
					case "export":
						await exportToolHistory(effect);
						break;
				}
			} catch (caught) {
				const detail =
					caught instanceof Error ? caught.message : String(caught);
				const prefix =
					effect.kind === "persist-history-preferences" ||
					effect.kind === "persist-target-presets"
						? `${effect.failureMessagePrefix} `
						: "";
				log("fail", `${prefix}${detail}`);
			}
		},
		[exportToolHistory, log, runToolPlan],
	);

	async function persistRouteInputPresets(presets: string[]): Promise<void> {
		try {
			await setConfigRouteFilterPresets(presets);
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `route preset save failed ${caught.message}`
					: `route preset save failed ${String(caught)}`,
			);
		}
	}

	async function exportRemoteHistoryInput(
		plan: ConsoleAuditExportPlan,
	): Promise<void> {
		try {
			const written =
				await writeRemoteKnownHostsSelectionHistoryAuditExport(plan);
			setLastStatusActivityCopyIntentAuditExport(written);
			log(
				"ok",
				`remote known_hosts selection history exported ${written.path} events=${written.eventCount}`,
			);
			void refreshAuditExportIndex(false);
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `remote known_hosts selection history export failed ${caught.message}`
					: `remote known_hosts selection history export failed ${String(caught)}`,
			);
		}
	}

	async function exportSelectedTimelineInput(input: {
		plan: ConsoleAuditExportPlan;
		filter: TimelineFilter;
		query: string;
		selectedIndex: number;
		total: number;
	}): Promise<void> {
		try {
			const written = await writeConsoleAuditExport(input.plan);
			log(
				"ok",
				`audit selected exported ${written.path} events=${written.eventCount}`,
			);
			recordStatusActivityResult(
				createTimelineSelectedStatusActivityResult("export", {
					filter: input.filter,
					label: `timeline audit selected ${written.eventCount}`,
					path: written.path,
					query: input.query,
					selectedIndex: input.selectedIndex,
					total: input.total,
				}),
			);
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `audit selected export failed ${caught.message}`
					: `audit selected export failed ${String(caught)}`,
			);
		}
	}

	async function exportTimelineEvidenceInput(
		plan: ConsoleAuditExportPlan,
	): Promise<void> {
		try {
			const written = await writeTimelineEvidenceTrailAuditExport(plan);
			log(
				"ok",
				`timeline evidence trail exported ${written.path} events=${written.eventCount}`,
			);
			void refreshAuditExportIndex(false, "newest");
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `timeline evidence trail export failed ${caught.message}`
					: `timeline evidence trail export failed ${String(caught)}`,
			);
		}
	}

	async function persistLogInput(
		effect:
			| { kind: "presets"; presets: string[] }
			| { kind: "profiles"; profiles: LogProfile[] },
	): Promise<void> {
		try {
			if (effect.kind === "presets") {
				await setConfigLogSearchPresets(effect.presets);
			} else {
				await setConfigLogProfiles(effect.profiles);
			}
		} catch (caught) {
			const label = effect.kind === "presets" ? "preset" : "profile";
			log(
				"fail",
				caught instanceof Error
					? `logs ${label} save failed ${caught.message}`
					: `logs ${label} save failed ${String(caught)}`,
			);
		}
	}

	async function refreshLogsInput(): Promise<void> {
		try {
			const snapshot = await createOsLogSnapshot({ limit: 50 });
			setOsLogs(snapshot);
			log(
				snapshot.status === "ok" ? "ok" : "warn",
				`logs refreshed ${snapshot.entries.length}`,
			);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}

	async function applyStatusAuditWriteInput(
		effect: StatusAuditWriteEffect,
	): Promise<void> {
		try {
			const written =
				effect.writer === "interface-confirmation"
					? await writeInterfaceConfirmationAuditExport(effect.plan)
					: effect.writer === "remote-known-hosts"
						? await writeRemoteKnownHostsSelectionHistoryAuditExport(
								effect.plan,
							)
						: await writeStatusActivityCopyIntentAuditExport(effect.plan);
			if (effect.publication.setLastStatusActivityCopyIntentAuditExport) {
				setLastStatusActivityCopyIntentAuditExport(written);
			}
			const notice = formatStatusAuditWriteSuccess(effect, written);
			log(notice.level, notice.message);
			void applyStatusIndexRefresh(effect.publication.refresh);
		} catch (caught) {
			const notice = formatStatusAuditWriteFailure(effect, caught);
			log(notice.level, notice.message);
		}
	}

	async function applyStatusIndexRefresh(
		effect: StatusIndexRefreshEffect,
	): Promise<void> {
		const snapshot = effect.snapshot;
		if (effect.target === "handoff") {
			const requestToken = beginRequest(handoffIndexRequestTokenRef.current);
			handoffIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readHandoffIndex(effect.baseDir);
				const transition = classifyHandoffIndexRefresh({
					currentRequestToken: handoffIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					announce: effect.announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setHandoffIndex(transition.index);
					setSelectedHandoffIndex(transition.selectedIndex);
				}
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				const transition = classifyHandoffIndexRefresh({
					currentRequestToken: handoffIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					announce: effect.announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		if (effect.target === "audit") {
			const requestToken = beginRequest(
				auditExportIndexRequestTokenRef.current,
			);
			auditExportIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readConsoleAuditExportIndex(effect.baseDir);
				const transition = classifyAuditExportIndexRefresh({
					currentRequestToken: auditExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					announce: effect.announce,
					timelineSourceFilter: snapshot.timelineEvidenceTrailSourceFilter,
					interfaceConfirmationAuditArchiveExports:
						snapshot.interfaceConfirmationAuditArchiveExports,
					interfaceStateFilter: snapshot.interfaceEvidenceStateFilter,
					interfaceQuery: snapshot.interfaceEvidenceQuery,
					recoveredSelections: {
						timeline: snapshot.selectedTimelineEvidenceTrailAuditExportIndex,
						process: snapshot.selectedProcessControlAuditExportIndex,
						remoteKnownHosts:
							snapshot.selectedRemoteKnownHostsSelectionAuditExportIndex,
						interface: snapshot.selectedInterfaceConfirmationAuditExportIndex,
					},
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setAuditExportIndex(transition.index);
					setSelectedAuditExportIndex(transition.selectedIndex);
					setLastStatusActivityCopyIntentAuditExport(
						transition.lastStatusActivityCopyIntentAuditExport,
					);
					setTimelineEvidenceTrailAuditExports(
						transition.timelineEvidenceTrailAuditExports,
					);
					setLastTimelineEvidenceTrailAuditExport(
						transition.latestTimelineEvidenceTrailAuditExport,
					);
					setSelectedTimelineEvidenceTrailAuditExportIndex(
						transition.selectedTimelineIndex,
					);
					setProcessControlAuditExports(transition.processControlAuditExports);
					setSelectedProcessControlAuditExportIndex(
						transition.selectedProcessIndex,
					);
					setRemoteKnownHostsSelectionAuditExports(
						transition.remoteKnownHostsSelectionAuditExports,
					);
					setSelectedRemoteKnownHostsSelectionAuditExportIndex(
						transition.selectedRemoteKnownHostsIndex,
					);
					setInterfaceConfirmationAuditExports(
						transition.interfaceConfirmationAuditExports,
					);
					interfaceConfirmationAuditExportsRef.current =
						transition.interfaceConfirmationAuditExports;
					selectedInterfaceConfirmationAuditExportIndexRef.current =
						transition.selectedInterfaceIndex;
					setSelectedInterfaceConfirmationAuditExportIndex(
						transition.selectedInterfaceIndex,
					);
				}
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				const transition = classifyAuditExportIndexRefresh({
					currentRequestToken: auditExportIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					announce: effect.announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		if (effect.target === "audit-archive") {
			const requestToken = beginRequest(
				auditExportArchiveIndexRequestTokenRef.current,
			);
			auditExportArchiveIndexRequestTokenRef.current = requestToken;
			try {
				const index = await readConsoleAuditExportArchiveIndex(effect.baseDir);
				const transition = classifyAuditExportArchiveIndexRefresh({
					currentRequestToken: auditExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					selectedInterfaceIndex:
						snapshot.selectedInterfaceConfirmationAuditExportIndex,
					interfaceStateFilter: snapshot.interfaceEvidenceStateFilter,
					interfaceQuery: snapshot.interfaceEvidenceQuery,
					interfaceConfirmationAuditExports:
						snapshot.interfaceConfirmationAuditExports,
					announce: effect.announce,
					outcome: { status: "success", index },
				});
				if (transition.status === "success") {
					setAuditExportArchiveIndex(transition.index);
					setSelectedAuditExportArchiveIndex(transition.selectedIndex);
					setInterfaceConfirmationAuditArchiveExports(
						transition.interfaceConfirmationAuditArchiveExports,
					);
					interfaceConfirmationAuditArchiveExportsRef.current =
						transition.interfaceConfirmationAuditArchiveExports;
					selectedInterfaceConfirmationAuditExportIndexRef.current =
						transition.selectedInterfaceIndex;
					setSelectedInterfaceConfirmationAuditExportIndex(
						transition.selectedInterfaceIndex,
					);
				}
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			} catch (caught) {
				const transition = classifyAuditExportArchiveIndexRefresh({
					currentRequestToken: auditExportArchiveIndexRequestTokenRef.current,
					requestToken,
					selectedIndex: snapshot.selectedIndex,
					announce: effect.announce,
					outcome: { status: "failure", error: caught },
				});
				if (transition.notice)
					log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		const archive = effect.target === "cleanup-archive";
		const tokenRef = archive
			? cleanupExportArchiveIndexRequestTokenRef
			: cleanupExportIndexRequestTokenRef;
		const requestToken = beginRequest(tokenRef.current);
		tokenRef.current = requestToken;
		try {
			const index = archive
				? await readCleanupHandoffHistoryExportArchiveIndex(effect.baseDir)
				: await readCleanupHandoffHistoryExportIndex(effect.baseDir);
			const transition = classifyCleanupExportIndexRefresh({
				target: archive ? "archive" : "active",
				currentRequestToken: tokenRef.current,
				requestToken,
				selectedIndex: snapshot.selectedIndex,
				announce: effect.announce,
				outcome: { status: "success", index },
			});
			if (transition.status === "success") {
				if (archive) {
					setCleanupExportArchiveIndex(transition.index);
					setSelectedCleanupExportArchiveIndex(transition.selectedIndex);
				} else {
					setCleanupExportIndex(transition.index);
					setSelectedCleanupExportIndex(transition.selectedIndex);
				}
			}
			if (transition.notice)
				log(transition.notice.level, transition.notice.message);
		} catch (caught) {
			const transition = classifyCleanupExportIndexRefresh({
				target: archive ? "archive" : "active",
				currentRequestToken: tokenRef.current,
				requestToken,
				selectedIndex: snapshot.selectedIndex,
				announce: effect.announce,
				outcome: { status: "failure", error: caught },
			});
			if (transition.notice)
				log(transition.notice.level, transition.notice.message);
		}
	}

	async function applyStatusConfigWrite(
		effect: StatusConfigWriteEffect,
	): Promise<void> {
		try {
			if (effect.key === "interfaceEvidenceSearchPresets") {
				await setConfigInterfaceEvidenceSearchPresets(effect.value as string[]);
			} else {
				await setConfigValue(effect.key, String(effect.value));
			}
		} catch (caught) {
			const notice = formatStatusConfigWriteFailure(effect, caught);
			log(notice.level, notice.message);
		}
	}

	function clearStatusDialogPlan(key: StatusDialogPlanKey): void {
		switch (key) {
			case "externalOpen":
				setExternalOpenPlan(undefined);
				break;
			case "fileOpen":
				setFileOpenPlan(undefined);
				break;
			case "auditExportArchive":
				setAuditExportArchivePlan(undefined);
				break;
			case "auditArchiveRetention":
				setAuditArchiveRetentionPlan(undefined);
				break;
			case "cleanupExportArchive":
				setCleanupExportArchivePlan(undefined);
				break;
			case "toolExportArchive":
				setToolExportArchivePlan(undefined);
				break;
			case "toolArchiveRetention":
				setToolArchiveRetentionPlan(undefined);
				break;
		}
	}

	function applyStatusWorkspaceStatePatch(
		patch: StatusWorkspaceStatePatch,
	): void {
		if (patch.selectedUpdateHandoffIndex !== undefined)
			setSelectedUpdateHandoffIndex(patch.selectedUpdateHandoffIndex);
		if (patch.selectedStatusActivitySource !== undefined)
			setSelectedStatusActivitySource(patch.selectedStatusActivitySource);
		if (patch.selectedStatusActivityResultIndex !== undefined)
			setSelectedStatusActivityResultIndex(
				patch.selectedStatusActivityResultIndex,
			);
		if (patch.statusActivityResultHistoryFilter !== undefined)
			setStatusActivityResultHistoryFilter(
				patch.statusActivityResultHistoryFilter,
			);
		if (patch.statusActivityResultTimelineJumpFilter !== undefined)
			setStatusActivityResultTimelineJumpFilter(
				patch.statusActivityResultTimelineJumpFilter,
			);
		if (patch.selectedStatusActivityCopyPreviewRowIndex !== undefined)
			setSelectedStatusActivityCopyPreviewRowIndex(
				patch.selectedStatusActivityCopyPreviewRowIndex,
			);
		if (patch.statusActivityCopyPreviewExpanded !== undefined)
			setStatusActivityCopyPreviewExpanded(
				patch.statusActivityCopyPreviewExpanded,
			);
		if (patch.statusActivityCopyIntentHistory !== undefined)
			setStatusActivityCopyIntentHistory(patch.statusActivityCopyIntentHistory);
		if (patch.selectedStatusActivityCopyIntentIndex !== undefined)
			setSelectedStatusActivityCopyIntentIndex(
				patch.selectedStatusActivityCopyIntentIndex,
			);
		if (patch.selectedStatusActivityResultAuditJumpIndex !== undefined)
			setSelectedStatusActivityResultAuditJumpIndex(
				patch.selectedStatusActivityResultAuditJumpIndex,
			);
		if (patch.selectedStatusActivityToolsEvidenceSearchMatchIndex !== undefined)
			setSelectedStatusActivityToolsEvidenceSearchMatchIndex(
				patch.selectedStatusActivityToolsEvidenceSearchMatchIndex,
			);
		if (patch.selectedTimelineEvidenceTrailAuditExportIndex !== undefined)
			setSelectedTimelineEvidenceTrailAuditExportIndex(
				patch.selectedTimelineEvidenceTrailAuditExportIndex,
			);
		if (patch.timelineEvidenceTrailSourceFilter !== undefined)
			setTimelineEvidenceTrailSourceFilter(
				patch.timelineEvidenceTrailSourceFilter,
			);
		if (patch.selectedStatusEvidenceKind !== undefined)
			setSelectedStatusEvidenceKind(patch.selectedStatusEvidenceKind);
		if (patch.selectedHandoffIndex !== undefined)
			setSelectedHandoffIndex(patch.selectedHandoffIndex);
		if (patch.selectedAuditExportIndex !== undefined)
			setSelectedAuditExportIndex(patch.selectedAuditExportIndex);
		if (patch.selectedAuditExportArchiveIndex !== undefined)
			setSelectedAuditExportArchiveIndex(patch.selectedAuditExportArchiveIndex);
		if (patch.selectedCleanupExportIndex !== undefined)
			setSelectedCleanupExportIndex(patch.selectedCleanupExportIndex);
		if (patch.selectedCleanupExportArchiveIndex !== undefined)
			setSelectedCleanupExportArchiveIndex(
				patch.selectedCleanupExportArchiveIndex,
			);
		if (patch.selectedToolExportIndex !== undefined)
			setSelectedToolExportIndex(patch.selectedToolExportIndex);
		if (patch.selectedToolExportArchiveIndex !== undefined)
			setSelectedToolExportArchiveIndex(patch.selectedToolExportArchiveIndex);
		if (patch.toolExportFilter !== undefined)
			setToolExportFilter(patch.toolExportFilter);
		if (patch.toolExportArchiveFilter !== undefined)
			setToolExportArchiveFilter(patch.toolExportArchiveFilter);
		if (patch.selectedProcessControlAuditExportIndex !== undefined)
			setSelectedProcessControlAuditExportIndex(
				patch.selectedProcessControlAuditExportIndex,
			);
		if (patch.selectedRemoteKnownHostsSelectionAuditExportIndex !== undefined)
			setSelectedRemoteKnownHostsSelectionAuditExportIndex(
				patch.selectedRemoteKnownHostsSelectionAuditExportIndex,
			);
		if (patch.selectedInterfaceConfirmationAuditExportIndex !== undefined)
			setSelectedInterfaceConfirmationAuditExportIndex(
				patch.selectedInterfaceConfirmationAuditExportIndex,
			);
		if (patch.interfaceEvidenceStateFilter !== undefined)
			setInterfaceEvidenceStateFilter(patch.interfaceEvidenceStateFilter);
		if (patch.interfaceEvidenceQuery !== undefined)
			setInterfaceEvidenceQuery(patch.interfaceEvidenceQuery);
		if (patch.interfaceEvidenceSearchPresets !== undefined)
			setInterfaceEvidenceSearchPresets(patch.interfaceEvidenceSearchPresets);
		if (patch.selectedCleanupShelfIndex !== undefined)
			setSelectedCleanupShelfIndex(patch.selectedCleanupShelfIndex);
		if (patch.selectedTimelineIndex !== undefined)
			setSelectedTimelineIndex(patch.selectedTimelineIndex);
		if (patch.timelineFilter !== undefined)
			setTimelineFilter(patch.timelineFilter);
		if (patch.timelineSearchQuery !== undefined)
			setTimelineSearchQuery(patch.timelineSearchQuery);
		if (patch.screen !== undefined) setScreen(patch.screen);
		if (patch.focusArea !== undefined) setFocusArea(patch.focusArea);
		if (patch.cleanupJumpAudit !== undefined)
			setCleanupJumpAudit(patch.cleanupJumpAudit);
		if (patch.lastStatusActivityEvidenceFocusPlan !== undefined)
			setLastStatusActivityEvidenceFocusPlan(
				patch.lastStatusActivityEvidenceFocusPlan,
			);
	}

	const commandSubmitContexts = {
		"submit-path": {
			effect: "submit-path",
			snapshot: {
				root: fileRoot,
				backHistory: fileHistory,
				forwardHistory: fileForwardHistory,
			},
		},
		"submit-clipboard": {
			effect: "submit-clipboard",
			snapshot: { state: clipboardConfirmation, platform: currentPlatform() },
		},
		"submit-route-destination": { effect: "submit-route-destination" },
		"submit-route-filter": {
			effect: "submit-route-filter",
			snapshot: {
				routes: routeTable?.routes ?? [],
				presets: routeFilterPresets,
			},
		},
		"submit-route-filter-cleanup": {
			effect: "submit-route-filter-cleanup",
			snapshot: { presets: routeFilterPresets },
		},
		"submit-tool-history-filter": {
			effect: "submit-tool-history-filter",
			snapshot: { history: toolHistory },
		},
		"submit-tool-history-cleanup": {
			effect: "submit-tool-history-cleanup",
			snapshot: { presets: toolHistoryFilterPresets },
		},
		"submit-tool-target-label": {
			effect: "submit-tool-target-label",
			snapshot: {
				presets: customToolTargetPresets,
				targetPresets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
			},
		},
		"submit-tool-target-value": {
			effect: "submit-tool-target-value",
			snapshot: {
				presets: customToolTargetPresets,
				targetPresets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
			},
		},
		"submit-tool-target-action": {
			effect: "submit-tool-target-action",
			snapshot: {
				presets: customToolTargetPresets,
				targetPresets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
			},
		},
		"submit-tool-target-cleanup": {
			effect: "submit-tool-target-cleanup",
			snapshot: {
				presets: customToolTargetPresets,
				targetPresets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
			},
		},
		"submit-tool-target-preset": {
			effect: "submit-tool-target-preset",
			snapshot: {
				presets: customToolTargetPresets,
				targetPresets: toolTargetPresets,
				selectedIndex: selectedToolTargetPresetIndex,
				limit: toolTargetPresetLimit,
			},
		},
		"submit-remote-profile": { effect: "submit-remote-profile" },
		"submit-remote-connect": {
			effect: "submit-remote-connect",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
				diagnostic: undefined,
				startedAt: 0,
			},
		},
		"submit-remote-host-trust": {
			effect: "submit-remote-host-trust",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
			},
		},
		"submit-remote-host-key-evidence": {
			effect: "submit-remote-host-key-evidence",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				session: remoteHostKeyEvidenceSession,
			},
		},
		"submit-remote-known-hosts-candidate": {
			effect: "submit-remote-known-hosts-candidate",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				session: remoteKnownHostsCandidateSession,
			},
		},
		"submit-remote-known-hosts-paste": {
			effect: "submit-remote-known-hosts-paste",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
			},
		},
		"submit-remote-known-hosts-selection": {
			effect: "submit-remote-known-hosts-selection",
			snapshot: {
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
			},
		},
		"submit-endpoint-filter": {
			effect: "submit-endpoint-filter",
			snapshot: {
				connections: {
					kind: "connections",
					rows: sortedConnections,
					presets: connectionFilterPresets,
				},
				ports: {
					kind: "ports",
					rows: sortedPorts,
					presets: portFilterPresets,
				},
			},
		},
		"submit-endpoint-filter-cleanup": {
			effect: "submit-endpoint-filter-cleanup",
			snapshot: {
				connections: {
					presets: connectionFilterPresets,
					rowCount: sortedConnections.length,
				},
				ports: { presets: portFilterPresets, rowCount: sortedPorts.length },
			},
		},
		"submit-timeline-search": {
			effect: "submit-timeline-search",
			snapshot: {
				events,
				filter: timelineFilter,
				presets: timelineSearchPresets,
			},
		},
		"submit-timeline-search-cleanup": {
			effect: "submit-timeline-search-cleanup",
			snapshot: { presets: timelineSearchPresets },
		},
		"submit-log-search": {
			effect: "submit-log-search",
			snapshot: {
				entries: osLogs?.entries ?? [],
				level: logLevelFilter,
				presets: logSearchPresets,
			},
		},
		"submit-logs-cleanup": {
			effect: "submit-logs-cleanup",
			snapshot: { presets: logSearchPresets, profiles: logProfiles },
		},
		"submit-control-confirmation": {
			effect: "submit-control-confirmation",
			snapshot: {
				previewPlan: actionPreviewPlan,
				platform: currentPlatform(),
				updateCheckResult,
			},
		},
		"submit-port-process-control": {
			effect: "submit-port-process-control",
			snapshot: {
				ports: sortedPorts,
				selectedIndex: selectedPortIndex,
				platform: currentPlatform(),
				policy: controlExecutionPolicy,
			},
		},
		"submit-external-open": {
			effect: "submit-external-open",
			snapshot: { plan: externalOpenPlan, platform: currentPlatform() },
		},
		"submit-file-open": {
			effect: "submit-file-open",
			snapshot: {
				plan: fileOpenPlan,
				baseDir: dirname(getConfigPath()),
				platform: currentPlatform(),
			},
		},
		"submit-cleanup-export-archive": {
			effect: "submit-cleanup-export-archive",
			snapshot: {
				preview: cleanupExportArchivePlan,
				baseDir: cleanupExportIndex.baseDir,
			},
		},
		"submit-tool-export-archive": {
			effect: "submit-tool-export-archive",
			snapshot: { preview: toolExportArchivePlan },
		},
		"submit-audit-export-archive": {
			effect: "submit-audit-export-archive",
			snapshot: {
				preview: auditExportArchivePlan,
				baseDir: auditExportIndex.baseDir,
				scope: auditExportArchiveScope,
			},
		},
		"submit-audit-archive-retention": {
			effect: "submit-audit-archive-retention",
			snapshot: {
				preview: auditArchiveRetentionPlan,
				auditIndex: auditExportArchiveIndex,
				scope: auditArchiveRetentionScope,
			},
		},
		"submit-tools-archive-retention": {
			effect: "submit-tools-archive-retention",
			snapshot: {
				preview: toolArchiveRetentionPlan,
				index: toolExportArchiveIndex,
			},
		},
		"submit-tools-evidence-search": {
			effect: "submit-tools-evidence-search",
			snapshot: {
				selectedKind: toolEvidenceSearchScope,
				activeIndex: toolExportIndex,
				activeFilter: toolExportFilter,
				archiveIndex: toolExportArchiveIndex,
				archiveFilter: toolExportArchiveFilter,
			},
		},
		"submit-interface-evidence-search": {
			effect: "submit-interface-evidence-search",
			snapshot: {
				state: interfaceEvidenceStateFilter,
				activeExports: interfaceConfirmationAuditExports,
				archivedExports: interfaceConfirmationAuditArchiveExports,
			},
		},
		"submit-dns-proposal": {
			effect: "submit-dns-proposal",
			snapshot: { selectedIndex: selectedDnsTargetIndex, summary },
		},
		"submit-interface-confirmation": {
			effect: "submit-interface-confirmation",
			snapshot: { proposal: interfaceStateProposal },
		},
		"submit-config-reset": {
			effect: "submit-config-reset",
			snapshot: {
				preview: configResetPreview,
				resetValues: {
					auditArchiveRetentionLimit,
					toolTargetPresetLimit,
					language,
					refreshInterval,
					defaultPingHost,
					controlExecutionMode: controlExecutionPolicy.mode,
					allowAdminDryRun: controlExecutionPolicy.allowAdminDryRun,
					enableExperimentalControls,
					editorSaveMode,
					statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter,
				},
			},
		},
		"submit-editor-append": {
			effect: "submit-editor-append",
			snapshot: {
				buffer: editorPreview,
				selectedLineIndex: selectedEditorLineIndex,
			},
		},
		"submit-editor-insert-before": {
			effect: "submit-editor-insert-before",
			snapshot: {
				buffer: editorPreview,
				selectedLineIndex: selectedEditorLineIndex,
			},
		},
		"submit-editor-insert-after": {
			effect: "submit-editor-insert-after",
			snapshot: {
				buffer: editorPreview,
				selectedLineIndex: selectedEditorLineIndex,
			},
		},
		"submit-editor-replace": {
			effect: "submit-editor-replace",
			snapshot: {
				buffer: editorPreview,
				selectedLineIndex: selectedEditorLineIndex,
			},
		},
		"submit-editor-save": {
			effect: "submit-editor-save",
			snapshot: {
				editorPreview,
				provider: localFileProvider,
				policy: { mode: editorSaveMode },
			},
		},
		"submit-config-text": {
			effect: "submit-config-text",
			snapshot: {
				items: configWorkspaceItems,
				selectedIndex: selectedConfigIndex,
			},
		},
		"submit-tool": {
			effect: "submit-tool",
			snapshot: { defaultPingHost, summary },
		},
		"submit-file-operation-destination": {
			effect: "submit-file-operation-destination",
			snapshot: { dialog: fileOperationDialog },
		},
		"submit-file-operation-confirmation": {
			effect: "submit-file-operation-confirmation",
			snapshot: {
				dialog: fileOperationDialog,
				provider: fileProvider,
				policy: { mode: editorSaveMode },
			},
		},
	} satisfies CommandSubmitContextTable;

	const commandSubmitHandlers = {
		"submit-path": submitPathCommand,
		"submit-clipboard": submitClipboardCommand,
		"submit-route-destination": submitRouteDestinationCommand,
		"submit-route-filter": submitRouteFilterCommand,
		"submit-route-filter-cleanup": submitRouteFilterCleanupCommand,
		"submit-tool-history-filter": submitToolHistoryFilterCommand,
		"submit-tool-history-cleanup": submitToolHistoryCleanupCommand,
		"submit-tool-target-label": submitToolTargetLabelCommand,
		"submit-tool-target-value": submitToolTargetValueCommand,
		"submit-tool-target-action": submitToolTargetActionCommand,
		"submit-tool-target-cleanup": submitToolTargetCleanupCommand,
		"submit-tool-target-preset": submitToolTargetPresetCommand,
		"submit-remote-profile": submitRemoteProfileCommand,
		"submit-remote-connect": submitRemoteConnectCommand,
		"submit-remote-host-trust": submitRemoteHostTrustReviewCommand,
		"submit-remote-host-key-evidence": submitRemoteHostKeyEvidenceInputCommand,
		"submit-remote-known-hosts-candidate":
			submitRemoteKnownHostsCandidateCommand,
		"submit-remote-known-hosts-paste": submitRemoteKnownHostsPasteReviewCommand,
		"submit-remote-known-hosts-selection":
			submitRemoteKnownHostsPasteSelectionCommand,
		"submit-endpoint-filter": submitEndpointFilterCommand,
		"submit-endpoint-filter-cleanup": submitEndpointFilterCleanupCommand,
		"submit-timeline-search": submitTimelineSearchCommand,
		"submit-timeline-search-cleanup": submitTimelineSearchCleanupCommand,
		"submit-log-search": submitLogSearchCommand,
		"submit-logs-cleanup": submitLogsCleanupCommand,
		"submit-control-confirmation": submitControlConfirmationCommand,
		"submit-port-process-control": submitPortProcessControlCommand,
		"submit-external-open": submitExternalOpenCommand,
		"submit-file-open": submitFileOpenCommand,
		"submit-cleanup-export-archive": submitCleanupExportArchiveCommand,
		"submit-tool-export-archive": submitToolExportArchiveCommand,
		"submit-audit-export-archive": submitAuditExportArchiveCommand,
		"submit-audit-archive-retention": submitAuditArchiveRetentionCommand,
		"submit-tools-archive-retention": submitToolArchiveRetentionCommand,
		"submit-tools-evidence-search": submitToolEvidenceSearchCommand,
		"submit-interface-evidence-search": submitInterfaceEvidenceSearchCommand,
		"submit-dns-proposal": submitDnsServerProposalCommand,
		"submit-interface-confirmation": submitInterfaceConfirmationCommand,
		"submit-config-reset": submitConfigResetCommand,
		"submit-editor-append": submitEditorAppendLineCommand,
		"submit-editor-insert-before": submitEditorInsertLineCommand,
		"submit-editor-insert-after": submitEditorInsertLineCommand,
		"submit-editor-replace": submitEditorReplaceLineCommand,
		"submit-editor-save": submitEditorSaveConfirmationCommand,
		"submit-config-text": submitConfigTextCommand,
		"submit-tool": submitToolCommand,
		"submit-file-operation-destination": submitFileOperationDestinationCommand,
		"submit-file-operation-confirmation": submitFileOperationConfirmCommand,
	} satisfies CommandSubmitResolvedHandlers;

	useInput((input, key) => {
		const overlay = getAppInputOverlay({
			commandLineActive: commandLine.active,
			paletteActive: palette.active,
			fileOperationDialogActive: fileOperationDialog.active,
			fileFilterActive: fileFilter.active,
		});
		if (overlay === "command-line") {
			const fileCommandTransition = prepareFileWorkspaceCommandLineInput({
				commandLine,
				dialog: fileOperationDialog,
				input,
				escape: key.escape,
				return: key.return,
				backspace: key.backspace || key.delete,
			});
			if (fileCommandTransition.action === "apply") {
				setCommandLine(fileCommandTransition.commandLine);
				setFileOperationDialog(fileCommandTransition.dialog);
				if (fileCommandTransition.notice) {
					log(
						fileCommandTransition.notice.level,
						fileCommandTransition.notice.message,
					);
				}
				if (fileCommandTransition.submit === "destination") {
					const submission = prepareCommandSubmit(
						fileCommandTransition.commandLine,
					);
					if (submission) {
						const effect = prepareCommandSubmitEffectFromTable(
							submission,
							{
								...commandSubmitContexts,
								"submit-file-operation-destination": {
									effect: "submit-file-operation-destination",
									snapshot: { dialog: fileCommandTransition.dialog },
								},
							},
							{
								remoteConnectionDiagnostic:
									remoteConnectionDiagnosticRef.current,
								remoteConnectionStartedAt: Date.now(),
							},
						);
						const guard = dispatchCommandSubmitEffect(
							effect,
							commandSubmitHandlers,
						);
						if (guard) {
							log(guard.notice.level, guard.notice.message);
						}
					}
				}
				if (fileCommandTransition.submit === "confirmation") {
					const submission = prepareCommandSubmit(
						fileCommandTransition.commandLine,
					);
					if (submission) {
						const effect = prepareCommandSubmitEffectFromTable(
							submission,
							{
								...commandSubmitContexts,
								"submit-file-operation-confirmation": {
									effect: "submit-file-operation-confirmation",
									snapshot: {
										dialog: fileCommandTransition.dialog,
										provider: fileProvider,
										policy: { mode: editorSaveMode },
									},
								},
							},
							{
								remoteConnectionDiagnostic:
									remoteConnectionDiagnosticRef.current,
								remoteConnectionStartedAt: Date.now(),
							},
						);
						const guard = dispatchCommandSubmitEffect(
							effect,
							commandSubmitHandlers,
						);
						if (guard) {
							log(guard.notice.level, guard.notice.message);
						}
					}
				}
				return;
			}
			if (key.escape) {
				const cancellation = prepareCommandCancellation(
					commandLine.prompt,
					focusArea,
					{ fileOperationDialog },
				);
				if (!cancellation) return;
				setCommandLine((current) => closeCommandLine(current));
				setFocusArea(cancellation.focusArea);
				for (const cleanup of cancellation.cleanup) {
					switch (cleanup) {
						case "clipboard-confirmation":
							setClipboardConfirmation(clearClipboardConfirmationState());
							break;
						case "connection-copy-preview":
							setConnectionCopyPreview(false);
							break;
						case "port-copy-preview":
							setPortCopyPreview(false);
							break;
						case "process-copy-preview":
							setProcessClipboardPreview(false);
							break;
						case "route-copy-preview":
							setRouteCopyPreview(false);
							break;
						case "tool-copy-preview":
							setToolCopyPreview(false);
							break;
						case "external-open-plan":
							setExternalOpenPlan(undefined);
							break;
						case "file-open-plan":
							setFileOpenPlan(undefined);
							break;
						case "port-process-preview":
							setPortProcessControlPreview(false);
							break;
						case "cleanup-export-archive-plan":
							setCleanupExportArchivePlan(undefined);
							break;
						case "tool-export-archive-plan":
							setToolExportArchivePlan(undefined);
							break;
						case "audit-export-archive-plan":
							setAuditExportArchivePlan(undefined);
							break;
						case "audit-archive-retention-plan":
							setAuditArchiveRetentionPlan(undefined);
							break;
						case "tool-archive-retention-plan":
							setToolArchiveRetentionPlan(undefined);
							break;
						case "config-reset-preview":
							setConfigResetPreview(undefined);
							break;
						case "file-operation-dialog":
							if (cancellation.fileOperationDialog) {
								setFileOperationDialog(cancellation.fileOperationDialog);
							}
							break;
					}
				}
				log(cancellation.notice.level, cancellation.notice.message);
				return;
			}

			if (key.return) {
				const submission = prepareCommandSubmit(commandLine);
				if (!submission) return;
				const effect = prepareCommandSubmitEffectFromTable(
					submission,
					commandSubmitContexts,
					{
						remoteConnectionDiagnostic: remoteConnectionDiagnosticRef.current,
						remoteConnectionStartedAt: Date.now(),
					},
				);
				const guard = dispatchCommandSubmitEffect(
					effect,
					commandSubmitHandlers,
				);
				if (guard) {
					log(guard.notice.level, guard.notice.message);
				}
				return;
			}

			const textInput = prepareCommandLineTextInput({
				commandLine,
				clipboardConfirmation,
				input,
				backspace: key.backspace || key.delete,
				tab: key.tab,
				summary: summaryRef.current,
			});
			if (textInput.kind === "apply") {
				setCommandLine(textInput.commandLine);
				setClipboardConfirmation(textInput.clipboardConfirmation);
			}
			return;
		}

		if (overlay === "palette") {
			const decision = prepareCommandPaletteInput({
				actions,
				state: palette,
				input,
				escape: key.escape,
				return: key.return,
				backspace: key.backspace,
				delete: key.delete,
				upArrow: key.upArrow,
				downArrow: key.downArrow,
			});
			if (decision.kind === "no-op") {
				return;
			}
			setPalette(decision.state);
			if (decision.kind === "dismiss") {
				log(decision.notice.level, decision.notice.message);
				return;
			}
			if (decision.kind === "command") {
				if (decision.command.kind === "port-process-preview") {
					openPalettePortProcessControlPreview();
					return;
				}
				if (decision.command.kind === "interface-proposal") {
					setScreen("interfaces");
					setFocusArea("workspaces");
					setInterfaceSourceCopyPreview(false);
					openInterfaceStateProposal(decision.command.action);
					return;
				}
				runAction(decision.command.action);
			}
			return;
		}

		if (overlay === "file-operation-dialog") {
			const transition = prepareActiveFileOperationDialogInput(
				fileOperationDialog,
				{ input, escape: key.escape, return: key.return },
			);
			setFileOperationDialog(transition.dialog);
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		if (overlay === "file-filter") {
			const transition = prepareActiveFileFilterInput({
				filter: fileFilter,
				input,
				escape: key.escape,
				return: key.return,
				backspace: key.backspace || key.delete,
			});
			setFileFilter(transition.filter);
			setSelectedFileIndex(transition.selectedIndex);
			if (transition.notice) {
				log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		const workspaceInputFamily = getWorkspaceInputFamily(screen, focusArea);

		if (key.escape && dismissCleanupHandoff()) {
			return;
		}

		if (key.escape && dismissConfigShelfLanding()) {
			return;
		}

		const globalHotkey = prepareGlobalHotkeyInput({
			input,
			family: workspaceInputFamily,
			actions,
			control: {
				previewPlan: actionPreviewPlan,
				confirmation: actionConfirmation,
				platform: currentPlatform(),
				updateCheckResult,
			},
		});
		switch (globalHotkey.kind) {
			case "quit":
				exit();
				return;
			case "open-palette":
				setFocusArea(globalHotkey.focusArea);
				setPalette(openCommandPalette());
				log(globalHotkey.notice.level, globalHotkey.notice.message);
				return;
			case "run-action":
				if (globalHotkey.screen) setScreen(globalHotkey.screen);
				runAction(globalHotkey.action);
				break;
			case "confirm-action": {
				const { transition } = globalHotkey;
				if (transition.kind === "prompt") {
					setCommandLine(openCommandLine(transition.prompt));
				}
				log(transition.notice.level, transition.notice.message);
				return;
			}
			case "execute-action":
				void runControlExecutionAttempt(globalHotkey.request);
				return;
			case "no-op":
				break;
		}

		const enterPressed = input === "\r" || key.return;
		if (enterPressed && openCleanupHandoffPrompt()) {
			return;
		}
		if (enterPressed && runConfigShelfFocusAction()) {
			return;
		}

		const fileInputTransition = prepareFileWorkspaceInput({
			screen,
			focusArea,
			input,
			return: key.return,
			escape: key.escape,
			upArrow: key.upArrow,
			downArrow: key.downArrow,
			leftArrow: key.leftArrow,
			entries: displayedFileEntries,
			selectedIndex: selectedFileIndex,
			providerKind: fileProvider.kind,
			locationCount: fileLocations.length,
			root: fileRoot,
			backHistory: fileHistory,
			forwardHistory: fileForwardHistory,
			locations: fileLocations,
			selectedLocationIndex,
			filterQuery: fileFilter.query,
		});
		if (fileInputTransition.action !== "unhandled") {
			switch (fileInputTransition.action) {
				case "enter-focus":
					setFocusArea(fileInputTransition.focusArea);
					log(
						fileInputTransition.notice.level,
						fileInputTransition.notice.message,
					);
					break;
				case "leave-focus":
					setFocusArea(fileInputTransition.focusArea);
					break;
				case "open-selected":
					void openSelectedFileEntry(fileInputTransition.transition);
					break;
				case "parent":
					void goToParentDirectory(fileInputTransition.transition);
					break;
				case "history":
					void (fileInputTransition.direction === "back"
						? goBackFileHistory(fileInputTransition.transition)
						: goForwardFileHistory(fileInputTransition.transition));
					break;
				case "clipboard":
					if (fileInputTransition.intent.preview) {
						openClipboardConfirmation(fileInputTransition.intent.preview);
					} else if (fileInputTransition.intent.notice) {
						log(
							fileInputTransition.intent.notice.level,
							fileInputTransition.intent.notice.message,
						);
					}
					break;
				case "filter":
					setFileFilter(fileInputTransition.filter);
					setSelectedFileIndex(fileInputTransition.selectedIndex);
					log(
						fileInputTransition.notice.level,
						fileInputTransition.notice.message,
					);
					break;
				case "operation":
					openSelectedFileOperation(fileInputTransition.transition);
					break;
				case "disconnect":
					void disconnectRemoteFiles();
					break;
				case "next-location":
					void jumpToNextLocation(fileInputTransition.transition);
					break;
				case "location":
					void jumpToLocation(fileInputTransition.transition);
					break;
				case "path":
					setCommandLine(openCommandLine("path"));
					log(
						fileInputTransition.notice.level,
						fileInputTransition.notice.message,
					);
					break;
				case "select":
					setSelectedFileIndex(fileInputTransition.selectedIndex);
					break;
				case "notice":
					log(
						fileInputTransition.notice.level,
						fileInputTransition.notice.message,
					);
					break;
			}
			return;
		}

		if (workspaceInputFamily === "processes") {
			const decision = prepareProcessPanelInput({
				input: key.return ? "\r" : input,
				direction: key.downArrow
					? "next"
					: key.upArrow
						? "previous"
						: undefined,
				files: selectedProcessFiles,
				selectedIndex: selectedProcessFileIndex,
			});
			if (decision.kind === "selection") {
				setSelectedProcessFileIndex(decision.selectedIndex);
				setProcessClipboardPreview(decision.clipboardPreview);
			} else if (decision.kind === "copy") {
				setProcessClipboardPreview(decision.clipboardPreview);
				openClipboardConfirmation(decision.preview);
			} else if (decision.kind !== "no-op") {
				void openSelectedProcessFile(decision);
			}
			if (decision.kind !== "no-op") return;
		}

		if (workspaceInputFamily === "operations") {
			const decision = prepareOperationRunPanelInput({
				input: key.return ? "\r" : input,
				direction: key.downArrow
					? "next"
					: key.upArrow
						? "previous"
						: undefined,
				presets: operationPresets,
				selectedIndex: selectedOperationPresetIndex,
				currentRun: operationRunRef.current,
				currentToken: operationRunTokenRef.current,
			});
			if (decision.kind === "selection") {
				setSelectedOperationPresetIndex(decision.selectedIndex);
			} else if (decision.kind === "run") {
				void runSelectedOperationPreset(decision.transition);
			} else if (decision.kind === "cancel") {
				cancelOperationRun(decision.transition);
			}
			if (decision.kind !== "no-op") return;
		}

		const workspaceEnter = prepareWorkspaceEnterInput({
			input,
			key,
			family: workspaceInputFamily,
			actions,
			selectedActionIndex,
			remoteProfiles,
			selectedRemoteIndex,
		});
		if (workspaceEnter.kind === "focus") {
			setFocusArea(workspaceEnter.focusArea);
			log(workspaceEnter.notice.level, workspaceEnter.notice.message);
			return;
		}
		if (workspaceEnter.kind === "run-action") {
			runAction(workspaceEnter.action);
			return;
		}
		if (workspaceEnter.kind === "select-remote-profile") {
			void selectRemoteProfile(workspaceEnter.transition);
			return;
		}

		const editorCommand =
			workspaceInputFamily === "editor"
				? getEditorWorkspaceCommand(input)
				: undefined;
		if (editorCommand === "delete") {
			deleteSelectedEditorLine();
			return;
		}
		if (editorCommand === "undo") {
			undoEditorEdit();
			return;
		}
		if (editorCommand) {
			const transition = prepareEditorPromptOpen({
				command: editorCommand,
				editorPreview,
				selectedLineIndex: selectedEditorLineIndex,
			});
			if (transition.kind === "open") {
				setCommandLine(openCommandLine(transition.prompt));
			}
			log(transition.notice.level, transition.notice.message);
			return;
		}

		if (workspaceInputFamily === "routes") {
			const decision = prepareRoutePanelInput({
				input,
				view: routeDetailView,
				filter: routeFilter,
				presets: routeFilterPresets,
				routes: routeTable?.routes ?? [],
				result: routeTable,
				path: routePath,
				sort: routeSort,
				handoff: {
					baseDir: dirname(getConfigPath()),
					origin: createActiveFileOpenOrigin(configShelfLandingTarget),
				},
				end: key.end,
				home: key.home,
				tab: key.tab,
			});
			if (decision.kind === "detail") {
				setRouteDetailView(decision.view);
				setRouteCopyPreview(decision.copyPreview);
			} else if (decision.kind === "filter") {
				setRouteFilter(decision.filter);
				setRouteCopyPreview(decision.copyPreview);
			} else if (decision.kind === "save-preset") {
				setRouteFilterPresets(decision.presets);
				setRouteCopyPreview(decision.copyPreview);
				void persistRouteInputPresets(decision.presets);
			} else if (decision.kind === "sort") {
				setRouteSort(decision.sort);
				setRouteCopyPreview(decision.copyPreview);
			} else if (decision.kind === "copy") {
				setRouteCopyPreview(true);
				openClipboardConfirmation(decision.preview);
			} else if (decision.kind === "command") {
				if (decision.prompt) {
					setCommandLine(openCommandLine(decision.prompt));
				} else if (decision.handoff?.action === "export") {
					void exportRouteHandoff(decision.handoff);
				} else if (decision.handoff?.action === "open") {
					void openRouteHandoff(decision.handoff);
				}
				if (decision.copyPreview === false) setRouteCopyPreview(false);
			}
			if ("notice" in decision && decision.notice) {
				log(decision.notice.level, decision.notice.message);
			}
			if (decision.kind !== "no-op") return;
		}

		if (workspaceInputFamily === "interfaces") {
			const decision = prepareInterfacePanelInput({
				input: key.return ? "\r" : input,
				proposal: interfaceStateProposal,
				selectedIndex: selectedInterfaceIndex,
				summary,
				handoff: { baseDir: dirname(getConfigPath()) },
				tab: key.tab,
				view: interfaceDetailView,
			});
			if (decision.kind === "detail") {
				setInterfaceDetailView(decision.view);
				setInterfaceSourceCopyPreview(decision.copyPreview);
			} else if (decision.kind === "proposal") {
				setSelectedInterfaceIndex(decision.selectedIndex);
				setInterfaceStateProposal(decision.proposal);
				setInterfaceConfirmationResult(decision.confirmationResult);
			} else if (decision.kind === "confirmation") {
				setCommandLine(openCommandLine(decision.prompt));
			} else if (decision.kind === "clear") {
				setInterfaceStateProposal(decision.proposal);
				setInterfaceConfirmationResult(decision.confirmationResult);
			} else if (decision.kind === "copy") {
				setInterfaceSourceCopyPreview(true);
				openClipboardConfirmation(decision.preview);
			} else if (decision.kind === "source-handoff") {
				if (decision.action === "export") {
					void exportInterfaceSourceHandoff(decision);
				} else {
					void openInterfaceSourceHandoff(decision);
				}
			}
			if ("notice" in decision && decision.notice) {
				log(decision.notice.level, decision.notice.message);
			}
			if (decision.kind !== "no-op") return;
		}

		if (workspaceInputFamily === "endpoints") {
			const kind: EndpointHandoffKind =
				screen === "connections" ? "connections" : "ports";
			const decision = prepareEndpointPanelInput({
				kind,
				input: key.return ? "\r" : input,
				view: kind === "connections" ? connectionDetailView : portDetailView,
				filter: kind === "connections" ? connectionFilter : portFilter,
				presets:
					kind === "connections" ? connectionFilterPresets : portFilterPresets,
				rows: kind === "connections" ? connections : ports,
				visibleRows: kind === "connections" ? sortedConnections : sortedPorts,
				selectedIndex:
					kind === "connections" ? selectedConnectionIndex : selectedPortIndex,
				home: key.home,
				end: key.end,
				tab: key.tab,
				upArrow: key.upArrow,
				downArrow: key.downArrow,
				processControlInspector: portProcessControlInspector,
			});
			const envelope = prepareEndpointWorkspaceInputEnvelope({
				kind,
				decision,
				handoff: {
					baseDir: dirname(getConfigPath()),
					origin: createActiveFileOpenOrigin(configShelfLandingTarget),
					connections: {
						filter: connectionFilter,
						result: connectionsResult,
						sort: connectionSort,
						view: connectionDetailView,
					},
					ports: {
						filter: portFilter,
						result: portsResult,
						sort: portSort,
						view: portDetailView,
					},
				},
				connections: {
					rows: connections,
					visibleRows: sortedConnections,
					selectedIndex: selectedConnectionIndex,
					view: connectionDetailView,
					filter: connectionFilter,
					sort: connectionSort,
					presets: connectionFilterPresets,
					copyPreview: connectionCopyPreview,
				},
				ports: {
					rows: ports,
					visibleRows: sortedPorts,
					selectedIndex: selectedPortIndex,
					view: portDetailView,
					filter: portFilter,
					sort: portSort,
					presets: portFilterPresets,
					copyPreview: portCopyPreview,
					processControlPreview: portProcessControlPreview,
					processControlInspector: portProcessControlInspector,
				},
			});
			if (envelope.kind === "handled") {
				for (const effect of envelope.effects) {
					switch (effect.kind) {
						case "connections-detail":
							setConnectionDetailView(effect.view);
							setConnectionCopyPreview(effect.copyPreview);
							break;
						case "ports-detail":
							setPortDetailView(effect.view);
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							break;
						case "connections-filter":
							setConnectionFilter(effect.filter);
							setSelectedConnectionIndex(effect.selectedIndex);
							setConnectionCopyPreview(effect.copyPreview);
							break;
						case "ports-filter":
							setPortFilter(effect.filter);
							setSelectedPortIndex(effect.selectedIndex);
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							break;
						case "connections-save-preset":
							setConnectionFilterPresets(effect.presets);
							setConnectionCopyPreview(effect.copyPreview);
							void applyEndpointIoEffect(effect.persistence);
							break;
						case "ports-save-preset":
							setPortFilterPresets(effect.presets);
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							void applyEndpointIoEffect(effect.persistence);
							break;
						case "connections-selection":
							setSelectedConnectionIndex(effect.selectedIndex);
							setConnectionCopyPreview(effect.copyPreview);
							break;
						case "ports-selection":
							setSelectedPortIndex(effect.selectedIndex);
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							break;
						case "ports-control":
							setPortProcessControlPreview(effect.processControlPreview);
							setPortCopyPreview(effect.copyPreview);
							setCommandLine(openCommandLine(effect.prompt));
							break;
						case "connections-sort":
							setConnectionSort(effect.sort);
							setConnectionCopyPreview(effect.copyPreview);
							void applyEndpointIoEffect(effect.persistence);
							break;
						case "ports-sort":
							setPortSort(effect.sort);
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							void applyEndpointIoEffect(effect.persistence);
							break;
						case "command-line":
							setCommandLine(openCommandLine(effect.prompt));
							break;
						case "callback":
							if ("handoff" in effect) {
								void (effect.callback === "export-endpoint"
									? exportEndpointHandoff(effect.scope, effect.handoff)
									: openEndpointHandoff(effect.scope, effect.handoff));
							} else {
								void applyEndpointIoEffect({
									kind: "inspect-process",
									plan: effect.plan,
								});
							}
							break;
						case "connection-clipboard":
							setConnectionCopyPreview(effect.copyPreview);
							openClipboardConfirmation(effect.preview);
							break;
						case "port-clipboard":
							setPortCopyPreview(effect.copyPreview);
							setPortProcessControlPreview(effect.processControlPreview);
							openClipboardConfirmation(effect.preview);
							break;
						case "port-process-inspector":
							setPortProcessControlInspector(effect.inspectorVisible);
							if (effect.request.kind === "load-port-file-evidence") {
								void applyEndpointIoEffect(effect.request);
							}
							break;
						case "notice":
							break;
					}
					if ("notice" in effect && effect.notice) {
						log(effect.notice.level, effect.notice.message);
					}
				}
				return;
			}
		}

		if (workspaceInputFamily === "dns") {
			const decision = prepareDnsPanelInput({
				input,
				selectedIndex: selectedDnsTargetIndex,
				summary,
			});
			if (decision.kind === "command") {
				setCommandLine(openCommandLine("dns-servers"));
			} else if (decision.kind === "selection") {
				setSelectedDnsTargetIndex(decision.selectedIndex);
				setDnsServerProposal(decision.proposal);
			} else if (decision.kind === "clear") {
				setDnsServerProposal(decision.proposal);
			}
			if (decision.notice) {
				log(decision.notice.level, decision.notice.message);
			}
			if (decision.kind !== "no-op") return;
		}

		const statusCommand =
			workspaceInputFamily === "status"
				? getStatusWorkspaceCommand(input, key)
				: undefined;
		const statusTransition = prepareStatusWorkspaceInput({
			command: statusCommand,
			inputDigit: input,
			state:
				workspaceInputFamily === "status"
					? {
							baseDir: dirname(getConfigPath()),
							platform: currentPlatform(),
							generatedAt: new Date(),
							fileOpenOrigin: createActiveFileOpenOrigin(
								configShelfLandingTarget,
							),
							retentionLimit: auditArchiveRetentionLimit,
							updates: {
								packageResult: updateCheckResult,
								githubResult: githubReleaseCheckResult,
								selectedLinkIndex: selectedUpdateHandoffIndex,
							},
							activity: {
								selectedSource: selectedStatusActivitySource,
								results: statusActivityResults,
								selectedResultIndex: selectedStatusActivityResultIndex,
								resultHistoryFilter: statusActivityResultHistoryFilter,
								resultTimelineJumpFilter:
									statusActivityResultTimelineJumpFilter,
								selectedCopyPreviewRowIndex:
									selectedStatusActivityCopyPreviewRowIndex,
								copyPreviewExpanded: statusActivityCopyPreviewExpanded,
								copyIntents: statusActivityCopyIntentHistory,
								selectedCopyIntentIndex: selectedStatusActivityCopyIntentIndex,
								selectedAuditJumpIndex:
									selectedStatusActivityResultAuditJumpIndex,
								selectedToolsEvidenceMatchIndex:
									selectedStatusActivityToolsEvidenceSearchMatchIndex,
								timelineEvidenceTrailAuditExports,
								selectedTimelineEvidenceTrailAuditExportIndex,
								timelineEvidenceTrailSourceFilter,
								toolsEvidenceRecovery:
									statusActivityToolsEvidenceSearchRecovery,
								lastCopyIntentAuditExport:
									lastStatusActivityCopyIntentAuditExport,
								lastEvidenceFocusPlan: lastStatusActivityEvidenceFocusPlan,
							},
							evidence: {
								indexes: statusEvidenceIndexes,
								selection: statusEvidenceSelection,
								selectedKind: selectedStatusEvidenceKind,
								interfaceEvidenceSearchPresets,
							},
							cleanup: {
								index: cleanupShelfIndex,
								selectedShelfIndex: selectedCleanupShelfIndex,
								history: cleanupHandoffHistory,
								selectedHistoryIndex: selectedCleanupHandoffHistoryIndex,
							},
							dialogs: {
								externalOpen: Boolean(externalOpenPlan),
								fileOpen: Boolean(fileOpenPlan),
								auditExportArchive: Boolean(auditExportArchivePlan),
								auditArchiveRetention: Boolean(auditArchiveRetentionPlan),
								cleanupExportArchive: Boolean(cleanupExportArchivePlan),
								toolExportArchive: Boolean(toolExportArchivePlan),
								toolArchiveRetention: Boolean(toolArchiveRetentionPlan),
							},
							configManagedShelfRows,
							events,
						}
					: undefined,
		});
		if (statusTransition.kind === "handled") {
			for (const effect of statusTransition.effects) {
				switch (effect.kind) {
					case "state":
						if (effect.patch.cleanupJumpAudit !== undefined) {
							reopenCleanupHandoffHistory(effect.patch);
						}
						applyStatusWorkspaceStatePatch(effect.patch);
						break;
					case "notice":
						log(effect.notice.level, effect.notice.message);
						break;
					case "clipboard-confirmation":
						openSelectedUpdateHandoffClipboard(effect.preview);
						break;
					case "record-activity":
						recordStatusActivityResult(effect.result);
						break;
					case "command-prompt":
						setCommandLine(
							openCommandLine(effect.prompt, { value: effect.value ?? "" }),
						);
						setScreen(effect.screen);
						setFocusArea(effect.focusArea);
						break;
					case "timeline-jump":
						setTimelineFilter(effect.transition.filter);
						setTimelineSearchQuery(effect.transition.query);
						setSelectedTimelineIndex(effect.transition.selectedIndex);
						setScreen(effect.screen);
						log(
							effect.transition.notice.level,
							effect.transition.notice.message,
						);
						break;
					case "open-file-confirmation":
						for (const plan of effect.clearPlans) {
							clearStatusDialogPlan(plan);
						}
						switch (effect.target) {
							case "handoff":
								openSelectedHandoffFile(effect);
								break;
							case "audit":
								openSelectedAuditExportFile(effect);
								break;
							case "audit-archive":
								openSelectedAuditExportArchiveFile(effect);
								break;
							case "cleanup":
							case "cleanup-archive":
								openSelectedCleanupExportFile(effect);
								break;
							case "tools":
								openSelectedToolExportFile(effect);
								break;
							case "tools-archive":
								openSelectedToolExportArchiveFile(effect);
								break;
							case "process":
							case "remote-known-hosts":
							case "interface":
								setFileOpenPlan(effect.plan);
								setCommandLine(openCommandLine(effect.prompt));
								setScreen(effect.screen);
								break;
						}
						break;
					case "external-open-confirmation":
						openSelectedUpdateHandoffExternal(effect);
						break;
					case "plan-confirmation":
						for (const plan of effect.clearPlans) {
							clearStatusDialogPlan(plan);
						}
						switch (effect.prompt) {
							case "audit-export-archive":
								openSelectedAuditExportArchive(effect);
								break;
							case "audit-archive-retention":
								if (effect.scope === "interface") {
									setAuditArchiveRetentionPlan(
										effect.plan as ConsoleAuditArchiveRetentionPlan,
									);
									setAuditArchiveRetentionScope("interface");
									setCommandLine(openCommandLine(effect.prompt));
									setScreen(effect.screen);
								} else {
									openAuditArchiveRetentionPreview(effect);
								}
								break;
							case "cleanup-export-archive":
								openSelectedCleanupExportArchive(effect);
								break;
							case "tool-export-archive":
								setToolExportArchivePlan(
									effect.plan as ToolHistoryExportArchivePlan,
								);
								break;
							case "tools-archive-retention":
								setToolArchiveRetentionPlan(
									effect.plan as ToolHistoryArchiveRetentionPlan,
								);
								break;
						}
						if (
							effect.prompt === "tool-export-archive" ||
							effect.prompt === "tools-archive-retention"
						) {
							setCommandLine(openCommandLine(effect.prompt));
							setScreen(effect.screen);
						}
						break;
					case "refresh-index":
						void applyStatusIndexRefresh(effect);
						break;
					case "handoff-archive":
						void archiveSelectedHandoffFile(effect).then((succeeded) => {
							if (succeeded) void applyStatusIndexRefresh(effect.refresh);
						});
						break;
					case "cleanup-history-write":
						void exportCleanupHandoffHistory(effect).then((succeeded) => {
							if (succeeded) void applyStatusIndexRefresh(effect.refresh);
						});
						break;
					case "config-write":
						void applyStatusConfigWrite(effect);
						break;
					case "audit-write":
						void applyStatusAuditWriteInput(effect);
						break;
				}
			}
			return;
		}

		const configCommand =
			workspaceInputFamily === "config"
				? getConfigWorkspaceCommand(input, key)
				: undefined;
		const configTransition = prepareConfigWorkspaceInput({
			command: configCommand,
			items: configWorkspaceItems,
			selectedIndex: selectedConfigIndex,
			selectedShelfTarget: selectedConfigShelfTarget,
			actions,
			resetValues: {
				auditArchiveRetentionLimit,
				toolTargetPresetLimit,
				language,
				refreshInterval,
				defaultPingHost,
				controlExecutionMode: controlExecutionPolicy.mode,
				allowAdminDryRun: controlExecutionPolicy.allowAdminDryRun,
				enableExperimentalControls,
				editorSaveMode,
				statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter,
			},
			shelfCounts: {
				network: summary?.interfaces.length ?? 0,
				routes: routeFilterPresets.length,
				connections: connectionFilterPresets.length,
				ports: portFilterPresets.length,
				tools: toolTargetPresets.length,
				logs: logProfiles.length,
				remotes: remoteProfiles.length,
			},
		});
		if (configTransition.kind === "selection") {
			setSelectedConfigIndex(configTransition.selectedIndex);
			log(configTransition.notice.level, configTransition.notice.message);
			return;
		}
		if (configTransition.kind === "adjust") {
			void saveConfigWorkspaceAdjustment(configTransition.transition);
			return;
		}
		if (configTransition.kind === "cycle-policy") {
			void applyNextConfigPolicyPreset();
			return;
		}
		if (configTransition.kind === "reset") {
			openConfigResetConfirmation(configTransition.transition);
			return;
		}
		if (configTransition.kind === "shelf-selection") {
			setSelectedConfigShelfTarget(configTransition.target);
			log(configTransition.notice.level, configTransition.notice.message);
			return;
		}
		if (configTransition.kind === "edit") {
			setCommandLine(openCommandLine(configTransition.prompt));
			log(configTransition.notice.level, configTransition.notice.message);
			return;
		}
		if (configTransition.kind === "jump-shelf") {
			jumpToConfigManagedShelf(configTransition.transition);
			return;
		}
		if (configTransition.kind === "run-action") {
			void runAction(configTransition.action);
			return;
		}
		if (configTransition.kind === "notice") {
			log(configTransition.notice.level, configTransition.notice.message);
			return;
		}

		if (workspaceInputFamily === "timeline") {
			const decision = prepareTimelinePanelInput({
				input,
				events,
				filter: timelineFilter,
				query: timelineSearchQuery,
				presets: timelineSearchPresets,
				selectedIndex: selectedTimelineIndex,
				auditExportIndex,
				handoff: {
					baseDir: dirname(getConfigPath()),
					origin: createActiveFileOpenOrigin(configShelfLandingTarget),
				},
			});
			if (decision.kind === "filter") {
				setTimelineFilter(decision.filter);
				setSelectedTimelineIndex(decision.selectedIndex);
			} else if (decision.kind === "search") {
				setTimelineSearchQuery(decision.query);
				setSelectedTimelineIndex(decision.selectedIndex);
			} else if (decision.kind === "selection") {
				setSelectedTimelineIndex(decision.selectedIndex);
			} else if (decision.kind === "save-preset") {
				setTimelineSearchPresets(decision.presets);
			} else if (decision.kind === "command") {
				if (decision.command === "search") {
					setCommandLine(openCommandLine("timeline-search"));
				} else if (decision.command === "cleanup") {
					setCommandLine(openCommandLine("timeline-search-cleanup"));
				}
			} else if (decision.kind === "selected-command") {
				setSelectedTimelineIndex(decision.selectedIndex);
				if (decision.command === "copy") {
					openClipboardConfirmation(decision.preview);
					recordStatusActivityResult(
						createTimelineSelectedStatusActivityResult(
							"copy",
							decision.activity,
						),
					);
				} else {
					void exportSelectedTimelineInput(decision.exportInput);
				}
			} else if (decision.kind === "evidence") {
				const plan = decision.plan;
				setSelectedTimelineIndex(decision.selectedIndex);
				setSelectedAuditExportIndex(plan.selectedIndex);
				setSelectedStatusEvidenceKind(plan.kind);
				recordStatusActivityResult(
					createTimelineEvidenceTrailStatusActivityResult(plan),
				);
				const exportPlan = createTimelineEvidenceTrailAuditExportPlan(plan, {
					baseDir: dirname(getConfigPath()),
				});
				void exportTimelineEvidenceInput(exportPlan);
				setScreen("status");
			}
			if ("notice" in decision && decision.notice) {
				log(decision.notice.level, decision.notice.message);
			}
			if (decision.kind !== "no-op") {
				return;
			}
		}

		if (workspaceInputFamily === "logs") {
			const decision = prepareLogPanelInput({
				input,
				entries: osLogs?.entries ?? [],
				level: logLevelFilter,
				query: logSearchQuery,
				presets: logSearchPresets,
				profiles: logProfiles,
				follow: logFollowEnabled,
			});
			if (decision.kind === "level") {
				setLogLevelFilter(decision.level);
			} else if (decision.kind === "search") {
				setLogSearchQuery(decision.query);
			} else if (decision.kind === "save-preset") {
				setLogSearchPresets(decision.presets);
				void persistLogInput({ kind: "presets", presets: decision.presets });
			} else if (decision.kind === "save-profile") {
				setLogProfiles(decision.profiles);
				void persistLogInput({ kind: "profiles", profiles: decision.profiles });
			} else if (decision.kind === "profile") {
				setLogLevelFilter(decision.profile.level);
				setLogSearchQuery(decision.profile.query);
			} else if (decision.kind === "follow") {
				setLogFollowEnabled(decision.follow);
			} else if (decision.kind === "command") {
				if (decision.command === "search") {
					setCommandLine(openCommandLine("log-search"));
				} else if (decision.command === "cleanup") {
					setCommandLine(openCommandLine("logs-cleanup"));
				} else if (decision.command === "clear-follow") {
					setLogFollowRefreshCount(0);
					setLogFollowLastStatus("idle");
					setLogFollowHistory([]);
				} else if (decision.command === "refresh") {
					void refreshLogsInput();
				}
			}
			if ("notice" in decision && decision.notice) {
				log(decision.notice.level, decision.notice.message);
			}
			if (decision.kind !== "no-op") {
				return;
			}
		}

		const toolsCommand =
			workspaceInputFamily === "tools"
				? getToolsWorkspaceCommand(input, key)
				: undefined;
		const toolsTransition = prepareToolsWorkspaceInput({
			command: toolsCommand,
			input,
			key: { home: key.home, end: key.end },
			history: toolHistory,
			selectedHistoryIndex: selectedToolHistoryIndex,
			filter: toolHistoryFilter,
			filterPresets: toolHistoryFilterPresets,
			sort: toolHistorySort,
			group: toolHistoryGroup,
			detail: toolHistoryDetailView,
			customTargetPresets: customToolTargetPresets,
			targetPresets: toolTargetPresets,
			selectedTargetIndex: selectedToolTargetPresetIndex,
			targetPresetLimit: toolTargetPresetLimit,
			copySection: toolSectionClipboardSelection,
			copyRowIndex: toolSectionClipboardRowIndex,
			exportContext: {
				baseDir: dirname(getConfigPath()),
				generatedAt: new Date(),
				publication: {
					selectedIndex: 0,
					filter: toolExportFilter,
					query: toolExportQuery,
				},
			},
		});
		if (toolsTransition.kind === "handled") {
			for (const effect of toolsTransition.effects) {
				switch (effect.kind) {
					case "history-selection":
						setSelectedToolHistoryIndex(effect.selectedIndex);
						break;
					case "filter":
						setToolHistoryFilter(effect.filter);
						break;
					case "filter-presets":
						setToolHistoryFilterPresets(effect.presets);
						break;
					case "sort":
						setToolHistorySort(effect.sort);
						break;
					case "group":
						setToolHistoryGroup(effect.group);
						break;
					case "detail":
						setToolHistoryDetailView(effect.detail);
						break;
					case "target-selection":
						setSelectedToolTargetPresetIndex(effect.selectedIndex);
						break;
					case "target-presets":
						setCustomToolTargetPresets(effect.presets);
						break;
					case "copy-preview":
						setToolCopyPreview(effect.mode);
						break;
					case "copy-section":
						setToolSectionClipboardSelection(effect.section);
						break;
					case "copy-row":
						setToolSectionClipboardRowIndex(effect.rowIndex);
						break;
					case "prompt":
						setCommandLine(openCommandLine(effect.prompt));
						break;
					case "notice":
						log(effect.notice.level, effect.notice.message);
						break;
					case "clipboard":
						setToolCopyPreview(effect.mode);
						openClipboardConfirmation(effect.preview);
						break;
					case "persist-history-preferences":
					case "persist-target-presets":
					case "run":
					case "export":
						void applyToolsInputIoEffect(effect);
						break;
				}
			}
			return;
		}

		const remotesCommand =
			workspaceInputFamily === "remotes-focus"
				? getRemotesFocusCommand(input)
				: undefined;
		if (remotesCommand === "copy-history") {
			const transition = prepareRemoteHistoryClipboardInput({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				results: statusActivityResults,
			});
			if (transition.kind === "copy") {
				openClipboardConfirmation(transition.preview);
			} else {
				log(transition.notice.level, transition.notice.message);
			}
			return;
		}

		if (remotesCommand === "export-history") {
			const transition = prepareRemoteHistoryExportInput({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				results: statusActivityResults,
				baseDir: dirname(getConfigPath()),
			});
			if (transition.kind === "notice") {
				log(transition.notice.level, transition.notice.message);
				return;
			}
			void exportRemoteHistoryInput(transition.plan);
			return;
		}

		if (remotesCommand === "cancel") {
			cancelPendingRemoteConnect();
			return;
		}

		if (remotesCommand === "retry") {
			const transition = prepareRemoteRetry({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				diagnostic: remoteConnectionDiagnostic,
			});
			if (transition.kind === "prompt") {
				setSelectedRemoteIndex(transition.selectedIndex);
				setCommandLine({
					...openCommandLine(transition.prompt),
					value: transition.value,
				});
			}
			log(transition.notice.level, transition.notice.message);
			return;
		}

		if (remotesCommand === "connect") {
			const transition = prepareRemoteConnectPrompt({
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
				candidateSession: remoteKnownHostsCandidateSession,
				pasteReviewSession: remoteKnownHostsPasteReviewSession,
				diagnostic: remoteConnectionDiagnostic,
			});
			if (transition.kind === "prompt") {
				setSelectedRemoteIndex(transition.selectedIndex);
				setCommandLine({
					...openCommandLine(transition.prompt),
					value: transition.value,
				});
			}
			log(transition.notice.level, transition.notice.message);
			return;
		}

		if (
			remotesCommand === "host-key-evidence" ||
			remotesCommand === "known-hosts-candidate" ||
			remotesCommand === "known-hosts-paste" ||
			remotesCommand === "known-hosts-select" ||
			remotesCommand === "host-trust"
		) {
			const transition = prepareRemotePromptInput({
				command: remotesCommand,
				profiles: remoteProfiles,
				selectedIndex: selectedRemoteIndex,
			});
			if (transition.kind === "prompt") {
				setSelectedRemoteIndex(transition.selectedIndex);
				setCommandLine(openCommandLine(transition.prompt));
			}
			log(transition.notice.level, transition.notice.message);
			return;
		}

		if (remotesCommand === "paste-next") {
			moveRemoteKnownHostsPasteReviewSelectionCommand("next");
			return;
		}

		if (remotesCommand === "paste-previous") {
			moveRemoteKnownHostsPasteReviewSelectionCommand("previous");
			return;
		}

		if (remotesCommand === "paste-number") {
			const transition = prepareRemotePasteNumberInput(input);
			selectRemoteKnownHostsPasteReviewCandidateCommand(
				transition.candidateIndex,
			);
			return;
		}

		const navigation = prepareGlobalNavigationInput({
			input,
			key,
			screen,
			focusArea,
			actionsLength: actions.length,
			selectedActionIndex,
			remoteProfiles,
			selectedRemoteIndex,
			editorPreview,
			selectedEditorLineIndex,
			summary,
			selectedInterfaceIndex,
			toolHistory,
			selectedToolHistoryIndex,
			toolHistoryFilter,
			toolHistorySort,
		});
		if (navigation.kind === "focus") {
			setFocusArea(navigation.focusArea);
		} else if (navigation.kind === "screen") {
			setScreen(navigation.screen);
		} else if (navigation.kind === "workspace") {
			setFocusArea(navigation.focusArea);
			setScreen(navigation.screen);
		} else if (navigation.kind === "action-selection") {
			setSelectedActionIndex(navigation.selectedIndex);
		} else if (navigation.kind === "remote-selection") {
			setSelectedRemoteIndex(navigation.selectedIndex);
		} else if (navigation.kind === "editor-selection") {
			setSelectedEditorLineIndex(navigation.selectedIndex);
		} else if (navigation.kind === "interface-selection") {
			setSelectedInterfaceIndex(navigation.transition.selectedIndex);
			setInterfaceSourceCopyPreview(navigation.transition.copyPreview);
			setInterfaceStateProposal(navigation.transition.proposal);
			setInterfaceConfirmationResult(navigation.transition.confirmationResult);
		} else if (navigation.kind === "tool-selection") {
			setSelectedToolHistoryIndex(navigation.selectedIndex);
			setToolSectionClipboardRowIndex(navigation.clipboardRowIndex);
			setToolCopyPreview(navigation.copyPreview);
		}
	});

	const selectedAction = actions[selectedActionIndex];

	return (
		<Box flexDirection="column" width={layout.width} height={layout.height}>
			<TopBar
				width={layout.width}
				height={layout.topBarHeight}
				summary={summary}
				commandStatus={commandStatus}
				t={t}
			/>
			<Box height={layout.contentHeight}>
				<Sidebar
					width={layout.sidebarWidth}
					height={layout.contentHeight}
					screen={screen}
					t={t}
				/>
				<MainWorkspace
					width={layout.mainWidth}
					height={layout.contentHeight}
					screen={screen}
					summary={summary}
					inventory={inventory}
					systemMonitor={systemMonitor}
					osLogs={osLogs}
					error={error}
					actions={actions}
					selectedActionIndex={selectedActionIndex}
					actionPreviewPlan={actionPreviewPlan}
					actionSimulation={actionSimulation}
					actionExecutionPlan={actionExecutionPlan}
					controlExecutionPolicy={controlExecutionPolicy}
					updateCheckResult={updateCheckResult}
					githubReleaseCheckResult={githubReleaseCheckResult}
					palette={palette}
					focusArea={focusArea}
					doctorChecks={doctorChecks}
					fileRoot={fileRoot}
					fileEntries={fileEntries}
					fileHistoryCount={fileHistory.length}
					fileForwardHistoryCount={fileForwardHistory.length}
					fileLocations={fileLocations}
					selectedFileIndex={selectedFileIndex}
					selectedLocationIndex={selectedLocationIndex}
					commandLine={commandLine}
					dnsServerProposal={dnsServerProposal}
					selectedDnsTargetIndex={selectedDnsTargetIndex}
					fileFilter={fileFilter}
					fileOperationDialog={fileOperationDialog}
					editorPreview={editorPreview}
					editorSaveResult={editorSaveResult}
					fileProviderKind={fileProvider.kind}
					selectedEditorLineIndex={selectedEditorLineIndex}
					remoteProfiles={remoteProfiles}
					selectedRemoteIndex={selectedRemoteIndex}
					remoteHostKeyEvidenceSession={remoteHostKeyEvidenceSession}
					remoteKnownHostsCandidateSession={remoteKnownHostsCandidateSession}
					remoteKnownHostsPasteReviewSession={
						remoteKnownHostsPasteReviewSession
					}
					remoteFileContext={remoteFileContext}
					remoteConnectionDiagnostic={remoteConnectionDiagnostic}
					operationPresets={operationPresets}
					selectedOperationPresetIndex={selectedOperationPresetIndex}
					operationRun={operationRun}
					connections={connections}
					ports={ports}
					connectionsResult={connectionsResult}
					portsResult={portsResult}
					connectionSort={connectionSort}
					portSort={portSort}
					connectionFilter={connectionFilter}
					portFilter={portFilter}
					connectionFilterPresets={connectionFilterPresets}
					portFilterPresets={portFilterPresets}
					selectedInterfaceIndex={selectedInterfaceIndex}
					interfaceDetailView={interfaceDetailView}
					interfaceSourceCopyPreview={interfaceSourceCopyPreview}
					interfaceStateProposal={interfaceStateProposal}
					interfaceConfirmationResult={interfaceConfirmationResult}
					selectedConnectionIndex={selectedConnectionIndex}
					selectedPortIndex={selectedPortIndex}
					connectionDetailView={connectionDetailView}
					portDetailView={portDetailView}
					connectionCopyPreview={connectionCopyPreview}
					portCopyPreview={portCopyPreview}
					portProcessControlPreview={portProcessControlPreview}
					selectedProcessDetail={selectedProcessDetail}
					selectedProcessFiles={selectedProcessFiles}
					selectedProcessFileEvidenceIssue={selectedProcessFileEvidenceIssue}
					selectedProcessFileIndex={selectedProcessFileIndex}
					processClipboardPreview={processClipboardPreview}
					routeTable={routeTable}
					routePath={routePath}
					routeSort={routeSort}
					routeFilter={routeFilter}
					routeFilterPresets={routeFilterPresets}
					routeDetailView={routeDetailView}
					routeCopyPreview={routeCopyPreview}
					timelineFilter={timelineFilter}
					timelineSearchQuery={timelineSearchQuery}
					selectedTimelineIndex={selectedTimelineIndex}
					timelineSearchPresets={timelineSearchPresets}
					logSearchQuery={logSearchQuery}
					logSearchPresets={logSearchPresets}
					logLevelFilter={logLevelFilter}
					logProfiles={logProfiles}
					logFollowEnabled={logFollowEnabled}
					logFollowRefreshCount={logFollowRefreshCount}
					logFollowLastStatus={logFollowLastStatus}
					logFollowHistory={logFollowHistory}
					defaultPingHost={defaultPingHost}
					toolHistory={toolHistory}
					selectedToolHistoryIndex={selectedToolHistoryIndex}
					toolTargetPresets={toolTargetPresets}
					customToolTargetPresets={customToolTargetPresets}
					selectedToolTargetPresetIndex={selectedToolTargetPresetIndex}
					toolHistoryFilter={toolHistoryFilter}
					toolHistoryFilterPresets={toolHistoryFilterPresets}
					toolHistorySort={toolHistorySort}
					toolHistoryGroup={toolHistoryGroup}
					toolHistoryDetailView={toolHistoryDetailView}
					toolCopyPreview={toolCopyPreview}
					toolSectionClipboardSelection={toolSectionClipboardSelection}
					toolSectionClipboardRowIndex={toolSectionClipboardRowIndex}
					configWorkspaceItems={configWorkspaceItems}
					selectedConfigIndex={selectedConfigIndex}
					configResetPreview={configResetPreview}
					configManagedShelfRows={configManagedShelfRows}
					configManagedShelfHandoffRows={configManagedShelfHandoffRows}
					configShelfLandingTarget={configShelfLandingTarget}
					cleanupShelfIndex={cleanupShelfIndex}
					selectedCleanupShelfIndex={selectedCleanupShelfIndex}
					cleanupJumpAudit={cleanupJumpAudit}
					cleanupHandoffHistory={cleanupHandoffHistory}
					selectedCleanupHandoffHistoryIndex={
						selectedCleanupHandoffHistoryIndex
					}
					cleanupExportIndex={cleanupExportIndex}
					selectedCleanupExportIndex={selectedCleanupExportIndex}
					cleanupExportArchiveIndex={cleanupExportArchiveIndex}
					selectedCleanupExportArchiveIndex={selectedCleanupExportArchiveIndex}
					toolExportIndex={toolExportIndex}
					selectedToolExportIndex={selectedToolExportIndex}
					toolExportFilter={toolExportFilter}
					toolExportQuery={toolExportQuery}
					toolExportArchiveIndex={toolExportArchiveIndex}
					selectedToolExportArchiveIndex={selectedToolExportArchiveIndex}
					toolExportArchiveFilter={toolExportArchiveFilter}
					toolExportArchiveQuery={toolExportArchiveQuery}
					selectedStatusActivitySource={selectedStatusActivitySource}
					statusActivityResults={statusActivityResults}
					selectedStatusActivityResultIndex={selectedStatusActivityResultIndex}
					statusActivityResultHistoryFilter={statusActivityResultHistoryFilter}
					statusActivityResultTimelineJumpFilter={
						statusActivityResultTimelineJumpFilter
					}
					selectedStatusActivityCopyPreviewRowIndex={
						selectedStatusActivityCopyPreviewRowIndex
					}
					statusActivityCopyPreviewExpanded={statusActivityCopyPreviewExpanded}
					statusActivityCopyIntentHistory={statusActivityCopyIntentHistory}
					selectedStatusActivityCopyIntentIndex={
						selectedStatusActivityCopyIntentIndex
					}
					selectedStatusActivityResultAuditJumpIndex={
						selectedStatusActivityResultAuditJumpIndex
					}
					selectedStatusActivityToolsEvidenceSearchMatchIndex={
						selectedStatusActivityToolsEvidenceSearchMatchIndex
					}
					statusActivityToolsEvidenceSearchRecovery={
						statusActivityToolsEvidenceSearchRecovery
					}
					toolArchiveRetentionPreviewPlan={toolArchiveRetentionPreviewPlan}
					lastStatusActivityCopyIntentAuditExport={
						lastStatusActivityCopyIntentAuditExport
					}
					lastTimelineEvidenceTrailAuditExport={
						lastTimelineEvidenceTrailAuditExport
					}
					timelineEvidenceTrailAuditExports={timelineEvidenceTrailAuditExports}
					selectedTimelineEvidenceTrailAuditExportIndex={
						selectedTimelineEvidenceTrailAuditExportIndex
					}
					timelineEvidenceTrailSourceFilter={timelineEvidenceTrailSourceFilter}
					processControlAuditExports={processControlAuditExports}
					selectedProcessControlAuditExportIndex={
						selectedProcessControlAuditExportIndex
					}
					remoteKnownHostsSelectionAuditExports={
						remoteKnownHostsSelectionAuditExports
					}
					selectedRemoteKnownHostsSelectionAuditExportIndex={
						selectedRemoteKnownHostsSelectionAuditExportIndex
					}
					interfaceConfirmationAuditExports={interfaceConfirmationAuditExports}
					interfaceConfirmationAuditArchiveExports={
						interfaceConfirmationAuditArchiveExports
					}
					selectedInterfaceConfirmationAuditExportIndex={
						selectedInterfaceConfirmationAuditExportIndex
					}
					interfaceEvidenceStateFilter={interfaceEvidenceStateFilter}
					interfaceEvidenceQuery={interfaceEvidenceQuery}
					interfaceEvidenceSearchPresets={interfaceEvidenceSearchPresets}
					selectedStatusEvidenceKind={selectedStatusEvidenceKind}
					selectedUpdateHandoffIndex={selectedUpdateHandoffIndex}
					handoffIndex={handoffIndex}
					selectedHandoffIndex={selectedHandoffIndex}
					auditExportIndex={auditExportIndex}
					selectedAuditExportIndex={selectedAuditExportIndex}
					auditExportArchiveIndex={auditExportArchiveIndex}
					selectedAuditExportArchiveIndex={selectedAuditExportArchiveIndex}
					externalOpenPlan={externalOpenPlan}
					fileOpenPlan={fileOpenPlan}
					auditExportArchivePlan={auditExportArchivePlan}
					auditArchiveRetentionPlan={auditArchiveRetentionPlan}
					cleanupExportArchivePlan={cleanupExportArchivePlan}
					toolExportArchivePlan={toolExportArchivePlan}
					toolArchiveRetentionPlan={toolArchiveRetentionPlan}
					events={events}
					t={t}
				/>
				{layout.inspectorWidth > 0 ? (
					<Inspector
						width={layout.inspectorWidth}
						screen={screen}
						summary={summary}
						selectedAction={selectedAction}
						actionPreviewPlan={actionPreviewPlan}
						actionSimulation={actionSimulation}
						actionExecutionPlan={actionExecutionPlan}
						controlExecutionPolicy={controlExecutionPolicy}
						portProcessControlRows={portProcessControlInspectorRows}
						events={events}
						t={t}
					/>
				) : null}
			</Box>
			<EventDock height={layout.logHeight} events={events} t={t} />
		</Box>
	);
}

function TopBar({
	width,
	height,
	summary,
	commandStatus,
	t,
}: {
	width: number;
	height: number;
	summary?: NetworkSummary;
	commandStatus: CommandStatus;
	t: (key: string) => string;
}): React.ReactElement {
	const innerWidth = Math.max(1, width - 4);
	const status = `${summary?.status ?? "loading"} · ${summary?.host ?? "local"} · ${commandStatus}`;

	return (
		<Box
			height={height}
			borderStyle="double"
			borderColor="cyan"
			paddingX={1}
			flexDirection="column"
		>
			<Text color={summary?.status === "online" ? "green" : "yellow"}>
				{formatTopBarLine(innerWidth, t("app.subtitle"), status)}
			</Text>
		</Box>
	);
}

function Sidebar({
	width,
	height,
	screen,
	t,
}: {
	width: number;
	height: number;
	screen: Screen;
	t: (key: string) => string;
}): React.ReactElement {
	const innerWidth = Math.max(8, width - 2);
	const visibleRows = Math.max(1, height - 3);
	const activeIndex = getScreenIndex(screen);
	const window = getVisibleWindow(screenOrder.length, activeIndex, visibleRows);
	const visibleScreens = screenOrder.slice(window.start, window.end);
	return (
		<Box
			width={width}
			height={height}
			borderStyle="single"
			borderColor="gray"
			flexDirection="column"
		>
			<Text bold color="cyan">
				{t("app.workspaces").padEnd(innerWidth)}
			</Text>
			<Box flexDirection="column">
				{visibleScreens.map((item, visibleIndex) => {
					const index = window.start + visibleIndex;
					return (
						<Text key={item} color={item === screen ? "cyan" : "white"}>
							{formatSidebarLine(
								item === screen,
								index + 1,
								translateScreenLabel(item, t),
								innerWidth,
							)}
						</Text>
					);
				})}
			</Box>
		</Box>
	);
}

function MainWorkspace({
	width: workspaceWidth,
	height,
	screen,
	summary,
	inventory,
	systemMonitor,
	osLogs,
	error,
	actions,
	selectedActionIndex,
	actionPreviewPlan,
	actionSimulation,
	actionExecutionPlan,
	controlExecutionPolicy,
	updateCheckResult,
	githubReleaseCheckResult,
	palette,
	focusArea,
	doctorChecks,
	fileRoot,
	fileEntries,
	fileHistoryCount,
	fileForwardHistoryCount,
	fileLocations,
	selectedFileIndex,
	selectedLocationIndex,
	commandLine,
	dnsServerProposal,
	selectedDnsTargetIndex,
	fileFilter,
	fileOperationDialog,
	editorPreview,
	editorSaveResult,
	fileProviderKind,
	selectedEditorLineIndex,
	remoteProfiles,
	selectedRemoteIndex,
	remoteHostKeyEvidenceSession,
	remoteKnownHostsCandidateSession,
	remoteKnownHostsPasteReviewSession,
	remoteFileContext,
	remoteConnectionDiagnostic,
	operationPresets,
	selectedOperationPresetIndex,
	operationRun,
	connections,
	ports,
	connectionsResult,
	portsResult,
	connectionSort,
	portSort,
	connectionFilter,
	portFilter,
	connectionFilterPresets,
	portFilterPresets,
	selectedInterfaceIndex,
	interfaceDetailView,
	interfaceSourceCopyPreview,
	interfaceStateProposal,
	interfaceConfirmationResult,
	selectedConnectionIndex,
	selectedPortIndex,
	connectionDetailView,
	portDetailView,
	connectionCopyPreview,
	portCopyPreview,
	portProcessControlPreview,
	selectedProcessDetail,
	selectedProcessFiles,
	selectedProcessFileEvidenceIssue,
	selectedProcessFileIndex,
	processClipboardPreview,
	routeTable,
	routePath,
	routeSort,
	routeFilter,
	routeFilterPresets,
	routeDetailView,
	routeCopyPreview,
	timelineFilter,
	timelineSearchQuery,
	selectedTimelineIndex,
	timelineSearchPresets,
	logSearchQuery,
	logSearchPresets,
	logLevelFilter,
	logProfiles,
	logFollowEnabled,
	logFollowRefreshCount,
	logFollowLastStatus,
	logFollowHistory,
	defaultPingHost,
	toolHistory,
	selectedToolHistoryIndex,
	toolTargetPresets,
	customToolTargetPresets,
	selectedToolTargetPresetIndex,
	toolHistoryFilter,
	toolHistoryFilterPresets,
	toolHistorySort,
	toolHistoryGroup,
	toolHistoryDetailView,
	toolCopyPreview,
	toolSectionClipboardSelection,
	toolSectionClipboardRowIndex,
	configWorkspaceItems,
	selectedConfigIndex,
	configResetPreview,
	configManagedShelfRows,
	configManagedShelfHandoffRows,
	configShelfLandingTarget,
	cleanupShelfIndex,
	selectedCleanupShelfIndex,
	cleanupJumpAudit,
	cleanupHandoffHistory,
	selectedCleanupHandoffHistoryIndex,
	cleanupExportIndex: _cleanupExportIndex,
	selectedCleanupExportIndex: _selectedCleanupExportIndex,
	cleanupExportArchiveIndex: _cleanupExportArchiveIndex,
	selectedCleanupExportArchiveIndex: _selectedCleanupExportArchiveIndex,
	toolExportIndex,
	selectedToolExportIndex,
	toolExportFilter,
	toolExportQuery,
	toolExportArchiveIndex,
	selectedToolExportArchiveIndex,
	toolExportArchiveFilter,
	toolExportArchiveQuery,
	selectedStatusActivitySource,
	statusActivityResults,
	selectedStatusActivityResultIndex,
	statusActivityResultHistoryFilter,
	statusActivityResultTimelineJumpFilter,
	selectedStatusActivityCopyPreviewRowIndex,
	statusActivityCopyPreviewExpanded,
	statusActivityCopyIntentHistory,
	selectedStatusActivityCopyIntentIndex,
	selectedStatusActivityResultAuditJumpIndex,
	selectedStatusActivityToolsEvidenceSearchMatchIndex,
	statusActivityToolsEvidenceSearchRecovery,
	toolArchiveRetentionPreviewPlan,
	lastStatusActivityCopyIntentAuditExport,
	lastTimelineEvidenceTrailAuditExport,
	timelineEvidenceTrailAuditExports,
	selectedTimelineEvidenceTrailAuditExportIndex,
	timelineEvidenceTrailSourceFilter,
	processControlAuditExports,
	selectedProcessControlAuditExportIndex,
	remoteKnownHostsSelectionAuditExports,
	selectedRemoteKnownHostsSelectionAuditExportIndex,
	interfaceConfirmationAuditExports,
	interfaceConfirmationAuditArchiveExports,
	selectedInterfaceConfirmationAuditExportIndex,
	interfaceEvidenceStateFilter,
	interfaceEvidenceQuery,
	interfaceEvidenceSearchPresets,
	selectedStatusEvidenceKind,
	selectedUpdateHandoffIndex,
	handoffIndex,
	selectedHandoffIndex,
	auditExportIndex,
	selectedAuditExportIndex,
	auditExportArchiveIndex,
	selectedAuditExportArchiveIndex,
	externalOpenPlan,
	fileOpenPlan,
	auditExportArchivePlan,
	auditArchiveRetentionPlan,
	cleanupExportArchivePlan,
	toolExportArchivePlan,
	toolArchiveRetentionPlan,
	events,
	t,
}: {
	width: number;
	height: number;
	screen: Screen;
	summary?: NetworkSummary;
	inventory?: SystemInventory;
	systemMonitor?: SystemMonitorSnapshot;
	osLogs?: OsLogSnapshot;
	error?: string;
	actions: PicosAction[];
	selectedActionIndex: number;
	actionPreviewPlan?: ActionPreviewPlan;
	actionSimulation?: ActionControlSimulation;
	actionExecutionPlan?: ControlExecutionPlan;
	controlExecutionPolicy: ControlExecutionPolicy;
	updateCheckResult?: PackageUpdateCheckResult;
	githubReleaseCheckResult?: GitHubReleaseCheckResult;
	palette: CommandPaletteState;
	focusArea: FocusArea;
	doctorChecks: DoctorCheck[];
	fileRoot: string;
	fileEntries: FileEntry[];
	fileHistoryCount: number;
	fileForwardHistoryCount: number;
	fileLocations: FileLocation[];
	selectedFileIndex: number;
	selectedLocationIndex: number;
	commandLine: CommandLineState;
	dnsServerProposal?: DnsServerProposal;
	selectedDnsTargetIndex: number;
	fileFilter: FileFilterState;
	fileOperationDialog: FileOperationDialogState;
	editorPreview?: EditorBuffer;
	editorSaveResult?: EditorSaveExecutionResult;
	fileProviderKind: FileProviderKind;
	selectedEditorLineIndex: number;
	remoteProfiles: SftpRemoteProfile[];
	selectedRemoteIndex: number;
	remoteHostKeyEvidenceSession: RemoteHostKeyEvidenceInputSession;
	remoteKnownHostsCandidateSession: RemoteKnownHostsCandidateSession;
	remoteKnownHostsPasteReviewSession: RemoteKnownHostsPasteReviewSession;
	remoteFileContext?: RemoteFileContext;
	remoteConnectionDiagnostic?: ReadOnlySftpConnectionDiagnostic;
	operationPresets: PicosConfig["operationPresets"];
	selectedOperationPresetIndex: number;
	operationRun?: OperationRunProgress;
	connections: ActiveConnection[];
	ports: ListeningPort[];
	connectionsResult?: ConnectionsResult;
	portsResult?: PortsResult;
	connectionSort: ConnectionSort;
	portSort: PortSort;
	connectionFilter: string;
	portFilter: string;
	connectionFilterPresets: string[];
	portFilterPresets: string[];
	selectedInterfaceIndex: number;
	interfaceDetailView: InterfaceDetailView;
	interfaceSourceCopyPreview: boolean;
	interfaceStateProposal?: InterfaceStateProposal;
	interfaceConfirmationResult?: InterfaceConfirmationResult;
	selectedConnectionIndex: number;
	selectedPortIndex: number;
	connectionDetailView: EndpointDetailView;
	portDetailView: EndpointDetailView;
	connectionCopyPreview: boolean;
	portCopyPreview: boolean;
	portProcessControlPreview: boolean;
	selectedProcessDetail?: ProcessDetail;
	selectedProcessFiles?: ProcessFileSnapshot;
	selectedProcessFileEvidenceIssue?: PortProcessControlFileEvidenceIssue;
	selectedProcessFileIndex: number;
	processClipboardPreview: boolean;
	routeTable?: RouteTableResult;
	routePath?: RoutePathResult;
	routeSort: RouteSort;
	routeFilter: string;
	routeFilterPresets: string[];
	routeDetailView: RouteDetailView;
	routeCopyPreview: boolean;
	timelineFilter: TimelineFilter;
	timelineSearchQuery: string;
	selectedTimelineIndex: number;
	timelineSearchPresets: string[];
	logSearchQuery: string;
	logSearchPresets: string[];
	logLevelFilter: OsLogLevelFilter;
	logProfiles: LogProfile[];
	logFollowEnabled: boolean;
	logFollowRefreshCount: number;
	logFollowLastStatus: "idle" | "ok" | "warn" | "fail";
	logFollowHistory: LogFollowHistoryItem[];
	defaultPingHost: string;
	toolHistory: ToolHistoryItem[];
	selectedToolHistoryIndex: number;
	toolTargetPresets: ToolTargetPreset[];
	customToolTargetPresets: ToolTargetPreset[];
	selectedToolTargetPresetIndex: number;
	toolHistoryFilter: string;
	toolHistoryFilterPresets: string[];
	toolHistorySort: ToolHistorySort;
	toolHistoryGroup: ToolHistoryGroup;
	toolHistoryDetailView: ToolHistoryDetailView;
	toolCopyPreview: ToolCopyPreviewMode;
	toolSectionClipboardSelection: ToolSectionClipboardSelection;
	toolSectionClipboardRowIndex: number;
	configWorkspaceItems: ConfigWorkspaceItem[];
	selectedConfigIndex: number;
	configResetPreview?: ConfigWorkspaceResetPreview;
	configManagedShelfRows: string[];
	configManagedShelfHandoffRows: string[];
	configShelfLandingTarget?: ConfigManagedShelfTarget;
	cleanupShelfIndex: CleanupShelfIndex;
	selectedCleanupShelfIndex: number;
	cleanupJumpAudit?: CleanupJumpAudit;
	cleanupHandoffHistory: CleanupHandoffHistory[];
	selectedCleanupHandoffHistoryIndex: number;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportIndex: number;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportArchiveIndex: number;
	toolExportIndex: ToolHistoryExportIndex;
	selectedToolExportIndex: number;
	toolExportFilter: ToolHistoryEvidenceFilter;
	toolExportQuery: string;
	toolExportArchiveIndex: ToolHistoryExportIndex;
	selectedToolExportArchiveIndex: number;
	toolExportArchiveFilter: ToolHistoryEvidenceFilter;
	toolExportArchiveQuery: string;
	selectedStatusActivitySource: StatusActivitySource;
	statusActivityResults: StatusActivityResult[];
	selectedStatusActivityResultIndex: number;
	statusActivityResultHistoryFilter: StatusActivityResultHistoryFilter;
	statusActivityResultTimelineJumpFilter: StatusActivityResultTimelineJumpFilter;
	selectedStatusActivityCopyPreviewRowIndex: number;
	statusActivityCopyPreviewExpanded: boolean;
	statusActivityCopyIntentHistory: StatusActivityCopyIntentRecord[];
	selectedStatusActivityCopyIntentIndex: number;
	selectedStatusActivityResultAuditJumpIndex: number;
	selectedStatusActivityToolsEvidenceSearchMatchIndex: number;
	statusActivityToolsEvidenceSearchRecovery?: StatusActivityToolsEvidenceSearchRecovery;
	toolArchiveRetentionPreviewPlan: ToolHistoryArchiveRetentionPlan;
	lastStatusActivityCopyIntentAuditExport?: ConsoleAuditExportPlan;
	lastTimelineEvidenceTrailAuditExport?: ConsoleAuditExportPlan;
	timelineEvidenceTrailAuditExports: ConsoleAuditExportPlan[];
	selectedTimelineEvidenceTrailAuditExportIndex: number;
	timelineEvidenceTrailSourceFilter: TimelineEvidenceTrailSourceFilter;
	processControlAuditExports: ConsoleAuditExportPlan[];
	selectedProcessControlAuditExportIndex: number;
	remoteKnownHostsSelectionAuditExports: ConsoleAuditExportPlan[];
	selectedRemoteKnownHostsSelectionAuditExportIndex: number;
	interfaceConfirmationAuditExports: ConsoleAuditExportPlan[];
	interfaceConfirmationAuditArchiveExports: ConsoleAuditExportPlan[];
	selectedInterfaceConfirmationAuditExportIndex: number;
	interfaceEvidenceStateFilter: InterfaceEvidenceStateFilter;
	interfaceEvidenceQuery: string;
	interfaceEvidenceSearchPresets: string[];
	selectedStatusEvidenceKind: StatusEvidenceKind;
	selectedUpdateHandoffIndex: number;
	handoffIndex: HandoffIndex;
	selectedHandoffIndex: number;
	auditExportIndex: ConsoleAuditExportIndex;
	selectedAuditExportIndex: number;
	auditExportArchiveIndex: ConsoleAuditExportIndex;
	selectedAuditExportArchiveIndex: number;
	externalOpenPlan?: ExternalOpenPlan;
	fileOpenPlan?: FileOpenPlan;
	auditExportArchivePlan?: ConsoleAuditExportArchivePlan;
	auditArchiveRetentionPlan?: ConsoleAuditArchiveRetentionPlan;
	cleanupExportArchivePlan?: CleanupHandoffHistoryExportArchivePlan;
	toolExportArchivePlan?: ToolHistoryExportArchivePlan;
	toolArchiveRetentionPlan?: ToolHistoryArchiveRetentionPlan;
	events: ConsoleEvent[];
	t: (key: string) => string;
}): React.ReactElement {
	const cleanupHandoffActionPlan = createCleanupHandoffActionPlan(
		cleanupJumpAudit,
		screen,
	);
	const cleanupHandoffDismissPlan = createCleanupHandoffDismissPlan(
		cleanupJumpAudit,
		screen,
	);
	const cleanupJumpAuditRows = cleanupHandoffActionPlan
		? [
				...formatCleanupJumpAuditRows(cleanupJumpAudit),
				...formatCleanupHandoffActionRows(cleanupHandoffActionPlan),
				...formatCleanupHandoffDismissRows(cleanupHandoffDismissPlan),
			]
		: [];
	const configShelfLandingRows =
		configShelfLandingTarget &&
		getConfigManagedShelfHandoff(configShelfLandingTarget).workspace === screen
			? formatConfigManagedShelfLandingRows(configShelfLandingTarget)
			: [];
	const workspaceHeight =
		cleanupJumpAuditRows.length > 0 || configShelfLandingRows.length > 0
			? Math.max(
					1,
					height - cleanupJumpAuditRows.length - configShelfLandingRows.length,
				)
			: height;

	return (
		<Box
			width={workspaceWidth}
			height={height}
			borderStyle="single"
			borderColor="cyan"
			flexDirection="column"
			paddingX={1}
		>
			{error ? (
				<Text color="red">{error}</Text>
			) : (
				<>
					{cleanupJumpAuditRows.length > 0 ? (
						<Box flexDirection="column">
							{cleanupJumpAuditRows.map((row) => (
								<Text
									key={row}
									color={
										row.startsWith("CLEANUP HANDOFF")
											? "cyan"
											: row.startsWith("CLEANUP ACTION")
												? "cyan"
												: row.startsWith("CLEANUP DISMISS")
													? "gray"
													: row.startsWith("confirm=")
														? "yellow"
														: "white"
									}
								>
									{row}
								</Text>
							))}
						</Box>
					) : null}
					{configShelfLandingRows.length > 0 ? (
						<Box flexDirection="column">
							{configShelfLandingRows.map((row) => (
								<Text
									key={row}
									color={
										row.startsWith("CONFIG SHELF")
											? "cyan"
											: row.startsWith("next=")
												? "gray"
												: "yellow"
									}
								>
									{row}
								</Text>
							))}
						</Box>
					) : null}
					{renderWorkspace(
						screen,
						summary,
						inventory,
						systemMonitor,
						osLogs,
						actions,
						selectedActionIndex,
						actionPreviewPlan,
						actionSimulation,
						actionExecutionPlan,
						controlExecutionPolicy,
						updateCheckResult,
						githubReleaseCheckResult,
						palette,
						focusArea,
						doctorChecks,
						fileRoot,
						fileEntries,
						fileHistoryCount,
						fileForwardHistoryCount,
						fileLocations,
						selectedFileIndex,
						selectedLocationIndex,
						commandLine,
						dnsServerProposal,
						selectedDnsTargetIndex,
						fileFilter,
						fileOperationDialog,
						editorPreview,
						editorSaveResult,
						fileProviderKind,
						selectedEditorLineIndex,
						remoteProfiles,
						selectedRemoteIndex,
						remoteHostKeyEvidenceSession,
						remoteKnownHostsCandidateSession,
						remoteKnownHostsPasteReviewSession,
						remoteFileContext,
						remoteConnectionDiagnostic,
						operationPresets,
						selectedOperationPresetIndex,
						operationRun,
						connections,
						ports,
						connectionsResult,
						portsResult,
						connectionSort,
						portSort,
						connectionFilter,
						portFilter,
						connectionFilterPresets,
						portFilterPresets,
						selectedInterfaceIndex,
						interfaceDetailView,
						interfaceSourceCopyPreview,
						interfaceStateProposal,
						interfaceConfirmationResult,
						selectedConnectionIndex,
						selectedPortIndex,
						connectionDetailView,
						portDetailView,
						connectionCopyPreview,
						portCopyPreview,
						portProcessControlPreview,
						selectedProcessDetail,
						selectedProcessFiles,
						selectedProcessFileEvidenceIssue,
						selectedProcessFileIndex,
						processClipboardPreview,
						routeTable,
						routePath,
						routeSort,
						routeFilter,
						routeFilterPresets,
						routeDetailView,
						routeCopyPreview,
						timelineFilter,
						timelineSearchQuery,
						selectedTimelineIndex,
						timelineSearchPresets,
						logSearchQuery,
						logSearchPresets,
						logLevelFilter,
						logProfiles,
						logFollowEnabled,
						logFollowRefreshCount,
						logFollowLastStatus,
						logFollowHistory,
						defaultPingHost,
						toolHistory,
						selectedToolHistoryIndex,
						toolTargetPresets,
						customToolTargetPresets,
						selectedToolTargetPresetIndex,
						toolHistoryFilter,
						toolHistoryFilterPresets,
						toolHistorySort,
						toolHistoryGroup,
						toolHistoryDetailView,
						toolCopyPreview,
						toolSectionClipboardSelection,
						toolSectionClipboardRowIndex,
						configWorkspaceItems,
						selectedConfigIndex,
						configResetPreview,
						configManagedShelfRows,
						configManagedShelfHandoffRows,
						configShelfLandingTarget,
						cleanupShelfIndex,
						selectedCleanupShelfIndex,
						cleanupHandoffHistory,
						selectedCleanupHandoffHistoryIndex,
						_cleanupExportIndex,
						_selectedCleanupExportIndex,
						_cleanupExportArchiveIndex,
						_selectedCleanupExportArchiveIndex,
						toolExportIndex,
						selectedToolExportIndex,
						toolExportFilter,
						toolExportQuery,
						toolExportArchiveIndex,
						selectedToolExportArchiveIndex,
						toolExportArchiveFilter,
						toolExportArchiveQuery,
						selectedStatusActivitySource,
						statusActivityResults,
						selectedStatusActivityResultIndex,
						statusActivityResultHistoryFilter,
						statusActivityResultTimelineJumpFilter,
						selectedStatusActivityCopyPreviewRowIndex,
						statusActivityCopyPreviewExpanded,
						statusActivityCopyIntentHistory,
						selectedStatusActivityCopyIntentIndex,
						selectedStatusActivityResultAuditJumpIndex,
						selectedStatusActivityToolsEvidenceSearchMatchIndex,
						statusActivityToolsEvidenceSearchRecovery,
						toolArchiveRetentionPreviewPlan,
						lastStatusActivityCopyIntentAuditExport,
						lastTimelineEvidenceTrailAuditExport,
						timelineEvidenceTrailAuditExports,
						selectedTimelineEvidenceTrailAuditExportIndex,
						timelineEvidenceTrailSourceFilter,
						processControlAuditExports,
						selectedProcessControlAuditExportIndex,
						remoteKnownHostsSelectionAuditExports,
						selectedRemoteKnownHostsSelectionAuditExportIndex,
						interfaceConfirmationAuditExports,
						interfaceConfirmationAuditArchiveExports,
						selectedInterfaceConfirmationAuditExportIndex,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
						interfaceEvidenceSearchPresets,
						selectedStatusEvidenceKind,
						selectedUpdateHandoffIndex,
						handoffIndex,
						selectedHandoffIndex,
						auditExportIndex,
						selectedAuditExportIndex,
						auditExportArchiveIndex,
						selectedAuditExportArchiveIndex,
						externalOpenPlan,
						fileOpenPlan,
						auditExportArchivePlan,
						auditArchiveRetentionPlan,
						cleanupExportArchivePlan,
						toolExportArchivePlan,
						toolArchiveRetentionPlan,
						events,
						workspaceWidth,
						workspaceHeight,
						t,
					)}
				</>
			)}
		</Box>
	);
}

function renderWorkspace(
	screen: Screen,
	summary: NetworkSummary | undefined,
	inventory: SystemInventory | undefined,
	systemMonitor: SystemMonitorSnapshot | undefined,
	osLogs: OsLogSnapshot | undefined,
	actions: PicosAction[],
	selectedActionIndex: number,
	actionPreviewPlan: ActionPreviewPlan | undefined,
	actionSimulation: ActionControlSimulation | undefined,
	actionExecutionPlan: ControlExecutionPlan | undefined,
	controlExecutionPolicy: ControlExecutionPolicy,
	updateCheckResult: PackageUpdateCheckResult | undefined,
	githubReleaseCheckResult: GitHubReleaseCheckResult | undefined,
	palette: CommandPaletteState,
	focusArea: FocusArea,
	doctorChecks: DoctorCheck[],
	fileRoot: string,
	fileEntries: FileEntry[],
	fileHistoryCount: number,
	fileForwardHistoryCount: number,
	fileLocations: FileLocation[],
	selectedFileIndex: number,
	selectedLocationIndex: number,
	commandLine: CommandLineState,
	dnsServerProposal: DnsServerProposal | undefined,
	selectedDnsTargetIndex: number,
	fileFilter: FileFilterState,
	fileOperationDialog: FileOperationDialogState,
	editorPreview: EditorBuffer | undefined,
	editorSaveResult: EditorSaveExecutionResult | undefined,
	fileProviderKind: FileProviderKind,
	selectedEditorLineIndex: number,
	remoteProfiles: SftpRemoteProfile[],
	selectedRemoteIndex: number,
	remoteHostKeyEvidenceSession: RemoteHostKeyEvidenceInputSession,
	remoteKnownHostsCandidateSession: RemoteKnownHostsCandidateSession,
	remoteKnownHostsPasteReviewSession: RemoteKnownHostsPasteReviewSession,
	remoteFileContext: RemoteFileContext | undefined,
	remoteConnectionDiagnostic: ReadOnlySftpConnectionDiagnostic | undefined,
	operationPresets: PicosConfig["operationPresets"],
	selectedOperationPresetIndex: number,
	operationRun: OperationRunProgress | undefined,
	connections: ActiveConnection[],
	ports: ListeningPort[],
	connectionsResult: ConnectionsResult | undefined,
	portsResult: PortsResult | undefined,
	connectionSort: ConnectionSort,
	portSort: PortSort,
	connectionFilter: string,
	portFilter: string,
	connectionFilterPresets: string[],
	portFilterPresets: string[],
	selectedInterfaceIndex: number,
	interfaceDetailView: InterfaceDetailView,
	interfaceSourceCopyPreview: boolean,
	interfaceStateProposal: InterfaceStateProposal | undefined,
	interfaceConfirmationResult: InterfaceConfirmationResult | undefined,
	selectedConnectionIndex: number,
	selectedPortIndex: number,
	connectionDetailView: EndpointDetailView,
	portDetailView: EndpointDetailView,
	connectionCopyPreview: boolean,
	portCopyPreview: boolean,
	portProcessControlPreview: boolean,
	selectedProcessDetail: ProcessDetail | undefined,
	selectedProcessFiles: ProcessFileSnapshot | undefined,
	selectedProcessFileEvidenceIssue:
		| PortProcessControlFileEvidenceIssue
		| undefined,
	selectedProcessFileIndex: number,
	processClipboardPreview: boolean,
	routeTable: RouteTableResult | undefined,
	routePath: RoutePathResult | undefined,
	routeSort: RouteSort,
	routeFilter: string,
	routeFilterPresets: string[],
	routeDetailView: RouteDetailView,
	routeCopyPreview: boolean,
	timelineFilter: TimelineFilter,
	timelineSearchQuery: string,
	selectedTimelineIndex: number,
	timelineSearchPresets: string[],
	logSearchQuery: string,
	logSearchPresets: string[],
	logLevelFilter: OsLogLevelFilter,
	logProfiles: LogProfile[],
	logFollowEnabled: boolean,
	logFollowRefreshCount: number,
	logFollowLastStatus: "idle" | "ok" | "warn" | "fail",
	logFollowHistory: LogFollowHistoryItem[],
	defaultPingHost: string,
	toolHistory: ToolHistoryItem[],
	selectedToolHistoryIndex: number,
	toolTargetPresets: ToolTargetPreset[],
	customToolTargetPresets: ToolTargetPreset[],
	selectedToolTargetPresetIndex: number,
	toolHistoryFilter: string,
	toolHistoryFilterPresets: string[],
	toolHistorySort: ToolHistorySort,
	toolHistoryGroup: ToolHistoryGroup,
	toolHistoryDetailView: ToolHistoryDetailView,
	toolCopyPreview: ToolCopyPreviewMode,
	toolSectionClipboardSelection: ToolSectionClipboardSelection,
	toolSectionClipboardRowIndex: number,
	configWorkspaceItems: ConfigWorkspaceItem[],
	selectedConfigIndex: number,
	configResetPreview: ConfigWorkspaceResetPreview | undefined,
	configManagedShelfRows: string[],
	configManagedShelfHandoffRows: string[],
	configShelfLandingTarget: ConfigManagedShelfTarget | undefined,
	cleanupShelfIndex: CleanupShelfIndex,
	selectedCleanupShelfIndex: number,
	cleanupHandoffHistory: CleanupHandoffHistory[],
	selectedCleanupHandoffHistoryIndex: number,
	cleanupExportIndex: CleanupHandoffHistoryExportIndex,
	selectedCleanupExportIndex: number,
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex,
	selectedCleanupExportArchiveIndex: number,
	toolExportIndex: ToolHistoryExportIndex,
	selectedToolExportIndex: number,
	toolExportFilter: ToolHistoryEvidenceFilter,
	toolExportQuery: string,
	toolExportArchiveIndex: ToolHistoryExportIndex,
	selectedToolExportArchiveIndex: number,
	toolExportArchiveFilter: ToolHistoryEvidenceFilter,
	toolExportArchiveQuery: string,
	selectedStatusActivitySource: StatusActivitySource,
	statusActivityResults: StatusActivityResult[],
	selectedStatusActivityResultIndex: number,
	statusActivityResultHistoryFilter: StatusActivityResultHistoryFilter,
	statusActivityResultTimelineJumpFilter: StatusActivityResultTimelineJumpFilter,
	selectedStatusActivityCopyPreviewRowIndex: number,
	statusActivityCopyPreviewExpanded: boolean,
	statusActivityCopyIntentHistory: StatusActivityCopyIntentRecord[],
	selectedStatusActivityCopyIntentIndex: number,
	selectedStatusActivityResultAuditJumpIndex: number,
	selectedStatusActivityToolsEvidenceSearchMatchIndex: number,
	statusActivityToolsEvidenceSearchRecovery:
		| StatusActivityToolsEvidenceSearchRecovery
		| undefined,
	toolArchiveRetentionPreviewPlan: ToolHistoryArchiveRetentionPlan,
	lastStatusActivityCopyIntentAuditExport: ConsoleAuditExportPlan | undefined,
	lastTimelineEvidenceTrailAuditExport: ConsoleAuditExportPlan | undefined,
	timelineEvidenceTrailAuditExports: ConsoleAuditExportPlan[],
	selectedTimelineEvidenceTrailAuditExportIndex: number,
	timelineEvidenceTrailSourceFilter: TimelineEvidenceTrailSourceFilter,
	processControlAuditExports: ConsoleAuditExportPlan[],
	selectedProcessControlAuditExportIndex: number,
	remoteKnownHostsSelectionAuditExports: ConsoleAuditExportPlan[],
	selectedRemoteKnownHostsSelectionAuditExportIndex: number,
	interfaceConfirmationAuditExports: ConsoleAuditExportPlan[],
	interfaceConfirmationAuditArchiveExports: ConsoleAuditExportPlan[],
	selectedInterfaceConfirmationAuditExportIndex: number,
	interfaceEvidenceStateFilter: InterfaceEvidenceStateFilter,
	interfaceEvidenceQuery: string,
	interfaceEvidenceSearchPresets: string[],
	selectedStatusEvidenceKind: StatusEvidenceKind,
	selectedUpdateHandoffIndex: number,
	handoffIndex: HandoffIndex,
	selectedHandoffIndex: number,
	auditExportIndex: ConsoleAuditExportIndex,
	selectedAuditExportIndex: number,
	auditExportArchiveIndex: ConsoleAuditExportIndex,
	selectedAuditExportArchiveIndex: number,
	externalOpenPlan: ExternalOpenPlan | undefined,
	fileOpenPlan: FileOpenPlan | undefined,
	auditExportArchivePlan: ConsoleAuditExportArchivePlan | undefined,
	auditArchiveRetentionPlan: ConsoleAuditArchiveRetentionPlan | undefined,
	cleanupExportArchivePlan: CleanupHandoffHistoryExportArchivePlan | undefined,
	toolExportArchivePlan: ToolHistoryExportArchivePlan | undefined,
	toolArchiveRetentionPlan: ToolHistoryArchiveRetentionPlan | undefined,
	events: ConsoleEvent[],
	workspaceWidth: number,
	height: number,
	t: (key: string) => string,
): React.ReactElement {
	const configShelfFocusTarget =
		configShelfLandingTarget &&
		getConfigManagedShelfHandoff(configShelfLandingTarget).workspace === screen
			? configShelfLandingTarget
			: undefined;

	if (palette.active) {
		const filteredActions = getFilteredPaletteActions(actions, palette);
		const selectedPaletteAction = filteredActions[palette.selectedIndex];
		const filteredToolExportIndex = filterToolHistoryExportIndex(
			toolExportIndex,
			toolExportFilter,
			toolExportQuery,
		);
		const filteredInterfaceEvidenceExports =
			filterInterfaceConfirmationEvidenceExports(
				interfaceConfirmationAuditExports,
				interfaceConfirmationAuditArchiveExports,
				interfaceEvidenceStateFilter,
				interfaceEvidenceQuery,
			);
		const selectedProcessControlAuditExport =
			getSelectedProcessControlAuditExport(
				processControlAuditExports,
				selectedProcessControlAuditExportIndex,
			);
		const selectedRemoteKnownHostsSelectionAuditExport =
			getSelectedRemoteKnownHostsSelectionHistoryAuditExport(
				remoteKnownHostsSelectionAuditExports,
				selectedRemoteKnownHostsSelectionAuditExportIndex,
			);
		const selectedInterfaceConfirmationEvidence =
			filteredInterfaceEvidenceExports[
				clampIndex(
					selectedInterfaceConfirmationAuditExportIndex,
					filteredInterfaceEvidenceExports.length,
				)
			];
		const selectedInterfaceConfirmationAuditExport =
			selectedInterfaceConfirmationEvidence?.plan;
		const selectedInterfaceConfirmationEvidenceArchived =
			selectedInterfaceConfirmationEvidence?.state === "archived";
		const interfaceAuditArchiveRetentionPreviewPlan =
			createConsoleAuditArchiveRetentionPlan(
				filterInterfaceConfirmationAuditExportIndex(auditExportArchiveIndex),
				{ maxItems: toolArchiveRetentionPreviewPlan.maxItems },
			);
		const selectedStatusActivityResultTimelineJump =
			createStatusActivityResultTimelineSearch(
				statusActivityResults,
				selectedStatusActivityResultIndex,
			);
		const selectedRemoteKnownHostsEvidenceHandoff =
			getSelectedStatusActivityRemoteKnownHostsEvidenceHandoff(
				statusActivityResults,
				selectedStatusActivityResultIndex,
			);
		const selectedStatusActivityResultTimelineJumpSelection =
			getStatusActivityResultTimelineJumpSelection(
				statusActivityResults,
				selectedStatusActivityResultIndex,
				statusActivityResultTimelineJumpFilter,
			);
		const visibleStatusActivityResultTimelineJumps =
			getStatusActivityResultTimelineJumpIndexes(
				statusActivityResults,
				statusActivityResultTimelineJumpFilter,
			).length;
		const totalStatusActivityResultTimelineJumps =
			getStatusActivityResultTimelineJumpIndexes(statusActivityResults).length;
		const filteredPorts = portsResult
			? sortListeningPorts(
					filterListeningPorts(portsResult.ports, portFilter),
					portSort,
				)
			: [];
		return (
			<CommandPaletteWorkspace
				actions={filteredActions}
				selectedIndex={palette.selectedIndex}
				query={palette.query}
				totalActions={actions.length}
				visibleRows={Math.max(3, height - 8)}
				previewRows={formatCommandPaletteActionPreviewRows(
					selectedPaletteAction,
					{
						controlPreview: createCommandPaletteControlPreview(
							selectedPaletteAction,
							updateCheckResult,
						),
						portProcessPreview:
							selectedPaletteAction?.id === "process.terminate"
								? createSelectedPortProcessControlPreview(
										filteredPorts,
										selectedPortIndex,
									)
								: undefined,
						toolsEvidenceSearchRecovery:
							statusActivityToolsEvidenceSearchRecovery,
						selectedToolsEvidenceSearchMatchIndex:
							selectedStatusActivityToolsEvidenceSearchMatchIndex,
						selectedToolExport: getSelectedToolHistoryExport(
							toolExportIndex,
							selectedToolExportIndex,
							toolExportFilter,
							toolExportQuery,
						),
						selectedToolExportIndex,
						totalToolExports: filteredToolExportIndex.items.length,
						toolExportFilter,
						toolExportQuery,
						toolArchiveRetentionPlan: toolArchiveRetentionPreviewPlan,
						selectedProcessEvidenceExport: selectedProcessControlAuditExport,
						selectedProcessEvidenceExportIndex:
							selectedProcessControlAuditExportIndex,
						totalProcessEvidenceExports: processControlAuditExports.length,
						selectedRemoteKnownHostsEvidenceExport:
							selectedRemoteKnownHostsSelectionAuditExport,
						selectedRemoteKnownHostsEvidenceExportIndex:
							selectedRemoteKnownHostsSelectionAuditExportIndex,
						totalRemoteKnownHostsEvidenceExports:
							remoteKnownHostsSelectionAuditExports.length,
						selectedRemoteKnownHostsEvidenceHandoff,
						selectedInterfaceEvidenceExport:
							selectedInterfaceConfirmationAuditExport,
						selectedInterfaceEvidenceExportIndex:
							selectedInterfaceConfirmationAuditExportIndex,
						totalInterfaceEvidenceExports:
							filteredInterfaceEvidenceExports.length,
						totalAvailableInterfaceEvidenceExports:
							interfaceConfirmationAuditExports.length +
							interfaceConfirmationAuditArchiveExports.length,
						selectedInterfaceEvidenceArchived:
							selectedInterfaceConfirmationEvidenceArchived,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
						interfaceEvidenceSearchPresets,
						nextInterfaceEvidenceSearchPreset:
							nextInterfaceEvidenceSearchPreset(
								interfaceEvidenceSearchPresets,
								interfaceEvidenceQuery,
							),
						visibleInterfaceEvidenceExports:
							filteredInterfaceEvidenceExports.length,
						nextInterfaceEvidenceStateFilter: nextInterfaceEvidenceStateFilter(
							interfaceEvidenceStateFilter,
						),
						interfaceAuditArchiveRetentionPlan:
							interfaceAuditArchiveRetentionPreviewPlan,
						selectedStatusActivityResultTimelineJump,
						selectedStatusActivityResultTimelineJumpIndex:
							selectedStatusActivityResultTimelineJumpSelection?.selectedIndex,
						totalStatusActivityResultTimelineJumps:
							selectedStatusActivityResultTimelineJumpSelection?.total,
						configWorkspaceItems,
						configManagedShelfCounts: {
							routes: routeFilterPresets.length,
							connections: connectionFilterPresets.length,
							ports: portFilterPresets.length,
							tools: customToolTargetPresets.length,
							logs: logProfiles.length,
							remotes: remoteProfiles.length,
						},
						statusActivityResultTimelineJumpFilter,
						statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter,
						nextStatusActivityResultTimelineJumpFilter:
							nextStatusActivityResultTimelineJumpFilter(
								statusActivityResultTimelineJumpFilter,
							),
						visibleStatusActivityResultTimelineJumps,
						allStatusActivityResultTimelineJumps:
							totalStatusActivityResultTimelineJumps,
						selectedInterface: resolveSelectedInterface(
							summary,
							selectedInterfaceIndex,
						).selected,
						selectedInterfacePlatform: summary?.platform,
						primaryInterfaceName: summary?.primaryInterface?.name,
						macosServiceNamesByDevice: summary?.macosServiceNamesByDevice,
						defaultToolTarget: defaultPingHost,
						publicIp: summary?.publicIp,
					},
				)}
			/>
		);
	}

	if (screen === "files") {
		const entriesWithParent = withParentDirectoryEntry(fileRoot, fileEntries);
		const filteredEntries = filterFileEntries(entriesWithParent, fileFilter);
		return (
			<FilesWorkspace
				root={fileRoot}
				entries={filteredEntries}
				backHistoryCount={fileHistoryCount}
				forwardHistoryCount={fileForwardHistoryCount}
				totalEntryCount={entriesWithParent.length}
				locations={fileLocations}
				selectedIndex={selectedFileIndex}
				selectedLocationIndex={selectedLocationIndex}
				commandLine={commandLine}
				fileFilter={fileFilter}
				fileOperationDialog={fileOperationDialog}
				remoteContext={remoteFileContext}
				focused={focusArea === "files"}
				visibleRows={Math.max(6, height - 9)}
				t={t}
			/>
		);
	}
	if (screen === "editor") {
		return (
			<EditorWorkspace
				preview={editorPreview}
				saveResult={editorSaveResult}
				entries={fileEntries}
				providerKind={fileProviderKind}
				commandLine={commandLine}
				selectedLineIndex={selectedEditorLineIndex}
				visibleRows={Math.max(5, height - 10)}
				t={t}
			/>
		);
	}
	if (screen === "remotes") {
		return (
			<RemotesWorkspace
				profiles={remoteProfiles}
				selectedIndex={selectedRemoteIndex}
				hostKeyEvidenceSession={remoteHostKeyEvidenceSession}
				knownHostsCandidateSession={remoteKnownHostsCandidateSession}
				knownHostsPasteReviewSession={remoteKnownHostsPasteReviewSession}
				selectedContext={remoteFileContext}
				connectionDiagnostic={remoteConnectionDiagnostic}
				activityResults={statusActivityResults}
				focused={focusArea === "remotes"}
				commandLine={commandLine}
				visibleRows={Math.max(5, height - 8)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "system") {
		return (
			<SystemWorkspace inventory={inventory} systemMonitor={systemMonitor} />
		);
	}
	if (screen === "hardware") {
		return <HardwareWorkspace inventory={inventory} />;
	}
	if (screen === "storage") {
		return <StorageWorkspace inventory={inventory} />;
	}
	if (screen === "processes") {
		return (
			<ProcessesWorkspace
				inventory={inventory}
				selectedProcess={selectedProcessDetail}
				selectedFiles={selectedProcessFiles}
				fileEvidenceIssue={selectedProcessFileEvidenceIssue}
				selectedFileIndex={selectedProcessFileIndex}
				copyPreview={processClipboardPreview}
				commandLine={commandLine}
				visibleRows={Math.max(6, height - 7)}
			/>
		);
	}
	if (screen === "network") {
		return (
			<NetworkWorkspace
				summary={summary}
				visibleRows={Math.max(6, height - 8)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "interfaces") {
		return (
			<InterfacesWorkspace
				summary={summary}
				selectedIndex={selectedInterfaceIndex}
				view={interfaceDetailView}
				copyPreview={interfaceSourceCopyPreview}
				stateProposal={interfaceStateProposal}
				confirmationResult={interfaceConfirmationResult}
				commandLine={commandLine}
				visibleRows={Math.max(6, height - 8)}
				t={t}
			/>
		);
	}
	if (screen === "routes") {
		return (
			<RoutesWorkspace
				routeTable={routeTable}
				routePath={routePath}
				routeSort={routeSort}
				routeFilter={routeFilter}
				routeFilterPresets={routeFilterPresets}
				routeDetailView={routeDetailView}
				copyPreview={routeCopyPreview}
				commandLine={commandLine}
				visibleRows={Math.max(7, height - 7)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "connections") {
		return (
			<ConnectionsWorkspace
				result={connectionsResult}
				sort={connectionSort}
				filter={connectionFilter}
				filterPresets={connectionFilterPresets}
				processes={inventory?.processes ?? []}
				selectedIndex={selectedConnectionIndex}
				view={connectionDetailView}
				copyPreview={connectionCopyPreview}
				commandLine={commandLine}
				visibleRows={Math.max(5, height - 7)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "ports") {
		return (
			<PortsWorkspace
				result={portsResult}
				sort={portSort}
				filter={portFilter}
				filterPresets={portFilterPresets}
				processes={inventory?.processes ?? []}
				selectedIndex={selectedPortIndex}
				view={portDetailView}
				copyPreview={portCopyPreview}
				processControlPreview={portProcessControlPreview}
				controlExecutionPolicy={controlExecutionPolicy}
				commandLine={commandLine}
				visibleRows={Math.max(5, height - 7)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "tools") {
		return (
			<ToolsWorkspace
				width={workspaceWidth}
				history={toolHistory}
				selectedIndex={selectedToolHistoryIndex}
				targetPresets={toolTargetPresets}
				customTargetPresets={customToolTargetPresets}
				selectedTargetPresetIndex={selectedToolTargetPresetIndex}
				filterQuery={toolHistoryFilter}
				filterPresets={toolHistoryFilterPresets}
				sort={toolHistorySort}
				group={toolHistoryGroup}
				detailView={toolHistoryDetailView}
				copyPreview={toolCopyPreview}
				sectionClipboardSelection={toolSectionClipboardSelection}
				sectionClipboardRowIndex={toolSectionClipboardRowIndex}
				commandLine={commandLine}
				visibleRows={Math.max(7, height - 7)}
				configShelfFocusTarget={configShelfFocusTarget}
				t={t}
			/>
		);
	}
	if (screen === "networkTools") {
		return <NetworkToolsWorkspace />;
	}
	if (screen === "timeline") {
		return (
			<TimelineWorkspace
				events={events}
				filter={timelineFilter}
				query={timelineSearchQuery}
				selectedIndex={selectedTimelineIndex}
				presets={timelineSearchPresets}
				commandLine={commandLine}
				visibleRows={Math.max(5, height - 7)}
				width={workspaceWidth}
				t={t}
			/>
		);
	}
	if (screen === "dns") {
		return (
			<DnsWorkspace
				commandLine={commandLine}
				proposal={dnsServerProposal}
				selectedTargetIndex={selectedDnsTargetIndex}
				summary={summary}
				t={t}
			/>
		);
	}
	if (screen === "actions") {
		return (
			<ActionWorkspace
				actions={actions}
				selectedIndex={selectedActionIndex}
				focused={focusArea === "actions"}
				previewPlan={actionPreviewPlan}
				simulation={actionSimulation}
				executionPlan={actionExecutionPlan}
				policy={controlExecutionPolicy}
				commandLine={commandLine}
				visibleRows={Math.max(3, height - 7)}
				t={t}
			/>
		);
	}
	if (screen === "status") {
		return (
			<StatusWorkspace
				updateCheckResult={updateCheckResult}
				githubReleaseCheckResult={githubReleaseCheckResult}
				selectedUpdateHandoffIndex={selectedUpdateHandoffIndex}
				handoffIndex={handoffIndex}
				selectedHandoffIndex={selectedHandoffIndex}
				auditExportIndex={auditExportIndex}
				selectedAuditExportIndex={selectedAuditExportIndex}
				auditExportArchiveIndex={auditExportArchiveIndex}
				selectedAuditExportArchiveIndex={selectedAuditExportArchiveIndex}
				externalOpenPlan={externalOpenPlan}
				fileOpenPlan={fileOpenPlan}
				auditExportArchivePlan={auditExportArchivePlan}
				auditArchiveRetentionPlan={auditArchiveRetentionPlan}
				cleanupExportArchivePlan={cleanupExportArchivePlan}
				toolExportArchivePlan={toolExportArchivePlan}
				toolArchiveRetentionPlan={toolArchiveRetentionPlan}
				cleanupShelfIndex={cleanupShelfIndex}
				selectedCleanupShelfIndex={selectedCleanupShelfIndex}
				cleanupHandoffHistory={cleanupHandoffHistory}
				selectedCleanupHandoffHistoryIndex={selectedCleanupHandoffHistoryIndex}
				cleanupExportIndex={cleanupExportIndex}
				selectedCleanupExportIndex={selectedCleanupExportIndex}
				cleanupExportArchiveIndex={cleanupExportArchiveIndex}
				selectedCleanupExportArchiveIndex={selectedCleanupExportArchiveIndex}
				toolExportIndex={toolExportIndex}
				selectedToolExportIndex={selectedToolExportIndex}
				toolExportFilter={toolExportFilter}
				toolExportQuery={toolExportQuery}
				toolExportArchiveIndex={toolExportArchiveIndex}
				selectedToolExportArchiveIndex={selectedToolExportArchiveIndex}
				toolExportArchiveFilter={toolExportArchiveFilter}
				toolExportArchiveQuery={toolExportArchiveQuery}
				selectedStatusActivitySource={selectedStatusActivitySource}
				statusActivityResults={statusActivityResults}
				selectedStatusActivityResultIndex={selectedStatusActivityResultIndex}
				statusActivityResultHistoryFilter={statusActivityResultHistoryFilter}
				statusActivityResultTimelineJumpFilter={
					statusActivityResultTimelineJumpFilter
				}
				selectedStatusActivityCopyPreviewRowIndex={
					selectedStatusActivityCopyPreviewRowIndex
				}
				statusActivityCopyPreviewExpanded={statusActivityCopyPreviewExpanded}
				statusActivityCopyIntentHistory={statusActivityCopyIntentHistory}
				selectedStatusActivityCopyIntentIndex={
					selectedStatusActivityCopyIntentIndex
				}
				selectedStatusActivityResultAuditJumpIndex={
					selectedStatusActivityResultAuditJumpIndex
				}
				selectedStatusActivityToolsEvidenceSearchMatchIndex={
					selectedStatusActivityToolsEvidenceSearchMatchIndex
				}
				lastStatusActivityCopyIntentAuditExport={
					lastStatusActivityCopyIntentAuditExport
				}
				lastTimelineEvidenceTrailAuditExport={
					lastTimelineEvidenceTrailAuditExport
				}
				timelineEvidenceTrailAuditExports={timelineEvidenceTrailAuditExports}
				selectedTimelineEvidenceTrailAuditExportIndex={
					selectedTimelineEvidenceTrailAuditExportIndex
				}
				timelineEvidenceTrailSourceFilter={timelineEvidenceTrailSourceFilter}
				processControlAuditExports={processControlAuditExports}
				selectedProcessControlAuditExportIndex={
					selectedProcessControlAuditExportIndex
				}
				remoteKnownHostsSelectionAuditExports={
					remoteKnownHostsSelectionAuditExports
				}
				selectedRemoteKnownHostsSelectionAuditExportIndex={
					selectedRemoteKnownHostsSelectionAuditExportIndex
				}
				interfaceConfirmationAuditExports={interfaceConfirmationAuditExports}
				interfaceConfirmationAuditArchiveExports={
					interfaceConfirmationAuditArchiveExports
				}
				selectedInterfaceConfirmationAuditExportIndex={
					selectedInterfaceConfirmationAuditExportIndex
				}
				interfaceEvidenceStateFilter={interfaceEvidenceStateFilter}
				interfaceEvidenceQuery={interfaceEvidenceQuery}
				interfaceEvidenceSearchPresets={interfaceEvidenceSearchPresets}
				configManagedShelfRows={configManagedShelfRows}
				events={events}
				selectedStatusEvidenceKind={selectedStatusEvidenceKind}
				commandLine={commandLine}
				t={t}
			/>
		);
	}
	if (screen === "config") {
		return (
			<ConfigWorkspace
				items={configWorkspaceItems}
				selectedIndex={selectedConfigIndex}
				resetPreview={configResetPreview}
				commandLine={commandLine}
				configPath={getConfigPath()}
				managedShelfRows={configManagedShelfRows}
				managedShelfHandoffRows={configManagedShelfHandoffRows}
				visibleRows={Math.max(5, height - 7)}
			/>
		);
	}
	if (screen === "logs") {
		return (
			<LogWorkspace
				logs={osLogs}
				checks={doctorChecks}
				query={logSearchQuery}
				presets={logSearchPresets}
				level={logLevelFilter}
				profiles={logProfiles}
				follow={logFollowEnabled}
				followRefreshCount={logFollowRefreshCount}
				followLastStatus={logFollowLastStatus}
				followHistory={logFollowHistory}
				commandLine={commandLine}
				visibleRows={Math.max(6, height - 7)}
				configShelfFocusTarget={configShelfFocusTarget}
			/>
		);
	}
	if (screen === "operations") {
		return (
			<OperationsWorkspace
				presets={operationPresets}
				selectedIndex={selectedOperationPresetIndex}
				run={operationRun}
				visibleRows={Math.max(6, height - 7)}
				t={t}
			/>
		);
	}
	return (
		<DashboardWorkspace
			summary={summary}
			inventory={inventory}
			systemMonitor={systemMonitor}
			doctorChecks={doctorChecks}
			fileRoot={fileRoot}
			fileEntries={fileEntries}
			fileLocations={fileLocations}
			actions={actions}
			connections={connections}
			ports={ports}
			events={events}
			visibleRows={Math.max(6, height - 4)}
			t={t}
		/>
	);
}

function DashboardWorkspace({
	summary,
	inventory,
	systemMonitor,
	doctorChecks,
	fileRoot,
	fileEntries,
	fileLocations,
	actions,
	connections,
	ports,
	events,
	visibleRows,
	t,
}: {
	summary?: NetworkSummary;
	inventory?: SystemInventory;
	systemMonitor?: SystemMonitorSnapshot;
	doctorChecks: DoctorCheck[];
	fileRoot: string;
	fileEntries: FileEntry[];
	fileLocations: FileLocation[];
	actions: PicosAction[];
	connections: ActiveConnection[];
	ports: ListeningPort[];
	events: ConsoleEvent[];
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const primary = summary?.primaryInterface;
	const actionSummary = getActionSummary();
	const doctorPasses = doctorChecks.filter((check) => check.status === "pass");
	const doctorWarnings = doctorChecks.filter(
		(check) => check.status !== "pass",
	);
	const storageCount = inventory?.storage.length ?? 0;
	const processCount = inventory?.processes.length ?? 0;
	const fileCount = fileEntries.filter((entry) => entry.type === "file").length;
	const directoryCount = fileEntries.filter(
		(entry) => entry.type === "directory",
	).length;
	const readyActions = actions.filter((action) => action.enabled).slice(0, 5);
	const establishedCount = connections.filter(
		(connection) => connection.state === "ESTABLISHED",
	).length;
	const monitorRows = systemMonitor
		? formatSystemMonitorRows(systemMonitor).slice(2, 6)
		: [];

	if (visibleRows < 22) {
		return (
			<Box flexDirection="column">
				<Text bold color="cyan">
					{t("screen.dashboard")} · picos command deck
				</Text>
				<Text color="gray">read-only OS console · write controls locked</Text>
				<Text>
					OS{" "}
					{clip(
						`${inventory?.system.platform ?? summary?.platform ?? process.platform} ${
							inventory?.system.release ?? ""
						}`.trim(),
						28,
					)}
					{"  "}Arch {inventory?.system.arch ?? "-"}
					{"  "}Up{" "}
					{inventory ? formatUptime(inventory.system.uptimeSeconds) : "-"}
				</Text>
				<Text>
					Load{" "}
					{systemMonitor
						? systemMonitor.loadAverage
								.map((value) => value.toFixed(2))
								.join("/")
						: "-"}
					{"  "}
					CPU {clip(inventory?.hardware.cpuModel ?? "loading", 28)}{" "}
					{inventory?.hardware.cpuCount ?? "-"} cores
				</Text>
				<Text>
					Mem{" "}
					{systemMonitor
						? `${systemMonitor.memory.usedPercent}% used`
						: `${formatBytes(inventory?.hardware.freeMemoryBytes)} / ${formatBytes(
								inventory?.hardware.totalMemoryBytes,
							)}`}
					{"  "}Vol {storageCount}
					{"  "}Proc {processCount}
				</Text>
				<Text>
					Net {summary?.status ?? "loading"}
					{"  "}GW {summary?.gateway ?? "-"}
					{"  "}IPv4 {primary?.ipv4 ?? "-"}
				</Text>
				<Text>
					Conn {connections.length} established {establishedCount}
					{"  "}Ports {ports.length}
				</Text>
				<Text>
					Files dirs {directoryCount} files {fileCount}
					{"  "}Locations {fileLocations.length}
					{"  "}Root {clip(fileRoot, 24)}
				</Text>
				<Text>
					Actions ready {actionSummary.enabled}/{actionSummary.total} locked{" "}
					{actionSummary.locked}
				</Text>
				<Text color="gray">
					{readyActions.map((action) => action.id).join(" · ")}
				</Text>
				<Text color="gray">
					Last event: {clip(events.at(-1)?.message ?? "-", 58)}
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.dashboard")} · picos command deck
			</Text>
			<Text color="gray">
				read-only OS console now · write controls stay locked until confirmed
			</Text>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">OS CORE</Text>
				<Text>
					Host{" "}
					{clip(inventory?.system.hostname ?? summary?.host ?? "local", 28)}
					{"  "}OS{" "}
					{clip(
						`${inventory?.system.platform ?? summary?.platform ?? process.platform} ${
							inventory?.system.release ?? ""
						}`.trim(),
						30,
					)}
				</Text>
				<Text>
					Arch {inventory?.system.arch ?? "-"}
					{"  "}Uptime{" "}
					{inventory ? formatUptime(inventory.system.uptimeSeconds) : "-"}
					{"  "}Privilege {inventory?.permission.detail ?? "-"}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">RESOURCES</Text>
				<Text>
					CPU {clip(inventory?.hardware.cpuModel ?? "loading", 38)}{" "}
					{inventory?.hardware.cpuCount ?? "-"} cores
				</Text>
				{monitorRows.map((row) => (
					<Text key={row}>{clip(row, 84)}</Text>
				))}
				<Text>
					Memory {formatBytes(inventory?.hardware.freeMemoryBytes)} free /{" "}
					{formatBytes(inventory?.hardware.totalMemoryBytes)} total{"  "}
					Volumes {storageCount}
					{"  "}Processes {processCount}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">
					{t("dashboard.primaryInterface").toUpperCase()}
				</Text>
				<Text>
					Status {String(summary?.status ?? "loading").padEnd(8)} Name{" "}
					{clip(primary?.name ?? "-", 16).padEnd(16)} IPv4{" "}
					{clip(primary?.ipv4 ?? "-", 18)}
				</Text>
				<Text>
					Gateway {clip(summary?.gateway ?? "-", 18).padEnd(18)} DNS{" "}
					{clip(summary?.dnsServers.join(", ") || "-", 42)}
				</Text>
				<Text>
					Connections {connections.length}
					{"  "}Established {establishedCount}
					{"  "}Listening Ports {ports.length}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">FILESYSTEM</Text>
				<Text>
					Root {clip(fileRoot, 48)}
					{"  "}Dirs {directoryCount} Files {fileCount} Locations{" "}
					{fileLocations.length}
				</Text>
				<Text color="gray">
					Commands: picos locations · picos dir / · picos dir ~ · workspace 2
					Files
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">ACTION CENTER</Text>
				<Text>
					Ready {actionSummary.enabled}/{actionSummary.total}
					{"  "}Locked {actionSummary.locked}
					{"  "}Elevated {actionSummary.elevated}
				</Text>
				<Text color="gray">
					{readyActions.map((action) => action.id).join(" · ")}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">{t("dashboard.doctorSnapshot").toUpperCase()}</Text>
				{doctorChecks.length ? (
					<Text>
						PASS {doctorPasses.length}
						{"  "}WARN/FAIL {doctorWarnings.length}
						{"  "}Latest {clip(doctorChecks.at(-1)?.label ?? "-", 32)}
					</Text>
				) : (
					<Text color="gray">{t("dashboard.runDoctorHint")}</Text>
				)}
				<Text color="gray">
					Last event: {clip(events.at(-1)?.message ?? "-", 58)}
				</Text>
			</Box>
		</Box>
	);
}

function FilesWorkspace({
	root,
	entries,
	backHistoryCount,
	forwardHistoryCount,
	totalEntryCount,
	locations,
	selectedIndex,
	selectedLocationIndex,
	commandLine,
	fileFilter,
	fileOperationDialog,
	remoteContext,
	focused,
	visibleRows,
	t,
}: {
	root: string;
	entries: FileEntry[];
	backHistoryCount: number;
	forwardHistoryCount: number;
	totalEntryCount: number;
	locations: FileLocation[];
	selectedIndex: number;
	selectedLocationIndex: number;
	commandLine: CommandLineState;
	fileFilter: FileFilterState;
	fileOperationDialog: FileOperationDialogState;
	remoteContext?: RemoteFileContext;
	focused: boolean;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const locationRows = Math.min(locations.length, 5);
	const entryRows = Math.max(3, visibleRows - locationRows - 7);
	const window = getVisibleWindow(entries.length, selectedIndex, entryRows);
	const visibleEntries = entries.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = entries.length - window.end;
	const selectedPathRows = formatSelectedFilePathRows(entries, selectedIndex);
	const providerBoundaryRows = formatFileProviderBoundaryRows({
		root,
		remoteContext,
	});
	const breadcrumbRows = formatFileBreadcrumbRows(
		root,
		entries,
		selectedIndex,
		{
			maxSegments: 5,
		},
	);

	if (visibleRows < 12) {
		const compactEntries = entries.slice(0, Math.max(2, visibleRows - 5));
		return (
			<Box flexDirection="column">
				<Text bold color="cyan">
					{t("screen.files")} · root {clip(root, 18)}
				</Text>
				{providerBoundaryRows.slice(0, 3).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("PROVIDER")
								? "cyan"
								: row.includes("locked") || row.includes("pending")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 76)}
					</Text>
				))}
				<Text color={focused ? "cyan" : "gray"}>
					{focused
						? "files · j/k · enter · f filter · b/B history · :path"
						: "enter opens file focus"}
				</Text>
				<Text color="gray">
					history back={backHistoryCount} forward={forwardHistoryCount} · ..
					parent · u up
				</Text>
				{fileFilter.active || fileFilter.query ? (
					<Text color={fileFilter.active ? "yellow" : "gray"}>
						filter {fileFilter.query || "type"} · {entries.length}/
						{totalEntryCount}
					</Text>
				) : null}
				{commandLine.active ? (
					<Text color="yellow">
						:{commandLine.prompt} {commandLine.value || " "}
					</Text>
				) : null}
				{fileOperationDialog.active ? (
					<Text color="yellow">
						operation {fileOperationDialog.preview.kind} locked ·{" "}
						{clip(fileOperationDialog.preview.path, 34)}
					</Text>
				) : null}
				{selectedPathRows.slice(0, 2).map((row) => (
					<Text key={row} color={row.startsWith("SELECTED") ? "cyan" : "gray"}>
						{clip(row, 76)}
					</Text>
				))}
				{breadcrumbRows.slice(0, 2).map((row) => (
					<Text
						key={row}
						color={row.startsWith("PATH BREADCRUMB") ? "cyan" : "gray"}
					>
						{clip(row, 76)}
					</Text>
				))}
				{locations.slice(0, 3).map((location, index) => (
					<Text
						key={`${location.kind}:${location.path}`}
						color={index === selectedLocationIndex ? "cyan" : "white"}
					>
						{index === selectedLocationIndex ? ">" : " "}{" "}
						{`${index + 1} ${location.label}`.padEnd(12)}{" "}
						{clip(location.path, 38)}
					</Text>
				))}
				<Text color="cyan">DIRECTORY VIEW</Text>
				{compactEntries.length ? (
					compactEntries.map((entry, index) => (
						<Text
							key={entry.path}
							color={focused && index === selectedIndex ? "cyan" : "white"}
						>
							{focused && index === selectedIndex ? ">" : " "}{" "}
							{entry.type === "directory" ? "<DIR>" : formatFileSize(entry)}{" "}
							{clip(entry.name, 44)}
						</Text>
					))
				) : (
					<Text color="gray">loading root...</Text>
				)}
				<Text color="gray">
					.. parent · b back · B forward · picos dir / · picos dir ~
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.files")}
			</Text>
			<Text color="gray">current {clip(root, 46)}</Text>
			<Box flexDirection="column">
				{providerBoundaryRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("PROVIDER")
								? "cyan"
								: row.includes("locked") || row.includes("pending")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 100)}
					</Text>
				))}
			</Box>
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "files · j/k · enter · f filter · c/m/x ops · b/B history · :path"
					: "enter opens file focus · read-only navigation · .. available"}
			</Text>
			<Text color="gray">
				history back={backHistoryCount} forward={forwardHistoryCount} · ..
				parent · u up
			</Text>
			{fileFilter.active || fileFilter.query ? (
				<Text color={fileFilter.active ? "yellow" : "gray"}>
					filter {fileFilter.query || "type"} · {entries.length}/
					{totalEntryCount} · enter apply · esc clear
				</Text>
			) : null}
			{commandLine.active ? (
				<Text color="yellow">
					:{commandLine.prompt} {commandLine.value || " "}
				</Text>
			) : null}
			{fileOperationDialog.active ? (
				<Box marginTop={1} flexDirection="column">
					<Text color="yellow">FILE OPERATION PREVIEW</Text>
					<Text>
						{fileOperationDialog.preview.title} ·{" "}
						{fileOperationDialog.preview.risk} ·{" "}
						{fileOperationDialog.preview.privilege}
					</Text>
					<Text>path {clip(fileOperationDialog.preview.path, 64)}</Text>
					<Text>target {fileOperationDialog.preview.targetHint}</Text>
					<Text color="yellow">
						{commandLine.prompt === "file-operation-destination"
							? "enter destination path · enter continues · esc cancels"
							: `locked · type ${fileOperationDialog.preview.confirmationPhrase} · enter confirms · esc cancels`}
					</Text>
				</Box>
			) : null}
			<Box marginTop={1} flexDirection="column">
				{breadcrumbRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("PATH BREADCRUMB")
								? "cyan"
								: row.startsWith("controls=")
									? "gray"
									: "white"
						}
					>
						{clip(row, 100)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SYSTEM LOCATIONS</Text>
				{locations.slice(0, locationRows).map((location, index) => (
					<Text
						key={`${location.kind}:${location.path}`}
						color={index === selectedLocationIndex ? "cyan" : "white"}
					>
						{index === selectedLocationIndex ? ">" : " "}{" "}
						{`${index + 1} ${location.label}`.padEnd(17)}{" "}
						{clip(location.path, 32)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">DIRECTORY VIEW</Text>
				<Text color="gray">TYPE SIZE NAME</Text>
				{hiddenAbove > 0 ? (
					<Text color="gray">↑ {hiddenAbove} more</Text>
				) : null}
				{visibleEntries.length ? (
					visibleEntries.map((entry, visibleIndex) => {
						const index = window.start + visibleIndex;
						return (
							<Text
								key={entry.path}
								color={focused && index === selectedIndex ? "cyan" : "white"}
							>
								{focused && index === selectedIndex ? ">" : " "}{" "}
								{entry.type.padEnd(10)} {formatFileSize(entry).padStart(10)}{" "}
								{clip(entry.name, 34)}
							</Text>
						);
					})
				) : (
					<Text color="gray">loading directory...</Text>
				)}
				{hiddenBelow > 0 ? (
					<Text color="gray">↓ {hiddenBelow} more</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				{selectedPathRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("SELECTED")
								? "cyan"
								: row.startsWith("controls=")
									? "gray"
									: "white"
						}
					>
						{clip(row, 100)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					{remoteContext
						? "enter open · u parent · f filter · y path · b back · B forward · L close SFTP · : path"
						: "1-9 locations · f filter · y path · b back · B forward · c copy · m move · x delete · : path"}
				</Text>
				<Text>
					{remoteContext
						? "SFTP text preview opens in the read-only Editor buffer"
						: "picos type /path/to/file"}
				</Text>
				<Text color="gray">
					{remoteContext
						? "remote list/stat/read only · writes and commands disabled"
						: "file operations are preview-only until confirmation wiring lands"}
				</Text>
			</Box>
		</Box>
	);
}

function EditorWorkspace({
	preview,
	saveResult,
	entries,
	providerKind,
	commandLine,
	selectedLineIndex,
	visibleRows,
	t,
}: {
	preview?: EditorBuffer;
	saveResult?: EditorSaveExecutionResult;
	entries: FileEntry[];
	providerKind: FileProviderKind;
	commandLine: CommandLineState;
	selectedLineIndex: number;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const textFiles = entries.filter(
		(entry) =>
			entry.type === "file" &&
			/\.(md|ts|tsx|json|txt|js|mjs|cjs|yml|yaml)$/i.test(entry.name),
	);
	const lines = preview ? formatEditorBufferLines(preview, visibleRows) : [];
	const bufferState = preview ? getEditorBufferState(preview) : undefined;
	const savePreview = preview
		? createEditorWritePreview({
				path: preview.path,
				originalContent: preview.originalContent,
				nextContent: preview.content,
				providerKind,
				maxDiffRows: Math.max(1, visibleRows - lines.length - 12),
			})
		: undefined;
	const savePreviewRows = savePreview
		? formatEditorWritePreviewRows(savePreview)
		: [
				"EDITOR SAVE PREVIEW",
				"open a text file to stage a locked save preview",
			];
	const saveResultRows = saveResult
		? formatEditorSaveExecutionResultRows(saveResult)
		: [
				"EDITOR SAVE RESULT",
				"no save attempt in this editor session",
				"timeline search appears after save confirmation",
			];

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.editor")} · preview buffer
			</Text>
			<Text color="gray">
				j/k line · i before · o after · r replace · x delete · u undo · s save
				confirm · writes locked
			</Text>
			{commandLine.active &&
			(commandLine.prompt === "editor-append" ||
				commandLine.prompt === "editor-insert-before" ||
				commandLine.prompt === "editor-insert-after" ||
				commandLine.prompt === "editor-replace" ||
				commandLine.prompt === "editor-save") ? (
				<Text color="yellow">
					:{commandLine.prompt} {commandLine.value || " "}{" "}
					{commandLine.prompt === "editor-save"
						? 'type="save file" enter=confirm esc=cancel'
						: commandLine.prompt === "editor-insert-before"
							? "enter=insert-before esc=cancel"
							: commandLine.prompt === "editor-insert-after"
								? "enter=insert-after esc=cancel"
								: commandLine.prompt === "editor-replace"
									? "enter=replace esc=cancel"
									: "enter=append esc=cancel"}
				</Text>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">BUFFER</Text>
				<Text>File {clip(preview?.path ?? textFiles[0]?.path ?? "-", 72)}</Text>
				{bufferState ? (
					<Text color={bufferState.dirty ? "yellow" : "gray"}>
						state dirty={String(bufferState.dirty)} lines=
						{bufferState.lineCount}/{bufferState.originalLineCount} truncated=
						{String(bufferState.truncated)} undo=
						{preview?.editHistory.length ?? 0}
					</Text>
				) : null}
				{lines.length ? (
					lines.map((line) => (
						<Text
							key={`${preview?.path}:${line.number}`}
							color={line.number - 1 === selectedLineIndex ? "cyan" : "white"}
						>
							{line.number - 1 === selectedLineIndex ? ">" : " "}{" "}
							{String(line.number).padStart(3)} │ {clip(line.content, 84)}
						</Text>
					))
				) : (
					<Text color="gray">No text preview loaded yet.</Text>
				)}
				{preview?.truncated ? (
					<Text color="yellow">preview truncated</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SAVE POLICY</Text>
				{savePreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row === "EDITOR SAVE PREVIEW" || row === "DIFF"
								? "cyan"
								: row.startsWith("locked") || row.startsWith("reason")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SAVE RESULT</Text>
				{saveResultRows.map((row) => (
					<Text
						key={row}
						color={
							row === "EDITOR SAVE RESULT"
								? "cyan"
								: row.includes("status=saved") || row.includes("success=true")
									? "green"
									: row.includes("status=blocked") ||
											row.includes("save-failed") ||
											row.startsWith("blockers=")
										? "yellow"
										: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function getConfigShelfFocusRowColor(row: string): string {
	if (row.startsWith("CONFIG SHELF")) {
		return "cyan";
	}
	if (row.startsWith("hint=")) {
		return "gray";
	}
	return "yellow";
}

const FULL_REMOTE_WORKSPACE_FIXED_ROWS = 117;
const FULL_REMOTE_WORKSPACE_MIN_ROWS = 128;

function RemotesWorkspace({
	profiles,
	selectedIndex,
	hostKeyEvidenceSession,
	knownHostsCandidateSession,
	knownHostsPasteReviewSession,
	selectedContext,
	connectionDiagnostic,
	activityResults,
	focused,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	hostKeyEvidenceSession: RemoteHostKeyEvidenceInputSession;
	knownHostsCandidateSession: RemoteKnownHostsCandidateSession;
	knownHostsPasteReviewSession: RemoteKnownHostsPasteReviewSession;
	selectedContext?: RemoteFileContext;
	connectionDiagnostic?: ReadOnlySftpConnectionDiagnostic;
	activityResults: StatusActivityResult[];
	focused: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const focusRows = withConfigManagedShelfFocusRows(
		[],
		configShelfFocusTarget,
		visibleRows,
	);
	const sessionControlRows =
		formatReadOnlySftpConnectionDiagnosticRows(connectionDiagnostic);
	const profileRows = Math.max(
		1,
		visibleRows - focusRows.length - FULL_REMOTE_WORKSPACE_FIXED_ROWS,
	);
	const window = getVisibleWindow(profiles.length, selectedIndex, profileRows);
	const visibleProfiles = profiles.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = profiles.length - window.end;
	const selectedProfile = resolveRemoteProfileSelection(
		profiles,
		selectedIndex,
	).profile;
	const knownHostsPasteReview = createRemoteKnownHostsPasteReviewFromSession(
		selectedProfile,
		knownHostsPasteReviewSession,
	);
	const knownHostsCandidatePreview =
		knownHostsPasteReview.status === "parsed-injected"
			? createRemoteKnownHostsCandidatePreviewFromPasteReview(
					knownHostsPasteReview,
				)
			: createRemoteKnownHostsCandidatePreviewFromSession(
					selectedProfile,
					knownHostsCandidateSession,
				);
	const knownHostsCandidatePreviewRows =
		formatRemoteKnownHostsCandidatePreviewRows(knownHostsCandidatePreview);
	const connectPrompt = prepareRemoteConnectPrompt({
		profiles,
		selectedIndex,
		candidateSession: knownHostsCandidateSession,
		pasteReviewSession: knownHostsPasteReviewSession,
	});
	const connectPreview =
		connectPrompt.kind === "prompt" ? connectPrompt.preview : undefined;
	const connectPreviewRows = formatRemoteConnectPreviewRows(connectPreview);
	const activityRows = formatRemoteActivityShelfRows(activityResults, {
		selectedProfileId: selectedProfile?.id,
	});
	if (visibleRows < FULL_REMOTE_WORKSPACE_MIN_ROWS) {
		const sessionStatus =
			sessionControlRows.find((row) => row.startsWith("status=")) ??
			"status=idle attempt=0 duration=- network=closed";
		const sessionDetail =
			sessionControlRows.find((row) => row.startsWith("message=")) ??
			sessionControlRows.at(-1) ??
			"controls=c exact-confirm connect";
		const selectedProfileRow = selectedProfile
			? `PROFILE ${focused ? ">" : " "} ${String(selectedIndex + 1).padEnd(3)}${selectedProfile.id.padEnd(12)} ${clip(selectedProfile.host, 22)} root ${clip(selectedProfile.root, 12)}`
			: "PROFILE none · configure a remote before connecting";
		const promptRow = commandLine.active
			? `:${commandLine.prompt} ${commandLine.value || " "} · enter submit · esc cancel`
			: undefined;
		const candidateSummary = knownHostsCandidatePreviewRows.find((row) =>
			row.startsWith("candidates="),
		);
		const connectSummary = connectPreviewRows.find((row) =>
			row.startsWith("status="),
		);
		const compactRows = [
			{
				key: "title",
				text: `${t("screen.remotes")} · SESSION CONTROL`,
				color: "cyan",
				bold: true,
			},
			{
				key: "hint-primary",
				text: focused
					? "j/k select · c connect · X cancel · R retry · h/esc"
					: "enter opens remote focus · sessions locked",
				color: focused ? "cyan" : "gray",
			},
			{
				key: "hint-security",
				text: "K/P hosts · [ ]/1-9/S key · e evidence · t trust",
				color: focused ? "cyan" : "gray",
				bold: false,
			},
			...(promptRow
				? [
						{
							key: `prompt:${commandLine.prompt}`,
							text: promptRow,
							color: "yellow",
							bold: false,
						},
					]
				: []),
			{
				key: "session-status",
				text: `SESSION ${sessionStatus}`,
				color:
					sessionStatus.includes("failed") || sessionStatus.includes("cancel")
						? "yellow"
						: "gray",
				bold: false,
			},
			{
				key: "session-detail",
				text: sessionDetail,
				color:
					sessionDetail.includes("failed") ||
					sessionDetail.includes("cancel") ||
					sessionDetail.includes("locked")
						? "yellow"
						: "gray",
				bold: false,
			},
			{
				key: "selected-profile",
				text: selectedProfileRow,
				color: selectedProfile && focused ? "cyan" : "gray",
				bold: false,
			},
			{
				key: "candidate-summary",
				text: `HOST ${candidateSummary ?? "candidates=0 selected=none decision=blocked"}`,
				color: "yellow",
				bold: false,
			},
			{
				key: "connect-summary",
				text: `CONNECT ${connectSummary ?? "status=blocked network=not-opened writes=locked"}`,
				color: "yellow",
				bold: false,
			},
			...activityRows.slice(0, 2).map((row) => ({
				key: `activity:${row}`,
				text: row,
				color: "gray",
				bold: false,
			})),
			...focusRows.map((row) => ({
				key: `focus:${row}`,
				text: row,
				color: getConfigShelfFocusRowColor(row),
				bold: false,
			})),
		];
		return (
			<Box flexDirection="column">
				{compactRows.slice(0, visibleRows).map((row) => (
					<Text key={row.key} color={row.color} bold={row.bold}>
						{clip(row.text, 56)}
					</Text>
				))}
			</Box>
		);
	}

	const handoffRows = formatRemoteHandoffBoundaryRows({
		profile: selectedProfile,
		context: selectedContext,
	});
	const adapterBoundaryRows = formatRemoteAdapterBoundaryRows(selectedProfile);
	const transportProbeRows = formatRemoteTransportProbeRows(
		createRemoteTransportProbe(selectedProfile),
	);
	const readOnlyAdapterRows = formatRemoteReadOnlyAdapterContractRows(
		createRemoteReadOnlyAdapterContract(selectedProfile),
	);
	const fileRequestPreviewRows = formatRemoteFileRequestPreviewRows(
		createRemoteFileRequestPreview(selectedProfile),
	);
	const hostKeyEvidenceRows = formatRemoteHostKeyEvidenceRows(
		createRemoteHostKeyEvidence(selectedProfile),
	);
	const hostKeyEvidenceInput = createRemoteHostKeyEvidenceInputFromSession(
		selectedProfile,
		hostKeyEvidenceSession,
	);
	const hostKeyEvidenceInputRows =
		formatRemoteHostKeyEvidenceInputRows(hostKeyEvidenceInput);
	const knownHostsSourceRows = formatRemoteKnownHostsSourcePreviewRows(
		createRemoteKnownHostsSourcePreview(selectedProfile),
	);
	const knownHostsReadPreviewRows = formatRemoteKnownHostsReadPreviewRows(
		createRemoteKnownHostsReadPreview(selectedProfile),
	);
	const knownHostsReadResultRows = formatRemoteKnownHostsReadResultRows(
		createRemoteKnownHostsReadResult(selectedProfile),
	);
	const knownHostsParserPreviewRows = formatRemoteKnownHostsParserPreviewRows(
		createRemoteKnownHostsParserPreview(selectedProfile),
	);
	const knownHostsPasteReviewRows = formatRemoteKnownHostsPasteReviewRows(
		knownHostsPasteReview,
	);
	const hostKeyTrustDecisionRows = formatRemoteHostKeyTrustDecisionPreviewRows(
		createRemoteHostKeyTrustDecisionPreview(selectedProfile),
	);
	const hostKeyCompareDetailRows = formatRemoteHostKeyCompareDetailRows(
		createRemoteHostKeyCompareDetail(
			selectedProfile,
			knownHostsCandidatePreview,
			hostKeyEvidenceInput,
		),
	);
	const hostReviewRows = formatRemoteHostReviewRows(selectedProfile);
	const knownHostsSelectionHistoryRows =
		formatRemoteKnownHostsSelectionHistoryRows(activityResults, {
			selectedProfileId: selectedProfile?.id,
			limit: 2,
		});

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.remotes")}
			</Text>
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "remote focus · j/k select · c connect · X cancel · R retry · K/P known_hosts · y copy · E export · h/esc"
					: "enter opens remote focus · sessions locked"}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SESSION CONTROL</Text>
				{sessionControlRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("failed") ||
										row.includes("cancel") ||
										row.includes("locked")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			{focusRows.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					{focusRows.map((row) => (
						<Text key={row} color={getConfigShelfFocusRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">PROFILES</Text>
				{hiddenAbove > 0 ? (
					<Text color="gray">↑ {hiddenAbove} more profiles</Text>
				) : null}
				{visibleProfiles.length ? (
					visibleProfiles.map((profile, visibleIndex) => {
						const index = window.start + visibleIndex;
						const selected = focused && index === selectedIndex;
						return (
							<Text key={profile.id} color={selected ? "cyan" : "white"}>
								{selected ? ">" : " "} {String(index + 1).padEnd(3)}
								{profile.id.padEnd(12)} {clip(profile.host, 22).padEnd(22)} root{" "}
								{clip(profile.root, 12)}
							</Text>
						);
					})
				) : (
					<Text color="gray">No remote profiles configured.</Text>
				)}
				{hiddenBelow > 0 ? (
					<Text color="gray">↓ {hiddenBelow} more profiles</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">RECENT ACTIVITY</Text>
				{activityRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("confirmed-blocked") ||
										row.includes("rejected") ||
										row.includes("locked") ||
										row.includes("not-opened")
									? "yellow"
									: row.startsWith(">")
										? "cyan"
										: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS SELECTION HISTORY</Text>
				{knownHostsSelectionHistoryRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("KNOWN_HOSTS")
								? "cyan"
								: row.startsWith(">") || row.startsWith("controls=")
									? "cyan"
									: row.includes("not-opened") ||
											row.includes("not-applied") ||
											row.includes("knownHostsWrite=false") ||
											row.startsWith("guards=")
										? "yellow"
										: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SELECTED CONTEXT</Text>
				{handoffRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") || row.includes("pending")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				<Text color="gray">
					sessions locked · password persistence disabled by schema
				</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">ADAPTER BOUNDARY</Text>
				{adapterBoundaryRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("not installed") ||
										row.includes("blocked")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">TRANSPORT PROBE</Text>
				{transportProbeRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("blocked") ||
										row.includes("missing") ||
										row.includes("not-opened") ||
										row.includes("locked")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">READ ADAPTER CONTRACT</Text>
				{readOnlyAdapterRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("unsupported") ||
										row.includes("disabled") ||
										row.includes("willImport=false") ||
										row.includes("willMutate=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">FILE REQUEST PREVIEW</Text>
				{fileRequestPreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("blocked") ||
										row.includes("locked") ||
										row.includes("unsupported") ||
										row.includes("willRead=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">HOST KEY EVIDENCE</Text>
				{hostKeyEvidenceRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("unverified") ||
										row.includes("willRead=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">HOST KEY EVIDENCE INPUT</Text>
				{hostKeyEvidenceInputRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("missing") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("not-opened") ||
										row.includes("willConnect=false") ||
										row.includes("willScan=false") ||
										row.includes("willTrust=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				{commandLine.active && commandLine.prompt === "remote-host-key-evidence"
					? formatRemoteHostKeyEvidenceInputPromptRows(
							selectedProfile
								? createRemoteHostKeyEvidenceInput(selectedProfile)
								: createRemoteHostKeyEvidenceInput(),
							commandLine.value,
						).map((row) => (
							<Text key={row} color="yellow">
								{clip(row, 92)}
							</Text>
						))
					: null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS SOURCE</Text>
				{knownHostsSourceRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("not-read") ||
										row.includes("unknown") ||
										row.includes("willReadLocal=false") ||
										row.includes("willScan=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS READ PREVIEW</Text>
				{knownHostsReadPreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("not-run") ||
										row.includes("willReadLocal=false") ||
										row.includes("willScan=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS READ RESULT</Text>
				{knownHostsReadResultRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("missing") ||
										row.includes("rawContent=hidden") ||
										row.includes("willReadLocal=false") ||
										row.includes("willTrust=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS PARSER PREVIEW</Text>
				{knownHostsParserPreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("willParse=false") ||
										row.includes("willTrust=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS PASTE REVIEW</Text>
				{knownHostsPasteReviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("not-parsed") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("willReadLocal=false") ||
										row.includes("willTrust=false")
									? "yellow"
									: row.startsWith(">")
										? "cyan"
										: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				{commandLine.active &&
				commandLine.prompt === "remote-known-hosts-paste" ? (
					<Text color="yellow">
						{clip(
							`:remote-known-hosts-paste ${commandLine.value || " "} use \\n between lines · enter=parse esc=cancel`,
							92,
						)}
					</Text>
				) : null}
				{commandLine.active &&
				commandLine.prompt === "remote-known-hosts-select" ? (
					<Text color="yellow">
						{clip(
							`:remote-known-hosts-select ${commandLine.value || " "} enter=select · accepts 12, #12, candidate 12 · esc=cancel`,
							92,
						)}
					</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">KNOWN_HOSTS CANDIDATES</Text>
				{knownHostsCandidatePreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("not-parsed") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("willReadLocal=false") ||
										row.includes("willTrust=false")
									? "yellow"
									: row.startsWith(">")
										? "cyan"
										: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				{commandLine.active &&
				commandLine.prompt === "remote-known-hosts-candidate" ? (
					<Text color="yellow">
						{clip(
							`:remote-known-hosts-candidate ${commandLine.value || " "} enter=parse esc=cancel`,
							92,
						)}
					</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">HOST KEY TRUST DECISION</Text>
				{hostKeyTrustDecisionRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("willTrust=false") ||
										row.includes("willConnect=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				{commandLine.active && commandLine.prompt === "remote-host-trust" ? (
					<Text color="yellow">
						:remote-host-trust {commandLine.value || " "} confirm="
						{selectedProfile
							? createRemoteHostKeyTrustDecisionPreview(selectedProfile).confirm
							: "select remote profile"}
						" esc cancel
					</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">HOST KEY COMPARE DETAIL</Text>
				{hostKeyCompareDetailRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") ||
										row.includes("blocked") ||
										row.includes("unknown") ||
										row.includes("willTrust=false") ||
										row.includes("willConnect=false") ||
										row.includes("willReadLocal=false") ||
										row.includes("willParse=false") ||
										row.includes("willScan=false")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">HOST REVIEW</Text>
				{hostReviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("locked") || row.includes("confirm=")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">CONNECT PREVIEW</Text>
				{connectPreviewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("REMOTE")
								? "cyan"
								: row.includes("blocked") ||
										row.includes("willExecute=false") ||
										row.includes("not-opened")
									? "yellow"
									: "gray"
						}
					>
						{clip(row, 92)}
					</Text>
				))}
				{commandLine.active && commandLine.prompt === "remote-connect" ? (
					<Text color="yellow">
						:remote-connect {commandLine.value || " "} confirm="
						{connectPreview?.confirm ?? "select remote profile"}" esc cancel
					</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					picos remotes · picos remote &lt;id&gt; · t trust review · c connect
					preview
				</Text>
				<Text color="gray">
					next: live read-only SFTP adapter behind host review
				</Text>
			</Box>
		</Box>
	);
}

function SystemWorkspace({
	inventory,
	systemMonitor,
}: {
	inventory?: SystemInventory;
	systemMonitor?: SystemMonitorSnapshot;
}): React.ReactElement {
	const monitorRows = systemMonitor
		? formatSystemMonitorRows(systemMonitor).slice(1)
		: [];
	return (
		<Box flexDirection="column">
			<Text bold>System</Text>
			<Text color="gray">OS identity, runtime, and permission state</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Host {inventory?.system.hostname ?? "loading"}</Text>
				<Text>
					OS {inventory?.system.platform ?? "-"}{" "}
					{inventory?.system.release ?? ""}
				</Text>
				<Text>Arch {inventory?.system.arch ?? "-"}</Text>
				<Text>User {inventory?.permission.user ?? "-"}</Text>
				<Text>Privilege {inventory?.permission.detail ?? "-"}</Text>
				<Text>picos {inventory?.runtime.picosVersion ?? VERSION}</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">SYSTEM MONITOR</Text>
				{monitorRows.length ? (
					monitorRows.map((row) => <Text key={row}>{clip(row, 84)}</Text>)
				) : (
					<Text color="gray">monitor snapshot loading...</Text>
				)}
			</Box>
		</Box>
	);
}

function HardwareWorkspace({
	inventory,
}: {
	inventory?: SystemInventory;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>Hardware</Text>
			<Text color="gray">CPU and memory snapshot</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>CPU {clip(inventory?.hardware.cpuModel ?? "loading", 46)}</Text>
				<Text>Cores {inventory?.hardware.cpuCount ?? "-"}</Text>
				<Text>
					Memory free {formatBytes(inventory?.hardware.freeMemoryBytes)} /{" "}
					{formatBytes(inventory?.hardware.totalMemoryBytes)}
				</Text>
			</Box>
		</Box>
	);
}

function StorageWorkspace({
	inventory,
}: {
	inventory?: SystemInventory;
}): React.ReactElement {
	const volumes = inventory?.storage.slice(0, 10) ?? [];
	return (
		<Box flexDirection="column">
			<Text bold>Storage</Text>
			<Text color="gray">mounted filesystems and capacity</Text>
			<Box marginTop={1} flexDirection="column">
				{volumes.length ? (
					volumes.map((volume) => (
						<Text key={`${volume.filesystem}:${volume.mount}`}>
							{clip(volume.mount, 16).padEnd(16)} {volume.available ?? "-"} free
							/ {volume.size ?? "-"}
						</Text>
					))
				) : (
					<Text color="gray">loading...</Text>
				)}
			</Box>
		</Box>
	);
}

function ProcessesWorkspace({
	inventory,
	selectedProcess,
	selectedFiles,
	fileEvidenceIssue,
	selectedFileIndex,
	copyPreview,
	commandLine,
	visibleRows,
}: {
	inventory?: SystemInventory;
	selectedProcess?: ProcessDetail;
	selectedFiles?: ProcessFileSnapshot;
	fileEvidenceIssue?: PortProcessControlFileEvidenceIssue;
	selectedFileIndex: number;
	copyPreview: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
}): React.ReactElement {
	const promptRows = [
		...formatClipboardPromptRows(commandLine),
		...formatEndpointFilterPromptRows(commandLine, "connections"),
	];
	const rows = [
		...formatProcessWorkspaceRows(
			inventory?.processes.slice(0, 10) ?? [],
			selectedProcess,
			selectedFiles,
			Math.max(1, visibleRows - promptRows.length),
			selectedFileIndex,
			copyPreview,
			fileEvidenceIssue,
		),
		...promptRows,
	];
	return (
		<Box flexDirection="column">
			<Text bold>Processes</Text>
			<Text color="gray">
				j/k select resources · enter opens cwd/file · c copy selected resource
			</Text>
			<Box marginTop={1} flexDirection="column">
				{rows.map((row) => (
					<Text
						key={row}
						color={
							row === "SNAPSHOT" || row === "FILES" || row.startsWith("DETAIL")
								? "cyan"
								: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function NetworkWorkspace({
	summary,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	summary?: NetworkSummary;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const focusRows = withConfigManagedShelfFocusRows(
		[],
		configShelfFocusTarget,
		visibleRows,
	);
	const groupRows = Math.min(summary?.networkGroups.length ?? 0, 4);
	const interfaceRows = Math.max(
		1,
		visibleRows - focusRows.length - groupRows - 6,
	);
	const visibleInterfaces = summary?.interfaces.slice(0, interfaceRows) ?? [];
	const hiddenInterfaces = Math.max(
		0,
		(summary?.interfaces.length ?? 0) - visibleInterfaces.length,
	);

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.network")}</Text>
			<Text color="gray">
				lazyifconfig-style groups · LAN/VPN/container/link-local/public
			</Text>
			{focusRows.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					{focusRows.map((row) => (
						<Text key={row} color={getConfigShelfFocusRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">NETWORK GROUPS</Text>
				{summary ? (
					summary.networkGroups.length ? (
						summary.networkGroups.slice(0, groupRows).map((group) => (
							<Text key={group.kind}>
								{clip(group.label, 9).padEnd(9)}{" "}
								{clip(group.scope, 8).padEnd(8)} if=
								{clip(group.interfaces.join(","), 10) || "-"} hint=
								{clip(group.hint, 28)}
							</Text>
						))
					) : (
						<Text color="gray">no grouped networks detected</Text>
					)
				) : (
					<Text color="gray">loading...</Text>
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">INTERFACES</Text>
				{visibleInterfaces.map((item) => (
					<Text key={item.name}>
						{clip(item.name, 8).padEnd(8)} {clip(item.kind, 12).padEnd(12)}{" "}
						{clip(
							item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? item.ipv6 ?? "-",
							20,
						)}{" "}
						mtu={item.mtu ?? "-"}
					</Text>
				))}
				{summary ? null : <Text color="gray">loading...</Text>}
				{summary && visibleInterfaces.length === 0 ? (
					<Text color="gray">no interfaces detected</Text>
				) : null}
				{hiddenInterfaces > 0 ? (
					<Text color="gray">↓ {hiddenInterfaces} more interfaces</Text>
				) : null}
			</Box>
		</Box>
	);
}

function InterfacesWorkspace({
	summary,
	selectedIndex,
	view,
	copyPreview,
	stateProposal,
	confirmationResult,
	commandLine,
	visibleRows,
	t,
}: {
	summary?: NetworkSummary;
	selectedIndex: number;
	view: InterfaceDetailView;
	copyPreview: boolean;
	stateProposal?: InterfaceStateProposal;
	confirmationResult?: InterfaceConfirmationResult;
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const control = getInterfaceControlIntent({ selectedIndex, summary });
	const promptRows =
		commandLine.active && commandLine.prompt === "interface-confirm"
			? formatInterfaceConfirmationPromptRows(stateProposal, commandLine.value)
			: [];
	const rows = summary
		? [
				...formatInterfaceWorkspaceRows(
					summary,
					Math.max(1, visibleRows - 3 - promptRows.length),
					{
						confirmationResult,
						copyPreview,
						selectedIndex,
						stateProposal,
						view,
					},
				),
				...promptRows,
			]
		: ["loading interfaces..."];

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.interfaces")}</Text>
			<Text color="gray">
				interface console · j/k select · tab panes ·
				{control.kind === "available"
					? " D disable U enable · K/enter confirm-audit · C clear ·"
					: ` ${control.row} ·`}
				source: c copy e export o open
			</Text>
			<Box marginTop={1} flexDirection="column">
				{rows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("SUMMARY") ||
							row.startsWith("DETAIL") ||
							row.startsWith("STATS") ||
							row.startsWith("PLATFORM") ||
							row.startsWith("INTERFACE") ||
							row.startsWith("PREFLIGHT") ||
							row.startsWith("CLIPBOARD")
								? "cyan"
								: row.startsWith(">")
									? "green"
									: row.startsWith("confirm")
										? "yellow"
										: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function ConnectionsWorkspace({
	result,
	sort,
	filter,
	filterPresets,
	processes,
	selectedIndex,
	view,
	copyPreview,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	result?: ConnectionsResult;
	sort: ConnectionSort;
	filter: string;
	filterPresets: string[];
	processes: SystemInventory["processes"];
	selectedIndex: number;
	view: EndpointDetailView;
	copyPreview: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const visibleDomain = result
		? sortConnections(filterConnections(result.connections, filter), sort)
		: [];
	const promptRows = [
		...formatClipboardPromptRows(commandLine),
		...(configShelfFocusTarget === "connections" &&
		commandLine.active &&
		commandLine.prompt === `${endpointFilterPromptPrefix}connections`
			? formatConfigManagedShelfPromptBreadcrumbRows("connections")
			: []),
		...formatEndpointFilterPromptRows(
			commandLine,
			"connections",
			filterPresets,
			configShelfFocusTarget === "connections"
				? formatConfigManagedShelfCleanupBreadcrumbRows("connections")
				: [],
		),
	];
	const baseRows = result
		? [
				...formatConnectionsWorkspaceRows(
					result,
					Math.max(1, visibleRows - promptRows.length),
					{
						copyPreview,
						filter,
						processes,
						presets: filterPresets,
						selectedIndex,
						shelfFocus: configShelfFocusTarget === "connections",
						sort,
						view,
					},
				),
				...promptRows,
			]
		: ["loading connections..."];
	const rows = withConfigManagedShelfFocusRows(
		baseRows,
		configShelfFocusTarget,
		visibleRows,
	);
	const rowCounts = new Map<string, number>();
	const keyedRows = rows.map((row) => {
		const count = rowCounts.get(row) ?? 0;
		rowCounts.set(row, count + 1);
		return { key: `${row}:${count}`, row };
	});

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.connections")}</Text>
			<Text color="gray">
				{formatEndpointWorkspaceHintRow("connections", {
					snapshotLoaded: Boolean(result),
					filter,
					presetCount: filterPresets.length,
					visibleRows: visibleDomain,
					selectedIndex,
				})}
			</Text>
			<Box marginTop={1} flexDirection="column">
				{keyedRows.map(({ key, row }) => (
					<Text key={key} color={getEndpointRowColor(row, "ACTIVE")}>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					picos connections --filter {filter || "<query>"} · picos connections
					--raw
				</Text>
			</Box>
		</Box>
	);
}

function PortsWorkspace({
	result,
	sort,
	filter,
	filterPresets,
	processes,
	selectedIndex,
	view,
	copyPreview,
	processControlPreview,
	controlExecutionPolicy,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	result?: PortsResult;
	sort: PortSort;
	filter: string;
	filterPresets: string[];
	processes: SystemInventory["processes"];
	selectedIndex: number;
	view: EndpointDetailView;
	copyPreview: boolean;
	processControlPreview: boolean;
	controlExecutionPolicy: ControlExecutionPolicy;
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const visibleDomain = result
		? sortListeningPorts(filterListeningPorts(result.ports, filter), sort)
		: [];
	const processControlPromptRows = formatPortProcessControlPromptRows(
		commandLine,
		result,
		{
			filter,
			selectedIndex,
			sort,
			controlExecutionPolicy,
		},
	);
	const promptRows = [
		...formatClipboardPromptRows(commandLine),
		...(configShelfFocusTarget === "ports" &&
		commandLine.active &&
		commandLine.prompt === `${endpointFilterPromptPrefix}ports`
			? formatConfigManagedShelfPromptBreadcrumbRows("ports")
			: []),
		...formatEndpointFilterPromptRows(
			commandLine,
			"ports",
			filterPresets,
			configShelfFocusTarget === "ports"
				? formatConfigManagedShelfCleanupBreadcrumbRows("ports")
				: [],
		),
		...processControlPromptRows,
	];
	const baseRows = result
		? [
				...formatPortsWorkspaceRows(
					result,
					Math.max(1, visibleRows - promptRows.length),
					{
						copyPreview,
						filter,
						processControlPreview:
							processControlPreview && processControlPromptRows.length === 0,
						processes,
						presets: filterPresets,
						selectedIndex,
						shelfFocus: configShelfFocusTarget === "ports",
						sort,
						view,
					},
				),
				...promptRows,
			]
		: ["loading listening ports..."];
	const rows = withConfigManagedShelfFocusRows(
		baseRows,
		configShelfFocusTarget,
		visibleRows,
	);
	const rowCounts = new Map<string, number>();
	const keyedRows = rows.map((row) => {
		const count = rowCounts.get(row) ?? 0;
		rowCounts.set(row, count + 1);
		return { key: `${row}:${count}`, row };
	});

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.ports")}</Text>
			<Text color="gray">
				{formatEndpointWorkspaceHintRow("ports", {
					snapshotLoaded: Boolean(result),
					filter,
					presetCount: filterPresets.length,
					visibleRows: visibleDomain,
					selectedIndex,
				})}
			</Text>
			<Box marginTop={1} flexDirection="column">
				{keyedRows.map(({ key, row }) => (
					<Text key={key} color={getEndpointRowColor(row, "LISTENING")}>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					picos ports --filter {filter || "<query>"} · picos ports --raw
				</Text>
			</Box>
		</Box>
	);
}

function RoutesWorkspace({
	routeTable,
	routePath,
	routeSort,
	routeFilter,
	routeFilterPresets,
	routeDetailView,
	copyPreview,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	routeTable?: RouteTableResult;
	routePath?: RoutePathResult;
	routeSort: RouteSort;
	routeFilter: string;
	routeFilterPresets: string[];
	routeDetailView: RouteDetailView;
	copyPreview: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const cleanupPreview =
		commandLine.active && commandLine.prompt === "route-filter-cleanup"
			? createRouteFilterCleanupPreview(routeFilterPresets)
			: undefined;
	const promptRows =
		commandLine.active && commandLine.prompt === "route"
			? [`:route ${commandLine.value || " "}`]
			: commandLine.active && commandLine.prompt === "route-filter"
				? [
						...(configShelfFocusTarget === "routes"
							? formatConfigManagedShelfPromptBreadcrumbRows("routes")
							: []),
						`:routes-filter ${commandLine.value || " "}`,
					]
				: commandLine.active &&
						commandLine.prompt === "route-filter-cleanup" &&
						cleanupPreview
					? [
							...(configShelfFocusTarget === "routes"
								? formatConfigManagedShelfCleanupBreadcrumbRows("routes")
								: []),
							...cleanupPreview.rows,
							`:routes-cleanup ${commandLine.value || " "}  type="${cleanupPreview.confirmationPhrase}" enter=clear esc=cancel`,
						]
					: [];
	const pathRows = routePath
		? formatRoutePathRows(routePath, Math.max(4, Math.floor(visibleRows / 3)))
		: ["PATH destination lookup: press : then enter host or IP"];
	const tableRows = routeTable
		? formatRouteWorkspaceRows(
				routeTable,
				Math.max(4, visibleRows - pathRows.length - promptRows.length),
				{
					copyPreview,
					filter: routeFilter,
					path: routePath,
					presets: routeFilterPresets,
					shelfFocus: configShelfFocusTarget === "routes",
					sort: routeSort,
					view: routeDetailView,
				},
			)
		: ["loading route table..."];
	const baseRows =
		routeDetailView === "table"
			? [...tableRows, ...pathRows, ...promptRows].slice(0, visibleRows)
			: [...tableRows, ...promptRows].slice(0, visibleRows);
	const rows = withConfigManagedShelfFocusRows(
		baseRows,
		configShelfFocusTarget,
		visibleRows,
	);
	const rowCounts = new Map<string, number>();
	const keyedRows = rows.map((row) => {
		const count = rowCounts.get(row) ?? 0;
		rowCounts.set(row, count + 1);
		return { key: `${row}:${count}`, row };
	});

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.routes")}</Text>
			<Text color="gray">
				route table diagnostics · f filter · F clear · P save · ] preset · c
				copy · D cleanup · e export · o open · tab/1-4 detail · home/end · s
				sort · : path
			</Text>
			<Box marginTop={1} flexDirection="column">
				{keyedRows.map(({ key, row }) => {
					const isSection =
						row === "DIAGNOSTICS" ||
						row === "ROUTES" ||
						row === "RAW OUTPUT" ||
						row === "RAW PATH" ||
						row === "ROUTE FILTER CLEANUP" ||
						row.startsWith("PATH ") ||
						row.startsWith("FILTER ");
					return (
						<Text
							key={key}
							color={
								row.startsWith("CONFIG SHELF") ||
								row.startsWith("CONFIG ORIGIN") ||
								row.startsWith("SHELF CONTROL")
									? "cyan"
									: row.startsWith("target=") ||
											row.startsWith("scope=") ||
											row.startsWith("focus=") ||
											row.startsWith("enter=") ||
											row.startsWith(":routes-cleanup") ||
											row.startsWith("confirm ")
										? "yellow"
										: row.startsWith("hint=")
											? "gray"
											: isSection
												? "cyan"
												: row.startsWith(">")
													? "green"
													: row.startsWith("WARN")
														? "yellow"
														: "white"
							}
						>
							{row}
						</Text>
					);
				})}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					picos routes --filter {routeFilter || "<query>"} · picos routes
					{" --sort "}
					{routeSort.key}
				</Text>
			</Box>
		</Box>
	);
}

function getEndpointRowColor(row: string, tableHeader: string): string {
	if (
		row.startsWith("CONFIG SHELF") ||
		row.startsWith("CONFIG ORIGIN") ||
		row === tableHeader ||
		row === "RAW OUTPUT" ||
		row === "FILTER" ||
		row === "ENDPOINT FILTER CLEANUP" ||
		row.startsWith("SHELF CONTROL") ||
		row === "PORT PROCESS CONTROL" ||
		row.startsWith("CONTROL EXECUTION") ||
		row.startsWith("DETAIL")
	) {
		return "cyan";
	}
	if (
		row.startsWith("CLIPBOARD PREVIEW") ||
		row.startsWith("target=") ||
		row.startsWith("scope=") ||
		row.startsWith("focus=") ||
		row.startsWith("enter=") ||
		row.startsWith("action=process.terminate") ||
		row.startsWith("status=blocked") ||
		row.startsWith("willExecute=false") ||
		row.startsWith("blockers=") ||
		row.startsWith(":filter-cleanup") ||
		row.startsWith(":port-control") ||
		row.startsWith("confirm ")
	) {
		return "yellow";
	}
	if (row.startsWith(">")) {
		return "green";
	}
	return "white";
}

function formatEndpointFilterPromptRows(
	commandLine: CommandLineState,
	kind: "connections" | "ports",
	presets: string[] = [],
	cleanupBreadcrumbRows: string[] = [],
): string[] {
	if (!commandLine.active) {
		return [];
	}
	if (commandLine.prompt === `${endpointFilterPromptPrefix}${kind}`) {
		return [
			"FILTER",
			`:filter ${commandLine.value || " "}  enter=apply esc=cancel`,
		];
	}
	if (commandLine.prompt === `${endpointFilterCleanupPromptPrefix}${kind}`) {
		const preview = createEndpointFilterCleanupPreview(kind, presets);
		if (!preview) {
			return [];
		}
		return [
			...cleanupBreadcrumbRows,
			...preview.rows,
			`:filter-cleanup ${commandLine.value || " "}  type="${preview.confirmationPhrase}" enter=clear esc=cancel`,
		];
	}
	return [];
}

function formatPortProcessControlPromptRows(
	commandLine: CommandLineState,
	result: PortsResult | undefined,
	options: {
		controlExecutionPolicy: ControlExecutionPolicy;
		filter: string;
		selectedIndex: number;
		sort: PortSort;
	},
): string[] {
	if (
		!commandLine.active ||
		commandLine.prompt !== portProcessControlPrompt ||
		!result
	) {
		return [];
	}
	const ports = sortListeningPorts(
		filterListeningPorts(result.ports, options.filter),
		options.sort,
	);
	const preview = createSelectedPortProcessControlPreview(
		ports,
		options.selectedIndex,
	);
	if (!preview) {
		return [];
	}
	const executionRows = formatPortProcessControlExecutionRows(
		preview,
		undefined,
		getControlPreviewCommand(preview.actionId, currentPlatform()),
		options.controlExecutionPolicy,
	);
	return [
		...preview.rows,
		...executionRows,
		`:port-control ${commandLine.value || " "}  type="${preview.confirmationPhrase}" enter=audit esc=cancel`,
	];
}

function ToolsWorkspace({
	width,
	history,
	selectedIndex,
	targetPresets,
	customTargetPresets,
	selectedTargetPresetIndex,
	filterQuery,
	filterPresets,
	sort,
	group,
	detailView,
	copyPreview,
	sectionClipboardSelection,
	sectionClipboardRowIndex,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
	t,
}: {
	width: number;
	history: ToolHistoryItem[];
	selectedIndex: number;
	targetPresets: ToolTargetPreset[];
	customTargetPresets: ToolTargetPreset[];
	selectedTargetPresetIndex: number;
	filterQuery: string;
	filterPresets: string[];
	sort: ToolHistorySort;
	group: ToolHistoryGroup;
	detailView: ToolHistoryDetailView;
	copyPreview: ToolCopyPreviewMode;
	sectionClipboardSelection: ToolSectionClipboardSelection;
	sectionClipboardRowIndex: number;
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
	t: (key: string) => string;
}): React.ReactElement {
	const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
		history,
		selectedIndex,
		filterQuery,
		sort,
	);
	const workspaceRows = formatToolsWorkspaceRows(
		history,
		visibleRows,
		selectedIndex,
		filterQuery,
		sort,
		group,
		filterPresets,
		detailView,
		targetPresets,
		selectedTargetPresetIndex,
		sectionClipboardSelection,
		sectionClipboardRowIndex,
		copyPreview,
	);
	const rows = withConfigManagedShelfFocusRows(
		workspaceRows,
		configShelfFocusTarget,
		visibleRows,
	);
	const selectedPreview =
		copyPreview === "summary"
			? getSelectedToolSummaryClipboardPreview(history, visibleToolHistoryIndex)
			: copyPreview === "compare"
				? getSelectedToolCompareClipboardPreview(
						history,
						visibleToolHistoryIndex,
					)
				: copyPreview === "target" || copyPreview === "status"
					? getSelectedToolSectionClipboardPreview(
							history,
							visibleToolHistoryIndex,
							copyPreview,
						)
					: copyPreview === "row"
						? getSelectedToolSectionRowClipboardPreview(
								history,
								visibleToolHistoryIndex,
								sectionClipboardSelection,
								sectionClipboardRowIndex,
							)
						: copyPreview === "raw"
							? getSelectedToolOutputClipboardPreview(
									history,
									visibleToolHistoryIndex,
								)
							: undefined;
	const copyRows = selectedPreview
		? formatClipboardPreviewRows(selectedPreview, {
				maxCopyLines: Math.max(1, Math.min(4, visibleRows - 6)),
				maxCopyLineLength: Math.max(32, Math.min(140, width - 8)),
			})
		: [];
	const selectedTargetPreset = getSelectedToolTargetPreset(
		targetPresets,
		selectedTargetPresetIndex,
	);
	const cleanupPreview =
		commandLine.active && commandLine.prompt === "tool-target-cleanup"
			? createToolTargetCleanupPreview(
					customTargetPresets,
					selectedTargetPreset,
				)
			: undefined;
	const historyCleanupPreview =
		commandLine.active && commandLine.prompt === "tool-history-cleanup"
			? createToolHistoryCleanupPreview(filterPresets)
			: undefined;
	const promptRows =
		commandLine.active && commandLine.prompt.startsWith(toolPromptPrefix)
			? formatToolPromptRows(
					commandLine.prompt,
					commandLine.value,
					commandLine.fieldIndex ?? 0,
					commandLine.fieldTouchedIndexes ?? [],
				)
			: commandLine.active && commandLine.prompt === "tool-filter"
				? [
						"TOOL HISTORY FILTER",
						`:filter ${commandLine.value || " "}  enter=apply esc=cancel`,
					]
				: commandLine.active && commandLine.prompt === "tool-target-label"
					? [
							"TOOL TARGET LABEL",
							`:label ${commandLine.value || " "}  enter=save esc=cancel`,
						]
					: commandLine.active && commandLine.prompt === "tool-target-value"
						? [
								"TOOL TARGET VALUE",
								`:target ${commandLine.value || " "}  enter=save esc=cancel`,
							]
						: commandLine.active && commandLine.prompt === "tool-target-action"
							? [
									"TOOL TARGET ACTION",
									`:action ${commandLine.value || " "}  dns ping trace whois ip tls tcp`,
								]
							: commandLine.active &&
									commandLine.prompt === "tool-target-cleanup" &&
									cleanupPreview
								? [
										...cleanupPreview.rows,
										`:cleanup ${commandLine.value || " "}  type="${cleanupPreview.confirmationPhrase}" enter=delete esc=cancel`,
									]
								: commandLine.active &&
										commandLine.prompt === "tool-history-cleanup" &&
										historyCleanupPreview
									? [
											...historyCleanupPreview.rows,
											`:history-cleanup ${commandLine.value || " "}  type="${historyCleanupPreview.confirmationPhrase}" enter=clear esc=cancel`,
										]
									: [];
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.tools")}</Text>
			<Text color="gray">
				Tools Hub · n target · T save · U pin · L label · M target · A action ·
				X delete · D target cleanup · C filter cleanup · R run · tab/1-4 detail
				· home/end · f filter · P save filter
			</Text>
			<Box marginTop={1} flexDirection="column">
				{[...promptRows, ...copyRows, ...rows]
					.slice(0, visibleRows)
					.map((row) => (
						<Text key={row} color={getToolRowColor(row)}>
							{row}
						</Text>
					))}
			</Box>
		</Box>
	);
}

function getToolRowColor(row: string): string {
	if (
		row.startsWith("CONFIG SHELF") ||
		row.startsWith("TOOLS") ||
		row === "RAW" ||
		row.startsWith("## ") ||
		row === "TOOLS HISTORY CLEANUP"
	) {
		return "cyan";
	}
	if (row.startsWith("TARGET PRESETS")) {
		return "cyan";
	}
	if (row.startsWith("> ") && !row.includes("[")) {
		return "green";
	}
	if (
		row.startsWith("CLIPBOARD PREVIEW") ||
		row.startsWith("target=") ||
		row.startsWith("focus=") ||
		row.startsWith("enter=") ||
		row.startsWith("copy help:") ||
		row.startsWith("copy hint:") ||
		row.startsWith("copy mode:") ||
		row.startsWith(":history-cleanup") ||
		row.startsWith("confirm ")
	) {
		return "yellow";
	}
	if (row.includes(" fail ")) {
		return "red";
	}
	if (row.includes(" ok ")) {
		return "green";
	}
	if (row.startsWith("shortcuts:")) {
		return "gray";
	}
	return "white";
}

function NetworkToolsWorkspace(): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>Network Tools</Text>
			<Text color="gray">reachability and adapter inspection queue</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>ping.default Ping configured host</Text>
				<Text>network.connect TCP connect check</Text>
				<Text>tools.dns DNS lookup</Text>
				<Text>tools.whois WHOIS/RDAP lookup</Text>
				<Text>tools.ipInfo IP information</Text>
				<Text>tools.tls TLS inspector</Text>
				<Text>routes.inspect Route table summary</Text>
				<Text>routes.path Destination path lookup</Text>
				<Text>ports.list Listening ports</Text>
				<Text>connections.list Active endpoints</Text>
			</Box>
		</Box>
	);
}

function TimelineWorkspace({
	events,
	filter,
	query,
	selectedIndex,
	presets,
	commandLine,
	visibleRows,
	width,
	t,
}: {
	events: ConsoleEvent[];
	filter: TimelineFilter;
	query: string;
	selectedIndex: number;
	presets: string[];
	commandLine: CommandLineState;
	visibleRows: number;
	width: number;
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows = formatTimelineSearchPromptRows(commandLine, presets);
	const selectedPreviewRow = formatSelectedTimelinePreviewRow(events, {
		filter,
		maxWidth: Math.max(24, width - 4),
		query,
		selectedIndex,
		showRawSourceHint: true,
	});
	const rows = [
		selectedPreviewRow,
		...formatTimelineWorkspaceRows(
			events,
			Math.max(1, visibleRows - promptRows.length - 1),
			filter,
			{
				presets,
				query,
				selectedIndex,
			},
		),
		...promptRows,
	];
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.timeline")}</Text>
			<Text color="gray">
				t filter · j/k select · f search · c copy selected · e export selected ·
				E evidence · P save · ] preset · D cleanup · timeline.export scoped log
			</Text>
			<Box marginTop={1} flexDirection="column">
				{rows.map((row) => (
					<Text key={row} color={getTimelineRowColor(row)}>
						{row}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function formatTimelineSearchPromptRows(
	commandLine: CommandLineState,
	presets: string[] = [],
): string[] {
	if (!commandLine.active) {
		return [];
	}
	if (commandLine.prompt === "timeline-search") {
		return [
			"SEARCH",
			`:search ${commandLine.value || " "}  enter=apply esc=cancel`,
		];
	}
	if (commandLine.prompt === "timeline-search-cleanup") {
		const preview = createTimelineSearchCleanupPreview(presets);
		if (!preview) {
			return [];
		}
		return [
			...preview.rows,
			`:timeline-cleanup ${commandLine.value || " "}  type="${preview.confirmationPhrase}" enter=clear esc=cancel`,
		];
	}
	return [];
}

function getTimelineRowColor(row: string): string {
	if (
		row === "TIMELINE" ||
		row === "SEARCH" ||
		row === "TIMELINE SEARCH CLEANUP" ||
		row.startsWith("selected timeline ") ||
		row.startsWith("SUMMARY")
	) {
		return "cyan";
	}
	if (row.startsWith(":timeline-cleanup") || row.startsWith("confirm ")) {
		return "yellow";
	}
	if (row.includes(" audit ")) {
		return "yellow";
	}
	if (row.includes(" raw ")) {
		return "magenta";
	}
	return "white";
}

function formatClipboardPromptRows(commandLine: CommandLineState): string[] {
	return commandLine.active && commandLine.prompt === "clipboard"
		? [
				"CLIPBOARD CONFIRM",
				`:clipboard ${commandLine.value || " "}  enter=copy esc=cancel`,
			]
		: [];
}

function formatExternalOpenPromptRows(
	commandLine: CommandLineState,
	plan: ExternalOpenPlan,
): string[] {
	return commandLine.active && commandLine.prompt === "external-open"
		? [
				`EXTERNAL OPEN CONFIRM ${plan.label}`,
				`:external-open ${commandLine.value || " "}  type="${plan.confirmationPhrase}" enter=open esc=cancel`,
			]
		: [];
}

function formatFileOpenPromptRows(
	commandLine: CommandLineState,
	plan: FileOpenPlan,
	breadcrumbRows: string[] = [],
): string[] {
	return commandLine.active && commandLine.prompt === "file-open"
		? [
				...breadcrumbRows,
				`FILE OPEN CONFIRM ${plan.label}`,
				`:file-open ${commandLine.value || " "}  type="${plan.confirmationPhrase}" enter=open esc=cancel`,
			]
		: [];
}

function DnsWorkspace({
	commandLine,
	proposal,
	selectedTargetIndex,
	summary,
	t,
}: {
	commandLine: CommandLineState;
	proposal?: DnsServerProposal;
	selectedTargetIndex: number;
	summary?: NetworkSummary;
	t: (key: string) => string;
}): React.ReactElement {
	const workspace = formatDnsPanelWorkspaceRows({
		proposal,
		selectedIndex: selectedTargetIndex,
		summary,
	});
	const promptRows =
		workspace.available &&
		commandLine.active &&
		commandLine.prompt === "dns-servers"
			? [
					"DNS SERVER PROPOSAL INPUT",
					`:dns-servers ${commandLine.value || " "}  enter=preview esc=cancel`,
				]
			: [];

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.dns")}</Text>
			<Text color="gray">
				{workspace.available
					? "resolver visibility · T target · S proposal · C clear · mutation locked"
					: "resolver visibility · no DNS interface target · mutation locked"}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Servers: {summary?.dnsServers.join(", ") || "-"}</Text>
				<Text color="yellow">
					dns.flush locked: requires preview + admin + confirm
				</Text>
				{[...workspace.rows, ...promptRows].map((row) => (
					<Text key={row} color={getActionPreviewRowColor(row)}>
						{row}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function ActionWorkspace({
	actions,
	selectedIndex,
	focused,
	previewPlan,
	simulation,
	executionPlan,
	policy,
	commandLine,
	visibleRows,
	t,
}: {
	actions: PicosAction[];
	selectedIndex: number;
	focused: boolean;
	previewPlan?: ActionPreviewPlan;
	simulation?: ActionControlSimulation;
	executionPlan?: ControlExecutionPlan;
	policy: ControlExecutionPolicy;
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const previewRows = previewPlan ? formatActionPreviewRows(previewPlan) : [];
	const confirmationRows = formatActionConfirmationPromptRows(
		commandLine,
		previewPlan,
	);
	const simulationRows = simulation
		? formatActionSimulationRows(simulation)
		: [];
	const executionRows = executionPlan
		? formatControlExecutionRows(executionPlan)
		: [];
	const policyRows = formatControlExecutionPolicyRows(policy);
	const actionRows = Math.max(
		3,
		visibleRows -
			policyRows.length -
			previewRows.length -
			confirmationRows.length -
			simulationRows.length -
			executionRows.length -
			1,
	);
	const window = getVisibleWindow(actions.length, selectedIndex, actionRows);
	const visibleActions = actions.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = actions.length - window.end;

	return (
		<Box flexDirection="column">
			<Text bold>{t("actions.title")}</Text>
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "child focus · j/k select · enter preview/run · c confirm · x dry-run · esc/h back"
					: "enter opens action list · j/k stays in workspaces"}
			</Text>
			{hiddenAbove > 0 ? (
				<Text color="gray">↑ {hiddenAbove} more actions</Text>
			) : null}
			<Box flexDirection="column">
				{visibleActions.map((action, visibleIndex) => {
					const index = window.start + visibleIndex;
					const selected = focused && index === selectedIndex;

					return (
						<Text
							key={action.id}
							color={selected ? "cyan" : action.enabled ? "green" : "yellow"}
						>
							{selected ? ">" : " "} {action.enabled ? "[ready]" : "[locked]"}{" "}
							{action.id.padEnd(18)} {action.risk.padEnd(11)} {action.privilege}
						</Text>
					);
				})}
			</Box>
			{hiddenBelow > 0 ? (
				<Text color="gray">↓ {hiddenBelow} more actions</Text>
			) : null}
			<Box marginTop={1} flexDirection="column">
				{policyRows.map((row) => (
					<Text key={row} color={getActionPreviewRowColor(row)}>
						{row}
					</Text>
				))}
			</Box>
			{previewRows.length ? (
				<Box marginTop={1} flexDirection="column">
					{previewRows
						.slice(
							0,
							Math.max(
								1,
								visibleRows -
									actionRows -
									policyRows.length -
									confirmationRows.length -
									simulationRows.length -
									executionRows.length,
							),
						)
						.map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
				</Box>
			) : null}
			{confirmationRows.length ? (
				<Box marginTop={1} flexDirection="column">
					{confirmationRows.map((row) => (
						<Text key={row} color={getActionPreviewRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{simulationRows.length ? (
				<Box marginTop={1} flexDirection="column">
					{simulationRows.map((row) => (
						<Text key={row} color={getActionPreviewRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{executionRows.length ? (
				<Box marginTop={1} flexDirection="column">
					{executionRows.map((row) => (
						<Text key={row} color={getActionPreviewRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
			) : null}
		</Box>
	);
}

function formatActionConfirmationPromptRows(
	commandLine: CommandLineState,
	previewPlan?: ActionPreviewPlan,
): string[] {
	if (
		!previewPlan ||
		!commandLine.active ||
		commandLine.prompt !== "control-confirm"
	) {
		return [];
	}
	return [
		`CONTROL CONFIRM ${previewPlan.actionId}`,
		`:confirm ${commandLine.value || " "}  type="${previewPlan.confirmationPhrase ?? ""}" enter=audit esc=cancel`,
		"executionEnabled=false",
	];
}

function getActionPreviewRowColor(row: string): string {
	if (
		row.startsWith("CONTROL PREVIEW") ||
		row.startsWith("CONTROL CONFIRM") ||
		row.startsWith("CONTROL SIMULATION") ||
		row.startsWith("CONTROL EXECUTION POLICY") ||
		row.startsWith("CONTROL EXECUTION") ||
		row.startsWith("PORT CONTROL") ||
		row.startsWith("PICOS UPDATE APPLY PREVIEW")
	) {
		return "cyan";
	}
	if (
		row.startsWith("blocked=") ||
		row.startsWith("blockers=") ||
		row.startsWith("target=") ||
		row.startsWith(":confirm") ||
		row.includes("blocked-by-policy") ||
		row.includes("status=blocked") ||
		row.includes("destructive")
	) {
		return "yellow";
	}
	if (row.includes("admin")) {
		return "magenta";
	}
	return "white";
}

function createCommandPaletteControlPreview(
	action: PicosAction | undefined,
	updateCheckResult: PackageUpdateCheckResult | undefined,
): ActionPreviewPlan | undefined {
	if (!action || (action.enabled && !action.confirmationRequired)) {
		return undefined;
	}
	const platform = currentPlatform();
	if (action.id === "picos.update.apply") {
		const applyPreview = updateCheckResult
			? createUpdateApplyPreview(updateCheckResult)
			: undefined;
		return applyPreview
			? createUpdateApplyActionPreviewPlan(applyPreview, platform)
			: undefined;
	}
	return createActionPreviewPlan(
		action.id,
		platform,
		getControlPreviewCommand(action.id, platform),
	);
}

function CommandPaletteWorkspace({
	actions,
	selectedIndex,
	query,
	totalActions,
	visibleRows,
	previewRows = [],
}: {
	actions: PicosAction[];
	selectedIndex: number;
	query: string;
	totalActions: number;
	visibleRows: number;
	previewRows?: string[];
}): React.ReactElement {
	const window = getVisibleWindow(actions.length, selectedIndex, visibleRows);
	const visibleActions = actions.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = actions.length - window.end;
	const selectedAction = actions[selectedIndex];

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				Palette /{query.length > 0 ? query : "type"} · {actions.length}/
				{totalActions} · j/k enter esc/q
			</Text>
			{hiddenAbove > 0 ? (
				<Text color="gray">↑ {hiddenAbove} more commands</Text>
			) : null}
			<Box flexDirection="column">
				{visibleActions.map((action, visibleIndex) => {
					const index = window.start + visibleIndex;
					const selected = index === selectedIndex;
					const status = action.enabled ? "ready" : "locked";
					return (
						<Text key={action.id} color={selected ? "cyan" : "white"}>
							{selected ? ">" : " "} {status.padEnd(6)} {action.risk.padEnd(5)}{" "}
							{clip(action.id, 32)}
						</Text>
					);
				})}
			</Box>
			{hiddenBelow > 0 ? (
				<Text color="gray">↓ {hiddenBelow} more commands</Text>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">
					{clip(selectedAction?.title ?? "No command selected", 54)}
				</Text>
				<Text color="gray">
					{clip(selectedAction?.description ?? "Choose a command to run.", 54)}
				</Text>
				{previewRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("blocked=")
								? "yellow"
								: row.startsWith("confirm=")
									? "cyan"
									: "gray"
						}
					>
						{clip(row, 72)}
					</Text>
				))}
				<Text color="gray">read runs now · write/destructive stay locked</Text>
			</Box>
		</Box>
	);
}

function ConfigWorkspace({
	items,
	selectedIndex,
	resetPreview,
	commandLine,
	configPath,
	managedShelfRows,
	managedShelfHandoffRows,
	visibleRows,
}: {
	items: ConfigWorkspaceItem[];
	selectedIndex: number;
	resetPreview?: ConfigWorkspaceResetPreview;
	commandLine: CommandLineState;
	configPath: string;
	managedShelfRows: string[];
	managedShelfHandoffRows: string[];
	visibleRows: number;
}): React.ReactElement {
	const rows = formatConfigWorkspaceRows(items, selectedIndex, visibleRows);
	const detailRows = formatConfigWorkspaceDetailRows(items, selectedIndex, {
		configPath,
	}).slice(0, Math.max(0, visibleRows - rows.length - 1));
	const shelfRows = managedShelfRows.slice(
		0,
		Math.max(0, visibleRows - rows.length - detailRows.length - 2),
	);
	const handoffRows = managedShelfHandoffRows.slice(
		0,
		Math.max(
			0,
			visibleRows - rows.length - detailRows.length - shelfRows.length - 3,
		),
	);
	return (
		<Box flexDirection="column">
			{rows.map((row) => (
				<Text
					key={row}
					color={
						row.startsWith("CONFIG")
							? "cyan"
							: row.startsWith(">")
								? "cyan"
								: row.startsWith("selected=")
									? "yellow"
									: row.startsWith("j/k")
										? "gray"
										: "white"
					}
				>
					{row}
				</Text>
			))}
			{detailRows.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					{detailRows.map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("CONFIG SECTION")
									? "cyan"
									: row.startsWith("posture=")
										? "yellow"
										: row.startsWith("persist=") || row.startsWith("actions=")
											? "gray"
											: "white"
							}
						>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{shelfRows.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					{shelfRows.map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("CONFIG MANAGED")
									? "cyan"
									: row.startsWith("managed-by=")
										? "gray"
										: "white"
							}
						>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{handoffRows.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					{handoffRows.map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("CONFIG SHELF")
									? "cyan"
									: row.startsWith("enter")
										? "gray"
										: "yellow"
							}
						>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{resetPreview ? (
				<Box marginTop={1} flexDirection="column">
					{resetPreview.rows
						.slice(0, Math.max(0, visibleRows - 2))
						.map((row) => (
							<Text
								key={row}
								color={
									row.startsWith("CONFIG RESET")
										? "cyan"
										: row.startsWith("confirm")
											? "yellow"
											: "white"
								}
							>
								{row}
							</Text>
						))}
					{commandLine.active && commandLine.prompt === "config-reset" ? (
						<Text color="yellow">
							:config-reset {commandLine.value || " "} type="
							{resetPreview.confirmationPhrase}" enter=reset esc=cancel
						</Text>
					) : null}
				</Box>
			) : null}
		</Box>
	);
}

function StatusWorkspace({
	updateCheckResult,
	githubReleaseCheckResult,
	selectedUpdateHandoffIndex,
	handoffIndex,
	selectedHandoffIndex,
	auditExportIndex,
	selectedAuditExportIndex,
	auditExportArchiveIndex,
	selectedAuditExportArchiveIndex,
	externalOpenPlan,
	fileOpenPlan,
	auditExportArchivePlan,
	auditArchiveRetentionPlan,
	cleanupExportArchivePlan,
	toolExportArchivePlan,
	toolArchiveRetentionPlan,
	cleanupShelfIndex,
	selectedCleanupShelfIndex,
	cleanupHandoffHistory,
	selectedCleanupHandoffHistoryIndex,
	cleanupExportIndex,
	selectedCleanupExportIndex,
	cleanupExportArchiveIndex,
	selectedCleanupExportArchiveIndex,
	toolExportIndex,
	selectedToolExportIndex,
	toolExportFilter,
	toolExportQuery,
	toolExportArchiveIndex,
	selectedToolExportArchiveIndex,
	toolExportArchiveFilter,
	toolExportArchiveQuery,
	selectedStatusActivitySource,
	statusActivityResults,
	selectedStatusActivityResultIndex,
	statusActivityResultHistoryFilter,
	statusActivityResultTimelineJumpFilter,
	selectedStatusActivityCopyPreviewRowIndex,
	statusActivityCopyPreviewExpanded,
	statusActivityCopyIntentHistory,
	selectedStatusActivityCopyIntentIndex,
	selectedStatusActivityResultAuditJumpIndex,
	selectedStatusActivityToolsEvidenceSearchMatchIndex,
	lastStatusActivityCopyIntentAuditExport,
	lastTimelineEvidenceTrailAuditExport,
	timelineEvidenceTrailAuditExports,
	selectedTimelineEvidenceTrailAuditExportIndex,
	timelineEvidenceTrailSourceFilter,
	processControlAuditExports,
	selectedProcessControlAuditExportIndex,
	remoteKnownHostsSelectionAuditExports,
	selectedRemoteKnownHostsSelectionAuditExportIndex,
	interfaceConfirmationAuditExports,
	interfaceConfirmationAuditArchiveExports,
	selectedInterfaceConfirmationAuditExportIndex,
	interfaceEvidenceStateFilter,
	interfaceEvidenceQuery,
	interfaceEvidenceSearchPresets,
	configManagedShelfRows,
	events,
	selectedStatusEvidenceKind,
	commandLine,
	t,
}: {
	updateCheckResult?: PackageUpdateCheckResult;
	githubReleaseCheckResult?: GitHubReleaseCheckResult;
	selectedUpdateHandoffIndex: number;
	handoffIndex: HandoffIndex;
	selectedHandoffIndex: number;
	auditExportIndex: ConsoleAuditExportIndex;
	selectedAuditExportIndex: number;
	auditExportArchiveIndex: ConsoleAuditExportIndex;
	selectedAuditExportArchiveIndex: number;
	externalOpenPlan?: ExternalOpenPlan;
	fileOpenPlan?: FileOpenPlan;
	auditExportArchivePlan?: ConsoleAuditExportArchivePlan;
	auditArchiveRetentionPlan?: ConsoleAuditArchiveRetentionPlan;
	cleanupExportArchivePlan?: CleanupHandoffHistoryExportArchivePlan;
	toolExportArchivePlan?: ToolHistoryExportArchivePlan;
	toolArchiveRetentionPlan?: ToolHistoryArchiveRetentionPlan;
	cleanupShelfIndex: CleanupShelfIndex;
	selectedCleanupShelfIndex: number;
	cleanupHandoffHistory: CleanupHandoffHistory[];
	selectedCleanupHandoffHistoryIndex: number;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportIndex: number;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportArchiveIndex: number;
	toolExportIndex: ToolHistoryExportIndex;
	selectedToolExportIndex: number;
	toolExportFilter: ToolHistoryEvidenceFilter;
	toolExportQuery: string;
	toolExportArchiveIndex: ToolHistoryExportIndex;
	selectedToolExportArchiveIndex: number;
	toolExportArchiveFilter: ToolHistoryEvidenceFilter;
	toolExportArchiveQuery: string;
	selectedStatusActivitySource: StatusActivitySource;
	statusActivityResults: StatusActivityResult[];
	selectedStatusActivityResultIndex: number;
	statusActivityResultHistoryFilter: StatusActivityResultHistoryFilter;
	statusActivityResultTimelineJumpFilter: StatusActivityResultTimelineJumpFilter;
	selectedStatusActivityCopyPreviewRowIndex: number;
	statusActivityCopyPreviewExpanded: boolean;
	statusActivityCopyIntentHistory: StatusActivityCopyIntentRecord[];
	selectedStatusActivityCopyIntentIndex: number;
	selectedStatusActivityResultAuditJumpIndex: number;
	selectedStatusActivityToolsEvidenceSearchMatchIndex: number;
	lastStatusActivityCopyIntentAuditExport?: ConsoleAuditExportPlan;
	lastTimelineEvidenceTrailAuditExport?: ConsoleAuditExportPlan;
	timelineEvidenceTrailAuditExports: ConsoleAuditExportPlan[];
	selectedTimelineEvidenceTrailAuditExportIndex: number;
	timelineEvidenceTrailSourceFilter: TimelineEvidenceTrailSourceFilter;
	processControlAuditExports: ConsoleAuditExportPlan[];
	selectedProcessControlAuditExportIndex: number;
	remoteKnownHostsSelectionAuditExports: ConsoleAuditExportPlan[];
	selectedRemoteKnownHostsSelectionAuditExportIndex: number;
	interfaceConfirmationAuditExports: ConsoleAuditExportPlan[];
	interfaceConfirmationAuditArchiveExports: ConsoleAuditExportPlan[];
	selectedInterfaceConfirmationAuditExportIndex: number;
	interfaceEvidenceStateFilter: InterfaceEvidenceStateFilter;
	interfaceEvidenceQuery: string;
	interfaceEvidenceSearchPresets: string[];
	configManagedShelfRows: string[];
	events: ConsoleEvent[];
	selectedStatusEvidenceKind: StatusEvidenceKind;
	commandLine: CommandLineState;
	t: (key: string) => string;
}): React.ReactElement {
	const updateApplyPreview = updateCheckResult
		? createUpdateApplyPreview(updateCheckResult)
		: undefined;
	const updateReleaseHandoff = updateCheckResult
		? createUpdateReleaseHandoff(updateCheckResult)
		: undefined;
	const statusDialogPreviewGroups: StatusDialogPreviewGroup[] = [
		...(externalOpenPlan
			? [
					{
						kind: "external-open",
						rows: formatExternalOpenPlanRows(externalOpenPlan),
						promptRows: formatExternalOpenPromptRows(
							commandLine,
							externalOpenPlan,
						),
					},
				]
			: []),
		...(fileOpenPlan
			? [
					{
						kind: "file-open",
						rows: formatFileOpenPlanRows(fileOpenPlan),
						promptRows: formatFileOpenPromptRows(
							commandLine,
							fileOpenPlan,
							formatFileOpenOriginRows(fileOpenPlan),
						),
					},
				]
			: []),
		...(auditExportArchivePlan
			? [
					{
						kind: "audit-archive",
						rows: formatConsoleAuditExportArchiveRows(auditExportArchivePlan),
						promptRows:
							commandLine.active &&
							commandLine.prompt === "audit-export-archive"
								? [
										`:audit-export-archive ${
											commandLine.value || " "
										} type="${auditExportArchivePlan.confirmationPhrase}" enter=archive esc=cancel`,
									]
								: [],
					},
				]
			: []),
		...(auditArchiveRetentionPlan
			? [
					{
						kind: "audit-retention",
						rows: formatConsoleAuditArchiveRetentionRows(
							auditArchiveRetentionPlan,
						),
						promptRows:
							commandLine.active &&
							commandLine.prompt === "audit-archive-retention"
								? [
										`:audit-archive-retention ${
											commandLine.value || " "
										} type="${auditArchiveRetentionPlan.confirmationPhrase}" enter=prune esc=cancel`,
									]
								: [],
					},
				]
			: []),
		...(cleanupExportArchivePlan
			? [
					{
						kind: "cleanup-archive",
						rows: formatCleanupHandoffHistoryExportArchiveRows(
							cleanupExportArchivePlan,
						),
						promptRows:
							commandLine.active &&
							commandLine.prompt === "cleanup-export-archive"
								? [
										`:cleanup-export-archive ${
											commandLine.value || " "
										} type="${cleanupExportArchivePlan.confirmationPhrase}" enter=archive esc=cancel`,
									]
								: [],
					},
				]
			: []),
		...(toolExportArchivePlan
			? [
					{
						kind: "tools-archive",
						rows: formatToolHistoryExportArchiveRows(toolExportArchivePlan),
						promptRows:
							commandLine.active && commandLine.prompt === "tool-export-archive"
								? [
										`:tool-export-archive ${
											commandLine.value || " "
										} type="${toolExportArchivePlan.confirmationPhrase}" enter=archive esc=cancel`,
									]
								: [],
					},
				]
			: []),
		...(toolArchiveRetentionPlan
			? [
					{
						kind: "tools-retention",
						rows: formatToolHistoryArchiveRetentionRows(
							toolArchiveRetentionPlan,
						),
						promptRows:
							commandLine.active &&
							commandLine.prompt === "tools-archive-retention"
								? [
										`:tools-archive-retention ${
											commandLine.value || " "
										} type="${toolArchiveRetentionPlan.confirmationPhrase}" enter=prune esc=cancel`,
									]
								: [],
					},
				]
			: []),
	];
	const latestStatusActivityResultAuditJumpIntent =
		getLatestStatusActivityResultAuditJumpIntent(
			statusActivityCopyIntentHistory,
		);
	const selectedStatusActivityResultAuditJumpIntent =
		getSelectedStatusActivityResultAuditJumpIntent(
			statusActivityCopyIntentHistory,
			selectedStatusActivityResultAuditJumpIndex,
		);
	const statusActivityResultAuditJumpIntentCount =
		getStatusActivityResultAuditJumpIntentCount(
			statusActivityCopyIntentHistory,
		);
	const selectedStatusActivityResultTimelineSearch =
		createStatusActivityResultTimelineSearch(
			statusActivityResults,
			selectedStatusActivityResultIndex,
		);
	const selectedStatusActivityResultTimelineJumpSelection =
		getStatusActivityResultTimelineJumpSelection(
			statusActivityResults,
			selectedStatusActivityResultIndex,
			statusActivityResultTimelineJumpFilter,
		);
	const statusActivityResultTimelineSearchRecovery =
		createStatusActivityResultTimelineSearchReplay(
			statusActivityResults,
			selectedStatusActivityResultIndex,
			latestStatusActivityResultAuditJumpIntent,
			selectedStatusActivityResultAuditJumpIntent,
		);
	const statusActivityToolsEvidenceSearchRecovery =
		createStatusActivityToolsEvidenceSearchRecovery(
			statusActivityResultTimelineSearchRecovery,
			{
				activeFilter: toolExportFilter,
				activeIndex: toolExportIndex,
				archiveFilter: toolExportArchiveFilter,
				archiveIndex: toolExportArchiveIndex,
			},
		);
	const statusActivityResultAuditJumpActionHint =
		selectedStatusActivityResultTimelineSearch
			? "fresh"
			: latestStatusActivityResultAuditJumpIntent
				? "replay"
				: undefined;
	const statusReleaseRows = formatStatusReleaseConsoleRows({
		update: updateCheckResult,
		github: githubReleaseCheckResult,
		applyPreview: updateApplyPreview,
		handoff: updateReleaseHandoff,
		selectedLinkIndex: selectedUpdateHandoffIndex,
	});
	const statusDialogRows =
		statusDialogPreviewGroups.length > 0
			? formatStatusDialogPreviewRows(statusDialogPreviewGroups)
			: [];
	const statusCleanupRows = formatCleanupOpsConsoleRows(
		cleanupShelfIndex,
		selectedCleanupShelfIndex,
		cleanupHandoffHistory,
		selectedCleanupHandoffHistoryIndex,
	);
	const statusEvidenceSummaryRows = formatStatusEvidenceSummaryRows(
		{
			handoffIndex,
			auditExportIndex,
			auditExportArchiveIndex,
			cleanupExportIndex,
			cleanupExportArchiveIndex,
			toolExportIndex,
			toolExportArchiveIndex,
			processControlAuditExports,
			remoteKnownHostsSelectionAuditExports,
			interfaceConfirmationAuditExports,
			interfaceConfirmationAuditArchiveExports,
		},
		{
			selectedHandoffIndex,
			selectedAuditExportIndex,
			selectedAuditExportArchiveIndex,
			selectedCleanupExportIndex,
			selectedCleanupExportArchiveIndex,
			selectedToolExportIndex,
			selectedToolExportArchiveIndex,
			selectedProcessControlAuditExportIndex,
			selectedRemoteKnownHostsSelectionAuditExportIndex,
			selectedInterfaceConfirmationAuditExportIndex,
			toolExportFilter,
			toolExportArchiveFilter,
			toolExportQuery,
			toolExportArchiveQuery,
			interfaceEvidenceStateFilter,
			interfaceEvidenceQuery,
		},
		selectedStatusEvidenceKind,
	);
	const statusActivityReleaseRows =
		updateCheckResult || githubReleaseCheckResult ? statusReleaseRows : [];
	const statusActivityCleanupRows =
		cleanupShelfIndex.activeShelves > 0 || cleanupHandoffHistory.length > 0
			? statusCleanupRows
			: [];
	const statusActivityEvidenceRows =
		handoffIndex.items.length > 0 ||
		auditExportIndex.items.length > 0 ||
		auditExportArchiveIndex.items.length > 0 ||
		cleanupExportIndex.items.length > 0 ||
		cleanupExportArchiveIndex.items.length > 0 ||
		toolExportIndex.items.length > 0 ||
		toolExportArchiveIndex.items.length > 0 ||
		processControlAuditExports.length > 0 ||
		remoteKnownHostsSelectionAuditExports.length > 0 ||
		interfaceConfirmationAuditExports.length > 0 ||
		interfaceConfirmationAuditArchiveExports.length > 0
			? statusEvidenceSummaryRows
			: [];
	const statusActivityCopyPreview =
		getSelectedStatusActivityResultHistoryClipboardPreview(
			statusActivityResults,
			selectedStatusActivityResultIndex,
		);
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.status")}</Text>
			<Text>
				{t("status.version")}: {VERSION}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					STATUS ACTIVITY · ,/. source · f result filter=
					{statusActivityResultHistoryFilter} · ^ jump class=
					{statusActivityResultTimelineJumpFilter} · u/i history · ; preview · =
					expand · y copy · &lt;/&gt; intents · v replay · e export · z open · L
					trail · N trail search · S trail select · H handoff · g Timeline
				</Text>
				{formatStatusActivityQueueRows({
					releaseRows: statusActivityReleaseRows,
					dialogRows: statusDialogRows,
					cleanupRows: statusActivityCleanupRows,
					configRows: configManagedShelfRows,
					evidenceRows: statusActivityEvidenceRows,
				}).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("STATUS ACTIVITY QUEUE")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("controls=")
										? "yellow"
										: row.startsWith("no ")
											? "gray"
											: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityDetailRows(
					{
						releaseRows: statusActivityReleaseRows,
						dialogRows: statusDialogRows,
						cleanupRows: statusActivityCleanupRows,
						configRows: configManagedShelfRows,
						evidenceRows: statusActivityEvidenceRows,
					},
					selectedStatusActivitySource,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("STATUS ACTIVITY DETAIL")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("controls=")
										? "yellow"
										: row.startsWith("no ")
											? "gray"
											: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityResultRows(
					statusActivityResults[0],
					latestStatusActivityResultAuditJumpIntent,
					statusActivityResultAuditJumpIntentCount,
				).map((row) => (
					<Text
						key={`latest-${row}`}
						color={
							row.startsWith("STATUS ACTIVITY RESULT")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: row.includes("audit jump intent=")
											? "gray"
											: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityResultHistoryRows(
					statusActivityResults,
					selectedStatusActivityResultIndex,
					latestStatusActivityResultAuditJumpIntent,
					statusActivityResultAuditJumpIntentCount,
					statusActivityResultHistoryFilter,
				).map((row) => (
					<Text
						key={`history-${row}`}
						color={
							row.startsWith("STATUS ACTIVITY RESULT HISTORY")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: row.startsWith("controls=")
											? "yellow"
											: row.startsWith("    ")
												? "gray"
												: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityResultTimelineJumpRows(
					statusActivityResults,
					selectedStatusActivityResultIndex,
					3,
					statusActivityResultTimelineJumpFilter,
				).map((row) => (
					<Text
						key={`timeline-jump-${row}`}
						color={
							row.startsWith("STATUS RESULT TIMELINE JUMPS")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: row.startsWith("palette=?")
											? "gray"
											: row.startsWith("controls=")
												? "yellow"
												: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityResultCopyPreviewRows(statusActivityCopyPreview, {
					selectedRowIndex: selectedStatusActivityCopyPreviewRowIndex,
					expanded: statusActivityCopyPreviewExpanded,
				}).map((row) => (
					<Text
						key={`activity-copy-${row}`}
						color={
							row.startsWith("STATUS ACTIVITY COPY PREVIEW")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: row.startsWith("controls=")
											? "yellow"
											: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusActivityCopyIntentRows(
					statusActivityCopyIntentHistory,
					selectedStatusActivityCopyIntentIndex,
					lastStatusActivityCopyIntentAuditExport,
					getStatusActivityCopyIntentAuditExportIndex(
						auditExportIndex,
						lastStatusActivityCopyIntentAuditExport,
					),
					lastTimelineEvidenceTrailAuditExport,
					timelineEvidenceTrailAuditExports,
					selectedTimelineEvidenceTrailAuditExportIndex,
					timelineEvidenceTrailSourceFilter,
					latestStatusActivityResultAuditJumpIntent,
					statusActivityResultAuditJumpIntentCount,
					statusActivityResultAuditJumpActionHint,
					selectedStatusActivityResultAuditJumpIndex,
					createStatusActivityResultAuditJumpReplayWarningSummary(events),
					selectedStatusActivityResultTimelineSearch,
					selectedStatusActivityResultTimelineJumpSelection?.selectedIndex,
					selectedStatusActivityResultTimelineJumpSelection?.total,
					statusActivityToolsEvidenceSearchRecovery,
					selectedStatusActivityToolsEvidenceSearchMatchIndex,
					processControlAuditExports,
					selectedProcessControlAuditExportIndex,
					remoteKnownHostsSelectionAuditExports,
					selectedRemoteKnownHostsSelectionAuditExportIndex,
					statusActivityResults,
					selectedStatusActivityResultIndex,
				).map((row) => (
					<Text
						key={`activity-copy-intent-${row}`}
						color={
							row.startsWith("STATUS ACTIVITY COPY INTENTS")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: row.startsWith("controls=")
											? "yellow"
											: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">STATUS RELEASE · n link · c copy · o open</Text>
				{statusReleaseRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("STATUS RELEASE CONSOLE")
								? row.includes("update-available")
									? "yellow"
									: "cyan"
								: row.startsWith("> link")
									? "yellow"
									: row.startsWith("apply=locked") ||
											row.startsWith("controls=")
										? "yellow"
										: row.startsWith("run=") ||
												row.startsWith("apply=unavailable")
											? "gray"
											: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			{statusDialogPreviewGroups.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">STATUS DIALOG · compact confirmations</Text>
					{statusDialogRows.map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("STATUS DIALOG PREVIEW")
									? "cyan"
									: row.startsWith(">")
										? "yellow"
										: row.startsWith("controls=") ||
												row.trimStart().startsWith("confirm") ||
												row.trimStart().startsWith(":") ||
												row.trimStart().startsWith("reason=")
											? "yellow"
											: row.includes("CONFIG ORIGIN") ||
													row.trimStart().startsWith("path=") ||
													row.trimStart().startsWith("url=") ||
													row.trimStart().startsWith("from=") ||
													row.trimStart().startsWith("to=")
												? "gray"
												: "white"
							}
						>
							{row}
						</Text>
					))}
				</Box>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">CLEANUP OPS · compact shelf/history console</Text>
				{statusCleanupRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("CLEANUP OPS")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("history=") || row.startsWith("reopen=")
										? "gray"
										: row.startsWith("controls=")
											? "yellow"
											: row.startsWith("no ")
												? "gray"
												: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					STATUS EVIDENCE · tab/1..9 family · [/] item · q state/tools filter ·
					f interface find · G Timeline search · enter/a/m action
				</Text>
				{formatInterfaceEvidenceFilterRows(
					interfaceConfirmationAuditExports,
					interfaceConfirmationAuditArchiveExports,
					interfaceEvidenceStateFilter,
					interfaceEvidenceQuery,
					interfaceEvidenceSearchPresets,
				).map((row) => (
					<Text key={row} color={row.startsWith("INTERFACE") ? "cyan" : "gray"}>
						{row}
					</Text>
				))}
				{statusEvidenceSummaryRows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("STATUS EVIDENCE SUMMARY")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusEvidenceCommandStripRows(
					{
						handoffIndex,
						auditExportIndex,
						auditExportArchiveIndex,
						cleanupExportIndex,
						cleanupExportArchiveIndex,
						toolExportIndex,
						toolExportArchiveIndex,
						processControlAuditExports,
						remoteKnownHostsSelectionAuditExports,
						interfaceConfirmationAuditExports,
						interfaceConfirmationAuditArchiveExports,
					},
					{
						selectedHandoffIndex,
						selectedAuditExportIndex,
						selectedAuditExportArchiveIndex,
						selectedCleanupExportIndex,
						selectedCleanupExportArchiveIndex,
						selectedToolExportIndex,
						selectedToolExportArchiveIndex,
						selectedProcessControlAuditExportIndex,
						selectedRemoteKnownHostsSelectionAuditExportIndex,
						selectedInterfaceConfirmationAuditExportIndex,
						toolExportFilter,
						toolExportArchiveFilter,
						toolExportQuery,
						toolExportArchiveQuery,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
					},
					selectedStatusEvidenceKind,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("COMMAND STRIP")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: "gray"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusEvidenceTableRows(
					{
						handoffIndex,
						auditExportIndex,
						auditExportArchiveIndex,
						cleanupExportIndex,
						cleanupExportArchiveIndex,
						toolExportIndex,
						toolExportArchiveIndex,
						processControlAuditExports,
						remoteKnownHostsSelectionAuditExports,
						interfaceConfirmationAuditExports,
						interfaceConfirmationAuditArchiveExports,
					},
					{
						selectedHandoffIndex,
						selectedAuditExportIndex,
						selectedAuditExportArchiveIndex,
						selectedCleanupExportIndex,
						selectedCleanupExportArchiveIndex,
						selectedToolExportIndex,
						selectedToolExportArchiveIndex,
						selectedProcessControlAuditExportIndex,
						selectedRemoteKnownHostsSelectionAuditExportIndex,
						selectedInterfaceConfirmationAuditExportIndex,
						toolExportFilter,
						toolExportArchiveFilter,
						toolExportQuery,
						toolExportArchiveQuery,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
					},
					selectedStatusEvidenceKind,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("STATUS EVIDENCE TABLE")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("no ")
										? "gray"
										: "white"
						}
					>
						{row}
					</Text>
				))}
				{formatStatusEvidenceTableDetailRows(
					{
						handoffIndex,
						auditExportIndex,
						auditExportArchiveIndex,
						cleanupExportIndex,
						cleanupExportArchiveIndex,
						toolExportIndex,
						toolExportArchiveIndex,
						processControlAuditExports,
						remoteKnownHostsSelectionAuditExports,
						interfaceConfirmationAuditExports,
						interfaceConfirmationAuditArchiveExports,
					},
					{
						selectedHandoffIndex,
						selectedAuditExportIndex,
						selectedAuditExportArchiveIndex,
						selectedCleanupExportIndex,
						selectedCleanupExportArchiveIndex,
						selectedToolExportIndex,
						selectedToolExportArchiveIndex,
						selectedProcessControlAuditExportIndex,
						selectedRemoteKnownHostsSelectionAuditExportIndex,
						selectedInterfaceConfirmationAuditExportIndex,
						toolExportFilter,
						toolExportArchiveFilter,
						toolExportQuery,
						toolExportArchiveQuery,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
					},
					selectedStatusEvidenceKind,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("TABLE DETAIL")
								? "cyan"
								: row.startsWith("path=") || row.startsWith("no ")
									? "gray"
									: row.startsWith("controls=")
										? "yellow"
										: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					LEGACY EVIDENCE · explicit shortcuts kept · compact bridge
				</Text>
				{formatStatusEvidenceLegacyBridgeRows(
					{
						handoffIndex,
						auditExportIndex,
						auditExportArchiveIndex,
						cleanupExportIndex,
						cleanupExportArchiveIndex,
						toolExportIndex,
						toolExportArchiveIndex,
						processControlAuditExports,
						remoteKnownHostsSelectionAuditExports,
						interfaceConfirmationAuditExports,
						interfaceConfirmationAuditArchiveExports,
					},
					{
						selectedHandoffIndex,
						selectedAuditExportIndex,
						selectedAuditExportArchiveIndex,
						selectedCleanupExportIndex,
						selectedCleanupExportArchiveIndex,
						selectedToolExportIndex,
						selectedToolExportArchiveIndex,
						selectedProcessControlAuditExportIndex,
						selectedRemoteKnownHostsSelectionAuditExportIndex,
						selectedInterfaceConfirmationAuditExportIndex,
						toolExportFilter,
						toolExportArchiveFilter,
						toolExportQuery,
						toolExportArchiveQuery,
						interfaceEvidenceStateFilter,
						interfaceEvidenceQuery,
					},
					selectedStatusEvidenceKind,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("LEGACY EVIDENCE BRIDGE")
								? "cyan"
								: row.startsWith(">")
									? "yellow"
									: row.startsWith("shortcuts")
										? "gray"
										: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			<Text color="gray">{t("status.roadmap")}</Text>
			<Box marginTop={1} flexDirection="column">
				{getRoadmapItems().map((item) => (
					<Text key={item.label}>
						{item.status.padEnd(7)} {item.label}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function LogWorkspace({
	logs,
	checks,
	query,
	presets,
	level,
	profiles,
	follow,
	followRefreshCount,
	followLastStatus,
	followHistory,
	commandLine,
	visibleRows,
	configShelfFocusTarget,
}: {
	logs?: OsLogSnapshot;
	checks: DoctorCheck[];
	query: string;
	presets: string[];
	level: OsLogLevelFilter;
	profiles: LogProfile[];
	follow: boolean;
	followRefreshCount: number;
	followLastStatus: "idle" | "ok" | "warn" | "fail";
	followHistory: LogFollowHistoryItem[];
	commandLine: CommandLineState;
	visibleRows: number;
	configShelfFocusTarget?: ConfigManagedShelfTarget;
}): React.ReactElement {
	const cleanupPreview =
		commandLine.active && commandLine.prompt === "logs-cleanup"
			? createLogCleanupPreview(presets, profiles)
			: undefined;
	const promptRows =
		commandLine.active && commandLine.prompt === "log-search"
			? [
					...(configShelfFocusTarget === "logs"
						? formatConfigManagedShelfPromptBreadcrumbRows("logs")
						: []),
					"SEARCH",
					`:logs ${commandLine.value || " "}  enter=apply esc=cancel`,
				]
			: commandLine.active &&
					commandLine.prompt === "logs-cleanup" &&
					cleanupPreview
				? [
						...(configShelfFocusTarget === "logs"
							? formatConfigManagedShelfCleanupBreadcrumbRows("logs")
							: []),
						...cleanupPreview.rows,
						`:logs-cleanup ${commandLine.value || " "}  type="${cleanupPreview.confirmationPhrase}" enter=clear esc=cancel`,
					]
				: [];
	const doctorRows = checks.length
		? [
				"doctor buffer",
				...checks
					.slice(0, Math.max(1, Math.min(4, visibleRows - 5)))
					.map(
						(check) =>
							`${check.status.toUpperCase().padEnd(5)} ${check.label}${
								check.detail ? ` · ${check.detail}` : ""
							}`,
					),
			]
		: [];
	const baseRows = [
		...formatLogWorkspaceRows(
			logs,
			Math.max(1, visibleRows - promptRows.length - doctorRows.length),
			{
				level,
				query,
				presets,
				profiles,
				follow,
				followRefreshCount,
				followLastStatus,
				followHistory,
				shelfFocus: configShelfFocusTarget === "logs",
			},
		),
		...promptRows,
		...doctorRows,
	];
	const rows = withConfigManagedShelfFocusRows(
		baseRows,
		configShelfFocusTarget,
		visibleRows,
	);
	return (
		<Box flexDirection="column">
			<Text bold>OS Logs</Text>
			{rows.map((row) => (
				<Text key={row} color={getOsLogRowColor(row)}>
					{clip(row, 110)}
				</Text>
			))}
		</Box>
	);
}

function getOsLogRowColor(row: string): string {
	if (
		row.startsWith("CONFIG SHELF") ||
		row.startsWith("CONFIG ORIGIN") ||
		row.startsWith("SHELF CONTROL") ||
		row.startsWith("LOGS") ||
		row === "SEARCH"
	) {
		return "cyan";
	}
	if (
		row.startsWith(":logs-cleanup") ||
		row.startsWith("confirm ") ||
		row.startsWith("target=") ||
		row.startsWith("scope=") ||
		row.startsWith("focus=") ||
		row.startsWith("enter=")
	) {
		return "yellow";
	}
	if (row.startsWith("PICOS") || row.startsWith("source=")) {
		return "cyan";
	}
	if (row.startsWith(">")) {
		return "green";
	}
	if (row.includes(" fail ")) {
		return "red";
	}
	if (row.includes(" warn ") || row.startsWith("error=")) {
		return "yellow";
	}
	if (row.startsWith("command=") || row.startsWith("note=")) {
		return "gray";
	}
	if (row.startsWith("shortcuts:") || row === "doctor buffer") {
		return "gray";
	}
	return "white";
}

function OperationsWorkspace({
	presets,
	selectedIndex,
	run,
	visibleRows,
	t,
}: {
	presets: PicosConfig["operationPresets"];
	selectedIndex: number;
	run?: OperationRunProgress;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const rows = formatOperationsWorkspaceRows(presets, {
		selectedIndex,
		visibleRows,
		run,
	});
	const rowCounts = new Map<string, number>();
	const keyedRows = rows.map((row) => {
		const count = rowCounts.get(row) ?? 0;
		rowCounts.set(row, count + 1);
		return { key: `${row}:${count}`, row };
	});
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.operations")}</Text>
			<Text color="gray">
				saved monitor/logs/process presets · j/k select · enter run · X cancel a
				monitor run · create and remove with picos operations
			</Text>
			<Box marginTop={1} flexDirection="column">
				{keyedRows.map(({ key, row }) => (
					<Text key={key} color={getOperationRunRowColor(row)}>
						{clip(row, 110)}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function getOperationRunRowColor(row: string): string {
	if (row.startsWith("OPERATIONS ")) {
		return "cyan";
	}
	if (row.startsWith(">")) {
		return "green";
	}
	if (row.startsWith("status=cancelled") || row.startsWith("status=failed")) {
		return "red";
	}
	if (
		row.startsWith("status=cancelling") ||
		row.startsWith("hidden ") ||
		row.startsWith("no saved")
	) {
		return "yellow";
	}
	if (row.startsWith("status=completed")) {
		return "green";
	}
	return "gray";
}

function Inspector({
	width,
	screen,
	summary,
	selectedAction,
	actionPreviewPlan,
	actionSimulation,
	actionExecutionPlan,
	controlExecutionPolicy,
	portProcessControlRows,
	events,
	t,
}: {
	width: number;
	screen: Screen;
	summary?: NetworkSummary;
	selectedAction: PicosAction;
	actionPreviewPlan?: ActionPreviewPlan;
	actionSimulation?: ActionControlSimulation;
	actionExecutionPlan?: ControlExecutionPlan;
	controlExecutionPolicy: ControlExecutionPolicy;
	portProcessControlRows: string[];
	events: ConsoleEvent[];
	t: (key: string) => string;
}): React.ReactElement {
	const previewRows = actionPreviewPlan
		? formatActionPreviewRows(actionPreviewPlan).slice(0, 5)
		: [];
	const simulationRows = actionSimulation
		? formatActionSimulationRows(actionSimulation).slice(0, 4)
		: [];
	const executionRows = actionExecutionPlan
		? formatControlExecutionRows(actionExecutionPlan).slice(0, 4)
		: [];
	const policyRows = formatControlExecutionPolicyRows(
		controlExecutionPolicy,
	).slice(0, 4);
	return (
		<Box width={width} borderStyle="single" borderColor="gray" paddingX={1}>
			<Box flexDirection="column">
				<Text bold color="cyan">
					{t("inspector.title")}
				</Text>
				<Text color="gray">
					{t("inspector.workspace")}: {translateScreenLabel(screen, t)}
				</Text>
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">SELECTED ACTION</Text>
					<Text>{selectedAction.title}</Text>
					<Text color={selectedAction.enabled ? "green" : "yellow"}>
						{selectedAction.enabled ? "ready" : "locked"} ·{" "}
						{selectedAction.risk}
					</Text>
					<Text color="gray">{selectedAction.description}</Text>
				</Box>
				{previewRows.length ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="gray">CONTROL PREVIEW</Text>
						{previewRows.slice(1).map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
					</Box>
				) : null}
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">CONTROL POLICY</Text>
					{policyRows.slice(1).map((row) => (
						<Text key={row} color={getActionPreviewRowColor(row)}>
							{row}
						</Text>
					))}
				</Box>
				{simulationRows.length ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="gray">CONTROL SIMULATION</Text>
						{simulationRows.slice(1).map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
					</Box>
				) : null}
				{executionRows.length ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="gray">CONTROL EXECUTION</Text>
						{executionRows.slice(1).map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
					</Box>
				) : null}
				{portProcessControlRows.length ? (
					<Box marginTop={1} flexDirection="column">
						<Text color="gray">PORT POLICY</Text>
						{portProcessControlRows.map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
					</Box>
				) : null}
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">NETWORK</Text>
					<Text>IPv4: {summary?.primaryInterface?.ipv4 ?? "-"}</Text>
					<Text>DNS: {summary?.dnsServers.join(", ") || "-"}</Text>
				</Box>
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">LAST EVENT</Text>
					<Text>{events.at(-1)?.message ?? "-"}</Text>
				</Box>
			</Box>
		</Box>
	);
}

function EventDock({
	height,
	events,
	t,
}: {
	height: number;
	events: ConsoleEvent[];
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box height={height} borderStyle="single" borderColor="green" paddingX={1}>
			<Box flexDirection="column">
				<Text bold color="green">
					{t("events.title")}
				</Text>
				{events.slice(-(height - 3)).map((event) => (
					<Text key={event.id} color={eventColor(event.level)}>
						[{event.time}] {event.level.padEnd(4)} {event.message}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function translateScreenLabel(
	screen: Screen,
	t: (key: string) => string,
): string {
	return t(`screen.${screen}`);
}

function eventColor(level: ConsoleEvent["level"]): string {
	if (level === "ok") {
		return "green";
	}
	if (level === "warn") {
		return "yellow";
	}
	if (level === "fail") {
		return "red";
	}
	if (level === "run") {
		return "cyan";
	}
	return "gray";
}

function clip(value: string, length: number): string {
	if (value.length <= length) {
		return value;
	}
	return `${value.slice(0, Math.max(0, length - 1))}…`;
}

function formatBytes(value?: number): string {
	if (value === undefined) {
		return "-";
	}
	const units = ["B", "KiB", "MiB", "GiB", "TiB"];
	let size = value;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatFileSize(entry: FileEntry): string {
	if (entry.type === "directory") {
		return "<DIR>";
	}
	return formatBytes(entry.size);
}

function formatSidebarLine(
	active: boolean,
	index: number,
	label: string,
	width: number,
): string {
	const marker = active ? ">" : " ";
	return `${marker} ${index} ${label}`.slice(0, width).padEnd(width);
}
