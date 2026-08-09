import { describe, expect, test } from "bun:test";
import { defaultConfig } from "../src/config/schema";
import type { FileEntry, FileProvider } from "../src/core/files";
import { createRemoteKnownHostsCandidatePreview } from "../src/core/remotes";
import { startReadOnlySftpConnectionDiagnostic } from "../src/core/sftp";
import type { NetworkSummary, SftpRemoteProfile } from "../src/core/types";
import {
	type CommandPrompt,
	type CommandSubmitEffect,
	getCommandPromptExamples,
	openCommandLine,
	prepareCommandSubmit,
} from "../src/tui/commandLine";
import {
	type CommandSubmitContext,
	type CommandSubmitResolvedHandlers,
	dispatchCommandSubmitEffect,
	prepareCommandSubmitEffect,
	prepareCommandSubmitEffectFromTable,
} from "../src/tui/commandSubmitTransitions";
import { createConfigWorkspaceItems } from "../src/tui/configPanel";
import { createEditorBuffer } from "../src/tui/editorBuffer";
import { openFileOperationDialog } from "../src/tui/fileOperationDialog";

const summary: NetworkSummary = {
	status: "online",
	host: "demo.local",
	platform: "darwin",
	interfaces: [],
	networkGroups: [],
	dnsServers: ["1.1.1.1"],
};

const remoteProfile: SftpRemoteProfile = {
	id: "prod",
	kind: "sftp",
	host: "prod.example.com",
	port: 2222,
	username: "deploy",
	root: "/srv/app",
};

const remoteKnownHostsLine =
	"[prod.example.com]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPicosCommandSubmit";

const fileEntry: FileEntry = {
	name: "README.md",
	path: "/workspace/picos/README.md",
	type: "file",
	readonly: false,
};

const fileProvider: FileProvider = {
	kind: "local",
	pwd: async () => "/workspace/picos",
	list: async () => [],
	read: async (path) => ({
		path,
		content: "",
		encoding: "utf8",
		truncated: false,
	}),
	write: async () => {},
	stat: async (path) => ({
		name: "README.md",
		path,
		type: "file",
		readonly: false,
	}),
};

const configItems = createConfigWorkspaceItems(defaultConfig);
const defaultPingHostIndex = configItems.findIndex(
	(item) => item.key === "defaultPingHost",
);

const auditIndex = { baseDir: "/tmp/picos", items: [] };
const cleanupIndex = { baseDir: "/tmp/picos", items: [] };
const toolIndex = { baseDir: "/tmp/picos", items: [] };

type ContextTable = {
	[Effect in CommandSubmitEffect]: Extract<
		CommandSubmitContext,
		{ effect: Effect }
	>;
};

