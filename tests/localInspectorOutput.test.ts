import { describe, expect, test } from "bun:test";
import {
	assertLocalJsonOptions,
	formatConnectionsJson,
	formatHandoffArchiveJson,
	formatHandoffsJson,
	formatInfoJson,
	formatLocalInspectorJsonFailure,
	formatPortsJson,
	formatRoutePathJson,
	formatRoutesJson,
	isLocalJsonRequested,
	LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
	LOCAL_INSPECTOR_JSON_MAX_BYTES,
	LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
	parseLocalJsonFlag,
	reportLocalInspectorCliParseFailure,
	reportLocalInspectorJsonFailure,
} from "../src/cli/localInspectorOutput";
import type { NetworkSummary } from "../src/core/types";

const network: NetworkSummary = {
	status: "online",
	host: "devbox",
	platform: "linux",
	interfaces: [
		{
			name: "eth0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.1.20",
			ipv4Cidr: "192.168.1.20/24",
			mtu: 1500,
		},
	],
	networkGroups: [
		{
			kind: "lan",
			label: "LAN",
			scope: "private",
			hint: "local network",
			interfaces: ["eth0"],
			addresses: ["192.168.1.20"],
		},
	],
	primaryInterface: {
		name: "eth0",
		status: "connected",
		kind: "wifiOrEthernet",
		ipv4: "192.168.1.20",
	},
	gateway: "192.168.1.1",
	dnsServers: ["1.1.1.1"],
	sourceOutputs: [
		{
			key: "gateway",
			label: "default gateway",
			command: "ip",
			args: ["route"],
			output: "raw-secret-source-output",
			lineCount: 1,
			shownLines: 1,
			truncated: false,
			success: true,
			exitCode: 0,
		},
	],
};

