import type { PicosAction } from "../core/actions";
import type { NetworkSummary, SftpRemoteProfile } from "../core/types";
import type { PackageUpdateCheckResult } from "../core/updateCheck";
import {
	type ActionControlConfirmation,
	prepareControlConfirmationPrompt,
	prepareControlExecutionStart,
} from "./actionControlTransitions";
import { type EditorBuffer, transitionEditorMoveCursor } from "./editorBuffer";
import {
	type InterfaceSelectionTransition,
	prepareInterfaceSelectionTransition,
} from "./interfacePanel";
import {
	clampIndex,
	type FocusArea,
	getNextIndex,
	getScreenByShortcut,
	leaveFocus,
	moveScreen,
	type Screen,
} from "./navigation";
import {
	moveRemoteProfileSelection,
	prepareRemoteProfileStage,
	type RemoteProfileStageTransition,
} from "./remotesPanel";
import {
	moveFilteredToolHistorySelection,
	moveToolHistorySelection,
	type ToolHistoryItem,
	type ToolHistorySort,
} from "./toolHistory";

export type AppInputKey = {
	escape?: boolean;
	return?: boolean;
	backspace?: boolean;
	delete?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	rightArrow?: boolean;
	home?: boolean;
	end?: boolean;
	tab?: boolean;
};

export type AppInputOverlay =
	| "command-line"
	| "palette"
	| "file-operation-dialog"
	| "file-filter";

export function getAppInputOverlay(input: {
	commandLineActive: boolean;
	paletteActive: boolean;
	fileOperationDialogActive: boolean;
	fileFilterActive: boolean;
}): AppInputOverlay | undefined {
	if (input.commandLineActive) return "command-line";
	if (input.paletteActive) return "palette";
	if (input.fileOperationDialogActive) return "file-operation-dialog";
	if (input.fileFilterActive) return "file-filter";
	return undefined;
}

export type WorkspaceInputFamily =
	| "files"
	| "processes"
	| "operations"
	| "editor"
	| "routes"
	| "interfaces"
	| "endpoints"
	| "status"
	| "config"
	| "timeline"
	| "logs"
	| "tools"
	| "dns"
	| "actions-workspace"
	| "actions-focus"
	| "remotes-workspace"
	| "remotes-focus"
	| "global";

const workspaceFamilies = {
	files: "files",
	processes: "processes",
	operations: "operations",
	editor: "editor",
	routes: "routes",
	interfaces: "interfaces",
	connections: "endpoints",
	ports: "endpoints",
	status: "status",
	config: "config",
	timeline: "timeline",
	logs: "logs",
	tools: "tools",
	dns: "dns",
	actions: "actions-workspace",
	remotes: "remotes-workspace",
} as const satisfies Partial<Record<Screen, WorkspaceInputFamily>>;

export function getWorkspaceInputFamily(
	screen: Screen,
	focusArea: FocusArea,
): WorkspaceInputFamily {
	if (focusArea === "actions") return "actions-focus";
	if (focusArea === "remotes") return "remotes-focus";
	if (focusArea === "files") return "files";
	if (focusArea !== "workspaces") return "global";
	return (
		workspaceFamilies[screen as keyof typeof workspaceFamilies] ?? "global"
	);
}

export type EditorWorkspaceCommand =
	| "append"
	| "insert-before"
	| "insert-after"
	| "replace"
	| "delete"
	| "undo"
	| "save";

const editorCommands = {
	a: "append",
	i: "insert-before",
	o: "insert-after",
	r: "replace",
	x: "delete",
	u: "undo",
	s: "save",
} as const satisfies Record<string, EditorWorkspaceCommand>;

export function getEditorWorkspaceCommand(
	input: string,
): EditorWorkspaceCommand | undefined {
	return editorCommands[input as keyof typeof editorCommands];
}

