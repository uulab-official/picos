import {
	type ActionControlSimulation,
	type ActionPreviewConfirmation,
	type ActionPreviewPlan,
	createActionControlSimulation,
	createActionPreviewPlan,
	formatActionConfirmationAuditMessage,
	formatActionPreviewAuditMessage,
	formatActionSimulationAuditMessage,
	type PicosAction,
	submitActionPreviewConfirmation,
} from "../core/actions";
import {
	type ControlExecutionPlan,
	type ControlExecutionPolicy,
	type ControlExecutionResult,
	createControlExecutionPlan,
	formatControlExecutionAuditMessage,
	formatControlExecutionResultAuditMessage,
} from "../core/controlExecution";
import { getControlPreviewCommand } from "../core/controlPreview";
import type { SupportedPlatform } from "../core/types";
import {
	createUpdateApplyActionPreviewPlan,
	createUpdateApplyPreview,
	type PackageUpdateCheckResult,
} from "../core/updateCheck";
import { classifyRequestPublication } from "./requestSequence";

export type ActionControlNotice = {
	level: "run" | "info" | "ok" | "warn" | "fail";
	message: string;
};

export type ActionControlState = {
	previewPlan: ActionPreviewPlan | undefined;
	confirmation: ActionPreviewConfirmation | undefined;
	simulation: ActionControlSimulation | undefined;
	executionPlan: ControlExecutionPlan | undefined;
};

export type ActionDispatchBlocker =
	| "action-not-found"
	| "action-metadata-incomplete"
	| "risk-missing"
	| "privilege-missing"
	| "action-state-missing"
	| "confirmation-metadata-missing"
	| "read-confirmation-invalid"
	| "action-disabled"
	| "mutable-action-enabled"
	| "confirmation-phrase-missing"
	| "unsupported-platform"
	| "update-check-required"
	| "update-unavailable"
	| "dry-run-preview-missing"
	| "preview-metadata-mismatch"
	| "adapter-command-missing"
	| "adapter-platform-mismatch";

export type ActionDispatchTransition =
	| {
			kind: "run";
			action: PicosAction;
			screen?: undefined;
			focusArea?: undefined;
			control: ActionControlState;
			notice: ActionControlNotice;
	  }
	| {
			kind: "preview";
			action: PicosAction;
			screen: "actions";
			focusArea?: "actions";
			control: ActionControlState;
			notice: ActionControlNotice;
	  }
	| {
			kind: "blocked";
			actionId: string;
			blockers: ActionDispatchBlocker[];
			screen?: "actions" | "status";
			focusArea?: undefined;
			control: ActionControlState;
			notice: ActionControlNotice;
	  };

export type ControlConfirmationTransition =
	| {
			kind: "blocked";
			closeCommandLine: true;
			notices: ActionControlNotice[];
	  }
	| {
			kind: "confirmation";
			closeCommandLine: true;
			confirmation: ActionPreviewConfirmation;
			simulation: ActionControlSimulation;
			executionPlan: undefined;
			notices: ActionControlNotice[];
	  };

export type ControlExecutionTransition =
	| { kind: "stale"; publishCurrent: false }
	| {
			kind: "blocked";
			publishCurrent: true;
			notice: ActionControlNotice;
			executionPlan?: ControlExecutionPlan;
	  }
	| {
			kind: "execute";
			publishCurrent: true;
			executionPlan: ControlExecutionPlan;
			io: { kind: "run-control-execution" };
	  };

const EMPTY_CONTROL_STATE: ActionControlState = {
	previewPlan: undefined,
	confirmation: undefined,
	simulation: undefined,
	executionPlan: undefined,
};

const ACTION_CATEGORIES = new Set([
	"network",
	"dns",
	"system",
	"config",
	"files",
	"routes",
	"connections",
	"ports",
	"tools",
	"timeline",
	"status",
	"logs",
	"raw",
	"remote",
	"clipboard",
]);

