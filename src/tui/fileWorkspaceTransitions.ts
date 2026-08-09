import {
	type FileEntry,
	type FileLocation,
	type FileProviderKind,
	type FileReadResult,
	getFileParentPath,
	resolveFilePath,
} from "../core/files";
import type { RemoteFileContext } from "../core/remotes";
import type { CommandLineState } from "./commandLine";
import { createEditorBuffer, type EditorBuffer } from "./editorBuffer";
import {
	appendFileFilterQuery,
	backspaceFileFilterQuery,
	clearFileFilter,
	closeFileFilter,
	type FileFilterState,
	openFileFilter,
} from "./fileFilter";
import { prepareFileHistoryMove, prepareFileNavigation } from "./fileHistory";
import {
	type FileOperationCommandLineInputTransition,
	type FileOperationDialogState,
	type FileOperationDialogTransition,
	prepareFileOperationCommandLineInput,
	prepareSelectedFileOperationOpen,
} from "./fileOperationDialog";
import {
	getSelectedFileEntry,
	getSelectedFilePathClipboardIntent,
	moveFileSelection,
} from "./fileSelection";
import {
	clampIndex,
	type FocusArea,
	getLocationShortcutIndex,
	getNextIndex,
	type Screen,
} from "./navigation";
import { classifyRequestPublication } from "./requestSequence";

export type FileWorkspaceNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

export function prepareFileWorkspaceCommandLineInput(input: {
	commandLine: CommandLineState;
	dialog: FileOperationDialogState;
	input: string;
	escape?: boolean;
	return?: boolean;
	backspace?: boolean;
}): FileOperationCommandLineInputTransition {
	return prepareFileOperationCommandLineInput(input);
}

export function prepareActiveFileFilterInput(input: {
	filter: FileFilterState;
	input: string;
	escape?: boolean;
	return?: boolean;
	backspace?: boolean;
}): {
	filter: FileFilterState;
	selectedIndex: 0;
	notice?: FileWorkspaceNotice;
} {
	if (input.escape) {
		return {
			filter: clearFileFilter(input.filter),
			selectedIndex: 0,
			notice: { level: "info", message: "file filter cleared" },
		};
	}
	if (input.return) {
		return {
			filter: closeFileFilter(input.filter),
			selectedIndex: 0,
			notice: { level: "info", message: "file filter applied" },
		};
	}
	return {
		filter: input.backspace
			? backspaceFileFilterQuery(input.filter)
			: appendFileFilterQuery(input.filter, input.input),
		selectedIndex: 0,
	};
}

export type FileLoadRequest = {
	path: string;
	failurePrefix?: string;
	keepSelection?: boolean;
	backHistory?: string[];
	forwardHistory?: string[];
	selectedLocationIndex?: number;
	notice?: FileWorkspaceNotice;
};

export type FileLoadIoOutcome =
	| { status: "success"; resolvedRoot: string; entries: FileEntry[] }
	| { status: "failure"; error: unknown };

export type FileProviderSession = {
	generation: number;
	kind: FileProviderKind;
	remoteContext?: RemoteFileContext;
};

export type FileProviderConnectionAttemptIdentity = {
	id: string;
	attempt: number;
	startedAt: number;
};

export function classifyCommittedFileProviderConnectionPublication(input: {
	requestAttempt: FileProviderConnectionAttemptIdentity;
	currentAttempt?: FileProviderConnectionAttemptIdentity;
	requestIsPending: boolean;
	requestCancelled: boolean;
}): "current" | "stale" {
	const currentAttempt = input.currentAttempt;
	return !input.requestCancelled &&
		input.requestIsPending &&
		currentAttempt?.id === input.requestAttempt.id &&
		currentAttempt.attempt === input.requestAttempt.attempt &&
		currentAttempt.startedAt === input.requestAttempt.startedAt
		? "current"
		: "stale";
}