export type StatusWorkspaceCommand =
	| "cycle-evidence-filter"
	| "cycle-update-link"
	| "move-activity-previous"
	| "move-activity-next"
	| "move-result-history-previous"
	| "move-result-history-next"
	| "filter-or-interface-search"
	| "cycle-result-timeline-filter"
	| "move-copy-preview-row"
	| "toggle-copy-preview"
	| "open-interface-or-result-timeline"
	| "copy-result"
	| "move-copy-intent-previous"
	| "move-copy-intent-next"
	| "save-interface-preset-or-move-audit-jump"
	| "select-remote-known-hosts-handoff"
	| "select-result-timeline-jump"
	| "jump-copy-intent-timeline"
	| "jump-evidence-search"
	| "open-tools-or-replay-warning"
	| "cycle-interface-preset-or-search-trail"
	| "select-timeline-trail-export"
	| "cycle-timeline-trail-source"
	| "select-process-export"
	| "replay-copy-intent"
	| "export-copy-intent"
	| "open-last-copy-export"
	| "open-timeline-trail-export"
	| "focus-last-copy-export"
	| "number-evidence-focus"
	| "move-evidence-previous"
	| "move-evidence-next"
	| "cycle-evidence-focus"
	| "move-cleanup-next"
	| "move-cleanup-previous"
	| "reopen-cleanup-or-open-remote-export"
	| "export-cleanup-history"
	| "enter-activity"
	| "archive-evidence"
	| "preview-retention"
	| "refresh-cleanup"
	| "refresh-audit"
	| "refresh-audit-archive"
	| "refresh-cleanup-archive"
	| "open-tools-archive"
	| "move-cleanup-export"
	| "move-audit-export"
	| "move-audit-archive"
	| "move-cleanup-archive"
	| "open-cleanup-export"
	| "open-audit-export"
	| "preview-selected-retention"
	| "archive-selected-audit"
	| "archive-selected-cleanup"
	| "open-handoff"
	| "archive-handoff-or-interface"
	| "copy-update-link"
	| "open-update-link";

const statusCommands = {
	q: "cycle-evidence-filter",
	n: "cycle-update-link",
	",": "move-activity-previous",
	".": "move-activity-next",
	u: "move-result-history-previous",
	i: "move-result-history-next",
	f: "filter-or-interface-search",
	"^": "cycle-result-timeline-filter",
	";": "move-copy-preview-row",
	"=": "toggle-copy-preview",
	I: "open-interface-or-result-timeline",
	y: "copy-result",
	"<": "move-copy-intent-previous",
	">": "move-copy-intent-next",
	P: "save-interface-preset-or-move-audit-jump",
	H: "select-remote-known-hosts-handoff",
	J: "select-result-timeline-jump",
	g: "jump-copy-intent-timeline",
	G: "jump-evidence-search",
	K: "open-tools-or-replay-warning",
	N: "cycle-interface-preset-or-search-trail",
	S: "select-timeline-trail-export",
	Q: "cycle-timeline-trail-source",
	F: "select-process-export",
	v: "replay-copy-intent",
	e: "export-copy-intent",
	z: "open-last-copy-export",
	L: "open-timeline-trail-export",
	w: "focus-last-copy-export",
	"[": "move-evidence-previous",
	"]": "move-evidence-next",
	R: "reopen-cleanup-or-open-remote-export",
	E: "export-cleanup-history",
	"\r": "enter-activity",
	a: "archive-evidence",
	x: "archive-evidence",
	m: "preview-retention",
	Y: "refresh-cleanup",
	T: "refresh-audit",
	U: "refresh-audit-archive",
	B: "refresh-cleanup-archive",
	D: "open-tools-archive",
	"}": "move-cleanup-export",
	")": "move-audit-export",
	"(": "move-audit-archive",
	"{": "move-cleanup-archive",
	V: "open-cleanup-export",
	W: "open-audit-export",
	M: "preview-selected-retention",
	Z: "archive-selected-audit",
	X: "archive-selected-cleanup",
	O: "open-handoff",
	A: "archive-handoff-or-interface",
	c: "copy-update-link",
	o: "open-update-link",
} as const satisfies Record<string, StatusWorkspaceCommand>;

export function getStatusWorkspaceCommand(
	input: string,
	key: AppInputKey,
): StatusWorkspaceCommand | undefined {
	if (/^[1-9]$/.test(input)) return "number-evidence-focus";
	if (key.tab) return "cycle-evidence-focus";
	if (key.downArrow || input === "j") return "move-cleanup-next";
	if (key.upArrow || input === "k") return "move-cleanup-previous";
	return statusCommands[input as keyof typeof statusCommands];
}

