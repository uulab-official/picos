import { describe, expect, test } from "bun:test";
import {
	getAppInputOverlay,
	getEditorWorkspaceCommand,
	getGlobalHotkeyCommand,
	getGlobalNavigationCommand,
	getStatusWorkspaceCommand,
	getToolsWorkspaceCommand,
	getWorkspaceEnterCommand,
	getWorkspaceInputFamily,
	prepareGlobalHotkeyInput,
	prepareGlobalNavigationInput,
	prepareWorkspaceEnterInput,
} from "../src/tui/appInputDispatcher";

describe("App input dispatcher", () => {
	test("preserves modal input precedence", () => {
		expect(
			getAppInputOverlay({
				commandLineActive: true,
				paletteActive: true,
				fileOperationDialogActive: true,
				fileFilterActive: true,
			}),
		).toBe("command-line");
		expect(
			getAppInputOverlay({
				commandLineActive: false,
				paletteActive: true,
				fileOperationDialogActive: true,
				fileFilterActive: true,
			}),
		).toBe("palette");
		expect(
			getAppInputOverlay({
				commandLineActive: false,
				paletteActive: false,
				fileOperationDialogActive: true,
				fileFilterActive: true,
			}),
		).toBe("file-operation-dialog");
		expect(
			getAppInputOverlay({
				commandLineActive: false,
				paletteActive: false,
				fileOperationDialogActive: false,
				fileFilterActive: true,
			}),
		).toBe("file-filter");
	});

	test("routes every workspace family without reconstructing screen guards", () => {
		const cases = [
			["files", "workspaces", "files"],
			["processes", "workspaces", "processes"],
			["operations", "workspaces", "operations"],
			["editor", "workspaces", "editor"],
			["routes", "workspaces", "routes"],
			["interfaces", "workspaces", "interfaces"],
			["connections", "workspaces", "endpoints"],
			["ports", "workspaces", "endpoints"],
			["status", "workspaces", "status"],
			["config", "workspaces", "config"],
			["timeline", "workspaces", "timeline"],
			["logs", "workspaces", "logs"],
			["tools", "workspaces", "tools"],
			["dns", "workspaces", "dns"],
			["actions", "workspaces", "actions-workspace"],
			["actions", "actions", "actions-focus"],
			["remotes", "workspaces", "remotes-workspace"],
			["remotes", "remotes", "remotes-focus"],
		] as const;
		for (const [screen, focusArea, expected] of cases) {
			expect(getWorkspaceInputFamily(screen, focusArea)).toBe(expected);
		}
		expect(getWorkspaceInputFamily("dashboard", "workspaces")).toBe("global");
	});

	test("owns global hotkey, enter, and navigation precedence", () => {
		expect(getGlobalHotkeyCommand("C", "actions-focus")).toBe("confirm-action");
		expect(getGlobalHotkeyCommand("x", "actions-focus")).toBe("execute-action");
		expect(getGlobalHotkeyCommand("q", "status")).toBeUndefined();
		expect(getGlobalHotkeyCommand("?", "global")).toBe("open-palette");
		expect(getWorkspaceEnterCommand("\r", {}, "actions-workspace")).toBe(
			"enter-actions-focus",
		);
		expect(
			getWorkspaceEnterCommand("", { return: true }, "remotes-focus"),
		).toBe("select-remote-profile");
		expect(
			getGlobalNavigationCommand({
				input: "j",
				key: {},
				family: "editor",
				hasEditorPreview: false,
			}),
		).toBe("next-screen");
		expect(
			getGlobalNavigationCommand({
				input: "",
				key: { upArrow: true },
				family: "tools",
				hasEditorPreview: false,
			}),
		).toBe("previous-tool");
	});

	test("returns complete navigation effects without App state updaters", () => {
		expect(
			prepareGlobalNavigationInput({
				input: "j",
				key: {},
				screen: "actions",
				focusArea: "actions",
				actionsLength: 3,
				selectedActionIndex: 2,
				remoteProfiles: [],
				selectedRemoteIndex: 0,
				selectedEditorLineIndex: 0,
				toolHistory: [],
				selectedToolHistoryIndex: 0,
				toolHistoryFilter: "",
				toolHistorySort: "time",
				selectedInterfaceIndex: 0,
			}),
		).toEqual({ kind: "action-selection", selectedIndex: 0 });
		expect(
			prepareGlobalNavigationInput({
				input: "2",
				key: {},
				screen: "dashboard",
				focusArea: "workspaces",
				actionsLength: 0,
				selectedActionIndex: 0,
				remoteProfiles: [],
				selectedRemoteIndex: 0,
				selectedEditorLineIndex: 0,
				toolHistory: [],
				selectedToolHistoryIndex: 0,
				toolHistoryFilter: "",
				toolHistorySort: "time",
				selectedInterfaceIndex: 0,
			}),
		).toEqual({
			kind: "workspace",
			focusArea: "workspaces",
			screen: "files",
		});
	});

	test("owns global and focused Enter action resolution", () => {
		expect(
			prepareWorkspaceEnterInput({
				input: "\r",
				key: {},
				family: "actions-workspace",
				actions: [],
				selectedActionIndex: 0,
				remoteProfiles: [],
				selectedRemoteIndex: 0,
			}),
		).toEqual({
			kind: "focus",
			focusArea: "actions",
			notice: { level: "info", message: "actions focus entered" },
		});
		const profile = {
			id: "prod",
			kind: "sftp" as const,
			host: "prod.example.com",
			port: 22,
			username: "deploy",
			root: "/srv/app",
		};
		expect(
			prepareWorkspaceEnterInput({
				input: "\r",
				key: {},
				family: "remotes-focus",
				actions: [],
				selectedActionIndex: 0,
				remoteProfiles: [profile],
				selectedRemoteIndex: 4,
			}),
		).toEqual({
			kind: "select-remote-profile",
			transition: { kind: "stage", profile, selectedIndex: 0 },
		});
		expect(
			prepareGlobalHotkeyInput({
				input: "?",
				family: "global",
				actions: [],
			}),
		).toEqual({
			kind: "open-palette",
			handled: true,
			focusArea: "workspaces",
			notice: { level: "info", message: "command palette opened" },
		});
		expect(
			prepareGlobalHotkeyInput({
				input: "C",
				family: "actions-focus",
				actions: [],
				control: { platform: "darwin", previewPlan: undefined },
			}),
		).toEqual({
			kind: "confirm-action",
			handled: true,
			transition: {
				kind: "blocked",
				notice: {
					level: "warn",
					message: "control confirmation needs a locked action preview first",
				},
			},
		});
		expect(
			prepareGlobalHotkeyInput({
				input: "x",
				family: "actions-focus",
				actions: [],
				control: { platform: "darwin", previewPlan: undefined },
			}),
		).toMatchObject({
			kind: "execute-action",
			handled: true,
			request: {
				start: {
					kind: "blocked",
					notice: {
						message: "control execution needs a locked action preview first",
					},
				},
			},
		});
	});

	test("owns editor key aliases and ignores unrelated keys", () => {
		expect(getEditorWorkspaceCommand("a")).toBe("append");
		expect(getEditorWorkspaceCommand("i")).toBe("insert-before");
		expect(getEditorWorkspaceCommand("o")).toBe("insert-after");
		expect(getEditorWorkspaceCommand("r")).toBe("replace");
		expect(getEditorWorkspaceCommand("x")).toBe("delete");
		expect(getEditorWorkspaceCommand("u")).toBe("undo");
		expect(getEditorWorkspaceCommand("s")).toBe("save");
		expect(getEditorWorkspaceCommand("?")).toBeUndefined();
	});

	test("keeps status key precedence explicit for formerly shadowed bindings", () => {
		expect(getStatusWorkspaceCommand("H", {})).toBe(
			"select-remote-known-hosts-handoff",
		);
		expect(getStatusWorkspaceCommand("J", {})).toBe(
			"select-result-timeline-jump",
		);
		expect(getStatusWorkspaceCommand("[", {})).toBe("move-evidence-previous");
		expect(getStatusWorkspaceCommand("]", {})).toBe("move-evidence-next");
		expect(getStatusWorkspaceCommand("", { tab: true })).toBe(
			"cycle-evidence-focus",
		);
		expect(getStatusWorkspaceCommand("j", {})).toBe("move-cleanup-next");
		expect(getStatusWorkspaceCommand("k", {})).toBe("move-cleanup-previous");
	});

	test("owns tools commands while preserving j/k and arrow fallthrough", () => {
		expect(getToolsWorkspaceCommand("f", {})).toBe("open-filter");
		expect(getToolsWorkspaceCommand("R", {})).toBe("run-target");
		expect(getToolsWorkspaceCommand("", { tab: true })).toBe("cycle-detail");
		expect(getToolsWorkspaceCommand("j", {})).toBeUndefined();
		expect(getToolsWorkspaceCommand("", { downArrow: true })).toBeUndefined();
	});
});