export type FileLoadTransition =
	| { status: "stale"; notice?: FileWorkspaceNotice }
	| {
			status: "failure";
			error: string;
			notice: FileWorkspaceNotice;
			publishError: boolean;
			commitProviderSession?: false;
	  }
	| {
			status: "success";
			root: string;
			entries: FileEntry[];
			selectedIndex: number;
			selectedLocationIndex: number;
			backHistory?: string[];
			forwardHistory?: string[];
			clearError: boolean;
			providerSession?: FileProviderSession;
			commitProviderSession?: true;
			notice?: FileWorkspaceNotice;
	  };

export function classifyFileLoadOutcome(input: {
	currentRequestToken: number;
	requestToken: number;
	currentErrorRequestToken?: number;
	errorRequestToken?: number;
	currentProviderGeneration?: number;
	requestProviderGeneration?: number;
	providerSession?: FileProviderSession;
	request: FileLoadRequest;
	outcome: FileLoadIoOutcome;
	selectedIndex: number;
	selectedLocationIndex: number;
	locations: FileLocation[];
}): FileLoadTransition {
	const outcome = input.outcome;
	const staleRequest =
		classifyRequestPublication(
			input.currentRequestToken,
			input.requestToken,
		) === "stale";
	const staleProvider =
		(input.currentProviderGeneration !== undefined &&
			input.requestProviderGeneration !== undefined &&
			input.currentProviderGeneration !== input.requestProviderGeneration) ||
		(input.providerSession !== undefined &&
			input.requestProviderGeneration !== undefined &&
			input.providerSession.generation !== input.requestProviderGeneration);
	const stale = staleRequest || staleProvider;
	const errorPublication = classifyRequestPublication(
		input.currentErrorRequestToken ?? input.currentRequestToken,
		input.errorRequestToken ?? input.requestToken,
	);
	if (outcome.status === "failure") {
		const message = `${input.request.failurePrefix ?? "file load failed"} ${formatFileTransitionError(outcome.error)}`;
		const notice = { level: "fail", message } as const;
		return stale
			? { status: "stale", notice }
			: {
					status: "failure",
					error: message,
					notice,
					publishError: errorPublication === "current",
					...(input.providerSession
						? { commitProviderSession: false as const }
						: {}),
				};
	}
	if (stale) {
		return { status: "stale" };
	}

	const matchedLocationIndex = input.locations.findIndex(
		(location) => location.path === outcome.resolvedRoot,
	);
	return {
		status: "success",
		root: outcome.resolvedRoot,
		entries: outcome.entries,
		selectedIndex: input.request.keepSelection
			? clampIndex(input.selectedIndex, outcome.entries.length)
			: 0,
		selectedLocationIndex:
			matchedLocationIndex >= 0
				? matchedLocationIndex
				: clampIndex(input.selectedLocationIndex, input.locations.length),
		...(input.request.backHistory
			? { backHistory: input.request.backHistory }
			: {}),
		...(input.request.forwardHistory
			? { forwardHistory: input.request.forwardHistory }
			: {}),
		clearError: errorPublication === "current",
		...(input.providerSession
			? {
					providerSession: input.providerSession,
					commitProviderSession: true as const,
				}
			: {}),
		...(input.request.notice ? { notice: input.request.notice } : {}),
	};
}

export type FilePreviewIoOutcome =
	| { status: "success"; read: FileReadResult }
	| { status: "failure"; error: unknown };

export type FilePreviewTransition =
	| { status: "stale"; notice?: FileWorkspaceNotice }
	| {
			status: "failure";
			error: string;
			notice: FileWorkspaceNotice;
			publishError: boolean;
	  }
	| {
			status: "success";
			buffer: EditorBuffer;
			selectedLineIndex: 0;
			clearSaveResult: true;
			clearError: boolean;
			openEditor: boolean;
			notice?: FileWorkspaceNotice;
	  };

