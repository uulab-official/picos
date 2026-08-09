import { buildClipboardWritePlan } from "../core/clipboard";
import type { ControlExecutionPolicy } from "../core/controlExecution";
import { getControlPreviewCommand } from "../core/controlPreview";
import {
	createEditorSaveExecutionPlan,
	type EditorSaveExecutionPolicy,
} from "../core/editorSaveExecution";
import type { ExternalOpenPlan } from "../core/externalOpen";
import type { FileOpenPlan } from "../core/fileOpen";
import type { FileOperationExecutionPolicy } from "../core/fileOperations";
import type { FileProvider } from "../core/files";
import { createEditorWritePreview } from "../core/fileWritePreview";
import {
	type ReadOnlySftpConnectionDiagnostic,
	startReadOnlySftpConnectionDiagnostic,
} from "../core/sftp";
import type { SupportedPlatform } from "../core/types";
import { submitControlConfirmationTransition } from "./actionControlTransitions";
import {
	prepareEditorSaveSubmission,
	prepareExternalOpenSubmission,
	prepareFileOpenSubmission,
	prepareInterfaceEvidenceSearchSubmission,
	prepareRouteDestinationSubmission,
	prepareToolCommandSubmission,
	prepareToolEvidenceSearchSubmission,
	prepareToolHistoryCleanupSubmission,
	prepareToolHistoryFilterSubmission,
} from "./appOwners";
import { prepareCleanupExportArchiveConfirmation } from "./cleanupIndex";
import {
	type ClipboardConfirmationState,
	clearClipboardConfirmationState,
} from "./clipboardDialog";
import type {
	CommandSubmitEffect,
	CommandSubmitRequest,
	CommandSubmitTransition,
} from "./commandLine";
import {
	type ConfigWorkspaceResetPreview,
	getConfigWorkspaceItem,
	prepareConfigWorkspaceResetOpenTransition,
	prepareConfigWorkspaceResetSubmission,
	prepareConfigWorkspaceTextSubmission,
} from "./configPanel";
import { prepareDnsServerProposalTransition } from "./dnsPanel";
import {
	transitionEditorAppendLine,
	transitionEditorInsertLine,
	transitionEditorReplaceLine,
} from "./editorBuffer";
import {
	createPortProcessControlExecutionPlan,
	type EndpointHandoffKind,
	prepareEndpointFilterTransition,
	preparePortProcessControlSubmission,
	submitEndpointFilterCleanupConfirmation,
} from "./endpointPanel";
import {
	prepareFileOperationConfirmation,
	prepareFileOperationDestination,
} from "./fileOperationDialog";
import { prepareFilePathCommand } from "./fileWorkspaceTransitions";
import { prepareInterfaceConfirmationTransition } from "./interfacePanel";
import {
	prepareLogSearchTransition,
	submitLogCleanupConfirmation,
} from "./logPanel";
import {
	prepareRemoteConnectSubmission,
	prepareRemoteHostKeyEvidenceSubmission,
	prepareRemoteHostTrustSubmission,
	prepareRemoteKnownHostsCandidateSubmission,
	prepareRemoteKnownHostsPasteSelection,
	prepareRemoteKnownHostsPasteSubmission,
	prepareRemoteProfileCommand,
} from "./remotesPanel";
import {
	prepareRouteFilterTransition,
	submitRouteFilterCleanupConfirmation,
} from "./routePanel";
import { filterInterfaceConfirmationAuditExportIndex } from "./statusActivityQueue";
import {
	prepareAuditEvidenceArchiveConfirmation,
	prepareAuditEvidenceRetentionConfirmation,
} from "./statusEvidence";
import {
	prepareTimelineSearchTransition,
	submitTimelineSearchCleanupConfirmation,
} from "./timelinePanel";
import {
	prepareToolHistoryArchiveRetentionConfirmation,
	prepareToolHistoryExportArchiveConfirmation,
	reassignToolTargetPresetActionTransition,
	renameToolTargetPresetTransition,
	retargetToolTargetPresetTransition,
	submitToolTargetCleanupTransition,
	submitToolTargetPresetCommandTransition,
	type ToolTargetPresetTransitionInput,
} from "./toolHistory";

type DistributiveOmit<Union, Keys extends PropertyKey> = Union extends unknown
	? Omit<Union, Keys>
	: never;

type ToolTargetContext = Readonly<
	Omit<ToolTargetPresetTransitionInput, "limit" | "value">
>;

type EndpointFilterContext = Readonly<
	DistributiveOmit<
		Parameters<typeof prepareEndpointFilterTransition>[0],
		"query"
	>
>;

type EndpointFilterSnapshots = Readonly<{
	connections: Extract<EndpointFilterContext, { kind: "connections" }>;
	ports: Extract<EndpointFilterContext, { kind: "ports" }>;
}>;

type EndpointFilterCleanupSnapshots = Readonly<{
	connections: Readonly<{ presets: string[]; rowCount: number }>;
	ports: Readonly<{ presets: string[]; rowCount: number }>;
}>;

