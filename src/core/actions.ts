export type ActionRisk = "read" | "write" | "destructive";

export type ActionPrivilege = "none" | "user" | "admin";

export type PicosAction = {
	id: string;
	title: string;
	description: string;
	category:
		| "network"
		| "dns"
		| "system"
		| "config"
		| "files"
		| "routes"
		| "connections"
		| "ports"
		| "tools"
		| "timeline"
		| "raw"
		| "remote";
	risk: ActionRisk;
	privilege: ActionPrivilege;
	enabled: boolean;
	confirmationRequired: boolean;
	confirmationPhrase?: string;
};

const actionCatalog: PicosAction[] = [
	{
		id: "network.inspect",
		title: "Inspect interfaces",
		description: "Read local interface, gateway, DNS, and public IP status.",
		category: "network",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "system.inventory",
		title: "Full system inventory",
		description:
			"Read OS, hardware, storage, process, runtime, and permission facts.",
		category: "system",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "doctor.run",
		title: "Run doctor",
		description: "Run read-only network diagnostics.",
		category: "network",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "ping.default",
		title: "Ping default host",
		description: "Ping the configured default host and show packet results.",
		category: "network",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "config.show",
		title: "Show config",
		description: "Read current picos config and config path.",
		category: "config",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "files.list",
		title: "List files",
		description:
			"Read the current workspace directory like a DOS-style dir view.",
		category: "files",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "files.read",
		title: "Preview text file",
		description: "Read a UTF-8 text file into the editor preview buffer.",
		category: "files",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "routes.inspect",
		title: "Inspect routes",
		description: "Summarize default routes, route table hints, and raw output.",
		category: "routes",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "connections.list",
		title: "List connections",
		description: "List active local and remote endpoints from OS adapters.",
		category: "connections",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "ports.list",
		title: "List listening ports",
		description:
			"Show listening TCP ports and process metadata where available.",
		category: "ports",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "process.inspect",
		title: "Inspect process",
		description: "Inspect one local PID with command, parent, user, and usage.",
		category: "system",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "tools.dns",
		title: "DNS lookup",
		description: "Run DNS lookup tooling from the picos Tools Hub.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "tools.traceroute",
		title: "Traceroute",
		description: "Trace the network path to a target host.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "tools.whois",
		title: "WHOIS/RDAP lookup",
		description: "Read public RDAP registration metadata for a domain or IP.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "tools.ipInfo",
		title: "IP information",
		description: "Read ASN, organization, country, and reverse DNS metadata.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "tools.tls",
		title: "TLS inspector",
		description: "Inspect TLS protocol, cipher, and certificate metadata.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "network.connect",
		title: "TCP connect check",
		description: "Check whether a host and port accept TCP connections.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "routes.path",
		title: "Destination path lookup",
		description: "Check how a destination would be routed by the local OS.",
		category: "routes",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "timeline.export",
		title: "Export timeline",
		description: "Save local in-app network events to a timestamped file.",
		category: "timeline",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "raw.view",
		title: "View raw output",
		description: "Inspect raw OS command output behind summarized panels.",
		category: "raw",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "remote.profiles",
		title: "List remote profiles",
		description:
			"List configured SFTP file profiles without opening a session.",
		category: "remote",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "remote.sftp.connect",
		title: "Connect SFTP provider",
		description:
			"Open a remote file provider after credential and host review.",
		category: "remote",
		risk: "read",
		privilege: "user",
		enabled: false,
		confirmationRequired: false,
	},
	{
		id: "files.write",
		title: "Write file",
		description: "Save editor buffer after diff preview and confirmation.",
		category: "files",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "save file",
	},
	{
		id: "files.copy",
		title: "Copy file",
		description: "Copy a selected file or directory after destination preview.",
		category: "files",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "copy file",
	},
	{
		id: "files.move",
		title: "Move file",
		description: "Move a selected file or directory after destination preview.",
		category: "files",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "move file",
	},
	{
		id: "files.delete",
		title: "Delete file",
		description: "Delete a selected file after path review and confirmation.",
		category: "files",
		risk: "destructive",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "delete file",
	},
	{
		id: "dns.flush",
		title: "Flush DNS cache",
		description:
			"Clear local DNS resolver cache after preview and confirmation.",
		category: "dns",
		risk: "write",
		privilege: "admin",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "flush dns",
	},
	{
		id: "interface.disable",
		title: "Disable interface",
		description: "Disable a selected network interface.",
		category: "network",
		risk: "destructive",
		privilege: "admin",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "disable interface",
	},
	{
		id: "route.add",
		title: "Add route",
		description: "Add a routing table entry with dry-run preview.",
		category: "network",
		risk: "write",
		privilege: "admin",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "add route",
	},
	{
		id: "service.restart",
		title: "Restart service",
		description: "Restart a local system service through an OS adapter.",
		category: "system",
		risk: "destructive",
		privilege: "admin",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "restart service",
	},
];

export function getActionCatalog(): PicosAction[] {
	return actionCatalog.map((action) => ({ ...action }));
}

export function getActionSummary(): {
	total: number;
	enabled: number;
	locked: number;
	elevated: number;
} {
	const catalog = getActionCatalog();
	return {
		total: catalog.length,
		enabled: catalog.filter((action) => action.enabled).length,
		locked: catalog.filter((action) => !action.enabled).length,
		elevated: catalog.filter((action) => action.privilege === "admin").length,
	};
}
