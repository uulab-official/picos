import type { NetworkSummary } from "../core/types";
import {
	appendClipboardConfirmationInput,
	backspaceClipboardConfirmationInput,
	type ClipboardConfirmationState,
} from "./clipboardDialog";
import {
	type ConfigWorkspaceItemKey,
	isConfigWorkspaceItemKey,
} from "./configPanel";
import {
	createToolFormState,
	formatToolFormInputValue,
	getToolRunActionMetadata,
	selectToolFormField,
	type ToolTargetCommandLineIntent,
	updateToolFormFieldValue,
} from "./toolHistory";

export type CommandPrompt =
	| keyof typeof staticCommandPromptOwnership
	| `config-${ConfigWorkspaceItemKey}`
	| `endpoint-filter:${"connections" | "ports"}`
	| `endpoint-filter-cleanup:${"connections" | "ports"}`
	| `tool:${string}`;

export type CommandSubmitRoute = {
	owner: string;
	effect: CommandSubmitEffect;
};

export type CommandSubmitRequest = {
	prompt: string;
	value: string;
	fieldIndex?: number;
	fieldTouchedIndexes?: number[];
};

export type CommandSubmitTransition = CommandSubmitRoute & {
	request: CommandSubmitRequest;
};

export type CommandSubmitEffect =
	| "submit-path"
	| "submit-clipboard"
	| "submit-route-destination"
	| "submit-route-filter"
	| "submit-route-filter-cleanup"
	| "submit-tool-history-filter"
	| "submit-tool-history-cleanup"
	| "submit-tool-target-label"
	| "submit-tool-target-value"
	| "submit-tool-target-action"
	| "submit-tool-target-cleanup"
	| "submit-tool-target-preset"
	| "submit-remote-profile"
	| "submit-remote-connect"
	| "submit-remote-host-trust"
	| "submit-remote-host-key-evidence"
	| "submit-remote-known-hosts-candidate"
	| "submit-remote-known-hosts-paste"
	| "submit-remote-known-hosts-selection"
	| "submit-endpoint-filter"
	| "submit-endpoint-filter-cleanup"
	| "submit-timeline-search"
	| "submit-timeline-search-cleanup"
	| "submit-log-search"
	| "submit-logs-cleanup"
	| "submit-control-confirmation"
	| "submit-port-process-control"
	| "submit-external-open"
	| "submit-file-open"
	| "submit-cleanup-export-archive"
	| "submit-tool-export-archive"
	| "submit-audit-export-archive"
	| "submit-audit-archive-retention"
	| "submit-tools-archive-retention"
	| "submit-tools-evidence-search"
	| "submit-interface-evidence-search"
	| "submit-dns-proposal"
	| "submit-interface-confirmation"
	| "submit-config-reset"
	| "submit-editor-append"
	| "submit-editor-insert-before"
	| "submit-editor-insert-after"
	| "submit-editor-replace"
	| "submit-editor-save"
	| "submit-config-text"
	| "submit-tool"
	| "submit-file-operation-destination"
	| "submit-file-operation-confirmation";

export type CommandSubmitHandlers = {
	[Effect in CommandSubmitEffect]: (request: CommandSubmitRequest) => void;
};

export function dispatchCommandSubmit(
	transition: CommandSubmitTransition,
	handlers: CommandSubmitHandlers,
): void {
	handlers[transition.effect](transition.request);
}

export type CommandPromptCleanupIntent =
	| "clipboard-confirmation"
	| "connection-copy-preview"
	| "port-copy-preview"
	| "process-copy-preview"
	| "route-copy-preview"
	| "tool-copy-preview"
	| "external-open-plan"
	| "file-open-plan"
	| "port-process-preview"
	| "cleanup-export-archive-plan"
	| "tool-export-archive-plan"
	| "audit-export-archive-plan"
	| "audit-archive-retention-plan"
	| "tool-archive-retention-plan"
	| "config-reset-preview"
	| "file-operation-dialog";

type StaticCommandPromptOwnership = {
	owner: string;
	effect: CommandSubmitEffect;
	cancel: string;
	cleanup?: CommandPromptCleanupIntent[];
};

