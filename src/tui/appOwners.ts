import type { ConsoleAuditExportPlan } from "../core/auditLog";
import {
	buildExternalOpenPlan,
	type ExternalOpenPlan,
} from "../core/externalOpen";
import { buildFileOpenPlan, type FileOpenPlan } from "../core/fileOpen";
import {
	nextInterfaceEvidenceSearchPreset,
	saveInterfaceEvidenceSearchPreset,
} from "../core/interfaceEvidencePreferences";
import type { NetworkSummary, SupportedPlatform } from "../core/types";
import {
	getSelectedUpdateReleaseHandoffLink,
	type UpdateReleaseHandoff,
} from "../core/updateCheck";
import {
	type CleanupHandoffHistory,
	type CleanupHandoffHistoryExportPlan,
	type CleanupHandoffHistoryExportScope,
	type CleanupJumpAudit,
	createCleanupHandoffActionPlan,
	createCleanupHandoffDismissPlan,
	createCleanupHandoffHistoryExportPlan,
} from "./cleanupIndex";
import {
	type ClipboardConfirmationState,
	createClipboardConfirmationState,
} from "./clipboardDialog";
import {
	type ClipboardPreview,
	createClipboardPreview,
} from "./clipboardPreview";
import type { EditorBuffer } from "./editorBuffer";
import { clampIndex, type Screen } from "./navigation";
import {
	createInterfaceEvidenceManagementStatusActivityResult,
	createStatusActivityResultHistoryFilterPaletteResult,
	createStatusActivityResultTimelineJumpPaletteResult,
	createStatusActivityResultTimelineSearch,
	filterStatusActivityResultHistoryIndexes,
	getStatusActivityResultHistoryFilteredSelection,
	getStatusActivityResultTimelineJumpSelection,
	moveStatusActivityResultTimelineJumpSelection,
	nextStatusActivityResultHistoryFilter,
	nextStatusActivityResultTimelineJumpFilter,
	type StatusActivityResult,
	type StatusActivityResultHistoryFilter,
	type StatusActivityResultTimelineJumpFilter,
} from "./statusActivityQueue";
import {
	filterInterfaceConfirmationEvidenceExports,
	type InterfaceEvidenceStateFilter,
	nextInterfaceEvidenceStateFilter,
} from "./statusEvidence";
import {
	createToolFormState,
	createToolRunPlan,
	createToolRunPlanFromForm,
	filterToolHistory,
	filterToolHistoryExportIndex,
	nextToolHistoryEvidenceFilter,
	normalizeToolHistoryEvidenceQuery,
	submitToolHistoryCleanupConfirmation,
	type ToolHistoryEvidenceFilter,
	type ToolHistoryExportIndex,
	type ToolHistoryItem,
	type ToolRunPlan,
} from "./toolHistory";

export type AppOwnerNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

function formatAppOwnerError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export type AppIoFailureOperation =
	| "config save"
	| "config policy"
	| "config reset"
	| "pending SFTP session close"
	| "SFTP session close"
	| "previous SFTP session close"
	| "editor save"
	| "tool history filter cleanup"
	| "tool target label save"
	| "tool target value save"
	| "tool target action save"
	| "tool target action cleanup"
	| "tool target preset save"
	| "route filter cleanup"
	| `${"connections" | "ports"} filter cleanup`
	| "logs preset save"
	| "logs cleanup save"
	| "remote profile save"
	| `${"connections" | "ports"} preset save`
	| `${"connections" | "ports"} sort save`
	| "status result jump filter persistence"
	| "remote known_hosts evidence handoff export";

export function formatAppIoFailureMessage(
	operation: AppIoFailureOperation,
	error: unknown,
): string {
	return `${operation} failed ${formatAppOwnerError(error)}`;
}

export function formatToolsInputFailureMessage(
	prefix: string,
	error: unknown,
): string {
	return `${prefix ? `${prefix} ` : ""}${formatAppOwnerError(error)}`;
}