export function prepareActionDispatch(input: {
	actionId: string;
	actions: readonly unknown[];
	platform: string;
	previewPlan?: ActionPreviewPlan;
	updateCheckResult?: PackageUpdateCheckResult;
}): ActionDispatchTransition {
	const candidate = input.actions.find(
		(action) => isRecord(action) && action.id === input.actionId,
	);
	if (!candidate || !isRecord(candidate)) {
		return blockedAction(input.actionId, ["action-not-found"]);
	}

	const metadataBlockers = validateActionMetadata(candidate);
	if (metadataBlockers.length > 0) {
		return blockedAction(input.actionId, metadataBlockers);
	}
	const action = candidate as PicosAction;

	if (action.risk === "read") {
		if (!action.enabled) {
			return blockedAction(action.id, ["action-disabled"]);
		}
		if (action.confirmationRequired) {
			return blockedAction(action.id, ["read-confirmation-invalid"]);
		}
		return {
			kind: "run",
			action,
			control: { ...EMPTY_CONTROL_STATE },
			notice: { level: "run", message: `${action.id} started` },
		};
	}

	if (action.enabled) {
		return blockedAction(action.id, ["mutable-action-enabled"]);
	}
	if (!action.confirmationRequired || !action.confirmationPhrase?.trim()) {
		return blockedAction(action.id, ["confirmation-phrase-missing"]);
	}
	if (!isSupportedPlatform(input.platform)) {
		return blockedAction(action.id, ["unsupported-platform"]);
	}

	if (action.id === "picos.update.apply" && !input.previewPlan) {
		if (!input.updateCheckResult) {
			return blockedAction(action.id, ["update-check-required"], {
				screen: "status",
				message: "run picos.update before opening update apply preview",
			});
		}
		const applyPreview = createUpdateApplyPreview(input.updateCheckResult);
		if (!applyPreview) {
			return blockedAction(action.id, ["update-unavailable"], {
				screen: "status",
				message: "picos.update.apply has no available update to preview",
			});
		}
	}

	const platform = input.platform as SupportedPlatform;
	const previewPlan =
		input.previewPlan ??
		resolveActionPreviewPlan(action, platform, input.updateCheckResult);
	const previewBlockers = validateMutablePreview(action, platform, previewPlan);
	if (previewBlockers.length > 0) {
		return blockedAction(action.id, previewBlockers, { screen: "actions" });
	}
	if (!previewPlan) {
		return blockedAction(action.id, ["dry-run-preview-missing"], {
			screen: "actions",
		});
	}
	const simulation = createActionControlSimulation(previewPlan);
	return {
		kind: "preview",
		action,
		screen: "actions",
		...(action.id === "picos.update.apply"
			? { focusArea: "actions" as const }
			: {}),
		control: {
			previewPlan,
			confirmation: undefined,
			simulation,
			executionPlan: undefined,
		},
		notice: {
			level: "warn",
			message: formatActionPreviewAuditMessage(previewPlan),
		},
	};
}

export function prepareControlConfirmationPrompt(
	previewPlan: ActionPreviewPlan | undefined,
):
	| { kind: "prompt"; prompt: "control-confirm"; notice: ActionControlNotice }
	| { kind: "blocked"; notice: ActionControlNotice } {
	if (!previewPlan) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control confirmation needs a locked action preview first",
			},
		};
	}
	if (!previewPlan.confirmationPhrase?.trim()) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: `${previewPlan.actionId} has no confirmation phrase`,
			},
		};
	}
	if (
		previewPlan.risk === "read" ||
		previewPlan.enabled ||
		!previewPlan.dryRun ||
		!hasAdapterCommand(previewPlan)
	) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: `control confirmation unavailable ${previewPlan.actionId}`,
			},
		};
	}
	return {
		kind: "prompt",
		prompt: "control-confirm",
		notice: {
			level: "info",
			message: `control confirmation opened for ${previewPlan.actionId}`,
		},
	};
}

export function submitControlConfirmationTransition(input: {
	previewPlan: ActionPreviewPlan | undefined;
	input: string;
}): ControlConfirmationTransition {
	if (!input.previewPlan) {
		return {
			kind: "blocked",
			closeCommandLine: true,
			notices: [
				{ level: "warn", message: "control confirmation missing preview" },
			],
		};
	}
	const eligibility = prepareControlConfirmationPrompt(input.previewPlan);
	if (eligibility.kind === "blocked") {
		return {
			kind: "blocked",
			closeCommandLine: true,
			notices: [eligibility.notice],
		};
	}
	const confirmation = submitActionPreviewConfirmation(
		input.previewPlan,
		input.input,
	);
	const simulation = createActionControlSimulation(
		input.previewPlan,
		confirmation,
	);
	return {
		kind: "confirmation",
		closeCommandLine: true,
		confirmation,
		simulation,
		executionPlan: undefined,
		notices: [
			{
				level: confirmation.confirmed ? "warn" : "fail",
				message: formatActionConfirmationAuditMessage(confirmation),
			},
			{
				level: "warn",
				message: formatActionSimulationAuditMessage(simulation),
			},
		],
	};
}