export type CommandSubmitContextMap = {
	"submit-path": Readonly<
		Omit<Parameters<typeof prepareFilePathCommand>[0], "value">
	>;
	"submit-clipboard": Readonly<{
		state: ClipboardConfirmationState;
		platform: SupportedPlatform;
	}>;
	"submit-route-destination": undefined;
	"submit-route-filter": Readonly<
		Omit<Parameters<typeof prepareRouteFilterTransition>[0], "query">
	>;
	"submit-route-filter-cleanup": Readonly<{ presets: string[] }>;
	"submit-tool-history-filter": Readonly<
		Omit<Parameters<typeof prepareToolHistoryFilterSubmission>[0], "value">
	>;
	"submit-tool-history-cleanup": Readonly<{ presets: string[] }>;
	"submit-tool-target-label": ToolTargetContext;
	"submit-tool-target-value": ToolTargetContext;
	"submit-tool-target-action": ToolTargetContext;
	"submit-tool-target-cleanup": ToolTargetContext;
	"submit-tool-target-preset": ToolTargetContext & Readonly<{ limit: number }>;
	"submit-remote-profile": undefined;
	"submit-remote-connect": Readonly<
		Omit<
			Parameters<typeof prepareRemoteConnectSubmission>[0],
			"receivedConfirmation"
		> & { startedAt: number }
	>;
	"submit-remote-host-trust": Readonly<
		Omit<
			Parameters<typeof prepareRemoteHostTrustSubmission>[0],
			"receivedConfirmation"
		>
	>;
	"submit-remote-host-key-evidence": Readonly<
		Omit<Parameters<typeof prepareRemoteHostKeyEvidenceSubmission>[0], "value">
	>;
	"submit-remote-known-hosts-candidate": Readonly<
		Omit<
			Parameters<typeof prepareRemoteKnownHostsCandidateSubmission>[0],
			"value"
		>
	>;
	"submit-remote-known-hosts-paste": Readonly<
		Omit<Parameters<typeof prepareRemoteKnownHostsPasteSubmission>[0], "value">
	>;
	"submit-remote-known-hosts-selection": Readonly<
		Omit<
			Parameters<typeof prepareRemoteKnownHostsPasteSelection>[0],
			"selection"
		>
	>;
	"submit-endpoint-filter": EndpointFilterSnapshots;
	"submit-endpoint-filter-cleanup": EndpointFilterCleanupSnapshots;
	"submit-timeline-search": Readonly<
		Omit<Parameters<typeof prepareTimelineSearchTransition>[0], "query">
	>;
	"submit-timeline-search-cleanup": Readonly<{ presets: string[] }>;
	"submit-log-search": Readonly<
		Omit<Parameters<typeof prepareLogSearchTransition>[0], "query">
	>;
	"submit-logs-cleanup": Readonly<{
		presets: Parameters<typeof submitLogCleanupConfirmation>[0];
		profiles: Parameters<typeof submitLogCleanupConfirmation>[1];
	}>;
	"submit-control-confirmation": Readonly<
		Omit<Parameters<typeof submitControlConfirmationTransition>[0], "input">
	>;
	"submit-port-process-control": Readonly<
		Omit<Parameters<typeof preparePortProcessControlSubmission>[0], "input"> & {
			platform: SupportedPlatform;
			policy: ControlExecutionPolicy;
		}
	>;
	"submit-external-open": Readonly<{
		plan: ExternalOpenPlan | undefined;
		platform: SupportedPlatform;
	}>;
	"submit-file-open": Readonly<{
		plan: FileOpenPlan | undefined;
		baseDir: string;
		platform: SupportedPlatform;
	}>;
	"submit-cleanup-export-archive": Readonly<{
		preview: Parameters<typeof prepareCleanupExportArchiveConfirmation>[0];
		baseDir: string;
	}>;
	"submit-tool-export-archive": Readonly<{
		preview: Parameters<typeof prepareToolHistoryExportArchiveConfirmation>[0];
	}>;
	"submit-audit-export-archive": Readonly<{
		preview: Parameters<typeof prepareAuditEvidenceArchiveConfirmation>[0];
		baseDir: string;
		scope: "all" | "interface";
	}>;
	"submit-audit-archive-retention": Readonly<{
		preview: Parameters<typeof prepareAuditEvidenceRetentionConfirmation>[0];
		auditIndex: Parameters<typeof prepareAuditEvidenceRetentionConfirmation>[1];
		scope: "all" | "interface";
	}>;
	"submit-tools-archive-retention": Readonly<{
		preview: Parameters<
			typeof prepareToolHistoryArchiveRetentionConfirmation
		>[0];
		index: Parameters<typeof prepareToolHistoryArchiveRetentionConfirmation>[1];
	}>;
	"submit-tools-evidence-search": Readonly<
		Omit<Parameters<typeof prepareToolEvidenceSearchSubmission>[0], "value">
	>;
	"submit-interface-evidence-search": Readonly<
		Omit<
			Parameters<typeof prepareInterfaceEvidenceSearchSubmission>[0],
			"value"
		>
	>;
	"submit-dns-proposal": Readonly<
		Omit<Parameters<typeof prepareDnsServerProposalTransition>[0], "input">
	>;
	"submit-interface-confirmation": Readonly<
		Omit<
			Parameters<typeof prepareInterfaceConfirmationTransition>[0],
			"receivedPhrase"
		>
	>;
	"submit-config-reset": Readonly<{
		preview: ConfigWorkspaceResetPreview | undefined;
		resetValues: Parameters<
			typeof prepareConfigWorkspaceResetOpenTransition
		>[0];
	}>;
	"submit-editor-append": Readonly<{
		buffer: Parameters<typeof transitionEditorAppendLine>[0]["buffer"];
		selectedLineIndex: number;
	}>;
	"submit-editor-insert-before": Readonly<{
		buffer: Parameters<typeof transitionEditorInsertLine>[0]["buffer"];
		selectedLineIndex: number;
	}>;
	"submit-editor-insert-after": Readonly<{
		buffer: Parameters<typeof transitionEditorInsertLine>[0]["buffer"];
		selectedLineIndex: number;
	}>;
	"submit-editor-replace": Readonly<{
		buffer: Parameters<typeof transitionEditorReplaceLine>[0]["buffer"];
		selectedLineIndex: number;
	}>;
	"submit-editor-save": Readonly<{
		editorPreview: Parameters<
			typeof prepareEditorSaveSubmission
		>[0]["editorPreview"];
		provider: FileProvider;
		policy: EditorSaveExecutionPolicy;
	}>;
	"submit-config-text": Readonly<
		Omit<Parameters<typeof prepareConfigWorkspaceTextSubmission>[0], "value">
	>;
	"submit-tool": Readonly<
		Omit<
			Parameters<typeof prepareToolCommandSubmission>[0],
			"fieldIndex" | "prompt" | "value"
		>
	>;
	"submit-file-operation-destination": Readonly<{
		dialog: Parameters<typeof prepareFileOperationDestination>[0];
	}>;
	"submit-file-operation-confirmation": Readonly<{
		dialog: Parameters<typeof prepareFileOperationConfirmation>[0]["dialog"];
		provider: FileProvider;
		policy: FileOperationExecutionPolicy;
	}>;
};

