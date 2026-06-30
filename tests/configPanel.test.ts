import { describe, expect, test } from "bun:test";
import { defaultConfig } from "../src/config/schema";
import {
	adjustConfigWorkspaceItem,
	applyConfigPolicyPreset,
	createConfigManagedShelfFocusActionPlan,
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
	getConfigManagedShelfFocusPreset,
	getConfigWorkspaceEditPrompt,
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
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
		});

		expect(formatConfigWorkspaceRows(items, 1, 10)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/jump  g/G shelf  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"> toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"[4] CONNECTIVITY",
		]);
	});

	test("groups config controls into OS-like sections", () => {
		const items = createConfigWorkspaceItems({
			language: "en",
			refreshInterval: 3000,
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			auditArchiveRetentionLimit: 10,
			toolTargetPresetLimit: 8,
		});

		expect(items.map((item) => `${item.section}:${item.key}`)).toEqual([
			"retention:auditArchiveRetentionLimit",
			"retention:toolTargetPresetLimit",
			"display:language",
			"display:refreshInterval",
			"connectivity:defaultPingHost",
			"safety:controlExecutionMode",
			"safety:allowAdminDryRun",
		]);
		expect(getConfigWorkspaceSectionJumpIndex(items, "display")).toBe(2);
		expect(getConfigWorkspaceSectionJumpIndex(items, "safety")).toBe(5);
		expect(getConfigWorkspaceSectionJumpIndex(items, "retention")).toBe(0);
		expect(getConfigWorkspaceSectionJumpIndex(items, "connectivity")).toBe(4);
		expect(
			getConfigWorkspaceSectionJumpIndex(items, "missing"),
		).toBeUndefined();
		expect(formatConfigWorkspaceRows(items, 6, 18)).toEqual([
			"CONFIG WORKSPACE",
			"1 display  2 safety  3 retention  4 connectivity",
			"j/k select  +/- save  enter edit/jump  g/G shelf  P policy  R reset",
			"[3] RETENTION",
			"  auditArchiveRetentionLimit  10       archived Timeline audit logs kept before prune",
			"  toolTargetPresetLimit       8        saved Tools target presets kept",
			"[1] DISPLAY",
			"  language                    en       interface language",
			"  refreshInterval             3000     refresh cadence in ms",
			"[4] CONNECTIVITY",
			"  defaultPingHost             google.com default host for picos ping",
			"[2] SAFETY",
			"  controlExecutionMode        disabled OS mutation execution mode",
			"> allowAdminDryRun            false    allow admin-class dry-run previews",
			"selected=allowAdminDryRun values=true|false section=safety",
		]);
	});

	test("formats section detail panes with config path and safety posture", () => {
		const items = createConfigWorkspaceItems({
			language: "ko",
			refreshInterval: 5000,
			defaultPingHost: "internal.example",
			controlExecutionMode: "dry-run",
			allowAdminDryRun: true,
			auditArchiveRetentionLimit: 12,
			toolTargetPresetLimit: 6,
		});

		expect(
			formatConfigWorkspaceDetailRows(items, 2, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=DISPLAY items=2 shortcut=1",
			"config=/tmp/picos/config.json",
			"selected=language value=ko",
			"posture=admin dry-run previews",
			"persist=+/- writes language or refreshInterval",
			"actions=+/- adjust language/refresh, R exact reset",
		]);

		expect(
			formatConfigWorkspaceDetailRows(items, 5, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=SAFETY items=2 shortcut=2",
			"config=/tmp/picos/config.json",
			"selected=controlExecutionMode value=dry-run",
			"posture=admin dry-run previews",
			"persist=+/- writes policy, P cycles preset, R exact reset",
			"actions=+/- adjust policy, P cycle preset, R exact reset",
		]);

		expect(
			formatConfigWorkspaceDetailRows(items, 4, {
				configPath: "/tmp/picos/config.json",
			}),
		).toEqual([
			"CONFIG SECTION DETAIL",
			"section=CONNECTIVITY items=1 shortcut=4",
			"config=/tmp/picos/config.json",
			"selected=defaultPingHost value=internal.example",
			"posture=admin dry-run previews",
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
			}),
		).toEqual([
			"CONFIG MANAGED SHELVES",
			"network defaults host=internal.example routeFilters=2 connectionFilters=1 portFilters=1",
			"tools defaults targets=1 filters=1 sort=status group=tool detail=summary",
			"workspace behavior logs=1 searches=1 remotes=1 publicIp=true experimental=false",
			"managed-by=Routes/Connections/Ports/Tools/Logs/Remotes workspaces",
		]);
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
			defaultPingHost: "google.com",
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
		});

		expect(moveConfigWorkspaceSelection(0, items.length, "next")).toBe(1);
		expect(moveConfigWorkspaceSelection(0, items.length, "previous")).toBe(6);
		expect(adjustConfigWorkspaceItem(items[0], "increase")).toBe(60);
		expect(adjustConfigWorkspaceItem(items[0], "decrease")).toBe(59);
		expect(adjustConfigWorkspaceItem(items[1], "decrease")).toBe(1);
		expect(adjustConfigWorkspaceItem(items[1], "increase")).toBe(2);
		expect(adjustConfigWorkspaceItem(items[2], "increase")).toBe("ko");
		expect(adjustConfigWorkspaceItem(items[2], "decrease")).toBe("zh");
		expect(adjustConfigWorkspaceItem(items[3], "increase")).toBe(4000);
		expect(adjustConfigWorkspaceItem(items[3], "decrease")).toBe(2000);
		expect(adjustConfigWorkspaceItem(items[5], "increase")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[5], "decrease")).toBe("dry-run");
		expect(adjustConfigWorkspaceItem(items[6], "increase")).toBe(true);
		expect(adjustConfigWorkspaceItem(items[6], "decrease")).toBe(true);
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
		});

		expect(getConfigWorkspaceEditPrompt(items[4])).toBe(
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
			},
			rows: [
				"CONFIG POLICY PRESET",
				"preset=User dry-run",
				"controlExecutionMode=dry-run",
				"allowAdminDryRun=false",
				"enableExperimentalControls=true",
			],
		});

		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: false,
				enableExperimentalControls: true,
			}),
		).toBe("admin-dry-run");
		expect(
			getNextConfigPolicyPreset({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: true,
				enableExperimentalControls: true,
			}),
		).toBe("safe-readonly");
		expect(applyConfigPolicyPreset("safe-readonly").values).toEqual({
			controlExecutionMode: "disabled",
			allowAdminDryRun: false,
			enableExperimentalControls: false,
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
		});
		expect(preview.rows).toEqual([
			"CONFIG RESET",
			"scope=core controls changed=8",
			"confirm reset config locked",
			"auditArchiveRetentionLimit 7 -> 10",
			"toolTargetPresetLimit 4 -> 8",
			"language ko -> en",
			"refreshInterval 10000 -> 3000",
			"defaultPingHost example.com -> google.com",
			"controlExecutionMode dry-run -> disabled",
			"allowAdminDryRun true -> false",
			"enableExperimentalControls true -> false",
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
			message: "config reset confirmed core controls (8 values)",
			preview,
		});
	});
});