export type ConfigWorkspaceCommand =
	| "jump-display"
	| "jump-safety"
	| "jump-retention"
	| "jump-connectivity"
	| "move-next"
	| "move-previous"
	| "increase"
	| "decrease"
	| "cycle-policy"
	| "reset"
	| "cycle-shelf-next"
	| "cycle-shelf-previous"
	| "enter";

export function getConfigWorkspaceCommand(
	input: string,
	key: AppInputKey,
): ConfigWorkspaceCommand | undefined {
	if (input === "1") return "jump-display";
	if (input === "2") return "jump-safety";
	if (input === "3") return "jump-retention";
	if (input === "4") return "jump-connectivity";
	if (key.downArrow || input === "j") return "move-next";
	if (key.upArrow || input === "k") return "move-previous";
	if (input === "+" || input === "=") return "increase";
	if (input === "-" || input === "_") return "decrease";
	if (input === "P") return "cycle-policy";
	if (input === "R") return "reset";
	if (input === "g") return "cycle-shelf-next";
	if (input === "G") return "cycle-shelf-previous";
	if (input === "\r" || key.return) return "enter";
	return undefined;
}

export type ToolsWorkspaceCommand =
	| "open-filter"
	| "clear-filter"
	| "save-filter"
	| "cleanup-filter"
	| "cycle-filter-preset"
	| "detail-shortcut"
	| "cycle-detail"
	| "cycle-sort"
	| "cycle-group"
	| "rerun"
	| "select-target-next"
	| "select-target-previous"
	| "save-target"
	| "promote-target"
	| "remove-target"
	| "prompt-target-cleanup"
	| "prompt-target-label"
	| "prompt-target-value"
	| "prompt-target-action"
	| "run-target"
	| "copy-raw"
	| "copy-summary"
	| "copy-compare"
	| "cycle-copy-section"
	| "move-copy-row-next"
	| "move-copy-row-previous"
	| "copy-row"
	| "copy-section"
	| "export-selected"
	| "export-all"
	| "export-compare";

const toolCommands = {
	f: "open-filter",
	F: "clear-filter",
	P: "save-filter",
	C: "cleanup-filter",
	"]": "cycle-filter-preset",
	s: "cycle-sort",
	G: "cycle-group",
	r: "rerun",
	n: "select-target-next",
	N: "select-target-previous",
	T: "save-target",
	U: "promote-target",
	X: "remove-target",
	D: "prompt-target-cleanup",
	L: "prompt-target-label",
	M: "prompt-target-value",
	A: "prompt-target-action",
	R: "run-target",
	c: "copy-raw",
	y: "copy-summary",
	o: "copy-compare",
	V: "cycle-copy-section",
	".": "move-copy-row-next",
	",": "move-copy-row-previous",
	b: "copy-row",
	v: "copy-section",
	e: "export-selected",
	E: "export-all",
	O: "export-compare",
} as const satisfies Record<string, ToolsWorkspaceCommand>;

export function getToolsWorkspaceCommand(
	input: string,
	key: AppInputKey,
): ToolsWorkspaceCommand | undefined {
	if (key.tab) return "cycle-detail";
	if (key.home || key.end || /^[1-4]$/.test(input)) return "detail-shortcut";
	return toolCommands[input as keyof typeof toolCommands];
}

export type RemotesFocusCommand =
	| "copy-history"
	| "export-history"
	| "cancel"
	| "retry"
	| "connect"
	| "host-key-evidence"
	| "known-hosts-candidate"
	| "known-hosts-paste"
	| "known-hosts-select"
	| "paste-next"
	| "paste-previous"
	| "paste-number"
	| "host-trust";

const remoteCommands = {
	y: "copy-history",
	E: "export-history",
	X: "cancel",
	R: "retry",
	c: "connect",
	e: "host-key-evidence",
	K: "known-hosts-candidate",
	P: "known-hosts-paste",
	S: "known-hosts-select",
	"]": "paste-next",
	"[": "paste-previous",
	t: "host-trust",
} as const satisfies Record<string, RemotesFocusCommand>;

