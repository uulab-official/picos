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
			total: 17,
			enabled: 13,
			locked: 4,
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
			"routes.inspect",
			"connections.list",
			"ports.list",
			"tools.dns",
			"tools.traceroute",
			"network.connect",
			"timeline.export",
			"raw.view",
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
		expect(getActionCatalog().map((action) => action.id)).toContain("raw.view");
	});
});
