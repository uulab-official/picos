import { dirname } from "node:path";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfigPath, readConfig } from "../config/store";
import {
	getActionCatalog,
	getActionSummary,
	type PicosAction,
} from "../core/actions";
import { runPing } from "../core/command";
import { getActiveConnections } from "../core/connections";
import { runDoctorChecks } from "../core/doctor";
import {
	createLocalFileProvider,
	type FileEntry,
	type FileLocation,
	getSystemFileLocations,
	getSystemFileRoot,
} from "../core/files";
import { getNetworkSummary } from "../core/network";
import { getListeningPorts } from "../core/ports";
import {
	createRemoteFileContext,
	type RemoteFileContext,
} from "../core/remotes";
import { getRoadmapItems } from "../core/roadmap";
import { formatUptime } from "../core/system";
import { createSystemInventory } from "../core/systemInventory";
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
import {
	applyCommandLineInput,
	type CommandLineState,
	closeCommandLine,
	openCommandLine,
} from "./commandLine";
import { appendEvent, type ConsoleEvent, createEvent } from "./events";
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
import { computeShellLayout, formatTopBarLine } from "./shell";

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
	const [selectedFileIndex, setSelectedFileIndex] = useState(0);
	const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
	const [commandLine, setCommandLine] = useState<CommandLineState>({
		active: false,
		prompt: "path",
		value: "",
	});
	const [palette, setPalette] = useState<CommandPaletteState>({
		active: false,
		selectedIndex: 0,
		query: "",
	});
	const [editorPreview, setEditorPreview] = useState<EditorPreview>();
	const [connections, setConnections] = useState<ActiveConnection[]>([]);
	const [ports, setPorts] = useState<ListeningPort[]>([]);
	const [remoteProfiles, setRemoteProfiles] = useState<SftpRemoteProfile[]>([]);
	const [selectedRemoteIndex, setSelectedRemoteIndex] = useState(0);
	const [remoteFileContext, setRemoteFileContext] =
		useState<RemoteFileContext>();
	const t = useMemo(() => createTranslator(language), [language]);

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
		const entry = fileEntries[selectedFileIndex];
		if (!entry) {
			return;
		}

		if (entry.type === "directory" || entry.type === "symlink") {
			try {
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
	}, [fileEntries, loadFiles, log, previewFile, selectedFileIndex]);

	const goToParentDirectory = useCallback(async () => {
		const parent = dirname(fileRoot);
		if (parent === fileRoot) {
			log("info", "already at filesystem root");
			return;
		}
		try {
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
				await loadFiles(location.path);
				setSelectedLocationIndex(locationIndex);
				log("info", `jumped to ${location.label}`);
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			}
		},
		[fileLocations, loadFiles, log],
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
			await loadFiles(path);
			log("info", `entered ${path}`);
		} catch (caught) {
			log("fail", caught instanceof Error ? caught.message : String(caught));
		} finally {
			setCommandLine((current) => closeCommandLine(current));
		}
	}, [commandLine.value, loadFiles, log]);

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
			const [nextSummary, nextConnections, nextPorts] = await Promise.all([
				getNetworkSummary(),
				getActiveConnections().catch(() => undefined),
				getListeningPorts().catch(() => undefined),
			]);
			setSummary(nextSummary);
			setInventory(await createSystemInventory({ network: nextSummary }));
			if (nextConnections) {
				setConnections(nextConnections.connections);
			}
			if (nextPorts) {
				setPorts(nextPorts.ports);
			}
			await refreshFiles();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : String(caught);
			setError(message);
			log("fail", message);
		}
	}, [log, refreshFiles]);

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

				if (action.id === "ping.default") {
					const config = await readConfig();
					const result = await runPing(config.defaultPingHost);
					log(result.success ? "ok" : "fail", `ping ${config.defaultPingHost}`);
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

				if (
					action.id === "routes.inspect" ||
					action.id === "network.connect" ||
					action.id === "tools.dns" ||
					action.id === "tools.traceroute" ||
					action.id === "tools.whois" ||
					action.id === "tools.ipInfo" ||
					action.id === "tools.tls" ||
					action.id === "timeline.export" ||
					action.id === "raw.view" ||
					action.id === "routes.path" ||
					action.id === "remote.sftp.connect"
				) {
					log("info", `${action.id} queued for adapter implementation`);
				}

				if (action.id === "connections.list") {
					const result = await getActiveConnections();
					setConnections(result.connections);
					log("ok", `connections listed ${result.connections.length}`);
				}

				if (action.id === "ports.list") {
					const result = await getListeningPorts();
					setPorts(result.ports);
					log("ok", `ports listed ${result.ports.length}`);
				}
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			} finally {
				setCommandStatus("idle");
			}
		},
		[fileRoot, log, refresh, refreshFiles],
	);

	useEffect(() => {
		readConfig().then((config) => {
			setRefreshInterval(config.refreshInterval);
			setLanguage(config.language);
			setRemoteProfiles(config.remoteProfiles);
			setSelectedRemoteIndex((index) =>
				Math.min(index, Math.max(0, config.remoteProfiles.length - 1)),
			);
			const nextT = createTranslator(config.language);
			setEvents([
				createEvent("info", nextT("events.booted")),
				createEvent("info", nextT("events.lockedPolicy")),
			]);
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
				log("info", "path command cancelled");
				return;
			}

			if (key.return) {
				void submitPathCommand();
				return;
			}

			setCommandLine((current) =>
				applyCommandLineInput(current, {
					input,
					backspace: key.backspace || key.delete,
				}),
			);
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
					getNextIndex(index, fileEntries.length, "next"),
				);
			} else if (focusArea === "remotes") {
				setSelectedRemoteIndex((index) =>
					getNextIndex(index, remoteProfiles.length, "next"),
				);
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
					getNextIndex(index, fileEntries.length, "previous"),
				);
			} else if (focusArea === "remotes") {
				setSelectedRemoteIndex((index) =>
					getNextIndex(index, remoteProfiles.length, "previous"),
				);
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
					editorPreview={editorPreview}
					remoteProfiles={remoteProfiles}
					selectedRemoteIndex={selectedRemoteIndex}
					remoteFileContext={remoteFileContext}
					connections={connections}
					ports={ports}
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
	editorPreview,
	remoteProfiles,
	selectedRemoteIndex,
	remoteFileContext,
	connections,
	ports,
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
	editorPreview?: EditorPreview;
	remoteProfiles: SftpRemoteProfile[];
	selectedRemoteIndex: number;
	remoteFileContext?: RemoteFileContext;
	connections: ActiveConnection[];
	ports: ListeningPort[];
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
					editorPreview,
					remoteProfiles,
					selectedRemoteIndex,
					remoteFileContext,
					connections,
					ports,
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
	editorPreview: EditorPreview | undefined,
	remoteProfiles: SftpRemoteProfile[],
	selectedRemoteIndex: number,
	remoteFileContext: RemoteFileContext | undefined,
	connections: ActiveConnection[],
	ports: ListeningPort[],
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
		return (
			<FilesWorkspace
				root={fileRoot}
				entries={fileEntries}
				locations={fileLocations}
				selectedIndex={selectedFileIndex}
				selectedLocationIndex={selectedLocationIndex}
				commandLine={commandLine}
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
		return <ProcessesWorkspace inventory={inventory} />;
	}
	if (screen === "network") {
		return <NetworkWorkspace summary={summary} t={t} />;
	}
	if (screen === "interfaces") {
		return <InterfacesWorkspace summary={summary} t={t} />;
	}
	if (screen === "routes") {
		return (
			<ReferenceWorkspace
				title={t("screen.routes")}
				actionId="routes.inspect"
			/>
		);
	}
	if (screen === "connections") {
		return (
			<ConnectionsWorkspace
				connections={connections}
				visibleRows={Math.max(5, height - 7)}
				t={t}
			/>
		);
	}
	if (screen === "ports") {
		return (
			<PortsWorkspace
				ports={ports}
				visibleRows={Math.max(5, height - 7)}
				t={t}
			/>
		);
	}
	if (screen === "tools") {
		return <ToolsWorkspace t={t} />;
	}
	if (screen === "networkTools") {
		return <NetworkToolsWorkspace />;
	}
	if (screen === "timeline") {
		return (
			<ReferenceWorkspace
				title={t("screen.timeline")}
				actionId="timeline.export"
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
	locations,
	selectedIndex,
	selectedLocationIndex,
	commandLine,
	remoteContext,
	focused,
	visibleRows,
	t,
}: {
	root: string;
	entries: FileEntry[];
	locations: FileLocation[];
	selectedIndex: number;
	selectedLocationIndex: number;
	commandLine: CommandLineState;
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
						? "files focus · j/k select · enter open · 1-9 location · : path · g cycle · u parent · h/esc back"
						: "enter opens file focus"}
				</Text>
				{commandLine.active ? (
					<Text color="yellow">
						:{commandLine.prompt} {commandLine.value || " "}
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
				<Text color="gray">picos locations · picos dir / · picos dir ~</Text>
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
					? "files focus · j/k select · enter open · 1-9 location · : path · g cycle · u parent · h/esc back"
					: "enter opens file focus · read-only navigation"}
			</Text>
			{commandLine.active ? (
				<Text color="yellow">
					:{commandLine.prompt} {commandLine.value || " "}
				</Text>
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
				<Text>1-9 jump locations · : path input · g cycle · picos dir ~</Text>
				<Text>picos type /path/to/file</Text>
				<Text color="gray">
					next: path input dialog · edit/save confirmation · SFTP provider
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
}: {
	inventory?: SystemInventory;
}): React.ReactElement {
	const processes = inventory?.processes.slice(0, 10) ?? [];
	return (
		<Box flexDirection="column">
			<Text bold>Processes</Text>
			<Text color="gray">read-only process snapshot</Text>
			<Box marginTop={1} flexDirection="column">
				{processes.length ? (
					processes.map((process) => (
						<Text key={`${process.pid}:${process.command}`}>
							{String(process.pid).padEnd(7)} {clip(process.command, 46)}
						</Text>
					))
				) : (
					<Text color="gray">loading...</Text>
				)}
			</Box>
		</Box>
	);
}

function NetworkWorkspace({
	summary,
	t,
}: {
	summary?: NetworkSummary;
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.network")}</Text>
			<Text color="gray">read-only adapter state</Text>
			<Box marginTop={1} flexDirection="column">
				{summary?.interfaces.map((item) => (
					<Text key={item.name}>
						{item.name.padEnd(12)} {item.status.padEnd(12)} IPv4=
						{item.ipv4 ?? "-"} IPv6={item.ipv6 ?? "-"}
					</Text>
				)) ?? <Text color="gray">loading...</Text>}
			</Box>
		</Box>
	);
}

function InterfacesWorkspace({
	summary,
	t,
}: {
	summary?: NetworkSummary;
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.interfaces")}</Text>
			<Text color="gray">inventory: status, IP, MAC, and future counters</Text>
			<Box marginTop={1} flexDirection="column">
				{summary?.interfaces.map((item) => (
					<Text key={item.name}>
						{item.name.padEnd(12)} {item.status.padEnd(12)} mac=
						{item.mac ?? "-"} ip={item.ipv4 ?? item.ipv6 ?? "-"}
					</Text>
				)) ?? <Text color="gray">loading...</Text>}
			</Box>
		</Box>
	);
}

function ConnectionsWorkspace({
	connections,
	visibleRows,
	t,
}: {
	connections: ActiveConnection[];
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const visibleConnections = connections.slice(0, visibleRows);
	const established = connections.filter(
		(connection) => connection.state === "ESTABLISHED",
	).length;

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.connections")}</Text>
			<Text color="gray">
				active endpoints from netstat · established {established} / total{" "}
				{connections.length}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">PROTO LOCAL REMOTE STATE</Text>
				{visibleConnections.length ? (
					visibleConnections.map((connection) => (
						<Text
							key={`${connection.protocol}:${connection.localAddress}:${connection.localPort}:${connection.remoteAddress}:${connection.remotePort}:${connection.state ?? ""}:${connection.pid ?? ""}`}
						>
							{connection.protocol.padEnd(6)}{" "}
							{clip(
								`${connection.localAddress}:${connection.localPort}`,
								24,
							).padEnd(24)}{" "}
							{clip(
								`${connection.remoteAddress}:${connection.remotePort}`,
								24,
							).padEnd(24)}{" "}
							{connection.state ?? "-"}
						</Text>
					))
				) : (
					<Text color="gray">loading connections...</Text>
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>picos connections · picos connections --raw</Text>
			</Box>
		</Box>
	);
}

function PortsWorkspace({
	ports,
	visibleRows,
	t,
}: {
	ports: ListeningPort[];
	visibleRows: number;
	t: (key: string) => string;
}): React.ReactElement {
	const visiblePorts = ports.slice(0, visibleRows);

	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.ports")}</Text>
			<Text color="gray">
				listening TCP ports from lsof/ss/netstat · total {ports.length}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">PROTO LOCAL PROCESS PID USER</Text>
				{visiblePorts.length ? (
					visiblePorts.map((port) => (
						<Text
							key={`${port.protocol}:${port.localAddress}:${port.localPort}:${port.pid}:${port.command}`}
						>
							{port.protocol.padEnd(6)}{" "}
							{clip(`${port.localAddress}:${port.localPort}`, 24).padEnd(24)}{" "}
							{clip(port.command, 18).padEnd(18)} {port.pid.padEnd(7)}{" "}
							{clip(port.user, 12)}
						</Text>
					))
				) : (
					<Text color="gray">loading listening ports...</Text>
				)}
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">COMMAND LINE</Text>
				<Text>picos ports · picos ports --raw</Text>
			</Box>
		</Box>
	);
}

function ReferenceWorkspace({
	title,
	actionId,
}: {
	title: string;
	actionId: string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{title}</Text>
			<Text color="gray">lazyifconfig-inspired module staged for picos.</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>Action: {actionId}</Text>
				<Text>Mode: read-only first</Text>
				<Text>Next: adapter parser + raw output viewer</Text>
			</Box>
		</Box>
	);
}

function ToolsWorkspace({
	t,
}: {
	t: (key: string) => string;
}): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.tools")}</Text>
			<Text color="gray">Tools Hub queue</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>tools.dns DNS lookup</Text>
				<Text>tools.whois WHOIS/RDAP lookup</Text>
				<Text>tools.ipInfo IP information</Text>
				<Text>tools.tls TLS inspector</Text>
				<Text>tools.traceroute Traceroute</Text>
				<Text>ping.default Ping default host</Text>
				<Text>raw.view Raw command output viewer</Text>
			</Box>
		</Box>
	);
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

function formatSidebarLine(
	active: boolean,
	index: number,
	label: string,
	width: number,
): string {
	const marker = active ? ">" : " ";
	return `${marker} ${index} ${label}`.slice(0, width).padEnd(width);
}