export function getRemotesFocusCommand(
	input: string,
): RemotesFocusCommand | undefined {
	if (/^[1-9]$/.test(input)) return "paste-number";
	return remoteCommands[input as keyof typeof remoteCommands];
}

export type GlobalHotkeyCommand =
	| "quit"
	| "open-palette"
	| "inspect-network"
	| "run-doctor"
	| "run-ping"
	| "confirm-action"
	| "execute-action";

export function getGlobalHotkeyCommand(
	input: string,
	family: WorkspaceInputFamily,
): GlobalHotkeyCommand | undefined {
	if (family === "actions-focus" && (input === "c" || input === "C")) {
		return "confirm-action";
	}
	if (family === "actions-focus" && (input === "x" || input === "X")) {
		return "execute-action";
	}
	if (input === "q" && family !== "status") return "quit";
	if (input === "?" || input === "/") return "open-palette";
	if (input === "r") return "inspect-network";
	if (input === "d") return "run-doctor";
	if (input === "p") return "run-ping";
	return undefined;
}

export type WorkspaceEnterCommand =
	| "enter-actions-focus"
	| "enter-remotes-focus"
	| "run-selected-action"
	| "select-remote-profile";

export function getWorkspaceEnterCommand(
	input: string,
	key: AppInputKey,
	family: WorkspaceInputFamily,
): WorkspaceEnterCommand | undefined {
	if (input !== "\r" && !key.return) return undefined;
	switch (family) {
		case "actions-workspace":
			return "enter-actions-focus";
		case "remotes-workspace":
			return "enter-remotes-focus";
		case "actions-focus":
			return "run-selected-action";
		case "remotes-focus":
			return "select-remote-profile";
		default:
			return undefined;
	}
}

export type WorkspaceEnterInputTransition =
	| { kind: "no-op" }
	| {
			kind: "focus";
			focusArea: "actions" | "remotes";
			notice: { level: "info"; message: string };
	  }
	| { kind: "run-action"; action: PicosAction }
	| {
			kind: "select-remote-profile";
			transition: RemoteProfileStageTransition;
	  };

export function prepareWorkspaceEnterInput(input: {
	input: string;
	key: AppInputKey;
	family: WorkspaceInputFamily;
	actions: PicosAction[];
	selectedActionIndex: number;
	remoteProfiles: SftpRemoteProfile[];
	selectedRemoteIndex: number;
}): WorkspaceEnterInputTransition {
	const command = getWorkspaceEnterCommand(
		input.input,
		input.key,
		input.family,
	);
	switch (command) {
		case undefined:
			return { kind: "no-op" };
		case "enter-actions-focus":
			return {
				kind: "focus",
				focusArea: "actions",
				notice: { level: "info", message: "actions focus entered" },
			};
		case "enter-remotes-focus":
			return {
				kind: "focus",
				focusArea: "remotes",
				notice: { level: "info", message: "remotes focus entered" },
			};
		case "run-selected-action": {
			const action =
				input.actions[
					clampIndex(input.selectedActionIndex, input.actions.length)
				];
			return action ? { kind: "run-action", action } : { kind: "no-op" };
		}
		case "select-remote-profile":
			return {
				kind: "select-remote-profile",
				transition: prepareRemoteProfileStage(
					input.remoteProfiles,
					input.selectedRemoteIndex,
				),
			};
	}
}

export type GlobalHotkeyInputTransition =
	| { kind: "no-op" }
	| { kind: "quit"; handled: true }
	| {
			kind: "open-palette";
			handled: true;
			focusArea: "workspaces";
			notice: { level: "info"; message: "command palette opened" };
	  }
	| {
			kind: "run-action";
			handled: false;
			action: PicosAction;
			screen?: "actions";
	  }
	| {
			kind: "confirm-action";
			handled: true;
			transition: ReturnType<typeof prepareControlConfirmationPrompt>;
	  }
	| {
			kind: "execute-action";
			handled: true;
			request: GlobalControlExecutionRequest;
	  };

