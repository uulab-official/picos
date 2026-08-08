import { describe, expect, test } from "bun:test";
import type { FileEntry, FileLocation } from "../src/core/files";
import {
	classifyFileLoadOutcome,
	classifyFilePreviewOutcome,
	prepareActiveFileFilterInput,
	prepareFileHistoryNavigation,
	prepareFileLocationNavigation,
	prepareFilePathCommand,
	prepareFileWorkspaceCommandLineInput,
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

const remoteContext = {
	id: "staging",
	kind: "sftp" as const,
	label: "staging",
	root: "/srv/app",
	status: "connected read-only" as const,
	writes: "locked" as const,
	hostKeyFingerprint: "SHA256:reviewed",
};

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

	test("delegates active Files operation command lines without a component fallback", () => {
		const dialog = {
			active: true as const,
			preview: {
				kind: "delete" as const,
				title: "Delete file",
				path: file.path,
				targetHint: "selected path will be removed",
				risk: "destructive" as const,
				privilege: "user" as const,
				confirmationPhrase: "delete file",
				executable: false,
				reason: "confirmation-required",
			},
		};
		expect(
			prepareFileWorkspaceCommandLineInput({
				commandLine: {
					active: true,
					prompt: "file-operation-confirm",
					value: "delete file",
				},
				dialog,
				input: "\r",
				return: true,
			}),
		).toMatchObject({ action: "apply", submit: "confirmation", dialog });
		expect(
			prepareFileWorkspaceCommandLineInput({
				commandLine: { active: true, prompt: "path", value: "/tmp" },
				dialog,
				input: "",
				escape: true,
			}),
		).toEqual({ action: "unhandled" });
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
			publishError: true,
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

	test("keeps shared current-error publication ordered across load and preview", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 4,
				requestToken: 4,
				currentErrorRequestToken: 8,
				errorRequestToken: 7,
				request: { path: "/workspace" },
				outcome: {
					status: "success",
					resolvedRoot: "/workspace",
					entries: [file],
				},
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toMatchObject({ status: "success", clearError: false });

		expect(
			classifyFilePreviewOutcome({
				currentRequestToken: 3,
				requestToken: 3,
				currentErrorRequestToken: 9,
				errorRequestToken: 8,
				entry: file,
				openEditor: false,
				outcome: { status: "failure", error: "late preview" },
			}),
		).toEqual({
			status: "failure",
			error: "file preview failed late preview",
			notice: { level: "fail", message: "file preview failed late preview" },
			publishError: false,
		});

		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 5,
				requestToken: 5,
				currentErrorRequestToken: 10,
				errorRequestToken: 10,
				request: { path: "/workspace" },
				outcome: { status: "failure", error: "current load" },
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({
			status: "failure",
			error: "file load failed current load",
			notice: { level: "fail", message: "file load failed current load" },
			publishError: true,
		});
	});

	test("keeps the connected provider batch intact when disconnect listing fails", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 6,
				requestToken: 6,
				currentProviderGeneration: 2,
				requestProviderGeneration: 2,
				providerSession: { generation: 2, kind: "local" },
				request: {
					path: "/workspace",
					backHistory: [],
					forwardHistory: [],
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
			publishError: true,
			commitProviderSession: false,
			notice: {
				level: "fail",
				message: "local filesystem restore failed permission denied",
			},
		});
	});

	test("publishes local-to-SFTP and SFTP-to-local switches as listing batches", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 7,
				requestToken: 7,
				currentProviderGeneration: 3,
				requestProviderGeneration: 3,
				providerSession: {
					generation: 3,
					kind: "sftp",
					remoteContext,
				},
				request: { path: "/srv/app", backHistory: [], forwardHistory: [] },
				outcome: {
					status: "success",
					resolvedRoot: "/srv/app",
					entries: [file],
				},
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toMatchObject({
			status: "success",
			commitProviderSession: true,
			root: "/srv/app",
			entries: [file],
			backHistory: [],
			forwardHistory: [],
			providerSession: {
				generation: 3,
				kind: "sftp",
				remoteContext,
			},
		});

		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 8,
				requestToken: 8,
				currentProviderGeneration: 4,
				requestProviderGeneration: 4,
				providerSession: { generation: 4, kind: "local" },
				request: { path: "/workspace", backHistory: [], forwardHistory: [] },
				outcome: {
					status: "success",
					resolvedRoot: "/workspace",
					entries: [directory],
				},
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toMatchObject({
			status: "success",
			commitProviderSession: true,
			root: "/workspace",
			entries: [directory],
			backHistory: [],
			forwardHistory: [],
			providerSession: { generation: 4, kind: "local" },
		});
	});

	test("rejects a delayed old-provider refresh after a provider switch", () => {
		expect(
			classifyFileLoadOutcome({
				currentRequestToken: 9,
				requestToken: 9,
				currentProviderGeneration: 5,
				requestProviderGeneration: 4,
				request: { path: "/workspace", keepSelection: true },
				outcome: {
					status: "success",
					resolvedRoot: "/workspace",
					entries: [file],
				},
				selectedIndex: 0,
				selectedLocationIndex: 0,
				locations,
			}),
		).toEqual({ status: "stale" });
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
