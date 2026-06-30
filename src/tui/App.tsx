import { dirname, resolve } from "node:path";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getConfigPath, readConfig } from "../config/store";
import {
	getActionCatalog,
	getActionSummary,
	type PicosAction,
} from "../core/actions";
import {
	createConsoleAuditExportPlan,
	readLatestConsoleAuditExport,
	writeConsoleAuditExport,
} from "../core/auditLog";
import {
	type ConnectionSort,
	type ConnectionsResult,
	getActiveConnections,
	nextConnectionSort,
	sortConnections,
} from "../core/connections";
import { runDoctorChecks } from "../core/doctor";
import {
	createLocalFileProvider,
	type FileEntry,
	type FileLocation,
	getSystemFileLocations,
	getSystemFileRoot,
	withParentDirectoryEntry,
} from "../core/files";
import { getNetworkSummary } from "../core/network";
import {
	getListeningPorts,
	nextPortSort,
	type PortSort,
	type PortsResult,
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
	nextRouteSort,
	type RoutePathResult,
	type RouteSort,
	type RouteTableResult,
	runRoutePath,
	runRouteTable,
} from "../core/routes";
import { formatUptime } from "../core/system";
import { createSystemInventory } from "../core/systemInventory";
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
import { VERSION } from "../core/version";
import { createTranslator } from "../i18n/catalog";
import { currentPlatform } from "../utils/platform";
import {
	appendClipboardConfirmationInput,
	backspaceClipboardConfirmationInput,
	type ClipboardConfirmationState,
	clearClipboardConfirmationState,
	createClipboardConfirmationState,
	submitClipboardConfirmation,
} from "./clipboardDialog";
import {
	applyCommandLineInput,
	type CommandLineState,
	closeCommandLine,
	openCommandLine,
} from "./commandLine";
import {
	formatConnectionsWorkspaceRows,
	formatPortsWorkspaceRows,
	getSelectedConnectionClipboardPreview,
	getSelectedConnectionProcessRequest,
	getSelectedPortClipboardPreview,
	getSelectedPortProcessRequest,
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
import { formatRoutePathRows, formatRouteWorkspaceRows } from "./routePanel";
import { computeShellLayout, formatTopBarLine } from "./shell";
import {
	formatTimelineWorkspaceRows,
	nextTimelineFilter,
	type TimelineFilter,
} from "./timelinePanel";
import {
	appendToolHistory,
	createToolRunPlan,
	formatToolsWorkspaceRows,
	type ToolHistoryItem,
} from "./toolHistory";

type CommandStatus = "idle" | "running";

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
	const [inventory, setInventory] = useState<SystemInventory>();
	const [doctorChecks, setDoctorChecks] = useState<DoctorCheck[]>([]);
	const [selectedActionIndex, setSelectedActionIndex] = useState(0);
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
	const [connectionCopyPreview, setConnectionCopyPreview] = useState(false);
	const [portCopyPreview, setPortCopyPreview] = useState(false);
	const [selectedProcessDetail, setSelectedProcessDetail] =
		useState<ProcessDetail>();
	const [selectedProcessFiles, setSelectedProcessFiles] =
		useState<ProcessFileSnapshot>();
	const [selectedProcessFileIndex, setSelectedProcessFileIndex] = useState(0);
	const [processClipboardPreview, setProcessClipboardPreview] = useState(false);
	const [routeTable, setRouteTable] = useState<RouteTableResult>();
	const [routePath, setRoutePath] = useState<RoutePathResult>();
	const [routeSort, setRouteSort] = useState<RouteSort>({
		key: "default",
		direction: "asc",
	});
	const [toolHistory, setToolHistory] = useState<ToolHistoryItem[]>([]);
	const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
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
		() => sortConnections(connections, connectionSort),
		[connections, connectionSort],
	);
	const sortedPorts = useMemo(
		() => sortListeningPorts(ports, portSort),
		[ports, portSort],
	);

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
			const [nextSummary, nextConnections, nextPorts, nextRouteTable] =
				await Promise.all([
					getNetworkSummary(),
					getActiveConnections().catch(() => undefined),
					getListeningPorts().catch(() => undefined),
					runRouteTable().catch(() => undefined),
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
				log("warn", `${action.id} is locked`);
				return;
			}

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
					const plan = createConsoleAuditExportPlan(events, {
						baseDir: dirname(getConfigPath()),
					});
					const written = await writeConsoleAuditExport(plan);
					log("ok", `audit exported ${written.path}`);
				}

				const toolPlan = createToolRunPlan(
					action.id,
					(await readConfig()).defaultPingHost,
					summaryRef.current,
				);
				if (toolPlan) {
					setScreen("tools");
					const result = await runTool(toolPlan.toolId, toolPlan.args, {
						timeoutMs: 10000,
					});
					setToolHistory((current) =>
						appendToolHistory(current, { plan: toolPlan, result }),
					);
					log("ok", `${toolPlan.label} completed`);
				}

				if (action.id === "raw.view") {
					const latestTool = toolHistory.at(-1);
					if (latestTool) {
						setScreen("tools");
						log("info", `raw.view latest ${latestTool.label}`);
					} else {
						log("warn", "raw.view has no tool history yet");
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
		[events, fileRoot, log, refresh, refreshFiles, toolHistory],
	);

	useEffect(() => {
		readConfig().then(async (config) => {
			setRefreshInterval(config.refreshInterval);
			setLanguage(config.language);
			setRemoteProfiles(config.remoteProfiles);
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
			setEvents([...(persisted?.events ?? []), ...bootEvents].slice(-64));
		});
		refresh();
	}, [refresh]);

	useEffect(() => {
		const timer = setInterval(refresh, refreshInterval);
		return () => clearInterval(timer);
	}, [refresh, refreshInterval]);

	useInput((input, key) => {
		if (commandLine.active) {
			if (key.escape) {
				setCommandLine((current) => closeCommandLine(current));
				if (commandLine.prompt === "clipboard") {
					setClipboardConfirmation(clearClipboardConfirmationState());
					setConnectionCopyPreview(false);
					setPortCopyPreview(false);
					setProcessClipboardPreview(false);
				}
				log(
					"info",
					commandLine.prompt === "route"
						? "route path command cancelled"
						: commandLine.prompt === "clipboard"
							? "clipboard confirmation cancelled"
							: "path command cancelled",
				);
				return;
			}

			if (key.return) {
				if (commandLine.prompt === "clipboard") {
					void submitClipboardCommand();
				} else if (commandLine.prompt === "route") {
					void submitRouteDestinationCommand();
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

		if (
			screen === "connections" &&
			focusArea === "workspaces" &&
			input === "s"
		) {
			setConnectionSort((current) => {
				const next = nextConnectionSort(current);
				log("info", `connections sort ${next.key} ${next.direction}`);
				return next;
			});
			setConnectionCopyPreview(false);
			return;
		}

		if (screen === "ports" && focusArea === "workspaces" && input === "s") {
			setPortSort((current) => {
				const next = nextPortSort(current);
				log("info", `ports sort ${next.key} ${next.direction}`);
				return next;
			});
			setPortCopyPreview(false);
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
			openClipboardConfirmation(preview);
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
					getNextIndex(
						index,
						connectionsResult?.connections.length ?? 0,
						"next",
					),
				);
				setConnectionCopyPreview(false);
			} else if (screen === "ports") {
				setSelectedPortIndex((index) =>
					getNextIndex(index, portsResult?.ports.length ?? 0, "next"),
				);
				setPortCopyPreview(false);
			} else if (screen === "processes") {
				setSelectedProcessFileIndex((index) =>
					getNextIndex(
						index,
						getProcessFileSelectionCount(selectedProcessFiles),
						"next",
					),
				);
				setProcessClipboardPreview(false);
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
					getNextIndex(
						index,
						connectionsResult?.connections.length ?? 0,
						"previous",
					),
				);
				setConnectionCopyPreview(false);
			} else if (screen === "ports") {
				setSelectedPortIndex((index) =>
					getNextIndex(index, portsResult?.ports.length ?? 0, "previous"),
				);
				setPortCopyPreview(false);
			} else if (screen === "processes") {
				setSelectedProcessFileIndex((index) =>
					getNextIndex(
						index,
						getProcessFileSelectionCount(selectedProcessFiles),
						"previous",
					),
				);
				setProcessClipboardPreview(false);
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
					error={error}
					actions={actions}
					selectedActionIndex={selectedActionIndex}
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
					selectedConnectionIndex={selectedConnectionIndex}
					selectedPortIndex={selectedPortIndex}
					connectionCopyPreview={connectionCopyPreview}
					portCopyPreview={portCopyPreview}
					selectedProcessDetail={selectedProcessDetail}
					selectedProcessFiles={selectedProcessFiles}
					selectedProcessFileIndex={selectedProcessFileIndex}
					processClipboardPreview={processClipboardPreview}
					routeTable={routeTable}
					routePath={routePath}
					routeSort={routeSort}
					timelineFilter={timelineFilter}
					toolHistory={toolHistory}
					events={events}
					t={t}
				/>
				{layout.inspectorWidth > 0 ? (
					<Inspector
						width={layout.inspectorWidth}
						screen={screen}
						summary={summary}
						selectedAction={selectedAction}
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
	width,
	height,
	screen,
	summary,
	inventory,
	error,
	actions,
	selectedActionIndex,
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
	selectedConnectionIndex,
	selectedPortIndex,
	connectionCopyPreview,
	portCopyPreview,
	selectedProcessDetail,
	selectedProcessFiles,
	selectedProcessFileIndex,
	processClipboardPreview,
	routeTable,
	routePath,
	routeSort,
	timelineFilter,
	toolHistory,
	events,
	t,
}: {
	width: number;
	height: number;
	screen: Screen;
	summary?: NetworkSummary;
	inventory?: SystemInventory;
	error?: string;
	actions: PicosAction[];
	selectedActionIndex: number;
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
	selectedConnectionIndex: number;
	selectedPortIndex: number;
	connectionCopyPreview: boolean;
	portCopyPreview: boolean;
	selectedProcessDetail?: ProcessDetail;
	selectedProcessFiles?: ProcessFileSnapshot;
	selectedProcessFileIndex: number;
	processClipboardPreview: boolean;
	routeTable?: RouteTableResult;
	routePath?: RoutePathResult;
	routeSort: RouteSort;
	timelineFilter: TimelineFilter;
	toolHistory: ToolHistoryItem[];
	events: ConsoleEvent[];
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box
			width={width}
			height={height}
			borderStyle="single"
			borderColor="cyan"
			paddingX={1}
		>
			{error ? (
				<Text color="red">{error}</Text>
			) : (
				renderWorkspace(
					screen,
					summary,
					inventory,
					actions,
					selectedActionIndex,
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
					selectedConnectionIndex,
					selectedPortIndex,
					connectionCopyPreview,
					portCopyPreview,
					selectedProcessDetail,
					selectedProcessFiles,
					selectedProcessFileIndex,
					processClipboardPreview,
					routeTable,
					routePath,
					routeSort,
					timelineFilter,
					toolHistory,
					events,
					height,
					t,
				)
			)}
		</Box>
	);
}

function renderWorkspace(
	screen: Screen,
	summary: NetworkSummary | undefined,
	inventory: SystemInventory | undefined,
	actions: PicosAction[],
	selectedActionIndex: number,
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
	selectedConnectionIndex: number,
	selectedPortIndex: number,
	connectionCopyPreview: boolean,
	portCopyPreview: boolean,
	selectedProcessDetail: ProcessDetail | undefined,
	selectedProcessFiles: ProcessFileSnapshot | undefined,
	selectedProcessFileIndex: number,
	processClipboardPreview: boolean,
	routeTable: RouteTableResult | undefined,
	routePath: RoutePathResult | undefined,
	routeSort: RouteSort,
	timelineFilter: TimelineFilter,
	toolHistory: ToolHistoryItem[],
	events: ConsoleEvent[],
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
		return <SystemWorkspace inventory={inventory} />;
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
				processes={inventory?.processes ?? []}
				selectedIndex={selectedConnectionIndex}
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
				processes={inventory?.processes ?? []}
				selectedIndex={selectedPortIndex}
				copyPreview={portCopyPreview}
				commandLine={commandLine}
				visibleRows={Math.max(5, height - 7)}
				t={t}
			/>
		);
	}
	if (screen === "tools") {
		return (
			<ToolsWorkspace
				history={toolHistory}
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
				visibleRows={Math.max(3, height - 7)}
				t={t}
			/>
		);
	}
	if (screen === "status") {
		return <StatusWorkspace t={t} />;
	}
	if (screen === "logs") {
		return <LogWorkspace checks={doctorChecks} />;
	}
	return (
		<DashboardWorkspace
			summary={summary}
			inventory={inventory}
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
					CPU {clip(inventory?.hardware.cpuModel ?? "loading", 28)}{" "}
					{inventory?.hardware.cpuCount ?? "-"} cores
				</Text>
				<Text>
					Mem {formatBytes(inventory?.hardware.freeMemoryBytes)} /{" "}
					{formatBytes(inventory?.hardware.totalMemoryBytes)}
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
}: {
	inventory?: SystemInventory;
}): React.ReactElement {
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
	const promptRows = formatClipboardPromptRows(commandLine);
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
				j/k select resources · enter opens local paths · c copy, type copy
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
								{clip(group.label, 9).padEnd(9)} if=
								{clip(group.interfaces.join(","), 14) || "-"} addr=
								{clip(group.addresses.join(","), 18)}
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
	visibleRows,
	t,
}: {
	summary?: NetworkSummary;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const summaryRows = Math.max(1, Math.floor((visibleRows - 5) / 2));
	const detailRows = Math.max(1, visibleRows - summaryRows - 7);
	const visibleInterfaces = summary?.interfaces.slice(0, summaryRows) ?? [];
	const detailInterfaces = summary?.interfaces.slice(0, detailRows) ?? [];
	const hiddenInterfaces = Math.max(
		0,
		(summary?.interfaces.length ?? 0) - Math.max(summaryRows, detailRows),
	);

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.interfaces")}</Text>
			<Text color="gray">
				inventory: type, status, CIDR, MTU, RX/TX, MAC, gateway, and DNS
			</Text>
			<Box marginTop={1} flexDirection="column">
				{visibleInterfaces.map((item) => (
					<Text key={item.name}>
						{clip(item.name, 8).padEnd(8)} {clip(item.kind, 12).padEnd(12)}{" "}
						{item.status === "connected" ? "up  " : "down"}{" "}
						{clip(item.ipv4Cidr ?? item.ipv6Cidr ?? item.ipv4 ?? "-", 24)}
					</Text>
				))}
				{summary ? null : <Text color="gray">loading...</Text>}
				{summary && visibleInterfaces.length === 0 ? (
					<Text color="gray">no interfaces detected</Text>
				) : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">DETAILS</Text>
				{detailInterfaces.map((item) => (
					<Text key={`${item.name}:details`}>
						{clip(item.name, 8).padEnd(8)} mtu={item.mtu ?? "-"} rx=
						{formatCompactBytes(item.rxBytes)} tx=
						{formatCompactBytes(item.txBytes)} p=
						{formatCompactPacketPair(item.rxPackets, item.txPackets)}
					</Text>
				))}
				{summary ? null : <Text color="gray">loading...</Text>}
				{hiddenInterfaces > 0 ? (
					<Text color="gray">↓ {hiddenInterfaces} more interfaces</Text>
				) : null}
				<Text>
					gateway {summary?.gateway ?? "-"} dns{" "}
					{clip(summary?.dnsServers.join(", ") || "-", 42)}
				</Text>
			</Box>
		</Box>
	);
}

function ConnectionsWorkspace({
	result,
	sort,
	processes,
	selectedIndex,
	copyPreview,
	commandLine,
	visibleRows,
	t,
}: {
	result?: ConnectionsResult;
	sort: ConnectionSort;
	processes: SystemInventory["processes"];
	selectedIndex: number;
	copyPreview: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows = formatClipboardPromptRows(commandLine);
	const rows = result
		? [
				...formatConnectionsWorkspaceRows(
					result,
					Math.max(1, visibleRows - promptRows.length),
					{
						copyPreview,
						processes,
						selectedIndex,
						sort,
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
				active endpoints from netstat · j/k select · s sort · c copy, type copy
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
				<Text>picos connections · picos connections --raw</Text>
			</Box>
		</Box>
	);
}

function PortsWorkspace({
	result,
	sort,
	processes,
	selectedIndex,
	copyPreview,
	commandLine,
	visibleRows,
	t,
}: {
	result?: PortsResult;
	sort: PortSort;
	processes: SystemInventory["processes"];
	selectedIndex: number;
	copyPreview: boolean;
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows = formatClipboardPromptRows(commandLine);
	const rows = result
		? [
				...formatPortsWorkspaceRows(
					result,
					Math.max(1, visibleRows - promptRows.length),
					{
						copyPreview,
						processes,
						selectedIndex,
						sort,
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
				listening TCP ports from lsof/ss/netstat · j/k select · s sort · c copy
				, type copy
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
				<Text>picos ports · picos ports --raw</Text>
			</Box>
		</Box>
	);
}

function RoutesWorkspace({
	routeTable,
	routePath,
	routeSort,
	commandLine,
	visibleRows,
	t,
}: {
	routeTable?: RouteTableResult;
	routePath?: RoutePathResult;
	routeSort: RouteSort;
	commandLine: CommandLineState;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const promptRows =
		commandLine.active && commandLine.prompt === "route"
			? [`:route ${commandLine.value || " "}`]
			: [];
	const pathRows = routePath
		? formatRoutePathRows(routePath, Math.max(4, Math.floor(visibleRows / 3)))
		: ["PATH destination lookup: press : then enter host or IP"];
	const tableRows = routeTable
		? formatRouteWorkspaceRows(
				routeTable,
				Math.max(4, visibleRows - pathRows.length - promptRows.length),
				{ sort: routeSort },
			)
		: ["loading route table..."];
	const rows = [...tableRows, ...pathRows, ...promptRows].slice(0, visibleRows);
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
				route table diagnostics · s sort · : path lookup · raw output
			</Text>
			<Box marginTop={1} flexDirection="column">
				{keyedRows.map(({ key, row }) => {
					const isSection =
						row === "DIAGNOSTICS" ||
						row === "ROUTES" ||
						row === "RAW OUTPUT" ||
						row === "RAW PATH" ||
						row.startsWith("PATH ");
					return (
						<Text
							key={key}
							color={
								isSection ? "cyan" : row.startsWith("WARN") ? "yellow" : "white"
							}
						>
							{row}
						</Text>
					);
				})}
			</Box>
		</Box>
	);
}

function getEndpointRowColor(row: string, tableHeader: string): string {
	if (row === tableHeader || row === "RAW OUTPUT" || row.startsWith("DETAIL")) {
		return "cyan";
	}
	if (row.startsWith("COPY PREVIEW")) {
		return "yellow";
	}
	if (row.startsWith(">")) {
		return "green";
	}
	return "white";
}

function ToolsWorkspace({
	history,
	visibleRows,
	t,
}: {
	history: ToolHistoryItem[];
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const rows = formatToolsWorkspaceRows(history, visibleRows);
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.tools")}</Text>
			<Text color="gray">
				Tools Hub history · DNS/RDAP/IP/TCP/TLS/ping/traceroute
			</Text>
			<Box marginTop={1} flexDirection="column">
				{rows.map((row) => (
					<Text key={row} color={getToolRowColor(row)}>
						{row}
					</Text>
				))}
			</Box>
		</Box>
	);
}

function getToolRowColor(row: string): string {
	if (row.startsWith("TOOLS") || row === "RAW") {
		return "cyan";
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
	visibleRows,
	t,
}: {
	events: ConsoleEvent[];
	filter: TimelineFilter;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const rows = formatTimelineWorkspaceRows(events, visibleRows, filter);
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.timeline")}</Text>
			<Text color="gray">
				t cycle filters · timeline.export writes current audit log
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

function getTimelineRowColor(row: string): string {
	if (row === "TIMELINE" || row.startsWith("SUMMARY")) {
		return "cyan";
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
	visibleRows,
	t,
}: {
	actions: PicosAction[];
	selectedIndex: number;
	focused: boolean;
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const window = getVisibleWindow(actions.length, selectedIndex, visibleRows);
	const visibleActions = actions.slice(window.start, window.end);
	const hiddenAbove = window.start;
	const hiddenBelow = actions.length - window.end;

	return (
		<Box flexDirection="column">
			<Text bold>{t("actions.title")}</Text>
			<Text color={focused ? "cyan" : "gray"}>
				{focused
					? "child focus · j/k select · enter run · esc/h back"
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
		</Box>
	);
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
	t,
}: {
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.status")}</Text>
			<Text>
				{t("status.version")}: {VERSION}
			</Text>
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
	checks,
}: {
	checks: DoctorCheck[];
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>Diagnostics Buffer</Text>
			{checks.length ? (
				checks.map((check) => (
					<Text
						key={check.label}
						color={check.status === "pass" ? "green" : "yellow"}
					>
						{check.status.toUpperCase().padEnd(5)} {check.label}
						{check.detail ? ` · ${check.detail}` : ""}
					</Text>
				))
			) : (
				<Text color="gray">No diagnostics yet. Press d.</Text>
			)}
		</Box>
	);
}

function Inspector({
	width,
	screen,
	summary,
	selectedAction,
	events,
	t,
}: {
	width: number;
	screen: Screen;
	summary?: NetworkSummary;
	selectedAction: PicosAction;
	events: ConsoleEvent[];
	t: (key: string) => string;
}): React.ReactElement {
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

function formatCompactBytes(value?: number): string {
	if (value === undefined) {
		return "-";
	}
	const units = ["B", "K", "M", "G", "T"];
	let size = value;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

function formatCompactNumber(value?: number): string {
	if (value === undefined) {
		return "-";
	}
	const units = ["", "K", "M", "B"];
	let size = value;
	let unitIndex = 0;
	while (size >= 1000 && unitIndex < units.length - 1) {
		size /= 1000;
		unitIndex += 1;
	}
	return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

function formatCompactPacketPair(
	rxPackets?: number,
	txPackets?: number,
): string {
	if (rxPackets === undefined && txPackets === undefined) {
		return "-";
	}
	return `${formatCompactNumber(rxPackets)}/${formatCompactNumber(txPackets)}`;
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