export type AppIoCompletion =
	| { kind: "file-operation"; operation: string; status: string; path: string }
	| {
			kind: "external-open";
			label: string;
			confirmed: boolean;
			adapter: string;
	  }
	| { kind: "file-open"; label: string; confirmed: boolean; adapter: string }
	| { kind: "tools-export"; scope: string; itemCount: number; path: string }
	| { kind: "routes-export"; view: string; path: string }
	| { kind: "interfaces-export"; path: string }
	| { kind: "file-open-confirmation"; label: string }
	| {
			kind: "endpoint-export";
			endpoint: "connections" | "ports";
			view: string;
			path: string;
	  }
	| { kind: "remote-context"; label: string }
	| { kind: "remote-known-hosts-export"; path: string; eventCount: number };

export function formatAppIoCompletionMessage(input: AppIoCompletion): string {
	switch (input.kind) {
		case "file-operation":
			return `file operation ${input.operation} status=${input.status} path=${input.path}`;
		case "external-open":
			return `external open ${input.label} confirmed=${input.confirmed} adapter=${input.adapter}`;
		case "file-open":
			return `file open ${input.label} confirmed=${input.confirmed} adapter=${input.adapter}`;
		case "tools-export":
			return `tools exported ${input.scope} ${input.itemCount} run(s) ${input.path}`;
		case "routes-export":
			return `routes exported ${input.view} ${input.path}`;
		case "interfaces-export":
			return `interfaces exported source ${input.path}`;
		case "file-open-confirmation":
			return `file open confirmation opened for ${input.label}`;
		case "endpoint-export":
			return `${input.endpoint} exported ${input.view} ${input.path}`;
		case "remote-context":
			return `remote context selected ${input.label}`;
		case "remote-known-hosts-export":
			return `remote known_hosts evidence handoff exported ${input.path} events=${input.eventCount}`;
	}
}

export function classifyToolCommandRunOutcome(input: {
	label: string;
	outcome: { kind: "success" } | { kind: "failure"; error: unknown };
}): AppOwnerNotice {
	return input.outcome.kind === "success"
		? { level: "ok", message: `${input.label} completed` }
		: { level: "fail", message: formatAppOwnerError(input.outcome.error) };
}

export function classifyInterfaceEvidencePresetPersistenceFailure(
	error: unknown,
): AppOwnerNotice {
	return { level: "fail", message: formatAppOwnerError(error) };
}

export function prepareRouteDestinationSubmission(value: string):
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: AppOwnerNotice;
	  }
	| {
			kind: "run";
			closeCommandLine: true;
			destination: string;
	  } {
	const destination = value.trim();
	return destination
		? { kind: "run", closeCommandLine: true, destination }
		: {
				kind: "notice",
				closeCommandLine: true,
				notice: { level: "info", message: "route path command cancelled" },
			};
}

export function prepareToolCommandSubmission(input: {
	prompt: string;
	value: string;
	fieldIndex?: number;
	defaultPingHost: string;
	summary?: NetworkSummary;
}):
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: AppOwnerNotice;
	  }
	| {
			kind: "run";
			closeCommandLine: true;
			plan: ToolRunPlan;
	  } {
	const actionId = input.prompt.startsWith("tool:")
		? input.prompt.slice("tool:".length)
		: input.prompt;
	const form = createToolFormState(
		actionId,
		input.defaultPingHost,
		input.summary,
		input.value,
		input.fieldIndex ?? 0,
	);
	const plan =
		createToolRunPlanFromForm(form) ??
		createToolRunPlan(
			actionId,
			input.defaultPingHost,
			input.summary,
			input.value,
		);
	return plan
		? { kind: "run", closeCommandLine: true, plan }
		: {
				kind: "notice",
				closeCommandLine: true,
				notice: { level: "warn", message: `unknown tool action ${actionId}` },
			};
}