describe("local inspector JSON output", () => {
	test("validates JSON flags and rejects raw output mixing", () => {
		expect(parseLocalJsonFlag(undefined)).toBeFalse();
		expect(parseLocalJsonFlag(true)).toBeTrue();
		expect(parseLocalJsonFlag("true")).toBeTrue();
		expect(parseLocalJsonFlag("false")).toBeFalse();
		expect(isLocalJsonRequested([false, "true"])).toBeTrue();
		expect(() => parseLocalJsonFlag([true, true])).toThrow(
			"--json is a boolean flag",
		);
		expect(() => assertLocalJsonOptions({ json: true, raw: true })).toThrow(
			"--raw cannot be combined with --json",
		);
	});

	test("formats a stable info snapshot without embedding raw source output", () => {
		const output = formatInfoJson({
			scope: "summary",
			system: {
				hostname: "devbox",
				platform: "linux",
				arch: "x64",
				release: "6.8.0",
				uptimeSeconds: 120,
			},
			network,
		});
		const result = JSON.parse(output);

		expect(result).toMatchObject({
			schemaVersion: LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
			command: "info",
			status: "completed",
			scope: "summary",
			data: {
				system: { hostname: "devbox", release: "6.8.0" },
				network: {
					gateway: "192.168.1.1",
					interfaces: [{ name: "eth0", mtu: 1500, ipv6: null }],
					sources: [{ command: "ip", success: true }],
				},
			},
		});
		expect(output).not.toContain("raw-secret-source-output");
		expect(result.data.network.sources[0]).not.toHaveProperty("output");
	});

	test("formats full inventory sections under the same schema", () => {
		const result = JSON.parse(
			formatInfoJson({
				scope: "full",
				inventory: {
					system: {
						hostname: "devbox",
						platform: "linux",
						arch: "x64",
						release: "6.8.0",
						uptimeSeconds: 120,
					},
					hardware: {
						cpuModel: "Test CPU",
						cpuCount: 8,
						totalMemoryBytes: 100,
						freeMemoryBytes: 25,
					},
					storage: [],
					processes: [
						{
							pid: 42,
							command: "/usr/bin/node server.js SECRET_TOKEN=hidden",
						},
					],
					network,
					permission: {
						user: "developer",
						isAdmin: false,
						detail: "user",
					},
					runtime: {
						picosVersion: "0.2.0",
						nodeVersion: "v26.0.0",
						bunVersion: "1.3.0",
						configPath: "/home/developer/.config/picos/config.json",
					},
					plugins: [],
					sources: [
						{
							key: "storage",
							command: "df",
							args: ["-h"],
							supported: true,
							success: false,
							exitCode: 1,
							truncated: false,
							totalCount: 0,
						},
						{
							key: "processes",
							command: "ps",
							args: ["-axo", "pid,pcpu,pmem,command"],
							supported: true,
							success: true,
							exitCode: 0,
							truncated: false,
							totalCount: 99,
						},
					],
				},
			}),
		);

		expect(result.scope).toBe("full");
		expect(result.data).toMatchObject({
			hardware: { cpuCount: 8 },
			processes: {
				totalCount: 99,
				returnedCount: 1,
				truncated: true,
				entries: [{ pid: 42, name: "node" }],
			},
			permission: { isAdmin: false },
			runtime: { picosVersion: "0.2.0" },
		});
		expect(result.data.sources[0]).toMatchObject({
			key: "storage",
			success: false,
			exitCode: 1,
		});
		expect(JSON.stringify(result)).not.toContain("SECRET_TOKEN");
		expect(JSON.stringify(result)).not.toContain("server.js");
		expect(result.data.storage).toMatchObject({
			totalCount: 0,
			returnedCount: 0,
			truncated: false,
			volumes: [],
		});
	});

	test("filters and sorts connections while reporting all counts", () => {
		const result = JSON.parse(
			formatConnectionsJson(
				{
					command: "netstat",
					args: ["-an"],
					rawOutput: "must-not-appear",
					success: true,
					exitCode: 0,
					connections: [
						{
							protocol: "tcp4",
							localAddress: "127.0.0.1",
							localPort: "3000",
							remoteAddress: "127.0.0.1",
							remotePort: "50000",
							state: "ESTABLISHED",
						},
						{
							protocol: "tcp4",
							localAddress: "192.168.1.20",
							localPort: "61000",
							remoteAddress: "142.250.1.1",
							remotePort: "443",
							state: "SYN_SENT",
							pid: "42",
						},
					],
				},
				{
					filter: "443",
					sort: { key: "remotePort", direction: "desc" },
				},
			),
		);

		expect(result).toMatchObject({
			command: "connections",
			request: {
				filter: "443",
				sort: { key: "remotePort", direction: "desc" },
			},
			source: {
				command: "netstat",
				args: ["-an"],
				success: true,
				exitCode: 0,
				truncated: false,
			},
			data: {
				totalCount: 2,
				visibleCount: 1,
				returnedCount: 1,
				truncated: false,
				connections: [{ remotePort: "443", pid: "42" }],
			},
		});
		expect(JSON.stringify(result)).not.toContain("must-not-appear");
	});

	test("bounds large connection snapshots", () => {
		const connections = Array.from(
			{ length: LOCAL_INSPECTOR_JSON_ENTRY_LIMIT + 1 },
			(_, index) => ({
				protocol: "tcp",
				localAddress: "127.0.0.1",
				localPort: String(index),
				remoteAddress: "127.0.0.1",
				remotePort: "443",
			}),
		);
		const result = JSON.parse(
			formatConnectionsJson(
				{ command: "netstat", args: ["-an"], rawOutput: "", connections },
				{ sort: { key: "localPort", direction: "asc" } },
			),
		);

		expect(result.data.totalCount).toBe(LOCAL_INSPECTOR_JSON_ENTRY_LIMIT + 1);
		expect(result.data.returnedCount).toBe(LOCAL_INSPECTOR_JSON_ENTRY_LIMIT);
		expect(result.data.truncated).toBeTrue();
	});

	test("caps serialized table bytes and individual OS-derived fields", () => {
		const huge = "z".repeat(10_000);
		const connections = Array.from({ length: 1_000 }, (_, index) => ({
			protocol: "tcp",
			localAddress: huge,
			localPort: String(index),
			remoteAddress: huge,
			remotePort: "443",
		}));
		const output = formatConnectionsJson(
			{ command: "netstat", args: ["-an"], rawOutput: "", connections },
			{ sort: { key: "localPort", direction: "asc" } },
		);
		const result = JSON.parse(output);

		expect(Buffer.byteLength(output, "utf8")).toBeLessThanOrEqual(
			LOCAL_INSPECTOR_JSON_MAX_BYTES,
		);
		expect(result.data.returnedCount).toBeLessThan(result.data.visibleCount);
		expect(result.data.connections[0].localAddress.length).toBeLessThanOrEqual(
			4_096,
		);
		expect(result.data.truncated).toBeTrue();
	});

	test("fits serialized rows to a complete document", () => {
		const address = "2001:db8:".padEnd(250, "a");
		const connections = Array.from({ length: 10_000 }, (_, index) => ({
			protocol: "tcp6",
			localAddress: address,
			localPort: String(index),
			remoteAddress: address,
			remotePort: "443",
			state: "ESTABLISHED",
		}));
		const output = formatConnectionsJson(
			{
				command: "netstat",
				args: ["-an"],
				rawOutput: "",
				connections,
				success: true,
				exitCode: 0,
			},
			{ sort: { key: "localPort", direction: "asc" } },
		);
		const result = JSON.parse(output);

		expect(Buffer.byteLength(output, "utf8")).toBeLessThanOrEqual(
			LOCAL_INSPECTOR_JSON_MAX_BYTES,
		);
		expect(result.status).toBe("completed");
		expect(result.data.returnedCount).toBeLessThan(10_000);
		expect(result.data.truncated).toBeTrue();
	});

	test("formats listening ports with filter metadata", () => {
		const result = JSON.parse(
			formatPortsJson(
				{
					command: "ss",
					args: ["-ltnp"],
					rawOutput: "raw",
					ports: [
						{
							protocol: "tcp",
							localAddress: "127.0.0.1",
							localPort: "5432",
							pid: "123",
							command: "postgres",
							user: "developer",
						},
					],
				},
				{ filter: "postgres", sort: { key: "process", direction: "asc" } },
			),
		);

		expect(result).toMatchObject({
			command: "ports",
			data: {
				visibleCount: 1,
				ports: [{ localPort: "5432", command: "postgres" }],
			},
		});
	});

	test("formats route diagnostics, table rows, and destination paths", () => {
		const table = JSON.parse(
			formatRoutesJson(
				{
					command: "ip",
					args: ["route", "show", "table", "all"],
					rawOutput: "raw",
					diagnostics: [{ status: "pass", label: "Default route present" }],
					routes: [
						{
							destination: "default",
							gateway: "192.168.1.1",
							interfaceName: "eth0",
							family: "ipv4",
						},
					],
				},
				{ sort: { key: "default", direction: "asc" } },
			),
		);
		const path = JSON.parse(
			formatRoutePathJson({
				destination: "8.8.8.8",
				gateway: "192.168.1.1",
				interfaceName: "eth0",
				sourceIp: "192.168.1.20",
				rawOutput: "raw",
				command: "ip",
				args: ["route", "get", "8.8.8.8"],
				success: true,
				exitCode: 0,
				truncated: false,
			}),
		);

		expect(table.data).toMatchObject({
			diagnostics: [{ detail: null }],
			routes: [{ destination: "default", metric: null }],
		});
		expect(path).toMatchObject({
			command: "route",
			request: { destination: "8.8.8.8" },
			source: { command: "ip", success: true, exitCode: 0 },
			data: { interfaceName: "eth0", sourceIp: "192.168.1.20" },
		});
		expect(JSON.stringify(path)).not.toContain("raw");
	});

	test("rejects failed and capture-truncated source commands", () => {
		expect(() =>
			formatConnectionsJson(
				{
					command: "netstat",
					args: ["-an"],
					rawOutput: "not found",
					connections: [],
					success: false,
					exitCode: 1,
				},
				{ sort: { key: "state", direction: "asc" } },
			),
		).toThrow("Connections command failed");
		expect(() =>
			formatPortsJson(
				{
					command: "lsof",
					args: [],
					rawOutput: "",
					ports: [],
					success: false,
					exitCode: null,
					truncated: true,
				},
				{ sort: { key: "port", direction: "asc" } },
			),
		).toThrow("Listening ports command output was truncated");
	});

	test("includes bounded source evidence in failure documents", () => {
		let caught: unknown;
		try {
			formatConnectionsJson(
				{
					command: "netstat",
					args: ["-an"],
					rawOutput: "secret raw error",
					connections: [],
					success: false,
					exitCode: 127,
					truncated: false,
				},
				{ sort: { key: "state", direction: "asc" } },
			);
		} catch (error) {
			caught = error;
		}
		const output: string[] = [];
		expect(() =>
			reportLocalInspectorJsonFailure("connections", caught, {
				writeOutput: (value) => output.push(value),
			}),
		).toThrow();
		const result = JSON.parse(output[0] ?? "{}");
		expect(result.source).toEqual({
			command: "netstat",
			args: ["-an"],
			success: false,
			exitCode: 127,
			truncated: false,
		});
		expect(JSON.stringify(result)).not.toContain("secret raw error");
	});

	test("bounds structured failure messages and request values", () => {
		const result = JSON.parse(
			formatLocalInspectorJsonFailure({
				command: "routes",
				message:
					"/home/alice/.ssh/id_ed25519 SECRET_TOKEN=abc https://alice:password@example.com " +
					"x".repeat(10_000),
				request: { filter: `--api-key topsecret ${"y".repeat(10_000)}` },
			}),
		);

		expect(result).toMatchObject({
			status: "failed",
			error: { code: "PICOS_LOCAL_INSPECTOR_FAILED" },
		});
		expect(result.error.message.length).toBeLessThanOrEqual(4_096);
		expect(result.request.filter.length).toBeLessThanOrEqual(4_096);
		expect(JSON.stringify(result)).not.toContain("alice/.ssh/id_ed25519");
		expect(JSON.stringify(result)).not.toContain("SECRET_TOKEN=abc");
		expect(JSON.stringify(result)).not.toContain("alice:password");
		expect(JSON.stringify(result)).not.toContain("topsecret");
	});
});