export function classifyFilePreviewOutcome(input: {
	currentRequestToken: number;
	requestToken: number;
	currentErrorRequestToken?: number;
	errorRequestToken?: number;
	entry: FileEntry;
	openEditor: boolean;
	notice?: FileWorkspaceNotice;
	outcome: FilePreviewIoOutcome;
}): FilePreviewTransition {
	const stale =
		classifyRequestPublication(
			input.currentRequestToken,
			input.requestToken,
		) === "stale";
	const errorPublication = classifyRequestPublication(
		input.currentErrorRequestToken ?? input.currentRequestToken,
		input.errorRequestToken ?? input.requestToken,
	);
	if (input.outcome.status === "failure") {
		const message = `file preview failed ${formatFileTransitionError(input.outcome.error)}`;
		const notice = { level: "fail", message } as const;
		return stale
			? { status: "stale", notice }
			: {
					status: "failure",
					error: message,
					notice,
					publishError: errorPublication === "current",
				};
	}
	if (stale) {
		return { status: "stale" };
	}

	return {
		status: "success",
		buffer: createEditorBuffer({
			path: input.outcome.read.path,
			content: input.outcome.read.content,
			truncated: input.outcome.read.truncated,
		}),
		selectedLineIndex: 0,
		clearSaveResult: true,
		clearError: errorPublication === "current",
		openEditor: input.openEditor,
		...(input.notice ? { notice: input.notice } : {}),
	};
}

export type SelectedFileOpenTransition =
	| { action: "none"; notice: FileWorkspaceNotice }
	| { action: "load"; request: FileLoadRequest }
	| {
			action: "preview";
			entry: FileEntry;
			openEditor: true;
			notice: FileWorkspaceNotice;
	  };

export function prepareSelectedFileOpen(input: {
	entries: FileEntry[];
	selectedIndex: number;
	root: string;
	backHistory: string[];
	forwardHistory: string[];
	notice?: FileWorkspaceNotice;
}): SelectedFileOpenTransition {
	const entry = getSelectedFileEntry(input.entries, input.selectedIndex);
	if (!entry) {
		return {
			action: "none",
			notice: { level: "warn", message: "no file selected" },
		};
	}

	if (entry.type === "directory" || entry.type === "symlink") {
		const navigation = prepareFileNavigation({
			root: input.root,
			targetPath: entry.path,
			backHistory: input.backHistory,
			forwardHistory: input.forwardHistory,
		});
		return {
			action: "load",
			request: {
				path: navigation.targetPath,
				backHistory: navigation.backHistory,
				forwardHistory: navigation.forwardHistory,
				notice:
					input.notice ??
					({ level: "info", message: `entered ${entry.path}` } as const),
			},
		};
	}

	return {
		action: "preview",
		entry,
		openEditor: true,
		notice:
			input.notice ??
			({ level: "ok", message: `opened ${entry.name}` } as const),
	};
}

export function prepareParentFileNavigation(input: {
	root: string;
	backHistory: string[];
	forwardHistory: string[];
}):
	| { action: "none"; notice: FileWorkspaceNotice }
	| { action: "load"; request: FileLoadRequest } {
	const parent = getFileParentPath(input.root);
	if (parent === input.root) {
		return {
			action: "none",
			notice: { level: "info", message: "already at filesystem root" },
		};
	}
	const navigation = prepareFileNavigation({
		root: input.root,
		targetPath: parent,
		backHistory: input.backHistory,
		forwardHistory: input.forwardHistory,
	});
	return {
		action: "load",
		request: {
			path: parent,
			backHistory: navigation.backHistory,
			forwardHistory: navigation.forwardHistory,
			notice: { level: "info", message: `entered ${parent}` },
		},
	};
}

export function prepareFileHistoryNavigation(input: {
	direction: "back" | "forward";
	root: string;
	backHistory: string[];
	forwardHistory: string[];
}):
	| { action: "none"; notice: FileWorkspaceNotice }
	| { action: "load"; request: FileLoadRequest } {
	const transition = prepareFileHistoryMove(input);
	if (!transition.targetPath) {
		return { action: "none", notice: transition.notice };
	}
	return {
		action: "load",
		request: {
			path: transition.targetPath,
			backHistory: transition.backHistory,
			forwardHistory: transition.forwardHistory,
			notice: transition.notice,
		},
	};
}

