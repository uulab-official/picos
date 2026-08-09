import {
	type ActionControlSimulation,
	type ActionPreviewConfirmation,
	type ActionPreviewPlan,
	createActionControlSimulation,
	createActionPreviewPlan,
	formatActionConfirmationAuditMessage,
	formatActionPreviewAuditMessage,
	formatActionSimulationAuditMessage,
	getActionCatalog,
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
import { beginRequest, classifyRequestPublication } from "./requestSequence";

export type ActionControlNotice = {
	level: "run" | "info" | "ok" | "warn" | "fail";
	message: string;
};

export type ActionControlConfirmation = ActionPreviewConfirmation & {
	previewFingerprint: string;
};

export type ActionControlState = {
	previewPlan: ActionPreviewPlan | undefined;
	confirmation: ActionControlConfirmation | undefined;
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
	| "adapter-platform-mismatch"
	| "preview-canonical-mismatch";

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
			confirmation: ActionControlConfirmation;
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
	actionId: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
}): ActionDispatchTransition {
	const actionId =
		typeof input.actionId === "string" ? input.actionId : "<invalid>";
	const candidate = getActionCatalog().find((action) => action.id === actionId);
	if (!candidate) {
		return blockedAction(actionId, ["action-not-found"]);
	}

	const metadataBlockers = getActionMetadataBlockers(candidate);
	if (metadataBlockers.length > 0) {
		return blockedAction(actionId, metadataBlockers);
	}
	const action = candidate;

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
	if (
		typeof input.platform !== "string" ||
		!isSupportedPlatform(input.platform)
	) {
		return blockedAction(action.id, ["unsupported-platform"]);
	}

	if (action.id === "picos.update.apply") {
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
	const previewPlan = resolveActionPreviewPlan(
		action,
		platform,
		input.updateCheckResult,
	);
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

export function prepareControlConfirmationPrompt(input: {
	previewPlan: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
}):
	| { kind: "prompt"; prompt: "control-confirm"; notice: ActionControlNotice }
	| { kind: "blocked"; notice: ActionControlNotice } {
	if (!input.previewPlan) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control confirmation needs a locked action preview first",
			},
		};
	}
	const resolution = resolveCanonicalMutablePreview(input);
	if (resolution.kind === "blocked") {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: `control confirmation ${resolution.actionId} blocked: ${resolution.blocker}`,
			},
		};
	}
	return {
		kind: "prompt",
		prompt: "control-confirm",
		notice: {
			level: "info",
			message: `control confirmation opened for ${resolution.previewPlan.actionId}`,
		},
	};
}

