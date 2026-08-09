import { describe, expect, test } from "bun:test";
import type { ConsoleAuditExportPlan } from "../src/core/auditLog";
import { buildExternalOpenPlan } from "../src/core/externalOpen";
import { buildFileOpenPlan } from "../src/core/fileOpen";
import type { NetworkSummary } from "../src/core/types";
import {
	createUpdateReleaseHandoff,
	type PackageUpdateCheckResult,
} from "../src/core/updateCheck";
import {
	classifyInterfaceEvidencePresetPersistenceFailure,
	classifyToolCommandRunOutcome,
	formatAppIoCompletionMessage,
	formatAppIoFailureMessage,
	formatToolsInputFailureMessage,
	prepareCleanupHandoffDismissal,
	prepareCleanupHandoffExport,
	prepareCleanupHandoffPrompt,
	prepareClipboardConfirmationOpen,
	prepareEditorPromptOpen,
	prepareEditorSaveSubmission,
	prepareExternalOpenSubmission,
	prepareFileOpenSubmission,
	prepareInterfaceEvidencePresetCycle,
	prepareInterfaceEvidencePresetSave,
	prepareInterfaceEvidenceSearchPrompt,
	prepareInterfaceEvidenceSearchSubmission,
	prepareInterfaceEvidenceStateFilterCycle,
	prepareRouteDestinationSubmission,
	prepareSelectedUpdateHandoffClipboard,
	prepareSelectedUpdateHandoffExternalOpen,
	prepareStatusActivityResultHistoryFilterCycle,
	prepareStatusActivityResultTimelineJumpFilterCycle,
	prepareStatusActivityResultTimelineJumpSelection,
	prepareToolCommandSubmission,
	prepareToolEvidenceFilterCycle,
	prepareToolEvidenceSearchPrompt,
	prepareToolEvidenceSearchSubmission,
	prepareToolHistoryCleanupSubmission,
	prepareToolHistoryFilterSubmission,
	resolveRecoveredEvidenceResultOptions,
} from "../src/tui/appOwners";
import {
	type CleanupHandoffHistory,
	createCleanupHandoffHistoryExportPlan,
	createCleanupJumpAuditFromHistory,
} from "../src/tui/cleanupIndex";
import { createClipboardPreview } from "../src/tui/clipboardPreview";
import { createEditorBuffer } from "../src/tui/editorBuffer";
import type { StatusActivityResult } from "../src/tui/statusActivityQueue";
import type { ToolHistoryExportIndex } from "../src/tui/toolHistory";

const summary: NetworkSummary = {
	status: "online",
	host: "demo.local",
	platform: "darwin",
	interfaces: [
		{
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.0.2.10",
			mac: "00:11:22:33:44:55",
			rxBytes: 1,
			txBytes: 1,
		},
	],
	networkGroups: [],
	dnsServers: [],
	publicIp: "203.0.113.10",
};

const updateCheckResult: PackageUpdateCheckResult = {
	packageName: "@uulab/picos",
	currentVersion: "0.2.0",
	latestVersion: "0.2.1",
	status: "update-available",
	registryUrl: "https://registry.npmjs.org/@uulab/picos",
};

const editorPreview = createEditorBuffer({
	path: "/tmp/demo.txt",
	content: "one\n",
	truncated: false,
});
editorPreview.content = "two\n";
editorPreview.editHistory = ["one\n"];

const interfaceEvidenceActive: ConsoleAuditExportPlan[] = [
	{
		path: "/tmp/picos-audit-interface-active.log",
		content: "active",
		eventCount: 1,
	},
];

const interfaceEvidenceArchived: ConsoleAuditExportPlan[] = [
	{
		path: "/tmp/picos-audit-interface-archived.log",
		content: "archived",
		eventCount: 1,
	},
];

const toolExportIndex: ToolHistoryExportIndex = {
	baseDir: "/tmp",
	items: [
		{
			fileName: "picos-tools-all-20260701T040100000Z.md",
			generatedAt: "2026-07-01T04:01:00.000Z",
			path: "/tmp/picos-tools-all-20260701T040100000Z.md",
			runCount: 3,
			scope: "all",
		},
	],
};

const cleanupHistory: CleanupHandoffHistory[] = [
	{
		id: "logs",
		label: "Logs",
		outcome: "prompt-opened",
		workspace: "Logs",
		screen: "logs",
		shortcut: "l",
		confirmationPhrase: "clear logs",
		count: 3,
		detail: "cleanup handoff Logs: press l then type clear logs",
	},
];

