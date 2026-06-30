import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RoutePathResult, RouteTableResult } from "../src/core/routes";
import {
	createRouteRawHandoffPlan,
	formatRoutePathRows,
	formatRouteRawRows,
	formatRouteWorkspaceRows,
	getRouteClipboardPreview,
	nextRouteDetailView,
	nextRouteFilterPreset,
	saveRouteFilterPreset,
	writeRouteRawHandoffPlan,
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

	test("formats filtered route rows with visible filter context", () => {
		expect(formatRouteWorkspaceRows(fixture, 10, { filter: "utun" })).toEqual([
			"SUMMARY routes=1/2 command=netstat -rn",
			"FILTER utun matches=1/2",
			"DIAGNOSTICS",
			"PASS Default route present · 1 default route(s)",
			"ROUTES",
			"10.8.0.0/24        link             utun0      ipv4",
			"RAW OUTPUT",
			"$ netstat -rn",
			"Internet:",
			"default 192.168.0.1 UGSc en0",
		]);
	});

	test("saves and cycles route filter presets", () => {
		expect(saveRouteFilterPreset([], " utun ")).toEqual(["utun"]);
		expect(saveRouteFilterPreset(["default", "utun"], "default")).toEqual([
			"default",
			"utun",
		]);
		expect(saveRouteFilterPreset(["vpn", "default", "utun"], "link")).toEqual([
			"link",
			"vpn",
			"default",
			"utun",
		]);
		expect(nextRouteFilterPreset(["utun", "default"], "")).toBe("utun");
		expect(nextRouteFilterPreset(["utun", "default"], "utun")).toBe("default");
		expect(nextRouteFilterPreset([], "utun")).toBeUndefined();
	});

	test("formats route rows with preset context", () => {
		expect(
			formatRouteWorkspaceRows(fixture, 11, {
				filter: "utun",
				presets: ["utun", "default", "link", "ipv6"],
			})[0],
		).toBe("SUMMARY routes=1/2 presets=utun|default|link command=netstat -rn");
	});

	test("creates route clipboard previews for table raw and path views", () => {
		expect(
			getRouteClipboardPreview(fixture, {
				filter: "utun",
				sort: { key: "interface", direction: "asc" },
				view: "table",
			}),
		).toEqual({
			source: "route-table",
			label: "route table",
			copyText:
				"picos routes\n\n[Summary]\nRoutes: 1/2\nFilter: utun matches 1/2\nSort: interface asc\nPASS Default route present\n\n[Routes]\n10.8.0.0/24        link               utun0      ipv4",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getRouteClipboardPreview(fixture, { view: "raw" })).toMatchObject({
			source: "route-raw",
			label: "route raw output",
			copyText: "$ netstat -rn\nInternet:\ndefault 192.168.0.1 UGSc en0",
		});
		expect(
			getRouteClipboardPreview(fixture, {
				path: pathFixture,
				view: "path",
			}),
		).toMatchObject({
			source: "route-path",
			label: "route path 8.8.8.8",
			copyText:
				"$ route -n get 8.8.8.8\nroute to: 8.8.8.8\ngateway: 192.168.0.1\ninterface: en0",
		});
		expect(getRouteClipboardPreview(fixture, { view: "path" })).toBeUndefined();
	});

	test("formats route clipboard preview rows for the active view", () => {
		expect(
			formatRouteWorkspaceRows(fixture, 9, {
				copyPreview: true,
				view: "raw",
			}),
		).toEqual([
			"SUMMARY routes=2 view=raw command=netstat -rn",
			"RAW OUTPUT",
			"$ netstat -rn",
			"Internet:",
			"default 192.168.0.1 UGSc en0",
			"CLIPBOARD PREVIEW route-raw",
			"label route raw output",
			"copy $ netstat -rn\nInternet:\ndefault 192.168.0.1 UGSc en0",
			"confirm copy locked",
		]);
	});

	test("formats route detail tabs for raw diagnostics and path focus", () => {
		expect(nextRouteDetailView("table")).toBe("raw");
		expect(nextRouteDetailView("raw")).toBe("diagnostics");
		expect(nextRouteDetailView("diagnostics")).toBe("path");
		expect(nextRouteDetailView("path")).toBe("table");
		expect(formatRouteWorkspaceRows(fixture, 5, { view: "raw" })).toEqual([
			"SUMMARY routes=2 view=raw command=netstat -rn",
			"RAW OUTPUT",
			"$ netstat -rn",
			"Internet:",
			"default 192.168.0.1 UGSc en0",
		]);
		expect(
			formatRouteWorkspaceRows(fixture, 5, { view: "diagnostics" }),
		).toEqual([
			"SUMMARY routes=2 view=diagnostics command=netstat -rn",
			"DIAGNOSTICS",
			"PASS Default route present · 1 default route(s)",
		]);
		expect(
			formatRouteWorkspaceRows(fixture, 6, {
				path: pathFixture,
				view: "path",
			}),
		).toEqual([
			"SUMMARY routes=2 view=path command=netstat -rn",
			"PATH destination=8.8.8.8",
			"gateway=192.168.0.1 interface=en0 source=192.168.0.20",
			"RAW PATH",
			"$ route -n get 8.8.8.8",
			"route to: 8.8.8.8",
		]);
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

	test("creates route raw handoff plans for the active detail view", () => {
		const plan = createRouteRawHandoffPlan(fixture, {
			baseDir: "/tmp/picos",
			filter: "utun",
			generatedAt: new Date("2026-06-30T12:00:00.000Z"),
			sort: { key: "interface", direction: "asc" },
			view: "raw",
		});

		expect(plan).toEqual({
			path: "/tmp/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md",
			label: "route raw output",
			view: "raw",
			content:
				"# picos route handoff\n" +
				"generatedAt=2026-06-30T12:00:00.000Z\n" +
				"view=raw\n" +
				"label=route raw output\n" +
				"command=netstat -rn\n" +
				"filter=utun\n" +
				"sort=interface asc\n" +
				"\n" +
				"```txt\n" +
				"$ netstat -rn\n" +
				"Internet:\n" +
				"default 192.168.0.1 UGSc en0\n" +
				"```\n",
		});

		expect(
			createRouteRawHandoffPlan(fixture, {
				baseDir: "/tmp/picos",
				view: "path",
			}),
		).toBeUndefined();
		expect(
			createRouteRawHandoffPlan(fixture, {
				baseDir: "/tmp/picos",
				path: pathFixture,
				view: "path",
			})?.content,
		).toContain("$ route -n get 8.8.8.8");
	});

	test("writes route raw handoff files", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-route-handoff-"));
		try {
			const plan = createRouteRawHandoffPlan(fixture, {
				baseDir: root,
				generatedAt: new Date("2026-06-30T12:00:00.000Z"),
				view: "table",
			});
			if (!plan) {
				throw new Error("expected route handoff plan");
			}

			const written = await writeRouteRawHandoffPlan(plan);

			expect(written.path).toBe(
				join(root, "routes", "picos-routes-table-2026-06-30T120000000Z.md"),
			);
			expect(await readFile(written.path, "utf8")).toBe(plan.content);
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});
});