export function prepareControlExecutionStart(
	previewPlan: ActionPreviewPlan | undefined,
):
	| { kind: "blocked"; notice: ActionControlNotice }
	| {
			kind: "read-policy";
			actionId: string;
			io: { kind: "read-control-policy" };
	  } {
	if (!previewPlan) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		};
	}
	return {
		kind: "read-policy",
		actionId: previewPlan.actionId,
		io: { kind: "read-control-policy" },
	};
}

export function prepareControlExecutionTransition(input: {
	previewPlan: ActionPreviewPlan | undefined;
	confirmation: ActionPreviewConfirmation | undefined;
	policy: ControlExecutionPolicy;
	requestToken: number;
	currentToken: number;
}): ControlExecutionTransition {
	if (
		classifyRequestPublication(input.currentToken, input.requestToken) ===
		"stale"
	) {
		return { kind: "stale", publishCurrent: false };
	}
	if (!input.previewPlan) {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		};
	}
	if (
		input.confirmation &&
		input.confirmation.actionId !== input.previewPlan.actionId
	) {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: `control execution ${input.previewPlan.actionId} blocked: confirmation-action-mismatch`,
			},
		};
	}
	if (
		input.confirmation?.confirmed &&
		!confirmationMatchesPreview(input.confirmation, input.previewPlan)
	) {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: `control execution ${input.previewPlan.actionId} blocked: confirmation-preview-mismatch`,
			},
		};
	}
	const executionPlan = createControlExecutionPlan(
		input.previewPlan,
		input.confirmation,
		input.policy,
	);
	if (executionPlan.status !== "dry-run-ready") {
		return {
			kind: "blocked",
			publishCurrent: true,
			executionPlan,
			notice: {
				level: "warn",
				message: formatControlExecutionAuditMessage(executionPlan),
			},
		};
	}
	return {
		kind: "execute",
		publishCurrent: true,
		executionPlan,
		io: { kind: "run-control-execution" },
	};
}

export function classifyControlExecutionResult(input: {
	result: ControlExecutionResult;
	requestToken: number;
	currentToken: number;
}): {
	publication: "current" | "stale";
	publishCurrent: boolean;
	historyNotice: ActionControlNotice;
	currentNotices: ActionControlNotice[];
} {
	const publication = classifyRequestPublication(
		input.currentToken,
		input.requestToken,
	);
	const auditMessage = formatControlExecutionResultAuditMessage(
		input.result.audit,
	);
	return {
		publication,
		publishCurrent: publication === "current",
		historyNotice: {
			level: input.result.success ? "ok" : "fail",
			message:
				publication === "stale"
					? `${auditMessage} publication=stale`
					: auditMessage,
		},
		currentNotices:
			publication === "current"
				? [
						...(input.result.stdout
							? [
									{
										level: "info" as const,
										message: `control dry-run stdout ${input.result.stdout}`,
									},
								]
							: []),
						...(input.result.stderr
							? [
									{
										level: "warn" as const,
										message: `control dry-run stderr ${input.result.stderr}`,
									},
								]
							: []),
					]
				: [],
	};
}

export function classifyControlExecutionFailure(input: {
	actionId: string;
	error: unknown;
	requestToken: number;
	currentToken: number;
}): {
	publication: "current" | "stale";
	publishCurrent: boolean;
	historyNotice: ActionControlNotice;
} {
	const publication = classifyRequestPublication(
		input.currentToken,
		input.requestToken,
	);
	const detail = normalizeError(input.error);
	return {
		publication,
		publishCurrent: publication === "current",
		historyNotice: {
			level: "fail",
			message: `control execution ${input.actionId} failed ${detail}${
				publication === "stale" ? " publication=stale" : ""
			}`,
		},
	};
}

function resolveActionPreviewPlan(
	action: PicosAction,
	platform: SupportedPlatform,
	updateCheckResult: PackageUpdateCheckResult | undefined,
): ActionPreviewPlan | undefined {
	if (action.id === "picos.update.apply" && updateCheckResult) {
		const applyPreview = createUpdateApplyPreview(updateCheckResult);
		return applyPreview
			? createUpdateApplyActionPreviewPlan(applyPreview, platform)
			: undefined;
	}
	return createActionPreviewPlan(
		action.id,
		platform,
		getControlPreviewCommand(action.id, platform),
	);
}