export function prepareEditorSaveSubmission(input: {
	editorPreview: EditorBuffer | undefined;
	confirmation: string;
}):
	| {
			kind: "notice";
			closeCommandLine: true;
			notice: AppOwnerNotice;
	  }
	| {
			kind: "execute";
			closeCommandLine: true;
			editorPreview: EditorBuffer;
	  } {
	if (!input.editorPreview) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "open a text file before saving" },
		};
	}
	if (input.confirmation !== "save file") {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "editor save confirmation rejected" },
		};
	}
	return {
		kind: "execute",
		closeCommandLine: true,
		editorPreview: input.editorPreview,
	};
}

export type EditorPromptCommand =
	| "append"
	| "insert-before"
	| "insert-after"
	| "replace"
	| "save";

export function prepareEditorPromptOpen(input: {
	command: EditorPromptCommand;
	editorPreview: EditorBuffer | undefined;
	selectedLineIndex: number;
}):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "open";
			prompt:
				| "editor-append"
				| "editor-insert-before"
				| "editor-insert-after"
				| "editor-replace"
				| "editor-save";
			notice: AppOwnerNotice;
	  } {
	if (input.command !== "append" && !input.editorPreview) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message:
					input.command === "save"
						? "open a text file before saving"
						: input.command === "replace"
							? "open a text file before replacing lines"
							: "open a text file before inserting lines",
			},
		};
	}
	const line = input.selectedLineIndex + 1;
	switch (input.command) {
		case "append":
			return {
				kind: "open",
				prompt: "editor-append",
				notice: { level: "info", message: "editor append prompt opened" },
			};
		case "insert-before":
			return {
				kind: "open",
				prompt: "editor-insert-before",
				notice: { level: "info", message: `editor insert before line ${line}` },
			};
		case "insert-after":
			return {
				kind: "open",
				prompt: "editor-insert-after",
				notice: { level: "info", message: `editor insert after line ${line}` },
			};
		case "replace":
			return {
				kind: "open",
				prompt: "editor-replace",
				notice: {
					level: "info",
					message: `editor replace line ${line} opened`,
				},
			};
		case "save":
			return {
				kind: "open",
				prompt: "editor-save",
				notice: {
					level: "info",
					message: "editor save confirmation opened",
				},
			};
	}
}

export function prepareToolHistoryFilterSubmission(input: {
	history: ToolHistoryItem[];
	value: string;
}): {
	closeCommandLine: true;
	filter: string;
	selectedIndex: number;
	copyPreview: false;
	persistPreset: boolean;
	notice: AppOwnerNotice;
} {
	const filter = input.value.trim();
	const filtered = filterToolHistory(input.history, filter);
	return {
		closeCommandLine: true,
		filter,
		selectedIndex: filtered[0]?.index ?? 0,
		copyPreview: false,
		persistPreset: Boolean(filter),
		notice: {
			level: filtered.length || !filter ? "info" : "warn",
			message: filter
				? `tools filter ${filter} matches ${filtered.length}`
				: "tools filter cleared",
		},
	};
}

export function prepareToolHistoryCleanupSubmission(
	presets: string[],
	confirmation: string,
):
	| {
			kind: "notice";
			closeCommandLine: true;
			copyPreview: false;
			notice: AppOwnerNotice;
	  }
	| {
			kind: "apply";
			closeCommandLine: true;
			copyPreview: false;
			presets: string[];
			notice: AppOwnerNotice;
	  } {
	const result = submitToolHistoryCleanupConfirmation(presets, confirmation);
	return result.confirmed
		? {
				kind: "apply",
				closeCommandLine: true,
				copyPreview: false,
				presets: result.presets,
				notice: { level: "info", message: result.message },
			}
		: {
				kind: "notice",
				closeCommandLine: true,
				copyPreview: false,
				notice: { level: "warn", message: result.message },
			};
}