const contextByEffect = {
	"submit-path": {
		effect: "submit-path",
		snapshot: { root: "/workspace/picos", backHistory: [], forwardHistory: [] },
	},
	"submit-clipboard": {
		effect: "submit-clipboard",
		snapshot: {
			state: { active: false, value: "" },
			platform: "darwin",
		},
	},
	"submit-route-destination": { effect: "submit-route-destination" },
	"submit-route-filter": {
		effect: "submit-route-filter",
		snapshot: { routes: [], presets: [] },
	},
	"submit-route-filter-cleanup": {
		effect: "submit-route-filter-cleanup",
		snapshot: { presets: [] },
	},
	"submit-tool-history-filter": {
		effect: "submit-tool-history-filter",
		snapshot: { history: [] },
	},
	"submit-tool-history-cleanup": {
		effect: "submit-tool-history-cleanup",
		snapshot: { presets: [] },
	},
	"submit-tool-target-label": {
		effect: "submit-tool-target-label",
		snapshot: { presets: [], targetPresets: [], selectedIndex: 0 },
	},
	"submit-tool-target-value": {
		effect: "submit-tool-target-value",
		snapshot: { presets: [], targetPresets: [], selectedIndex: 0 },
	},
	"submit-tool-target-action": {
		effect: "submit-tool-target-action",
		snapshot: { presets: [], targetPresets: [], selectedIndex: 0 },
	},
	"submit-tool-target-cleanup": {
		effect: "submit-tool-target-cleanup",
		snapshot: { presets: [], targetPresets: [], selectedIndex: 0 },
	},
	"submit-tool-target-preset": {
		effect: "submit-tool-target-preset",
		snapshot: {
			presets: [],
			targetPresets: [],
			selectedIndex: 0,
			limit: 12,
		},
	},
	"submit-remote-profile": { effect: "submit-remote-profile" },
	"submit-remote-connect": {
		effect: "submit-remote-connect",
		snapshot: { profiles: [], selectedIndex: 0, startedAt: 0 },
	},
	"submit-remote-host-trust": {
		effect: "submit-remote-host-trust",
		snapshot: { profiles: [], selectedIndex: 0 },
	},
	"submit-remote-host-key-evidence": {
		effect: "submit-remote-host-key-evidence",
		snapshot: { profiles: [], selectedIndex: 0 },
	},
	"submit-remote-known-hosts-candidate": {
		effect: "submit-remote-known-hosts-candidate",
		snapshot: { profiles: [], selectedIndex: 0 },
	},
	"submit-remote-known-hosts-paste": {
		effect: "submit-remote-known-hosts-paste",
		snapshot: { profiles: [], selectedIndex: 0 },
	},
	"submit-remote-known-hosts-selection": {
		effect: "submit-remote-known-hosts-selection",
		snapshot: { profiles: [], selectedIndex: 0 },
	},
	"submit-endpoint-filter": {
		effect: "submit-endpoint-filter",
		snapshot: {
			connections: { kind: "connections", rows: [], presets: [] },
			ports: { kind: "ports", rows: [], presets: [] },
		},
	},
	"submit-endpoint-filter-cleanup": {
		effect: "submit-endpoint-filter-cleanup",
		snapshot: {
			connections: { presets: [], rowCount: 0 },
			ports: { presets: [], rowCount: 0 },
		},
	},
	"submit-timeline-search": {
		effect: "submit-timeline-search",
		snapshot: { events: [], filter: "all", presets: [] },
	},
	"submit-timeline-search-cleanup": {
		effect: "submit-timeline-search-cleanup",
		snapshot: { presets: [] },
	},
	"submit-log-search": {
		effect: "submit-log-search",
		snapshot: { entries: [], level: "all", presets: [] },
	},
	"submit-logs-cleanup": {
		effect: "submit-logs-cleanup",
		snapshot: { presets: [], profiles: [] },
	},
	"submit-control-confirmation": {
		effect: "submit-control-confirmation",
		snapshot: { previewPlan: undefined, platform: "darwin" },
	},
	"submit-port-process-control": {
		effect: "submit-port-process-control",
		snapshot: {
			ports: [],
			selectedIndex: 0,
			platform: "darwin",
			policy: { mode: "disabled", allowAdminDryRun: false },
		},
	},
	"submit-external-open": {
		effect: "submit-external-open",
		snapshot: { plan: undefined, platform: "darwin" },
	},
	"submit-file-open": {
		effect: "submit-file-open",
		snapshot: {
			plan: undefined,
			baseDir: "/tmp/picos",
			platform: "darwin",
		},
	},
	"submit-cleanup-export-archive": {
		effect: "submit-cleanup-export-archive",
		snapshot: { preview: undefined, baseDir: cleanupIndex.baseDir },
	},
	"submit-tool-export-archive": {
		effect: "submit-tool-export-archive",
		snapshot: { preview: undefined },
	},
	"submit-audit-export-archive": {
		effect: "submit-audit-export-archive",
		snapshot: {
			preview: undefined,
			baseDir: auditIndex.baseDir,
			scope: "all",
		},
	},
	"submit-audit-archive-retention": {
		effect: "submit-audit-archive-retention",
		snapshot: { preview: undefined, auditIndex, scope: "all" },
	},
	"submit-tools-archive-retention": {
		effect: "submit-tools-archive-retention",
		snapshot: { preview: undefined, index: toolIndex },
	},
	"submit-tools-evidence-search": {
		effect: "submit-tools-evidence-search",
		snapshot: {
			selectedKind: "tools",
			activeIndex: toolIndex,
			activeFilter: "any",
			archiveIndex: toolIndex,
			archiveFilter: "any",
		},
	},
	"submit-interface-evidence-search": {
		effect: "submit-interface-evidence-search",
		snapshot: { state: "all", activeExports: [], archivedExports: [] },
	},
	"submit-dns-proposal": {
		effect: "submit-dns-proposal",
		snapshot: { selectedIndex: 0, summary },
	},
	"submit-interface-confirmation": {
		effect: "submit-interface-confirmation",
		snapshot: { proposal: undefined },
	},
	"submit-config-reset": {
		effect: "submit-config-reset",
		snapshot: {
			preview: undefined,
			resetValues: defaultConfig,
		},
	},
	"submit-editor-append": {
		effect: "submit-editor-append",
		snapshot: { buffer: undefined, selectedLineIndex: 0 },
	},
	"submit-editor-insert-before": {
		effect: "submit-editor-insert-before",
		snapshot: { buffer: undefined, selectedLineIndex: 0 },
	},
	"submit-editor-insert-after": {
		effect: "submit-editor-insert-after",
		snapshot: { buffer: undefined, selectedLineIndex: 0 },
	},
	"submit-editor-replace": {
		effect: "submit-editor-replace",
		snapshot: { buffer: undefined, selectedLineIndex: 0 },
	},
	"submit-editor-save": {
		effect: "submit-editor-save",
		snapshot: {
			editorPreview: undefined,
			provider: fileProvider,
			policy: { mode: "disabled" },
		},
	},
	"submit-config-text": {
		effect: "submit-config-text",
		snapshot: { items: configItems, selectedIndex: defaultPingHostIndex },
	},
	"submit-tool": {
		effect: "submit-tool",
		snapshot: { defaultPingHost: "example.com", summary },
	},
	"submit-file-operation-destination": {
		effect: "submit-file-operation-destination",
		snapshot: { dialog: { active: false } },
	},
	"submit-file-operation-confirmation": {
		effect: "submit-file-operation-confirmation",
		snapshot: {
			dialog: { active: false },
			provider: fileProvider,
			policy: { mode: "disabled" },
		},
	},
} satisfies ContextTable;

