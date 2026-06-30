import { describe, expect, test } from "bun:test";
import { controlPreviewCommand as linuxControlPreviewCommand } from "../src/adapters/linux";
import { controlPreviewCommand as macosControlPreviewCommand } from "../src/adapters/macos";
import { controlPreviewCommand as windowsControlPreviewCommand } from "../src/adapters/windows";
import {
	createActionPreviewPlan,
	formatActionPreviewRows,
	getActionCatalog,
	getActionSummary,
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
			total: 32,
			enabled: 22,
			locked: 10,
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
			"raw.view",
			"tools.export",
			"remote.profiles",
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
		});
		expect(linuxControlPreviewCommand("network.inspect")).toBeUndefined();
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