type ContextFor<Effect extends CommandSubmitEffect> =
	CommandSubmitContextMap[Effect] extends undefined
		? { effect: Effect }
		: { effect: Effect; snapshot: CommandSubmitContextMap[Effect] };

export type CommandSubmitContext = {
	[Effect in CommandSubmitEffect]: ContextFor<Effect>;
}[CommandSubmitEffect];

export type CommandSubmitContextTable = {
	[Effect in CommandSubmitEffect]: ContextFor<Effect>;
};

export type CommandSubmitLiveContext = Readonly<{
	remoteConnectionDiagnostic: ReadOnlySftpConnectionDiagnostic | undefined;
	remoteConnectionStartedAt: number;
}>;

export type ClipboardCommandSubmitTransition =
	| {
			kind: "notice";
			closeCommandLine: true;
			state: ClipboardConfirmationState;
			notice: { level: "warn"; message: string };
	  }
	| {
			kind: "execute";
			closeCommandLine: true;
			state: ClipboardConfirmationState;
			plan: ReturnType<typeof buildClipboardWritePlan>;
	  };

type PortProcessSubmission = ReturnType<
	typeof preparePortProcessControlSubmission
>;

type PortProcessCommandSubmitTransition =
	| Exclude<PortProcessSubmission, { kind: "confirmation" }>
	| (Extract<PortProcessSubmission, { kind: "confirmation" }> & {
			executionPlan: ReturnType<typeof createPortProcessControlExecutionPlan>;
	  });

type EndpointFilterCommandSubmitTransition = ReturnType<
	typeof prepareEndpointFilterTransition
> & { scope: EndpointHandoffKind };

type EndpointFilterCleanupCommandSubmitTransition = ReturnType<
	typeof submitEndpointFilterCleanupConfirmation
> & { scope: EndpointHandoffKind };

type RemoteConnectCommandSubmitTransition =
	| Extract<
			ReturnType<typeof prepareRemoteConnectSubmission>,
			{ kind: "blocked" }
	  >
	| (Extract<
			ReturnType<typeof prepareRemoteConnectSubmission>,
			{ kind: "connect" }
	  > & {
			attemptDiagnostic: ReadOnlySftpConnectionDiagnostic;
	  });

type AuditArchiveCommandSubmitTransition = ReturnType<
	typeof prepareAuditEvidenceArchiveConfirmation
> & {
	scope: "audit" | "interface";
};

type AuditRetentionCommandSubmitTransition = ReturnType<
	typeof prepareAuditEvidenceRetentionConfirmation
> & {
	scope: "audit" | "interface";
};

type ConfigResetCommandSubmitTransition = ReturnType<
	typeof prepareConfigWorkspaceResetSubmission
> & {
	preview: ConfigWorkspaceResetPreview;
};

