import type { DoctorCheck, PicosConfig } from "../core/types";
import {
	createUpdateApplyPreview,
	createUpdateReleaseHandoff,
	formatGitHubReleaseCheckRows,
	formatUpdateApplyPreviewRows,
	formatUpdateCheckRows,
	formatUpdateReleaseHandoffRows,
	type GitHubReleaseCheckResult,
	type PackageUpdateCheckResult,
} from "../core/updateCheck";
import { clampIndex } from "./navigation";
import { classifyRequestPublication } from "./requestSequence";
import type { ToolHistoryItem, ToolRunPlan } from "./toolHistory";

export type ActionRunNotice = {
	level: "run" | "info" | "ok" | "warn" | "fail";
	message: string;
};

const actionRunEffects = {
	"network.inspect": "network-refresh",
	"system.inventory": "system-inventory",
	"doctor.run": "doctor",
	"ping.default": "tool-prompt",
	"config.show": "config-show",
	"config.statusResultJumpClass.focus": "config-focus",
	"config.safetyPolicy.focus": "config-focus",
	"config.editorSaveMode.focus": "config-focus",
	"config.auditRetention.focus": "config-focus",
	"config.toolTargetRetention.focus": "config-focus",
	"config.shelf.routes.focus": "config-focus",
	"config.shelf.connections.focus": "config-focus",
	"config.shelf.ports.focus": "config-focus",
	"config.shelf.tools.focus": "config-focus",
	"config.shelf.logs.focus": "config-focus",
	"config.shelf.remotes.focus": "config-focus",
	"config.recovery.routes": "config-focus",
	"config.recovery.connections": "config-focus",
	"config.recovery.ports": "config-focus",
	"config.recovery.tools": "config-focus",
	"config.recovery.logs": "config-focus",
	"config.recovery.remotes": "config-focus",
	"files.list": "files-list",
	"files.read": "files-read",
	"routes.inspect": "routes-inspect",
	"connections.list": "connections-list",
	"ports.list": "ports-list",
	"process.inspect": "process-guidance",
	"tools.dns": "tool-prompt",
	"tools.traceroute": "tool-prompt",
	"tools.whois": "tool-prompt",
	"tools.ipInfo": "tool-prompt",
	"tools.tls": "tool-prompt",
	"network.connect": "tool-prompt",
	"routes.path": "route-prompt",
	"timeline.export": "timeline-export",
	"logs.read": "logs-read",
	"raw.view": "raw-view",
	"tools.export": "tools-export",
	"picos.update": "update-check",
	"remote.profiles": "remote-profiles",
	"remote.knownHosts.select": "remote-known-hosts-select",
	"status.timelineTrail.select": "status-owner",
	"status.timelineTrail.open": "status-owner",
	"status.timelineTrail.search": "status-owner",
	"status.timelineTrail.source": "status-owner",
	"status.processEvidence.select": "status-owner",
	"status.processEvidence.open": "status-owner",
	"status.processEvidence.search": "status-owner",
	"status.remoteKnownHostsEvidence.select": "status-owner",
	"status.remoteKnownHostsEvidence.open": "status-owner",
	"status.remoteKnownHostsEvidence.search": "status-owner",
	"status.remoteKnownHostsEvidence.copy": "status-owner",
	"status.remoteKnownHostsEvidence.export": "status-owner",
	"status.remoteKnownHostsEvidence.handoffSelect": "status-owner",
	"status.remoteKnownHostsEvidence.handoffOpen": "status-owner",
	"status.interfaceEvidence.select": "status-owner",
	"status.interfaceEvidence.open": "status-owner",
	"status.interfaceEvidence.search": "status-owner",
	"status.interfaceEvidence.filter": "status-owner",
	"status.interfaceEvidence.find": "status-owner",
	"status.interfaceEvidence.presetSave": "status-owner",
	"status.interfaceEvidence.presetNext": "status-owner",
	"status.interfaceEvidence.archive": "status-owner",
	"status.interfaceEvidence.retention": "status-owner",
	"status.resultJump.select": "status-owner",
	"status.resultJump.open": "status-owner",
	"status.resultJump.filter": "status-owner",
	"status.resultHistory.filter": "status-owner",
	"status.toolsEvidence.filter": "status-owner",
	"status.toolsEvidence.search": "status-owner",
	"status.toolsEvidence.archive": "status-owner",
	"status.toolsEvidence.retention": "status-owner",
	"status.toolsEvidence.matchOpen": "status-owner",
	"status.toolsEvidence.matchArchive": "status-owner",
	"remote.sftp.connect": "remote-connect-owner",
	"interface.proposal.disable": "palette-owner",
	"interface.proposal.enable": "palette-owner",
} as const;