export function prepareClipboardConfirmationOpen(
	preview: ClipboardPreview | undefined,
):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "open";
			state: ClipboardConfirmationState;
			prompt: "clipboard";
			notice: AppOwnerNotice;
	  } {
	return preview
		? {
				kind: "open",
				state: createClipboardConfirmationState(preview),
				prompt: "clipboard",
				notice: {
					level: "info",
					message: `clipboard confirmation opened for ${preview.label}`,
				},
			}
		: {
				kind: "notice",
				notice: { level: "warn", message: "no clipboard value selected" },
			};
}

export function prepareSelectedUpdateHandoffClipboard(
	handoff: UpdateReleaseHandoff | undefined,
	selectedIndex: number,
):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "copy";
			prompt: "clipboard";
			preview: ClipboardPreview;
			notice: AppOwnerNotice;
	  } {
	if (!handoff) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no update handoff link selected" },
		};
	}
	const link = getSelectedUpdateReleaseHandoffLink(handoff, selectedIndex);
	return {
		kind: "copy",
		prompt: "clipboard",
		preview: createClipboardPreview({
			source: "update-handoff",
			label: link.label,
			copyText: link.url,
		}),
		notice: {
			level: "info",
			message: `clipboard confirmation opened for ${link.label}`,
		},
	};
}

export function prepareSelectedUpdateHandoffExternalOpen(
	handoff: UpdateReleaseHandoff | undefined,
	selectedIndex: number,
	platform: SupportedPlatform,
):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "open";
			prompt: "external-open";
			plan: ExternalOpenPlan;
			notice: AppOwnerNotice;
	  } {
	if (!handoff) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no update handoff link selected" },
		};
	}
	const link = getSelectedUpdateReleaseHandoffLink(handoff, selectedIndex);
	return {
		kind: "open",
		prompt: "external-open",
		plan: buildExternalOpenPlan({
			source: "update-handoff",
			label: link.label,
			url: link.url,
			platform,
		}),
		notice: {
			level: "info",
			message: `external open confirmation opened for ${link.label}`,
		},
	};
}

export function prepareExternalOpenSubmission(
	plan: ExternalOpenPlan | undefined,
	confirmation: string,
	platform: SupportedPlatform,
):
	| { kind: "notice"; closeCommandLine: true; notice: AppOwnerNotice }
	| { kind: "execute"; closeCommandLine: true; plan: ExternalOpenPlan } {
	if (!plan) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "external open missing preview" },
		};
	}
	return {
		kind: "execute",
		closeCommandLine: true,
		plan: buildExternalOpenPlan({
			source: plan.source,
			label: plan.label,
			url: plan.url,
			platform,
			confirmation,
		}),
	};
}

export function prepareFileOpenSubmission(
	plan: FileOpenPlan | undefined,
	confirmation: string,
	baseDir: string,
	platform: SupportedPlatform,
):
	| { kind: "notice"; closeCommandLine: true; notice: AppOwnerNotice }
	| { kind: "execute"; closeCommandLine: true; plan: FileOpenPlan } {
	if (!plan) {
		return {
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "file open missing preview" },
		};
	}
	return {
		kind: "execute",
		closeCommandLine: true,
		plan: buildFileOpenPlan({
			baseDir,
			source: plan.source,
			label: plan.label,
			origin: plan.origin,
			path: plan.path,
			platform,
			confirmation,
		}),
	};
}

export function prepareToolEvidenceFilterCycle(input: {
	origin?: "keyboard" | "palette";
	selectedKind: "tools" | "tools-archive";
	filter: ToolHistoryEvidenceFilter;
}): {
	target: "active" | "archive";
	filter: ToolHistoryEvidenceFilter;
	selectedIndex: 0;
	selectedKind: "tools" | "tools-archive";
	notice: AppOwnerNotice;
} {
	const target = input.selectedKind === "tools-archive" ? "archive" : "active";
	const filter = nextToolHistoryEvidenceFilter(input.filter);
	return {
		target,
		filter,
		selectedIndex: 0,
		selectedKind: target === "archive" ? "tools-archive" : "tools",
		notice: {
			level: "info",
			message: `tools ${target === "archive" ? "archive " : ""}evidence filter ${filter}${input.origin === "palette" ? " via palette" : ""}`,
		},
	};
}