function submission(prompt: CommandPrompt, value = "") {
	const resolved = prepareCommandSubmit(
		openCommandLine(prompt, { value, fieldIndex: 0 }),
	);
	if (!resolved) throw new Error(`unregistered command prompt ${prompt}`);
	return resolved;
}

describe("command submit owner", () => {
	test("resolves every registered prompt through an exhaustive context table", () => {
		for (const prompt of getCommandPromptExamples()) {
			const command = submission(prompt);
			const effect = prepareCommandSubmitEffect(
				command,
				contextByEffect[command.effect],
			);

			expect(effect.kind).toBe("resolved");
			expect(effect.effect).toBe(command.effect);
			expect(effect.owner).toBe(command.owner);
			if (effect.kind === "resolved") {
				expect(effect.transition).toBeDefined();
			}
		}
	});

	test("selects the dynamic endpoint snapshot inside the owner", () => {
		const effect = prepareCommandSubmitEffect(
			submission("endpoint-filter:ports", "443"),
			contextByEffect["submit-endpoint-filter"],
		);

		expect(effect).toMatchObject({
			kind: "resolved",
			effect: "submit-endpoint-filter",
			transition: { scope: "ports", filter: "443" },
		});
	});

	test("dispatches only resolved final transitions", () => {
		const calls: Array<{ effect: string; transition: unknown }> = [];
		const handlers = Object.fromEntries(
			Object.keys(contextByEffect).map((effect) => [
				effect,
				(transition: unknown) => {
					calls.push({ effect, transition });
				},
			]),
		) as unknown as CommandSubmitResolvedHandlers;
		const command = submission("path", "docs");
		const effect = prepareCommandSubmitEffectFromTable(
			command,
			contextByEffect,
			{
				remoteConnectionDiagnostic: undefined,
				remoteConnectionStartedAt: 1_000,
			},
		);

		expect(dispatchCommandSubmitEffect(effect, handlers)).toBeUndefined();
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			effect: "submit-path",
			transition: { action: "load" },
		});

		const guard = prepareCommandSubmitEffect(
			command,
			contextByEffect["submit-clipboard"],
		);
		if (guard.kind !== "owned-guard") {
			throw new Error("expected command submit owner guard");
		}
		expect(guard.notice).toEqual({
			level: "warn",
			message:
				"command submit submit-path blocked context-effect-mismatch owner=fileWorkspaceTransitions",
		});
		expect(dispatchCommandSubmitEffect(guard, handlers)).toEqual(guard);
		expect(calls).toHaveLength(1);
	});

	test("uses the live remote diagnostic and the bound audit scope", () => {
		const diagnostic = {
			...startReadOnlySftpConnectionDiagnostic(
				remoteProfile,
				"SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				undefined,
				1_000,
			),
			status: "connecting" as const,
		};
		const contexts = {
			...contextByEffect,
			"submit-remote-connect": {
				effect: "submit-remote-connect" as const,
				snapshot: {
					profiles: [remoteProfile],
					selectedIndex: 0,
					diagnostic: undefined,
					startedAt: 0,
				},
			},
		};
		const remote = prepareCommandSubmitEffectFromTable(
			submission("remote-connect"),
			contexts,
			{
				remoteConnectionDiagnostic: diagnostic,
				remoteConnectionStartedAt: 2_000,
			},
		);
		expect(remote).toMatchObject({
			kind: "resolved",
			effect: "submit-remote-connect",
			transition: { kind: "blocked", reason: "connection-busy" },
		});

		const audit = prepareCommandSubmitEffect(
			submission("audit-export-archive"),
			{
				effect: "submit-audit-export-archive",
				snapshot: {
					preview: undefined,
					baseDir: auditIndex.baseDir,
					scope: "interface",
				},
			},
		);
		expect(audit).toMatchObject({
			kind: "resolved",
			effect: "submit-audit-export-archive",
			transition: { scope: "interface" },
		});
	});

	test("owns the complete remote connection attempt snapshot", () => {
		const candidate = createRemoteKnownHostsCandidatePreview(
			remoteProfile,
			remoteKnownHostsLine,
		);
		const contexts = {
			...contextByEffect,
			"submit-remote-connect": {
				effect: "submit-remote-connect" as const,
				snapshot: {
					profiles: [remoteProfile],
					selectedIndex: 0,
					candidateSession: { prod: candidate },
					diagnostic: undefined,
					startedAt: 0,
				},
			},
		};
		const effect = prepareCommandSubmitEffectFromTable(
			submission("remote-connect", "connect remote prod"),
			contexts,
			{
				remoteConnectionDiagnostic: undefined,
				remoteConnectionStartedAt: 2_000,
			},
		);

		expect(effect).toMatchObject({
			kind: "resolved",
			effect: "submit-remote-connect",
			transition: {
				kind: "connect",
				attemptDiagnostic: {
					id: "prod",
					status: "connecting",
					attempt: 1,
					startedAt: 2_000,
				},
			},
		});
	});

	test("resolves dynamic config and tool prompts into final writes and run plans", () => {
		const config = prepareCommandSubmitEffect(
			submission("config-defaultPingHost", "api.example.com"),
			contextByEffect["submit-config-text"],
		);
		expect(config).toMatchObject({
			kind: "resolved",
			effect: "submit-config-text",
			transition: {
				kind: "write",
				key: "defaultPingHost",
				value: "api.example.com",
			},
		});

		const tool = prepareCommandSubmitEffect(
			submission("tool:tools.dns", "openai.com"),
			contextByEffect["submit-tool"],
		);
		expect(tool).toMatchObject({
			kind: "resolved",
			effect: "submit-tool",
			transition: {
				kind: "run",
				plan: { actionId: "tools.dns", args: ["openai.com"] },
			},
		});
	});

	test("carries final editor and file-operation execution requests", () => {
		const editorPreview = createEditorBuffer({
			path: "/workspace/picos/README.md",
			content: "before\n",
			truncated: false,
		});
		editorPreview.content = "after\n";
		const editor = prepareCommandSubmitEffect(
			submission("editor-save", "save file"),
			{
				effect: "submit-editor-save",
				snapshot: {
					editorPreview,
					provider: fileProvider,
					policy: { mode: "local-write" },
				},
			},
		);
		expect(editor).toMatchObject({
			kind: "resolved",
			effect: "submit-editor-save",
			transition: {
				kind: "execute",
				execution: {
					provider: fileProvider,
					plan: { status: "ready", path: "/workspace/picos/README.md" },
				},
			},
		});

		const destination = prepareCommandSubmitEffect(
			submission("file-operation-destination", "/tmp/README.md"),
			{
				effect: "submit-file-operation-destination",
				snapshot: { dialog: openFileOperationDialog("copy", fileEntry) },
			},
		);
		if (
			destination.kind !== "resolved" ||
			destination.effect !== "submit-file-operation-destination"
		) {
			throw new Error("expected resolved destination transition");
		}
		const confirmation = prepareCommandSubmitEffect(
			submission("file-operation-confirm", "copy file"),
			{
				effect: "submit-file-operation-confirmation",
				snapshot: {
					dialog: destination.transition.dialog,
					provider: fileProvider,
					policy: { mode: "local-write" },
				},
			},
		);
		expect(confirmation).toMatchObject({
			kind: "resolved",
			effect: "submit-file-operation-confirmation",
			transition: {
				execution: {
					provider: fileProvider,
					plan: {
						kind: "copy",
						status: "ready",
						destination: "/tmp/README.md",
					},
				},
			},
		});
	});

	test("closes over request values before later mutation", () => {
		const command = submission("path", "docs");
		const effect = prepareCommandSubmitEffect(
			command,
			contextByEffect["submit-path"],
		);
		command.request.value = "src";

		expect(effect).toMatchObject({
			kind: "resolved",
			request: { value: "docs" },
			transition: {
				action: "load",
				request: { path: "/workspace/picos/docs" },
			},
		});
	});
});