const staticCommandPromptOwnership = {
	path: {
		owner: "fileWorkspaceTransitions",
		effect: "submit-path",
		cancel: "path command cancelled",
	},
	clipboard: {
		owner: "clipboardDialog",
		effect: "submit-clipboard",
		cancel: "clipboard confirmation cancelled",
		cleanup: [
			"clipboard-confirmation",
			"connection-copy-preview",
			"port-copy-preview",
			"process-copy-preview",
			"route-copy-preview",
			"tool-copy-preview",
		],
	},
	route: {
		owner: "routePanel",
		effect: "submit-route-destination",
		cancel: "route path command cancelled",
	},
	"route-filter": {
		owner: "routePanel",
		effect: "submit-route-filter",
		cancel: "route filter cancelled",
	},
	"route-filter-cleanup": {
		owner: "routePanel",
		effect: "submit-route-filter-cleanup",
		cancel: "route filter cleanup cancelled",
	},
	"tool-filter": {
		owner: "toolHistory",
		effect: "submit-tool-history-filter",
		cancel: "tool history filter cancelled",
	},
	"tool-history-cleanup": {
		owner: "toolHistory",
		effect: "submit-tool-history-cleanup",
		cancel: "tool history filter cleanup cancelled",
	},
	"tool-target-label": {
		owner: "toolHistory",
		effect: "submit-tool-target-label",
		cancel: "tool target label cancelled",
	},
	"tool-target-value": {
		owner: "toolHistory",
		effect: "submit-tool-target-value",
		cancel: "tool target value cancelled",
	},
	"tool-target-action": {
		owner: "toolHistory",
		effect: "submit-tool-target-action",
		cancel: "tool target action cancelled",
	},
	"tool-target-cleanup": {
		owner: "toolHistory",
		effect: "submit-tool-target-cleanup",
		cancel: "tool target cleanup cancelled",
	},
	"tool-target-preset": {
		owner: "toolHistory",
		effect: "submit-tool-target-preset",
		cancel: "tool target preset cancelled",
	},
	"remote-profile": {
		owner: "remotesPanel",
		effect: "submit-remote-profile",
		cancel: "remote profile cancelled",
	},
	"remote-connect": {
		owner: "remotesPanel",
		effect: "submit-remote-connect",
		cancel: "remote connect confirmation cancelled",
	},
	"remote-host-trust": {
		owner: "remotesPanel",
		effect: "submit-remote-host-trust",
		cancel: "remote host trust review cancelled",
	},
	"remote-host-key-evidence": {
		owner: "remotesPanel",
		effect: "submit-remote-host-key-evidence",
		cancel: "remote host key evidence input cancelled",
	},
	"remote-known-hosts-candidate": {
		owner: "remotesPanel",
		effect: "submit-remote-known-hosts-candidate",
		cancel: "remote known_hosts candidate input cancelled",
	},
	"remote-known-hosts-paste": {
		owner: "remotesPanel",
		effect: "submit-remote-known-hosts-paste",
		cancel: "remote known_hosts paste review cancelled",
	},
	"remote-known-hosts-select": {
		owner: "remotesPanel",
		effect: "submit-remote-known-hosts-selection",
		cancel: "remote known_hosts paste selection cancelled",
	},
	"timeline-search": {
		owner: "timelinePanel",
		effect: "submit-timeline-search",
		cancel: "timeline search cancelled",
	},
	"timeline-search-cleanup": {
		owner: "timelinePanel",
		effect: "submit-timeline-search-cleanup",
		cancel: "timeline search cleanup cancelled",
	},
	"log-search": {
		owner: "logPanel",
		effect: "submit-log-search",
		cancel: "logs search cancelled",
	},
	"logs-cleanup": {
		owner: "logPanel",
		effect: "submit-logs-cleanup",
		cancel: "logs cleanup cancelled",
	},
	"control-confirm": {
		owner: "actionControlTransitions",
		effect: "submit-control-confirmation",
		cancel: "control confirmation cancelled",
	},
	"port-process-control": {
		owner: "endpointPanel",
		effect: "submit-port-process-control",
		cancel: "port process control cancelled",
		cleanup: ["port-process-preview"],
	},
	"external-open": {
		owner: "statusEvidence",
		effect: "submit-external-open",
		cancel: "external open confirmation cancelled",
		cleanup: ["external-open-plan"],
	},
	"file-open": {
		owner: "statusEvidence",
		effect: "submit-file-open",
		cancel: "file open confirmation cancelled",
		cleanup: ["file-open-plan"],
	},
	"cleanup-export-archive": {
		owner: "cleanupIndex",
		effect: "submit-cleanup-export-archive",
		cancel: "cleanup export archive cancelled",
		cleanup: ["cleanup-export-archive-plan"],
	},
	"tool-export-archive": {
		owner: "toolHistory",
		effect: "submit-tool-export-archive",
		cancel: "tools evidence archive cancelled",
		cleanup: ["tool-export-archive-plan"],
	},
	"audit-export-archive": {
		owner: "statusEvidence",
		effect: "submit-audit-export-archive",
		cancel: "audit export archive cancelled",
		cleanup: ["audit-export-archive-plan"],
	},
	"audit-archive-retention": {
		owner: "statusEvidence",
		effect: "submit-audit-archive-retention",
		cancel: "audit archive retention cancelled",
		cleanup: ["audit-archive-retention-plan"],
	},
	"tools-archive-retention": {
		owner: "toolHistory",
		effect: "submit-tools-archive-retention",
		cancel: "tools archive retention cancelled",
		cleanup: ["tool-archive-retention-plan"],
	},
	"tools-evidence-search": {
		owner: "toolHistory",
		effect: "submit-tools-evidence-search",
		cancel: "tools evidence search cancelled",
	},
	"interface-evidence-search": {
		owner: "statusActivityQueue",
		effect: "submit-interface-evidence-search",
		cancel: "interface evidence search cancelled",
	},
	"dns-servers": {
		owner: "dnsPanel",
		effect: "submit-dns-proposal",
		cancel: "dns server proposal cancelled",
	},
	"interface-confirm": {
		owner: "interfacePanel",
		effect: "submit-interface-confirmation",
		cancel: "interface confirmation cancelled",
	},
	"config-reset": {
		owner: "configPanel",
		effect: "submit-config-reset",
		cancel: "config reset cancelled",
		cleanup: ["config-reset-preview"],
	},
	"editor-append": {
		owner: "editorBuffer",
		effect: "submit-editor-append",
		cancel: "editor append cancelled",
	},
	"editor-insert-before": {
		owner: "editorBuffer",
		effect: "submit-editor-insert-before",
		cancel: "editor insert before cancelled",
	},
	"editor-insert-after": {
		owner: "editorBuffer",
		effect: "submit-editor-insert-after",
		cancel: "editor insert after cancelled",
	},
	"editor-replace": {
		owner: "editorBuffer",
		effect: "submit-editor-replace",
		cancel: "editor replace cancelled",
	},
	"editor-save": {
		owner: "editorBuffer",
		effect: "submit-editor-save",
		cancel: "editor save confirmation cancelled",
	},
	"file-operation-destination": {
		owner: "fileOperationDialog",
		effect: "submit-file-operation-destination",
		cancel: "file operation destination cancelled",
		cleanup: ["file-operation-dialog"],
	},
	"file-operation-confirm": {
		owner: "fileOperationDialog",
		effect: "submit-file-operation-confirmation",
		cancel: "file operation confirmation cancelled",
		cleanup: ["file-operation-dialog"],
	},
} as const satisfies Record<string, StaticCommandPromptOwnership>;