export function prepareToolEvidenceSearchPrompt(
	selectedKind: "tools" | "tools-archive",
	origin?: "keyboard" | "palette",
): {
	prompt: "tools-evidence-search";
	selectedKind: "tools" | "tools-archive";
	screen: "status";
	focusArea: "workspaces";
	notice: AppOwnerNotice;
} {
	const target = selectedKind === "tools-archive" ? "archive" : "active";
	return {
		prompt: "tools-evidence-search",
		selectedKind,
		screen: "status",
		focusArea: "workspaces",
		notice: {
			level: "info",
			message: `tools ${target} evidence search prompt opened${origin === "palette" ? " via palette" : ""}`,
		},
	};
}

export function prepareToolEvidenceSearchSubmission(input: {
	value: string;
	selectedKind: "tools" | "tools-archive";
	activeIndex: ToolHistoryExportIndex;
	activeFilter: ToolHistoryEvidenceFilter;
	archiveIndex: ToolHistoryExportIndex;
	archiveFilter: ToolHistoryEvidenceFilter;
}): {
	target: "active" | "archive";
	query: string;
	selectedIndex: 0;
	selectedKind: "tools" | "tools-archive";
	closeCommandLine: true;
	notice: AppOwnerNotice;
	result: StatusActivityResult;
} {
	const query = normalizeToolHistoryEvidenceQuery(input.value);
	const target = input.selectedKind === "tools-archive" ? "archive" : "active";
	const total =
		target === "archive"
			? input.archiveIndex.items.length
			: input.activeIndex.items.length;
	const visible =
		target === "archive"
			? filterToolHistoryExportIndex(
					input.archiveIndex,
					input.archiveFilter,
					query,
				).items.length
			: filterToolHistoryExportIndex(
					input.activeIndex,
					input.activeFilter,
					query,
				).items.length;
	return {
		target,
		query,
		selectedIndex: 0,
		selectedKind: target === "archive" ? "tools-archive" : "tools",
		closeCommandLine: true,
		notice: {
			level: "info",
			message: `tools ${target} evidence search ${query ? `query=${query}` : "cleared"}`,
		},
		result: {
			source: "evidence",
			action: "tools-evidence-search",
			message: `palette tools evidence search ${target} ${query ? `query=${query}` : "cleared"} visible=${visible}/${total}`,
			detail: `target=${target} query=${query}`,
		},
	};
}

export function prepareInterfaceEvidenceStateFilterCycle(input: {
	origin?: "keyboard" | "palette";
	state: InterfaceEvidenceStateFilter;
	query: string;
	activeExports: ConsoleAuditExportPlan[];
	archivedExports: ConsoleAuditExportPlan[];
}): {
	state: InterfaceEvidenceStateFilter;
	selectedIndex: 0;
	selectedKind: "interface";
	screen: "status";
	focusArea: "workspaces";
	notice: AppOwnerNotice;
	result: StatusActivityResult;
} {
	const state = nextInterfaceEvidenceStateFilter(input.state);
	const visible = filterInterfaceConfirmationEvidenceExports(
		input.activeExports,
		input.archivedExports,
		state,
		input.query,
	).length;
	const total = input.activeExports.length + input.archivedExports.length;
	return {
		state,
		selectedIndex: 0,
		selectedKind: "interface",
		screen: "status",
		focusArea: "workspaces",
		notice: {
			level: "info",
			message: `interface evidence filter ${state} visible=${visible}/${total}${input.origin === "palette" ? " via palette" : ""}`,
		},
		result: createInterfaceEvidenceManagementStatusActivityResult("filter", {
			state,
			query: input.query,
			visible,
			total,
		}),
	};
}