type EditorSaveCommandSubmitTransition =
	| Extract<ReturnType<typeof prepareEditorSaveSubmission>, { kind: "notice" }>
	| (Extract<
			ReturnType<typeof prepareEditorSaveSubmission>,
			{ kind: "execute" }
	  > & {
			execution: {
				provider: FileProvider;
				plan: ReturnType<typeof createEditorSaveExecutionPlan>;
			};
	  });

type FileOperationConfirmationCommandSubmitTransition = ReturnType<
	typeof prepareFileOperationConfirmation
> & {
	execution?: {
		provider: FileProvider;
		plan: NonNullable<
			ReturnType<typeof prepareFileOperationConfirmation>["plan"]
		>;
	};
};

export type CommandSubmitResolvedTransitionMap = {
	"submit-path": ReturnType<typeof prepareFilePathCommand>;
	"submit-clipboard": ClipboardCommandSubmitTransition;
	"submit-route-destination": ReturnType<
		typeof prepareRouteDestinationSubmission
	>;
	"submit-route-filter": ReturnType<typeof prepareRouteFilterTransition>;
	"submit-route-filter-cleanup": ReturnType<
		typeof submitRouteFilterCleanupConfirmation
	>;
	"submit-tool-history-filter": ReturnType<
		typeof prepareToolHistoryFilterSubmission
	>;
	"submit-tool-history-cleanup": ReturnType<
		typeof prepareToolHistoryCleanupSubmission
	>;
	"submit-tool-target-label": ReturnType<
		typeof renameToolTargetPresetTransition
	>;
	"submit-tool-target-value": ReturnType<
		typeof retargetToolTargetPresetTransition
	>;
	"submit-tool-target-action": ReturnType<
		typeof reassignToolTargetPresetActionTransition
	>;
	"submit-tool-target-cleanup": ReturnType<
		typeof submitToolTargetCleanupTransition
	>;
	"submit-tool-target-preset": ReturnType<
		typeof submitToolTargetPresetCommandTransition
	>;
	"submit-remote-profile": ReturnType<typeof prepareRemoteProfileCommand>;
	"submit-remote-connect": RemoteConnectCommandSubmitTransition;
	"submit-remote-host-trust": ReturnType<
		typeof prepareRemoteHostTrustSubmission
	>;
	"submit-remote-host-key-evidence": ReturnType<
		typeof prepareRemoteHostKeyEvidenceSubmission
	>;
	"submit-remote-known-hosts-candidate": ReturnType<
		typeof prepareRemoteKnownHostsCandidateSubmission
	>;
	"submit-remote-known-hosts-paste": ReturnType<
		typeof prepareRemoteKnownHostsPasteSubmission
	>;
	"submit-remote-known-hosts-selection": ReturnType<
		typeof prepareRemoteKnownHostsPasteSelection
	>;
	"submit-endpoint-filter": EndpointFilterCommandSubmitTransition;
	"submit-endpoint-filter-cleanup": EndpointFilterCleanupCommandSubmitTransition;
	"submit-timeline-search": ReturnType<typeof prepareTimelineSearchTransition>;
	"submit-timeline-search-cleanup": ReturnType<
		typeof submitTimelineSearchCleanupConfirmation
	>;
	"submit-log-search": ReturnType<typeof prepareLogSearchTransition>;
	"submit-logs-cleanup": ReturnType<typeof submitLogCleanupConfirmation>;
	"submit-control-confirmation": ReturnType<
		typeof submitControlConfirmationTransition
	>;
	"submit-port-process-control": PortProcessCommandSubmitTransition;
	"submit-external-open": ReturnType<typeof prepareExternalOpenSubmission>;
	"submit-file-open": ReturnType<typeof prepareFileOpenSubmission>;
	"submit-cleanup-export-archive": ReturnType<
		typeof prepareCleanupExportArchiveConfirmation
	>;
	"submit-tool-export-archive": ReturnType<
		typeof prepareToolHistoryExportArchiveConfirmation
	>;
	"submit-audit-export-archive": AuditArchiveCommandSubmitTransition;
	"submit-audit-archive-retention": AuditRetentionCommandSubmitTransition;
	"submit-tools-archive-retention": ReturnType<
		typeof prepareToolHistoryArchiveRetentionConfirmation
	>;
	"submit-tools-evidence-search": ReturnType<
		typeof prepareToolEvidenceSearchSubmission
	>;
	"submit-interface-evidence-search": ReturnType<
		typeof prepareInterfaceEvidenceSearchSubmission
	>;
	"submit-dns-proposal": ReturnType<typeof prepareDnsServerProposalTransition>;
	"submit-interface-confirmation": ReturnType<
		typeof prepareInterfaceConfirmationTransition
	>;
	"submit-config-reset": ConfigResetCommandSubmitTransition;
	"submit-editor-append": ReturnType<typeof transitionEditorAppendLine>;
	"submit-editor-insert-before": ReturnType<typeof transitionEditorInsertLine>;
	"submit-editor-insert-after": ReturnType<typeof transitionEditorInsertLine>;
	"submit-editor-replace": ReturnType<typeof transitionEditorReplaceLine>;
	"submit-editor-save": EditorSaveCommandSubmitTransition;
	"submit-config-text": ReturnType<typeof prepareConfigWorkspaceTextSubmission>;
	"submit-tool": ReturnType<typeof prepareToolCommandSubmission>;
	"submit-file-operation-destination": ReturnType<
		typeof prepareFileOperationDestination
	>;
	"submit-file-operation-confirmation": FileOperationConfirmationCommandSubmitTransition;
};

