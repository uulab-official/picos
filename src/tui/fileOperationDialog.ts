import type { ActionPrivilege, ActionRisk } from "../core/actions";
import {
	createFileOperationExecutionPlan,
	type FileOperationExecutionPlan,
	type FileOperationExecutionPolicy,
} from "../core/fileOperations";
import type { FileEntry, FileProviderKind } from "../core/files";
import {
	type CommandLineState,
	closeCommandLine,
	openCommandLine,
} from "./commandLine";
import { getSelectedFileEntry } from "./fileSelection";

export type FileOperationKind = "copy" | "move" | "delete";

export type FileOperationPreview = {
	kind: FileOperationKind;
	title: string;
	path: string;
	destination?: string;
	targetHint: string;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	confirmationPhrase: string;
	executable: boolean;
	reason: string;
};

export type FileOperationDialogState =
	| {
			active: true;
			preview: FileOperationPreview;
	  }
	| {
			active: false;
			error?: string;
	  };

export type FileOperationDialogPrompt =
	| "file-operation-destination"
	| "file-operation-confirm";

export type FileOperationDialogCommandLineTransition =
	| { action: "keep" }
	| { action: "close" }
	| { action: "open"; prompt: FileOperationDialogPrompt };

export type FileOperationDialogNotice = {
	level: "info" | "warn";
	message: string;
};

export type FileOperationDialogTransition = {
	dialog: FileOperationDialogState;
	commandLine: FileOperationDialogCommandLineTransition;
	notice?: FileOperationDialogNotice;
	plan?: FileOperationExecutionPlan;
};

export function prepareActiveFileOperationDialogInput(
	dialog: FileOperationDialogState,
	input: { input: string; escape?: boolean; return?: boolean },
): { dialog: FileOperationDialogState; notice?: FileOperationDialogNotice } {
	if (!dialog.active) {
		return { dialog };
	}
	if (input.escape || input.input === "q") {
		return {
			dialog: clearFileOperationDialog(dialog),
			notice: { level: "info", message: "file operation dialog closed" },
		};
	}
	if (input.return) {
		return {
			dialog,
			notice: {
				level: "warn",
				message: `${dialog.preview.kind} locked: ${dialog.preview.reason}`,
			},
		};
	}
	return { dialog };
}

export function applyFileOperationCommandLineTransition(
	state: CommandLineState,
	transition: FileOperationDialogCommandLineTransition,
): CommandLineState {
	if (transition.action === "keep") {
		return state;
	}
	if (transition.action === "close") {
		return closeCommandLine(state);
	}
	return openCommandLine(transition.prompt);
}

export function createFileOperationPreview(
	kind: FileOperationKind,
	entry: FileEntry,
): FileOperationPreview {
	const common = {
		kind,
		path: entry.path,
		privilege: "user",
		executable: false,
		reason: "destination-required",
	} satisfies Partial<FileOperationPreview>;

	if (kind === "delete") {
		return {
			...common,
			kind,
			title: "Delete file",
			targetHint: "selected path will be removed",
			risk: "destructive",
			confirmationPhrase: "delete file",
			reason: "confirmation-required",
		};
	}

	if (kind === "move") {
		return {
			...common,
			kind,
			title: "Move file",
			targetHint: "choose destination path",
			risk: "write",
			confirmationPhrase: "move file",
		};
	}

	return {
		...common,
		kind,
		title: "Copy file",
		targetHint: "choose destination path",
		risk: "write",
		confirmationPhrase: "copy file",
	};
}

export function openFileOperationDialog(
	kind: FileOperationKind,
	entry: FileEntry | undefined,
): FileOperationDialogState {
	if (!entry || entry.name === "..") {
		return {
			active: false,
			error: "Select a real file or directory before opening an operation.",
		};
	}

	return {
		active: true,
		preview: createFileOperationPreview(kind, entry),
	};
}

export function clearFileOperationDialog(
	_state: FileOperationDialogState,
): FileOperationDialogState {
	return { active: false };
}

export function setFileOperationDestination(
	state: FileOperationDialogState,
	destination: string,
): FileOperationDialogState {
	if (!state.active || state.preview.kind === "delete") {
		return state;
	}

	const nextDestination = destination.trim();
	if (!nextDestination) {
		return state;
	}

	return {
		active: true,
		preview: {
			...state.preview,
			destination: nextDestination,
			targetHint: nextDestination,
			reason: "confirmation-required",
		},
	};
}

export function prepareFileOperationOpen(
	kind: FileOperationKind,
	entry: FileEntry | undefined,
): FileOperationDialogTransition {
	const dialog = openFileOperationDialog(kind, entry);
	if (!dialog.active) {
		return {
			dialog,
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message:
					dialog.error ??
					"Select a real file or directory before opening an operation.",
			},
		};
	}

	const opensConfirmation = kind === "delete";
	return {
		dialog,
		commandLine: {
			action: "open",
			prompt: opensConfirmation
				? "file-operation-confirm"
				: "file-operation-destination",
		},
		notice: {
			level: "warn",
			message: `${dialog.preview.title} ${opensConfirmation ? "confirmation" : "destination"} opened`,
		},
	};
}

export function prepareSelectedFileOperationOpen(input: {
	kind: FileOperationKind;
	entries: FileEntry[];
	selectedIndex: number;
	providerKind: FileProviderKind;
}): FileOperationDialogTransition {
	if (input.providerKind === "sftp") {
		return {
			dialog: { active: false },
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: `remote SFTP ${input.kind} is disabled in read-only sessions`,
			},
		};
	}

	return prepareFileOperationOpen(
		input.kind,
		getSelectedFileEntry(input.entries, input.selectedIndex),
	);
}

export function prepareFileOperationDestination(
	dialog: FileOperationDialogState,
	destination: string,
): FileOperationDialogTransition {
	if (!dialog.active) {
		return {
			dialog,
			commandLine: { action: "close" },
			notice: {
				level: "warn",
				message: "file operation destination missing preview",
			},
		};
	}
	if (dialog.preview.kind === "delete") {
		return {
			dialog,
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "delete operation does not accept a destination",
			},
		};
	}

	const normalizedDestination = destination.trim();
	if (!normalizedDestination) {
		return {
			dialog,
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "file operation destination is required",
			},
		};
	}

	return {
		dialog: setFileOperationDestination(dialog, normalizedDestination),
		commandLine: {
			action: "open",
			prompt: "file-operation-confirm",
		},
		notice: {
			level: "info",
			message: `file operation destination set ${normalizedDestination}`,
		},
	};
}

export function prepareFileOperationConfirmation(input: {
	dialog: FileOperationDialogState;
	confirmation: string;
	providerKind: FileProviderKind;
	policy: FileOperationExecutionPolicy;
}): FileOperationDialogTransition {
	if (!input.dialog.active) {
		return {
			dialog: input.dialog,
			commandLine: { action: "close" },
			notice: {
				level: "warn",
				message: "file operation confirmation missing preview",
			},
		};
	}

	return {
		dialog: clearFileOperationDialog(input.dialog),
		commandLine: { action: "close" },
		plan: createFileOperationExecutionPlan({
			kind: input.dialog.preview.kind,
			path: input.dialog.preview.path,
			destination: input.dialog.preview.destination,
			providerKind: input.providerKind,
			confirmation: input.confirmation,
			policy: input.policy,
		}),
	};
}