export function prepareInterfaceEvidenceSearchPrompt(
	query: string,
	origin?: "keyboard" | "palette",
): {
	prompt: "interface-evidence-search";
	value: string;
	selectedKind: "interface";
	screen: "status";
	focusArea: "workspaces";
	notice: AppOwnerNotice;
} {
	return {
		prompt: "interface-evidence-search",
		value: query,
		selectedKind: "interface",
		screen: "status",
		focusArea: "workspaces",
		notice: {
			level: "info",
			message: `interface evidence search prompt opened${origin === "palette" ? " via palette" : ""}`,
		},
	};
}

export function prepareInterfaceEvidenceSearchSubmission(input: {
	value: string;
	state: InterfaceEvidenceStateFilter;
	activeExports: ConsoleAuditExportPlan[];
	archivedExports: ConsoleAuditExportPlan[];
}): {
	query: string;
	selectedIndex: 0;
	selectedKind: "interface";
	closeCommandLine: true;
	notice: AppOwnerNotice;
	result: StatusActivityResult;
} {
	const query = input.value.trim();
	const visible = filterInterfaceConfirmationEvidenceExports(
		input.activeExports,
		input.archivedExports,
		input.state,
		query,
	).length;
	const total = input.activeExports.length + input.archivedExports.length;
	return {
		query,
		selectedIndex: 0,
		selectedKind: "interface",
		closeCommandLine: true,
		notice: {
			level: visible > 0 || !query ? "info" : "warn",
			message: `interface evidence find ${query ? `query=${query}` : "cleared"} visible=${visible}/${total}`,
		},
		result: createInterfaceEvidenceManagementStatusActivityResult("find", {
			state: input.state,
			query,
			visible,
			total,
		}),
	};
}

export function prepareInterfaceEvidencePresetSave(
	query: string,
	presets: string[],
	origin?: "keyboard" | "palette",
):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "save";
			presets: string[];
			notice: AppOwnerNotice;
	  } {
	const normalized = query.trim();
	if (!normalized) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no interface evidence query to save" },
		};
	}
	const next = saveInterfaceEvidenceSearchPreset(presets, normalized);
	return {
		kind: "save",
		presets: next,
		notice: {
			level: "ok",
			message: `interface evidence search preset saved ${normalized} count=${next.length}${origin === "palette" ? " via palette" : ""}`,
		},
	};
}

export function prepareInterfaceEvidencePresetCycle(input: {
	query: string;
	presets: string[];
	state: InterfaceEvidenceStateFilter;
	activeExports: ConsoleAuditExportPlan[];
	archivedExports: ConsoleAuditExportPlan[];
	origin?: "keyboard" | "palette";
}):
	| { kind: "notice"; notice: AppOwnerNotice }
	| {
			kind: "apply";
			query: string;
			selectedIndex: 0;
			selectedKind: "interface";
			screen: "status";
			focusArea: "workspaces";
			notice: AppOwnerNotice;
			result: StatusActivityResult;
	  } {
	const query = nextInterfaceEvidenceSearchPreset(input.presets, input.query);
	if (!query) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "no interface evidence search presets",
			},
		};
	}
	const visible = filterInterfaceConfirmationEvidenceExports(
		input.activeExports,
		input.archivedExports,
		input.state,
		query,
	).length;
	const total = input.activeExports.length + input.archivedExports.length;
	return {
		kind: "apply",
		query,
		selectedIndex: 0,
		selectedKind: "interface",
		screen: "status",
		focusArea: "workspaces",
		notice: {
			level: visible > 0 ? "info" : "warn",
			message: `interface evidence search preset ${query} visible=${visible}/${total}${input.origin === "palette" ? " via palette" : ""}`,
		},
		result: createInterfaceEvidenceManagementStatusActivityResult("find", {
			state: input.state,
			query,
			visible,
			total,
		}),
	};
}

