import { describe, expect, test } from "bun:test";
import { controlPreviewCommand as linuxControlPreviewCommand } from "../src/adapters/linux";
import { controlPreviewCommand as macosControlPreviewCommand } from "../src/adapters/macos";
import { controlPreviewCommand as windowsControlPreviewCommand } from "../src/adapters/windows";
import {
	createActionControlSimulation,
	createActionPreviewPlan,
	formatActionConfirmationAuditMessage,
	formatActionPreviewAuditMessage,
	formatActionPreviewRows,
	formatActionSimulationAuditMessage,
	formatActionSimulationRows,
	getActionCatalog,
	getActionSummary,
	submitActionPreviewConfirmation,
} from "../src/core/actions";
import { getControlPreviewCommand } from "../src/core/controlPreview";

describe("action catalog", () => {
	test("keeps write and destructive actions locked by default", () => {
		const catalog = getActionCatalog();
		const mutableActions = catalog.filter((action) => action.risk !== "read");

		expect(mutableActions.length).toBeGreaterThan(0);
		expect(
			mutableActions.every((action) => action.enabled === false),
		).toBeTrue();
		expect(
			mutableActions.every((action) => action.confirmationRequired === true),
		).toBeTrue();
	});

	test("summarizes action availability for the status panel", () => {
		expect(getActionSummary()).toEqual({
			total: 49,
			enabled: 37,
			locked: 12,
			elevated: 4,
		});
	});

	test("exposes read-only runnable actions for the console", () => {
		expect(
			getActionCatalog()
				.filter((action) => action.enabled)
				.map((action) => action.id),
		).toEqual([
			"network.inspect",
			"system.inventory",
			"doctor.run",
			"ping.default",
			"config.show",
			"files.list",
			"files.read",
			"routes.inspect",
			"connections.list",
			"ports.list",
			"process.inspect",
			"tools.dns",
			"tools.traceroute",
			"tools.whois",
			"tools.ipInfo",
			"tools.tls",
			"network.connect",
			"routes.path",
			"timeline.export",
			"logs.read",
			"raw.view",
			"tools.export",
			"picos.update",
			"remote.profiles",
			"status.timelineTrail.select",
			"status.timelineTrail.open",
			"status.timelineTrail.search",
			"status.timelineTrail.source",
			"status.resultJump.select",
			"status.resultJump.open",
			"status.resultHistory.filter",
			"status.toolsEvidence.filter",
			"status.toolsEvidence.search",
			"status.toolsEvidence.archive",
			"status.toolsEvidence.retention",
			"status.toolsEvidence.matchOpen",
			"status.toolsEvidence.matchArchive",
		]);
	});

	test("includes OS inventory and TCP connect read-only actions", () => {
		const catalog = getActionCatalog();

		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "system.inventory",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "network.connect",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
	});

	test("keeps self-update apply locked behind confirmation", () => {
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "picos.update.apply",
				risk: "write",
				privilege: "user",
				enabled: false,
				confirmationRequired: true,
				confirmationPhrase: "update picos",
			}),
		);
	});

	test("keeps process termination locked behind confirmation", () => {
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "process.terminate",
				category: "ports",
				risk: "destructive",
				privilege: "user",
				enabled: false,
				confirmationRequired: true,
				confirmationPhrase: "kill process",
			}),
		);
	});

	test("exposes file console actions with writes locked", () => {
		const catalog = getActionCatalog();

		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "files.list",
				risk: "read",
				enabled: true,
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "files.write",
				risk: "write",
				enabled: false,
				confirmationRequired: true,
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "files.copy",
				risk: "write",
				enabled: false,
				confirmationRequired: true,
				confirmationPhrase: "copy file",
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "clipboard.write",
				risk: "write",
				privilege: "user",
				enabled: false,
				confirmationRequired: true,
				confirmationPhrase: "copy",
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "files.move",
				risk: "write",
				enabled: false,
				confirmationRequired: true,
				confirmationPhrase: "move file",
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "remote.profiles",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(catalog).toContainEqual(
			expect.objectContaining({
				id: "remote.sftp.connect",
				privilege: "user",
				enabled: false,
			}),
		);
	});

	test("includes lazyifconfig-inspired read-only inspections", () => {
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"routes.inspect",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"connections.list",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"ports.list",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"process.inspect",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"tools.traceroute",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"tools.whois",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"tools.ipInfo",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"tools.tls",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"routes.path",
		);
		expect(getActionCatalog().map((action) => action.id)).toContain("raw.view");
		expect(getActionCatalog().map((action) => action.id)).toContain(
			"tools.export",
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.timelineTrail.select",
				title: "Select recovered Timeline trail",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.timelineTrail.open",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.timelineTrail.search",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.timelineTrail.source",
				title: "Filter recovered Timeline trail source",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.resultJump.select",
				title: "Select Status result Timeline jump",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.resultJump.open",
				title: "Open Timeline result jump",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
		expect(getActionCatalog()).toContainEqual(
			expect.objectContaining({
				id: "status.resultHistory.filter",
				title: "Filter Status result history",
				category: "status",
				risk: "read",
				privilege: "none",
				enabled: true,
			}),
		);
	});

	test("creates dry-run previews for locked OS-changing actions", () => {
		const commandPreview = macosControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "macos", commandPreview);

		expect(plan).toBeDefined();
		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}
		expect(plan).toEqual({
			actionId: "dns.flush",
			title: "Flush DNS cache",
			risk: "write",
			privilege: "admin",
			enabled: false,
			dryRun: true,
			confirmationPhrase: "flush dns",
			blockedReason: "disabled-by-default",
			commandPreview: {
				adapter: "macos",
				command: "sudo",
				args: ["dscacheutil", "-flushcache"],
				note: "flush local DNS resolver cache",
			},
			preview: [
				"Risk: write",
				"Privilege: admin",
				"Platform: macos",
				'Confirmation: type "flush dns"',
				"Adapter: macos",
				"Command: sudo dscacheutil -flushcache",
				"Dry run: no OS command will be executed",
			],
		});
		expect(formatActionPreviewRows(plan)).toEqual([
			"CONTROL PREVIEW dns.flush",
			"state=locked risk=write privilege=admin dryRun=true",
			"confirm=flush dns",
			"blocked=disabled-by-default",
			"adapter=macos",
			"command=sudo dscacheutil -flushcache",
			"Risk: write",
			"Privilege: admin",
			"Platform: macos",
			'Confirmation: type "flush dns"',
			"Adapter: macos",
			"Command: sudo dscacheutil -flushcache",
			"Dry run: no OS command will be executed",
		]);
		expect(formatActionPreviewAuditMessage(plan)).toBe(
			'control preview dns.flush risk=write privilege=admin dryRun=true blocked=disabled-by-default adapter=macos command="sudo dscacheutil -flushcache"',
		);
	});

	test("keeps OS-changing dry-run commands inside platform adapters", () => {
		expect(macosControlPreviewCommand("dns.flush")).toEqual({
			adapter: "macos",
			command: "sudo",
			args: ["dscacheutil", "-flushcache"],
			note: "flush local DNS resolver cache",
		});
		expect(linuxControlPreviewCommand("interface.disable")).toEqual({
			adapter: "linux",
			command: "sudo",
			args: ["ip", "link", "set", "<interface>", "down"],
			note: "disable a network interface",
		});
		expect(windowsControlPreviewCommand("service.restart")).toEqual({
			adapter: "windows",
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				"Restart-Service -Name '<service>' -WhatIf",
			],
			note: "restart a Windows service with WhatIf preview",
			dryRunExecutable: true,
		});
		expect(macosControlPreviewCommand("process.terminate")).toEqual({
			adapter: "macos",
			command: "kill",
			args: ["-TERM", "<pid>"],
			note: "terminate a selected user-owned process",
		});
		expect(linuxControlPreviewCommand("process.terminate")).toEqual({
			adapter: "linux",
			command: "kill",
			args: ["-TERM", "<pid>"],
			note: "terminate a selected user-owned process",
		});
		expect(windowsControlPreviewCommand("process.terminate")).toEqual({
			adapter: "windows",
			command: "taskkill",
			args: ["/PID", "<pid>", "/T"],
			note: "terminate a selected process tree",
		});
		expect(linuxControlPreviewCommand("network.inspect")).toBeUndefined();
	});

	test("records typed control confirmations without enabling execution", () => {
		const commandPreview = macosControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "macos", commandPreview);

		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}

		const accepted = submitActionPreviewConfirmation(plan, " flush dns ");
		expect(accepted).toEqual({
			actionId: "dns.flush",
			status: "confirmed-disabled",
			expectedPhrase: "flush dns",
			receivedPhrase: "flush dns",
			confirmed: true,
			executionEnabled: false,
			risk: "write",
			privilege: "admin",
			dryRun: true,
			commandPreview,
		});
		expect(formatActionConfirmationAuditMessage(accepted)).toBe(
			'control confirmation dns.flush status=confirmed-disabled risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
		);

		const rejected = submitActionPreviewConfirmation(plan, "flush cache");
		expect(rejected).toEqual({
			actionId: "dns.flush",
			status: "rejected",
			expectedPhrase: "flush dns",
			receivedPhrase: "flush cache",
			confirmed: false,
			executionEnabled: false,
			risk: "write",
			privilege: "admin",
			dryRun: true,
			commandPreview,
		});
		expect(formatActionConfirmationAuditMessage(rejected)).toBe(
			'control confirmation dns.flush status=rejected risk=write privilege=admin dryRun=true executionEnabled=false adapter=macos command="sudo dscacheutil -flushcache"',
		);
	});

	test("creates blocked dry-run control simulation records from approval policy", () => {
		const commandPreview = macosControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "macos", commandPreview);

		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}

		const pending = createActionControlSimulation(plan);
		expect(pending).toEqual({
			actionId: "dns.flush",
			status: "blocked-by-policy",
			policy: "mutation-disabled",
			approvalRequired: true,
			confirmed: false,
			executionEnabled: false,
			risk: "write",
			privilege: "admin",
			dryRun: true,
			blockers: [
				"disabled-by-default",
				"confirmation-missing",
				"mutation-approval-required",
				"admin-approval-required",
				"execution-disabled",
			],
			commandPreview,
		});
		expect(formatActionSimulationRows(pending)).toEqual([
			"CONTROL SIMULATION dns.flush",
			"status=blocked-by-policy policy=mutation-disabled approval=required",
			"confirmed=false executionEnabled=false dryRun=true",
			"blockers=disabled-by-default,confirmation-missing,mutation-approval-required,admin-approval-required,execution-disabled",
			"adapter=macos",
			"command=sudo dscacheutil -flushcache",
		]);

		const accepted = submitActionPreviewConfirmation(plan, "flush dns");
		const acceptedSimulation = createActionControlSimulation(plan, accepted);
		expect(acceptedSimulation.blockers).toEqual([
			"disabled-by-default",
			"mutation-approval-required",
			"admin-approval-required",
			"execution-disabled",
		]);
		expect(formatActionSimulationAuditMessage(acceptedSimulation)).toBe(
			'control simulation dns.flush status=blocked-by-policy policy=mutation-disabled approval=required confirmed=true executionEnabled=false blockers=disabled-by-default,mutation-approval-required,admin-approval-required,execution-disabled adapter=macos command="sudo dscacheutil -flushcache"',
		);

		const rejected = submitActionPreviewConfirmation(plan, "flush cache");
		expect(createActionControlSimulation(plan, rejected).blockers).toContain(
			"confirmation-rejected",
		);
	});

	test("selects control preview commands by supported platform", () => {
		expect(getControlPreviewCommand("dns.flush", "darwin")).toEqual(
			macosControlPreviewCommand("dns.flush"),
		);
		expect(getControlPreviewCommand("dns.flush", "win32")).toEqual(
			windowsControlPreviewCommand("dns.flush"),
		);
		expect(getControlPreviewCommand("dns.flush", "linux")).toEqual(
			linuxControlPreviewCommand("dns.flush"),
		);
	});
});
