import { safeExec } from "../utils/safeExec";
import type {
	ActionPreviewCommand,
	ActionPreviewConfirmation,
	ActionPreviewPlan,
} from "./actions";
import type { SafeExecResult } from "./types";

export type ControlExecutionPolicy = {
	mode: "disabled" | "dry-run";
	allowAdminDryRun: boolean;
};

export type ControlExecutionPlan = {
	actionId: string;
	status: "blocked" | "dry-run-ready";
	policy: ControlExecutionPolicy["mode"];
	confirmed: boolean;
	willExecute: boolean;
	dryRun: true;
	reason: string;
	blockers: string[];
	commandPreview?: ActionPreviewCommand;
};

export type ControlExecutionAudit = {
	actionId: string;
	status: "blocked" | "dry-run-executed" | "dry-run-failed";
	policy: ControlExecutionPolicy["mode"];
	confirmed: boolean;
	dryRun: true;
	willExecute: boolean;
	adapter?: ActionPreviewCommand["adapter"];
	command?: string;
	blockers: string[];
};

export type ControlExecutionResult = {
	success: boolean;
	audit: ControlExecutionAudit;
	error?: string;
	stdout?: string;
	stderr?: string;
};

export type ControlExecutionRunner = (
	command: string,
	args: string[],
	options: { timeoutMs: number },
) => Promise<SafeExecResult>;

export const defaultControlExecutionPolicy: ControlExecutionPolicy = {
	mode: "disabled",
	allowAdminDryRun: false,
};

export function getControlExecutionPolicyFromConfig(config: {
	controlExecutionMode?: "disabled" | "dry-run";
	allowAdminDryRun?: boolean;
}): ControlExecutionPolicy {
	return {
		mode: config.controlExecutionMode ?? defaultControlExecutionPolicy.mode,
		allowAdminDryRun:
			config.allowAdminDryRun ?? defaultControlExecutionPolicy.allowAdminDryRun,
	};
}

export function createControlExecutionPlan(
	plan: ActionPreviewPlan,
	confirmation: ActionPreviewConfirmation | undefined,
	policy: ControlExecutionPolicy = defaultControlExecutionPolicy,
): ControlExecutionPlan {
	const confirmed = confirmation?.confirmed ?? false;
	const blockers = getControlExecutionBlockers(plan, confirmed, policy);

	return {
		actionId: plan.actionId,
		status: blockers.length ? "blocked" : "dry-run-ready",
		policy: policy.mode,
		confirmed,
		willExecute: blockers.length === 0,
		dryRun: true,
		reason: blockers[0] ?? "dry-run-ready",
		blockers,
		commandPreview: plan.commandPreview,
	};
}

export async function runControlExecutionPlan(
	plan: ControlExecutionPlan,
	runner: ControlExecutionRunner = (command, args, options) =>
		safeExec(command, args, { timeoutMs: options.timeoutMs }),
): Promise<ControlExecutionResult> {
	if (plan.status !== "dry-run-ready" || !plan.commandPreview) {
		return {
			success: false,
			audit: createControlExecutionAudit(plan, "blocked"),
			error: `Control execution blocked: ${plan.reason}`,
		};
	}

	const result = await runner(
		plan.commandPreview.command,
		plan.commandPreview.args,
		{
			timeoutMs: 10000,
		},
	);
	const status = result.success ? "dry-run-executed" : "dry-run-failed";
	return {
		success: result.success,
		audit: createControlExecutionAudit(plan, status),
		...(result.stdout ? { stdout: result.stdout } : {}),
		...(result.stderr ? { stderr: result.stderr, error: result.stderr } : {}),
	};
}

export function formatControlExecutionAuditMessage(
	plan: ControlExecutionPlan,
): string {
	const audit = createControlExecutionAudit(plan, "blocked");
	return formatControlExecutionResultAuditMessage(audit);
}

export function formatControlExecutionResultAuditMessage(
	audit: ControlExecutionAudit,
): string {
	return [
		`control execution ${audit.actionId}`,
		`status=${audit.status}`,
		`policy=${audit.policy}`,
		`confirmed=${audit.confirmed}`,
		`dryRun=${audit.dryRun}`,
		`willExecute=${audit.willExecute}`,
		audit.blockers.length ? `blockers=${audit.blockers.join(",")}` : "",
		audit.adapter ? `adapter=${audit.adapter}` : "",
		audit.command ? `command="${audit.command}"` : "",
	]
		.filter(Boolean)
		.join(" ");
}

export function formatControlExecutionRows(
	plan: ControlExecutionPlan,
): string[] {
	return [
		`CONTROL EXECUTION ${plan.actionId}`,
		`status=${plan.status} policy=${plan.policy} confirmed=${plan.confirmed} dryRun=${plan.dryRun}`,
		`willExecute=${plan.willExecute} reason=${plan.reason}`,
		...(plan.blockers.length ? [`blockers=${plan.blockers.join(",")}`] : []),
		...(plan.commandPreview ? [`adapter=${plan.commandPreview.adapter}`] : []),
		...(plan.commandPreview
			? [`command=${formatControlExecutionCommand(plan.commandPreview)}`]
			: []),
	];
}

function getControlExecutionBlockers(
	plan: ActionPreviewPlan,
	confirmed: boolean,
	policy: ControlExecutionPolicy,
): string[] {
	if (policy.mode === "disabled") {
		return ["mutation-controls-disabled"];
	}

	return [
		...(confirmed ? [] : ["confirmation-required"]),
		...(!plan.commandPreview ? ["adapter-command-missing"] : []),
		...(plan.commandPreview && !plan.commandPreview.dryRunExecutable
			? ["adapter-dry-run-unavailable"]
			: []),
		...(plan.privilege === "admin" && !policy.allowAdminDryRun
			? ["admin-dry-run-approval-required"]
			: []),
	];
}

function createControlExecutionAudit(
	plan: ControlExecutionPlan,
	status: ControlExecutionAudit["status"],
): ControlExecutionAudit {
	return {
		actionId: plan.actionId,
		status,
		policy: plan.policy,
		confirmed: plan.confirmed,
		dryRun: true,
		willExecute: plan.willExecute,
		adapter: plan.commandPreview?.adapter,
		command: plan.commandPreview
			? formatControlExecutionCommand(plan.commandPreview)
			: undefined,
		blockers: plan.blockers,
	};
}

function formatControlExecutionCommand(command: ActionPreviewCommand): string {
	return [command.command, ...command.args].join(" ").trim();
}
