import type { NetworkInterfaceInfo } from "node:os";

export type SupportedPlatform = NodeJS.Platform;

export type NetworkStatus = "online" | "offline";

export type InterfaceStatus = "connected" | "disconnected";

export type NetworkInterfaceKind =
	| "wifiOrEthernet"
	| "loopback"
	| "vpn"
	| "bridge"
	| "container"
	| "linkLocal"
	| "unknown";

export type NetworkGroupKind =
	| "lan"
	| "loopback"
	| "vpn"
	| "container"
	| "linkLocal"
	| "public"
	| "unassigned";

export type NetworkInterfaceMap = NodeJS.Dict<NetworkInterfaceInfo[]>;

export type NetworkInterfaceSummary = {
	name: string;
	status: InterfaceStatus;
	kind: NetworkInterfaceKind;
	ipv4?: string;
	ipv6?: string;
	ipv4Cidr?: string;
	ipv6Cidr?: string;
	netmask?: string;
	mac?: string;
	mtu?: number;
	rxBytes?: number;
	txBytes?: number;
	rxPackets?: number;
	txPackets?: number;
};

export type NetworkInterfaceStats = Pick<
	NetworkInterfaceSummary,
	"mtu" | "rxBytes" | "txBytes" | "rxPackets" | "txPackets"
>;

export type NetworkInterfaceStatsMap = Record<string, NetworkInterfaceStats>;

export type NetworkGroupSummary = {
	kind: NetworkGroupKind;
	label: string;
	scope: string;
	hint: string;
	interfaces: string[];
	addresses: string[];
};

export type NetworkSummary = {
	status: NetworkStatus;
	host: string;
	platform: SupportedPlatform;
	interfaces: NetworkInterfaceSummary[];
	networkGroups: NetworkGroupSummary[];
	primaryInterface?: NetworkInterfaceSummary;
	gateway?: string;
	dnsServers: string[];
	publicIp?: string;
};

export type SystemSummary = {
	hostname: string;
	platform: SupportedPlatform;
	arch: string;
	release: string;
	uptimeSeconds: number;
};

export type RuntimeSummary = {
	picosVersion: string;
	nodeVersion: string;
	bunVersion: string;
	configPath: string;
};

export type HardwareSummary = {
	cpuModel: string;
	cpuCount: number;
	totalMemoryBytes: number;
	freeMemoryBytes: number;
};

export type StorageVolume = {
	filesystem: string;
	mount: string;
	size?: string;
	used?: string;
	available?: string;
	capacity?: string;
};

export type ProcessSummary = {
	pid: number;
	command: string;
	cpu?: string;
	memory?: string;
};

export type ActiveConnection = {
	protocol: string;
	localAddress: string;
	localPort: string;
	remoteAddress: string;
	remotePort: string;
	state?: string;
	pid?: string;
};

export type ListeningPort = {
	protocol: string;
	localAddress: string;
	localPort: string;
	pid: string;
	command: string;
	user: string;
};

export type PermissionSummary = {
	user: string;
	isAdmin: boolean;
	detail: string;
};

export type SystemInventory = {
	system: SystemSummary;
	hardware: HardwareSummary;
	storage: StorageVolume[];
	processes: ProcessSummary[];
	network: NetworkSummary;
	permission: PermissionSummary;
	runtime: RuntimeSummary;
};

export type SafeExecResult = {
	command: string;
	args: string[];
	stdout: string;
	stderr: string;
	exitCode: number | null;
	success: boolean;
};

export type DoctorStatus = "pass" | "warn" | "fail";

export type DoctorCheck = {
	label: string;
	status: DoctorStatus;
	detail?: string;
};

export type PingCommand = {
	command: "ping";
	args: string[];
};

export type PingOptions = {
	count?: number;
	timeoutMs?: number;
};

export type TcpConnectResult = {
	host: string;
	port: number;
	reachable: boolean;
	elapsedMs: number;
	error?: string;
};

export type TcpConnectOptions = {
	timeoutMs?: number;
};

export type SftpRemoteProfile = {
	id: string;
	kind: "sftp";
	host: string;
	port: number;
	username: string;
	root: string;
	keyPath?: string;
};

export type LogProfile = {
	level: "all" | "info" | "warn" | "fail";
	query: string;
};

export type PicosConfig = {
	theme: "dark" | "light";
	language: Language;
	refreshInterval: number;
	defaultPingHost: string;
	showPublicIp: boolean;
	enableExperimentalControls: boolean;
	controlExecutionMode: "disabled" | "dry-run";
	allowAdminDryRun: boolean;
	editorSaveMode: "disabled" | "local-write";
	remoteProfiles: SftpRemoteProfile[];
	logProfiles: LogProfile[];
	logSearchPresets: string[];
	routeFilterPresets: string[];
	connectionSort: string;
	portSort: string;
	connectionFilterPresets: string[];
	portFilterPresets: string[];
	toolHistoryFilterPresets: string[];
	toolHistorySort: string;
	toolHistoryGroup: string;
	toolHistoryDetailView: string;
	toolTargetPresets: Array<{
		id: string;
		label: string;
		actionId: string;
		target: string;
		hint: string;
	}>;
	toolTargetPresetLimit: number;
	auditArchiveRetentionLimit: number;
};

export type Language = "en" | "ko" | "ja" | "zh";
