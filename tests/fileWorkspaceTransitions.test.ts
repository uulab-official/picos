import { describe, expect, test } from "bun:test";
import type { FileEntry, FileLocation } from "../src/core/files";
import {
	classifyFileLoadOutcome,
	classifyFilePreviewOutcome,
	prepareActiveFileFilterInput,
	prepareFileHistoryNavigation,
	prepareFileLocationNavigation,
	prepareFilePathCommand,
	prepareFileWorkspaceInput,
	prepareParentFileNavigation,
	prepareSelectedFileOpen,
} from "../src/tui/fileWorkspaceTransitions";

const directory: FileEntry = {
	name: "src",
	path: "/workspace/src",
	type: "directory",
	readonly: false,
};

const file: FileEntry = {
	name: "README.md",
	path: "/workspace/README.md",
	type: "file",
	size: 42,
	readonly: false,
};

const locations: FileLocation[] = [
	{ label: "Root", path: "/", kind: "root" },
	{ label: "Workspace", path: "/workspace", kind: "workspace" },
];

describe("Files workspace transitions", () => {
	test("owns active filter input, selection repair, and notices", () => {
		expect(
			prepareActiveFileFilterInput({
				filter: { active: true, query: "read" },
				input: "",
				escape: true,
			}),
		).toEqual({
			filter: { active: false, query: "" },
			selectedIndex: 0,
			notice: { level: "info", message: "file filter cleared" },
		});
		expect(
			prepareActiveFileFilterInput({
				filter: { active: true, query: "read" },
				input: "",
				return: true,
			}),
		).toEqual({
			filter: { active: false, query: "read" },
			selectedIndex: 0,
			notice: { level: "info", message: "file filter applied" },
		});
		expect(
			prepareActiveFileFilterInput({
				filter: { active: true, query: "read" },
				input: "",
				backspace: true,
			}),
		).toEqual({
			filter: { active: true, query: "rea" },
			selectedIndex: 0,
		});
	});

	test("refuses to open an empty selection with an owned notice", () => {
		expect(
			prepareSelectedFileOpen({
				entries: [],
				selectedIndex: 7,
				root: "/workspace",
				backHistory: [],
				forwardHistory: [],
			}),
		).toEqual({
			action: "none",
			notice: { level: "warn", message: "no file selected" },
		});
	});

	test("classifies directory and file selection before I/O", () => {
		expect(
			prepareSelectedFileOpen({
				entries: [directory, file],
				selectedIndex: -3,
				root: "/workspace",
				backHistory: ["/"],
				forwardHistory: ["/workspace/old"],
			}),
		).toEqual({
			action: "load",
			request: {
				path: "/workspace/src",
				backHistory: ["/", "/workspace"],
				forwardHistory: [],
				notice: { level: "info", message: "entered /workspace/src" },
			},
		});

		expect(
			prepareSelectedFileOpen({
				entries: [directory, file],
				selectedIndex: 99,
				root: "/workspace",
				backHistory: [],
				forwardHistory: [],
			}),
		).toEqual({
			action: "preview",
			entry: file,
			openEditor: true,
			notice: { level: "ok", message: "opened README.md" },
		});
	});

	test("publishes a complete current listing batch and clamps selection", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 2,
				requestToken: 2,
				request: {
					path: "/workspace",
					keepSelection: true,
					backHistory: ["/"],
					forwardHistory: [],
					notice: { level: "info", message: "back to /workspace" },
				},
				outcome: {
					status: "success",
					resolvedRoot: "/workspace",
					entries: [directory, file],
				},
				selectedIndex: 9,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({
			status: "success",
			root: "/workspace",
			entries: [directory, file],
			selectedIndex: 1,
			selectedLocationIndex: 1,
			backHistory: ["/"],
			forwardHistory: [],
			clearError: true,
			notice: { level: "info", message: "back to /workspace" },
		});
	});

	test("discards stale listing success and failure publications", () => {
		const request = { path: "/old" };
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 2,
				requestToken: 1,
				request,
				outcome: {
					status: "success",
					resolvedRoot: "/old",
					entries: [file],
				},
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({ status: "stale" });

		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 2,
				requestToken: 1,
				request,
				outcome: { status: "failure", error: new Error("old failure") },
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({
			status: "stale",
			notice: { level: "fail", message: "file load failed old failure" },
		});
	});

	test("keeps current restore failures contextual without publishing stale errors", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 5,
				requestToken: 5,
				request: {
					path: "/",
					failurePrefix: "local filesystem restore failed",
				},
				outcome: { status: "failure", error: "permission denied" },
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({
			status: "failure",
			error: "local filesystem restore failed permission denied",
			notice: {
				level: "fail",
				message: "local filesystem restore failed permission denied",
			},
		});
	});

	test("classifies preview success and stale failure independently", () => {
		expect(
			classifyFilePreviewOutcome({
				currentRequestToken: 3,
				requestToken: 3,
				entry: file,
				openEditor: true,
				notice: { level: "ok", message: "opened README.md" },
				outcome: {
					status: "success",
					read: {
						path: file.path,
						content: "# picos\n",
						encoding: "utf8",
						truncated: false,
					},
				},
			}),
		).toMatchObject({
			status: "success",
			selectedLineIndex: 0,
			clearSaveResult: true,
			clearError: true,
			openEditor: true,
			notice: { level: "ok", message: "opened README.md" },
			buffer: {
				path: file.path,
				content: "# picos\n",
				originalContent: "# picos\n",
			},
		});

		expect(
			classifyFilePreviewOutcome({
				currentRequestToken: 4,
				requestToken: 3,
				entry: file,
				openEditor: true,
				outcome: { status: "failure", error: "late read" },
			}),
		).toEqual({
			status: "stale",
			notice: { level: "fail", message: "file preview failed late read" },
		});
	});

	test("owns Files focus guards, movement, and product bindings", () => {
		expect(
			prepareFileWorkspaceInput({
				screen: "files",
				focusArea: "workspaces",
				input: "\r",
				entries: [directory, file],
				selectedIndex: 0,
				providerKind: "local",
				locationCount: locations.length,
			}),
		).toEqual({
			action: "enter-focus",
			focusArea: "files",
			notice: { level: "info", message: "files focus entered" },
		});

		expect(
			prepareFileWorkspaceInput({
				screen: "files",
				focusArea: "files",
				input: "j",
				entries: [directory, file],
				selectedIndex: 99,
				providerKind: "local",
				locationCount: locations.length,
			}),
		).toEqual({ action: "select", selectedIndex: 0 });

		expect(
			prepareFileWorkspaceInput({
				screen: "files",
				focusArea: "files",
				input: "g",
				entries: [directory, file],
				selectedIndex: 0,
				providerKind: "sftp",
				locationCount: locations.length,
			}),
		).toEqual({
			action: "notice",
			notice: {
				level: "warn",
				message: "close the SFTP session with L before using local locations",
			},
		});

		expect(
			prepareFileWorkspaceInput({
				screen: "dashboard",
				focusArea: "files",
				input: "j",
				entries: [directory, file],
				selectedIndex: 0,
				providerKind: "local",
				locationCount: locations.length,
			}),
		).toEqual({ action: "unhandled" });
	});

	test("prepares parent, history, location, and typed-path loads", () => {
		expect(
			prepareParentFileNavigation({
				root: "/",
				backHistory: [],
				forwardHistory: [],
			}),
		).toEqual({
			action: "none",
			notice: { level: "info", message: "already at filesystem root" },
		});

		expect(
			prepareFileHistoryNavigation({
				direction: "back",
				root: "/workspace/src",
				backHistory: ["/workspace"],
				forwardHistory: [],
			}),
		).toEqual({
			action: "load",
			request: {
				path: "/workspace",
				backHistory: [],
				forwardHistory: ["/workspace/src"],
				notice: { level: "info", message: "back to /workspace" },
			},
		});

		expect(
			prepareFileLocationNavigation({
				locationIndex: 99,
				locations,
				root: "/tmp",
				backHistory: [],
				forwardHistory: ["/old"],
			}),
		).toEqual({
			action: "load",
			request: {
				path: "/workspace",
				backHistory: ["/tmp"],
				forwardHistory: [],
				selectedLocationIndex: 1,
				notice: { level: "info", message: "jumped to Workspace" },
			},
		});

		expect(
			prepareFilePathCommand({
				value: " src ",
				root: "/workspace",
				backHistory: ["/"],
				forwardHistory: ["/old"],
			}),
		).toEqual({
			action: "load",
			request: {
				path: "/workspace/src",
				backHistory: ["/", "/workspace"],
				forwardHistory: [],
				notice: { level: "info", message: "entered /workspace/src" },
			},
		});
	});
});