export type ImmutableCommandSubmitRequest = Readonly<
	Omit<CommandSubmitRequest, "fieldTouchedIndexes"> & {
		fieldTouchedIndexes?: readonly number[];
	}
>;

type ResolvedEffectFor<Effect extends CommandSubmitEffect> = {
	kind: "resolved";
	effect: Effect;
	owner: string;
	request: ImmutableCommandSubmitRequest;
	transition: CommandSubmitResolvedTransitionMap[Effect];
};

export type CommandSubmitOwnedGuard = {
	kind: "owned-guard";
	effect: CommandSubmitEffect;
	owner: string;
	request: ImmutableCommandSubmitRequest;
	reason: "context-effect-mismatch" | "prompt-context-mismatch";
	notice: { level: "warn"; message: string };
};

export type CommandSubmitResolvedEffect =
	| {
			[Effect in CommandSubmitEffect]: ResolvedEffectFor<Effect>;
	  }[CommandSubmitEffect]
	| CommandSubmitOwnedGuard;

export type CommandSubmitResolvedHandlers = {
	[Effect in CommandSubmitEffect]: (
		transition: CommandSubmitResolvedTransitionMap[Effect],
	) => void;
};

export function dispatchCommandSubmitEffect(
	effect: CommandSubmitResolvedEffect,
	handlers: CommandSubmitResolvedHandlers,
): CommandSubmitOwnedGuard | undefined {
	if (effect.kind === "owned-guard") return effect;
	const handler = handlers[effect.effect] as (
		transition: CommandSubmitResolvedTransitionMap[CommandSubmitEffect],
	) => void;
	handler(effect.transition);
	return undefined;
}

export function prepareCommandSubmitEffectFromTable(
	submission: CommandSubmitTransition,
	contexts: CommandSubmitContextTable,
	live: CommandSubmitLiveContext,
): CommandSubmitResolvedEffect {
	if (submission.effect === "submit-remote-connect") {
		const context = contexts[submission.effect];
		return prepareCommandSubmitEffect(submission, {
			...context,
			snapshot: {
				...context.snapshot,
				diagnostic: live.remoteConnectionDiagnostic,
				startedAt: live.remoteConnectionStartedAt,
			},
		});
	}
	return prepareCommandSubmitEffect(
		submission,
		contexts[submission.effect] as CommandSubmitContext,
	);
}

function snapshotRequest(
	request: CommandSubmitRequest,
): ImmutableCommandSubmitRequest {
	return {
		prompt: request.prompt,
		value: request.value,
		...(request.fieldIndex === undefined
			? {}
			: { fieldIndex: request.fieldIndex }),
		...(request.fieldTouchedIndexes === undefined
			? {}
			: { fieldTouchedIndexes: [...request.fieldTouchedIndexes] }),
	};
}

function resolved<Effect extends CommandSubmitEffect>(
	submission: CommandSubmitTransition,
	effect: Effect,
	transition: CommandSubmitResolvedTransitionMap[Effect],
): ResolvedEffectFor<Effect> {
	return {
		kind: "resolved",
		effect,
		owner: submission.owner,
		request: snapshotRequest(submission.request),
		transition,
	};
}

function ownedGuard(
	submission: CommandSubmitTransition,
	reason: CommandSubmitOwnedGuard["reason"],
): CommandSubmitOwnedGuard {
	return {
		kind: "owned-guard",
		effect: submission.effect,
		owner: submission.owner,
		request: snapshotRequest(submission.request),
		reason,
		notice: {
			level: "warn",
			message: `command submit ${submission.effect} blocked ${reason} owner=${submission.owner}`,
		},
	};
}

function prepareClipboardSubmission(
	request: CommandSubmitRequest,
	context: CommandSubmitContextMap["submit-clipboard"],
): ClipboardCommandSubmitTransition {
	const state = clearClipboardConfirmationState();
	if (!context.state.preview) {
		return {
			kind: "notice",
			closeCommandLine: true,
			state,
			notice: {
				level: "warn",
				message: "clipboard locked no preview selected",
			},
		};
	}
	return {
		kind: "execute",
		closeCommandLine: true,
		state,
		plan: buildClipboardWritePlan(context.state.preview, {
			confirmation: request.value || context.state.value.trim(),
			platform: context.platform,
		}),
	};
}

function preparePortProcessSubmission(
	request: CommandSubmitRequest,
	context: CommandSubmitContextMap["submit-port-process-control"],
): PortProcessCommandSubmitTransition {
	const transition = preparePortProcessControlSubmission({
		ports: [...context.ports],
		selectedIndex: context.selectedIndex,
		input: request.value,
	});
	if (transition.kind !== "confirmation") return transition;
	return {
		...transition,
		executionPlan: createPortProcessControlExecutionPlan(
			transition.executionRequest.preview,
			transition.executionRequest.confirmation,
			getControlPreviewCommand("process.terminate", context.platform),
			context.policy,
		),
	};
}