const familyCommandPromptOwnership = [
	{
		prefix: "endpoint-filter-cleanup:",
		example: "endpoint-filter-cleanup:connections",
		owner: "endpointPanel",
		effect: "submit-endpoint-filter-cleanup",
		cancel: "endpoint filter cleanup cancelled",
	},
	{
		prefix: "endpoint-filter:",
		example: "endpoint-filter:connections",
		owner: "endpointPanel",
		effect: "submit-endpoint-filter",
		cancel: "endpoint filter cancelled",
	},
	{
		prefix: "config-",
		example: "config-defaultPingHost",
		owner: "configPanel",
		effect: "submit-config-text",
		cancel: "config edit cancelled",
	},
	{
		prefix: "tool:",
		example: "tool:tools.dns",
		owner: "toolHistory",
		effect: "submit-tool",
		cancel: "tool target command cancelled",
	},
] as const satisfies ReadonlyArray<{
	prefix: string;
	example: CommandPrompt;
	owner: string;
	effect: CommandSubmitEffect;
	cancel: string;
}>;

export const commandPromptOwnershipRegistry = [
	...Object.entries(staticCommandPromptOwnership).map(([example, value]) => ({
		kind: "exact" as const,
		example: example as CommandPrompt,
		...value,
	})),
	...familyCommandPromptOwnership.map((value) => ({
		kind: "prefix" as const,
		...value,
	})),
] as const;

export function getCommandPromptExamples(): CommandPrompt[] {
	return commandPromptOwnershipRegistry.map((entry) => entry.example);
}