export type GlobalControlInput = {
	previewPlan: unknown;
	confirmation?: ActionControlConfirmation;
	platform: NetworkSummary["platform"];
	updateCheckResult?: PackageUpdateCheckResult;
};

export type GlobalControlExecutionRequest = GlobalControlInput & {
	start: ReturnType<typeof prepareControlExecutionStart>;
};

export function prepareGlobalHotkeyInput(input: {
	input: string;
	family: WorkspaceInputFamily;
	actions: PicosAction[];
	control?: GlobalControlInput;
}): GlobalHotkeyInputTransition {
	const command = getGlobalHotkeyCommand(input.input, input.family);
	switch (command) {
		case undefined:
			return { kind: "no-op" };
		case "quit":
			return { kind: "quit", handled: true };
		case "open-palette":
			return {
				kind: "open-palette",
				handled: true,
				focusArea: "workspaces",
				notice: { level: "info", message: "command palette opened" },
			};
		case "inspect-network": {
			const action =
				input.actions.find((candidate) => candidate.id === "network.inspect") ??
				input.actions[0];
			return action
				? { kind: "run-action", handled: false, action }
				: { kind: "no-op" };
		}
		case "run-doctor":
		case "run-ping": {
			const actionId = command === "run-doctor" ? "doctor.run" : "ping.default";
			const action = input.actions.find(
				(candidate) => candidate.id === actionId,
			);
			return action
				? { kind: "run-action", handled: false, action, screen: "actions" }
				: { kind: "no-op" };
		}
		case "confirm-action":
			return input.control
				? {
						kind: "confirm-action",
						handled: true,
						transition: prepareControlConfirmationPrompt(input.control),
					}
				: { kind: "no-op" };
		case "execute-action":
			return input.control
				? {
						kind: "execute-action",
						handled: true,
						request: {
							...input.control,
							start: prepareControlExecutionStart(input.control),
						},
					}
				: { kind: "no-op" };
	}
}

export type GlobalNavigationCommand =
	| "leave-focus"
	| "next-screen-or-leave-actions"
	| "previous-screen-or-leave-focus"
	| "next-action"
	| "previous-action"
	| "next-remote"
	| "previous-remote"
	| "next-editor-line"
	| "previous-editor-line"
	| "next-interface"
	| "previous-interface"
	| "next-tool"
	| "previous-tool"
	| "next-screen"
	| "previous-screen"
	| "screen-shortcut";

export function getGlobalNavigationCommand(input: {
	input: string;
	key: AppInputKey;
	family: WorkspaceInputFamily;
	hasEditorPreview: boolean;
}): GlobalNavigationCommand | undefined {
	if (input.key.escape) return "leave-focus";
	if (input.key.rightArrow || input.input === "l") {
		return "next-screen-or-leave-actions";
	}
	if (input.key.leftArrow || input.input === "h") {
		return "previous-screen-or-leave-focus";
	}
	if (input.key.downArrow || input.input === "j") {
		switch (input.family) {
			case "actions-focus":
				return "next-action";
			case "remotes-focus":
				return "next-remote";
			case "editor":
				return input.hasEditorPreview ? "next-editor-line" : "next-screen";
			case "interfaces":
				return "next-interface";
			case "tools":
				return "next-tool";
			default:
				return "next-screen";
		}
	}
	if (input.key.upArrow || input.input === "k") {
		switch (input.family) {
			case "actions-focus":
				return "previous-action";
			case "remotes-focus":
				return "previous-remote";
			case "editor":
				return input.hasEditorPreview
					? "previous-editor-line"
					: "previous-screen";
			case "interfaces":
				return "previous-interface";
			case "tools":
				return "previous-tool";
			default:
				return "previous-screen";
		}
	}
	return /^[1-9]$/.test(input.input) ? "screen-shortcut" : undefined;
}

export type GlobalNavigationInputTransition =
	| { kind: "no-op" }
	| { kind: "focus"; focusArea: FocusArea }
	| { kind: "screen"; screen: Screen }
	| { kind: "workspace"; focusArea: "workspaces"; screen: Screen }
	| { kind: "action-selection"; selectedIndex: number }
	| { kind: "remote-selection"; selectedIndex: number }
	| { kind: "editor-selection"; selectedIndex: number }
	| {
			kind: "interface-selection";
			transition: Extract<InterfaceSelectionTransition, { kind: "selection" }>;
	  }
	| {
			kind: "tool-selection";
			selectedIndex: number;
			clipboardRowIndex: 0;
			copyPreview: false;
	  };