export function submitControlConfirmationTransition(input: {
	previewPlan: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
	input: unknown;
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
	const eligibility = prepareControlConfirmationPrompt(input);
	if (eligibility.kind === "blocked") {
		return {
			kind: "blocked",
			closeCommandLine: true,
			notices: [eligibility.notice],
		};
	}
	if (typeof input.input !== "string") {
		return {
			kind: "blocked",
			closeCommandLine: true,
			notices: [
				{ level: "warn", message: "control confirmation invalid input" },
			],
		};
	}
	const resolution = resolveCanonicalMutablePreview(input);
	if (resolution.kind === "blocked") {
		return {
			kind: "blocked",
			closeCommandLine: true,
			notices: [
				{
					level: "warn",
					message: `control confirmation ${resolution.actionId} blocked: ${resolution.blocker}`,
				},
			],
		};
	}
	const submitted = submitActionPreviewConfirmation(
		resolution.previewPlan,
		input.input,
	);
	const confirmation: ActionControlConfirmation = {
		...submitted,
		commandPreview: cloneCommandPreview(submitted.commandPreview),
		previewFingerprint: resolution.fingerprint,
	};
	const simulation = createActionControlSimulation(
		resolution.previewPlan,
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

export function prepareControlExecutionStart(input: {
	previewPlan: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
}):
	| { kind: "blocked"; notice: ActionControlNotice }
	| {
			kind: "read-policy";
			actionId: string;
			io: { kind: "read-control-policy" };
	  } {
	if (!input.previewPlan) {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		};
	}
	const resolution = resolveCanonicalMutablePreview(input);
	if (resolution.kind === "blocked") {
		return {
			kind: "blocked",
			notice: {
				level: "warn",
				message: `control execution ${resolution.actionId} blocked: ${resolution.blocker}`,
			},
		};
	}
	return {
		kind: "read-policy",
		actionId: resolution.previewPlan.actionId,
		io: { kind: "read-control-policy" },
	};
}

export function prepareControlPolicySync(input: {
	currentToken: number;
	policy: ControlExecutionPolicy;
}): { requestToken: number; policy: ControlExecutionPolicy } {
	return {
		requestToken: beginRequest(input.currentToken),
		policy: input.policy,
	};
}

export function prepareControlExecutionTransition(input: {
	previewPlan: unknown;
	confirmation: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
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
	const resolution = resolveCanonicalMutablePreview(input);
	if (resolution.kind === "blocked") {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: `control execution ${resolution.actionId} blocked: ${resolution.blocker}`,
			},
		};
	}
	if (
		isRecord(input.confirmation) &&
		input.confirmation.actionId !== resolution.previewPlan.actionId
	) {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: `control execution ${resolution.previewPlan.actionId} blocked: confirmation-action-mismatch`,
			},
		};
	}
	if (
		isRecord(input.confirmation) &&
		input.confirmation.confirmed === true &&
		(!isBoundConfirmation(input.confirmation) ||
			input.confirmation.previewFingerprint !== resolution.fingerprint ||
			!confirmationMatchesPreview(input.confirmation, resolution.previewPlan))
	) {
		return {
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: `control execution ${resolution.previewPlan.actionId} blocked: confirmation-preview-mismatch`,
			},
		};
	}
	const executionPlan = createControlExecutionPlan(
		resolution.previewPlan,
		isActionPreviewConfirmation(input.confirmation)
			? input.confirmation
			: undefined,
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

export function getActionMetadataBlockers(
	action: unknown,
): ActionDispatchBlocker[] {
	if (!isRecord(action)) {
		return ["action-metadata-incomplete"];
	}
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
	if (action.risk === "read") {
		if (action.confirmationRequired) {
			return ["read-confirmation-invalid"];
		}
		return [];
	}
	if (action.enabled) {
		return ["mutable-action-enabled"];
	}
	if (
		!action.confirmationRequired ||
		typeof action.confirmationPhrase !== "string" ||
		!action.confirmationPhrase.trim()
	) {
		return ["confirmation-phrase-missing"];
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

type CanonicalMutablePreviewResolution =
	| {
			kind: "ready";
			previewPlan: ActionPreviewPlan;
			fingerprint: string;
	  }
	| {
			kind: "blocked";
			actionId: string;
			blocker: ActionDispatchBlocker;
	  };

function resolveCanonicalMutablePreview(input: {
	previewPlan: unknown;
	platform: unknown;
	updateCheckResult?: PackageUpdateCheckResult;
}): CanonicalMutablePreviewResolution {
	const actionId =
		isRecord(input.previewPlan) &&
		typeof input.previewPlan.actionId === "string"
			? input.previewPlan.actionId
			: "<invalid>";
	const action = getActionCatalog().find(
		(candidate) => candidate.id === actionId,
	);
	if (!action) {
		return { kind: "blocked", actionId, blocker: "action-not-found" };
	}
	const metadataBlockers = getActionMetadataBlockers(action);
	if (metadataBlockers.length > 0 || action.risk === "read") {
		return {
			kind: "blocked",
			actionId,
			blocker: metadataBlockers[0] ?? "preview-canonical-mismatch",
		};
	}
	if (
		typeof input.platform !== "string" ||
		!isSupportedPlatform(input.platform)
	) {
		return { kind: "blocked", actionId, blocker: "unsupported-platform" };
	}
	if (action.id === "picos.update.apply") {
		if (!input.updateCheckResult) {
			return { kind: "blocked", actionId, blocker: "update-check-required" };
		}
		if (!createUpdateApplyPreview(input.updateCheckResult)) {
			return { kind: "blocked", actionId, blocker: "update-unavailable" };
		}
	}
	const canonicalPreview = resolveActionPreviewPlan(
		action,
		input.platform,
		input.updateCheckResult,
	);
	const canonicalBlockers = validateMutablePreview(
		action,
		input.platform,
		canonicalPreview,
	);
	if (!canonicalPreview || canonicalBlockers.length > 0) {
		return {
			kind: "blocked",
			actionId,
			blocker: canonicalBlockers[0] ?? "dry-run-preview-missing",
		};
	}
	const canonicalFingerprint = createPreviewFingerprint(canonicalPreview);
	const candidateFingerprint = createPreviewFingerprint(input.previewPlan);
	if (
		!canonicalFingerprint ||
		!candidateFingerprint ||
		candidateFingerprint !== canonicalFingerprint
	) {
		return {
			kind: "blocked",
			actionId,
			blocker: "preview-canonical-mismatch",
		};
	}
	return {
		kind: "ready",
		previewPlan: canonicalPreview,
		fingerprint: canonicalFingerprint,
	};
}

function createPreviewFingerprint(previewPlan: unknown): string | undefined {
	if (
		!isRecord(previewPlan) ||
		typeof previewPlan.actionId !== "string" ||
		typeof previewPlan.title !== "string" ||
		typeof previewPlan.risk !== "string" ||
		typeof previewPlan.privilege !== "string" ||
		typeof previewPlan.enabled !== "boolean" ||
		typeof previewPlan.dryRun !== "boolean" ||
		(previewPlan.confirmationPhrase !== undefined &&
			typeof previewPlan.confirmationPhrase !== "string") ||
		!isActionPreviewCommand(previewPlan.commandPreview)
	) {
		return undefined;
	}
	const command = previewPlan.commandPreview;
	return JSON.stringify({
		actionId: previewPlan.actionId,
		title: previewPlan.title,
		risk: previewPlan.risk,
		privilege: previewPlan.privilege,
		enabled: previewPlan.enabled,
		dryRun: previewPlan.dryRun,
		confirmationPhrase: previewPlan.confirmationPhrase,
		adapter: command.adapter,
		command: command.command,
		args: command.args,
		note: command.note,
		dryRunExecutable: command.dryRunExecutable,
	});
}

function cloneCommandPreview(
	command: ActionPreviewPlan["commandPreview"],
): ActionPreviewPlan["commandPreview"] {
	return command ? { ...command, args: [...command.args] } : undefined;
}

function isBoundConfirmation(
	confirmation: unknown,
): confirmation is ActionControlConfirmation {
	return (
		isRecord(confirmation) &&
		typeof confirmation.previewFingerprint === "string" &&
		isActionPreviewConfirmation(confirmation)
	);
}

function isActionPreviewConfirmation(
	confirmation: unknown,
): confirmation is ActionPreviewConfirmation {
	return (
		isRecord(confirmation) &&
		typeof confirmation.actionId === "string" &&
		(confirmation.status === "confirmed-disabled" ||
			confirmation.status === "rejected") &&
		typeof confirmation.expectedPhrase === "string" &&
		typeof confirmation.receivedPhrase === "string" &&
		typeof confirmation.confirmed === "boolean" &&
		confirmation.executionEnabled === false &&
		(confirmation.risk === "read" ||
			confirmation.risk === "write" ||
			confirmation.risk === "destructive") &&
		(confirmation.privilege === "none" ||
			confirmation.privilege === "user" ||
			confirmation.privilege === "admin") &&
		confirmation.dryRun === true &&
		(confirmation.commandPreview === undefined ||
			isActionPreviewCommand(confirmation.commandPreview))
	);
}

function isActionPreviewCommand(
	command: unknown,
): command is NonNullable<ActionPreviewPlan["commandPreview"]> {
	return (
		isRecord(command) &&
		(command.adapter === "macos" ||
			command.adapter === "linux" ||
			command.adapter === "windows") &&
		typeof command.command === "string" &&
		Array.isArray(command.args) &&
		command.args.every((arg) => typeof arg === "string") &&
		typeof command.note === "string" &&
		(command.dryRunExecutable === undefined ||
			typeof command.dryRunExecutable === "boolean")
	);
}

function confirmationMatchesPreview(
	confirmation: unknown,
	previewPlan: ActionPreviewPlan,
): boolean {
	if (!isActionPreviewConfirmation(confirmation)) {
		return false;
	}
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
	confirmation: unknown,
	preview: unknown,
): boolean {
	if (confirmation === undefined || preview === undefined) {
		return confirmation === preview;
	}
	if (
		!isActionPreviewCommand(confirmation) ||
		!isActionPreviewCommand(preview)
	) {
		return false;
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
