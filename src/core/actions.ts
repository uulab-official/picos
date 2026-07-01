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
		| "status"
		| "logs"
		| "raw"
		| "remote"
		| "clipboard";
	risk: ActionRisk;
	privilege: ActionPrivilege;
	enabled: boolean;
	confirmationRequired: boolean;
	confirmationPhrase?: string;
};

export type ActionPreviewPlan = {
	actionId: string;
	title: string;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	enabled: boolean;
	dryRun: boolean;
	confirmationPhrase?: string;
	blockedReason?: "disabled-by-default" | "confirmation-required";
	commandPreview?: ActionPreviewCommand;
	preview: string[];
};

export type ActionPreviewCommand = {
	adapter: "macos" | "linux" | "windows";
	command: string;
	args: string[];
	note: string;
	dryRunExecutable?: boolean;
};

export type ActionPreviewConfirmation = {
	actionId: string;
	status: "confirmed-disabled" | "rejected";
	expectedPhrase: string;
	receivedPhrase: string;
	confirmed: boolean;
	executionEnabled: false;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	dryRun: true;
	commandPreview?: ActionPreviewCommand;
};

export type ActionControlSimulation = {
	actionId: string;
	status: "blocked-by-policy";
	policy: "mutation-disabled";
	approvalRequired: true;
	confirmed: boolean;
	executionEnabled: false;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	dryRun: true;
	blockers: string[];
	commandPreview?: ActionPreviewCommand;
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
		title: "Telnet-style TCP check",
		description:
			"Check whether a host and port accept TCP connections, like a safe non-interactive telnet probe.",
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
		id: "logs.read",
		title: "Read OS logs",
		description:
			"Read recent local OS log entries through the platform log adapter.",
		category: "logs",
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
		id: "tools.export",
		title: "Export tools history",
		description:
			"Save scoped Tools Hub history to a timestamped markdown file.",
		category: "tools",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "picos.update",
		title: "Check for updates",
		description: "Read npm registry metadata for the latest picos version.",
		category: "system",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "picos.update.apply",
		title: "Apply picos update",
		description:
			"Preview npm global update command before any package mutation.",
		category: "system",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "update picos",
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
		id: "status.timelineTrail.select",
		title: "Select recovered Timeline trail",
		description:
			"Cycle recovered Timeline Evidence trail exports in the Status Activity shelf.",
		category: "status",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "status.timelineTrail.open",
		title: "Open recovered Timeline trail",
		description:
			"Open the selected recovered Timeline Evidence trail export through the locked file-open prompt.",
		category: "status",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "status.timelineTrail.search",
		title: "Search recovered Timeline trail",
		description:
			"Jump to Timeline audit search for the selected recovered Evidence trail query.",
		category: "status",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "status.timelineTrail.source",
		title: "Filter recovered Timeline trail source",
		description:
			"Cycle recovered Timeline Evidence trail source filters across all, evidence, and palette exports.",
		category: "status",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "status.resultJump.select",
		title: "Select Status result Timeline jump",
		description:
			"Result select shortcut for cycling Timeline-jumpable Status Activity rows in the Status result jump browser.",
		category: "status",
		risk: "read",
		privilege: "none",
		enabled: true,
		confirmationRequired: false,
	},
	{
		id: "status.resultJump.open",
		title: "Open Timeline result jump",
		description:
			"Timeline result open shortcut for the selected Status Activity result jump with the matching filter and search.",
		category: "status",
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
		id: "clipboard.write",
		title: "Write clipboard",
		description:
			"Write a selected endpoint or process resource summary after preview.",
		category: "clipboard",
		risk: "write",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "copy",
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
		id: "process.terminate",
		title: "Terminate process",
		description:
			"Terminate a selected user-owned process after PID and port review.",
		category: "ports",
		risk: "destructive",
		privilege: "user",
		enabled: false,
		confirmationRequired: true,
		confirmationPhrase: "kill process",
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

export function createActionPreviewPlan(
	actionId: string,
	platform: string,
	commandPreview?: ActionPreviewCommand,
): ActionPreviewPlan | undefined {
	const action = actionCatalog.find((candidate) => candidate.id === actionId);
	if (!action) {
		return undefined;
	}
	const blockedReason = !action.enabled
		? "disabled-by-default"
		: action.confirmationRequired
			? "confirmation-required"
			: undefined;
	const preview = [
		`Risk: ${action.risk}`,
		`Privilege: ${action.privilege}`,
		`Platform: ${platform}`,
	];
	if (action.confirmationPhrase) {
		preview.push(`Confirmation: type "${action.confirmationPhrase}"`);
	}
	if (commandPreview) {
		preview.push(`Adapter: ${commandPreview.adapter}`);
		preview.push(`Command: ${formatPreviewCommand(commandPreview)}`);
	}
	preview.push("Dry run: no OS command will be executed");

	return {
		actionId: action.id,
		title: action.title,
		risk: action.risk,
		privilege: action.privilege,
		enabled: action.enabled,
		dryRun: true,
		confirmationPhrase: action.confirmationPhrase,
		blockedReason,
		commandPreview,
		preview,
	};
}

export function formatActionPreviewRows(plan: ActionPreviewPlan): string[] {
	const state = plan.enabled ? "ready" : "locked";
	return [
		`CONTROL PREVIEW ${plan.actionId}`,
		`state=${state} risk=${plan.risk} privilege=${plan.privilege} dryRun=${plan.dryRun}`,
		...(plan.confirmationPhrase ? [`confirm=${plan.confirmationPhrase}`] : []),
		...(plan.blockedReason ? [`blocked=${plan.blockedReason}`] : []),
		...(plan.commandPreview ? [`adapter=${plan.commandPreview.adapter}`] : []),
		...(plan.commandPreview
			? [`command=${formatPreviewCommand(plan.commandPreview)}`]
			: []),
		...plan.preview,
	];
}

export function formatActionPreviewAuditMessage(
	plan: ActionPreviewPlan,
): string {
	return [
		`control preview ${plan.actionId}`,
		`risk=${plan.risk}`,
		`privilege=${plan.privilege}`,
		`dryRun=${plan.dryRun}`,
		plan.blockedReason ? `blocked=${plan.blockedReason}` : "",
		plan.commandPreview ? `adapter=${plan.commandPreview.adapter}` : "",
		plan.commandPreview
			? `command="${formatPreviewCommand(plan.commandPreview)}"`
			: "",
	]
		.filter(Boolean)
		.join(" ");
}

export function submitActionPreviewConfirmation(
	plan: ActionPreviewPlan,
	input: string,
): ActionPreviewConfirmation {
	const expectedPhrase = plan.confirmationPhrase?.trim() ?? "";
	const receivedPhrase = input.trim();
	const confirmed =
		expectedPhrase.length > 0 && receivedPhrase === expectedPhrase;

	return {
		actionId: plan.actionId,
		status: confirmed ? "confirmed-disabled" : "rejected",
		expectedPhrase,
		receivedPhrase,
		confirmed,
		executionEnabled: false,
		risk: plan.risk,
		privilege: plan.privilege,
		dryRun: true,
		commandPreview: plan.commandPreview,
	};
}

export function formatActionConfirmationAuditMessage(
	confirmation: ActionPreviewConfirmation,
): string {
	return [
		`control confirmation ${confirmation.actionId}`,
		`status=${confirmation.status}`,
		`risk=${confirmation.risk}`,
		`privilege=${confirmation.privilege}`,
		`dryRun=${confirmation.dryRun}`,
		`executionEnabled=${confirmation.executionEnabled}`,
		confirmation.commandPreview
			? `adapter=${confirmation.commandPreview.adapter}`
			: "",
		confirmation.commandPreview
			? `command="${formatPreviewCommand(confirmation.commandPreview)}"`
			: "",
	]
		.filter(Boolean)
		.join(" ");
}

export function createActionControlSimulation(
	plan: ActionPreviewPlan,
	confirmation?: ActionPreviewConfirmation,
): ActionControlSimulation {
	const blockers = [
		...(plan.blockedReason ? [plan.blockedReason] : []),
		...(!confirmation
			? ["confirmation-missing"]
			: confirmation.confirmed
				? []
				: ["confirmation-rejected"]),
		...(plan.risk === "read" ? [] : ["mutation-approval-required"]),
		...(plan.privilege === "admin" ? ["admin-approval-required"] : []),
		"execution-disabled",
	];

	return {
		actionId: plan.actionId,
		status: "blocked-by-policy",
		policy: "mutation-disabled",
		approvalRequired: true,
		confirmed: confirmation?.confirmed ?? false,
		executionEnabled: false,
		risk: plan.risk,
		privilege: plan.privilege,
		dryRun: true,
		blockers,
		commandPreview: plan.commandPreview,
	};
}

export function formatActionSimulationRows(
	simulation: ActionControlSimulation,
): string[] {
	return [
		`CONTROL SIMULATION ${simulation.actionId}`,
		`status=${simulation.status} policy=${simulation.policy} approval=required`,
		`confirmed=${simulation.confirmed} executionEnabled=${simulation.executionEnabled} dryRun=${simulation.dryRun}`,
		`blockers=${simulation.blockers.join(",")}`,
		...(simulation.commandPreview
			? [`adapter=${simulation.commandPreview.adapter}`]
			: []),
		...(simulation.commandPreview
			? [`command=${formatPreviewCommand(simulation.commandPreview)}`]
			: []),
	];
}

export function formatActionSimulationAuditMessage(
	simulation: ActionControlSimulation,
): string {
	return [
		`control simulation ${simulation.actionId}`,
		`status=${simulation.status}`,
		`policy=${simulation.policy}`,
		"approval=required",
		`confirmed=${simulation.confirmed}`,
		`executionEnabled=${simulation.executionEnabled}`,
		`blockers=${simulation.blockers.join(",")}`,
		simulation.commandPreview
			? `adapter=${simulation.commandPreview.adapter}`
			: "",
		simulation.commandPreview
			? `command="${formatPreviewCommand(simulation.commandPreview)}"`
			: "",
	]
		.filter(Boolean)
		.join(" ");
}

function formatPreviewCommand(command: ActionPreviewCommand): string {
	return [command.command, ...command.args].join(" ").trim();
}
