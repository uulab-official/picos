import { dirname, resolve } from "node:path";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getConfigPath,
	readConfig,
	setConfigEndpointFilterPresets,
	setConfigEndpointSort,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
	setConfigRouteFilterPresets,
	setConfigToolHistoryPreferences,
	setConfigToolTargetPresets,
} from "../config/store";
import {
	type ActionControlSimulation,
	type ActionPreviewConfirmation,
	type ActionPreviewPlan,
	createActionControlSimulation,
	createActionPreviewPlan,
	formatActionConfirmationAuditMessage,
	formatActionPreviewAuditMessage,
	formatActionPreviewRows,
	formatActionSimulationAuditMessage,
	formatActionSimulationRows,
	getActionCatalog,
	getActionSummary,
	type PicosAction,
	submitActionPreviewConfirmation,
} from "../core/actions";
import {
	archiveConsoleAuditExport,
	type ConsoleAuditArchiveRetentionPlan,
	type ConsoleAuditExportArchivePlan,
	type ConsoleAuditExportIndex,
	createConsoleAuditArchiveRetentionPlan,
	createConsoleAuditExportArchivePlan,
	createConsoleAuditExportPlan,
	formatConsoleAuditArchiveRetentionRows,
	formatConsoleAuditExportArchiveIndexRows,
	formatConsoleAuditExportArchiveRows,
	formatConsoleAuditExportIndexRows,
	getSelectedConsoleAuditExport,
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
	nextConnectionSort,
	parseConnectionSort,
	sortConnections,
} from "../core/connections";
import {
	type ControlExecutionPlan,
	type ControlExecutionPolicy,
	createControlExecutionPlan,
	defaultControlExecutionPolicy,
	formatControlExecutionAuditMessage,
	formatControlExecutionPolicyRows,
	formatControlExecutionResultAuditMessage,
	formatControlExecutionRows,
	getControlExecutionPolicyFromConfig,
	runControlExecutionPlan,
} from "../core/controlExecution";
import { getControlPreviewCommand } from "../core/controlPreview";
import { runDoctorChecks } from "../core/doctor";
import {
	buildExternalOpenPlan,
	type ExternalOpenPlan,
	formatExternalOpenPlanRows,
	runExternalOpenPlan,
} from "../core/externalOpen";
import {
	buildFileOpenPlan,
	type FileOpenPlan,
	formatFileOpenPlanRows,
	runFileOpenPlan,
} from "../core/fileOpen";
import {
	createLocalFileProvider,
	type FileEntry,
	type FileLocation,
	getSystemFileLocations,
	getSystemFileRoot,
	withParentDirectoryEntry,
} from "../core/files";
import {
	archiveHandoffFile,
	formatHandoffIndexRows,
	getSelectedHandoffIndexItem,
	type HandoffIndex,
	readHandoffIndex,
} from "../core/handoffIndex";
import { getNetworkSummary } from "../core/network";
import {
	createOsLogSnapshot,
	filterOsLogEntries,
	nextOsLogLevelFilter,
	type OsLogLevelFilter,
	type OsLogSnapshot,
} from "../core/osLogs";
import {
	filterListeningPorts,
	getListeningPorts,
	nextPortSort,
	type PortSort,
	type PortsResult,
	parsePortSort,
	sortListeningPorts,
} from "../core/ports";
import {
	getProcessDetail,
	getProcessFileSnapshot,
	type ProcessDetail,
	type ProcessFileSnapshot,
} from "../core/processes";
import {
	createRemoteFileContext,
	type RemoteFileContext,
} from "../core/remotes";
import { getRoadmapItems } from "../core/roadmap";
import {
	filterRouteEntries,
	nextRouteSort,
	type RoutePathResult,
	type RouteSort,
	type RouteTableResult,
	runRoutePath,
	runRouteTable,
} from "../core/routes";
import { formatUptime } from "../core/system";
import { createSystemInventory } from "../core/systemInventory";
import {
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
	SftpRemoteProfile,
	SystemInventory,
} from "../core/types";
import {
	checkForGitHubReleaseUpdate,
	checkForPackageUpdate,
	createUpdateApplyActionPreviewPlan,
	createUpdateApplyPreview,
	createUpdateReleaseHandoff,
	formatGitHubReleaseCheckRows,
	formatUpdateApplyPreviewRows,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	type GitHubReleaseCheckResult,
	getSelectedUpdateReleaseHandoffLink,
	getUpdateReleaseHandoffLinks,
	type PackageUpdateCheckResult,
} from "../core/updateCheck";
import { VERSION } from "../core/version";
import { createTranslator } from "../i18n/catalog";
import { currentPlatform } from "../utils/platform";
import {
	appendCleanupHandoffHistory,
	archiveCleanupHandoffHistoryExport,
	type CleanupHandoffHistory,
	type CleanupHandoffHistoryExportArchivePlan,
	type CleanupHandoffHistoryExportIndex,
	type CleanupJumpAudit,
	type CleanupShelfIndex,
	createCleanupHandoffActionPlan,
	createCleanupHandoffDismissPlan,
	createCleanupHandoffHistory,
	createCleanupHandoffHistoryExportArchivePlan,
	createCleanupHandoffHistoryExportPlan,
	createCleanupHandoffReopenPlan,
	createCleanupJumpAudit,
	createCleanupJumpAuditFromHistory,
	createCleanupShelfIndex,
	formatCleanupHandoffActionRows,
	formatCleanupHandoffDismissRows,
	formatCleanupHandoffHistoryExportArchiveIndexRows,
	formatCleanupHandoffHistoryExportArchiveRows,
	formatCleanupHandoffHistoryExportIndexRows,
	formatCleanupHandoffHistoryIndexRows,
	formatCleanupHandoffHistoryRows,
	formatCleanupHandoffReopenRows,
	formatCleanupJumpAuditRows,
	formatCleanupShelfDetailRows,
	formatCleanupShelfIndexRows,
	getSelectedCleanupHandoffHistory,
	getSelectedCleanupHandoffHistoryExport,
	getSelectedCleanupShelf,
	moveCleanupHandoffHistorySelection,
	moveCleanupShelfSelection,
	readCleanupHandoffHistoryExportArchiveIndex,
	readCleanupHandoffHistoryExportIndex,
	readLatestCleanupHandoffHistoryExport,
	writeCleanupHandoffHistoryExport,
} from "./cleanupIndex";
import {
	appendClipboardConfirmationInput,
	backspaceClipboardConfirmationInput,
	type ClipboardConfirmationState,
	clearClipboardConfirmationState,
	createClipboardConfirmationState,
	submitClipboardConfirmation,
} from "./clipboardDialog";
import {
	createClipboardPreview,
	formatClipboardPreviewRows,
} from "./clipboardPreview";
import {
	applyCommandLineInput,
	type CommandLineState,
	closeCommandLine,
	openCommandLine,
} from "./commandLine";
import {
	createEndpointFilterCleanupPreview,
	createEndpointHandoffPlan,
	createPortProcessControlExecutionPlan,
	createSelectedPortProcessControlPreview,
	type EndpointDetailView,
	type EndpointHandoffKind,
	formatConnectionsWorkspaceRows,
	formatPortProcessControlConfirmationAuditMessage,
	formatPortProcessControlExecutionRows,
	formatPortProcessControlInspectorRows,
	formatPortsWorkspaceRows,
	getSelectedConnectionClipboardPreview,
	getSelectedConnectionProcessRequest,
	getSelectedPortClipboardPreview,
	getSelectedPortProcessRequest,
	nextEndpointDetailView,
	nextEndpointFilterPreset,
	type PortProcessControlFileEvidenceIssue,
	saveEndpointFilterPreset,
	submitEndpointFilterCleanupConfirmation,
	submitPortProcessControlConfirmation,
	writeEndpointHandoffPlan,
} from "./endpointPanel";
import { appendEvent, type ConsoleEvent, createEvent } from "./events";
import {
	appendFileFilterQuery,
	backspaceFileFilterQuery,
	clearFileFilter,
	closeFileFilter,
	type FileFilterState,
	filterFileEntries,
	openFileFilter,
} from "./fileFilter";
import { popFileHistory, pushFileHistory } from "./fileHistory";
import {
	clearFileOperationDialog,
	type FileOperationDialogState,
	type FileOperationKind,
	openFileOperationDialog,
} from "./fileOperationDialog";
import {
	formatInterfaceWorkspaceRows,
	getNextInterfaceIndex,
	type InterfaceDetailView,
	nextInterfaceDetailView,
} from "./interfacePanel";
import {
	createLogCleanupPreview,
	formatLogProfileLabel,
	formatLogWorkspaceRows,
	type LogFollowHistoryItem,
	type LogProfile,
	nextLogProfile,
	nextLogSearchPreset,
	saveLogProfile,
	saveLogSearchPreset,
	submitLogCleanupConfirmation,
} from "./logPanel";
import {
	enterFocus,
	type FocusArea,
	getLocationShortcutIndex,
	getNextIndex,
	getScreenByShortcut,
	getScreenIndex,
	getVisibleWindow,
	leaveFocus,
	moveScreen,
	type Screen,
	screenOrder,
} from "./navigation";
import { createNetworkTimelineEvents } from "./networkTimeline";
import {
	appendCommandPaletteQuery,
	backspaceCommandPaletteQuery,
	type CommandPaletteState,
	closeCommandPalette,
	getFilteredPaletteActions,
	getPaletteAction,
	moveCommandPalette,
	openCommandPalette,
} from "./palette";
import {
	formatProcessWorkspaceRows,
	getProcessFileSelectionCount,
	getSelectedProcessClipboardPreview,
	getSelectedProcessFileRequest,
	getSelectedProcessResourceRequest,
} from "./processPanel";
import {
	createRouteFilterCleanupPreview,
	createRouteRawHandoffPlan,
	formatRoutePathRows,
	formatRouteWorkspaceRows,
	getRouteClipboardPreview,
	nextRouteDetailView,
	nextRouteFilterPreset,
	type RouteDetailView,
	saveRouteFilterPreset,
	submitRouteFilterCleanupConfirmation,
	writeRouteRawHandoffPlan,
} from "./routePanel";
import { computeShellLayout, formatTopBarLine } from "./shell";
import {
	createTimelineSearchCleanupPreview,
	filterTimelineEvents,
	formatTimelineWorkspaceRows,
	getSelectedTimelineAuditExportPlan,
	getSelectedTimelineClipboardPreview,
	moveTimelineSelection,
	nextTimelineFilter,
	nextTimelineSearchPreset,
	saveTimelineSearchPreset,
	submitTimelineSearchCleanupConfirmation,
	type TimelineFilter,
} from "./timelinePanel";
import {
	appendToolHistory,
	createToolHistoryCleanupPreview,
	createToolHistoryExportPlan,
	createToolRunPlan,
	createToolRunPlanFromPreset,
	createToolTargetCleanupPreview,
	filterToolHistory,
	formatToolPromptRows,
	formatToolsWorkspaceRows,
	getSelectedToolHistoryItem,
	getSelectedToolOutputClipboardPreview,
	getSelectedToolSectionClipboardPreview,
	getSelectedToolSectionRowClipboardPreview,
	getSelectedToolSummaryClipboardPreview,
	getToolTargetPresets,
	getVisibleToolHistoryIndex,
	moveFilteredToolHistorySelection,
	moveToolHistorySelection,
	moveToolSectionClipboardRow,
	moveToolTargetPresetSelection,
	nextToolHistoryDetailView,
	nextToolHistoryGroup,
	nextToolHistoryPreset,
	nextToolHistorySort,
	nextToolSectionClipboardSelection,
	promoteToolTargetPreset,
	reassignToolTargetPresetAction,
	removeToolTargetPreset,
	renameToolTargetPreset,
	rerunToolHistoryItem,
	retargetToolTargetPreset,
	saveToolHistoryPreset,
	saveToolTargetPreset,
	submitToolHistoryCleanupConfirmation,
	submitToolTargetCleanupConfirmation,
	type ToolCopyPreviewMode,
	type ToolHistoryDetailView,
	type ToolHistoryExportScope,
	type ToolHistoryGroup,
	type ToolHistoryItem,
	type ToolHistorySort,
	type ToolSectionClipboardSelection,
	type ToolTargetPreset,
	writeToolHistoryExport,
} from "./toolHistory";

type CommandStatus = "idle" | "running";

const toolPromptPrefix = "tool:";
const endpointFilterPromptPrefix = "endpoint-filter:";
const endpointFilterCleanupPromptPrefix = "endpoint-filter-cleanup:";
const portProcessControlPrompt = "port-process-control";

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

type EditorPreview = {
	path: string;
	lines: {
		number: number;
		content: string;
	}[];
	truncated: boolean;
};

