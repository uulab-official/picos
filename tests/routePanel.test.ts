import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FileOpenOrigin } from "../src/core/fileOpen";
import type { RoutePathResult, RouteTableResult } from "../src/core/routes";
import {
	createRouteFilterCleanupPreview,
	createRouteRawHandoffPlan,
	formatRoutePathRows,
	formatRouteRawRows,
	formatRouteWorkspaceRows,
	getRouteClipboardPreview,
	getRouteDetailViewShortcut,
	nextRouteDetailView,
	nextRouteFilterPreset,
	prepareRouteFilterTransition,
	prepareRoutePanelInput,
	saveRouteFilterPreset,
	submitRouteFilterCleanupConfirmation,
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

const configRouteOrigin: FileOpenOrigin = {
	kind: "config-shelf",
	target: "routes",
	label: "Routes",
	scope: "routes.filters",
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
	test("owns route filter application and exact empty or filtered notices", () => {
		expect(
			prepareRouteFilterTransition({
				routes: fixture.routes,
				presets: ["default"],
				query: "  ",
			}),
		).toEqual({
			filter: "",
			presets: ["default"],
			copyPreview: false,
			notice: { level: "info", message: "route filter cleared" },
		});
		expect(
			prepareRouteFilterTransition({
				routes: fixture.routes,
				presets: ["default"],
				query: " utun ",
			}),
		).toEqual({
			filter: "utun",
			presets: ["default"],
			copyPreview: false,
			notice: {
				level: "info",
				message: "route filter utun matches 1",
			},
		});
		expect(
			prepareRouteFilterTransition({
				routes: [],
				presets: [],
				query: " ",
			}),
		).toEqual({
			filter: "",
			presets: [],
			copyPreview: false,
			notice: { level: "warn", message: "route filter cleared" },
		});
	});

	test("resolves route copy targets and exact no-target notices", () => {
		const base = {
			input: "c",
			view: "table" as const,
			filter: "utun",
			presets: [] as string[],
			routes: fixture.routes,
		};
		expect(prepareRoutePanelInput(base)).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no route table loaded" },
		});
		expect(
			prepareRoutePanelInput({
				...base,
				result: fixture,
				sort: { key: "interface", direction: "asc" },
			}),
		).toMatchObject({
			kind: "copy",
			preview: {
				source: "route-table",
				label: "route table",
			},
		});
		expect(
			prepareRoutePanelInput({
				...base,
				result: fixture,
				view: "path",
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no route clipboard target" },
		});
		expect(
			prepareRoutePanelInput({
				...base,
				result: fixture,
				view: "path",
				path: pathFixture,
			}),
		).toMatchObject({
			kind: "copy",
			preview: {
				source: "route-path",
				label: "route path 8.8.8.8",
			},
		});
	});

	test("ignores invalid route section shortcuts and owns preset cleanup notices", () => {
		expect(
			prepareRoutePanelInput({
				input: "5",
				view: "raw",
				filter: "",
				presets: [],
				routes: fixture.routes,
			}),
		).toEqual({ kind: "no-op" });
		expect(
			prepareRoutePanelInput({
				input: "D",
				view: "raw",
				filter: "",
				presets: [],
				routes: fixture.routes,
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no route filter presets to clean" },
		});
		expect(
			prepareRoutePanelInput({
				input: "]",
				view: "raw",
				filter: "",
				presets: ["missing"],
				routes: fixture.routes,
			}),
		).toEqual({
			kind: "filter",
			filter: "missing",
			copyPreview: false,
			notice: {
				level: "warn",
				message: "route preset missing matches 0",
			},
		});
		expect(
			prepareRoutePanelInput({
				input: "s",
				view: "table",
				filter: "",
				presets: [],
				routes: fixture.routes,
				sort: { key: "default", direction: "asc" },
			}),
		).toEqual({
			kind: "sort",
			sort: { key: "destination", direction: "asc" },
			copyPreview: false,
			notice: {
				level: "info",
				message: "route sort destination asc",
			},
		});
	});
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

	test("requires exact confirmation before clearing saved route filter presets", () => {
		const presets = ["utun", "default"];
		const preview = createRouteFilterCleanupPreview(presets);

		expect(preview).toEqual({
			count: 2,
			confirmationPhrase: "clear routes",
			cleanup: {
				id: "routes.filters",
				label: "Route filter presets",
				scope: "routes",
				count: 2,
				verb: "clear",
				confirmationPhrase: "clear routes",
				rows: [
					"CONFIG CLEANUP",
					"target=Route filter presets",
					"scope=routes count=2",
					"confirm clear routes locked",
				],
			},
			rows: [
				"ROUTE FILTER CLEANUP",
				"presets=2",
				"confirm clear routes locked",
			],
		});
		expect(
			submitRouteFilterCleanupConfirmation(presets, "clear route"),
		).toEqual({
			action: "notice",
			confirmed: false,
			message: "route filter cleanup rejected",
			presets,
			removed: 0,
			copyPreview: false,
			notice: {
				level: "warn",
				message: "route filter cleanup rejected",
			},
		});
		expect(
			submitRouteFilterCleanupConfirmation(presets, " clear routes "),
		).toEqual({
			action: "apply",
			confirmed: true,
			message: "route filter cleanup removed 2 presets",
			presets: [],
			removed: 2,
			copyPreview: false,
			notice: {
				level: "info",
				message: "route filter cleanup removed 2 presets",
			},
		});
		expect(createRouteFilterCleanupPreview([])).toBeUndefined();
	});

	test("formats route rows with preset context", () => {
		expect(
			formatRouteWorkspaceRows(fixture, 11, {
				filter: "utun",
				presets: ["utun", "default", "link", "ipv6"],
			})[0],
		).toBe("SUMMARY routes=1/2 presets=utun|default|link command=netstat -rn");
	});

	test("formats selected route preset shelf controls for config focus", () => {
		expect(
			formatRouteWorkspaceRows(fixture, 8, {
				filter: "utun",
				presets: ["utun", "default"],
				shelfFocus: true,
			}).slice(1, 4),
		).toEqual([
			"SHELF CONTROL routes.filters",
			"> current=utun next=default saved=2",
			"enter=cycle route filter presets  ]=cycle P=save D=cleanup",
		]);
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
		expect(getRouteDetailViewShortcut("1")).toBe("table");
		expect(getRouteDetailViewShortcut("2")).toBe("raw");
		expect(getRouteDetailViewShortcut("3")).toBe("diagnostics");
		expect(getRouteDetailViewShortcut("4")).toBe("path");
		expect(getRouteDetailViewShortcut("", { home: true })).toBe("table");
		expect(getRouteDetailViewShortcut("", { end: true })).toBe("path");
		expect(getRouteDetailViewShortcut("5")).toBeUndefined();
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

	test("writes config-origin metadata into route handoff files", () => {
		const plan = createRouteRawHandoffPlan(fixture, {
			baseDir: "/tmp/picos",
			generatedAt: new Date("2026-06-30T12:00:00.000Z"),
			origin: configRouteOrigin,
			view: "raw",
		});

		expect(plan?.origin).toEqual(configRouteOrigin);
		expect(plan?.content).toContain("originKind=config-shelf\n");
		expect(plan?.content).toContain("originTarget=routes\n");
		expect(plan?.content).toContain("originLabel=Routes\n");
		expect(plan?.content).toContain("originScope=routes.filters\n");
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
