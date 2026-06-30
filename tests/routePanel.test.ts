import { describe, expect, test } from "bun:test";
import type { RoutePathResult, RouteTableResult } from "../src/core/routes";
import {
	formatRoutePathRows,
	formatRouteRawRows,
	formatRouteWorkspaceRows,
} from "../src/tui/routePanel";

const fixture: RouteTableResult = {
	command: "netstat",
	args: ["-rn"],
	routes: [
		{
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "en0",
			family: "ipv4",
			flags: "UGSc",
		},
		{
			destination: "10.8.0.0/24",
			gateway: "link",
			interfaceName: "utun0",
			family: "ipv4",
		},
	],
	diagnostics: [
		{
			status: "pass",
			label: "Default route present",
			detail: "1 default route(s)",
		},
	],
	rawOutput: "$ netstat -rn\nInternet:\ndefault 192.168.0.1 UGSc en0",
};

const pathFixture: RoutePathResult = {
	destination: "8.8.8.8",
	gateway: "192.168.0.1",
	interfaceName: "en0",
	sourceIp: "192.168.0.20",
	rawOutput:
		"$ route -n get 8.8.8.8\nroute to: 8.8.8.8\ngateway: 192.168.0.1\ninterface: en0",
};

describe("route TUI panel formatting", () => {
	test("formats route summary, diagnostics, rows, and raw output", () => {
		expect(formatRouteWorkspaceRows(fixture, 10)).toEqual([
			"SUMMARY routes=2 command=netstat -rn",
			"DIAGNOSTICS",
			"PASS Default route present · 1 default route(s)",
			"ROUTES",
			"default            192.168.0.1      en0        ipv4",
			"10.8.0.0/24        link             utun0      ipv4",
			"RAW OUTPUT",
			"$ netstat -rn",
			"Internet:",
			"default 192.168.0.1 UGSc en0",
		]);
	});

	test("formats sorted route rows with visible sort context", () => {
		expect(
			formatRouteWorkspaceRows(
				{
					...fixture,
					routes: [...fixture.routes].reverse(),
				},
				12,
				{ sort: { key: "interface", direction: "asc" } },
			),
		).toContain("SORT interface asc");
		expect(
			formatRouteWorkspaceRows(
				{
					...fixture,
					routes: [...fixture.routes].reverse(),
				},
				12,
				{ sort: { key: "interface", direction: "asc" } },
			).join("\n"),
		).toContain(
			"default            192.168.0.1      en0        ipv4\n10.8.0.0/24        link             utun0      ipv4",
		);
	});

	test("clips raw rows to available height", () => {
		expect(formatRouteRawRows(fixture.rawOutput, 2)).toEqual([
			"$ netstat -rn",
			"Internet:",
			"↓ 1 more raw lines",
		]);
	});

	test("keeps raw output visible when route rows overflow", () => {
		const crowded: RouteTableResult = {
			...fixture,
			routes: Array.from({ length: 12 }, (_, index) => ({
				destination: `10.0.${index}.0/24`,
				gateway: "link",
				interfaceName: "utun0",
				family: "ipv4",
			})),
		};

		expect(formatRouteWorkspaceRows(crowded, 10)).toContain("RAW OUTPUT");
		expect(formatRouteWorkspaceRows(crowded, 10)).toContain("↓ 10 more routes");
	});

	test("formats destination path lookup rows with raw output", () => {
		expect(formatRoutePathRows(pathFixture, 8)).toEqual([
			"PATH destination=8.8.8.8",
			"gateway=192.168.0.1 interface=en0 source=192.168.0.20",
			"RAW PATH",
			"$ route -n get 8.8.8.8",
			"route to: 8.8.8.8",
			"gateway: 192.168.0.1",
			"interface: en0",
		]);
	});
});
