import type { ActionPrivilege, ActionRisk } from "../core/actions";
import type { FileEntry } from "../core/files";

export type FileOperationKind = "copy" | "move" | "delete";

export type FileOperationPreview = {
	kind: FileOperationKind;
	title: string;
	path: string;
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

export function createFileOperationPreview(
	kind: FileOperationKind,
	entry: FileEntry,
): FileOperationPreview {
	const common = {
		kind,
		path: entry.path,
		privilege: "user",
		executable: false,
		reason: "locked until destination preview and confirmation are wired",
	} satisfies Partial<FileOperationPreview>;

	if (kind === "delete") {
		return {
			...common,
			kind,
			title: "Delete file",
			targetHint: "selected path will be removed",
			risk: "destructive",
			confirmationPhrase: "delete file",
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
