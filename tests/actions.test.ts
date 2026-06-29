import { describe, expect, test } from "bun:test";
import { getActionCatalog, getActionSummary } from "../src/core/actions";

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
			total: 29,
			enabled: 20,
			locked: 9,
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
			"tools.dns",
			"tools.traceroute",
			"tools.whois",
			"tools.ipInfo",
			"tools.tls",
			"network.connect",
			"routes.path",
			"timeline.export",
			"raw.view",
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
	});
});