export function prepareStatusActivityResultHistoryFilterCycle(
	history: StatusActivityResult[],
	filter: StatusActivityResultHistoryFilter,
	origin?: "keyboard" | "palette",
): {
	filter: StatusActivityResultHistoryFilter;
	selectedIndex: number;
	selectedCopyPreviewRowIndex: 0;
	copyPreviewExpanded: false;
	screen?: "status";
	focusArea?: "workspaces";
	result?: StatusActivityResult;
	notice: AppOwnerNotice;
} {
	const next = nextStatusActivityResultHistoryFilter(filter);
	const visible =
		next === "all"
			? history.length + 1
			: filterStatusActivityResultHistoryIndexes(history, next).length;
	return {
		filter: next,
		selectedIndex: getStatusActivityResultHistoryFilteredSelection(
			history,
			0,
			next,
		),
		selectedCopyPreviewRowIndex: 0,
		copyPreviewExpanded: false,
		...(origin === "palette"
			? {
					screen: "status" as const,
					focusArea: "workspaces" as const,
					result: createStatusActivityResultHistoryFilterPaletteResult(next, {
						total: history.length + 1,
						visible,
					}),
				}
			: {}),
		notice: {
			level: "info",
			message: `status activity result history filter ${next}${origin === "palette" ? " origin=palette" : ""}`,
		},
	};
}

export function prepareStatusActivityResultTimelineJumpFilterCycle(
	history: StatusActivityResult[],
	filter: StatusActivityResultTimelineJumpFilter,
	origin?: "keyboard" | "palette",
): {
	filter: StatusActivityResultTimelineJumpFilter;
	selectedIndex: number;
	screen?: "status";
	focusArea?: "workspaces";
	notice: AppOwnerNotice;
} {
	const next = nextStatusActivityResultTimelineJumpFilter(filter);
	return {
		filter: next,
		selectedIndex: moveStatusActivityResultTimelineJumpSelection(
			history,
			0,
			"next",
			next,
		),
		...(origin === "palette"
			? {
					screen: "status" as const,
					focusArea: "workspaces" as const,
				}
			: {}),
		notice: {
			level: "info",
			message: `status activity timeline result jump filter ${next}${origin === "palette" ? " origin=palette" : ""}`,
		},
	};
}

export function resolveRecoveredEvidenceResultOptions(
	selectedIndex: number,
	total: number,
): { selectedIndex: number; total: number } {
	return {
		selectedIndex: clampIndex(selectedIndex, total),
		total: Math.max(1, total),
	};
}

export function prepareStatusActivityResultTimelineJumpSelection(input: {
	history: StatusActivityResult[];
	selectedIndex: number;
	filter: StatusActivityResultTimelineJumpFilter;
	origin?: "keyboard" | "palette";
}):
	| {
			kind: "notice";
			screen?: "status";
			focusArea?: "workspaces";
			notice: AppOwnerNotice;
			result?: StatusActivityResult;
	  }
	| {
			kind: "select";
			screen?: "status";
			focusArea?: "workspaces";
			selectedIndex: number;
			notice: AppOwnerNotice;
			result?: StatusActivityResult;
	  } {
	if (input.history.length === 0) {
		return {
			kind: "notice",
			...(input.origin === "palette"
				? {
						screen: "status" as const,
						focusArea: "workspaces" as const,
						result:
							createStatusActivityResultTimelineJumpPaletteResult("select"),
					}
				: {}),
			notice: { level: "warn", message: "no status activity result history" },
		};
	}
	const selectedIndex = moveStatusActivityResultTimelineJumpSelection(
		input.history,
		input.selectedIndex,
		"next",
		input.filter,
	);
	const jump = createStatusActivityResultTimelineSearch(
		input.history,
		selectedIndex,
	);
	if (!jump) {
		return {
			kind: "notice",
			...(input.origin === "palette"
				? {
						screen: "status" as const,
						focusArea: "workspaces" as const,
						result:
							createStatusActivityResultTimelineJumpPaletteResult("select"),
					}
				: {}),
			notice: {
				level: "warn",
				message: "no status activity timeline result jumps",
			},
		};
	}
	const selection = getStatusActivityResultTimelineJumpSelection(
		input.history,
		selectedIndex,
		input.filter,
	);
	return {
		kind: "select",
		...(input.origin === "palette"
			? {
					screen: "status" as const,
					focusArea: "workspaces" as const,
					result: createStatusActivityResultTimelineJumpPaletteResult(
						"select",
						{
							historyIndex: selectedIndex,
							jump,
							selectedIndex: selection?.selectedIndex,
							total: selection?.total,
						},
					),
				}
			: {}),
		selectedIndex,
		notice: {
			level: "info",
			message: `status activity timeline result jump ${selectedIndex + 1}${input.origin === "palette" ? " origin=palette" : ""}`,
		},
	};
}