export type ActionRunEffect =
	(typeof actionRunEffects)[keyof typeof actionRunEffects];

export type StatusActionRunId = {
	[ActionId in keyof typeof actionRunEffects]: (typeof actionRunEffects)[ActionId] extends "status-owner"
		? ActionId
		: never;
}[keyof typeof actionRunEffects];

export type StatusActionRunHandlers = {
	[ActionId in StatusActionRunId]: () => void;
};

export function getActionRunEffect(
	actionId: string,
): ActionRunEffect | undefined {
	return (actionRunEffects as Readonly<Record<string, ActionRunEffect>>)[
		actionId
	];
}

export function getInterfaceProposalInput(
	actionId: string,
): "D" | "U" | undefined {
	if (actionId === "interface.proposal.enable") return "U";
	if (actionId === "interface.proposal.disable") return "D";
	return undefined;
}

export function dispatchStatusActionRun(
	actionId: StatusActionRunId,
	handlers: StatusActionRunHandlers,
): void {
	handlers[actionId]();
}

export type RawToolHistoryViewTransition =
	| { kind: "notice"; notice: ActionRunNotice }
	| {
			kind: "view";
			screen: "tools";
			selectedIndex: number;
			notice: ActionRunNotice;
	  };

export function prepareRawToolHistoryView(
	history: ToolHistoryItem[],
): RawToolHistoryViewTransition {
	const selectedIndex = clampIndex(history.length - 1, history.length);
	const latest = history[selectedIndex];
	if (!latest) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "raw.view has no tool history yet" },
		};
	}
	return {
		kind: "view",
		screen: "tools",
		selectedIndex,
		notice: { level: "info", message: `raw.view latest ${latest.label}` },
	};
}

export function prepareToolActionPrompt(plan: ToolRunPlan): {
	screen: "tools";
	prompt: `tool:${string}`;
	value: string;
	fieldIndex: 0;
	notice: ActionRunNotice;
} {
	return {
		screen: "tools",
		prompt: `tool:${plan.actionId}`,
		value: plan.args.join(" "),
		fieldIndex: 0,
		notice: {
			level: "info",
			message: `${plan.label} target prompt opened`,
		},
	};
}

export type ActionRunSuccessSummary =
	| { kind: "network" }
	| { kind: "system-inventory" }
	| { kind: "logs"; count: number; status: string }
	| { kind: "files-list"; root: string }
	| { kind: "files-read" }
	| { kind: "routes"; count: number }
	| { kind: "connections"; count: number }
	| { kind: "ports"; count: number }
	| { kind: "remote-profiles"; count: number }
	| { kind: "route-prompt" }
	| { kind: "remote-known-hosts-prompt" }
	| { kind: "process-guidance" }
	| { kind: "remote-connect-guidance" }
	| { kind: "doctor"; checks: DoctorCheck[] }
	| {
			kind: "update";
			packageResult: PackageUpdateCheckResult;
			releaseResult: GitHubReleaseCheckResult;
	  }
	| { kind: "timeline-export"; path: string; eventCount: number }
	| { kind: "config"; path: string; config: PicosConfig }
	| { kind: "notices"; notices: ActionRunNotice[] };