function prepareEditorSave(
	request: CommandSubmitRequest,
	context: CommandSubmitContextMap["submit-editor-save"],
): EditorSaveCommandSubmitTransition {
	const transition = prepareEditorSaveSubmission({
		editorPreview: context.editorPreview,
		confirmation: request.value,
	});
	if (transition.kind === "notice") return transition;
	const preview = createEditorWritePreview({
		path: transition.editorPreview.path,
		originalContent: transition.editorPreview.originalContent,
		nextContent: transition.editorPreview.content,
		providerKind: context.provider.kind,
	});
	return {
		...transition,
		execution: {
			provider: context.provider,
			plan: createEditorSaveExecutionPlan({
				preview,
				confirmed: true,
				policy: context.policy,
				nextContent: transition.editorPreview.content,
			}),
		},
	};
}

function prepareFileOperationConfirmationSubmission(
	request: CommandSubmitRequest,
	context: CommandSubmitContextMap["submit-file-operation-confirmation"],
): FileOperationConfirmationCommandSubmitTransition {
	const transition = prepareFileOperationConfirmation({
		dialog: context.dialog,
		confirmation: request.value,
		providerKind: context.provider.kind,
		policy: context.policy,
	});
	if (!transition.plan) return transition;
	return {
		...transition,
		execution: { provider: context.provider, plan: transition.plan },
	};
}

function endpointPromptKind(prompt: string, cleanup = false) {
	const prefix = cleanup ? "endpoint-filter-cleanup:" : "endpoint-filter:";
	const suffix = prompt.startsWith(prefix) ? prompt.slice(prefix.length) : "";
	return suffix === "connections" || suffix === "ports" ? suffix : undefined;
}