export function prepareGlobalNavigationInput(input: {
	input: string;
	key: AppInputKey;
	screen: Screen;
	focusArea: FocusArea;
	actionsLength: number;
	selectedActionIndex: number;
	remoteProfiles: SftpRemoteProfile[];
	selectedRemoteIndex: number;
	editorPreview?: EditorBuffer;
	selectedEditorLineIndex: number;
	summary?: NetworkSummary;
	selectedInterfaceIndex: number;
	toolHistory: ToolHistoryItem[];
	selectedToolHistoryIndex: number;
	toolHistoryFilter: string;
	toolHistorySort: ToolHistorySort;
}): GlobalNavigationInputTransition {
	const family = getWorkspaceInputFamily(input.screen, input.focusArea);
	const command = getGlobalNavigationCommand({
		input: input.input,
		key: input.key,
		family,
		hasEditorPreview: Boolean(input.editorPreview),
	});
	switch (command) {
		case undefined:
			return { kind: "no-op" };
		case "leave-focus":
			return { kind: "focus", focusArea: leaveFocus(input.focusArea) };
		case "next-screen-or-leave-actions":
			return family === "actions-focus"
				? { kind: "focus", focusArea: "workspaces" }
				: { kind: "screen", screen: moveScreen(input.screen, "next") };
		case "previous-screen-or-leave-focus":
			return family === "actions-focus" || family === "remotes-focus"
				? { kind: "focus", focusArea: "workspaces" }
				: { kind: "screen", screen: moveScreen(input.screen, "previous") };
		case "next-action":
		case "previous-action":
			return {
				kind: "action-selection",
				selectedIndex: getNextIndex(
					input.selectedActionIndex,
					input.actionsLength,
					command === "next-action" ? "next" : "previous",
				),
			};
		case "next-remote":
		case "previous-remote":
			return {
				kind: "remote-selection",
				selectedIndex: moveRemoteProfileSelection(
					input.remoteProfiles,
					input.selectedRemoteIndex,
					command === "next-remote" ? "next" : "previous",
				),
			};
		case "next-editor-line":
		case "previous-editor-line": {
			const transition = transitionEditorMoveCursor({
				buffer: input.editorPreview,
				selectedLineIndex: input.selectedEditorLineIndex,
				direction: command === "next-editor-line" ? "next" : "previous",
			});
			return {
				kind: "editor-selection",
				selectedIndex: transition.selectedLineIndex,
			};
		}
		case "next-interface":
		case "previous-interface": {
			const transition = prepareInterfaceSelectionTransition({
				direction: command === "next-interface" ? "down" : "up",
				selectedIndex: input.selectedInterfaceIndex,
				summary: input.summary,
			});
			return transition.kind === "selection"
				? { kind: "interface-selection", transition }
				: { kind: "no-op" };
		}
		case "next-tool":
		case "previous-tool": {
			const direction = command === "next-tool" ? "next" : "previous";
			return {
				kind: "tool-selection",
				selectedIndex:
					input.toolHistoryFilter || input.toolHistorySort !== "time"
						? moveFilteredToolHistorySelection(
								input.toolHistory,
								input.selectedToolHistoryIndex,
								input.toolHistoryFilter,
								direction,
								input.toolHistorySort,
							)
						: moveToolHistorySelection(
								input.selectedToolHistoryIndex,
								input.toolHistory.length,
								direction,
							),
				clipboardRowIndex: 0,
				copyPreview: false,
			};
		}
		case "next-screen":
			return { kind: "screen", screen: moveScreen(input.screen, "next") };
		case "previous-screen":
			return { kind: "screen", screen: moveScreen(input.screen, "previous") };
		case "screen-shortcut": {
			const screen = getScreenByShortcut(input.input);
			return screen
				? { kind: "workspace", focusArea: "workspaces", screen }
				: { kind: "no-op" };
		}
	}
}