export function resolveCommandPromptOwnership(prompt: unknown) {
	if (typeof prompt !== "string") return undefined;
	if (Object.hasOwn(staticCommandPromptOwnership, prompt)) {
		return staticCommandPromptOwnership[
			prompt as keyof typeof staticCommandPromptOwnership
		];
	}
	return familyCommandPromptOwnership.find((entry) => {
		if (!prompt.startsWith(entry.prefix)) return false;
		const suffix = prompt.slice(entry.prefix.length);
		if (
			entry.prefix === "endpoint-filter:" ||
			entry.prefix === "endpoint-filter-cleanup:"
		) {
			return suffix === "connections" || suffix === "ports";
		}
		if (entry.prefix === "config-") {
			return isConfigWorkspaceItemKey(suffix);
		}
		if (entry.prefix === "tool:") {
			return Boolean(getToolRunActionMetadata(suffix));
		}
		return false;
	});
}

export function getCommandSubmitRoute(
	prompt: unknown,
): CommandSubmitRoute | undefined {
	const owner = resolveCommandPromptOwnership(prompt);
	return owner ? { owner: owner.owner, effect: owner.effect } : undefined;
}

export function prepareCommandSubmit(
	commandLine: CommandLineState,
): CommandSubmitTransition | undefined {
	const route = getCommandSubmitRoute(commandLine.prompt);
	if (!route) return undefined;
	return {
		...route,
		request: {
			prompt: commandLine.prompt,
			value: commandLine.value,
			...(commandLine.fieldIndex !== undefined
				? { fieldIndex: commandLine.fieldIndex }
				: {}),
			...(commandLine.fieldTouchedIndexes !== undefined
				? { fieldTouchedIndexes: [...commandLine.fieldTouchedIndexes] }
				: {}),
		},
	};
}

export type CommandPromptInputMode =
	| "plain"
	| "tool-form"
	| "clipboard-confirmation";

export function getCommandPromptInputMode(
	prompt: unknown,
): CommandPromptInputMode | undefined {
	const route = getCommandSubmitRoute(prompt);
	if (!route) return undefined;
	if (route.effect === "submit-tool") return "tool-form";
	if (route.effect === "submit-clipboard") return "clipboard-confirmation";
	return "plain";
}

export type CommandLineState = {
	active: boolean;
	prompt: string;
	value: string;
	fieldIndex?: number;
	fieldTouchedIndexes?: number[];
};

export type CommandLineInput = {
	input?: string;
	backspace?: boolean;
};

export type CommandLineOpenOptions = {
	value?: string;
	fieldIndex?: number;
	fieldTouchedIndexes?: number[];
};

export function openCommandLine(
	prompt: CommandPrompt,
	options: CommandLineOpenOptions = {},
): CommandLineState {
	const state: CommandLineState = {
		active: true,
		prompt,
		value: options.value ?? "",
	};
	if (options.fieldIndex !== undefined) {
		state.fieldIndex = Math.max(0, options.fieldIndex);
	}
	const touchedIndexes = normalizeFieldIndexes(
		options.fieldTouchedIndexes ?? [],
	);
	if (touchedIndexes.length) {
		state.fieldTouchedIndexes = touchedIndexes;
	}
	return state;
}

export function closeCommandLine(state: CommandLineState): CommandLineState {
	return {
		...state,
		active: false,
		value: "",
	};
}

export function applyToolTargetCommandLineIntent(
	state: CommandLineState,
	intent: ToolTargetCommandLineIntent,
): CommandLineState {
	return intent === "close" ? closeCommandLine(state) : state;
}

export function moveCommandLineField(
	state: CommandLineState,
	total: number,
	direction: "next" | "previous",
): CommandLineState {
	if (!state.active || total <= 0) {
		return state;
	}
	const current = Math.min(Math.max(state.fieldIndex ?? 0, 0), total - 1);
	const offset = direction === "next" ? 1 : -1;
	return {
		...state,
		fieldIndex: (current + offset + total) % total,
	};
}

export function isCommandLineFieldTouched(state: CommandLineState): boolean {
	return (state.fieldTouchedIndexes ?? []).includes(state.fieldIndex ?? 0);
}

export function markCommandLineFieldTouched(
	state: CommandLineState,
): CommandLineState {
	const fieldIndex = Math.max(0, state.fieldIndex ?? 0);
	return {
		...state,
		fieldTouchedIndexes: normalizeFieldIndexes([
			...(state.fieldTouchedIndexes ?? []),
			fieldIndex,
		]),
	};
}