export function classifyActionRunOutcome(input: {
	actionId: string;
	currentToken: number;
	requestToken: number;
	outcome:
		| { kind: "success"; summary: ActionRunSuccessSummary }
		| { kind: "failure"; error: unknown };
}): {
	publication: "current" | "stale";
	publishCurrent: boolean;
	notices: ActionRunNotice[];
} {
	const publication = classifyRequestPublication(
		input.currentToken,
		input.requestToken,
	);
	if (input.outcome.kind === "failure") {
		const detail =
			input.outcome.error instanceof Error
				? input.outcome.error.message
				: String(input.outcome.error);
		return {
			publication,
			publishCurrent: false,
			notices: [
				{
					level: "fail",
					message: `${input.actionId} failed ${detail}${publication === "stale" ? " publication=stale" : ""}`,
				},
			],
		};
	}
	if (publication === "stale") {
		return {
			publication,
			publishCurrent: false,
			notices: [
				{
					level: "info",
					message: `${input.actionId} completed publication=stale`,
				},
			],
		};
	}
	return {
		publication,
		publishCurrent: true,
		notices: formatActionRunSuccessNotices(input.outcome.summary),
	};
}

function formatActionRunSuccessNotices(
	summary: ActionRunSuccessSummary,
): ActionRunNotice[] {
	switch (summary.kind) {
		case "network":
			return [{ level: "ok", message: "network refreshed" }];
		case "system-inventory":
			return [{ level: "ok", message: "system inventory refreshed" }];
		case "logs":
			return [
				{
					level: summary.status === "ok" ? "ok" : "warn",
					message: `logs read ${summary.count}`,
				},
			];
		case "files-list":
			return [{ level: "ok", message: `files listed ${summary.root}` }];
		case "files-read":
			return [{ level: "ok", message: "editor preview refreshed" }];
		case "routes":
			return [{ level: "ok", message: `routes listed ${summary.count}` }];
		case "connections":
			return [{ level: "ok", message: `connections listed ${summary.count}` }];
		case "ports":
			return [{ level: "ok", message: `ports listed ${summary.count}` }];
		case "remote-profiles":
			return [{ level: "info", message: `remote profiles ${summary.count}` }];
		case "route-prompt":
			return [{ level: "info", message: "route destination prompt opened" }];
		case "remote-known-hosts-prompt":
			return [
				{
					level: "info",
					message: "remote known_hosts candidate selection opened via palette",
				},
			];
		case "process-guidance":
			return [
				{
					level: "info",
					message: "use picos process <pid> from endpoint detail",
				},
			];
		case "remote-connect-guidance":
			return [
				{
					level: "info",
					message: "remote.sftp.connect opened in Remotes workspace",
				},
			];
		case "doctor":
			return summary.checks.map((check) => ({
				level: check.status === "pass" ? "ok" : check.status,
				message: check.label,
			}));
		case "update": {
			const notices: ActionRunNotice[] = [
				...formatUpdateCheckRows(summary.packageResult).map((message) => ({
					level:
						summary.packageResult.status === "unknown"
							? ("warn" as const)
							: ("info" as const),
					message,
				})),
				...formatGitHubReleaseCheckRows(summary.releaseResult).map(
					(message) => ({
						level:
							summary.releaseResult.status === "unknown"
								? ("warn" as const)
								: ("info" as const),
						message,
					}),
				),
			];
			const applyPreview = createUpdateApplyPreview(summary.packageResult);
			if (applyPreview) {
				notices.push(
					...formatUpdateApplyPreviewRows(applyPreview).map((message) => ({
						level: "warn" as const,
						message,
					})),
				);
			}
			const releaseHandoff = createUpdateReleaseHandoff(summary.packageResult);
			if (releaseHandoff) {
				notices.push(
					...formatUpdateReleaseHandoffRows(releaseHandoff).map((message) => ({
						level: "info" as const,
						message,
					})),
				);
			}
			return notices;
		}
		case "timeline-export":
			return [
				{
					level: "ok",
					message: `audit exported ${summary.path} events=${summary.eventCount}`,
				},
			];
		case "config":
			return [
				{ level: "info", message: `config path ${summary.path}` },
				{
					level: "info",
					message: `theme=${summary.config.theme} refresh=${summary.config.refreshInterval}`,
				},
				{
					level: "info",
					message: `retention auditArchive=${summary.config.auditArchiveRetentionLimit} toolTargets=${summary.config.toolTargetPresetLimit}`,
				},
			];
		case "notices":
			return summary.notices;
	}
}