export function App(): React.ReactElement {
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const layout = computeShellLayout(columns, rows);
	const actions = useMemo(() => getActionCatalog(), []);
	const systemFileRoot = useMemo(() => getSystemFileRoot(), []);
	const fileLocations = useMemo(() => getSystemFileLocations(), []);
	const fileProvider = useMemo(
		() => createLocalFileProvider(systemFileRoot),
		[systemFileRoot],
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
		useState<ActionPreviewConfirmation>();
	const [actionSimulation, setActionSimulation] =
		useState<ActionControlSimulation>();
	const [actionExecutionPlan, setActionExecutionPlan] =
		useState<ControlExecutionPlan>();
	const [controlExecutionPolicy, setControlExecutionPolicy] =
		useState<ControlExecutionPolicy>(defaultControlExecutionPolicy);
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
	const [auditArchiveRetentionPlan, setAuditArchiveRetentionPlan] =
		useState<ConsoleAuditArchiveRetentionPlan>();
	const [externalOpenPlan, setExternalOpenPlan] = useState<ExternalOpenPlan>();
	const [fileOpenPlan, setFileOpenPlan] = useState<FileOpenPlan>();
	const [events, setEvents] = useState<ConsoleEvent[]>([
		createEvent("info", "picos console booted"),
		createEvent("info", "write actions locked by policy"),
	]);
	const [error, setError] = useState<string>();
	const [refreshInterval, setRefreshInterval] = useState(3000);
	const [language, setLanguage] = useState<Language>("en");
	const [commandStatus, setCommandStatus] = useState<CommandStatus>("idle");
	const [fileRoot, setFileRoot] = useState(systemFileRoot);
	const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
	const [fileHistory, setFileHistory] = useState<string[]>([]);
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
	const [editorPreview, setEditorPreview] = useState<EditorPreview>();
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
	const [interfaceDetailView, setInterfaceDetailView] =
		useState<InterfaceDetailView>("list");
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
			Math.min(
				Math.max(index, 0),
				Math.max(0, cleanupShelfIndex.activeShelves - 1),
			),
		);
	}, [cleanupShelfIndex.activeShelves]);
	const visibleTimelineEvents = useMemo(
		() => filterTimelineEvents(events, timelineSearchQuery, timelineFilter),
		[events, timelineFilter, timelineSearchQuery],
	);
	useEffect(() => {
		setSelectedTimelineIndex((index) =>
			Math.min(
				Math.max(index, 0),
				Math.max(0, visibleTimelineEvents.length - 1),
			),
		);
	}, [visibleTimelineEvents.length]);

	const log = useCallback((level: ConsoleEvent["level"], message: string) => {
		setEvents((current) => appendEvent(current, createEvent(level, message)));
	}, []);

	const previewFile = useCallback(
		async (entry: FileEntry) => {
			const read = await fileProvider.read(entry.path, { maxBytes: 6000 });
			setEditorPreview({
				path: read.path,
				lines: read.content
					.split(/\r?\n/)
					.slice(0, 16)
					.map((content, index) => ({ number: index + 1, content })),
				truncated: read.truncated,
			});
		},
		[fileProvider],
	);

	const loadFiles = useCallback(
		async (path: string, options: { keepSelection?: boolean } = {}) => {
			const [resolvedRoot, entries] = await Promise.all([
				fileProvider
					.stat(path)
					.then((entry) => entry.path)
					.catch(() => path),
				fileProvider.list(path),
			]);
			setFileRoot(resolvedRoot);
			setFileEntries(entries);
			const matchedLocationIndex = fileLocations.findIndex(
				(location) => location.path === resolvedRoot,
			);
			if (matchedLocationIndex >= 0) {
				setSelectedLocationIndex(matchedLocationIndex);
			}
			setSelectedFileIndex((index) =>
				options.keepSelection
					? Math.min(index, Math.max(0, entries.length - 1))
					: 0,
			);
		},
		[fileLocations, fileProvider],
	);

	const refreshFiles = useCallback(async () => {
		await loadFiles(fileRoot, { keepSelection: true });
	}, [fileRoot, loadFiles]);

	const openSelectedFileEntry = useCallback(async () => {
		const entry = displayedFileEntries[selectedFileIndex];
		if (!entry) {
			return;
		}

		if (entry.type === "directory" || entry.type === "symlink") {
			try {
				if (entry.path !== fileRoot) {
					setFileHistory((history) => pushFileHistory(history, fileRoot));
				}
				await loadFiles(entry.path);
				log("info", `entered ${entry.path}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
			return;
		}

		try {
			await previewFile(entry);
			setScreen("editor");
			setFocusArea("workspaces");
			log("ok", `opened ${entry.name}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [
		displayedFileEntries,
		fileRoot,
		loadFiles,
		log,
		previewFile,
		selectedFileIndex,
	]);

	const goToParentDirectory = useCallback(async () => {
		const parent = dirname(fileRoot);
		if (parent === fileRoot) {
			log("info", "already at filesystem root");
			return;
		}
		try {
			setFileHistory((history) => pushFileHistory(history, fileRoot));
			await loadFiles(parent);
			log("info", `entered ${parent}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [fileRoot, loadFiles, log]);

	const jumpToLocation = useCallback(
		async (locationIndex: number) => {
			const location = fileLocations[locationIndex];
			if (!location) {
				return;
			}

			try {
				if (location.path !== fileRoot) {
					setFileHistory((history) => pushFileHistory(history, fileRoot));
				}
				await loadFiles(location.path);
				setSelectedLocationIndex(locationIndex);
				log("info", `jumped to ${location.label}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[fileLocations, fileRoot, loadFiles, log],
	);

	const jumpToNextLocation = useCallback(async () => {
		if (!fileLocations.length) {
			return;
		}

		const nextIndex = getNextIndex(
			selectedLocationIndex,
			fileLocations.length,
			"next",
		);
		await jumpToLocation(nextIndex);
	}, [fileLocations.length, jumpToLocation, selectedLocationIndex]);

	const submitPathCommand = useCallback(async () => {
		const path = commandLine.value.trim();
		if (!path) {
			setCommandLine((current) => closeCommandLine(current));
			log("info", "path command cancelled");
			return;
		}

		try {
			const targetPath = resolve(fileRoot, path);
			if (targetPath !== fileRoot) {
				setFileHistory((history) => pushFileHistory(history, fileRoot));
			}
			await loadFiles(targetPath);
			log("info", `entered ${targetPath}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCommandLine((current) => closeCommandLine(current));
		}
	}, [commandLine.value, fileRoot, loadFiles, log]);

	const submitRouteDestinationCommand = useCallback(async () => {
		const destination = commandLine.value.trim();
		if (!destination) {
			setCommandLine((current) => closeCommandLine(current));
			log("info", "route path command cancelled");
			return;
		}

		try {
			const result = await runRoutePath(destination);
			setRoutePath(result);
			setScreen("routes");
			log("ok", `route path ${result.destination}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCommandLine((current) => closeCommandLine(current));
		}
	}, [commandLine.value, log]);

	const submitRouteFilterCommand = useCallback(() => {
		const query = commandLine.value.trim();
		const filtered = filterRouteEntries(routeTable?.routes ?? [], query);
		setRouteFilter(query);
		setRouteCopyPreview(false);
		setCommandLine((current) => closeCommandLine(current));
		log(
			filtered.length ? "info" : "warn",
			query
				? `route filter ${query} matches ${filtered.length}`
				: "route filter cleared",
		);
	}, [commandLine.value, log, routeTable]);

	const runToolPlan = useCallback(
		async (plan: NonNullable<ReturnType<typeof createToolRunPlan>>) => {
			setScreen("tools");
			const result = await runTool(plan.toolId, plan.args, {
				timeoutMs: 10000,
			});
			setToolHistory((current) => {
				const next = appendToolHistory(current, { plan, result });
				setSelectedToolHistoryIndex(Math.max(0, next.length - 1));
				return next;
			});
		},
		[],
	);

	const submitToolCommand = useCallback(async () => {
		const actionId = commandLine.prompt.slice(toolPromptPrefix.length);
		try {
			const config = await readConfig();
			const plan = createToolRunPlan(
				actionId,
				config.defaultPingHost,
				summaryRef.current,
				commandLine.value,
			);
			if (!plan) {
				log("warn", `unknown tool action ${actionId}`);
				return;
			}

			await runToolPlan(plan);
			log("ok", `${plan.label} completed`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCommandLine((current) => closeCommandLine(current));
		}
	}, [commandLine.prompt, commandLine.value, log, runToolPlan]);

	const submitToolHistoryFilterCommand = useCallback(() => {
		const query = commandLine.value.trim();
		const filtered = filterToolHistory(toolHistory, query);
		setToolHistoryFilter(query);
		if (query) {
			setToolHistoryFilterPresets((current) =>
				saveToolHistoryPreset(current, query),
			);
		}
		setToolCopyPreview(false);
		setSelectedToolHistoryIndex(filtered[0]?.index ?? 0);
		setCommandLine((current) => closeCommandLine(current));
		log(
			filtered.length ? "info" : "warn",
			query
				? `tools filter ${query} matches ${filtered.length}`
				: "tools filter cleared",
		);
	}, [commandLine.value, log, toolHistory]);

	const submitToolHistoryCleanupCommand = useCallback(() => {
		const confirmation = submitToolHistoryCleanupConfirmation(
			toolHistoryFilterPresets,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
			return;
		}
		setToolHistoryFilterPresets(confirmation.presets);
		setToolCopyPreview(false);
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
		log("info", confirmation.message);
	}, [commandLine.value, log, toolHistoryFilterPresets]);

	const submitToolTargetLabelCommand = useCallback(() => {
		const preset =
			toolTargetPresets[
				Math.min(
					Math.max(selectedToolTargetPresetIndex, 0),
					toolTargetPresets.length - 1,
				)
			];
		if (!preset) {
			log("warn", "no tool target preset selected");
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const saved = customToolTargetPresets.some(
			(current) =>
				`${current.actionId}:${current.target}` ===
				`${preset.actionId}:${preset.target}`,
		);
		if (!saved) {
			log("warn", `tool target ${preset.label} is not a saved preset`);
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const next = renameToolTargetPreset(
			customToolTargetPresets,
			preset,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		const changed = next.some(
			(current, index) =>
				current.label !== customToolTargetPresets[index]?.label,
		);
		if (!changed) {
			log("info", "tool target label unchanged");
			return;
		}
		setCustomToolTargetPresets(next);
		void setConfigToolTargetPresets(next).catch((caught) =>
			log(
				"fail",
				caught instanceof Error
					? `tool target label save failed ${caught.message}`
					: `tool target label save failed ${String(caught)}`,
			),
		);
		log("info", `tool target renamed ${preset.target}`);
		setToolCopyPreview(false);
	}, [
		commandLine.value,
		customToolTargetPresets,
		log,
		selectedToolTargetPresetIndex,
		toolTargetPresets,
	]);

	const submitToolTargetValueCommand = useCallback(() => {
		const preset =
			toolTargetPresets[
				Math.min(
					Math.max(selectedToolTargetPresetIndex, 0),
					toolTargetPresets.length - 1,
				)
			];
		if (!preset) {
			log("warn", "no tool target preset selected");
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const saved = customToolTargetPresets.some(
			(current) =>
				`${current.actionId}:${current.target}` ===
				`${preset.actionId}:${preset.target}`,
		);
		if (!saved) {
			log("warn", `tool target ${preset.label} is not a saved preset`);
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const next = retargetToolTargetPreset(
			customToolTargetPresets,
			preset,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		const changed = next.some(
			(current, index) =>
				current.target !== customToolTargetPresets[index]?.target,
		);
		if (!changed) {
			log("info", "tool target value unchanged");
			return;
		}
		setCustomToolTargetPresets(next);
		void setConfigToolTargetPresets(next).catch((caught) =>
			log(
				"fail",
				caught instanceof Error
					? `tool target value save failed ${caught.message}`
					: `tool target value save failed ${String(caught)}`,
			),
		);
		log("info", `tool target updated ${preset.label}`);
		setToolCopyPreview(false);
	}, [
		commandLine.value,
		customToolTargetPresets,
		log,
		selectedToolTargetPresetIndex,
		toolTargetPresets,
	]);

	const submitToolTargetActionCommand = useCallback(() => {
		const preset =
			toolTargetPresets[
				Math.min(
					Math.max(selectedToolTargetPresetIndex, 0),
					toolTargetPresets.length - 1,
				)
			];
		if (!preset) {
			log("warn", "no tool target preset selected");
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const saved = customToolTargetPresets.some(
			(current) =>
				`${current.actionId}:${current.target}` ===
				`${preset.actionId}:${preset.target}`,
		);
		if (!saved) {
			log("warn", `tool target ${preset.label} is not a saved preset`);
			setCommandLine((current) => closeCommandLine(current));
			return;
		}
		const next = reassignToolTargetPresetAction(
			customToolTargetPresets,
			preset,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		const changed = next.some(
			(current, index) =>
				current.actionId !== customToolTargetPresets[index]?.actionId,
		);
		if (!changed) {
			log("info", "tool target action unchanged");
			return;
		}
		setCustomToolTargetPresets(next);
		void setConfigToolTargetPresets(next).catch((caught) =>
			log(
				"fail",
				caught instanceof Error
					? `tool target action save failed ${caught.message}`
					: `tool target action save failed ${String(caught)}`,
			),
		);
		log("info", `tool target action updated ${preset.label}`);
		setToolCopyPreview(false);
	}, [
		commandLine.value,
		customToolTargetPresets,
		log,
		selectedToolTargetPresetIndex,
		toolTargetPresets,
	]);

	const submitToolTargetCleanupCommand = useCallback(() => {
		const preset =
			toolTargetPresets[
				Math.min(
					Math.max(selectedToolTargetPresetIndex, 0),
					toolTargetPresets.length - 1,
				)
			];
		const confirmation = submitToolTargetCleanupConfirmation(
			customToolTargetPresets,
			preset,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
			return;
		}
		setCustomToolTargetPresets(confirmation.presets);
		setSelectedToolTargetPresetIndex((index) =>
			Math.min(index, Math.max(0, confirmation.presets.length - 1)),
		);
		void setConfigToolTargetPresets(confirmation.presets).catch((caught) =>
			log(
				"fail",
				caught instanceof Error
					? `tool target action cleanup failed ${caught.message}`
					: `tool target action cleanup failed ${String(caught)}`,
			),
		);
		log("info", confirmation.message);
		setToolCopyPreview(false);
	}, [
		commandLine.value,
		customToolTargetPresets,
		log,
		selectedToolTargetPresetIndex,
		toolTargetPresets,
	]);

	const submitEndpointFilterCommand = useCallback(() => {
		const kind = commandLine.prompt.slice(endpointFilterPromptPrefix.length);
		const query = commandLine.value.trim();
		if (kind === "connections") {
			const filtered = filterConnections(connections, query);
			setConnectionFilter(query);
			if (query) {
				setConnectionFilterPresets((current) =>
					saveEndpointFilterPreset(current, query),
				);
			}
			setConnectionCopyPreview(false);
			setSelectedConnectionIndex(0);
			log(
				filtered.length ? "info" : "warn",
				query
					? `connections filter ${query} matches ${filtered.length}`
					: "connections filter cleared",
			);
		} else if (kind === "ports") {
			const filtered = filterListeningPorts(ports, query);
			setPortFilter(query);
			if (query) {
				setPortFilterPresets((current) =>
					saveEndpointFilterPreset(current, query),
				);
			}
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			setSelectedPortIndex(0);
			log(
				filtered.length ? "info" : "warn",
				query
					? `ports filter ${query} matches ${filtered.length}`
					: "ports filter cleared",
			);
		}
		setCommandLine((current) => closeCommandLine(current));
	}, [commandLine.prompt, commandLine.value, connections, log, ports]);

	const submitRouteFilterCleanupCommand = useCallback(() => {
		const confirmation = submitRouteFilterCleanupConfirmation(
			routeFilterPresets,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
			return;
		}
		setRouteFilterPresets(confirmation.presets);
		setRouteCopyPreview(false);
		void setConfigRouteFilterPresets(confirmation.presets).catch((caught) =>
			log(
				"fail",
				caught instanceof Error
					? `route filter cleanup failed ${caught.message}`
					: `route filter cleanup failed ${String(caught)}`,
			),
		);
		log("info", confirmation.message);
	}, [commandLine.value, log, routeFilterPresets]);

	const submitEndpointFilterCleanupCommand = useCallback(() => {
		const kind = commandLine.prompt.slice(
			endpointFilterCleanupPromptPrefix.length,
		) as EndpointHandoffKind;
		const presets =
			kind === "connections" ? connectionFilterPresets : portFilterPresets;
		const confirmation = submitEndpointFilterCleanupConfirmation(
			kind,
			presets,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
			return;
		}
		if (kind === "connections") {
			setConnectionFilterPresets(confirmation.presets);
			setConnectionCopyPreview(false);
			setSelectedConnectionIndex(0);
		} else {
			setPortFilterPresets(confirmation.presets);
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			setSelectedPortIndex(0);
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
		log("info", confirmation.message);
	}, [
		commandLine.prompt,
		commandLine.value,
		connectionFilterPresets,
		log,
		portFilterPresets,
	]);

	const submitPortProcessControlCommand = useCallback(() => {
		const preview = createSelectedPortProcessControlPreview(
			sortedPorts,
			selectedPortIndex,
		);
		setCommandLine((current) => closeCommandLine(current));
		setPortProcessControlPreview(false);
		if (!preview) {
			log("warn", "port process control missing target");
			return;
		}
		const confirmation = submitPortProcessControlConfirmation(
			preview,
			commandLine.value,
		);
		log(
			confirmation.confirmed ? "warn" : "fail",
			formatPortProcessControlConfirmationAuditMessage(confirmation),
		);
		const executionPlan = createPortProcessControlExecutionPlan(
			preview,
			confirmation,
			getControlPreviewCommand(preview.actionId, currentPlatform()),
			controlExecutionPolicy,
		);
		log("warn", formatControlExecutionAuditMessage(executionPlan));
	}, [
		commandLine.value,
		controlExecutionPolicy,
		log,
		selectedPortIndex,
		sortedPorts,
	]);

	const submitTimelineSearchCommand = useCallback(() => {
		const query = commandLine.value.trim();
		const filtered = filterTimelineEvents(events, query, timelineFilter);
		setTimelineSearchQuery(query);
		if (query) {
			setTimelineSearchPresets((current) =>
				saveTimelineSearchPreset(current, query),
			);
		}
		setCommandLine((current) => closeCommandLine(current));
		log(
			filtered.length ? "info" : "warn",
			query
				? `timeline search ${query} matches ${filtered.length}`
				: "timeline search cleared",
		);
	}, [commandLine.value, events, log, timelineFilter]);

	const submitTimelineSearchCleanupCommand = useCallback(() => {
		const confirmation = submitTimelineSearchCleanupConfirmation(
			timelineSearchPresets,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
			return;
		}
		setTimelineSearchPresets(confirmation.presets);
		log("info", confirmation.message);
	}, [commandLine.value, log, timelineSearchPresets]);

	const submitLogSearchCommand = useCallback(() => {
		const query = commandLine.value.trim();
		const filtered = filterOsLogEntries(
			osLogs?.entries ?? [],
			query,
			logLevelFilter,
		);
		setLogSearchQuery(query);
		if (query) {
			setLogSearchPresets((current) => {
				const next = saveLogSearchPreset(current, query);
				void setConfigLogSearchPresets(next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `logs preset save failed ${caught.message}`
							: `logs preset save failed ${String(caught)}`,
					),
				);
				return next;
			});
		}
		setCommandLine((current) => closeCommandLine(current));
		log(
			filtered.length ? "info" : "warn",
			query
				? `logs search ${query} matches ${filtered.length}`
				: "logs search cleared",
		);
	}, [commandLine.value, log, logLevelFilter, osLogs]);

	const submitLogsCleanupCommand = useCallback(() => {
		const confirmation = submitLogCleanupConfirmation(
			logSearchPresets,
			logProfiles,
			commandLine.value,
		);
		setCommandLine((current) => closeCommandLine(current));
		if (!confirmation.confirmed) {
			log("warn", confirmation.message);
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
		log("info", confirmation.message);
	}, [commandLine.value, log, logProfiles, logSearchPresets]);

	const submitControlConfirmationCommand = useCallback(() => {
		if (!actionPreviewPlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "control confirmation missing preview");
			return;
		}

		const confirmation = submitActionPreviewConfirmation(
			actionPreviewPlan,
			commandLine.value,
		);
		const simulation = createActionControlSimulation(
			actionPreviewPlan,
			confirmation,
		);
		setActionConfirmation(confirmation);
		setActionSimulation(simulation);
		setActionExecutionPlan(undefined);
		setCommandLine((current) => closeCommandLine(current));
		log(
			confirmation.confirmed ? "warn" : "fail",
			formatActionConfirmationAuditMessage(confirmation),
		);
		log("warn", formatActionSimulationAuditMessage(simulation));
	}, [actionPreviewPlan, commandLine.value, log]);

	const runControlExecutionAttempt = useCallback(async () => {
		if (!actionPreviewPlan) {
			log("warn", "control execution needs a locked action preview first");
			return;
		}

		const config = await readConfig();
		const policy = getControlExecutionPolicyFromConfig(config);
		setControlExecutionPolicy(policy);
		const executionPlan = createControlExecutionPlan(
			actionPreviewPlan,
			actionConfirmation,
			policy,
		);
		setActionExecutionPlan(executionPlan);

		if (executionPlan.status !== "dry-run-ready") {
			log("warn", formatControlExecutionAuditMessage(executionPlan));
			return;
		}

		const result = await runControlExecutionPlan(executionPlan);
		log(
			result.success ? "ok" : "fail",
			formatControlExecutionResultAuditMessage(result.audit),
		);
		if (result.stdout) {
			log("info", `control dry-run stdout ${result.stdout}`);
		}
		if (result.stderr) {
			log("warn", `control dry-run stderr ${result.stderr}`);
		}
	}, [actionConfirmation, actionPreviewPlan, log]);

	const submitClipboardCommand = useCallback(async () => {
		try {
			const outcome = await submitClipboardConfirmation(clipboardConfirmation, {
				platform: currentPlatform(),
			});
			setClipboardConfirmation(outcome.state);
			setCommandLine((current) => closeCommandLine(current));
			log(outcome.event.level, outcome.event.message);
			if (outcome.result.success) {
				setConnectionCopyPreview(false);
				setPortCopyPreview(false);
				setProcessClipboardPreview(false);
				setRouteCopyPreview(false);
				setToolCopyPreview(false);
			}
		} catch (caught) {
			setCommandLine((current) => closeCommandLine(current));
			setClipboardConfirmation(clearClipboardConfirmationState());
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [clipboardConfirmation, log]);

	const goBackFileHistory = useCallback(async () => {
		const next = popFileHistory(fileHistory);
		setFileHistory(next.history);
		if (!next.previousRoot) {
			log("info", "no previous file location");
			return;
		}

		try {
			await loadFiles(next.previousRoot);
			log("info", `back to ${next.previousRoot}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [fileHistory, loadFiles, log]);

	const openSelectedFileOperation = useCallback(
		(kind: FileOperationKind) => {
			const dialog = openFileOperationDialog(
				kind,
				displayedFileEntries[selectedFileIndex],
			);
			setFileOperationDialog(dialog);
			if (dialog.active) {
				log("warn", `${dialog.preview.title} preview locked`);
			} else if (dialog.error) {
				log("warn", dialog.error);
			}
		},
		[displayedFileEntries, log, selectedFileIndex],
	);

	const openClipboardConfirmation = useCallback(
		(preview: ClipboardConfirmationState["preview"]) => {
			if (!preview) {
				log("warn", "no clipboard value selected");
				return;
			}
			setClipboardConfirmation(createClipboardConfirmationState(preview));
			setCommandLine(openCommandLine("clipboard"));
			log("info", `clipboard confirmation opened for ${preview.label}`);
		},
		[log],
	);

	const openSelectedUpdateHandoffClipboard = useCallback(() => {
		const handoff = updateCheckResult
			? createUpdateReleaseHandoff(updateCheckResult)
			: undefined;
		if (!handoff) {
			log("warn", "no update handoff link selected");
			return;
		}
		const link = getSelectedUpdateReleaseHandoffLink(
			handoff,
			selectedUpdateHandoffIndex,
		);
		openClipboardConfirmation(
			createClipboardPreview({
				source: "update-handoff",
				label: link.label,
				copyText: link.url,
			}),
		);
	}, [
		log,
		openClipboardConfirmation,
		selectedUpdateHandoffIndex,
		updateCheckResult,
	]);

	const openSelectedUpdateHandoffExternal = useCallback(() => {
		const handoff = updateCheckResult
			? createUpdateReleaseHandoff(updateCheckResult)
			: undefined;
		if (!handoff) {
			log("warn", "no update handoff link selected");
			return;
		}
		const link = getSelectedUpdateReleaseHandoffLink(
			handoff,
			selectedUpdateHandoffIndex,
		);
		const plan = buildExternalOpenPlan({
			source: "update-handoff",
			label: link.label,
			url: link.url,
			platform: currentPlatform(),
		});
		setExternalOpenPlan(plan);
		setCommandLine(openCommandLine("external-open"));
		log("info", `external open confirmation opened for ${link.label}`);
	}, [log, selectedUpdateHandoffIndex, updateCheckResult]);

	const submitExternalOpenCommand = useCallback(async () => {
		if (!externalOpenPlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "external open missing preview");
			return;
		}
		const plan = buildExternalOpenPlan({
			source: externalOpenPlan.source,
			label: externalOpenPlan.label,
			url: externalOpenPlan.url,
			platform: currentPlatform(),
			confirmation: commandLine.value,
		});
		setExternalOpenPlan(plan);
		setCommandLine((current) => closeCommandLine(current));
		const result = await runExternalOpenPlan(plan);
		log(
			result.success ? "ok" : "fail",
			`external open ${plan.label} confirmed=${plan.confirmed} adapter=${plan.adapter.command}`,
		);
		if (result.error) {
			log("warn", result.error);
		}
	}, [commandLine.value, externalOpenPlan, log]);

	const submitFileOpenCommand = useCallback(async () => {
		if (!fileOpenPlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "file open missing preview");
			return;
		}
		const plan = buildFileOpenPlan({
			baseDir: dirname(getConfigPath()),
			source: fileOpenPlan.source,
			label: fileOpenPlan.label,
			path: fileOpenPlan.path,
			platform: currentPlatform(),
			confirmation: commandLine.value,
		});
		setFileOpenPlan(plan);
		setCommandLine((current) => closeCommandLine(current));
		const result = await runFileOpenPlan(plan);
		log(
			result.success ? "ok" : "fail",
			`file open ${plan.label} confirmed=${plan.confirmed} adapter=${plan.adapter.command}`,
		);
		if (result.error) {
			log("warn", result.error);
		}
	}, [commandLine.value, fileOpenPlan, log]);

	const refreshHandoffIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			try {
				const index = await readHandoffIndex(baseDir);
				setHandoffIndex(index);
				setSelectedHandoffIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
				if (announce) {
					log("info", `handoffs indexed ${index.items.length}`);
				}
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[log],
	);

	const refreshAuditExportIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			try {
				const index = await readConsoleAuditExportIndex(baseDir);
				setAuditExportIndex(index);
				setSelectedAuditExportIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
				if (announce) {
					log("info", `audit exports indexed ${index.items.length}`);
				}
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `audit export index failed ${caught.message}`
						: `audit export index failed ${String(caught)}`,
				);
			}
		},
		[log],
	);

	const refreshAuditExportArchiveIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			try {
				const index = await readConsoleAuditExportArchiveIndex(baseDir);
				setAuditExportArchiveIndex(index);
				setSelectedAuditExportArchiveIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
				if (announce) {
					log("info", `audit archive indexed ${index.items.length}`);
				}
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `audit archive index failed ${caught.message}`
						: `audit archive index failed ${String(caught)}`,
				);
			}
		},
		[log],
	);

	const openSelectedHandoffFile = useCallback(() => {
		const item = getSelectedHandoffIndexItem(
			handoffIndex,
			selectedHandoffIndex,
		);
		if (!item) {
			log("warn", "no handoff file selected");
			return;
		}
		const plan = buildFileOpenPlan({
			baseDir: handoffIndex.baseDir,
			source: item.source,
			label: item.label,
			path: item.path,
			platform: currentPlatform(),
		});
		setFileOpenPlan(plan);
		setExternalOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setAuditArchiveRetentionPlan(undefined);
		setCommandLine(openCommandLine("file-open"));
		setScreen("status");
		log("info", `file open confirmation opened for ${item.label}`);
	}, [handoffIndex, log, selectedHandoffIndex]);

	const openSelectedAuditExportFile = useCallback(() => {
		const item = getSelectedConsoleAuditExport(
			auditExportIndex,
			selectedAuditExportIndex,
		);
		if (!item) {
			log("warn", "no audit export selected");
			return;
		}
		const plan = buildFileOpenPlan({
			baseDir: auditExportIndex.baseDir,
			source: "timeline-export",
			label: `audit export ${item.scope} ${item.generatedAt}`,
			path: item.path,
			platform: currentPlatform(),
		});
		setFileOpenPlan(plan);
		setExternalOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setAuditArchiveRetentionPlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("file-open"));
		setScreen("status");
		log("info", `audit export open confirmation opened for ${item.fileName}`);
	}, [auditExportIndex, log, selectedAuditExportIndex]);

	const openSelectedAuditExportArchiveFile = useCallback(() => {
		const item = getSelectedConsoleAuditExport(
			auditExportArchiveIndex,
			selectedAuditExportArchiveIndex,
		);
		if (!item) {
			log("warn", "no archived audit export selected");
			return;
		}
		const plan = buildFileOpenPlan({
			baseDir: auditExportArchiveIndex.baseDir,
			source: "timeline-export",
			label: `archived audit export ${item.scope} ${item.generatedAt}`,
			path: item.path,
			platform: currentPlatform(),
		});
		setFileOpenPlan(plan);
		setExternalOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setAuditArchiveRetentionPlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("file-open"));
		setScreen("status");
		log(
			"info",
			`archived audit export open confirmation opened for ${item.fileName}`,
		);
	}, [auditExportArchiveIndex, log, selectedAuditExportArchiveIndex]);

	const openAuditArchiveRetentionPreview = useCallback(() => {
		const plan = createConsoleAuditArchiveRetentionPlan(
			auditExportArchiveIndex,
			{ maxItems: auditArchiveRetentionLimit },
		);
		setAuditArchiveRetentionPlan(plan);
		setExternalOpenPlan(undefined);
		setFileOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("audit-archive-retention"));
		setScreen("status");
		log(
			plan.candidateItems.length > 0 ? "warn" : "info",
			`audit archive retention candidates=${plan.candidateItems.length} max=${plan.maxItems}`,
		);
	}, [auditArchiveRetentionLimit, auditExportArchiveIndex, log]);

	const openSelectedAuditExportArchive = useCallback(() => {
		const item = getSelectedConsoleAuditExport(
			auditExportIndex,
			selectedAuditExportIndex,
		);
		if (!item) {
			log("warn", "no audit export selected");
			return;
		}
		const plan = createConsoleAuditExportArchivePlan(
			auditExportIndex.baseDir,
			item.path,
		);
		setAuditExportArchivePlan(plan);
		setExternalOpenPlan(undefined);
		setFileOpenPlan(undefined);
		setAuditArchiveRetentionPlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("audit-export-archive"));
		setScreen("status");
		log(
			"info",
			`audit export archive confirmation opened for ${item.fileName}`,
		);
	}, [auditExportIndex, log, selectedAuditExportIndex]);

	const openSelectedCleanupExportFile = useCallback(() => {
		const item = getSelectedCleanupHandoffHistoryExport(
			cleanupExportIndex,
			selectedCleanupExportIndex,
		);
		if (!item) {
			log("warn", "no cleanup export selected");
			return;
		}
		const plan = buildFileOpenPlan({
			baseDir: cleanupExportIndex.baseDir,
			source: "cleanup-export",
			label: `cleanup export ${item.scope} ${item.generatedAt}`,
			path: item.path,
			platform: currentPlatform(),
		});
		setFileOpenPlan(plan);
		setExternalOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setCleanupExportArchivePlan(undefined);
		setCommandLine(openCommandLine("file-open"));
		setScreen("status");
		log("info", `cleanup export open confirmation opened for ${item.fileName}`);
	}, [cleanupExportIndex, log, selectedCleanupExportIndex]);

	const openSelectedCleanupExportArchive = useCallback(() => {
		const item = getSelectedCleanupHandoffHistoryExport(
			cleanupExportIndex,
			selectedCleanupExportIndex,
		);
		if (!item) {
			log("warn", "no cleanup export selected");
			return;
		}
		const plan = createCleanupHandoffHistoryExportArchivePlan(
			cleanupExportIndex.baseDir,
			item.path,
		);
		setCleanupExportArchivePlan(plan);
		setExternalOpenPlan(undefined);
		setFileOpenPlan(undefined);
		setAuditExportArchivePlan(undefined);
		setCommandLine(openCommandLine("cleanup-export-archive"));
		setScreen("status");
		log(
			"info",
			`cleanup export archive confirmation opened for ${item.fileName}`,
		);
	}, [cleanupExportIndex, log, selectedCleanupExportIndex]);

	const archiveSelectedHandoffFile = useCallback(async () => {
		const item = getSelectedHandoffIndexItem(
			handoffIndex,
			selectedHandoffIndex,
		);
		if (!item) {
			log("warn", "no handoff file selected");
			return;
		}
		const result = await archiveHandoffFile(handoffIndex.baseDir, item.path);
		log(
			result.status === "archived" ? "ok" : "warn",
			`handoff archive ${result.message}`,
		);
		await refreshHandoffIndex(false);
	}, [handoffIndex, log, refreshHandoffIndex, selectedHandoffIndex]);

	const exportToolHistory = useCallback(
		async (scope: ToolHistoryExportScope) => {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const plan = createToolHistoryExportPlan(
				toolHistory,
				visibleToolHistoryIndex,
				{
					baseDir: dirname(getConfigPath()),
					scope,
				},
			);
			if (!plan) {
				log("warn", "no tool history to export");
				return;
			}

			try {
				const written = await writeToolHistoryExport(plan);
				setScreen("tools");
				log(
					"ok",
					`tools exported ${written.scope} ${written.itemCount} run(s) ${written.path}`,
				);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[
			log,
			selectedToolHistoryIndex,
			toolHistory,
			toolHistoryFilter,
			toolHistorySort,
		],
	);

	const exportRouteHandoff = useCallback(async () => {
		if (!routeTable) {
			log("warn", "no route table loaded");
			return;
		}
		const plan = createRouteRawHandoffPlan(routeTable, {
			baseDir: dirname(getConfigPath()),
			filter: routeFilter,
			path: routePath,
			sort: routeSort,
			view: routeDetailView,
		});
		if (!plan) {
			log("warn", "no route handoff target");
			return;
		}

		try {
			const written = await writeRouteRawHandoffPlan(plan);
			await refreshHandoffIndex(false);
			setScreen("routes");
			log("ok", `routes exported ${written.view} ${written.path}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [
		log,
		refreshHandoffIndex,
		routeDetailView,
		routeFilter,
		routePath,
		routeSort,
		routeTable,
	]);

	const openRouteHandoff = useCallback(async () => {
		if (!routeTable) {
			log("warn", "no route table loaded");
			return;
		}
		const baseDir = dirname(getConfigPath());
		const handoff = createRouteRawHandoffPlan(routeTable, {
			baseDir,
			filter: routeFilter,
			path: routePath,
			sort: routeSort,
			view: routeDetailView,
		});
		if (!handoff) {
			log("warn", "no route handoff target");
			return;
		}

		try {
			const written = await writeRouteRawHandoffPlan(handoff);
			await refreshHandoffIndex(false);
			const plan = buildFileOpenPlan({
				baseDir,
				source: "route-handoff",
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
	}, [
		log,
		refreshHandoffIndex,
		routeDetailView,
		routeFilter,
		routePath,
		routeSort,
		routeTable,
	]);

	const exportEndpointHandoff = useCallback(
		async (kind: "connections" | "ports") => {
			const plan =
				kind === "connections"
					? connectionsResult
						? createEndpointHandoffPlan("connections", {
								baseDir: dirname(getConfigPath()),
								filter: connectionFilter,
								result: connectionsResult,
								sort: connectionSort,
								view: connectionDetailView,
							})
						: undefined
					: portsResult
						? createEndpointHandoffPlan("ports", {
								baseDir: dirname(getConfigPath()),
								filter: portFilter,
								result: portsResult,
								sort: portSort,
								view: portDetailView,
							})
						: undefined;
			if (!plan) {
				log("warn", `no ${kind} snapshot loaded`);
				return;
			}

			try {
				const written = await writeEndpointHandoffPlan(plan);
				await refreshHandoffIndex(false);
				setScreen(kind);
				log("ok", `${kind} exported ${written.view} ${written.path}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[
			connectionDetailView,
			connectionFilter,
			connectionSort,
			connectionsResult,
			log,
			portDetailView,
			portFilter,
			portSort,
			portsResult,
			refreshHandoffIndex,
		],
	);

	const openEndpointHandoff = useCallback(
		async (kind: "connections" | "ports") => {
			const baseDir = dirname(getConfigPath());
			const handoff =
				kind === "connections"
					? connectionsResult
						? createEndpointHandoffPlan("connections", {
								baseDir,
								filter: connectionFilter,
								result: connectionsResult,
								sort: connectionSort,
								view: connectionDetailView,
							})
						: undefined
					: portsResult
						? createEndpointHandoffPlan("ports", {
								baseDir,
								filter: portFilter,
								result: portsResult,
								sort: portSort,
								view: portDetailView,
							})
						: undefined;
			if (!handoff) {
				log("warn", `no ${kind} snapshot loaded`);
				return;
			}

			try {
				const written = await writeEndpointHandoffPlan(handoff);
				await refreshHandoffIndex(false);
				const plan = buildFileOpenPlan({
					baseDir,
					source: "endpoint-handoff",
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
		[
			connectionDetailView,
			connectionFilter,
			connectionSort,
			connectionsResult,
			log,
			portDetailView,
			portFilter,
			portSort,
			portsResult,
			refreshHandoffIndex,
		],
	);

	const selectRemoteProfile = useCallback(async () => {
		const profile = remoteProfiles[selectedRemoteIndex];
		if (!profile) {
			log("warn", "no remote profile selected");
			return;
		}

		const context = await createRemoteFileContext(profile);
		setRemoteFileContext(context);
		setScreen("files");
		setFocusArea("workspaces");
		log("info", `remote context selected ${context.label}`);
	}, [log, remoteProfiles, selectedRemoteIndex]);

	const inspectSelectedEndpointProcess = useCallback(async () => {
		const request =
			screen === "connections"
				? getSelectedConnectionProcessRequest(
						sortedConnections,
						selectedConnectionIndex,
					)
				: screen === "ports"
					? getSelectedPortProcessRequest(sortedPorts, selectedPortIndex)
					: undefined;
		if (!request) {
			log("warn", "no process PID available for selected endpoint");
			return;
		}

		setCommandStatus("running");
		try {
			const [detail, files] = await Promise.all([
				getProcessDetail(request.pid),
				getProcessFileSnapshot(request.pid),
			]);
			setSelectedProcessDetail(detail);
			setSelectedProcessFiles(files);
			setSelectedProcessFileIndex(0);
			setProcessClipboardPreview(false);
			setScreen("processes");
			log("ok", `process inspected ${request.command}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCommandStatus("idle");
		}
	}, [
		log,
		screen,
		selectedConnectionIndex,
		selectedPortIndex,
		sortedConnections,
		sortedPorts,
	]);

	const openSelectedProcessFile = useCallback(async () => {
		const request = getSelectedProcessFileRequest(
			selectedProcessFiles,
			selectedProcessFileIndex,
		);
		if (!request) {
			const resource = getSelectedProcessResourceRequest(
				selectedProcessFiles,
				selectedProcessFileIndex,
			);
			if (resource) {
				log("info", `process resource ${resource.summary}`);
				return;
			}
			log("warn", "selected process file is not openable");
			return;
		}

		try {
			const entry = await fileProvider.stat(request.path);
			if (entry.type === "directory" || entry.type === "symlink") {
				if (entry.path !== fileRoot) {
					setFileHistory((history) => pushFileHistory(history, fileRoot));
				}
				await loadFiles(entry.path);
				setScreen("files");
				setFocusArea("workspaces");
				log("ok", `process file opened ${request.command}`);
				return;
			}

			await previewFile(entry);
			setScreen("editor");
			setFocusArea("workspaces");
			log("ok", `process file opened ${request.command}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		}
	}, [
		fileProvider,
		fileRoot,
		loadFiles,
		log,
		previewFile,
		selectedProcessFileIndex,
		selectedProcessFiles,
	]);

	useEffect(() => {
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
		try {
			setError(undefined);
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
			setInventory(await createSystemInventory({ network: nextSummary }));
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
			setError(message);
			log("fail", message);
		}
	}, [log]);

	const runAction = useCallback(
		async (action: PicosAction) => {
			if (!action.enabled) {
				const platform = currentPlatform();
				if (action.id === "picos.update.apply") {
					const applyPreview = updateCheckResult
						? createUpdateApplyPreview(updateCheckResult)
						: undefined;
					if (!applyPreview) {
						setScreen("status");
						log(
							"warn",
							updateCheckResult
								? "picos.update.apply has no available update to preview"
								: "run picos.update before opening update apply preview",
						);
						return;
					}
					const preview = createUpdateApplyActionPreviewPlan(
						applyPreview,
						platform,
					);
					setActionPreviewPlan(preview);
					setActionConfirmation(undefined);
					setActionSimulation(createActionControlSimulation(preview));
					setActionExecutionPlan(undefined);
					setScreen("actions");
					setFocusArea("actions");
					log("warn", formatActionPreviewAuditMessage(preview));
					return;
				}

				const preview = createActionPreviewPlan(
					action.id,
					platform,
					getControlPreviewCommand(action.id, platform),
				);
				setActionPreviewPlan(preview);
				setActionConfirmation(undefined);
				setActionSimulation(
					preview ? createActionControlSimulation(preview) : undefined,
				);
				setActionExecutionPlan(undefined);
				setScreen("actions");
				log(
					"warn",
					preview
						? formatActionPreviewAuditMessage(preview)
						: `${action.id} preview unavailable`,
				);
				return;
			}

			setActionPreviewPlan(undefined);
			setActionConfirmation(undefined);
			setActionSimulation(undefined);
			setActionExecutionPlan(undefined);
			setCommandStatus("running");
			log("run", `${action.id} started`);

			try {
				if (action.id === "network.inspect") {
					await refresh();
					log("ok", "network refreshed");
				}

				if (action.id === "system.inventory") {
					setInventory(await createSystemInventory());
					log("ok", "system inventory refreshed");
				}

				if (action.id === "logs.read") {
					const snapshot = await createOsLogSnapshot({ limit: 50 });
					setOsLogs(snapshot);
					setScreen("logs");
					log(
						snapshot.status === "ok" ? "ok" : "warn",
						`logs read ${snapshot.entries.length}`,
					);
				}

				if (action.id === "doctor.run") {
					const checks = await runDoctorChecks();
					setDoctorChecks(checks);
					for (const check of checks) {
						log(check.status === "pass" ? "ok" : check.status, check.label);
					}
				}

				if (action.id === "config.show") {
					const config = await readConfig();
					log("info", `config path ${getConfigPath()}`);
					log(
						"info",
						`theme=${config.theme} refresh=${config.refreshInterval}`,
					);
					log(
						"info",
						`retention auditArchive=${config.auditArchiveRetentionLimit} toolTargets=${config.toolTargetPresetLimit}`,
					);
				}

				if (action.id === "remote.profiles") {
					const config = await readConfig();
					log("info", `remote profiles ${config.remoteProfiles.length}`);
				}

				if (action.id === "files.list") {
					await refreshFiles();
					log("ok", `files listed ${fileRoot}`);
				}

				if (action.id === "files.read") {
					await refreshFiles();
					log("ok", "editor preview refreshed");
				}

				if (action.id === "routes.inspect") {
					const result = await runRouteTable();
					setRouteTable(result);
					log("ok", `routes listed ${result.routes.length}`);
				}

				if (action.id === "routes.path") {
					setScreen("routes");
					setCommandLine(openCommandLine("route"));
					log("info", "route destination prompt opened");
				}

				if (action.id === "timeline.export") {
					const scopedEvents = filterTimelineEvents(
						events,
						timelineSearchQuery,
						timelineFilter,
					);
					const scoped =
						timelineFilter !== "all" || Boolean(timelineSearchQuery.trim());
					const plan = createConsoleAuditExportPlan(scopedEvents, {
						baseDir: dirname(getConfigPath()),
						query: timelineSearchQuery.trim() || undefined,
						scope: scoped ? "filtered" : undefined,
					});
					const written = await writeConsoleAuditExport(plan);
					log(
						"ok",
						`audit exported ${written.path} events=${written.eventCount}`,
					);
				}

				const toolPlan = createToolRunPlan(
					action.id,
					(await readConfig()).defaultPingHost,
					summaryRef.current,
				);
				if (toolPlan) {
					setScreen("tools");
					setCommandLine(openCommandLine(`${toolPromptPrefix}${action.id}`));
					log("info", `${toolPlan.label} target prompt opened`);
				}

				if (action.id === "raw.view") {
					const latestTool = toolHistory.at(-1);
					if (latestTool) {
						setScreen("tools");
						setSelectedToolHistoryIndex(Math.max(0, toolHistory.length - 1));
						log("info", `raw.view latest ${latestTool.label}`);
					} else {
						log("warn", "raw.view has no tool history yet");
					}
				}

				if (action.id === "tools.export") {
					await exportToolHistory("all");
				}

				if (action.id === "picos.update") {
					const result = await checkForPackageUpdate({
						packageName: "@uulab/picos",
						currentVersion: VERSION,
					});
					const releaseResult = await checkForGitHubReleaseUpdate({
						owner: "uulab-official",
						repo: "picos",
						currentVersion: VERSION,
					});
					setUpdateCheckResult(result);
					setGitHubReleaseCheckResult(releaseResult);
					setSelectedUpdateHandoffIndex(0);
					setScreen("status");
					for (const row of formatUpdateCheckRows(result)) {
						log(result.status === "unknown" ? "warn" : "info", row);
					}
					for (const row of formatGitHubReleaseCheckRows(releaseResult)) {
						log(releaseResult.status === "unknown" ? "warn" : "info", row);
					}
					const applyPreview = createUpdateApplyPreview(result);
					if (applyPreview) {
						for (const row of formatUpdateApplyPreviewRows(applyPreview)) {
							log("warn", row);
						}
					}
					const releaseHandoff = createUpdateReleaseHandoff(result);
					if (releaseHandoff) {
						for (const row of formatUpdateReleaseHandoffRows(releaseHandoff)) {
							log("info", row);
						}
					}
				}

				if (
					action.id === "process.inspect" ||
					action.id === "remote.sftp.connect"
				) {
					log(
						"info",
						action.id === "process.inspect"
							? "use picos process <pid> from endpoint detail"
							: `${action.id} queued for adapter implementation`,
					);
				}

				if (action.id === "connections.list") {
					const result = await getActiveConnections();
					setConnectionsResult(result);
					log("ok", `connections listed ${result.connections.length}`);
				}

				if (action.id === "ports.list") {
					const result = await getListeningPorts();
					setPortsResult(result);
					log("ok", `ports listed ${result.ports.length}`);
				}
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			} finally {
				setCommandStatus("idle");
			}
		},
		[
			events,
			exportToolHistory,
			fileRoot,
			log,
			refresh,
			refreshFiles,
			timelineFilter,
			timelineSearchQuery,
			toolHistory,
			updateCheckResult,
		],
	);

	useEffect(() => {
		readHandoffIndex(dirname(getConfigPath()))
			.then((index) => {
				setHandoffIndex(index);
				setSelectedHandoffIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
			})
			.catch((caught) =>
				log("fail", caught instanceof Error ? caught.message : String(caught)),
			);
		readConfig().then(async (config) => {
			setRefreshInterval(config.refreshInterval);
			setLanguage(config.language);
			setDefaultPingHost(config.defaultPingHost);
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
			setToolTargetPresetLimit(config.toolTargetPresetLimit);
			setAuditArchiveRetentionLimit(config.auditArchiveRetentionLimit);
			setCustomToolTargetPresets(
				config.toolTargetPresets as ToolTargetPreset[],
			);
			setControlExecutionPolicy(getControlExecutionPolicyFromConfig(config));
			setSelectedRemoteIndex((index) =>
				Math.min(index, Math.max(0, config.remoteProfiles.length - 1)),
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
			const cleanupExports = await readCleanupHandoffHistoryExportIndex(
				dirname(getConfigPath()),
			).catch(() => ({
				baseDir: dirname(getConfigPath()),
				items: [],
			}));
			const auditExports = await readConsoleAuditExportIndex(
				dirname(getConfigPath()),
			).catch(() => ({
				baseDir: dirname(getConfigPath()),
				items: [],
			}));
			const auditArchiveExports = await readConsoleAuditExportArchiveIndex(
				dirname(getConfigPath()),
			).catch(() => ({
				baseDir: dirname(getConfigPath()),
				items: [],
			}));
			const cleanupArchiveExports =
				await readCleanupHandoffHistoryExportArchiveIndex(
					dirname(getConfigPath()),
				).catch(() => ({
					baseDir: dirname(getConfigPath()),
					items: [],
				}));
			setCleanupExportIndex(cleanupExports);
			setSelectedCleanupExportIndex((current) =>
				Math.min(current, Math.max(0, cleanupExports.items.length - 1)),
			);
			setAuditExportIndex(auditExports);
			setSelectedAuditExportIndex((current) =>
				Math.min(current, Math.max(0, auditExports.items.length - 1)),
			);
			setAuditExportArchiveIndex(auditArchiveExports);
			setSelectedAuditExportArchiveIndex((current) =>
				Math.min(current, Math.max(0, auditArchiveExports.items.length - 1)),
			);
			setCleanupExportArchiveIndex(cleanupArchiveExports);
			setSelectedCleanupExportArchiveIndex((current) =>
				Math.min(current, Math.max(0, cleanupArchiveExports.items.length - 1)),
			);
			setEvents(
				[
					...(persisted?.events ?? []),
					...(persistedCleanup?.events ?? []),
					...bootEvents,
				].slice(-64),
			);
		});
		refresh();
	}, [log, refresh]);

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
		const plan = createCleanupHandoffActionPlan(cleanupJumpAudit, screen);
		if (!plan || !cleanupJumpAudit) {
			return false;
		}

		const prompt =
			plan.id === "logs"
				? "logs-cleanup"
				: plan.id === "routes"
					? "route-filter-cleanup"
					: plan.id === "connections" || plan.id === "ports"
						? `${endpointFilterCleanupPromptPrefix}${plan.id}`
						: plan.id === "timeline"
							? "timeline-search-cleanup"
							: plan.id === "tools-history"
								? "tool-history-cleanup"
								: "tool-target-cleanup";

		setCommandLine(openCommandLine(prompt));
		setCleanupHandoffHistory((current) =>
			appendCleanupHandoffHistory(
				current,
				createCleanupHandoffHistory(cleanupJumpAudit, "prompt-opened"),
			),
		);
		setSelectedCleanupHandoffHistoryIndex(0);
		log(
			"info",
			`cleanup handoff prompt opened ${plan.label}; type ${plan.confirmationPhrase}`,
		);
		return true;
	}, [cleanupJumpAudit, log, screen]);

	const dismissCleanupHandoff = useCallback(() => {
		const plan = createCleanupHandoffDismissPlan(cleanupJumpAudit, screen);
		if (!plan || !cleanupJumpAudit) {
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
		log(
			"info",
			`cleanup handoff dismissed ${plan.label}; normal ${plan.workspace} controls restored`,
		);
		return true;
	}, [cleanupJumpAudit, log, screen]);

	const reopenCleanupHandoffHistory = useCallback(() => {
		const history = getSelectedCleanupHandoffHistory(
			cleanupHandoffHistory,
			selectedCleanupHandoffHistoryIndex,
		);
		const plan = createCleanupHandoffReopenPlan(history);
		if (!history || !plan) {
			log("warn", "no cleanup handoff history selected");
			return false;
		}

		setCleanupJumpAudit(createCleanupJumpAuditFromHistory(history));
		setScreen(plan.screen);
		log(
			"info",
			`cleanup history reopened ${plan.label}: press enter to open prompt or esc to clear`,
		);
		return true;
	}, [cleanupHandoffHistory, log, selectedCleanupHandoffHistoryIndex]);

	const refreshCleanupExportIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			try {
				const index = await readCleanupHandoffHistoryExportIndex(baseDir);
				setCleanupExportIndex(index);
				setSelectedCleanupExportIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
				if (announce) {
					log("info", `cleanup exports indexed ${index.items.length}`);
				}
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `cleanup export index failed ${caught.message}`
						: `cleanup export index failed ${String(caught)}`,
				);
			}
		},
		[log],
	);

	const refreshCleanupExportArchiveIndex = useCallback(
		async (announce = true) => {
			const baseDir = dirname(getConfigPath());
			try {
				const index =
					await readCleanupHandoffHistoryExportArchiveIndex(baseDir);
				setCleanupExportArchiveIndex(index);
				setSelectedCleanupExportArchiveIndex((current) =>
					Math.min(current, Math.max(0, index.items.length - 1)),
				);
				if (announce) {
					log("info", `cleanup archive indexed ${index.items.length}`);
				}
			} catch (caught) {
				log(
					"fail",
					caught instanceof Error
						? `cleanup archive index failed ${caught.message}`
						: `cleanup archive index failed ${String(caught)}`,
				);
			}
		},
		[log],
	);

	const submitCleanupExportArchiveCommand = useCallback(async () => {
		if (!cleanupExportArchivePlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "cleanup export archive missing preview");
			return;
		}
		const plan = createCleanupHandoffHistoryExportArchivePlan(
			cleanupExportIndex.baseDir,
			cleanupExportArchivePlan.sourcePath,
			{ confirmation: commandLine.value },
		);
		setCleanupExportArchivePlan(plan);
		setCommandLine((current) => closeCommandLine(current));
		const result = await archiveCleanupHandoffHistoryExport(plan);
		log(
			result.status === "archived" ? "ok" : "warn",
			`cleanup export archive ${result.message}`,
		);
		if (result.status === "archived") {
			await refreshCleanupExportIndex(false);
			await refreshCleanupExportArchiveIndex(false);
		}
	}, [
		cleanupExportArchivePlan,
		cleanupExportIndex.baseDir,
		commandLine.value,
		log,
		refreshCleanupExportArchiveIndex,
		refreshCleanupExportIndex,
	]);

	const submitAuditExportArchiveCommand = useCallback(async () => {
		if (!auditExportArchivePlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "audit export archive missing preview");
			return;
		}
		const plan = createConsoleAuditExportArchivePlan(
			auditExportIndex.baseDir,
			auditExportArchivePlan.sourcePath,
			{ confirmation: commandLine.value },
		);
		setAuditExportArchivePlan(plan);
		setCommandLine((current) => closeCommandLine(current));
		const result = await archiveConsoleAuditExport(plan);
		log(
			result.status === "archived" ? "ok" : "warn",
			`audit export archive ${result.message}`,
		);
		if (result.status === "archived") {
			await refreshAuditExportIndex(false);
			await refreshAuditExportArchiveIndex(false);
		}
	}, [
		auditExportArchivePlan,
		auditExportIndex.baseDir,
		commandLine.value,
		log,
		refreshAuditExportArchiveIndex,
		refreshAuditExportIndex,
	]);

	const submitAuditArchiveRetentionCommand = useCallback(async () => {
		if (!auditArchiveRetentionPlan) {
			setCommandLine((current) => closeCommandLine(current));
			log("warn", "audit archive retention missing preview");
			return;
		}
		const plan = createConsoleAuditArchiveRetentionPlan(
			auditExportArchiveIndex,
			{
				maxItems: auditArchiveRetentionPlan.maxItems,
				confirmation: commandLine.value,
			},
		);
		setAuditArchiveRetentionPlan(plan);
		setCommandLine((current) => closeCommandLine(current));
		const result = await pruneConsoleAuditArchive(plan);
		log(
			result.status === "pruned" ? "ok" : "warn",
			`audit archive retention ${result.message}`,
		);
		if (result.status === "pruned") {
			await refreshAuditExportArchiveIndex(false);
		}
	}, [
		auditArchiveRetentionPlan,
		auditExportArchiveIndex,
		commandLine.value,
		log,
		refreshAuditExportArchiveIndex,
	]);

	const exportCleanupHandoffHistory = useCallback(async () => {
		const plan = createCleanupHandoffHistoryExportPlan(
			cleanupHandoffHistory,
			selectedCleanupHandoffHistoryIndex,
			{
				baseDir: dirname(getConfigPath()),
				scope: "all",
			},
		);
		if (!plan) {
			log("warn", "no cleanup handoff history to export");
			return false;
		}

		try {
			const written = await writeCleanupHandoffHistoryExport(plan);
			log(
				"ok",
				`cleanup history exported ${written.itemCount} entries to ${written.path}`,
			);
			await refreshCleanupExportIndex(false);
			return true;
		} catch (caught) {
			log(
				"fail",
				caught instanceof Error
					? `cleanup history export failed ${caught.message}`
					: `cleanup history export failed ${String(caught)}`,
			);
			return false;
		}
	}, [
		cleanupHandoffHistory,
		log,
		refreshCleanupExportIndex,
		selectedCleanupHandoffHistoryIndex,
	]);

	useInput((input, key) => {
		if (commandLine.active) {
			if (key.escape) {
				setCommandLine((current) => closeCommandLine(current));
				if (commandLine.prompt === "clipboard") {
					setClipboardConfirmation(clearClipboardConfirmationState());
					setConnectionCopyPreview(false);
					setPortCopyPreview(false);
					setProcessClipboardPreview(false);
					setRouteCopyPreview(false);
					setToolCopyPreview(false);
				}
				if (commandLine.prompt === "external-open") {
					setExternalOpenPlan(undefined);
				}
				if (commandLine.prompt === "file-open") {
					setFileOpenPlan(undefined);
				}
				if (commandLine.prompt === portProcessControlPrompt) {
					setPortProcessControlPreview(false);
				}
				if (commandLine.prompt === "cleanup-export-archive") {
					setCleanupExportArchivePlan(undefined);
				}
				if (commandLine.prompt === "audit-export-archive") {
					setAuditExportArchivePlan(undefined);
				}
				if (commandLine.prompt === "audit-archive-retention") {
					setAuditArchiveRetentionPlan(undefined);
				}
				log(
					"info",
					commandLine.prompt === "route"
						? "route path command cancelled"
						: commandLine.prompt === "clipboard"
							? "clipboard confirmation cancelled"
							: commandLine.prompt === "route-filter"
								? "route filter cancelled"
								: commandLine.prompt === "route-filter-cleanup"
									? "route filter cleanup cancelled"
									: commandLine.prompt === "tool-filter"
										? "tool history filter cancelled"
										: commandLine.prompt === "tool-history-cleanup"
											? "tool history filter cleanup cancelled"
											: commandLine.prompt.startsWith(
														endpointFilterPromptPrefix,
													)
												? "endpoint filter cancelled"
												: commandLine.prompt.startsWith(
															endpointFilterCleanupPromptPrefix,
														)
													? "endpoint filter cleanup cancelled"
													: commandLine.prompt === "timeline-search"
														? "timeline search cancelled"
														: commandLine.prompt === "timeline-search-cleanup"
															? "timeline search cleanup cancelled"
															: commandLine.prompt === "control-confirm"
																? "control confirmation cancelled"
																: commandLine.prompt === "external-open"
																	? "external open confirmation cancelled"
																	: commandLine.prompt === "file-open"
																		? "file open confirmation cancelled"
																		: commandLine.prompt ===
																				"cleanup-export-archive"
																			? "cleanup export archive cancelled"
																			: commandLine.prompt ===
																					"audit-export-archive"
																				? "audit export archive cancelled"
																				: commandLine.prompt ===
																						"audit-archive-retention"
																					? "audit archive retention cancelled"
																					: commandLine.prompt === "log-search"
																						? "logs search cancelled"
																						: commandLine.prompt ===
																								"logs-cleanup"
																							? "logs cleanup cancelled"
																							: commandLine.prompt ===
																									"tool-target-label"
																								? "tool target label cancelled"
																								: commandLine.prompt ===
																										"tool-target-value"
																									? "tool target value cancelled"
																									: commandLine.prompt ===
																											"tool-target-action"
																										? "tool target action cancelled"
																										: commandLine.prompt ===
																												"tool-target-cleanup"
																											? "tool target cleanup cancelled"
																											: commandLine.prompt ===
																													portProcessControlPrompt
																												? "port process control cancelled"
																												: commandLine.prompt.startsWith(
																															toolPromptPrefix,
																														)
																													? "tool target command cancelled"
																													: "path command cancelled",
				);
				return;
			}

			if (key.return) {
				if (commandLine.prompt === "clipboard") {
					void submitClipboardCommand();
				} else if (commandLine.prompt === "route") {
					void submitRouteDestinationCommand();
				} else if (commandLine.prompt === "route-filter") {
					submitRouteFilterCommand();
				} else if (commandLine.prompt === "route-filter-cleanup") {
					submitRouteFilterCleanupCommand();
				} else if (commandLine.prompt === "tool-filter") {
					submitToolHistoryFilterCommand();
				} else if (commandLine.prompt === "tool-history-cleanup") {
					submitToolHistoryCleanupCommand();
				} else if (commandLine.prompt === "tool-target-label") {
					submitToolTargetLabelCommand();
				} else if (commandLine.prompt === "tool-target-value") {
					submitToolTargetValueCommand();
				} else if (commandLine.prompt === "tool-target-action") {
					submitToolTargetActionCommand();
				} else if (commandLine.prompt === "tool-target-cleanup") {
					submitToolTargetCleanupCommand();
				} else if (commandLine.prompt.startsWith(endpointFilterPromptPrefix)) {
					submitEndpointFilterCommand();
				} else if (
					commandLine.prompt.startsWith(endpointFilterCleanupPromptPrefix)
				) {
					submitEndpointFilterCleanupCommand();
				} else if (commandLine.prompt === "timeline-search") {
					submitTimelineSearchCommand();
				} else if (commandLine.prompt === "timeline-search-cleanup") {
					submitTimelineSearchCleanupCommand();
				} else if (commandLine.prompt === "log-search") {
					submitLogSearchCommand();
				} else if (commandLine.prompt === "logs-cleanup") {
					submitLogsCleanupCommand();
				} else if (commandLine.prompt === "control-confirm") {
					submitControlConfirmationCommand();
				} else if (commandLine.prompt === portProcessControlPrompt) {
					submitPortProcessControlCommand();
				} else if (commandLine.prompt === "external-open") {
					void submitExternalOpenCommand();
				} else if (commandLine.prompt === "file-open") {
					void submitFileOpenCommand();
				} else if (commandLine.prompt === "cleanup-export-archive") {
					void submitCleanupExportArchiveCommand();
				} else if (commandLine.prompt === "audit-export-archive") {
					void submitAuditExportArchiveCommand();
				} else if (commandLine.prompt === "audit-archive-retention") {
					void submitAuditArchiveRetentionCommand();
				} else if (commandLine.prompt.startsWith(toolPromptPrefix)) {
					void submitToolCommand();
				} else {
					void submitPathCommand();
				}
				return;
			}

			setCommandLine((current) =>
				applyCommandLineInput(current, {
					input,
					backspace: key.backspace || key.delete,
				}),
			);
			if (commandLine.prompt === "clipboard") {
				setClipboardConfirmation((current) =>
					key.backspace || key.delete
						? backspaceClipboardConfirmationInput(current)
						: appendClipboardConfirmationInput(current, input),
				);
			}
			return;
		}

		if (palette.active) {
			const filteredActions = getFilteredPaletteActions(actions, palette);
			if (key.escape || input === "q") {
				setPalette((current) => closeCommandPalette(current));
				log("info", "command palette closed");
				return;
			}

			if (key.return) {
				const action = getPaletteAction(actions, palette);
				setPalette((current) => closeCommandPalette(current));
				if (action) {
					runAction(action);
				}
				return;
			}

			if (key.downArrow || input === "j") {
				setPalette((current) =>
					moveCommandPalette(current, filteredActions.length, "next"),
				);
				return;
			}

			if (key.upArrow || input === "k") {
				setPalette((current) =>
					moveCommandPalette(current, filteredActions.length, "previous"),
				);
				return;
			}

			if (key.backspace || key.delete) {
				setPalette((current) => backspaceCommandPaletteQuery(current));
				return;
			}

			setPalette((current) => appendCommandPaletteQuery(current, input));
			return;
		}

		if (fileOperationDialog.active) {
			if (key.escape || input === "q") {
				setFileOperationDialog((current) => clearFileOperationDialog(current));
				log("info", "file operation dialog closed");
				return;
			}

			if (key.return) {
				log(
					"warn",
					`${fileOperationDialog.preview.kind} locked: ${fileOperationDialog.preview.reason}`,
				);
				return;
			}

			return;
		}

		if (fileFilter.active) {
			if (key.escape) {
				setFileFilter((current) => clearFileFilter(current));
				setSelectedFileIndex(0);
				log("info", "file filter cleared");
				return;
			}

			if (key.return) {
				setFileFilter((current) => closeFileFilter(current));
				log("info", "file filter applied");
				return;
			}

			if (key.backspace || key.delete) {
				setFileFilter((current) => backspaceFileFilterQuery(current));
				setSelectedFileIndex(0);
				return;
			}

			setFileFilter((current) => appendFileFilterQuery(current, input));
			setSelectedFileIndex(0);
			return;
		}

		if (key.escape && dismissCleanupHandoff()) {
			return;
		}

		if (input === "q") {
			exit();
		}

		if (input === "?" || input === "/") {
			setFocusArea("workspaces");
			setPalette(openCommandPalette());
			log("info", "command palette opened");
			return;
		}

		if (input === "r") {
			runAction(
				actions.find((action) => action.id === "network.inspect") ?? actions[0],
			);
		}

		if (input === "d") {
			const doctor = actions.find((action) => action.id === "doctor.run");
			if (doctor) {
				setScreen("actions");
				runAction(doctor);
			}
		}

		if (input === "p") {
			const ping = actions.find((action) => action.id === "ping.default");
			if (ping) {
				setScreen("actions");
				runAction(ping);
			}
		}

		if (
			screen === "actions" &&
			focusArea === "actions" &&
			(input === "c" || input === "C")
		) {
			if (!actionPreviewPlan) {
				log("warn", "control confirmation needs a locked action preview first");
				return;
			}
			if (!actionPreviewPlan.confirmationPhrase) {
				log("warn", `${actionPreviewPlan.actionId} has no confirmation phrase`);
				return;
			}
			setCommandLine(openCommandLine("control-confirm"));
			log(
				"info",
				`control confirmation opened for ${actionPreviewPlan.actionId}`,
			);
			return;
		}

		if (
			screen === "actions" &&
			focusArea === "actions" &&
			(input === "x" || input === "X")
		) {
			void runControlExecutionAttempt();
			return;
		}

		if (input === "\r" && openCleanupHandoffPrompt()) {
			return;
		}

		if (input === "\r") {
			if (screen === "actions" && focusArea === "workspaces") {
				setFocusArea(enterFocus(screen, focusArea));
				log("info", "actions focus entered");
			} else if (
				(screen === "connections" || screen === "ports") &&
				focusArea === "workspaces"
			) {
				void inspectSelectedEndpointProcess();
			} else if (screen === "processes" && focusArea === "workspaces") {
				void openSelectedProcessFile();
			} else if (screen === "files" && focusArea === "workspaces") {
				setFocusArea(enterFocus(screen, focusArea));
				log("info", "files focus entered");
			} else if (screen === "remotes" && focusArea === "workspaces") {
				setFocusArea(enterFocus(screen, focusArea));
				log("info", "remotes focus entered");
			} else if (focusArea === "actions") {
				runAction(actions[selectedActionIndex]);
			} else if (focusArea === "files") {
				void openSelectedFileEntry();
			} else if (focusArea === "remotes") {
				void selectRemoteProfile();
			}
		}

		if (focusArea === "files" && input === "u") {
			void goToParentDirectory();
		}

		if (focusArea === "files" && input === "b") {
			void goBackFileHistory();
		}

		if (focusArea === "files" && input === "f") {
			setFileFilter((current) => openFileFilter(current.query));
			setSelectedFileIndex(0);
			log("info", "file filter opened");
			return;
		}

		if (focusArea === "files" && input === "c") {
			openSelectedFileOperation("copy");
			return;
		}

		if (focusArea === "files" && input === "m") {
			openSelectedFileOperation("move");
			return;
		}

		if (focusArea === "files" && input === "x") {
			openSelectedFileOperation("delete");
			return;
		}

		if (focusArea === "files" && input === "g") {
			void jumpToNextLocation();
		}

		if (focusArea === "files") {
			const locationIndex = getLocationShortcutIndex(
				input,
				fileLocations.length,
			);
			if (locationIndex !== undefined) {
				void jumpToLocation(locationIndex);
				return;
			}
		}

		if (focusArea === "files" && input === ":") {
			setCommandLine(openCommandLine("path"));
			log("info", "path command opened");
		}

		if (screen === "routes" && focusArea === "workspaces" && input === ":") {
			setCommandLine(openCommandLine("route"));
			log("info", "route destination prompt opened");
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "f") {
			setCommandLine(openCommandLine("route-filter"));
			setRouteCopyPreview(false);
			log("info", "route filter opened");
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "F") {
			setRouteFilter("");
			setRouteCopyPreview(false);
			log("info", "route filter cleared");
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "P") {
			if (!routeFilter.trim()) {
				log("warn", "no route filter to save");
				return;
			}
			setRouteFilterPresets((current) => {
				const next = saveRouteFilterPreset(current, routeFilter);
				void setConfigRouteFilterPresets(next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `route preset save failed ${caught.message}`
							: `route preset save failed ${String(caught)}`,
					),
				);
				return next;
			});
			setRouteCopyPreview(false);
			log("info", `route preset saved ${routeFilter}`);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "D") {
			const preview = createRouteFilterCleanupPreview(routeFilterPresets);
			if (!preview) {
				log("warn", "no route filter presets to clean");
				return;
			}
			setCommandLine(openCommandLine("route-filter-cleanup"));
			setRouteCopyPreview(false);
			log("warn", `route filter cleanup confirm ${preview.confirmationPhrase}`);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "]") {
			const preset = nextRouteFilterPreset(routeFilterPresets, routeFilter);
			if (!preset) {
				log("warn", "no route filter presets");
				return;
			}
			const filtered = filterRouteEntries(routeTable?.routes ?? [], preset);
			setRouteFilter(preset);
			setRouteCopyPreview(false);
			log(
				filtered.length ? "info" : "warn",
				`route preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && key.tab) {
			setRouteDetailView((current) => {
				const next = nextRouteDetailView(current);
				log("info", `route detail ${next}`);
				return next;
			});
			setRouteCopyPreview(false);
			return;
		}

		if (screen === "interfaces" && focusArea === "workspaces" && key.tab) {
			setInterfaceDetailView((current) => {
				const next = nextInterfaceDetailView(current);
				log("info", `interfaces detail ${next}`);
				return next;
			});
			return;
		}

		if (screen === "connections" && focusArea === "workspaces" && key.tab) {
			setConnectionDetailView((current) => {
				const next = nextEndpointDetailView(current);
				log("info", `connections detail ${next}`);
				return next;
			});
			setConnectionCopyPreview(false);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && key.tab) {
			setPortDetailView((current) => {
				const next = nextEndpointDetailView(current);
				log("info", `ports detail ${next}`);
				return next;
			});
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "f"
		) {
			setCommandLine(
				openCommandLine(`${endpointFilterPromptPrefix}connections`),
			);
			log("info", "connections filter opened");
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "f") {
			setCommandLine(openCommandLine(`${endpointFilterPromptPrefix}ports`));
			log("info", "ports filter opened");
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "F"
		) {
			setConnectionFilter("");
			setConnectionCopyPreview(false);
			setSelectedConnectionIndex(0);
			log("info", "connections filter cleared");
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "F") {
			setPortFilter("");
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			setSelectedPortIndex(0);
			log("info", "ports filter cleared");
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "P"
		) {
			if (!connectionFilter.trim()) {
				log("warn", "no connections filter to save");
				return;
			}
			setConnectionFilterPresets((current) => {
				const next = saveEndpointFilterPreset(current, connectionFilter);
				void setConfigEndpointFilterPresets("connections", next).catch(
					(caught) =>
						log(
							"fail",
							caught instanceof Error
								? `connections preset save failed ${caught.message}`
								: `connections preset save failed ${String(caught)}`,
						),
				);
				return next;
			});
			setConnectionCopyPreview(false);
			log("info", `connections preset saved ${connectionFilter}`);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "D"
		) {
			const preview = createEndpointFilterCleanupPreview(
				"connections",
				connectionFilterPresets,
			);
			if (!preview) {
				log("warn", "no connections filter presets to clean");
				return;
			}
			setCommandLine(
				openCommandLine(`${endpointFilterCleanupPromptPrefix}connections`),
			);
			setConnectionCopyPreview(false);
			log(
				"warn",
				`connections filter cleanup confirm ${preview.confirmationPhrase}`,
			);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "P") {
			if (!portFilter.trim()) {
				log("warn", "no ports filter to save");
				return;
			}
			setPortFilterPresets((current) => {
				const next = saveEndpointFilterPreset(current, portFilter);
				void setConfigEndpointFilterPresets("ports", next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `ports preset save failed ${caught.message}`
							: `ports preset save failed ${String(caught)}`,
					),
				);
				return next;
			});
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			log("info", `ports preset saved ${portFilter}`);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "D") {
			const preview = createEndpointFilterCleanupPreview(
				"ports",
				portFilterPresets,
			);
			if (!preview) {
				log("warn", "no ports filter presets to clean");
				return;
			}
			setCommandLine(
				openCommandLine(`${endpointFilterCleanupPromptPrefix}ports`),
			);
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			log("warn", `ports filter cleanup confirm ${preview.confirmationPhrase}`);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "]"
		) {
			const preset = nextEndpointFilterPreset(
				connectionFilterPresets,
				connectionFilter,
			);
			if (!preset) {
				log("warn", "no connections filter presets");
				return;
			}
			const filtered = filterConnections(connections, preset);
			setConnectionFilter(preset);
			setConnectionCopyPreview(false);
			setSelectedConnectionIndex(0);
			log(
				filtered.length ? "info" : "warn",
				`connections preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "]") {
			const preset = nextEndpointFilterPreset(portFilterPresets, portFilter);
			if (!preset) {
				log("warn", "no ports filter presets");
				return;
			}
			const filtered = filterListeningPorts(ports, preset);
			setPortFilter(preset);
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			setSelectedPortIndex(0);
			log(
				filtered.length ? "info" : "warn",
				`ports preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "s"
		) {
			setConnectionSort((current) => {
				const next = nextConnectionSort(current);
				void setConfigEndpointSort("connections", next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `connections sort save failed ${caught.message}`
							: `connections sort save failed ${String(caught)}`,
					),
				);
				log("info", `connections sort ${next.key} ${next.direction}`);
				return next;
			});
			setConnectionCopyPreview(false);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "s") {
			setPortSort((current) => {
				const next = nextPortSort(current);
				void setConfigEndpointSort("ports", next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `ports sort save failed ${caught.message}`
							: `ports sort save failed ${String(caught)}`,
					),
				);
				log("info", `ports sort ${next.key} ${next.direction}`);
				return next;
			});
			setPortCopyPreview(false);
			setPortProcessControlPreview(false);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "c"
		) {
			const preview = getSelectedConnectionClipboardPreview(
				sortedConnections,
				selectedConnectionIndex,
			);
			if (!preview) {
				log("warn", "no connection selected");
				return;
			}
			setConnectionCopyPreview(true);
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "c") {
			const preview = getSelectedPortClipboardPreview(
				sortedPorts,
				selectedPortIndex,
			);
			if (!preview) {
				log("warn", "no port selected");
				return;
			}
			setPortCopyPreview(true);
			setPortProcessControlPreview(false);
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "K") {
			const preview = createSelectedPortProcessControlPreview(
				sortedPorts,
				selectedPortIndex,
			);
			if (!preview) {
				log("warn", "no port process selected");
				return;
			}
			setPortProcessControlPreview(true);
			setPortCopyPreview(false);
			setCommandLine(openCommandLine(portProcessControlPrompt));
			log(
				"warn",
				`ports process control confirm ${preview.confirmationPhrase}`,
			);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "I") {
			const preview = createSelectedPortProcessControlPreview(
				sortedPorts,
				selectedPortIndex,
			);
			if (!preview) {
				log("warn", "no port process policy to inspect");
				return;
			}
			const next = !portProcessControlInspector;
			setPortProcessControlInspector(next);
			if (next) {
				void (async () => {
					setCommandStatus("running");
					setSelectedProcessFileEvidenceIssue(undefined);
					try {
						const files = await getProcessFileSnapshot(preview.port.pid);
						setSelectedProcessFiles(files);
						setSelectedProcessFileEvidenceIssue(
							files
								? undefined
								: {
										status: "unavailable",
										pid: preview.port.pid,
										reason: "no snapshot returned",
									},
						);
						log(
							files ? "info" : "warn",
							files
								? `ports file evidence loaded pid ${preview.port.pid}`
								: `ports file evidence unavailable pid=${preview.port.pid} reason=no snapshot returned`,
						);
					} catch (caught) {
						log(
							"fail",
							caught instanceof Error
								? `ports file evidence failed ${caught.message}`
								: `ports file evidence failed ${String(caught)}`,
						);
						setSelectedProcessFiles(undefined);
						setSelectedProcessFileEvidenceIssue({
							status: "error",
							pid: preview.port.pid,
							reason: caught instanceof Error ? caught.message : String(caught),
						});
					} finally {
						setCommandStatus("idle");
					}
				})();
			}
			log(
				"info",
				next
					? `ports process policy inspector ${preview.port.pid}`
					: "ports process policy inspector hidden",
			);
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "e"
		) {
			void exportEndpointHandoff("connections");
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "e") {
			void exportEndpointHandoff("ports");
			return;
		}

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "o"
		) {
			void openEndpointHandoff("connections");
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "o") {
			void openEndpointHandoff("ports");
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "n") {
			const handoff = updateCheckResult
				? createUpdateReleaseHandoff(updateCheckResult)
				: undefined;
			if (!handoff) {
				log("warn", "no update handoff links");
				return;
			}
			const links = getUpdateReleaseHandoffLinks(handoff);
			setSelectedUpdateHandoffIndex((index) => {
				const next = (index + 1) % links.length;
				log("info", `update handoff selected ${links[next].label}`);
				return next;
			});
			return;
		}

		if (
			screen === "status" &&
			focusArea === "workspaces" &&
			(key.downArrow || input === "j")
		) {
			if (cleanupShelfIndex.activeShelves === 0) {
				log("warn", "no cleanup shelves with saved items");
				return;
			}
			setSelectedCleanupShelfIndex((index) => {
				const next = moveCleanupShelfSelection(
					cleanupShelfIndex,
					index,
					"next",
				);
				const shelf = getSelectedCleanupShelf(cleanupShelfIndex, next);
				log("info", `cleanup shelf selected ${shelf?.label ?? next + 1}`);
				return next;
			});
			return;
		}

		if (
			screen === "status" &&
			focusArea === "workspaces" &&
			(key.upArrow || input === "k")
		) {
			if (cleanupShelfIndex.activeShelves === 0) {
				log("warn", "no cleanup shelves with saved items");
				return;
			}
			setSelectedCleanupShelfIndex((index) => {
				const next = moveCleanupShelfSelection(
					cleanupShelfIndex,
					index,
					"previous",
				);
				const shelf = getSelectedCleanupShelf(cleanupShelfIndex, next);
				log("info", `cleanup shelf selected ${shelf?.label ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "[") {
			if (cleanupHandoffHistory.length === 0) {
				log("warn", "no cleanup handoff history");
				return;
			}
			setSelectedCleanupHandoffHistoryIndex((index) => {
				const next = moveCleanupHandoffHistorySelection(
					cleanupHandoffHistory,
					index,
					"next",
				);
				const history = getSelectedCleanupHandoffHistory(
					cleanupHandoffHistory,
					next,
				);
				log("info", `cleanup history selected ${history?.label ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "R") {
			reopenCleanupHandoffHistory();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "E") {
			void exportCleanupHandoffHistory();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "\r") {
			const shelf = getSelectedCleanupShelf(
				cleanupShelfIndex,
				selectedCleanupShelfIndex,
			);
			if (!shelf) {
				log("warn", "no cleanup shelf selected");
				return;
			}
			setCleanupJumpAudit(createCleanupJumpAudit(shelf));
			setScreen(shelf.screen);
			log(
				"info",
				`cleanup handoff ${shelf.label}: press ${shelf.shortcut} then type ${shelf.confirmationPhrase}`,
			);
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "H") {
			void refreshHandoffIndex();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "Y") {
			void refreshCleanupExportIndex();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "T") {
			void refreshAuditExportIndex();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "U") {
			void refreshAuditExportArchiveIndex();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "B") {
			void refreshCleanupExportArchiveIndex();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "}") {
			if (cleanupExportIndex.items.length === 0) {
				log("warn", "no cleanup exports indexed");
				return;
			}
			setSelectedCleanupExportIndex((index) => {
				const next = (index + 1) % cleanupExportIndex.items.length;
				const item = cleanupExportIndex.items[next];
				log("info", `cleanup export selected ${item?.fileName ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === ")") {
			if (auditExportIndex.items.length === 0) {
				log("warn", "no audit exports indexed");
				return;
			}
			setSelectedAuditExportIndex((index) => {
				const next = (index + 1) % auditExportIndex.items.length;
				const item = auditExportIndex.items[next];
				log("info", `audit export selected ${item?.fileName ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "(") {
			if (auditExportArchiveIndex.items.length === 0) {
				log("warn", "no audit archive indexed");
				return;
			}
			setSelectedAuditExportArchiveIndex((index) => {
				const next = (index + 1) % auditExportArchiveIndex.items.length;
				const item = auditExportArchiveIndex.items[next];
				log("info", `audit archive selected ${item?.fileName ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "{") {
			if (cleanupExportArchiveIndex.items.length === 0) {
				log("warn", "no cleanup archive indexed");
				return;
			}
			setSelectedCleanupExportArchiveIndex((index) => {
				const next = (index + 1) % cleanupExportArchiveIndex.items.length;
				const item = cleanupExportArchiveIndex.items[next];
				log("info", `cleanup archive selected ${item?.fileName ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "V") {
			openSelectedCleanupExportFile();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "W") {
			openSelectedAuditExportFile();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "J") {
			openSelectedAuditExportArchiveFile();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "M") {
			openAuditArchiveRetentionPreview();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "Z") {
			openSelectedAuditExportArchive();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "X") {
			openSelectedCleanupExportArchive();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "]") {
			if (handoffIndex.items.length === 0) {
				log("warn", "no handoff files indexed");
				return;
			}
			setSelectedHandoffIndex((index) => {
				const next = (index + 1) % handoffIndex.items.length;
				const item = handoffIndex.items[next];
				log("info", `handoff selected ${item?.label ?? next + 1}`);
				return next;
			});
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "O") {
			openSelectedHandoffFile();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "A") {
			void archiveSelectedHandoffFile();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "c") {
			openSelectedUpdateHandoffClipboard();
			return;
		}

		if (screen === "status" && focusArea === "workspaces" && input === "o") {
			openSelectedUpdateHandoffExternal();
			return;
		}

		if (screen === "processes" && focusArea === "workspaces" && input === "c") {
			if (getProcessFileSelectionCount(selectedProcessFiles) <= 0) {
				log("warn", "no process resource selected");
				return;
			}
			const preview = getSelectedProcessClipboardPreview(
				selectedProcessFiles,
				selectedProcessFileIndex,
			);
			if (!preview) {
				log("warn", "no process resource selected");
				return;
			}
			setProcessClipboardPreview(true);
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "s") {
			setRouteSort((current) => {
				const next = nextRouteSort(current);
				log("info", `route sort ${next.key} ${next.direction}`);
				return next;
			});
			setRouteCopyPreview(false);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "c") {
			if (!routeTable) {
				log("warn", "no route table loaded");
				return;
			}
			const preview = getRouteClipboardPreview(routeTable, {
				filter: routeFilter,
				path: routePath,
				sort: routeSort,
				view: routeDetailView,
			});
			if (!preview) {
				log("warn", "no route clipboard target");
				return;
			}
			setRouteCopyPreview(true);
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "e") {
			void exportRouteHandoff();
			return;
		}

		if (screen === "routes" && focusArea === "workspaces" && input === "o") {
			void openRouteHandoff();
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "t") {
			setTimelineFilter((current) => {
				const next = nextTimelineFilter(current);
				log("info", `timeline filter ${next}`);
				return next;
			});
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "f") {
			setCommandLine(openCommandLine("timeline-search"));
			log("info", "timeline search opened");
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "F") {
			setTimelineSearchQuery("");
			log("info", "timeline search cleared");
			return;
		}

		if (
			screen === "timeline" &&
			focusArea === "workspaces" &&
			(input === "j" || input === "k")
		) {
			if (visibleTimelineEvents.length === 0) {
				log("warn", "no timeline row to select");
				return;
			}
			const next = moveTimelineSelection(
				selectedTimelineIndex,
				input === "j" ? 1 : -1,
				visibleTimelineEvents.length,
			);
			setSelectedTimelineIndex(next);
			log(
				"info",
				`timeline selected ${next + 1}/${visibleTimelineEvents.length}`,
			);
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "c") {
			const preview = getSelectedTimelineClipboardPreview(events, {
				filter: timelineFilter,
				query: timelineSearchQuery,
				selectedIndex: selectedTimelineIndex,
			});
			if (!preview) {
				log("warn", "no timeline row to copy");
				return;
			}
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "e") {
			const plan = getSelectedTimelineAuditExportPlan(events, {
				baseDir: dirname(getConfigPath()),
				filter: timelineFilter,
				query: timelineSearchQuery,
				selectedIndex: selectedTimelineIndex,
			});
			if (!plan) {
				log("warn", "no timeline row to export");
				return;
			}
			void writeConsoleAuditExport(plan)
				.then((written) => {
					log(
						"ok",
						`audit selected exported ${written.path} events=${written.eventCount}`,
					);
				})
				.catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `audit selected export failed ${caught.message}`
							: `audit selected export failed ${String(caught)}`,
					),
				);
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "P") {
			if (!timelineSearchQuery.trim()) {
				log("warn", "no timeline search to save");
				return;
			}
			setTimelineSearchPresets((current) =>
				saveTimelineSearchPreset(current, timelineSearchQuery),
			);
			log("info", `timeline preset saved ${timelineSearchQuery}`);
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "D") {
			const preview = createTimelineSearchCleanupPreview(timelineSearchPresets);
			if (!preview) {
				log("warn", "no timeline search presets to clean");
				return;
			}
			setCommandLine(openCommandLine("timeline-search-cleanup"));
			log(
				"warn",
				`timeline search cleanup confirm ${preview.confirmationPhrase}`,
			);
			return;
		}

		if (screen === "timeline" && focusArea === "workspaces" && input === "]") {
			const preset = nextTimelineSearchPreset(
				timelineSearchPresets,
				timelineSearchQuery,
			);
			if (!preset) {
				log("warn", "no timeline search presets");
				return;
			}
			const filtered = filterTimelineEvents(events, preset, timelineFilter);
			setTimelineSearchQuery(preset);
			log(
				filtered.length ? "info" : "warn",
				`timeline preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "e") {
			setLogLevelFilter((current) => {
				const next = nextOsLogLevelFilter(current);
				const filtered = filterOsLogEntries(
					osLogs?.entries ?? [],
					logSearchQuery,
					next,
				);
				log(
					filtered.length ? "info" : "warn",
					`logs level ${next} matches ${filtered.length}`,
				);
				return next;
			});
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "f") {
			setCommandLine(openCommandLine("log-search"));
			log("info", "logs search opened");
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "F") {
			setLogSearchQuery("");
			log("info", "logs search cleared");
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "P") {
			if (!logSearchQuery.trim()) {
				log("warn", "no logs search to save");
				return;
			}
			setLogSearchPresets((current) => {
				const next = saveLogSearchPreset(current, logSearchQuery);
				void setConfigLogSearchPresets(next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `logs preset save failed ${caught.message}`
							: `logs preset save failed ${String(caught)}`,
					),
				);
				return next;
			});
			log("info", `logs preset saved ${logSearchQuery}`);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "]") {
			const preset = nextLogSearchPreset(logSearchPresets, logSearchQuery);
			if (!preset) {
				log("warn", "no logs search presets");
				return;
			}
			const filtered = filterOsLogEntries(
				osLogs?.entries ?? [],
				preset,
				logLevelFilter,
			);
			setLogSearchQuery(preset);
			log(
				filtered.length ? "info" : "warn",
				`logs preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "S") {
			const profile = { level: logLevelFilter, query: logSearchQuery };
			setLogProfiles((current) => {
				const next = saveLogProfile(current, profile);
				void setConfigLogProfiles(next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `logs profile save failed ${caught.message}`
							: `logs profile save failed ${String(caught)}`,
					),
				);
				return next;
			});
			log("info", `logs profile saved ${formatLogProfileLabel(profile)}`);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "}") {
			const profile = nextLogProfile(logProfiles, {
				level: logLevelFilter,
				query: logSearchQuery,
			});
			if (!profile) {
				log("warn", "no logs profiles");
				return;
			}
			const filtered = filterOsLogEntries(
				osLogs?.entries ?? [],
				profile.query,
				profile.level,
			);
			setLogLevelFilter(profile.level);
			setLogSearchQuery(profile.query);
			log(
				filtered.length ? "info" : "warn",
				`logs profile ${formatLogProfileLabel(profile)} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "D") {
			const preview = createLogCleanupPreview(logSearchPresets, logProfiles);
			if (!preview) {
				log("warn", "no logs presets to clean");
				return;
			}
			setCommandLine(openCommandLine("logs-cleanup"));
			log("warn", `logs cleanup confirm ${preview.confirmationPhrase}`);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "L") {
			const next = !logFollowEnabled;
			setLogFollowEnabled(next);
			log(next ? "info" : "warn", `logs follow ${next ? "on" : "off"}`);
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "C") {
			setLogFollowRefreshCount(0);
			setLogFollowLastStatus("idle");
			setLogFollowHistory([]);
			log("info", "logs follow state cleared");
			return;
		}

		if (screen === "logs" && focusArea === "workspaces" && input === "r") {
			void (async () => {
				try {
					const snapshot = await createOsLogSnapshot({ limit: 50 });
					setOsLogs(snapshot);
					log(
						snapshot.status === "ok" ? "ok" : "warn",
						`logs refreshed ${snapshot.entries.length}`,
					);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error ? caught.message : String(caught),
					);
				}
			})();
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "f") {
			setCommandLine(openCommandLine("tool-filter"));
			log("info", "tool history filter opened");
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "F") {
			setToolHistoryFilter("");
			setToolCopyPreview(false);
			setSelectedToolHistoryIndex((index) =>
				Math.min(index, Math.max(0, toolHistory.length - 1)),
			);
			log("info", "tool history filter cleared");
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "P") {
			if (!toolHistoryFilter.trim()) {
				log("warn", "no tools filter to save");
				return;
			}
			setToolHistoryFilterPresets((current) => {
				const next = saveToolHistoryPreset(current, toolHistoryFilter);
				void setConfigToolHistoryPreferences({ filterPresets: next }).catch(
					(caught) =>
						log(
							"fail",
							caught instanceof Error
								? `tools preset save failed ${caught.message}`
								: `tools preset save failed ${String(caught)}`,
						),
				);
				return next;
			});
			log("info", `tools preset saved ${toolHistoryFilter}`);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "C") {
			const preview = createToolHistoryCleanupPreview(toolHistoryFilterPresets);
			if (!preview) {
				log("warn", "no tools filter presets to clean");
				return;
			}
			setCommandLine(openCommandLine("tool-history-cleanup"));
			setToolCopyPreview(false);
			log(
				"warn",
				`tool history filter cleanup confirm ${preview.confirmationPhrase}`,
			);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "]") {
			const preset = nextToolHistoryPreset(
				toolHistoryFilterPresets,
				toolHistoryFilter,
			);
			if (!preset) {
				log("warn", "no tools filter presets");
				return;
			}
			const filtered = filterToolHistory(toolHistory, preset);
			setToolHistoryFilter(preset);
			setToolCopyPreview(false);
			setSelectedToolHistoryIndex(filtered[0]?.index ?? 0);
			log(
				filtered.length ? "info" : "warn",
				`tools preset ${preset} matches ${filtered.length}`,
			);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && key.tab) {
			setToolHistoryDetailView((current) => {
				const next = nextToolHistoryDetailView(current);
				void setConfigToolHistoryPreferences({ detailView: next }).catch(
					(caught) =>
						log(
							"fail",
							caught instanceof Error
								? `tools detail save failed ${caught.message}`
								: `tools detail save failed ${String(caught)}`,
						),
				);
				log("info", `tools detail ${next}`);
				return next;
			});
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "s") {
			setToolHistorySort((current) => {
				const next = nextToolHistorySort(current);
				void setConfigToolHistoryPreferences({ sort: next }).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `tools sort save failed ${caught.message}`
							: `tools sort save failed ${String(caught)}`,
					),
				);
				log("info", `tools sort ${next}`);
				return next;
			});
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "G") {
			setToolHistoryGroup((current) => {
				const next = nextToolHistoryGroup(current);
				void setConfigToolHistoryPreferences({ group: next }).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `tools group save failed ${caught.message}`
							: `tools group save failed ${String(caught)}`,
					),
				);
				log("info", `tools group ${next}`);
				return next;
			});
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "r") {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const plan = rerunToolHistoryItem(
				getSelectedToolHistoryItem(toolHistory, visibleToolHistoryIndex),
			);
			if (!plan) {
				log("warn", "no tool history selected");
				return;
			}
			void (async () => {
				try {
					const result = await runTool(plan.toolId, plan.args, {
						timeoutMs: 10000,
					});
					setToolHistory((current) => {
						const next = appendToolHistory(current, { plan, result });
						setSelectedToolHistoryIndex(Math.max(0, next.length - 1));
						return next;
					});
					log("ok", `${plan.label} rerun completed`);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error ? caught.message : String(caught),
					);
				}
			})();
			return;
		}

		if (
			screen === "tools" &&
			focusArea === "workspaces" &&
			(input === "n" || input === "N")
		) {
			setSelectedToolTargetPresetIndex((index) => {
				const next = moveToolTargetPresetSelection(
					index,
					toolTargetPresets.length,
					input === "N" ? "previous" : "next",
				);
				const preset = toolTargetPresets[next];
				if (preset) {
					log("info", `tool target ${preset.label} ${preset.target}`);
				}
				return next;
			});
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "T") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset to save");
				return;
			}
			setCustomToolTargetPresets((current) => {
				const next = saveToolTargetPreset(
					current,
					preset,
					toolTargetPresetLimit,
				);
				void setConfigToolTargetPresets(next).catch((caught) =>
					log(
						"fail",
						caught instanceof Error
							? `tool target save failed ${caught.message}`
							: `tool target save failed ${String(caught)}`,
					),
				);
				return next;
			});
			log("info", `tool target saved ${preset.label} ${preset.target}`);
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "U") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const next = promoteToolTargetPreset(customToolTargetPresets, preset);
			const changed = next.some(
				(current, index) =>
					`${current.actionId}:${current.target}` !==
					`${customToolTargetPresets[index]?.actionId}:${customToolTargetPresets[index]?.target}`,
			);
			if (!changed) {
				log(
					"warn",
					`tool target ${preset.label} is not a movable saved preset`,
				);
				return;
			}
			setCustomToolTargetPresets(next);
			setSelectedToolTargetPresetIndex(0);
			void setConfigToolTargetPresets(next).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target pin failed ${caught.message}`
						: `tool target pin failed ${String(caught)}`,
				),
			);
			log("info", `tool target pinned ${preset.label} ${preset.target}`);
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "X") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const next = removeToolTargetPreset(customToolTargetPresets, preset);
			if (next.length === customToolTargetPresets.length) {
				log("warn", `tool target ${preset.label} is not a saved preset`);
				return;
			}
			setCustomToolTargetPresets(next);
			setSelectedToolTargetPresetIndex((index) =>
				Math.min(index, Math.max(0, next.length - 1)),
			);
			void setConfigToolTargetPresets(next).catch((caught) =>
				log(
					"fail",
					caught instanceof Error
						? `tool target delete failed ${caught.message}`
						: `tool target delete failed ${String(caught)}`,
				),
			);
			log("info", `tool target removed ${preset.label} ${preset.target}`);
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "D") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const preview = createToolTargetCleanupPreview(
				customToolTargetPresets,
				preset,
			);
			if (!preview) {
				log("warn", `tool target ${preset.label} is not a saved preset`);
				return;
			}
			setCommandLine(openCommandLine("tool-target-cleanup"));
			log("warn", `tool target cleanup confirm ${preview.confirmationPhrase}`);
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "L") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const saved = customToolTargetPresets.some(
				(current) =>
					`${current.actionId}:${current.target}` ===
					`${preset.actionId}:${preset.target}`,
			);
			if (!saved) {
				log("warn", `tool target ${preset.label} is not a saved preset`);
				return;
			}
			setCommandLine(openCommandLine("tool-target-label"));
			setToolCopyPreview(false);
			log("info", `tool target label opened ${preset.label}`);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "M") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const saved = customToolTargetPresets.some(
				(current) =>
					`${current.actionId}:${current.target}` ===
					`${preset.actionId}:${preset.target}`,
			);
			if (!saved) {
				log("warn", `tool target ${preset.label} is not a saved preset`);
				return;
			}
			setCommandLine(openCommandLine("tool-target-value"));
			setToolCopyPreview(false);
			log("info", `tool target value opened ${preset.label}`);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "A") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target preset selected");
				return;
			}
			const saved = customToolTargetPresets.some(
				(current) =>
					`${current.actionId}:${current.target}` ===
					`${preset.actionId}:${preset.target}`,
			);
			if (!saved) {
				log("warn", `tool target ${preset.label} is not a saved preset`);
				return;
			}
			setCommandLine(openCommandLine("tool-target-action"));
			setToolCopyPreview(false);
			log("info", `tool target action opened ${preset.label}`);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "R") {
			const preset =
				toolTargetPresets[
					Math.min(
						Math.max(selectedToolTargetPresetIndex, 0),
						toolTargetPresets.length - 1,
					)
				];
			if (!preset) {
				log("warn", "no tool target presets");
				return;
			}
			const plan = createToolRunPlanFromPreset(preset);
			if (!plan) {
				log("warn", `cannot run tool preset ${preset.label}`);
				return;
			}
			void (async () => {
				try {
					await runToolPlan(plan);
					log("ok", `${preset.label} completed`);
				} catch (caught) {
					log(
						"fail",
						caught instanceof Error ? caught.message : String(caught),
					);
				}
			})();
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "c") {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const preview = getSelectedToolOutputClipboardPreview(
				toolHistory,
				visibleToolHistoryIndex,
			);
			if (!preview) {
				log("warn", "no tool output selected");
				return;
			}
			setToolCopyPreview("raw");
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "y") {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const preview = getSelectedToolSummaryClipboardPreview(
				toolHistory,
				visibleToolHistoryIndex,
			);
			if (!preview) {
				log("warn", "no tool summary selected");
				return;
			}
			setToolCopyPreview("summary");
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "V") {
			setToolSectionClipboardSelection((current) => {
				const next = nextToolSectionClipboardSelection(current);
				log("info", `tools copy section ${next}`);
				return next;
			});
			setToolSectionClipboardRowIndex(0);
			setToolCopyPreview(false);
			return;
		}

		if (
			screen === "tools" &&
			focusArea === "workspaces" &&
			(input === "." || input === ",")
		) {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			setToolSectionClipboardRowIndex((current) =>
				moveToolSectionClipboardRow(
					toolHistory,
					visibleToolHistoryIndex,
					toolSectionClipboardSelection,
					current,
					input === "." ? "next" : "previous",
				),
			);
			setToolCopyPreview(false);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "b") {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const preview = getSelectedToolSectionRowClipboardPreview(
				toolHistory,
				visibleToolHistoryIndex,
				toolSectionClipboardSelection,
				toolSectionClipboardRowIndex,
			);
			if (!preview) {
				log("warn", `no tool ${toolSectionClipboardSelection} row selected`);
				return;
			}
			setToolCopyPreview("row");
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "v") {
			const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
				toolHistory,
				selectedToolHistoryIndex,
				toolHistoryFilter,
				toolHistorySort,
			);
			const preview = getSelectedToolSectionClipboardPreview(
				toolHistory,
				visibleToolHistoryIndex,
				toolSectionClipboardSelection,
			);
			if (!preview) {
				log("warn", `no tool ${toolSectionClipboardSelection} fields selected`);
				return;
			}
			setToolCopyPreview(toolSectionClipboardSelection);
			openClipboardConfirmation(preview);
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "e") {
			void exportToolHistory("selected");
			return;
		}

		if (screen === "tools" && focusArea === "workspaces" && input === "E") {
			void exportToolHistory("all");
			return;
		}

		if (key.escape) {
			setFocusArea((current) => leaveFocus(current));
		}

		if (key.rightArrow || input === "l") {
			if (focusArea === "actions") {
				setFocusArea("workspaces");
			} else {
				setScreen((current) => moveScreen(current, "next"));
			}
		}
		if (key.leftArrow || input === "h") {
			if (
				focusArea === "actions" ||
				focusArea === "files" ||
				focusArea === "remotes"
			) {
				setFocusArea("workspaces");
			} else {
				setScreen((current) => moveScreen(current, "previous"));
			}
		}

		if (key.downArrow || input === "j") {
			if (focusArea === "actions") {
				setSelectedActionIndex((index) =>
					getNextIndex(index, actions.length, "next"),
				);
			} else if (focusArea === "files") {
				setSelectedFileIndex((index) =>
					getNextIndex(index, displayedFileEntries.length, "next"),
				);
			} else if (focusArea === "remotes") {
				setSelectedRemoteIndex((index) =>
					getNextIndex(index, remoteProfiles.length, "next"),
				);
			} else if (screen === "connections") {
				setSelectedConnectionIndex((index) =>
					getNextIndex(index, sortedConnections.length, "next"),
				);
				setConnectionCopyPreview(false);
			} else if (screen === "ports") {
				setSelectedPortIndex((index) =>
					getNextIndex(index, sortedPorts.length, "next"),
				);
				setPortCopyPreview(false);
				setPortProcessControlPreview(false);
			} else if (screen === "interfaces") {
				setSelectedInterfaceIndex((index) =>
					getNextInterfaceIndex(index, summary?.interfaces.length ?? 0, "down"),
				);
			} else if (screen === "processes") {
				setSelectedProcessFileIndex((index) =>
					getNextIndex(
						index,
						getProcessFileSelectionCount(selectedProcessFiles),
						"next",
					),
				);
				setProcessClipboardPreview(false);
			} else if (screen === "tools") {
				setSelectedToolHistoryIndex((index) =>
					toolHistoryFilter || toolHistorySort !== "time"
						? moveFilteredToolHistorySelection(
								toolHistory,
								index,
								toolHistoryFilter,
								"next",
								toolHistorySort,
							)
						: moveToolHistorySelection(index, toolHistory.length, "next"),
				);
				setToolSectionClipboardRowIndex(0);
				setToolCopyPreview(false);
			} else {
				setScreen((current) => moveScreen(current, "next"));
			}
		}

		if (key.upArrow || input === "k") {
			if (focusArea === "actions") {
				setSelectedActionIndex((index) =>
					getNextIndex(index, actions.length, "previous"),
				);
			} else if (focusArea === "files") {
				setSelectedFileIndex((index) =>
					getNextIndex(index, displayedFileEntries.length, "previous"),
				);
			} else if (focusArea === "remotes") {
				setSelectedRemoteIndex((index) =>
					getNextIndex(index, remoteProfiles.length, "previous"),
				);
			} else if (screen === "connections") {
				setSelectedConnectionIndex((index) =>
					getNextIndex(index, sortedConnections.length, "previous"),
				);
				setConnectionCopyPreview(false);
			} else if (screen === "ports") {
				setSelectedPortIndex((index) =>
					getNextIndex(index, sortedPorts.length, "previous"),
				);
				setPortCopyPreview(false);
				setPortProcessControlPreview(false);
			} else if (screen === "interfaces") {
				setSelectedInterfaceIndex((index) =>
					getNextInterfaceIndex(index, summary?.interfaces.length ?? 0, "up"),
				);
			} else if (screen === "processes") {
				setSelectedProcessFileIndex((index) =>
					getNextIndex(
						index,
						getProcessFileSelectionCount(selectedProcessFiles),
						"previous",
					),
				);
				setProcessClipboardPreview(false);
			} else if (screen === "tools") {
				setSelectedToolHistoryIndex((index) =>
					toolHistoryFilter || toolHistorySort !== "time"
						? moveFilteredToolHistorySelection(
								toolHistory,
								index,
								toolHistoryFilter,
								"previous",
								toolHistorySort,
							)
						: moveToolHistorySelection(index, toolHistory.length, "previous"),
				);
				setToolSectionClipboardRowIndex(0);
				setToolCopyPreview(false);
			} else {
				setScreen((current) => moveScreen(current, "previous"));
			}
		}

		const shortcut = getScreenByShortcut(input);
		if (shortcut) {
			setFocusArea("workspaces");
			setScreen(shortcut);
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
					fileLocations={fileLocations}
					selectedFileIndex={selectedFileIndex}
					selectedLocationIndex={selectedLocationIndex}
					commandLine={commandLine}
					fileFilter={fileFilter}
					fileOperationDialog={fileOperationDialog}
					editorPreview={editorPreview}
					remoteProfiles={remoteProfiles}
					selectedRemoteIndex={selectedRemoteIndex}
					remoteFileContext={remoteFileContext}
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
					selectedConnectionIndex={selectedConnectionIndex}
					selectedPortIndex={selectedPortIndex}
					connectionDetailView={connectionDetailView}
					portDetailView={portDetailView}
					connectionCopyPreview={connectionCopyPreview}
					portCopyPreview={portCopyPreview}
					portProcessControlPreview={portProcessControlPreview}
					selectedProcessDetail={selectedProcessDetail}
					selectedProcessFiles={selectedProcessFiles}
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
	fileLocations,
	selectedFileIndex,
	selectedLocationIndex,
	commandLine,
	fileFilter,
	fileOperationDialog,
	editorPreview,
	remoteProfiles,
	selectedRemoteIndex,
	remoteFileContext,
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
	selectedConnectionIndex,
	selectedPortIndex,
	connectionDetailView,
	portDetailView,
	connectionCopyPreview,
	portCopyPreview,
	portProcessControlPreview,
	selectedProcessDetail,
	selectedProcessFiles,
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
	cleanupShelfIndex,
	selectedCleanupShelfIndex,
	cleanupJumpAudit,
	cleanupHandoffHistory,
	selectedCleanupHandoffHistoryIndex,
	cleanupExportIndex: _cleanupExportIndex,
	selectedCleanupExportIndex: _selectedCleanupExportIndex,
	cleanupExportArchiveIndex: _cleanupExportArchiveIndex,
	selectedCleanupExportArchiveIndex: _selectedCleanupExportArchiveIndex,
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
	fileLocations: FileLocation[];
	selectedFileIndex: number;
	selectedLocationIndex: number;
	commandLine: CommandLineState;
	fileFilter: FileFilterState;
	fileOperationDialog: FileOperationDialogState;
	editorPreview?: EditorPreview;
	remoteProfiles: SftpRemoteProfile[];
	selectedRemoteIndex: number;
	remoteFileContext?: RemoteFileContext;
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
	selectedConnectionIndex: number;
	selectedPortIndex: number;
	connectionDetailView: EndpointDetailView;
	portDetailView: EndpointDetailView;
	connectionCopyPreview: boolean;
	portCopyPreview: boolean;
	portProcessControlPreview: boolean;
	selectedProcessDetail?: ProcessDetail;
	selectedProcessFiles?: ProcessFileSnapshot;
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
	cleanupShelfIndex: CleanupShelfIndex;
	selectedCleanupShelfIndex: number;
	cleanupJumpAudit?: CleanupJumpAudit;
	cleanupHandoffHistory: CleanupHandoffHistory[];
	selectedCleanupHandoffHistoryIndex: number;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportIndex: number;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportArchiveIndex: number;
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
	const workspaceHeight =
		cleanupJumpAuditRows.length > 0
			? Math.max(1, height - cleanupJumpAuditRows.length)
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
						fileLocations,
						selectedFileIndex,
						selectedLocationIndex,
						commandLine,
						fileFilter,
						fileOperationDialog,
						editorPreview,
						remoteProfiles,
						selectedRemoteIndex,
						remoteFileContext,
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
						selectedConnectionIndex,
						selectedPortIndex,
						connectionDetailView,
						portDetailView,
						connectionCopyPreview,
						portCopyPreview,
						portProcessControlPreview,
						selectedProcessDetail,
						selectedProcessFiles,
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
						cleanupShelfIndex,
						selectedCleanupShelfIndex,
						cleanupHandoffHistory,
						selectedCleanupHandoffHistoryIndex,
						_cleanupExportIndex,
						_selectedCleanupExportIndex,
						_cleanupExportArchiveIndex,
						_selectedCleanupExportArchiveIndex,
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
	fileLocations: FileLocation[],
	selectedFileIndex: number,
	selectedLocationIndex: number,
	commandLine: CommandLineState,
	fileFilter: FileFilterState,
	fileOperationDialog: FileOperationDialogState,
	editorPreview: EditorPreview | undefined,
	remoteProfiles: SftpRemoteProfile[],
	selectedRemoteIndex: number,
	remoteFileContext: RemoteFileContext | undefined,
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
	selectedConnectionIndex: number,
	selectedPortIndex: number,
	connectionDetailView: EndpointDetailView,
	portDetailView: EndpointDetailView,
	connectionCopyPreview: boolean,
	portCopyPreview: boolean,
	portProcessControlPreview: boolean,
	selectedProcessDetail: ProcessDetail | undefined,
	selectedProcessFiles: ProcessFileSnapshot | undefined,
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
	cleanupShelfIndex: CleanupShelfIndex,
	selectedCleanupShelfIndex: number,
	cleanupHandoffHistory: CleanupHandoffHistory[],
	selectedCleanupHandoffHistoryIndex: number,
	cleanupExportIndex: CleanupHandoffHistoryExportIndex,
	selectedCleanupExportIndex: number,
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex,
	selectedCleanupExportArchiveIndex: number,
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
	events: ConsoleEvent[],
	workspaceWidth: number,
	height: number,
	t: (key: string) => string,
): React.ReactElement {
	if (palette.active) {
		const filteredActions = getFilteredPaletteActions(actions, palette);
		return (
			<CommandPaletteWorkspace
				actions={filteredActions}
				selectedIndex={palette.selectedIndex}
				query={palette.query}
				totalActions={actions.length}
				visibleRows={Math.max(3, height - 8)}
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
				entries={fileEntries}
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
				selectedContext={remoteFileContext}
				focused={focusArea === "remotes"}
				visibleRows={Math.max(5, height - 8)}
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
				t={t}
			/>
		);
	}
	if (screen === "dns") {
		return <DnsWorkspace summary={summary} t={t} />;
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
				cleanupShelfIndex={cleanupShelfIndex}
				selectedCleanupShelfIndex={selectedCleanupShelfIndex}
				cleanupHandoffHistory={cleanupHandoffHistory}
				selectedCleanupHandoffHistoryIndex={selectedCleanupHandoffHistoryIndex}
				cleanupExportIndex={cleanupExportIndex}
				selectedCleanupExportIndex={selectedCleanupExportIndex}
				cleanupExportArchiveIndex={cleanupExportArchiveIndex}
				selectedCleanupExportArchiveIndex={selectedCleanupExportArchiveIndex}
				commandLine={commandLine}
				t={t}
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

	if (visibleRows < 12) {
		const compactEntries = entries.slice(0, Math.max(2, visibleRows - 5));
		return (
			<Box flexDirection="column">
				<Text bold color="cyan">
					{t("screen.files")} · root {clip(root, 18)}
				</Text>
				{remoteContext ? (
					<Text color="yellow">
						remote {remoteContext.label} · {remoteContext.status} · writes{" "}
						{remoteContext.writes}
					</Text>
				) : null}
				<Text color={focused ? "cyan" : "gray"}>
					{focused
						? "files · j/k · enter · f filter · c/m/x ops · :path"
						: "enter opens file focus"}
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
				<Text color="gray">.. parent · b back · picos dir / · picos dir ~</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.files")}
			</Text>
			<Text color="gray">current {clip(root, 46)}</Text>
			{remoteContext ? (
				<Text color="yellow">
					remote {remoteContext.label} {clip(remoteContext.root, 34)} ·{" "}
					{remoteContext.status} · writes {remoteContext.writes}
				</Text>
			) : (
				<Text color="gray">provider local · remote context not selected</Text>
			)}
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "files · j/k · enter · f filter · c/m/x ops · :path"
					: "enter opens file focus · read-only navigation · .. available"}
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
						locked · confirm {fileOperationDialog.preview.confirmationPhrase} ·
						enter reports lock · esc closes
					</Text>
				</Box>
			) : null}
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
				<Text color="cyan">COMMAND LINE</Text>
				<Text>
					1-9 locations · f filter · c copy · m move · x delete · : path
				</Text>
				<Text>picos type /path/to/file</Text>
				<Text color="gray">
					file operations are preview-only until confirmation wiring lands
				</Text>
			</Box>
		</Box>
	);
}

function EditorWorkspace({
	preview,
	entries,
	visibleRows,
	t,
}: {
	preview?: EditorPreview;
	entries: FileEntry[];
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const textFiles = entries.filter(
		(entry) =>
			entry.type === "file" &&
			/\.(md|ts|tsx|json|txt|js|mjs|cjs|yml|yaml)$/i.test(entry.name),
	);
	const lines = preview?.lines.slice(0, visibleRows) ?? [];

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.editor")} · preview buffer
			</Text>
			<Text color="gray">
				open: read-only now · save: locked behind diff + confirm dialog
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">BUFFER</Text>
				<Text>File {clip(preview?.path ?? textFiles[0]?.path ?? "-", 72)}</Text>
				{lines.length ? (
					lines.map((line) => (
						<Text key={`${preview?.path}:${line.number}`}>
							{String(line.number).padStart(3)} │ {clip(line.content, 86)}
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
				<Text color="yellow">
					files.write locked · requires diff preview, path review, and confirm
				</Text>
				<Text color="gray">planned: local + SFTP provider parity</Text>
			</Box>
		</Box>
	);
}

function RemotesWorkspace({
	profiles,
	selectedIndex,
	selectedContext,
	focused,
	visibleRows,
	t,
}: {
	profiles: SftpRemoteProfile[];
	selectedIndex: number;
	selectedContext?: RemoteFileContext;
	focused: boolean;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const profileRows = Math.max(1, visibleRows - 7);
	const window = getVisibleWindow(profiles.length, selectedIndex, profileRows);
	const visibleProfiles = profiles.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = profiles.length - window.end;

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{t("screen.remotes")}
			</Text>
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "remote focus · j/k select · enter stage · h/esc"
					: "enter opens remote focus · sessions locked"}
			</Text>
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
				<Text color="cyan">SELECTED CONTEXT</Text>
				{selectedContext ? (
					<Text color="yellow">
						{selectedContext.label} {clip(selectedContext.root, 46)} ·{" "}
						{selectedContext.status}
					</Text>
				) : (
					<Text color="gray">none · press enter on a profile to stage it</Text>
				)}
				<Text color="gray">
					sessions locked · password persistence disabled by schema
				</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>picos remotes · picos remote &lt;id&gt;</Text>
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
	selectedFileIndex,
	copyPreview,
	commandLine,
	visibleRows,
}: {
	inventory?: SystemInventory;
	selectedProcess?: ProcessDetail;
	selectedFiles?: ProcessFileSnapshot;
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
	t,
}: {
	summary?: NetworkSummary;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const groupRows = Math.min(summary?.networkGroups.length ?? 0, 4);
	const interfaceRows = Math.max(1, visibleRows - groupRows - 6);
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
	visibleRows,
	t,
}: {
	summary?: NetworkSummary;
	selectedIndex: number;
	view: InterfaceDetailView;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const rows = summary
		? formatInterfaceWorkspaceRows(summary, visibleRows - 3, {
				selectedIndex,
				view,
			})
		: ["loading interfaces..."];

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.interfaces")}</Text>
			<Text color="gray">
				interface console · j/k select · tab list/detail/stats/platform
			</Text>
			<Box marginTop={1} flexDirection="column">
				{rows.map((row) => (
					<Text
						key={row}
						color={
							row.startsWith("SUMMARY") ||
							row.startsWith("DETAIL") ||
							row.startsWith("STATS") ||
							row.startsWith("PLATFORM")
								? "cyan"
								: row.startsWith(">")
									? "green"
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
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows = [
		...formatClipboardPromptRows(commandLine),
		...formatEndpointFilterPromptRows(
			commandLine,
			"connections",
			filterPresets,
		),
	];
	const rows = result
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
						sort,
						view,
					},
				),
				...promptRows,
			]
		: ["loading connections..."];
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
				active endpoints · f filter · P save · ] preset · D cleanup · e export ·
				o open · tab detail · j/k select
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
	t: (key: string) => string;
}): React.ReactElement {
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
		...formatEndpointFilterPromptRows(commandLine, "ports", filterPresets),
		...processControlPromptRows,
	];
	const rows = result
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
						sort,
						view,
					},
				),
				...promptRows,
			]
		: ["loading listening ports..."];
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
				listening ports · f filter · P save · ] preset · D cleanup · e export ·
				o open · enter process · I inspector · K control · tab detail · j/k
				select
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
				? [`:routes-filter ${commandLine.value || " "}`]
				: commandLine.active &&
						commandLine.prompt === "route-filter-cleanup" &&
						cleanupPreview
					? [
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
					sort: routeSort,
					view: routeDetailView,
				},
			)
		: ["loading route table..."];
	const rows =
		routeDetailView === "table"
			? [...tableRows, ...pathRows, ...promptRows].slice(0, visibleRows)
			: [...tableRows, ...promptRows].slice(0, visibleRows);
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
				copy · D cleanup · e export · o open · tab detail · s sort · : path
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
								row.startsWith(":routes-cleanup") || row.startsWith("confirm ")
									? "yellow"
									: isSection
										? "cyan"
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
		row === tableHeader ||
		row === "RAW OUTPUT" ||
		row === "FILTER" ||
		row === "ENDPOINT FILTER CLEANUP" ||
		row === "PORT PROCESS CONTROL" ||
		row.startsWith("CONTROL EXECUTION") ||
		row.startsWith("DETAIL")
	) {
		return "cyan";
	}
	if (
		row.startsWith("CLIPBOARD PREVIEW") ||
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
	t: (key: string) => string;
}): React.ReactElement {
	const visibleToolHistoryIndex = getVisibleToolHistoryIndex(
		history,
		selectedIndex,
		filterQuery,
		sort,
	);
	const rows = formatToolsWorkspaceRows(
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
	const selectedPreview =
		copyPreview === "summary"
			? getSelectedToolSummaryClipboardPreview(history, visibleToolHistoryIndex)
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
	const selectedTargetPreset =
		targetPresets[
			Math.min(Math.max(selectedTargetPresetIndex, 0), targetPresets.length - 1)
		];
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
			? formatToolPromptRows(commandLine.prompt, commandLine.value)
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
				X delete · D target cleanup · C filter cleanup · R run · tab detail · f
				filter · P save filter
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
	t,
}: {
	events: ConsoleEvent[];
	filter: TimelineFilter;
	query: string;
	selectedIndex: number;
	presets: string[];
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows = formatTimelineSearchPromptRows(commandLine, presets);
	const rows = [
		...formatTimelineWorkspaceRows(
			events,
			Math.max(1, visibleRows - promptRows.length),
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
				P save · ] preset · D cleanup · timeline.export scoped log
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
): string[] {
	return commandLine.active && commandLine.prompt === "file-open"
		? [
				`FILE OPEN CONFIRM ${plan.label}`,
				`:file-open ${commandLine.value || " "}  type="${plan.confirmationPhrase}" enter=open esc=cancel`,
			]
		: [];
}

function DnsWorkspace({
	summary,
	t,
}: {
	summary?: NetworkSummary;
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.dns")}</Text>
			<Text color="gray">resolver visibility now, mutation later</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Servers: {summary?.dnsServers.join(", ") || "-"}</Text>
				<Text color="yellow">
					dns.flush locked: requires preview + admin + confirm
				</Text>
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

function CommandPaletteWorkspace({
	actions,
	selectedIndex,
	query,
	totalActions,
	visibleRows,
}: {
	actions: PicosAction[];
	selectedIndex: number;
	query: string;
	totalActions: number;
	visibleRows: number;
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
				<Text color="gray">read runs now · write/destructive stay locked</Text>
			</Box>
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
	cleanupShelfIndex,
	selectedCleanupShelfIndex,
	cleanupHandoffHistory,
	selectedCleanupHandoffHistoryIndex,
	cleanupExportIndex,
	selectedCleanupExportIndex,
	cleanupExportArchiveIndex,
	selectedCleanupExportArchiveIndex,
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
	cleanupShelfIndex: CleanupShelfIndex;
	selectedCleanupShelfIndex: number;
	cleanupHandoffHistory: CleanupHandoffHistory[];
	selectedCleanupHandoffHistoryIndex: number;
	cleanupExportIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportIndex: number;
	cleanupExportArchiveIndex: CleanupHandoffHistoryExportIndex;
	selectedCleanupExportArchiveIndex: number;
	commandLine: CommandLineState;
	t: (key: string) => string;
}): React.ReactElement {
	const updateApplyPreview = updateCheckResult
		? createUpdateApplyPreview(updateCheckResult)
		: undefined;
	const updateReleaseHandoff = updateCheckResult
		? createUpdateReleaseHandoff(updateCheckResult)
		: undefined;
	const updateReleaseLinks = updateReleaseHandoff
		? getUpdateReleaseHandoffLinks(updateReleaseHandoff)
		: [];
	const selectedCleanupHandoffHistory = getSelectedCleanupHandoffHistory(
		cleanupHandoffHistory,
		selectedCleanupHandoffHistoryIndex,
	);
	const cleanupHandoffReopenPlan = createCleanupHandoffReopenPlan(
		selectedCleanupHandoffHistory,
	);
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.status")}</Text>
			<Text>
				{t("status.version")}: {VERSION}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">UPDATE CHECK</Text>
				{updateCheckResult ? (
					formatUpdateCheckRows(updateCheckResult)
						.slice(1)
						.map((row) => (
							<Text
								key={row}
								color={
									row.includes("update-available")
										? "yellow"
										: row.startsWith("error=")
											? "red"
											: "white"
								}
							>
								{row}
							</Text>
						))
				) : (
					<Text color="gray">Run picos.update or `picos update`.</Text>
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">GITHUB RELEASE CHECK</Text>
				{githubReleaseCheckResult ? (
					formatGitHubReleaseCheckRows(githubReleaseCheckResult)
						.slice(1)
						.map((row) => (
							<Text
								key={row}
								color={
									row.includes("update-available")
										? "yellow"
										: row.startsWith("error=")
											? "red"
											: "white"
								}
							>
								{row}
							</Text>
						))
				) : (
					<Text color="gray">
						GitHub Release status appears after picos.update.
					</Text>
				)}
			</Box>
			{updateApplyPreview ? (
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">UPDATE APPLY PREVIEW</Text>
					{formatUpdateApplyPreviewRows(updateApplyPreview)
						.slice(1)
						.map((row) => (
							<Text key={row} color={getActionPreviewRowColor(row)}>
								{row}
							</Text>
						))}
				</Box>
			) : null}
			{updateReleaseHandoff ? (
				<Box marginTop={1} flexDirection="column">
					<Text color="gray">RELEASE HANDOFF · n cycle · c copy · o open</Text>
					{formatUpdateReleaseHandoffRows(updateReleaseHandoff)
						.slice(1)
						.map((row) => (
							<Text key={row} color="cyan">
								{row}
							</Text>
						))}
					{updateReleaseLinks.map((link, index) => (
						<Text
							key={link.key}
							color={index === selectedUpdateHandoffIndex ? "yellow" : "gray"}
						>
							{index === selectedUpdateHandoffIndex ? ">" : " "} {link.label}
						</Text>
					))}
				</Box>
			) : null}
			{externalOpenPlan ? (
				<Box marginTop={1} flexDirection="column">
					{formatExternalOpenPlanRows(externalOpenPlan)
						.slice(0, 7)
						.map((row) => (
							<Text
								key={row}
								color={
									row.startsWith("EXTERNAL OPEN")
										? "cyan"
										: row.startsWith("confirm")
											? "yellow"
											: "white"
								}
							>
								{row}
							</Text>
						))}
					{formatExternalOpenPromptRows(commandLine, externalOpenPlan).map(
						(row) => (
							<Text key={row} color="yellow">
								{row}
							</Text>
						),
					)}
				</Box>
			) : null}
			{fileOpenPlan ? (
				<Box marginTop={1} flexDirection="column">
					{formatFileOpenPlanRows(fileOpenPlan)
						.slice(0, 7)
						.map((row) => (
							<Text
								key={row}
								color={
									row.startsWith("FILE OPEN")
										? "cyan"
										: row.startsWith("confirm")
											? "yellow"
											: "white"
								}
							>
								{row}
							</Text>
						))}
					{formatFileOpenPromptRows(commandLine, fileOpenPlan).map((row) => (
						<Text key={row} color="yellow">
							{row}
						</Text>
					))}
				</Box>
			) : null}
			{auditExportArchivePlan ? (
				<Box marginTop={1} flexDirection="column">
					{formatConsoleAuditExportArchiveRows(auditExportArchivePlan).map(
						(row) => (
							<Text
								key={row}
								color={
									row.startsWith("AUDIT EXPORT ARCHIVE")
										? "cyan"
										: row.startsWith("confirm") || row.startsWith("reason=")
											? "yellow"
											: "white"
								}
							>
								{row}
							</Text>
						),
					)}
					{commandLine.active &&
					commandLine.prompt === "audit-export-archive" ? (
						<Text color="yellow">
							:audit-export-archive {commandLine.value || " "} type="
							{auditExportArchivePlan.confirmationPhrase}" enter=archive
							esc=cancel
						</Text>
					) : null}
				</Box>
			) : null}
			{auditArchiveRetentionPlan ? (
				<Box marginTop={1} flexDirection="column">
					{formatConsoleAuditArchiveRetentionRows(
						auditArchiveRetentionPlan,
					).map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("AUDIT ARCHIVE RETENTION")
									? "cyan"
									: row.startsWith("confirm") ||
											row.startsWith("remove ") ||
											row.startsWith("reason=")
										? "yellow"
										: "white"
							}
						>
							{row}
						</Text>
					))}
					{commandLine.active &&
					commandLine.prompt === "audit-archive-retention" ? (
						<Text color="yellow">
							:audit-archive-retention {commandLine.value || " "} type="
							{auditArchiveRetentionPlan.confirmationPhrase}" enter=prune
							esc=cancel
						</Text>
					) : null}
				</Box>
			) : null}
			{cleanupExportArchivePlan ? (
				<Box marginTop={1} flexDirection="column">
					{formatCleanupHandoffHistoryExportArchiveRows(
						cleanupExportArchivePlan,
					).map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("CLEANUP EXPORT ARCHIVE")
									? "cyan"
									: row.startsWith("confirm") || row.startsWith("reason=")
										? "yellow"
										: "white"
							}
						>
							{row}
						</Text>
					))}
					{commandLine.active &&
					commandLine.prompt === "cleanup-export-archive" ? (
						<Text color="yellow">
							:cleanup-export-archive {commandLine.value || " "} type="
							{cleanupExportArchivePlan.confirmationPhrase}" enter=archive
							esc=cancel
						</Text>
					) : null}
				</Box>
			) : null}
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					CLEANUP INDEX · j/k select · enter jump · type shown phrase
				</Text>
				{formatCleanupShelfIndexRows(
					cleanupShelfIndex,
					8,
					selectedCleanupShelfIndex,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith(">")
								? "yellow"
								: row.startsWith("CLEANUP INDEX")
									? "cyan"
									: row.includes("count=0") || row.startsWith("no ")
										? "gray"
										: "white"
						}
					>
						{row}
					</Text>
				))}
				<Box marginTop={1} flexDirection="column">
					{formatCleanupShelfDetailRows(
						cleanupShelfIndex,
						selectedCleanupShelfIndex,
					).map((row) => (
						<Text
							key={row}
							color={
								row.startsWith("CLEANUP DETAIL")
									? "cyan"
									: row.startsWith("confirm=")
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
						CLEANUP HISTORY · [ cycle · R reopen · E export
					</Text>
					{formatCleanupHandoffHistoryIndexRows(
						cleanupHandoffHistory,
						selectedCleanupHandoffHistoryIndex,
						4,
					).map((row) => (
						<Text
							key={row}
							color={
								row.startsWith(">")
									? "yellow"
									: row.startsWith("CLEANUP HISTORY")
										? "cyan"
										: row.startsWith("no ")
											? "gray"
											: "white"
							}
						>
							{row}
						</Text>
					))}
					{formatCleanupHandoffHistoryRows(selectedCleanupHandoffHistory)
						.slice(1)
						.map((row) => (
							<Text
								key={row}
								color={row.startsWith("detail=") ? "gray" : "white"}
							>
								{row}
							</Text>
						))}
					{formatCleanupHandoffReopenRows(cleanupHandoffReopenPlan)
						.slice(1)
						.map((row) => (
							<Text key={row} color={row.startsWith("R ") ? "yellow" : "gray"}>
								{row}
							</Text>
						))}
				</Box>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					HANDOFF INDEX · H refresh · ] select · O open · A archive
				</Text>
				{formatHandoffIndexRows(handoffIndex, selectedHandoffIndex, 6).map(
					(row) => (
						<Text
							key={row}
							color={
								row.startsWith(">")
									? "yellow"
									: row.startsWith("HANDOFFS")
										? "cyan"
										: row.startsWith("open target")
											? "gray"
											: row.startsWith("archive target")
												? "gray"
												: "white"
							}
						>
							{row}
						</Text>
					),
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">
					AUDIT EXPORTS · T refresh · ) select · W open · Z archive
				</Text>
				{formatConsoleAuditExportIndexRows(
					auditExportIndex,
					selectedAuditExportIndex,
					5,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith(">")
								? "yellow"
								: row.startsWith("AUDIT EXPORTS")
									? "cyan"
									: row.startsWith("path=") || row.startsWith("no ")
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
					AUDIT ARCHIVE · U refresh · ( select · J open · M retention
				</Text>
				{formatConsoleAuditExportArchiveIndexRows(
					auditExportArchiveIndex,
					selectedAuditExportArchiveIndex,
					4,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith(">")
								? "yellow"
								: row.startsWith("AUDIT ARCHIVE")
									? "cyan"
									: row.startsWith("path=") || row.startsWith("no ")
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
					CLEANUP EXPORTS · Y refresh · {"}"} select · V open · X archive
				</Text>
				{formatCleanupHandoffHistoryExportIndexRows(
					cleanupExportIndex,
					selectedCleanupExportIndex,
					5,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith(">")
								? "yellow"
								: row.startsWith("CLEANUP EXPORTS")
									? "cyan"
									: row.startsWith("path=") || row.startsWith("no ")
										? "gray"
										: "white"
						}
					>
						{row}
					</Text>
				))}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">CLEANUP ARCHIVE · B refresh · {"{"} select</Text>
				{formatCleanupHandoffHistoryExportArchiveIndexRows(
					cleanupExportArchiveIndex,
					selectedCleanupExportArchiveIndex,
					4,
				).map((row) => (
					<Text
						key={row}
						color={
							row.startsWith(">")
								? "yellow"
								: row.startsWith("CLEANUP ARCHIVE")
									? "cyan"
									: row.startsWith("path=") || row.startsWith("no ")
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
}): React.ReactElement {
	const cleanupPreview =
		commandLine.active && commandLine.prompt === "logs-cleanup"
			? createLogCleanupPreview(presets, profiles)
			: undefined;
	const promptRows =
		commandLine.active && commandLine.prompt === "log-search"
			? ["SEARCH", `:logs ${commandLine.value || " "}  enter=apply esc=cancel`]
			: commandLine.active &&
					commandLine.prompt === "logs-cleanup" &&
					cleanupPreview
				? [
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
	const rows = [
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
			},
		),
		...promptRows,
		...doctorRows,
	];
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
	if (row.startsWith("LOGS") || row === "SEARCH") {
		return "cyan";
	}
	if (row.startsWith(":logs-cleanup") || row.startsWith("confirm ")) {
		return "yellow";
	}
	if (row.startsWith("PICOS") || row.startsWith("source=")) {
		return "cyan";
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
