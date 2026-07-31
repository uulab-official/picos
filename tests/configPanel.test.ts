import { describe, expect, test } from "bun:test";
import { defaultConfig } from "../src/config/schema";
import {
	adjustConfigWorkspaceItem,
	applyConfigPolicyPreset,
	createConfigManagedShelfFileOpenOrigin,
	createConfigManagedShelfFocusActionPlan,
	createConfigRecoveryDirectPromptPlan,
	createConfigWorkspaceItems,
	createConfigWorkspaceResetPreview,
	formatConfigManagedShelfCleanupBreadcrumbRows,
	formatConfigManagedShelfFocusRows,
	formatConfigManagedShelfHandoffRows,
	formatConfigManagedShelfLandingRows,
	formatConfigManagedShelfLockedDialogBreadcrumbRows,
	formatConfigManagedShelfPromptBreadcrumbRows,
	formatConfigManagedShelfRows,
	formatConfigWorkspaceDetailRows,
	formatConfigWorkspaceRows,
	getConfigManagedShelfActionFocusTarget,
	getConfigManagedShelfFocusPreset,
	getConfigWorkspaceActionFocusKey,
	getConfigWorkspaceEditPrompt,
	getConfigWorkspaceItemIndex,
	getConfigWorkspaceSectionJumpIndex,
	getNextConfigManagedShelfTarget,
	getNextConfigPolicyPreset,
	moveConfigWorkspaceSelection,
	submitConfigWorkspaceResetConfirmation,
	withConfigManagedShelfFocusRows,
} from "../src/tui/configPanel";

