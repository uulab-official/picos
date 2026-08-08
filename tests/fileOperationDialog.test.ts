import { describe, expect, test } from "bun:test";
import type { FileEntry } from "../src/core/files";
import {
	applyFileOperationCommandLineTransition,
	clearFileOperationDialog,
	createFileOperationPreview,
	openFileOperationDialog,
	prepareActiveFileOperationDialogInput,
	prepareFileOperationCommandLineInput,
	prepareFileOperationConfirmation,
	prepareFileOperationDestination,
	prepareFileOperationOpen,
	prepareSelectedFileOperationOpen,
	setFileOperationDestination,
} from "../src/tui/fileOperationDialog";

const fileEntry: FileEntry = {
	name: "README.md",
	path: "/workspace/picos/README.md",
	type: "file",
	size: 1200,
	readonly: false,
};

const parentEntry: FileEntry = {
	name: "..",
	path: "/workspace",
	type: "directory",
	readonly: true,
};

describe("TUI file operation dialog", () => {
	test("builds locked previews for write and destructive file operations", () => {
		expect(createFileOperationPreview("copy", fileEntry)).toEqual({
			kind: "copy",
			title: "Copy file",
			path: "/workspace/picos/README.md",
			targetHint: "choose destination path",
			risk: "write",
			privilege: "user",
			confirmationPhrase: "copy file",
			executable: false,
			reason: "destination-required",
		});

		expect(createFileOperationPreview("move", fileEntry)).toMatchObject({
			kind: "move",
			title: "Move file",
			risk: "write",
			confirmationPhrase: "move file",
			executable: false,
		});

		expect(createFileOperationPreview("delete", fileEntry)).toMatchObject({
			kind: "delete",
			title: "Delete file",
			risk: "destructive",
			targetHint: "selected path will be removed",
			confirmationPhrase: "delete file",
			executable: false,
			reason: "confirmation-required",
		});
	});

	test("opens and clears a dialog but refuses parent navigation entries", () => {
		const opened = openFileOperationDialog("delete", fileEntry);

		expect(opened.active).toBe(true);
		if (!opened.active) {
			throw new Error("expected delete operation dialog to open");
		}
		expect(opened.preview?.path).toBe(fileEntry.path);
		expect(clearFileOperationDialog(opened)).toEqual({ active: false });
		expect(openFileOperationDialog("copy", parentEntry)).toEqual({
			active: false,
			error: "Select a real file or directory before opening an operation.",
		});
	});

	test("records a destination before the exact confirmation step", () => {
		const opened = openFileOperationDialog("copy", fileEntry);
		const withDestination = setFileOperationDestination(
			opened,
			" /tmp/copy.md ",
		);

		expect(withDestination).toMatchObject({
			active: true,
			preview: {
				destination: "/tmp/copy.md",
				targetHint: "/tmp/copy.md",
				reason: "confirmation-required",
			},
		});
	});

	test("plans open prompts and notices outside the component", () => {
		expect(prepareFileOperationOpen("copy", fileEntry)).toMatchObject({
			commandLine: {
				action: "open",
				prompt: "file-operation-destination",
			},
			notice: {
				level: "warn",
				message: "Copy file destination opened",
			},
		});
		expect(prepareFileOperationOpen("delete", fileEntry)).toMatchObject({
			commandLine: {
				action: "open",
				prompt: "file-operation-confirm",
			},
			notice: {
				level: "warn",
				message: "Delete file confirmation opened",
			},
		});
		expect(prepareFileOperationOpen("move", parentEntry)).toEqual({
			dialog: {
				active: false,
				error: "Select a real file or directory before opening an operation.",
			},
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "Select a real file or directory before opening an operation.",
			},
		});
	});

	test("guards selected operation launch by provider and clamped selection", () => {
		expect(
			prepareSelectedFileOperationOpen({
				kind: "copy",
				entries: [parentEntry, fileEntry],
				selectedIndex: 99,
				providerKind: "local",
			}),
		).toMatchObject({
			dialog: { active: true, preview: { path: fileEntry.path } },
			commandLine: {
				action: "open",
				prompt: "file-operation-destination",
			},
		});

		expect(
			prepareSelectedFileOperationOpen({
				kind: "move",
				entries: [fileEntry],
				selectedIndex: 0,
				providerKind: "sftp",
			}),
		).toEqual({
			dialog: { active: false },
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "remote SFTP move is disabled in read-only sessions",
			},
		});

		expect(
			prepareSelectedFileOperationOpen({
				kind: "delete",
				entries: [],
				selectedIndex: 0,
				providerKind: "local",
			}),
		).toMatchObject({
			dialog: { active: false },
			notice: {
				level: "warn",
				message: "Select a real file or directory before opening an operation.",
			},
		});
	});

	test("owns active dialog close and locked-submit notices", () => {
		const dialog = openFileOperationDialog("copy", fileEntry);
		expect(
			prepareActiveFileOperationDialogInput(dialog, {
				input: "",
				escape: true,
			}),
		).toEqual({
			dialog: { active: false },
			notice: { level: "info", message: "file operation dialog closed" },
		});
		expect(
			prepareActiveFileOperationDialogInput(dialog, {
				input: "\r",
				return: true,
			}),
		).toEqual({
			dialog,
			notice: {
				level: "warn",
				message: "copy locked: destination-required",
			},
		});
	});

	test("owns active destination and confirmation command-line escape cleanup", () => {
		const destination = openFileOperationDialog("copy", fileEntry);
		expect(
			prepareFileOperationCommandLineInput({
				commandLine: {
					active: true,
					prompt: "file-operation-destination",
					value: "/tmp/copy.md",
				},
				dialog: destination,
				input: "",
				escape: true,
			}),
		).toEqual({
			action: "apply",
			commandLine: {
				active: false,
				prompt: "file-operation-destination",
				value: "",
			},
			dialog: { active: false },
			notice: {
				level: "info",
				message: "file operation destination cancelled",
			},
		});

		const confirmation = prepareFileOperationDestination(
			destination,
			"/tmp/copy.md",
		).dialog;
		expect(
			prepareFileOperationCommandLineInput({
				commandLine: {
					active: true,
					prompt: "file-operation-confirm",
					value: "copy file",
				},
				dialog: confirmation,
				input: "",
				escape: true,
			}),
		).toEqual({
			action: "apply",
			commandLine: {
				active: false,
				prompt: "file-operation-confirm",
				value: "",
			},
			dialog: { active: false },
			notice: {
				level: "info",
				message: "file operation confirmation cancelled",
			},
		});
	});

	test("owns file-operation submit intents and editable fallback", () => {
		const dialog = openFileOperationDialog("copy", fileEntry);
		const destination = {
			active: true,
			prompt: "file-operation-destination",
			value: "/tmp/copy.md",
		};
		expect(
			prepareFileOperationCommandLineInput({
				commandLine: destination,
				dialog,
				input: "\r",
				return: true,
			}),
		).toEqual({
			action: "apply",
			commandLine: destination,
			dialog,
			submit: "destination",
		});

		expect(
			prepareFileOperationCommandLineInput({
				commandLine: { ...destination, value: "/tmp/cop" },
				dialog,
				input: "y",
			}),
		).toEqual({
			action: "apply",
			commandLine: { ...destination, value: "/tmp/copy" },
			dialog,
		});

		expect(
			prepareFileOperationCommandLineInput({
				commandLine: {
					active: true,
					prompt: "file-operation-confirm",
					value: "copy file",
				},
				dialog,
				input: "\r",
				return: true,
			}),
		).toMatchObject({ action: "apply", submit: "confirmation" });

		expect(
			prepareFileOperationCommandLineInput({
				commandLine: { active: true, prompt: "path", value: "/tmp" },
				dialog,
				input: "x",
			}),
		).toEqual({ action: "unhandled" });
	});

	test("plans destination guards and confirmation handoff", () => {
		const inactive = prepareFileOperationDestination(
			{ active: false },
			"/tmp/copy.md",
		);
		expect(inactive).toEqual({
			dialog: { active: false },
			commandLine: { action: "close" },
			notice: {
				level: "warn",
				message: "file operation destination missing preview",
			},
		});

		const opened = openFileOperationDialog("copy", fileEntry);
		expect(prepareFileOperationDestination(opened, "   ")).toEqual({
			dialog: opened,
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "file operation destination is required",
			},
		});
		const deleteDialog = openFileOperationDialog("delete", fileEntry);
		expect(
			prepareFileOperationDestination(deleteDialog, "/tmp/not-used"),
		).toEqual({
			dialog: deleteDialog,
			commandLine: { action: "keep" },
			notice: {
				level: "warn",
				message: "delete operation does not accept a destination",
			},
		});
		expect(
			prepareFileOperationDestination(opened, " /tmp/copy.md "),
		).toMatchObject({
			dialog: {
				active: true,
				preview: {
					destination: "/tmp/copy.md",
					reason: "confirmation-required",
				},
			},
			commandLine: {
				action: "open",
				prompt: "file-operation-confirm",
			},
			notice: {
				level: "info",
				message: "file operation destination set /tmp/copy.md",
			},
		});
	});

	test("plans confirmation guards and execution input", () => {
		expect(
			prepareFileOperationConfirmation({
				dialog: { active: false },
				confirmation: "copy file",
				providerKind: "local",
				policy: { mode: "local-write" },
			}),
		).toEqual({
			dialog: { active: false },
			commandLine: { action: "close" },
			notice: {
				level: "warn",
				message: "file operation confirmation missing preview",
			},
		});

		const destination = prepareFileOperationDestination(
			openFileOperationDialog("copy", fileEntry),
			"/tmp/copy.md",
		).dialog;
		const ready = prepareFileOperationConfirmation({
			dialog: destination,
			confirmation: "copy file",
			providerKind: "local",
			policy: { mode: "local-write" },
		});
		expect(ready).toMatchObject({
			dialog: { active: false },
			commandLine: { action: "close" },
			plan: {
				kind: "copy",
				path: fileEntry.path,
				destination: "/tmp/copy.md",
				providerKind: "local",
				policy: "local-write",
				status: "ready",
			},
		});
	});

	test("applies planned command-line transitions", () => {
		const current = {
			active: true,
			prompt: "file-operation-destination",
			value: "/tmp/copy.md",
		};
		expect(
			applyFileOperationCommandLineTransition(current, { action: "keep" }),
		).toBe(current);
		expect(
			applyFileOperationCommandLineTransition(current, { action: "close" }),
		).toEqual({
			active: false,
			prompt: "file-operation-destination",
			value: "",
		});
		expect(
			applyFileOperationCommandLineTransition(current, {
				action: "open",
				prompt: "file-operation-confirm",
			}),
		).toEqual({
			active: true,
			prompt: "file-operation-confirm",
			value: "",
		});
	});
});