describe("handoff index JSON", () => {
	const index = {
		baseDir: "/tmp/picos",
		items: [
			{
				source: "endpoint-handoff" as const,
				kind: "ports" as const,
				view: "raw",
				label: "ports raw output",
				command: "lsof -nP -iTCP -sTCP:LISTEN",
				generatedAt: "2026-07-29T10:00:00.000Z",
				path: "/tmp/picos/endpoints/picos-ports-raw-2026-07-29T100000000Z.md",
			},
			{
				source: "route-handoff" as const,
				kind: "routes" as const,
				view: "summary",
				label: "routes summary",
				command: "netstat -rn",
				generatedAt: "2026-07-29T09:00:00.000Z",
				origin: {
					kind: "config-shelf" as const,
					target: "ports",
					label: "Ports",
					scope: "ports.filters",
				},
				path: "/tmp/picos/routes/picos-routes-summary-2026-07-29T090000000Z.md",
			},
		],
	};

	test("publishes one schema-versioned listing document", () => {
		const document = JSON.parse(formatHandoffsJson(index, { limit: 20 }));
		expect(document.schemaVersion).toBe(LOCAL_INSPECTOR_JSON_SCHEMA_VERSION);
		expect(document.command).toBe("handoffs");
		expect(document.status).toBe("completed");
		expect(document.limits.maxBytes).toBe(LOCAL_INSPECTOR_JSON_MAX_BYTES);
		expect(document.source.kind).toBe("picos-handoff-index");
		expect(document.data.action).toBe("list");
		expect(document.data.returnedCount).toBe(2);
		expect(document.data.entryLimit).toBe(LOCAL_INSPECTOR_JSON_ENTRY_LIMIT);
		expect(document.data.handoffs[0].kind).toBe("ports");
		expect(document.data.handoffs[1].origin.scope).toBe("ports.filters");
		expect(document.data.handoffs[0].origin).toBeNull();
	});

	test("separates the read limit from byte truncation", () => {
		const atLimit = JSON.parse(formatHandoffsJson(index, { limit: 2 }));
		expect(atLimit.data.atRequestedLimit).toBe(true);
		expect(atLimit.data.truncated).toBe(false);
		const belowLimit = JSON.parse(formatHandoffsJson(index, { limit: 20 }));
		expect(belowLimit.data.atRequestedLimit).toBe(false);
		expect(belowLimit.data.truncated).toBe(false);
	});

	test("reports a blocked archive as a completed command", () => {
		const document = JSON.parse(
			formatHandoffArchiveJson(
				{
					status: "blocked",
					sourcePath: "/tmp/other/notes.txt",
					archivedPath: "",
					message: "handoff archive is limited to picos-owned handoff files",
				},
				{ archive: "/tmp/other/notes.txt" },
			),
		);
		expect(document.status).toBe("completed");
		expect(document.data.action).toBe("archive");
		expect(document.data.status).toBe("blocked");
		expect(document.data.archivedPath).toBeNull();
	});

	test("reports an archived file with its new path", () => {
		const document = JSON.parse(
			formatHandoffArchiveJson(
				{
					status: "archived",
					sourcePath: "/tmp/picos/routes/picos-routes-summary.md",
					archivedPath: "/tmp/picos/archive/routes/picos-routes-summary.md",
					message: "archived picos-routes-summary.md",
				},
				{ archive: "/tmp/picos/routes/picos-routes-summary.md" },
			),
		);
		expect(document.data.status).toBe("archived");
		expect(document.data.archivedPath).toBe(
			"/tmp/picos/archive/routes/picos-routes-summary.md",
		);
	});
});

describe("local inspector command recognition", () => {
	function captureParseFailure(argv: string[]): {
		handled: boolean;
		output: string;
	} {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			const handled = reportLocalInspectorCliParseFailure(
				argv,
				new Error("unknown option"),
			);
			return { handled, output: writes.join("\n") };
		} finally {
			console.log = originalLog;
		}
	}

	test("maps a handoffs parse failure onto the handoffs contract", () => {
		const { handled, output } = captureParseFailure(["handoffs", "--json"]);
		expect(handled).toBe(true);
		const document = JSON.parse(output);
		expect(document.command).toBe("handoffs");
		expect(document.status).toBe("failed");
		expect(document.error.code).toBe("PICOS_LOCAL_INSPECTOR_FAILED");
	});

	test("does not treat inherited object keys as commands", () => {
		expect(captureParseFailure(["toString", "--json"]).handled).toBe(false);
		expect(captureParseFailure(["constructor", "--json"]).handled).toBe(false);
	});
});