describe("config TUI panel", () => {
	test("formats retention controls with a visible selection cursor", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			statusResultJumpClassFilter: "all",
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
		});

		expect(formatConfigWorkspaceRows(items, 1, 11)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/jump  g/G shelf  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"> toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"  statusResultJumpClassFilter all      Status result jump browser class",
			"[4] CONNECTIVITY",
		]);
	});

	test("groups config controls into OS-like sections", () => {
		const items = createConfigWorkspaceItems({
			language: "en",
			refreshInterval: 3000,
			statusResultJumpClassFilter: "process",
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
		});

		expect(items.map((item) => `${item.section}:${item.key}`)).toEqual([
			"retention:auditArchiveRetentionLimit",
			"retention:toolTargetPresetLimit",
			"display:language",
			"display:refreshInterval",
			"display:statusResultJumpClassFilter",
			"connectivity:defaultPingHost",
			"safety:controlExecutionMode",
			"safety:allowAdminDryRun",
			"safety:editorSaveMode",
		]);
		expect(getConfigWorkspaceSectionJumpIndex(items, "display")).toBe(2);
		expect(getConfigWorkspaceSectionJumpIndex(items, "safety")).toBe(6);
		expect(getConfigWorkspaceSectionJumpIndex(items, "retention")).toBe(0);
		expect(getConfigWorkspaceSectionJumpIndex(items, "connectivity")).toBe(5);
		expect(
			getConfigWorkspaceItemIndex(items, "statusResultJumpClassFilter"),
		).toBe(4);
		expect(getConfigWorkspaceActionFocusKey("config.safetyPolicy.focus")).toBe(
			"controlExecutionMode",
		);
		expect(
			getConfigWorkspaceActionFocusKey("config.editorSaveMode.focus"),
		).toBe("editorSaveMode");
		expect(
			getConfigWorkspaceActionFocusKey("config.auditRetention.focus"),
		).toBe("auditArchiveRetentionLimit");
		expect(
			getConfigWorkspaceActionFocusKey("config.toolTargetRetention.focus"),
		).toBe("toolTargetPresetLimit");
		expect(
			getConfigWorkspaceActionFocusKey("config.statusResultJumpClass.focus"),
		).toBe("statusResultJumpClassFilter");
		expect(getConfigWorkspaceActionFocusKey("network.inspect")).toBeUndefined();
		expect(
			getConfigWorkspaceSectionJumpIndex(items, "missing"),
		).toBeUndefined();
		expect(formatConfigWorkspaceRows(items, 7, 18)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/jump  g/G shelf  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"  toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"  statusResultJumpClassFilter process  Status result jump browser class",
			"[4] CONNECTIVITY",
			"  defaultPingHost             google.com default host for picos ping",
			"[2] SAFETY",
			"  controlExecutionMode        disabled OS mutation execution mode",
			"> allowAdminDryRun            false    allow admin-class dry-run previews",
			"  editorSaveMode              disabled Editor file write execution mode",
			"selected=allowAdminDryRun values=true|false section=safety",
		]);
	});

	test("formats section detail panes with config path and safety posture", () => {
		const items = createConfigWorkspaceItems({
			language: "ko",
			refreshInterval: 5000,
			statusResultJumpClassFilter: "tools",
			defaultPingHost: "internal.example",
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			editorSaveMode: "local-write",
			auditArchiveRetentionLimit: 12,
			toolTargetPresetLimit: 6,
		});

		expect(
			formatConfigWorkspaceDetailRows(items, 2, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=DISPLAY items=3 shortcut=1",
			"config=/tmp/picos/config.json",
			"selected=language value=ko",
			"posture=local editor writes enabled",
			"persist=+/- writes language, refreshInterval, or jump class",
			"actions=+/- adjust language/refresh/jump class, R exact reset",
		]);

		expect(
			formatConfigWorkspaceDetailRows(items, 6, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=SAFETY items=3 shortcut=2",
			"config=/tmp/picos/config.json",
			"selected=controlExecutionMode value=dry-run",
			"posture=local editor writes enabled",
			"persist=+/- writes policy, P cycles preset, R exact reset",
			"actions=+/- adjust policy, P cycle preset, R exact reset",
		]);

		expect(
			formatConfigWorkspaceDetailRows(items, 5, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=CONNECTIVITY items=1 shortcut=4",
			"config=/tmp/picos/config.json",
			"selected=defaultPingHost value=internal.example",
			"posture=local editor writes enabled",
			"persist=enter edits defaultPingHost",
			"actions=enter edit defaultPingHost, R exact reset",
		]);
	});

	test("formats managed config shelves for the OS settings center", () => {
		expect(
			formatConfigManagedShelfRows({
				...defaultConfig,
				defaultPingHost: "internal.example",
				showPublicIp: true,
				enableExperimentalControls: false,
				routeFilterPresets: ["default", "vpn"],
				connectionFilterPresets: ["443"],
				portFilterPresets: ["node"],
				logProfiles: [{ level: "warn", query: "kernel" }],
				logSearchPresets: ["error"],
				toolHistoryFilterPresets: ["dns"],
				toolHistorySort: "status",
				toolHistoryGroup: "tool",
				toolHistoryDetailView: "summary",
				statusResultJumpClassFilter: "process",
				toolTargetPresets: [
					{
						id: "custom-google-dns",
						label: "Google DNS",
						actionId: "tools.dns",
						target: "google.com",
						hint: "saved",
					},
				],
				remoteProfiles: [
					{
						id: "prod",
						kind: "sftp",
						host: "files.example.com",
						port: 22,
						username: "deploy",
						root: "/srv/app",
					},
				],
				operationPresets: [
					{ id: "pulse", kind: "monitor", samples: 3, intervalMs: 500 },
				],
			}),
		).toEqual([
			"CONFIG MANAGED SHELVES",
			"network defaults host=internal.example routeFilters=2 connectionFilters=1 portFilters=1",
			"tools defaults targets=1 filters=1 sort=status group=tool detail=summary",
			"workspace behavior logs=1 searches=1 remotes=1 publicIp=true experimental=false statusJumpClass=process",
			"shelf coverage saved=9 empty=0 routeFilters=2 connectionFilters=1 portFilters=1 toolTargets=1 logProfiles=1 logSearches=1 remotes=1 operationPresets=1",
			"empty shelves none",
			"recovery all shelves ready",
			"managed-by=Routes/Connections/Ports/Tools/Logs/Remotes workspaces + operationPresets via picos operations",
		]);
		const sparseRows = formatConfigManagedShelfRows({
			...defaultConfig,
			defaultPingHost: "internal.example",
		});
		expect(sparseRows).toContain(
			"shelf coverage saved=0 empty=8 routeFilters=0 connectionFilters=0 portFilters=0 toolTargets=0 logProfiles=0 logSearches=0 remotes=0 operationPresets=0",
		);
		expect(sparseRows).toContain(
			"empty shelves routeFilters,connectionFilters,portFilters,toolTargets,logProfiles,logSearches,remotes,operationPresets",
		);
		expect(sparseRows).toContain(
			"recovery operationPresets -> picos operations kinds",
		);
		expect(sparseRows).toContain(
			"recovery routeFilters -> Routes enter=cycle route filter presets fallback=open filter prompt",
		);
		expect(sparseRows).toContain(
			"recovery connectionFilters -> Connections enter=cycle connection filter presets fallback=open filter prompt",
		);
		expect(sparseRows).toContain(
			"recovery portFilters -> Ports enter=cycle port filter presets fallback=open filter prompt",
		);
		expect(sparseRows).toContain(
			"recovery toolTargets -> Tools enter=cycle tool target presets fallback=keep first target",
		);
		expect(sparseRows).toContain(
			"recovery logProfiles -> Logs enter=cycle log profiles fallback=open search prompt",
		);
		expect(sparseRows).toContain(
			"recovery logSearches -> Logs enter=cycle log profiles fallback=open search prompt",
		);
		expect(sparseRows).toContain(
			"recovery remotes -> Remotes enter=remote profile focus fallback=empty profile list",
		);
	});

	test("cycles managed shelf handoff targets for workspace jumps", () => {
		expect(getNextConfigManagedShelfTarget("network", "next")).toBe("routes");
		expect(getNextConfigManagedShelfTarget("routes", "next")).toBe(
			"connections",
		);
		expect(getNextConfigManagedShelfTarget("connections", "next")).toBe(
			"ports",
		);
		expect(getNextConfigManagedShelfTarget("ports", "next")).toBe("tools");
		expect(getNextConfigManagedShelfTarget("tools", "next")).toBe("logs");
		expect(getNextConfigManagedShelfTarget("logs", "next")).toBe("remotes");
		expect(getNextConfigManagedShelfTarget("remotes", "next")).toBe("network");
		expect(getNextConfigManagedShelfTarget("network", "previous")).toBe(
			"remotes",
		);
		expect(getNextConfigManagedShelfTarget(undefined, "next")).toBe("network");

		expect(formatConfigManagedShelfHandoffRows("tools")).toEqual([
			"CONFIG SHELF HANDOFF",
			"target=tools workspace=Tools",
			"enter jump=tools  g/G cycle shelf",
		]);

		expect(formatConfigManagedShelfLandingRows("tools")).toEqual([
			"CONFIG SHELF LANDING",
			"source=config target=tools workspace=Tools",
			"scope=saved targets, history filters, grouping, detail view",
			"focus=toolTargetPresets cursor=0 detail=summary",
			"next=review shelf controls  esc=clear landing",
		]);
	});

	test("creates destination focus presets for managed shelf jumps", () => {
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.routes.focus"),
		).toBe("routes");
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.connections.focus"),
		).toBe("connections");
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.ports.focus"),
		).toBe("ports");
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.tools.focus"),
		).toBe("tools");
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.logs.focus"),
		).toBe("logs");
		expect(
			getConfigManagedShelfActionFocusTarget("config.shelf.remotes.focus"),
		).toBe("remotes");
		expect(
			getConfigManagedShelfActionFocusTarget("network.inspect"),
		).toBeUndefined();

		expect(getConfigManagedShelfFocusPreset("tools")).toEqual({
			target: "tools",
			workspace: "tools",
			label: "Tools",
			focusArea: "workspaces",
			cursor: "toolTargetPresets",
			index: 0,
			detailView: "summary",
			rows: [
				"CONFIG SHELF FOCUS",
				"target=tools workspace=Tools",
				"focus=toolTargetPresets cursor=0 detail=summary",
			],
		});

		expect(getConfigManagedShelfFocusPreset("remotes")).toMatchObject({
			target: "remotes",
			workspace: "remotes",
			focusArea: "remotes",
			cursor: "remoteProfiles",
			index: 0,
		});
	});

	test("formats workspace-local focus rows for managed shelf destinations", () => {
		expect(formatConfigManagedShelfFocusRows("tools")).toEqual([
			"CONFIG SHELF FOCUS",
			"target=tools workspace=Tools",
			"focus=toolTargetPresets cursor=0 detail=summary",
			"enter=cycle tool target presets  esc=clear landing",
		]);

		expect(
			withConfigManagedShelfFocusRows(["TOOLS", "target presets"], "tools", 5),
		).toEqual([
			"CONFIG SHELF FOCUS",
			"target=tools workspace=Tools",
			"focus=toolTargetPresets cursor=0 detail=summary",
			"enter=cycle tool target presets  esc=clear landing",
			"TOOLS",
		]);

		expect(
			withConfigManagedShelfFocusRows(
				["TOOLS", "target presets"],
				undefined,
				2,
			),
		).toEqual(["TOOLS", "target presets"]);
	});

	test("creates enter action plans for managed shelf focus rows", () => {
		expect(createConfigManagedShelfFocusActionPlan("routes")).toEqual({
			target: "routes",
			workspace: "routes",
			label: "Routes",
			action: "cycleRouteFilterPresets",
			rows: [
				"CONFIG SHELF ACTION",
				"target=routes workspace=Routes",
				"enter=cycle route filter presets  fallback=open filter prompt",
			],
		});

		expect(createConfigManagedShelfFocusActionPlan("logs")).toEqual({
			target: "logs",
			workspace: "logs",
			label: "Logs",
			action: "cycleLogProfiles",
			rows: [
				"CONFIG SHELF ACTION",
				"target=logs workspace=Logs",
				"enter=cycle log profiles  fallback=open search prompt",
			],
		});
	});

	test("creates direct prompt plans for empty recovery shelves", () => {
		expect(
			createConfigRecoveryDirectPromptPlan("routes", { routes: 0 }),
		).toEqual({
			target: "routes",
			workspace: "routes",
			label: "Routes",
			prompt: "route-filter",
			reason: "empty routeFilters",
			rows: [
				"CONFIG RECOVERY PROMPT",
				"target=routes workspace=Routes",
				"prompt=route-filter reason=empty routeFilters",
				"next=type filter and press enter",
			],
		});
		expect(
			createConfigRecoveryDirectPromptPlan("connections", {
				connections: 0,
			})?.prompt,
		).toBe("endpoint-filter:connections");
		expect(
			createConfigRecoveryDirectPromptPlan("ports", { ports: 0 })?.prompt,
		).toBe("endpoint-filter:ports");
		expect(
			createConfigRecoveryDirectPromptPlan("logs", { logs: 0 })?.prompt,
		).toBe("log-search");
		expect(
			createConfigRecoveryDirectPromptPlan("tools", { tools: 0 })?.prompt,
		).toBe("tool-target-preset");
		expect(
			createConfigRecoveryDirectPromptPlan("remotes", { remotes: 0 })?.prompt,
		).toBe("remote-profile");
		expect(
			createConfigRecoveryDirectPromptPlan("routes", { routes: 2 }),
		).toBeUndefined();
		expect(
			createConfigRecoveryDirectPromptPlan("tools", { tools: 1 }),
		).toBeUndefined();
	});

	test("formats prompt breadcrumbs for config-origin shelf edits", () => {
		expect(formatConfigManagedShelfPromptBreadcrumbRows("routes")).toEqual([
			"CONFIG ORIGIN Config > Routes",
			"scope=routes.filters prompt=filter enter=apply esc=keep landing",
		]);

		expect(formatConfigManagedShelfPromptBreadcrumbRows("logs")).toEqual([
			"CONFIG ORIGIN Config > Logs",
			"scope=logs.profiles prompt=search enter=apply esc=keep landing",
		]);
	});

	test("formats cleanup breadcrumbs for config-origin locked confirmations", () => {
		expect(formatConfigManagedShelfCleanupBreadcrumbRows("routes")).toEqual([
			"CONFIG ORIGIN Config > Routes",
			"scope=routes.filters prompt=cleanup exact-confirm esc=keep landing",
		]);

		expect(formatConfigManagedShelfCleanupBreadcrumbRows("ports")).toEqual([
			"CONFIG ORIGIN Config > Ports",
			"scope=ports.filters prompt=cleanup exact-confirm esc=keep landing",
		]);
	});

	test("formats locked dialog breadcrumbs for config-origin file opens", () => {
		expect(createConfigManagedShelfFileOpenOrigin("routes")).toEqual({
			kind: "config-shelf",
			target: "routes",
			label: "Routes",
			scope: "routes.filters",
		});

		expect(
			formatConfigManagedShelfLockedDialogBreadcrumbRows("routes", "file-open"),
		).toEqual([
			"CONFIG ORIGIN Config > Routes",
			"scope=routes.filters dialog=file-open locked esc=keep landing",
		]);

		expect(
			formatConfigManagedShelfLockedDialogBreadcrumbRows("logs", "file-open"),
		).toEqual([
			"CONFIG ORIGIN Config > Logs",
			"scope=logs.profiles dialog=file-open locked esc=keep landing",
		]);
	});

	test("moves selection and clamps adjusted retention values", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 60,
			toolTargetPresetLimit: 1,
			language: "en",
			refreshInterval: 3000,
			statusResultJumpClassFilter: "process",
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
		});

		expect(moveConfigWorkspaceSelection(0, items.length, "next")).toBe(1);
		expect(moveConfigWorkspaceSelection(0, items.length, "previous")).toBe(8);
		expect(adjustConfigWorkspaceItem(items[0], "increase")).toBe(60);
		expect(adjustConfigWorkspaceItem(items[0], "decrease")).toBe(59);
		expect(adjustConfigWorkspaceItem(items[1], "decrease")).toBe(1);
		expect(adjustConfigWorkspaceItem(items[1], "increase")).toBe(2);
		expect(adjustConfigWorkspaceItem(items[2], "increase")).toBe("ko");
		expect(adjustConfigWorkspaceItem(items[2], "decrease")).toBe("zh");
		expect(adjustConfigWorkspaceItem(items[3], "increase")).toBe(4000);
		expect(adjustConfigWorkspaceItem(items[3], "decrease")).toBe(2000);
		expect(adjustConfigWorkspaceItem(items[4], "increase")).toBe("timeline");
		expect(adjustConfigWorkspaceItem(items[4], "decrease")).toBe("all");
		expect(adjustConfigWorkspaceItem(items[6], "increase")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[6], "decrease")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[7], "increase")).toBe(true);
		expect(adjustConfigWorkspaceItem(items[7], "decrease")).toBe(true);
		expect(adjustConfigWorkspaceItem(items[8], "increase")).toBe("local-write");
		expect(adjustConfigWorkspaceItem(items[8], "decrease")).toBe("local-write");
	});

	test("marks text config rows as editable with enter", () => {
		const items = createConfigWorkspaceItems({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			editorSaveMode: "disabled",
			statusResultJumpClassFilter: "all",
		});

		expect(getConfigWorkspaceEditPrompt(items[5])).toBe(
			"config-defaultPingHost",
		);
		expect(getConfigWorkspaceEditPrompt(items[0])).toBeUndefined();
	});

	test("cycles policy presets for safe OS control modes", () => {
		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "disabled",
				allowAdminDryRun: false,
				enableExperimentalControls: false,
				editorSaveMode: "disabled",
			}),
		).toBe("user-dry-run");

		const userDryRun = applyConfigPolicyPreset("user-dry-run");
		expect(userDryRun).toEqual({
			id: "user-dry-run",
			label: "User dry-run",
			values: {
				controlExecutionMode: "dry-run",
				allowAdminDryRun: false,
				enableExperimentalControls: true,
				editorSaveMode: "disabled",
			},
			rows: [
				"CONFIG POLICY PRESET",
				"preset=User dry-run",
				"controlExecutionMode=dry-run",
				"allowAdminDryRun=false",
				"enableExperimentalControls=true",
				"editorSaveMode=disabled",
			],
		});

		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: false,
				enableExperimentalControls: true,
				editorSaveMode: "disabled",
			}),
		).toBe("admin-dry-run");
		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: true,
				enableExperimentalControls: true,
				editorSaveMode: "local-write",
			}),
		).toBe("safe-readonly");
		expect(applyConfigPolicyPreset("safe-readonly").values).toEqual({
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
			editorSaveMode: "disabled",
		});
	});

	test("requires exact confirmation before resetting core config values", () => {
		const preview = createConfigWorkspaceResetPreview({
			auditArchiveRetentionLimit: 7,
			toolTargetPresetLimit: 4,
			language: "ko",
			refreshInterval: 10000,
			defaultPingHost: "example.com",
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			enableExperimentalControls: true,
			editorSaveMode: "local-write",
			statusResultJumpClassFilter: "tools",
		});

		expect(preview.confirmationPhrase).toBe("reset config");
		expect(preview.values).toEqual({
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
			editorSaveMode: "disabled",
			statusResultJumpClassFilter: "all",
		});
		expect(preview.rows).toEqual([
			"CONFIG RESET",
			"scope=core controls changed=10",
			"confirm reset config locked",
			"auditArchiveRetentionLimit 7 -> 10",
			"toolTargetPresetLimit 4 -> 8",
			"language ko -> en",
			"refreshInterval 10000 -> 3000",
			"defaultPingHost example.com -> google.com",
			"controlExecutionMode dry-run -> disabled",
			"allowAdminDryRun true -> false",
			"enableExperimentalControls true -> false",
			"editorSaveMode local-write -> disabled",
			"statusResultJumpClassFilter tools -> all",
		]);
		expect(submitConfigWorkspaceResetConfirmation(preview, "reset")).toEqual({
			confirmed: false,
			message: "config reset rejected core controls",
			preview,
		});
		expect(
			submitConfigWorkspaceResetConfirmation(preview, " reset config "),
		).toEqual({
			confirmed: true,
			message: "config reset confirmed core controls (10 values)",
			preview,
		});
	});
});