export function prepareFileLocationNavigation(input: {
	locationIndex: number;
	locations: FileLocation[];
	root: string;
	backHistory: string[];
	forwardHistory: string[];
}): { action: "none" } | { action: "load"; request: FileLoadRequest } {
	const location =
		input.locations[clampIndex(input.locationIndex, input.locations.length)];
	if (!location) {
		return { action: "none" };
	}
	const navigation = prepareFileNavigation({
		root: input.root,
		targetPath: location.path,
		backHistory: input.backHistory,
		forwardHistory: input.forwardHistory,
	});
	return {
		action: "load",
		request: {
			path: location.path,
			backHistory: navigation.backHistory,
			forwardHistory: navigation.forwardHistory,
			selectedLocationIndex: clampIndex(
				input.locationIndex,
				input.locations.length,
			),
			notice: { level: "info", message: `jumped to ${location.label}` },
		},
	};
}

export function prepareNextFileLocationIndex(
	selectedLocationIndex: number,
	locationCount: number,
): number | undefined {
	return locationCount <= 0
		? undefined
		: getNextIndex(selectedLocationIndex, locationCount, "next");
}

export type FilePathCommandTransition =
	| { action: "cancel"; notice: FileWorkspaceNotice }
	| { action: "load"; request: FileLoadRequest };

export function prepareFilePathCommand(input: {
	value: string;
	root: string;
	backHistory: string[];
	forwardHistory: string[];
}): FilePathCommandTransition {
	const value = input.value.trim();
	if (!value) {
		return {
			action: "cancel",
			notice: { level: "info", message: "path command cancelled" },
		};
	}
	const targetPath = resolveFilePath(input.root, value);
	const navigation = prepareFileNavigation({
		root: input.root,
		targetPath,
		backHistory: input.backHistory,
		forwardHistory: input.forwardHistory,
	});
	return {
		action: "load",
		request: {
			path: targetPath,
			backHistory: navigation.backHistory,
			forwardHistory: navigation.forwardHistory,
			notice: { level: "info", message: `entered ${targetPath}` },
		},
	};
}

export type FileWorkspaceInputTransition =
	| { action: "unhandled" }
	| { action: "enter-focus"; focusArea: "files"; notice: FileWorkspaceNotice }
	| { action: "leave-focus"; focusArea: "workspaces" }
	| { action: "open-selected"; transition: SelectedFileOpenTransition }
	| {
			action: "parent";
			transition: ReturnType<typeof prepareParentFileNavigation>;
	  }
	| {
			action: "history";
			direction: "back" | "forward";
			transition: ReturnType<typeof prepareFileHistoryNavigation>;
	  }
	| {
			action: "clipboard";
			intent: ReturnType<typeof getSelectedFilePathClipboardIntent>;
	  }
	| {
			action: "filter";
			filter: FileFilterState;
			selectedIndex: 0;
			notice: FileWorkspaceNotice;
	  }
	| { action: "operation"; transition: FileOperationDialogTransition }
	| { action: "disconnect" }
	| {
			action: "next-location";
			transition: ReturnType<typeof prepareFileLocationNavigation>;
	  }
	| {
			action: "location";
			transition: ReturnType<typeof prepareFileLocationNavigation>;
	  }
	| { action: "path"; notice: FileWorkspaceNotice }
	| { action: "select"; selectedIndex: number }
	| { action: "notice"; notice: FileWorkspaceNotice };