export function prepareCleanupHandoffPrompt(
	audit: CleanupJumpAudit | undefined,
	screen: Screen,
):
	| { kind: "no-op" }
	| {
			kind: "open";
			prompt: string;
			selectedHistoryIndex: 0;
			notice: AppOwnerNotice;
	  } {
	const plan = createCleanupHandoffActionPlan(audit, screen);
	if (!plan) {
		return { kind: "no-op" };
	}
	return {
		kind: "open",
		prompt: getCleanupHandoffPrompt(plan.id),
		selectedHistoryIndex: 0,
		notice: {
			level: "info",
			message: `cleanup handoff prompt opened ${plan.label}; type ${plan.confirmationPhrase}`,
		},
	};
}

export function prepareCleanupHandoffDismissal(
	audit: CleanupJumpAudit | undefined,
	screen: Screen,
):
	| { kind: "no-op" }
	| {
			kind: "dismiss";
			selectedHistoryIndex: 0;
			notice: AppOwnerNotice;
	  } {
	const plan = createCleanupHandoffDismissPlan(audit, screen);
	if (!plan) {
		return { kind: "no-op" };
	}
	return {
		kind: "dismiss",
		selectedHistoryIndex: 0,
		notice: {
			level: "info",
			message: `cleanup handoff dismissed ${plan.label}; normal ${plan.workspace} controls restored`,
		},
	};
}

export function prepareCleanupHandoffExport(
	history: CleanupHandoffHistory[],
	selectedIndex: number,
	options: {
		baseDir: string;
		scope: CleanupHandoffHistoryExportScope;
		origin?: Parameters<
			typeof createCleanupHandoffHistoryExportPlan
		>[2]["origin"];
	},
):
	| { kind: "notice"; notice: AppOwnerNotice }
	| { kind: "export"; plan: CleanupHandoffHistoryExportPlan } {
	const plan = createCleanupHandoffHistoryExportPlan(
		history,
		selectedIndex,
		options,
	);
	return plan
		? { kind: "export", plan }
		: {
				kind: "notice",
				notice: {
					level: "warn",
					message: "no cleanup handoff history to export",
				},
			};
}

function getCleanupHandoffPrompt(
	id:
		| "logs"
		| "routes"
		| "connections"
		| "ports"
		| "timeline"
		| "tools-history"
		| "tool-targets",
): string {
	switch (id) {
		case "logs":
			return "logs-cleanup";
		case "routes":
			return "route-filter-cleanup";
		case "connections":
			return "endpoint-filter-cleanup:connections";
		case "ports":
			return "endpoint-filter-cleanup:ports";
		case "timeline":
			return "timeline-search-cleanup";
		case "tools-history":
			return "tool-history-cleanup";
		case "tool-targets":
			return "tool-target-cleanup";
	}
}