export function applyCommandLineInput(
	state: CommandLineState,
	event: CommandLineInput,
): CommandLineState {
	if (!state.active) {
		return state;
	}

	if (event.backspace) {
		return {
			...state,
			value: state.value.slice(0, -1),
		};
	}

	if (event.input?.length !== 1 || event.input < " ") {
		return state;
	}

	return {
		...state,
		value: `${state.value}${event.input}`,
	};
}

export function applyToolPromptCommandLineInput(
	state: CommandLineState,
	event: CommandLineInput,
	summary?: NetworkSummary,
): CommandLineState {
	if (!state.prompt.startsWith("tool:")) {
		return applyCommandLineInput(state, event);
	}
	const actionId = state.prompt.slice("tool:".length);
	const form = createToolFormState(
		actionId,
		"",
		summary,
		state.value,
		state.fieldIndex ?? 0,
	);
	const selectedForm = selectToolFormField(form, state.fieldIndex ?? 0);
	const selectedField = selectedForm?.fields[selectedForm.selectedFieldIndex];
	if (!selectedForm || !selectedField) {
		return applyCommandLineInput(state, event);
	}
	const clearField = event.input === "\u0015";
	if (
		!event.backspace &&
		!clearField &&
		(event.input?.length !== 1 || event.input < " ")
	) {
		return state;
	}
	const touched = isCommandLineFieldTouched(state);
	const nextFieldValue = clearField
		? ""
		: event.backspace
			? selectedField.value.slice(0, -1)
			: touched
				? `${selectedField.value}${event.input}`
				: (event.input ?? "");
	const nextForm = updateToolFormFieldValue(selectedForm, nextFieldValue);
	return markCommandLineFieldTouched({
		...state,
		value: formatToolFormInputValue(nextForm, { preserveEmpty: true }),
		fieldIndex: nextForm?.selectedFieldIndex ?? state.fieldIndex,
	});
}

export type CommandLineTextInputTransition =
	| { kind: "no-op" }
	| {
			kind: "apply";
			commandLine: CommandLineState;
			clipboardConfirmation: ClipboardConfirmationState;
	  };

export function prepareCommandLineTextInput(input: {
	commandLine: CommandLineState;
	clipboardConfirmation: ClipboardConfirmationState;
	input: string;
	backspace?: boolean;
	tab?: boolean;
	summary?: NetworkSummary;
	applyToolInput?: (
		state: CommandLineState,
		event: CommandLineInput,
	) => CommandLineState;
}): CommandLineTextInputTransition {
	const mode = getCommandPromptInputMode(input.commandLine.prompt);
	if (!mode) return { kind: "no-op" };
	if (mode === "tool-form" && (input.tab || input.input === "\u001B[Z")) {
		const actionId = input.commandLine.prompt.slice("tool:".length);
		const metadata = getToolRunActionMetadata(actionId);
		const form = createToolFormState(
			actionId,
			metadata?.defaultTarget ?? "",
			input.summary,
			input.commandLine.value,
			input.commandLine.fieldIndex ?? 0,
		);
		return {
			kind: "apply",
			commandLine: moveCommandLineField(
				input.commandLine,
				form?.fields.length ?? 0,
				input.input === "\u001B[Z" ? "previous" : "next",
			),
			clipboardConfirmation: input.clipboardConfirmation,
		};
	}
	const applyToolInput =
		input.applyToolInput ??
		((state: CommandLineState, event: CommandLineInput) =>
			applyToolPromptCommandLineInput(state, event, input.summary));
	const commandLine =
		mode === "tool-form"
			? applyToolInput(input.commandLine, {
					input: input.input,
					backspace: input.backspace,
				})
			: applyCommandLineInput(input.commandLine, {
					input: input.input,
					backspace: input.backspace,
				});
	const clipboardConfirmation =
		mode === "clipboard-confirmation"
			? input.backspace
				? backspaceClipboardConfirmationInput(input.clipboardConfirmation)
				: appendClipboardConfirmationInput(
						input.clipboardConfirmation,
						input.input,
					)
			: input.clipboardConfirmation;
	return { kind: "apply", commandLine, clipboardConfirmation };
}

function normalizeFieldIndexes(indexes: number[]): number[] {
	return Array.from(
		new Set(
			indexes
				.filter((index) => Number.isInteger(index) && index >= 0)
				.map((index) => Math.floor(index)),
		),
	).sort((left, right) => left - right);
}