export function prepareFileWorkspaceInput(input: {
	screen: Screen;
	focusArea: FocusArea;
	input: string;
	return?: boolean;
	escape?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	entries: FileEntry[];
	selectedIndex: number;
	providerKind: FileProviderKind;
	locationCount: number;
	root: string;
	backHistory: string[];
	forwardHistory: string[];
	locations: FileLocation[];
	selectedLocationIndex: number;
	filterQuery?: string;
}): FileWorkspaceInputTransition {
	const enter = input.return || input.input === "\r";
	if (input.screen === "files" && input.focusArea === "workspaces" && enter) {
		return {
			action: "enter-focus",
			focusArea: "files",
			notice: { level: "info", message: "files focus entered" },
		};
	}
	if (input.screen !== "files" || input.focusArea !== "files") {
		return { action: "unhandled" };
	}
	if (enter) {
		return {
			action: "open-selected",
			transition: prepareSelectedFileOpen({
				entries: input.entries,
				selectedIndex: input.selectedIndex,
				root: input.root,
				backHistory: input.backHistory,
				forwardHistory: input.forwardHistory,
			}),
		};
	}
	if (input.input === "u") {
		return {
			action: "parent",
			transition: prepareParentFileNavigation(input),
		};
	}
	if (input.input === "b" || input.input === "B") {
		const direction = input.input === "b" ? "back" : "forward";
		return {
			action: "history",
			direction,
			transition: prepareFileHistoryNavigation({
				direction,
				root: input.root,
				backHistory: input.backHistory,
				forwardHistory: input.forwardHistory,
			}),
		};
	}
	if (input.input === "y") {
		return {
			action: "clipboard",
			intent: getSelectedFilePathClipboardIntent(
				input.entries,
				input.selectedIndex,
			),
		};
	}
	if (input.input === "f") {
		return {
			action: "filter",
			filter: openFileFilter(input.filterQuery ?? ""),
			selectedIndex: 0,
			notice: { level: "info", message: "file filter opened" },
		};
	}
	if (input.input === "c" || input.input === "m" || input.input === "x") {
		const kind =
			input.input === "c" ? "copy" : input.input === "m" ? "move" : "delete";
		return {
			action: "operation",
			transition: prepareSelectedFileOperationOpen({
				kind,
				entries: input.entries,
				selectedIndex: input.selectedIndex,
				providerKind: input.providerKind,
			}),
		};
	}
	if (input.input === "L" && input.providerKind === "sftp") {
		return { action: "disconnect" };
	}
	if (input.input === "g") {
		return input.providerKind === "sftp"
			? {
					action: "notice",
					notice: {
						level: "warn",
						message:
							"close the SFTP session with L before using local locations",
					},
				}
			: {
					action: "next-location",
					transition: prepareFileLocationNavigation({
						locationIndex:
							prepareNextFileLocationIndex(
								input.selectedLocationIndex,
								input.locations.length,
							) ?? 0,
						locations: input.locations,
						root: input.root,
						backHistory: input.backHistory,
						forwardHistory: input.forwardHistory,
					}),
				};
	}
	if (input.providerKind === "local") {
		const locationIndex = getLocationShortcutIndex(
			input.input,
			input.locationCount,
		);
		if (locationIndex !== undefined) {
			return {
				action: "location",
				transition: prepareFileLocationNavigation({
					locationIndex,
					locations: input.locations,
					root: input.root,
					backHistory: input.backHistory,
					forwardHistory: input.forwardHistory,
				}),
			};
		}
	}
	if (input.input === ":") {
		return {
			action: "path",
			notice: { level: "info", message: "path command opened" },
		};
	}
	if (input.downArrow || input.input === "j") {
		return {
			action: "select",
			selectedIndex: moveFileSelection(
				input.selectedIndex,
				input.entries.length,
				"next",
			),
		};
	}
	if (input.upArrow || input.input === "k") {
		return {
			action: "select",
			selectedIndex: moveFileSelection(
				input.selectedIndex,
				input.entries.length,
				"previous",
			),
		};
	}
	if (input.escape || input.leftArrow || input.input === "h") {
		return { action: "leave-focus", focusArea: "workspaces" };
	}
	return { action: "unhandled" };
}

function formatFileTransitionError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
