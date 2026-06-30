import { safeExec } from "../utils/safeExec";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type ExternalOpenSource = "update-handoff";

export type ExternalOpenAdapter = {
	platform: SupportedPlatform;
	command: string;
	args: string[];
};

export type ExternalOpenPlan = {
	source: ExternalOpenSource;
	label: string;
	url: string;
	risk: "write";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "open";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
	adapter: ExternalOpenAdapter;
};

export type ExternalOpenAudit = {
	action: "external.open";
	source: ExternalOpenSource;
	label: string;
	url: string;
	risk: "write";
	privilege: "user";
	confirmed: boolean;
	adapter: string;
};

export type ExternalOpenResult = {
	success: boolean;
	audit: ExternalOpenAudit;
	error?: string;
	stdout?: string;
	stderr?: string;
};

export type ExternalOpenRunner = (
	command: string,
	args: string[],
) => Promise<SafeExecResult>;

export function buildExternalOpenPlan({
	source,
	label,
	url,
	platform,
	confirmation,
}: {
	source: ExternalOpenSource;
	label: string;
	url: string;
	platform: SupportedPlatform;
	confirmation?: string;
}): ExternalOpenPlan {
	const adapter = createExternalOpenAdapter(platform, url);
	const isHttps = isHttpsUrl(url);
	const confirmed = confirmation === "open";
	const enabled = isHttps && confirmed;
	const reason = !isHttps
		? "external open only allows https URLs"
		: enabled
			? "confirmed"
			: "type open to launch external browser";

	return {
		source,
		label,
		url,
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

export function formatExternalOpenPlanRows(plan: ExternalOpenPlan): string[] {
	return [
		`EXTERNAL OPEN ${plan.source}`,
		`label ${plan.label}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		`adapter=${formatExternalOpenAdapterName(plan.adapter.platform)}`,
		`command=${formatExternalOpenCommand(plan.adapter)}`,
		`url=${plan.url}`,
	];
}

export async function runExternalOpenPlan(
	plan: ExternalOpenPlan,
	runner: ExternalOpenRunner = (command, args) =>
		safeExec(command, args, { timeoutMs: 10000 }),
): Promise<ExternalOpenResult> {
	if (!plan.enabled) {
		return {
			success: false,
			audit: createExternalOpenAudit(plan),
			error: `External open is locked: ${plan.reason}`,
		};
	}

	const result = await runner(plan.adapter.command, plan.adapter.args);
	return {
		success: result.success,
		audit: createExternalOpenAudit(plan),
		...(result.stdout ? { stdout: result.stdout } : {}),
		...(result.stderr ? { stderr: result.stderr, error: result.stderr } : {}),
	};
}

function createExternalOpenAudit(plan: ExternalOpenPlan): ExternalOpenAudit {
	return {
		action: "external.open",
		source: plan.source,
		label: plan.label,
		url: plan.url,
		risk: plan.risk,
		privilege: plan.privilege,
		confirmed: plan.confirmed,
		adapter: plan.adapter.command,
	};
}

function createExternalOpenAdapter(
	platform: SupportedPlatform,
	url: string,
): ExternalOpenAdapter {
	if (platform === "darwin") {
		return { platform, command: "open", args: [url] };
	}

	if (platform === "win32") {
		return {
			platform,
			command: "rundll32",
			args: ["url.dll,FileProtocolHandler", url],
		};
	}

	return { platform, command: "xdg-open", args: [url] };
}

function isHttpsUrl(url: string): boolean {
	try {
		return new URL(url).protocol === "https:";
	} catch {
		return false;
	}
}

function formatExternalOpenAdapterName(platform: SupportedPlatform): string {
	if (platform === "darwin") {
		return "macos";
	}
	if (platform === "win32") {
		return "windows";
	}
	return "linux";
}

function formatExternalOpenCommand(adapter: ExternalOpenAdapter): string {
	return [adapter.command, ...adapter.args].join(" ");
}
