import { extname, join, relative, resolve } from "node:path";
import { safeExec } from "../utils/safeExec";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type FileOpenSource =
	| "route-handoff"
	| "endpoint-handoff"
	| "cleanup-export"
	| "timeline-export";

export type FileOpenAdapter = {
	platform: SupportedPlatform;
	command: string;
	args: string[];
};

export type FileOpenPlan = {
	source: FileOpenSource;
	label: string;
	path: string;
	risk: "write";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "open";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
	adapter: FileOpenAdapter;
};

export type FileOpenAudit = {
	action: "file.open";
	source: FileOpenSource;
	label: string;
	path: string;
	risk: "write";
	privilege: "user";
	confirmed: boolean;
	adapter: string;
};

export type FileOpenResult = {
	success: boolean;
	audit: FileOpenAudit;
	error?: string;
	stdout?: string;
	stderr?: string;
};

export type FileOpenRunner = (
	command: string,
	args: string[],
) => Promise<SafeExecResult>;

export function buildFileOpenPlan({
	baseDir,
	confirmation,
	label,
	path,
	platform,
	source,
}: {
	baseDir: string;
	confirmation?: string;
	label: string;
	path: string;
	platform: SupportedPlatform;
	source: FileOpenSource;
}): FileOpenPlan {
	const adapter = createFileOpenAdapter(platform, path);
	const allowed = isAllowedHandoffPath(baseDir, path);
	const confirmed = confirmation === "open";
	const enabled = allowed && confirmed;
	const reason = !allowed
		? "external file open is limited to picos handoff files"
		: enabled
			? "confirmed"
			: "type open to launch external file viewer";

	return {
		source,
		label,
		path,
		risk: "write",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "open",
		confirmed,
		enabled,
		reason,
		adapter,
	};
}

export function formatFileOpenPlanRows(plan: FileOpenPlan): string[] {
	return [
		`FILE OPEN ${plan.source}`,
		`label ${plan.label}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		`adapter=${formatFileOpenAdapterName(plan.adapter.platform)}`,
		`command=${formatFileOpenCommand(plan.adapter)}`,
		`path=${plan.path}`,
	];
}

export async function runFileOpenPlan(
	plan: FileOpenPlan,
	runner: FileOpenRunner = (command, args) =>
		safeExec(command, args, { timeoutMs: 10000 }),
): Promise<FileOpenResult> {
	if (!plan.enabled) {
		return {
			success: false,
			audit: createFileOpenAudit(plan),
			error: `File open is locked: ${plan.reason}`,
		};
	}

	const result = await runner(plan.adapter.command, plan.adapter.args);
	return {
		success: result.success,
		audit: createFileOpenAudit(plan),
		...(result.stdout ? { stdout: result.stdout } : {}),
		...(result.stderr ? { stderr: result.stderr, error: result.stderr } : {}),
	};
}

function createFileOpenAudit(plan: FileOpenPlan): FileOpenAudit {
	return {
		action: "file.open",
		source: plan.source,
		label: plan.label,
		path: plan.path,
		risk: plan.risk,
		privilege: plan.privilege,
		confirmed: plan.confirmed,
		adapter: plan.adapter.command,
	};
}

function createFileOpenAdapter(
	platform: SupportedPlatform,
	path: string,
): FileOpenAdapter {
	if (platform === "darwin") {
		return { platform, command: "open", args: [path] };
	}

	if (platform === "win32") {
		return {
			platform,
			command: "rundll32",
			args: ["url.dll,FileProtocolHandler", path],
		};
	}

	return { platform, command: "xdg-open", args: [path] };
}

function isAllowedHandoffPath(baseDir: string, path: string): boolean {
	const target = resolve(path);
	return (
		isAllowedHandoffPathIn(resolve(join(baseDir, "routes")), target) ||
		isAllowedHandoffPathIn(resolve(join(baseDir, "endpoints")), target) ||
		isAllowedHandoffPathIn(resolve(join(baseDir, "cleanup")), target) ||
		isAllowedTimelineAuditExportPath(resolve(join(baseDir, "audit")), target) ||
		isAllowedTimelineAuditExportPath(
			resolve(join(baseDir, "audit", "archive")),
			target,
		)
	);
}

function isAllowedHandoffPathIn(handoffDir: string, target: string): boolean {
	const fromHandoffDir = relative(handoffDir, target);
	return (
		fromHandoffDir !== "" &&
		!fromHandoffDir.startsWith("..") &&
		!fromHandoffDir.startsWith("/") &&
		extname(target) === ".md"
	);
}

function isAllowedTimelineAuditExportPath(
	auditDir: string,
	target: string,
): boolean {
	const fromAuditDir = relative(auditDir, target);
	return (
		fromAuditDir !== "" &&
		!fromAuditDir.startsWith("..") &&
		!fromAuditDir.startsWith("/") &&
		/^picos-audit-.+\.log$/.test(fromAuditDir)
	);
}

function formatFileOpenAdapterName(platform: SupportedPlatform): string {
	if (platform === "darwin") {
		return "macos";
	}
	if (platform === "win32") {
		return "windows";
	}
	return "linux";
}

function formatFileOpenCommand(adapter: FileOpenAdapter): string {
	return [adapter.command, ...adapter.args].join(" ");
}
