import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfigPath, readConfig } from "../config/store";
import { getActionCatalog, type PicosAction } from "../core/actions";
import { runPing } from "../core/command";
import { runDoctorChecks } from "../core/doctor";
import { getNetworkSummary } from "../core/network";
import { getRoadmapItems } from "../core/roadmap";
import { createSystemInventory } from "../core/systemInventory";
import type {
	DoctorCheck,
	Language,
	NetworkSummary,
	SystemInventory,
} from "../core/types";
import { VERSION } from "../core/version";
import { createTranslator } from "../i18n/catalog";
import { appendEvent, type ConsoleEvent, createEvent } from "./events";
import {
	enterFocus,
	type FocusArea,
	getScreenByShortcut,
	getScreenIndex,
	getVisibleWindow,
	leaveFocus,
	moveScreen,
	type Screen,
	screenOrder,
} from "./navigation";
import { computeShellLayout, formatTopBarLine } from "./shell";

type CommandStatus = "idle" | "running";

export function App(): React.ReactElement {
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const layout = computeShellLayout(columns, rows);
	const actions = useMemo(() => getActionCatalog(), []);
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
	const t = useMemo(() => createTranslator(language), [language]);

	const log = useCallback((level: ConsoleEvent["level"], message: string) => {
		setEvents((current) => appendEvent(current, createEvent(level, message)));
	}, []);

	const refresh = useCallback(async () => {
		try {
			setError(undefined);
			const nextSummary = await getNetworkSummary();
			setSummary(nextSummary);
			setInventory(await createSystemInventory({ network: nextSummary }));
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

				if (
					action.id === "routes.inspect" ||
					action.id === "network.connect" ||
					action.id === "connections.list" ||
					action.id === "ports.list" ||
					action.id === "tools.dns" ||
					action.id === "tools.traceroute" ||
					action.id === "timeline.export" ||
					action.id === "raw.view"
				) {
					log("info", `${action.id} queued for adapter implementation`);
				}
			} catch (caught) {
				log("fail", caught instanceof Error ? caught.message : String(caught));
			} finally {
				setCommandStatus("idle");
			}
		},
		[log, refresh],
	);

	useEffect(() => {
		readConfig().then((config) => {
			setRefreshInterval(config.refreshInterval);
			setLanguage(config.language);
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
		if (input === "q") {
			exit();
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
			} else if (focusArea === "actions") {
				runAction(actions[selectedActionIndex]);
			}
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
			if (focusArea === "actions") {
				setFocusArea("workspaces");
			} else {
				setScreen((current) => moveScreen(current, "previous"));
			}
		}

		if (key.downArrow || input === "j") {
			if (focusArea === "actions") {
				setSelectedActionIndex((index) => (index + 1) % actions.length);
			} else {
				setScreen((current) => moveScreen(current, "next"));
			}
		}

		if (key.upArrow || input === "k") {
			if (focusArea === "actions") {
				setSelectedActionIndex(
					(index) => (index - 1 + actions.length) % actions.length,
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
					focusArea={focusArea}
					doctorChecks={doctorChecks}
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
	const visibleRows = Math.max(1, height - 2);
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
	focusArea,
	doctorChecks,
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
	focusArea: FocusArea;
	doctorChecks: DoctorCheck[];
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
					focusArea,
					doctorChecks,
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
	focusArea: FocusArea,
	doctorChecks: DoctorCheck[],
	height: number,
	t: (key: string) => string,
): React.ReactElement {
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
			<ReferenceWorkspace
				title={t("screen.connections")}
				actionId="connections.list"
			/>
		);
	}
	if (screen === "ports") {
		return (
			<ReferenceWorkspace title={t("screen.ports")} actionId="ports.list" />
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
		<DashboardWorkspace summary={summary} doctorChecks={doctorChecks} t={t} />
	);
}

function DashboardWorkspace({
	summary,
	doctorChecks,
	t,
}: {
	summary?: NetworkSummary;
	doctorChecks: DoctorCheck[];
	t: (key: string) => string;
}): React.ReactElement {
	const primary = summary?.primaryInterface;
	return (
		<Box flexDirection="column">
			<Text bold>{t("screen.dashboard")}</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">{t("dashboard.systemLink")}</Text>
				<Text>
					Status {String(summary?.status ?? "loading").padEnd(10)} Host{" "}
					{clip(summary?.host ?? "local", 28)}
				</Text>
				<Text>
					OS {String(summary?.platform ?? process.platform).padEnd(10)} DNS{" "}
					{clip(summary?.dnsServers.join(", ") || "-", 28)}
				</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">{t("dashboard.primaryInterface")}</Text>
				<Text>
					Name {clip(primary?.name ?? "-", 16).padEnd(16)} IPv4{" "}
					{clip(primary?.ipv4 ?? "-", 22)}
				</Text>
				<Text>
					IPv6 {clip(primary?.ipv6 ?? "-", 16).padEnd(16)} GW{" "}
					{clip(summary?.gateway ?? "-", 22)}
				</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Text color="gray">{t("dashboard.doctorSnapshot")}</Text>
				{doctorChecks.length ? (
					doctorChecks.slice(0, 6).map((check) => (
						<Text
							key={check.label}
							color={check.status === "pass" ? "green" : "yellow"}
						>
							{check.status.toUpperCase().padEnd(5)} {check.label}
						</Text>
					))
				) : (
					<Text color="gray">{t("dashboard.runDoctorHint")}</Text>
				)}
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
				<Text>routes.inspect Route table summary</Text>
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

function formatSidebarLine(
	active: boolean,
	index: number,
	label: string,
	width: number,
): string {
	const marker = active ? ">" : " ";
	return `${marker} ${index} ${label}`.slice(0, width).padEnd(width);
}