function validateActionMetadata(
	action: Record<string, unknown>,
): ActionDispatchBlocker[] {
	if (
		typeof action.id !== "string" ||
		!action.id.trim() ||
		typeof action.title !== "string" ||
		!action.title.trim() ||
		typeof action.description !== "string" ||
		!action.description.trim() ||
		typeof action.category !== "string" ||
		!ACTION_CATEGORIES.has(action.category)
	) {
		return ["action-metadata-incomplete"];
	}
	if (!new Set(["read", "write", "destructive"]).has(String(action.risk))) {
		return ["risk-missing"];
	}
	if (!new Set(["none", "user", "admin"]).has(String(action.privilege))) {
		return ["privilege-missing"];
	}
	if (typeof action.enabled !== "boolean") {
		return ["action-state-missing"];
	}
	if (typeof action.confirmationRequired !== "boolean") {
		return ["confirmation-metadata-missing"];
	}
	return [];
}

function validateMutablePreview(
	action: PicosAction,
	platform: SupportedPlatform,
	previewPlan: ActionPreviewPlan | undefined,
): ActionDispatchBlocker[] {
	if (!previewPlan) {
		return ["dry-run-preview-missing"];
	}
	if (
		previewPlan.actionId !== action.id ||
		previewPlan.risk !== action.risk ||
		previewPlan.privilege !== action.privilege ||
		previewPlan.enabled !== action.enabled ||
		previewPlan.dryRun !== true ||
		previewPlan.confirmationPhrase?.trim() !== action.confirmationPhrase?.trim()
	) {
		return ["preview-metadata-mismatch"];
	}
	if (!hasAdapterCommand(previewPlan)) {
		return ["adapter-command-missing"];
	}
	if (previewPlan.commandPreview.adapter !== adapterForPlatform(platform)) {
		return ["adapter-platform-mismatch"];
	}
	return [];
}

function blockedAction(
	actionId: string,
	blockers: ActionDispatchBlocker[],
	options: { screen?: "actions" | "status"; message?: string } = {},
): ActionDispatchTransition {
	return {
		kind: "blocked",
		actionId,
		blockers,
		...(options.screen ? { screen: options.screen } : {}),
		control: { ...EMPTY_CONTROL_STATE },
		notice: {
			level: "warn",
			message:
				options.message ?? `action ${actionId} blocked: ${blockers.join(",")}`,
		},
	};
}

function hasAdapterCommand(
	previewPlan: ActionPreviewPlan,
): previewPlan is ActionPreviewPlan & {
	commandPreview: NonNullable<ActionPreviewPlan["commandPreview"]>;
} {
	const command = previewPlan.commandPreview;
	return Boolean(
		command?.command.trim() &&
			Array.isArray(command.args) &&
			command.note.trim(),
	);
}

function isSupportedPlatform(value: string): value is SupportedPlatform {
	return value === "darwin" || value === "linux" || value === "win32";
}

function adapterForPlatform(
	platform: SupportedPlatform,
): "macos" | "linux" | "windows" {
	if (platform === "darwin") return "macos";
	if (platform === "win32") return "windows";
	return "linux";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function confirmationMatchesPreview(
	confirmation: ActionPreviewConfirmation,
	previewPlan: ActionPreviewPlan,
): boolean {
	const phrase = previewPlan.confirmationPhrase?.trim() ?? "";
	return (
		confirmation.status === "confirmed-disabled" &&
		confirmation.expectedPhrase === phrase &&
		confirmation.receivedPhrase === phrase &&
		confirmation.executionEnabled === false &&
		confirmation.risk === previewPlan.risk &&
		confirmation.privilege === previewPlan.privilege &&
		confirmation.dryRun === previewPlan.dryRun &&
		commandPreviewsMatch(
			confirmation.commandPreview,
			previewPlan.commandPreview,
		)
	);
}

function commandPreviewsMatch(
	confirmation: ActionPreviewPlan["commandPreview"],
	preview: ActionPreviewPlan["commandPreview"],
): boolean {
	if (!confirmation || !preview) {
		return confirmation === preview;
	}
	return (
		confirmation.adapter === preview.adapter &&
		confirmation.command === preview.command &&
		confirmation.args.length === preview.args.length &&
		confirmation.args.every((arg, index) => arg === preview.args[index]) &&
		confirmation.note === preview.note &&
		confirmation.dryRunExecutable === preview.dryRunExecutable
	);
}

function normalizeError(error: unknown): string {
	const value = error instanceof Error ? error.message : String(error);
	return value.trim().replaceAll(/\s+/g, " ") || "unknown error";
}