describe("App orchestration transitions", () => {
	test("owns asynchronous I/O completion and failure wording", () => {
		expect(formatAppIoFailureMessage("config save", new Error("denied"))).toBe(
			"config save failed denied",
		);
		expect(
			formatAppIoCompletionMessage({
				kind: "endpoint-export",
				endpoint: "ports",
				view: "filtered",
				path: "/tmp/ports.md",
			}),
		).toBe("ports exported filtered /tmp/ports.md");
		expect(formatToolsInputFailureMessage("preset save failed", "denied")).toBe(
			"preset save failed denied",
		);
	});

	test("prepares route destination submission and cancellation notices", () => {
		expect(prepareRouteDestinationSubmission("   ")).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "info", message: "route path command cancelled" },
		});
		expect(prepareRouteDestinationSubmission(" 1.1.1.1 ")).toEqual({
			kind: "run",
			closeCommandLine: true,
			destination: "1.1.1.1",
		});
	});

	test("prepares tool command plans from the typed prompt registry", () => {
		expect(
			prepareToolCommandSubmission({
				prompt: "tool:unknown.tool",
				value: "example.com",
				defaultPingHost: "example.com",
				summary,
			}),
		).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "unknown tool action unknown.tool" },
		});
		expect(
			prepareToolCommandSubmission({
				prompt: "tool:tools.dns",
				value: "openai.com",
				defaultPingHost: "example.com",
				summary,
			}),
		).toMatchObject({
			kind: "run",
			closeCommandLine: true,
			plan: {
				actionId: "tools.dns",
				toolId: "dns",
				args: ["openai.com"],
				label: "DNS lookup openai.com",
			},
		});
	});

	test("owns tool execution and interface preset persistence notices", () => {
		expect(
			classifyToolCommandRunOutcome({
				label: "DNS lookup openai.com",
				outcome: { kind: "success" },
			}),
		).toEqual({ level: "ok", message: "DNS lookup openai.com completed" });
		expect(
			classifyToolCommandRunOutcome({
				label: "DNS lookup openai.com",
				outcome: { kind: "failure", error: "collector failed" },
			}),
		).toEqual({ level: "fail", message: "collector failed" });
		expect(
			classifyInterfaceEvidencePresetPersistenceFailure(
				new Error("config write failed"),
			),
		).toEqual({ level: "fail", message: "config write failed" });
	});

	test("owns editor save confirmation guards", () => {
		expect(
			prepareEditorSaveSubmission({
				editorPreview: undefined,
				confirmation: "save file",
			}),
		).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "open a text file before saving" },
		});
		expect(
			prepareEditorSaveSubmission({ editorPreview, confirmation: "not it" }),
		).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "editor save confirmation rejected" },
		});
		expect(
			prepareEditorSaveSubmission({
				editorPreview,
				confirmation: " save file ",
			}),
		).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: {
				level: "warn",
				message: "editor save confirmation rejected",
			},
		});
		expect(
			prepareEditorSaveSubmission({
				editorPreview,
				confirmation: "save file",
			}),
		).toEqual({ kind: "execute", closeCommandLine: true, editorPreview });
	});

	test("owns editor prompt guards and notices", () => {
		expect(
			prepareEditorPromptOpen({
				command: "insert-before",
				editorPreview: undefined,
				selectedLineIndex: 2,
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "open a text file before inserting lines",
			},
		});
		expect(
			prepareEditorPromptOpen({
				command: "replace",
				editorPreview,
				selectedLineIndex: 2,
			}),
		).toEqual({
			kind: "open",
			prompt: "editor-replace",
			notice: { level: "info", message: "editor replace line 3 opened" },
		});
	});

	test("owns tool history filter and cleanup submissions", () => {
		expect(
			prepareToolHistoryFilterSubmission({
				history: [
					{
						id: "tool-1",
						time: "2026-08-08T00:00:00.000Z",
						status: "ok",
						label: "DNS lookup",
						plan: {
							actionId: "tools.dns",
							toolId: "dns",
							args: ["openai.com"],
							label: "DNS lookup",
						},
						title: "DNS lookup",
						summary: "openai.com resolved",
						rawOutput: "ok",
					},
				],
				value: "openai",
			}),
		).toMatchObject({
			closeCommandLine: true,
			filter: "openai",
			selectedIndex: 0,
			copyPreview: false,
			persistPreset: true,
			notice: { level: "info", message: "tools filter openai matches 1" },
		});
		expect(
			prepareToolHistoryCleanupSubmission(["dns", "tls"], "wrong"),
		).toEqual({
			kind: "notice",
			closeCommandLine: true,
			copyPreview: false,
			notice: {
				level: "warn",
				message: "tool history filter cleanup rejected",
			},
		});
		expect(
			prepareToolHistoryCleanupSubmission(
				["dns", "tls"],
				"clear tools history",
			),
		).toEqual({
			kind: "apply",
			closeCommandLine: true,
			copyPreview: false,
			presets: [],
			notice: {
				level: "info",
				message: "tool history filter cleanup removed 2 presets",
			},
		});
	});

	test("opens clipboard confirmations and selected update handoff actions", () => {
		expect(prepareClipboardConfirmationOpen(undefined)).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no clipboard value selected" },
		});
		const preview = createClipboardPreview({
			source: "update-handoff",
			label: "GitHub Release",
			copyText: "https://example.com/release",
		});
		expect(prepareClipboardConfirmationOpen(preview)).toMatchObject({
			kind: "open",
			prompt: "clipboard",
			notice: {
				level: "info",
				message: "clipboard confirmation opened for GitHub Release",
			},
		});

		expect(prepareSelectedUpdateHandoffClipboard(undefined, 0)).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no update handoff link selected" },
		});
		const handoff = createUpdateReleaseHandoff(updateCheckResult);
		expect(prepareSelectedUpdateHandoffClipboard(handoff, 1)).toMatchObject({
			kind: "copy",
			prompt: "clipboard",
			preview: { label: "GitHub Release" },
		});
		expect(
			prepareSelectedUpdateHandoffExternalOpen(handoff, 2, "darwin"),
		).toMatchObject({
			kind: "open",
			prompt: "external-open",
			plan: { label: "CHANGELOG", confirmed: false },
		});
	});

	test("owns external and file open submit guards", () => {
		expect(prepareExternalOpenSubmission(undefined, "", "darwin")).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "external open missing preview" },
		});
		const externalPlan = buildExternalOpenPlan({
			source: "update-handoff",
			label: "GitHub Release",
			url: "https://example.com/release",
			platform: "darwin",
		});
		expect(
			prepareExternalOpenSubmission(externalPlan, "open link", "darwin"),
		).toMatchObject({
			kind: "execute",
			closeCommandLine: true,
			plan: { label: "GitHub Release" },
		});

		expect(prepareFileOpenSubmission(undefined, "", "/tmp", "darwin")).toEqual({
			kind: "notice",
			closeCommandLine: true,
			notice: { level: "warn", message: "file open missing preview" },
		});
		const filePlan = buildFileOpenPlan({
			baseDir: "/tmp",
			source: "route-handoff",
			label: "route table",
			path: "/tmp/route.md",
			platform: "darwin",
		});
		expect(
			prepareFileOpenSubmission(filePlan, "open file", "/tmp", "darwin"),
		).toMatchObject({
			kind: "execute",
			closeCommandLine: true,
			plan: { label: "route table" },
		});
	});

	test("owns tools evidence filter and search transitions", () => {
		expect(
			prepareToolEvidenceFilterCycle({
				origin: "palette",
				selectedKind: "tools",
				filter: "all",
			}),
		).toEqual({
			target: "active",
			filter: "compare",
			selectedIndex: 0,
			selectedKind: "tools",
			notice: {
				level: "info",
				message: "tools evidence filter compare via palette",
			},
		});
		expect(prepareToolEvidenceSearchPrompt("tools-archive", "palette")).toEqual(
			{
				prompt: "tools-evidence-search",
				selectedKind: "tools-archive",
				screen: "status",
				focusArea: "workspaces",
				notice: {
					level: "info",
					message: "tools archive evidence search prompt opened via palette",
				},
			},
		);
		expect(
			prepareToolEvidenceSearchSubmission({
				value: "040100",
				selectedKind: "tools",
				activeIndex: toolExportIndex,
				activeFilter: "all",
				archiveIndex: { baseDir: "/tmp", items: [] },
				archiveFilter: "all",
			}),
		).toMatchObject({
			target: "active",
			query: "040100",
			selectedIndex: 0,
			selectedKind: "tools",
			closeCommandLine: true,
			result: {
				source: "evidence",
				action: "tools-evidence-search",
			},
		});
	});

	test("owns interface evidence filter, prompt, search, and preset transitions", () => {
		expect(
			prepareInterfaceEvidenceStateFilterCycle({
				origin: "palette",
				state: "all",
				query: "wifi",
				activeExports: interfaceEvidenceActive,
				archivedExports: interfaceEvidenceArchived,
			}),
		).toMatchObject({
			state: "active",
			selectedIndex: 0,
			selectedKind: "interface",
			screen: "status",
			focusArea: "workspaces",
			result: { action: "interface-evidence-filter" },
		});
		expect(prepareInterfaceEvidenceSearchPrompt("wifi", "palette")).toEqual({
			prompt: "interface-evidence-search",
			value: "wifi",
			selectedKind: "interface",
			screen: "status",
			focusArea: "workspaces",
			notice: {
				level: "info",
				message: "interface evidence search prompt opened via palette",
			},
		});
		expect(
			prepareInterfaceEvidenceSearchSubmission({
				value: "wifi rejected",
				state: "all",
				activeExports: interfaceEvidenceActive,
				archivedExports: interfaceEvidenceArchived,
			}),
		).toMatchObject({
			query: "wifi rejected",
			selectedIndex: 0,
			selectedKind: "interface",
			closeCommandLine: true,
			result: { action: "interface-evidence-find" },
		});
		expect(prepareInterfaceEvidencePresetSave("", ["saved"])).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no interface evidence query to save" },
		});
		expect(
			prepareInterfaceEvidencePresetSave("wifi", [], "palette"),
		).toMatchObject({
			notice: {
				message:
					"interface evidence search preset saved wifi count=1 via palette",
			},
		});
		expect(
			prepareInterfaceEvidencePresetCycle({
				query: "",
				presets: [],
				state: "all",
				activeExports: interfaceEvidenceActive,
				archivedExports: interfaceEvidenceArchived,
				origin: "palette",
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no interface evidence search presets",
			},
		});
	});

	test("owns status activity result filter and jump transitions", () => {
		const history: StatusActivityResult[] = [
			{
				source: "release",
				action: "cycle-release-link",
				message: "release",
			},
			{
				source: "evidence",
				action: "tools-evidence-search",
				message: "tools evidence",
			},
		];
		expect(
			prepareStatusActivityResultHistoryFilterCycle(history, "all", "palette"),
		).toMatchObject({
			filter: "palette-result-jumps",
			selectedIndex: 0,
			screen: "status",
			focusArea: "workspaces",
		});
		expect(
			prepareStatusActivityResultTimelineJumpFilterCycle(
				history,
				"all",
				"palette",
			),
		).toMatchObject({
			filter: "process",
			screen: "status",
			focusArea: "workspaces",
		});
		expect(resolveRecoveredEvidenceResultOptions(99, 0)).toEqual({
			selectedIndex: 0,
			total: 1,
		});
		expect(
			prepareStatusActivityResultTimelineJumpSelection({
				history: [],
				selectedIndex: 0,
				filter: "all",
				origin: "palette",
			}),
		).toEqual({
			kind: "notice",
			screen: "status",
			focusArea: "workspaces",
			notice: { level: "warn", message: "no status activity result history" },
			result: {
				source: "timeline",
				action: "timeline-selected-copy",
				detail: "no Status result Timeline jump selected",
				message: "palette status result jump select unavailable",
			},
		});
	});

	test("owns cleanup handoff prompt, dismissal, and export guards", () => {
		const audit = createCleanupJumpAuditFromHistory(cleanupHistory[0]);
		expect(prepareCleanupHandoffPrompt(undefined, "status")).toEqual({
			kind: "no-op",
		});
		expect(prepareCleanupHandoffPrompt(audit, "logs")).toMatchObject({
			kind: "open",
			prompt: "logs-cleanup",
			notice: {
				level: "info",
				message: "cleanup handoff prompt opened Logs; type clear logs",
			},
		});
		expect(prepareCleanupHandoffDismissal(undefined, "status")).toEqual({
			kind: "no-op",
		});
		expect(prepareCleanupHandoffDismissal(audit, "logs")).toMatchObject({
			kind: "dismiss",
			notice: {
				level: "info",
				message:
					"cleanup handoff dismissed Logs; normal Logs controls restored",
			},
		});
		const exportPlan = createCleanupHandoffHistoryExportPlan(
			cleanupHistory,
			0,
			{
				baseDir: "/tmp",
				scope: "all",
			},
		);
		expect(exportPlan).toBeTruthy();
		expect(
			prepareCleanupHandoffExport([], 0, {
				baseDir: "/tmp",
				scope: "all",
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no cleanup handoff history to export",
			},
		});
	});
});