export function prepareCommandSubmitEffect(
	submission: CommandSubmitTransition,
	context: CommandSubmitContext,
): CommandSubmitResolvedEffect {
	if (submission.effect !== context.effect) {
		return ownedGuard(submission, "context-effect-mismatch");
	}

	const request = submission.request;
	switch (context.effect) {
		case "submit-path":
			return resolved(
				submission,
				context.effect,
				prepareFilePathCommand({
					...context.snapshot,
					backHistory: [...context.snapshot.backHistory],
					forwardHistory: [...context.snapshot.forwardHistory],
					value: request.value,
				}),
			);
		case "submit-clipboard":
			return resolved(
				submission,
				context.effect,
				prepareClipboardSubmission(request, context.snapshot),
			);
		case "submit-route-destination":
			return resolved(
				submission,
				context.effect,
				prepareRouteDestinationSubmission(request.value),
			);
		case "submit-route-filter":
			return resolved(
				submission,
				context.effect,
				prepareRouteFilterTransition({
					routes: [...context.snapshot.routes],
					presets: [...context.snapshot.presets],
					query: request.value,
				}),
			);
		case "submit-route-filter-cleanup":
			return resolved(
				submission,
				context.effect,
				submitRouteFilterCleanupConfirmation(
					[...context.snapshot.presets],
					request.value,
				),
			);
		case "submit-tool-history-filter":
			return resolved(
				submission,
				context.effect,
				prepareToolHistoryFilterSubmission({
					history: [...context.snapshot.history],
					value: request.value,
				}),
			);
		case "submit-tool-history-cleanup":
			return resolved(
				submission,
				context.effect,
				prepareToolHistoryCleanupSubmission(
					[...context.snapshot.presets],
					request.value,
				),
			);
		case "submit-tool-target-label":
			return resolved(
				submission,
				context.effect,
				renameToolTargetPresetTransition({
					...context.snapshot,
					presets: [...context.snapshot.presets],
					targetPresets: [...context.snapshot.targetPresets],
					value: request.value,
				}),
			);
		case "submit-tool-target-value":
			return resolved(
				submission,
				context.effect,
				retargetToolTargetPresetTransition({
					...context.snapshot,
					presets: [...context.snapshot.presets],
					targetPresets: [...context.snapshot.targetPresets],
					value: request.value,
				}),
			);
		case "submit-tool-target-action":
			return resolved(
				submission,
				context.effect,
				reassignToolTargetPresetActionTransition({
					...context.snapshot,
					presets: [...context.snapshot.presets],
					targetPresets: [...context.snapshot.targetPresets],
					value: request.value,
				}),
			);
		case "submit-tool-target-cleanup":
			return resolved(
				submission,
				context.effect,
				submitToolTargetCleanupTransition({
					...context.snapshot,
					presets: [...context.snapshot.presets],
					targetPresets: [...context.snapshot.targetPresets],
					value: request.value,
				}),
			);
		case "submit-tool-target-preset":
			return resolved(
				submission,
				context.effect,
				submitToolTargetPresetCommandTransition({
					...context.snapshot,
					presets: [...context.snapshot.presets],
					targetPresets: [...context.snapshot.targetPresets],
					value: request.value,
				}),
			);
		case "submit-remote-profile":
			return resolved(
				submission,
				context.effect,
				prepareRemoteProfileCommand(request.value),
			);
		case "submit-remote-connect": {
			const { startedAt, ...snapshot } = context.snapshot;
			const transition = prepareRemoteConnectSubmission({
				...snapshot,
				profiles: [...snapshot.profiles],
				receivedConfirmation: request.value,
			});
			return resolved(
				submission,
				context.effect,
				transition.kind === "connect"
					? {
							...transition,
							attemptDiagnostic: startReadOnlySftpConnectionDiagnostic(
								transition.profile,
								transition.candidate.fingerprint,
								snapshot.diagnostic,
								startedAt,
							),
						}
					: transition,
			);
		}
		case "submit-remote-host-trust":
			return resolved(
				submission,
				context.effect,
				prepareRemoteHostTrustSubmission({
					...context.snapshot,
					profiles: [...context.snapshot.profiles],
					receivedConfirmation: request.value,
				}),
			);
		case "submit-remote-host-key-evidence":
			return resolved(
				submission,
				context.effect,
				prepareRemoteHostKeyEvidenceSubmission({
					...context.snapshot,
					profiles: [...context.snapshot.profiles],
					value: request.value,
				}),
			);
		case "submit-remote-known-hosts-candidate":
			return resolved(
				submission,
				context.effect,
				prepareRemoteKnownHostsCandidateSubmission({
					...context.snapshot,
					profiles: [...context.snapshot.profiles],
					value: request.value,
				}),
			);
		case "submit-remote-known-hosts-paste":
			return resolved(
				submission,
				context.effect,
				prepareRemoteKnownHostsPasteSubmission({
					...context.snapshot,
					profiles: [...context.snapshot.profiles],
					value: request.value,
				}),
			);
		case "submit-remote-known-hosts-selection":
			return resolved(
				submission,
				context.effect,
				prepareRemoteKnownHostsPasteSelection({
					...context.snapshot,
					profiles: [...context.snapshot.profiles],
					selection: { kind: "input", value: request.value },
				}),
			);
		case "submit-endpoint-filter": {
			const promptKind = endpointPromptKind(request.prompt);
			if (!promptKind) {
				return ownedGuard(submission, "prompt-context-mismatch");
			}
			const transition =
				promptKind === "connections"
					? prepareEndpointFilterTransition({
							kind: "connections",
							rows: [...context.snapshot.connections.rows],
							presets: [...context.snapshot.connections.presets],
							query: request.value,
						})
					: prepareEndpointFilterTransition({
							kind: "ports",
							rows: [...context.snapshot.ports.rows],
							presets: [...context.snapshot.ports.presets],
							query: request.value,
						});
			return resolved(submission, context.effect, {
				...transition,
				scope: promptKind,
			});
		}
		case "submit-endpoint-filter-cleanup": {
			const promptKind = endpointPromptKind(request.prompt, true);
			if (!promptKind) {
				return ownedGuard(submission, "prompt-context-mismatch");
			}
			const snapshot = context.snapshot[promptKind];
			return resolved(submission, context.effect, {
				...submitEndpointFilterCleanupConfirmation(
					promptKind,
					[...snapshot.presets],
					request.value,
					snapshot.rowCount,
				),
				scope: promptKind,
			});
		}
		case "submit-timeline-search":
			return resolved(
				submission,
				context.effect,
				prepareTimelineSearchTransition({
					...context.snapshot,
					events: [...context.snapshot.events],
					presets: [...context.snapshot.presets],
					query: request.value,
				}),
			);
		case "submit-timeline-search-cleanup":
			return resolved(
				submission,
				context.effect,
				submitTimelineSearchCleanupConfirmation(
					[...context.snapshot.presets],
					request.value,
				),
			);
		case "submit-log-search":
			return resolved(
				submission,
				context.effect,
				prepareLogSearchTransition({
					...context.snapshot,
					entries: [...context.snapshot.entries],
					presets: [...context.snapshot.presets],
					query: request.value,
				}),
			);
		case "submit-logs-cleanup":
			return resolved(
				submission,
				context.effect,
				submitLogCleanupConfirmation(
					[...context.snapshot.presets],
					[...context.snapshot.profiles],
					request.value,
				),
			);
		case "submit-control-confirmation":
			return resolved(
				submission,
				context.effect,
				submitControlConfirmationTransition({
					...context.snapshot,
					input: request.value,
				}),
			);
		case "submit-port-process-control":
			return resolved(
				submission,
				context.effect,
				preparePortProcessSubmission(request, context.snapshot),
			);
		case "submit-external-open":
			return resolved(
				submission,
				context.effect,
				prepareExternalOpenSubmission(
					context.snapshot.plan,
					request.value,
					context.snapshot.platform,
				),
			);
		case "submit-file-open":
			return resolved(
				submission,
				context.effect,
				prepareFileOpenSubmission(
					context.snapshot.plan,
					request.value,
					context.snapshot.baseDir,
					context.snapshot.platform,
				),
			);
		case "submit-cleanup-export-archive":
			return resolved(
				submission,
				context.effect,
				prepareCleanupExportArchiveConfirmation(
					context.snapshot.preview,
					context.snapshot.baseDir,
					request.value,
				),
			);
		case "submit-tool-export-archive":
			return resolved(
				submission,
				context.effect,
				prepareToolHistoryExportArchiveConfirmation(
					context.snapshot.preview,
					request.value,
				),
			);
		case "submit-audit-export-archive": {
			const transition = prepareAuditEvidenceArchiveConfirmation(
				context.snapshot.preview,
				context.snapshot.baseDir,
				request.value,
			);
			return resolved(submission, context.effect, {
				...transition,
				scope: context.snapshot.scope === "interface" ? "interface" : "audit",
			});
		}
		case "submit-audit-archive-retention":
			return resolved(submission, context.effect, {
				...prepareAuditEvidenceRetentionConfirmation(
					context.snapshot.preview,
					context.snapshot.scope === "interface"
						? filterInterfaceConfirmationAuditExportIndex(
								context.snapshot.auditIndex,
							)
						: context.snapshot.auditIndex,
					request.value,
				),
				scope: context.snapshot.scope === "interface" ? "interface" : "audit",
			});
		case "submit-tools-archive-retention":
			return resolved(
				submission,
				context.effect,
				prepareToolHistoryArchiveRetentionConfirmation(
					context.snapshot.preview,
					context.snapshot.index,
					request.value,
				),
			);
		case "submit-tools-evidence-search":
			return resolved(
				submission,
				context.effect,
				prepareToolEvidenceSearchSubmission({
					...context.snapshot,
					value: request.value,
				}),
			);
		case "submit-interface-evidence-search":
			return resolved(
				submission,
				context.effect,
				prepareInterfaceEvidenceSearchSubmission({
					...context.snapshot,
					activeExports: [...context.snapshot.activeExports],
					archivedExports: [...context.snapshot.archivedExports],
					value: request.value,
				}),
			);
		case "submit-dns-proposal":
			return resolved(
				submission,
				context.effect,
				prepareDnsServerProposalTransition({
					...context.snapshot,
					input: request.value,
				}),
			);
		case "submit-interface-confirmation":
			return resolved(
				submission,
				context.effect,
				prepareInterfaceConfirmationTransition({
					...context.snapshot,
					receivedPhrase: request.value,
				}),
			);
		case "submit-config-reset": {
			const preview =
				context.snapshot.preview ??
				prepareConfigWorkspaceResetOpenTransition(context.snapshot.resetValues)
					.preview;
			return resolved(submission, context.effect, {
				...prepareConfigWorkspaceResetSubmission(preview, request.value),
				preview,
			});
		}
		case "submit-editor-append":
			return resolved(
				submission,
				context.effect,
				transitionEditorAppendLine({
					buffer: context.snapshot.buffer,
					selectedLineIndex: context.snapshot.selectedLineIndex,
					line: request.value,
				}),
			);
		case "submit-editor-insert-before":
			return resolved(
				submission,
				context.effect,
				transitionEditorInsertLine({
					buffer: context.snapshot.buffer,
					selectedLineIndex: context.snapshot.selectedLineIndex,
					line: request.value,
					position: "before",
				}),
			);
		case "submit-editor-insert-after":
			return resolved(
				submission,
				context.effect,
				transitionEditorInsertLine({
					buffer: context.snapshot.buffer,
					selectedLineIndex: context.snapshot.selectedLineIndex,
					line: request.value,
					position: "after",
				}),
			);
		case "submit-editor-replace":
			return resolved(
				submission,
				context.effect,
				transitionEditorReplaceLine({
					buffer: context.snapshot.buffer,
					selectedLineIndex: context.snapshot.selectedLineIndex,
					line: request.value,
				}),
			);
		case "submit-editor-save":
			return resolved(
				submission,
				context.effect,
				prepareEditorSave(request, context.snapshot),
			);
		case "submit-config-text": {
			const promptKey = request.prompt.startsWith("config-")
				? request.prompt.slice("config-".length)
				: undefined;
			const selected = getConfigWorkspaceItem(
				context.snapshot.items,
				context.snapshot.selectedIndex,
			);
			if (!selected || selected.key !== promptKey) {
				return ownedGuard(submission, "prompt-context-mismatch");
			}
			return resolved(
				submission,
				context.effect,
				prepareConfigWorkspaceTextSubmission({
					items: [...context.snapshot.items],
					selectedIndex: context.snapshot.selectedIndex,
					value: request.value,
				}),
			);
		}
		case "submit-tool":
			return resolved(
				submission,
				context.effect,
				prepareToolCommandSubmission({
					...context.snapshot,
					prompt: request.prompt,
					value: request.value,
					fieldIndex: request.fieldIndex,
				}),
			);
		case "submit-file-operation-destination":
			return resolved(
				submission,
				context.effect,
				prepareFileOperationDestination(context.snapshot.dialog, request.value),
			);
		case "submit-file-operation-confirmation":
			return resolved(
				submission,
				context.effect,
				prepareFileOperationConfirmationSubmission(request, context.snapshot),
			);
	}
}
