import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FileOpenOrigin } from "../src/core/fileOpen";
import {
	createEndpointFilterCleanupPreview,
	createEndpointHandoffPlan,
	createSelectedPortProcessControlPreview,
	formatConnectionsWorkspaceRows,
	formatEndpointWorkspaceHintRow,
	formatPortProcessControlConfirmationAuditMessage,
	formatPortProcessControlExecutionRows,
	formatPortProcessControlInspectorRows,
	formatPortsWorkspaceRows,
	getEndpointDetailViewShortcut,
	getEndpointWorkspaceHintKeys,
	getSelectedConnectionClipboardPreview,
	getSelectedConnectionProcessRequest,
	getSelectedPortClipboardPreview,
	getSelectedPortProcessRequest,
	moveEndpointSelection,
	nextEndpointDetailView,
	nextEndpointFilterPreset,
	prepareEndpointFilterTransition,
	prepareEndpointPanelInput,
	preparePortProcessControlPalettePreview,
	preparePortProcessControlSubmission,
	repairEndpointSelection,
	resolveEndpointSelectedRow,
	saveEndpointFilterPreset,
	submitEndpointFilterCleanupConfirmation,
	submitPortProcessControlConfirmation,
	writeEndpointHandoffPlan,
} from "../src/tui/endpointPanel";

const configPortOrigin: FileOpenOrigin = {
	kind: "config-shelf",
	target: "ports",
	label: "Ports",
	scope: "ports.filters",
};

describe("endpoint TUI panel formatting", () => {
	test("clamps empty and last-row endpoint selection in the panel", () => {
		const rows = [
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "3000",
				remoteAddress: "127.0.0.1",
				remotePort: "52000",
				state: "ESTABLISHED",
			},
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "4000",
				remoteAddress: "127.0.0.1",
				remotePort: "53000",
				state: "CLOSE_WAIT",
			},
		];
		expect(repairEndpointSelection(9, 0)).toBe(0);
		expect(repairEndpointSelection(9, rows.length)).toBe(1);
		expect(resolveEndpointSelectedRow([], 9)).toBeUndefined();
		expect(resolveEndpointSelectedRow(rows, 9)).toEqual(rows[1]);
		expect(moveEndpointSelection(1, rows.length, "next")).toBe(0);
	});

	test("owns endpoint filter application and exact notices", () => {
		const rows = [
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "3000",
				remoteAddress: "127.0.0.1",
				remotePort: "52000",
				state: "ESTABLISHED",
			},
		];
		expect(
			prepareEndpointFilterTransition({
				kind: "connections",
				rows,
				presets: ["tcp4"],
				query: " ",
			}),
		).toEqual({
			filter: "",
			presets: ["tcp4"],
			selectedIndex: 0,
			copyPreview: false,
			processControlPreview: false,
			notice: { level: "info", message: "connections filter cleared" },
		});
		expect(
			prepareEndpointFilterTransition({
				kind: "ports",
				rows: [],
				presets: [],
				query: " ",
			}),
		).toEqual({
			filter: "",
			presets: [],
			selectedIndex: 0,
			copyPreview: false,
			processControlPreview: false,
			notice: { level: "warn", message: "ports filter cleared" },
		});
	});

	test("normalizes endpoint arrow movement without losing j and k", () => {
		const connectionRows = [
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "3000",
				remoteAddress: "127.0.0.1",
				remotePort: "52000",
			},
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "4000",
				remoteAddress: "127.0.0.1",
				remotePort: "53000",
			},
		];
		const portRows = [
			{
				protocol: "tcp",
				localAddress: "*",
				localPort: "3000",
				pid: "123",
				command: "node",
				user: "alice",
			},
			{
				protocol: "tcp",
				localAddress: "*",
				localPort: "4000",
				pid: "456",
				command: "bun",
				user: "alice",
			},
		];
		const expectedNext = {
			kind: "selection" as const,
			selectedIndex: 1,
			copyPreview: false as const,
			processControlPreview: false as const,
		};
		const expectedPrevious = {
			kind: "selection" as const,
			selectedIndex: 0,
			copyPreview: false as const,
			processControlPreview: false as const,
		};
		for (const state of [
			{ kind: "connections" as const, rows: connectionRows },
			{ kind: "ports" as const, rows: portRows },
		]) {
			const base = {
				...state,
				view: "detail" as const,
				filter: "",
				presets: [] as string[],
				visibleRows: state.rows,
			};
			expect(
				prepareEndpointPanelInput({
					...base,
					input: "",
					downArrow: true,
					selectedIndex: 0,
				}),
			).toEqual(expectedNext);
			expect(
				prepareEndpointPanelInput({
					...base,
					input: "j",
					selectedIndex: 0,
				}),
			).toEqual(expectedNext);
			expect(
				prepareEndpointPanelInput({
					...base,
					input: "",
					upArrow: true,
					selectedIndex: 1,
				}),
			).toEqual(expectedPrevious);
			expect(
				prepareEndpointPanelInput({
					...base,
					input: "k",
					selectedIndex: 1,
				}),
			).toEqual(expectedPrevious);
		}
	});

	test("derives scoped endpoint intents from shared bindings", () => {
		const base = {
			view: "raw" as const,
			filter: "",
			presets: [] as string[],
			rows: [] as const,
			selectedIndex: 0,
		};
		expect(
			prepareEndpointPanelInput({ ...base, kind: "connections", input: "I" }),
		).toEqual({ kind: "no-op" });
		expect(
			prepareEndpointPanelInput({ ...base, kind: "ports", input: "I" }),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no port process policy to inspect",
			},
		});
		const selectedPort = {
			protocol: "tcp",
			localAddress: "*",
			localPort: "3000",
			pid: "123",
			command: "node",
			user: "alice",
		};
		expect(
			prepareEndpointPanelInput({
				...base,
				kind: "ports",
				input: "I",
				rows: [selectedPort],
				processControlInspector: false,
			}),
		).toEqual({
			kind: "inspect-policy",
			scope: "ports",
			port: selectedPort,
			inspectorVisible: true,
			io: { kind: "load-process-files", pid: "123" },
			notice: {
				level: "info",
				message: "ports process policy inspector 123",
			},
		});
		expect(
			prepareEndpointPanelInput({ ...base, kind: "ports", input: "4" }),
		).toEqual({ kind: "no-op" });
		expect(
			prepareEndpointPanelInput({ ...base, kind: "ports", input: "D" }),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no ports filter presets to clean" },
		});
	});

	test("blocks port policy and control intents without a usable numeric pid", () => {
		const port = (pid: string) => ({
			protocol: "tcp",
			localAddress: "*",
			localPort: "3000",
			pid,
			command: "node",
			user: "alice",
		});
		const base = {
			kind: "ports" as const,
			view: "process" as const,
			filter: "",
			presets: [] as string[],
			selectedIndex: 0,
		};
		expect(
			prepareEndpointPanelInput({ ...base, input: "K", rows: [] }),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no port process selected" },
		});
		for (const pid of ["-", "abc", "12x"]) {
			expect(
				prepareEndpointPanelInput({
					...base,
					input: "I",
					rows: [port(pid)],
					processControlInspector: true,
				}),
			).toEqual({
				kind: "notice",
				notice: {
					level: "warn",
					message: "no port process policy to inspect",
				},
			});
			expect(
				prepareEndpointPanelInput({ ...base, input: "K", rows: [port(pid)] }),
			).toEqual({
				kind: "notice",
				notice: { level: "warn", message: "no port process selected" },
			});
		}
		const selected = port("123");
		expect(
			prepareEndpointPanelInput({
				...base,
				input: "I",
				rows: [selected],
				processControlInspector: false,
			}),
		).toEqual({
			kind: "inspect-policy",
			scope: "ports",
			port: selected,
			inspectorVisible: true,
			io: { kind: "load-process-files", pid: "123" },
			notice: {
				level: "info",
				message: "ports process policy inspector 123",
			},
		});
		expect(
			prepareEndpointPanelInput({
				...base,
				input: "I",
				rows: [selected],
				processControlInspector: true,
			}),
		).toEqual({
			kind: "inspect-policy",
			scope: "ports",
			port: selected,
			inspectorVisible: false,
			io: { kind: "none" },
			notice: {
				level: "info",
				message: "ports process policy inspector hidden",
			},
		});
		expect(
			prepareEndpointPanelInput({ ...base, input: "K", rows: [selected] }),
		).toMatchObject({
			kind: "control",
			scope: "ports",
			preview: { port: selected, confirmationPhrase: "kill pid 123" },
			copyPreview: false,
			notice: {
				level: "warn",
				message: "ports process control confirm kill pid 123",
			},
		});
	});
	test("formats connections with raw source output", () => {
		expect(
			formatConnectionsWorkspaceRows(
				{
					command: "netstat",
					args: ["-an"],
					connections: [
						{
							protocol: "tcp4",
							localAddress: "127.0.0.1",
							localPort: "3000",
							remoteAddress: "127.0.0.1",
							remotePort: "52000",
							state: "ESTABLISHED",
						},
					],
					rawOutput:
						"$ netstat -an\ntcp4 0 0 127.0.0.1.3000 127.0.0.1.52000 ESTABLISHED",
				},
				8,
			),
		).toEqual([
			"SUMMARY connections=1 established=1 command=netstat -an",
			"ACTIVE",
			"tcp4   127.0.0.1:3000           127.0.0.1:52000          ESTABLISHED",
			"RAW OUTPUT",
			"$ netstat -an",
			"tcp4 0 0 127.0.0.1.3000 127.0.0.1.52000 ESTABLISHED",
		]);
	});

	test("formats filtered and sorted connection workspace rows", () => {
		expect(
			formatConnectionsWorkspaceRows(
				{
					command: "netstat",
					args: ["-an"],
					connections: [
						{
							protocol: "tcp4",
							localAddress: "127.0.0.1",
							localPort: "3000",
							remoteAddress: "127.0.0.1",
							remotePort: "52000",
							state: "ESTABLISHED",
						},
						{
							protocol: "tcp4",
							localAddress: "192.168.0.20",
							localPort: "61000",
							remoteAddress: "142.250.207.14",
							remotePort: "443",
							state: "SYN_SENT",
						},
					],
					rawOutput: "$ netstat -an\nraw",
				},
				8,
				{
					filter: "443",
					sort: { key: "remotePort", direction: "asc" },
				},
			),
		).toContain(
			"SUMMARY connections=1/2 established=0 sort=remotePort asc filter=443 command=netstat -an",
		);
	});

	test("formats selected endpoint preset shelf controls for config focus", () => {
		const result = {
			command: "netstat",
			args: ["-an"],
			connections: [
				{
					protocol: "tcp4",
					localAddress: "192.168.0.20",
					localPort: "61000",
					remoteAddress: "142.250.207.14",
					remotePort: "443",
					state: "SYN_SENT",
				},
			],
			rawOutput: "$ netstat -an\nraw",
		};

		expect(
			formatConnectionsWorkspaceRows(result, 8, {
				filter: "443",
				presets: ["443", "node"],
				shelfFocus: true,
			}).slice(1, 4),
		).toEqual([
			"SHELF CONTROL connections.filters",
			"> current=443 next=node saved=2",
			"enter=cycle connection filter presets  ]=cycle P=save D=cleanup",
		]);
	});

	test("saves and cycles endpoint search presets", () => {
		expect(saveEndpointFilterPreset([], " 443 ")).toEqual(["443"]);
		expect(saveEndpointFilterPreset(["node", "443"], "node")).toEqual([
			"node",
			"443",
		]);
		expect(
			saveEndpointFilterPreset(["ssh", "node", "443"], "postgres"),
		).toEqual(["postgres", "ssh", "node", "443"]);
		expect(nextEndpointFilterPreset(["443", "node"], "")).toBe("443");
		expect(nextEndpointFilterPreset(["443", "node"], "443")).toBe("node");
		expect(nextEndpointFilterPreset(["443", "node"], "node")).toBe("443");
		expect(nextEndpointFilterPreset([], "443")).toBeUndefined();
	});

	test("requires exact confirmation before clearing saved endpoint filter presets", () => {
		const presets = ["443", "node"];
		const preview = createEndpointFilterCleanupPreview("connections", presets);

		expect(preview).toEqual({
			kind: "connections",
			count: 2,
			confirmationPhrase: "clear connections",
			cleanup: {
				id: "connections.filters",
				label: "Connections filter presets",
				scope: "connections",
				count: 2,
				verb: "clear",
				confirmationPhrase: "clear connections",
				rows: [
					"CONFIG CLEANUP",
					"target=Connections filter presets",
					"scope=connections count=2",
					"confirm clear connections locked",
				],
			},
			rows: [
				"ENDPOINT FILTER CLEANUP",
				"kind=connections presets=2",
				"confirm clear connections locked",
			],
		});
		expect(
			submitEndpointFilterCleanupConfirmation(
				"connections",
				presets,
				"clear connection",
				2,
			),
		).toEqual({
			action: "notice",
			confirmed: false,
			kind: "connections",
			message: "connections filter cleanup rejected",
			presets,
			removed: 0,
			notice: {
				level: "warn",
				message: "connections filter cleanup rejected",
			},
		});
		expect(
			submitEndpointFilterCleanupConfirmation("ports", [], "clear ports", 3),
		).toEqual({
			action: "notice",
			confirmed: false,
			kind: "ports",
			message: "ports filter cleanup unavailable",
			presets: [],
			removed: 0,
			notice: {
				level: "warn",
				message: "ports filter cleanup unavailable",
			},
		});
		expect(
			submitEndpointFilterCleanupConfirmation(
				"connections",
				presets,
				" clear connections ",
				2,
			),
		).toEqual({
			action: "apply",
			confirmed: true,
			kind: "connections",
			message: "connections filter cleanup removed 2 presets",
			presets: [],
			removed: 2,
			selectedIndex: 0,
			copyPreview: false,
			processControlPreview: false,
			notice: {
				level: "info",
				message: "connections filter cleanup removed 2 presets",
			},
		});
		expect(
			createEndpointFilterCleanupPreview("ports", ["8080"])?.confirmationPhrase,
		).toBe("clear ports");
		expect(createEndpointFilterCleanupPreview("ports", [])).toBeUndefined();
	});

	test("formats selected connection details and copy preview", () => {
		const rows = formatConnectionsWorkspaceRows(
			{
				command: "netstat",
				args: ["-an"],
				connections: [
					{
						protocol: "tcp4",
						localAddress: "127.0.0.1",
						localPort: "3000",
						remoteAddress: "127.0.0.1",
						remotePort: "52000",
						state: "ESTABLISHED",
					},
					{
						protocol: "tcp4",
						localAddress: "192.168.0.20",
						localPort: "61000",
						remoteAddress: "142.250.207.14",
						remotePort: "443",
						state: "SYN_SENT",
						pid: "4242",
					},
				],
				rawOutput: "$ netstat -an\nraw",
			},
			14,
			{
				copyPreview: true,
				selectedIndex: 1,
			},
		);

		expect(rows).toContain(
			"> tcp4   192.168.0.20:61000       142.250.207.14:443       SYN_SENT",
		);
		expect(rows).toContain("DETAIL connection 2/2");
		expect(rows).toContain("local 192.168.0.20:61000");
		expect(rows).toContain("remote 142.250.207.14:443");
		expect(rows).toContain("state SYN_SENT pid=4242");
		expect(rows).toContain("CLIPBOARD PREVIEW connection");
		expect(rows).toContain("copy 192.168.0.20:61000 -> 142.250.207.14:443");
		expect(rows).toContain("confirm copy locked");
	});

	test("formats connection detail tabs for raw and process focus", () => {
		const result = {
			command: "netstat",
			args: ["-anv"],
			connections: [
				{
					protocol: "tcp4",
					localAddress: "192.168.0.20",
					localPort: "61000",
					remoteAddress: "142.250.207.14",
					remotePort: "443",
					state: "ESTABLISHED",
					pid: "4242",
				},
			],
			rawOutput: "$ netstat -anv\nraw connection line",
		};

		expect(nextEndpointDetailView("detail")).toBe("raw");
		expect(nextEndpointDetailView("raw")).toBe("process");
		expect(nextEndpointDetailView("process")).toBe("detail");
		expect(getEndpointDetailViewShortcut("1")).toBe("detail");
		expect(getEndpointDetailViewShortcut("2")).toBe("raw");
		expect(getEndpointDetailViewShortcut("3")).toBe("process");
		expect(getEndpointDetailViewShortcut("", { home: true })).toBe("detail");
		expect(getEndpointDetailViewShortcut("", { end: true })).toBe("process");
		expect(getEndpointDetailViewShortcut("4")).toBeUndefined();
		expect(
			formatConnectionsWorkspaceRows(result, 7, {
				selectedIndex: 0,
				view: "raw",
			}),
		).toEqual([
			"SUMMARY connections=1 established=1 view=raw command=netstat -anv",
			"ACTIVE",
			"> tcp4   192.168.0.20:61000       142.250.207.14:443       ESTABLISHED",
			"RAW OUTPUT",
			"$ netstat -anv",
			"raw connection line",
		]);
		expect(
			formatConnectionsWorkspaceRows(result, 8, {
				processes: [
					{
						pid: 4242,
						cpu: "2.5",
						memory: "1.1",
						command: "bun src/bin/picos.ts",
					},
				],
				selectedIndex: 0,
				view: "process",
			}),
		).toEqual([
			"SUMMARY connections=1 established=1 view=process command=netstat -anv",
			"ACTIVE",
			"> tcp4   192.168.0.20:61000       142.250.207.14:443       ESTABLISHED",
			"PROCESS connection 1/1 pid=4242",
			"process bun src/bin/picos.ts",
			"usage cpu=2.5% mem=1.1%",
			"inspect picos process 4242",
		]);
	});

	test("creates selected connection clipboard previews", () => {
		expect(
			getSelectedConnectionClipboardPreview(
				[
					{
						protocol: "tcp4",
						localAddress: "192.168.0.20",
						localPort: "61000",
						remoteAddress: "142.250.207.14",
						remotePort: "443",
						state: "SYN_SENT",
						pid: "4242",
					},
				],
				0,
			),
		).toEqual({
			source: "connection",
			label: "selected connection",
			copyText: "192.168.0.20:61000 -> 142.250.207.14:443",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedConnectionClipboardPreview([], 0)).toBeUndefined();
	});

	test("creates selected port clipboard previews", () => {
		expect(
			getSelectedPortClipboardPreview(
				[
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
				],
				0,
			),
		).toEqual({
			source: "port",
			label: "selected port",
			copyText: "*:3000 node pid=12345",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(getSelectedPortClipboardPreview([], 0)).toBeUndefined();
	});
	test("enriches selected connection details with matching process snapshot", () => {
		const rows = formatConnectionsWorkspaceRows(
			{
				command: "netstat",
				args: ["-anv"],
				connections: [
					{
						protocol: "tcp4",
						localAddress: "127.0.0.1",
						localPort: "3000",
						remoteAddress: "127.0.0.1",
						remotePort: "52000",
						state: "ESTABLISHED",
						pid: "12345",
					},
				],
				rawOutput: "$ netstat -anv\nraw",
			},
			14,
			{
				processes: [
					{
						pid: 12345,
						cpu: "2.5",
						memory: "1.1",
						command: "bun src/bin/picos.ts",
					},
				],
				selectedIndex: 0,
			},
		);

		expect(rows).toContain("process bun src/bin/picos.ts");
		expect(rows).toContain("usage cpu=2.5% mem=1.1%");
		expect(rows).toContain("inspect picos process 12345");
	});

	test("creates selected connection process handoff requests", () => {
		expect(
			getSelectedConnectionProcessRequest(
				[
					{
						protocol: "tcp4",
						localAddress: "127.0.0.1",
						localPort: "3000",
						remoteAddress: "127.0.0.1",
						remotePort: "52000",
						state: "ESTABLISHED",
						pid: "12345",
					},
				],
				0,
			),
		).toEqual({ pid: "12345", command: "picos process 12345 --files" });
		expect(
			getSelectedConnectionProcessRequest(
				[
					{
						protocol: "tcp4",
						localAddress: "127.0.0.1",
						localPort: "3000",
						remoteAddress: "127.0.0.1",
						remotePort: "52000",
					},
				],
				0,
			),
		).toBeUndefined();
	});

	test("formats ports with clipped raw source output", () => {
		expect(
			formatPortsWorkspaceRows(
				{
					command: "lsof",
					args: ["-nP", "-iTCP", "-sTCP:LISTEN"],
					ports: [
						{
							protocol: "tcp",
							localAddress: "*",
							localPort: "3000",
							pid: "12345",
							command: "node",
							user: "alice",
						},
					],
					rawOutput: "$ lsof\nCOMMAND PID\nnode 12345\npython 22222",
				},
				5,
			),
		).toEqual([
			"SUMMARY ports=1 command=lsof -nP -iTCP -sTCP:LISTEN",
			"LISTENING",
			"tcp    *:3000                   node               12345   alice",
			"RAW OUTPUT",
			"$ lsof",
		]);
	});

	test("formats filtered and sorted port workspace rows", () => {
		expect(
			formatPortsWorkspaceRows(
				{
					command: "lsof",
					args: ["-nP"],
					ports: [
						{
							protocol: "tcp",
							localAddress: "*",
							localPort: "3000",
							pid: "12345",
							command: "node",
							user: "alice",
						},
						{
							protocol: "tcp",
							localAddress: "127.0.0.1",
							localPort: "5432",
							pid: "222",
							command: "postgres",
							user: "alice",
						},
					],
					rawOutput: "$ lsof\nraw",
				},
				8,
				{
					filter: "node",
					sort: { key: "process", direction: "asc" },
				},
			),
		).toContain(
			"SUMMARY ports=1/2 sort=process asc filter=node command=lsof -nP",
		);
	});

	test("formats selected port details and copy preview", () => {
		const rows = formatPortsWorkspaceRows(
			{
				command: "lsof",
				args: ["-nP"],
				ports: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
					{
						protocol: "tcp",
						localAddress: "127.0.0.1",
						localPort: "5432",
						pid: "222",
						command: "postgres",
						user: "alice",
					},
				],
				rawOutput: "$ lsof\nraw",
			},
			14,
			{
				copyPreview: true,
				selectedIndex: 0,
			},
		);

		expect(rows).toContain(
			"> tcp    *:3000                   node               12345   alice",
		);
		expect(rows).toContain("DETAIL port 1/2");
		expect(rows).toContain("listen *:3000");
		expect(rows).toContain("process node pid=12345 user=alice");
		expect(rows).toContain("CLIPBOARD PREVIEW port");
		expect(rows).toContain("copy *:3000 node pid=12345");
		expect(rows).toContain("confirm copy locked");
	});

	test("formats port detail tabs for raw and process focus", () => {
		const result = {
			command: "lsof",
			args: ["-nP"],
			ports: [
				{
					protocol: "tcp",
					localAddress: "*",
					localPort: "3000",
					pid: "12345",
					command: "node",
					user: "alice",
				},
			],
			rawOutput: "$ lsof\nnode raw line",
		};

		expect(
			formatPortsWorkspaceRows(result, 7, {
				selectedIndex: 0,
				view: "raw",
			}),
		).toEqual([
			"SUMMARY ports=1 view=raw command=lsof -nP",
			"LISTENING",
			"> tcp    *:3000                   node               12345   alice",
			"RAW OUTPUT",
			"$ lsof",
			"node raw line",
		]);
		expect(
			formatPortsWorkspaceRows(result, 8, {
				processes: [
					{
						pid: 12345,
						cpu: "8.0",
						memory: "4.2",
						command: "node server.js",
					},
				],
				selectedIndex: 0,
				view: "process",
			}),
		).toEqual([
			"SUMMARY ports=1 view=process command=lsof -nP",
			"LISTENING",
			"> tcp    *:3000                   node               12345   alice",
			"PROCESS port 1/1 pid=12345",
			"snapshot node server.js",
			"usage cpu=8.0% mem=4.2%",
			"inspect picos process 12345",
		]);
	});

	test("enriches selected port details with matching process snapshot", () => {
		const rows = formatPortsWorkspaceRows(
			{
				command: "lsof",
				args: ["-nP"],
				ports: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
				],
				rawOutput: "$ lsof\nraw",
			},
			12,
			{
				processes: [
					{
						pid: 12345,
						cpu: "8.0",
						memory: "4.2",
						command: "node server.js",
					},
				],
				selectedIndex: 0,
			},
		);

		expect(rows).toContain("snapshot node server.js");
		expect(rows).toContain("usage cpu=8.0% mem=4.2%");
		expect(rows).toContain("inspect picos process 12345");
	});

	test("creates selected port process handoff requests", () => {
		expect(
			getSelectedPortProcessRequest(
				[
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
				],
				0,
			),
		).toEqual({ pid: "12345", command: "picos process 12345 --files" });
		expect(
			getSelectedPortProcessRequest(
				[
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "-",
						command: "node",
						user: "alice",
					},
				],
				0,
			),
		).toBeUndefined();
	});

	test("creates locked selected port process control previews", () => {
		const ports = [
			{
				protocol: "tcp",
				localAddress: "*",
				localPort: "3000",
				pid: "12345",
				command: "node",
				user: "alice",
			},
		];

		expect(createSelectedPortProcessControlPreview(ports, 0)).toEqual({
			actionId: "process.terminate",
			kind: "terminate",
			port: ports[0],
			confirmationPhrase: "kill pid 12345",
			risk: "destructive",
			privilege: "user",
			enabled: false,
			rows: [
				"PORT PROCESS CONTROL",
				"action=process.terminate status=locked risk=destructive privilege=user",
				"target port=*:3000 pid=12345 process=node user=alice",
				"confirm kill pid 12345 locked",
				"dryRun no process signal will be sent",
			],
		});
		expect(
			createSelectedPortProcessControlPreview(
				[
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "-",
						command: "node",
						user: "alice",
					},
				],
				0,
			),
		).toBeUndefined();
	});

	test("records selected port process control confirmations without execution", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "*",
					localPort: "3000",
					pid: "12345",
					command: "node",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}

		const accepted = submitPortProcessControlConfirmation(
			preview,
			" kill pid 12345 ",
		);
		expect(accepted).toEqual({
			actionId: "process.terminate",
			status: "confirmed-disabled",
			expectedPhrase: "kill pid 12345",
			receivedPhrase: "kill pid 12345",
			confirmed: true,
			executionEnabled: false,
			risk: "destructive",
			privilege: "user",
			port: preview.port,
		});
		expect(formatPortProcessControlConfirmationAuditMessage(accepted)).toBe(
			"port process control process.terminate status=confirmed-disabled risk=destructive privilege=user executionEnabled=false port=*:3000 pid=12345 process=node user=alice",
		);

		const rejected = submitPortProcessControlConfirmation(
			preview,
			"kill process",
		);
		expect(rejected).toEqual({
			actionId: "process.terminate",
			status: "rejected",
			expectedPhrase: "kill pid 12345",
			receivedPhrase: "kill process",
			confirmed: false,
			executionEnabled: false,
			risk: "destructive",
			privilege: "user",
			port: preview.port,
		});
		expect(formatPortProcessControlConfirmationAuditMessage(rejected)).toBe(
			"port process control process.terminate status=rejected risk=destructive privilege=user executionEnabled=false port=*:3000 pid=12345 process=node user=alice",
		);
	});

	test("owns port process control submission guards and exact audit notices", () => {
		expect(
			preparePortProcessControlSubmission({
				ports: [],
				selectedIndex: 0,
				input: "kill pid 123",
			}),
		).toEqual({
			kind: "blocked",
			closeCommandLine: true,
			processControlPreview: false,
			notices: [
				{ level: "warn", message: "port process control missing target" },
			],
		});

		const port = {
			protocol: "tcp",
			localAddress: "*",
			localPort: "3000",
			pid: "123",
			command: "node",
			user: "alice",
		};
		const transition = preparePortProcessControlSubmission({
			ports: [port],
			selectedIndex: 0,
			input: "kill pid 123",
		});
		expect(transition).toMatchObject({
			kind: "confirmation",
			closeCommandLine: true,
			processControlPreview: false,
			confirmation: {
				confirmed: true,
				executionEnabled: false,
			},
			executionRequest: {
				preview: {
					actionId: "process.terminate",
					port,
				},
				confirmation: {
					confirmed: true,
					executionEnabled: false,
				},
			},
			notices: [
				{
					level: "warn",
					message:
						"port process control process.terminate status=confirmed-disabled risk=destructive privilege=user executionEnabled=false port=*:3000 pid=123 process=node user=alice",
				},
			],
		});
		expect(transition).not.toHaveProperty("executionPlan");
	});

	test("owns palette control availability and actionable prompt routing", () => {
		expect(
			preparePortProcessControlPalettePreview({ ports: [], selectedIndex: 0 }),
		).toEqual({
			kind: "blocked",
			screen: "ports",
			focusArea: "workspaces",
			copyPreview: false,
			processControlPreview: false,
			notice: {
				level: "warn",
				message: "palette process control preview unavailable",
			},
		});
		const port = {
			protocol: "tcp",
			localAddress: "127.0.0.1",
			localPort: "5173",
			pid: "777",
			command: "vite",
			user: "alice",
		};
		expect(
			preparePortProcessControlPalettePreview({
				ports: [port],
				selectedIndex: 0,
			}),
		).toMatchObject({
			kind: "preview",
			screen: "ports",
			focusArea: "workspaces",
			copyPreview: false,
			processControlPreview: true,
			preview: { port, confirmationPhrase: "kill pid 777" },
			commandLinePrompt: "port-process-control",
			notice: {
				level: "warn",
				message: "ports process control confirm kill pid 777 via palette",
			},
		});
	});

	test("formats selected port process control execution policy blockers", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "*",
					localPort: "3000",
					pid: "12345",
					command: "node",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}
		const confirmation = submitPortProcessControlConfirmation(
			preview,
			"kill pid 12345",
		);

		expect(
			formatPortProcessControlExecutionRows(preview, confirmation, {
				adapter: "macos",
				command: "kill",
				args: ["-TERM", "<pid>"],
				note: "terminate a selected user-owned process",
			}),
		).toEqual([
			"CONTROL EXECUTION process.terminate",
			"status=blocked policy=disabled confirmed=true dryRun=true",
			"willExecute=false reason=mutation-controls-disabled",
			"blockers=mutation-controls-disabled",
			"adapter=macos",
			"command=kill -TERM 12345",
		]);
	});

	test("formats selected port process control inspector rows", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "127.0.0.1",
					localPort: "5173",
					pid: "777",
					command: "vite",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}

		expect(
			formatPortProcessControlInspectorRows(
				preview,
				{
					adapter: "linux",
					command: "kill",
					args: ["-TERM", "<pid>"],
					note: "terminate a selected user-owned process",
				},
				undefined,
				{
					pid: 777,
					cwd: "/Users/alice/project",
					fileEntries: [
						{
							descriptor: "txt",
							label: "REG",
							resourceKind: "file",
							path: "/Users/alice/project/package.json",
						},
						{
							descriptor: "sock",
							label: "TCP",
							resourceKind: "socket",
							path: "127.0.0.1:5173",
						},
					],
					openFiles: ["/Users/alice/project/package.json", "127.0.0.1:5173"],
					rawOutput: "p777\nfcwd\nn/Users/alice/project",
				},
			),
		).toEqual([
			"PORT CONTROL",
			"target=127.0.0.1:5173 pid=777 process=vite",
			"fileEvidence status=loaded cwd=yes openFiles=2 resources=3",
			"status=blocked policy=disabled confirmed=false dryRun=true",
			"willExecute=false reason=mutation-controls-disabled",
			"blockers=mutation-controls-disabled",
			"adapter=linux",
			"command=kill -TERM 777",
			"drilldown enter=process picos process 777 --files",
			"files from Processes: enter opens cwd/open file; c copies selected resource",
		]);
	});

	test("marks stale port inspector file evidence when the cached pid differs", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "127.0.0.1",
					localPort: "5173",
					pid: "777",
					command: "vite",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}

		expect(
			formatPortProcessControlInspectorRows(
				preview,
				{
					adapter: "linux",
					command: "kill",
					args: ["-TERM", "<pid>"],
					note: "terminate a selected user-owned process",
				},
				undefined,
				{
					pid: 778,
					cwd: "/Users/alice/old-project",
					fileEntries: [],
					openFiles: ["/Users/alice/old-project/package.json"],
					rawOutput: "p778\nfcwd\nn/Users/alice/old-project",
				},
			),
		).toContain("fileEvidence status=stale selectedPid=777 cachedPid=778");
	});

	test("marks unavailable port inspector file evidence lookup results", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "127.0.0.1",
					localPort: "5173",
					pid: "777",
					command: "vite",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}

		expect(
			formatPortProcessControlInspectorRows(
				preview,
				{
					adapter: "linux",
					command: "kill",
					args: ["-TERM", "<pid>"],
					note: "terminate a selected user-owned process",
				},
				undefined,
				undefined,
				{ status: "unavailable", pid: "777", reason: "no snapshot returned" },
			),
		).toContain(
			"fileEvidence status=unavailable pid=777 reason=no snapshot returned",
		);
	});

	test("marks failed port inspector file evidence lookups", () => {
		const preview = createSelectedPortProcessControlPreview(
			[
				{
					protocol: "tcp",
					localAddress: "127.0.0.1",
					localPort: "5173",
					pid: "777",
					command: "vite",
					user: "alice",
				},
			],
			0,
		);
		if (!preview) {
			throw new Error("expected port process control preview");
		}

		expect(
			formatPortProcessControlInspectorRows(
				preview,
				{
					adapter: "linux",
					command: "kill",
					args: ["-TERM", "<pid>"],
					note: "terminate a selected user-owned process",
				},
				undefined,
				undefined,
				{ status: "error", pid: "777", reason: "lsof permission denied" },
			),
		).toContain(
			"fileEvidence status=error pid=777 reason=lsof permission denied",
		);
	});

	test("formats selected port process control previews in the detail pane", () => {
		const rows = formatPortsWorkspaceRows(
			{
				command: "lsof",
				args: ["-nP"],
				ports: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
				],
				rawOutput: "$ lsof\nraw",
			},
			14,
			{
				selectedIndex: 0,
				processControlPreview: true,
			},
		);

		expect(rows).toContain("PORT PROCESS CONTROL");
		expect(rows).toContain(
			"action=process.terminate status=locked risk=destructive privilege=user",
		);
		expect(rows).toContain(
			"target port=*:3000 pid=12345 process=node user=alice",
		);
		expect(rows).toContain("confirm kill pid 12345 locked");
		expect(rows).toContain("dryRun no process signal will be sent");
	});

	test("creates endpoint handoff plans for connection and port evidence", () => {
		expect(
			createEndpointHandoffPlan("connections", {
				baseDir: "/tmp/picos",
				filter: "443",
				generatedAt: new Date("2026-06-30T12:00:00.000Z"),
				result: {
					command: "netstat",
					args: ["-anv"],
					connections: [
						{
							protocol: "tcp4",
							localAddress: "192.168.0.20",
							localPort: "61000",
							remoteAddress: "142.250.207.14",
							remotePort: "443",
							state: "ESTABLISHED",
							pid: "4242",
						},
					],
					rawOutput: "$ netstat -anv\nraw connection line",
				},
				sort: { key: "remotePort", direction: "asc" },
				view: "raw",
			}),
		).toEqual({
			path: "/tmp/picos/endpoints/picos-connections-raw-2026-06-30T120000000Z.md",
			label: "connections raw output",
			kind: "connections",
			view: "raw",
			content:
				"# picos endpoint handoff\n" +
				"generatedAt=2026-06-30T12:00:00.000Z\n" +
				"kind=connections\n" +
				"view=raw\n" +
				"label=connections raw output\n" +
				"command=netstat -anv\n" +
				"filter=443\n" +
				"sort=remotePort asc\n" +
				"\n" +
				"```txt\n" +
				"$ netstat -anv\n" +
				"raw connection line\n" +
				"```\n",
		});

		expect(
			createEndpointHandoffPlan("ports", {
				baseDir: "/tmp/picos",
				generatedAt: new Date("2026-06-30T12:00:00.000Z"),
				result: {
					command: "lsof",
					args: ["-nP"],
					ports: [
						{
							protocol: "tcp",
							localAddress: "*",
							localPort: "3000",
							pid: "12345",
							command: "node",
							user: "alice",
						},
					],
					rawOutput: "$ lsof\nnode raw line",
				},
				view: "detail",
			})?.content,
		).toContain("picos ports");
	});

	test("writes config-origin metadata into endpoint handoff files", () => {
		const plan = createEndpointHandoffPlan("ports", {
			baseDir: "/tmp/picos",
			generatedAt: new Date("2026-06-30T12:00:00.000Z"),
			origin: configPortOrigin,
			result: {
				command: "lsof",
				args: ["-nP"],
				ports: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "12345",
						command: "node",
						user: "alice",
					},
				],
				rawOutput: "$ lsof\nnode raw line",
			},
			view: "raw",
		});

		expect(plan.origin).toEqual(configPortOrigin);
		expect(plan.content).toContain("originKind=config-shelf\n");
		expect(plan.content).toContain("originTarget=ports\n");
		expect(plan.content).toContain("originLabel=Ports\n");
		expect(plan.content).toContain("originScope=ports.filters\n");
	});

	test("writes endpoint handoff files", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-endpoint-handoff-"));
		try {
			const plan = createEndpointHandoffPlan("ports", {
				baseDir: root,
				generatedAt: new Date("2026-06-30T12:00:00.000Z"),
				result: {
					command: "lsof",
					args: ["-nP"],
					ports: [
						{
							protocol: "tcp",
							localAddress: "*",
							localPort: "3000",
							pid: "12345",
							command: "node",
							user: "alice",
						},
					],
					rawOutput: "$ lsof\nnode raw line",
				},
				view: "raw",
			});
			if (!plan) {
				throw new Error("expected endpoint handoff plan");
			}

			const written = await writeEndpointHandoffPlan(plan);

			expect(written.path).toBe(
				join(root, "endpoints", "picos-ports-raw-2026-06-30T120000000Z.md"),
			);
			expect(await readFile(written.path, "utf8")).toBe(plan.content);
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});
});

describe("endpoint workspace hint rows", () => {
	test("shows only always-actionable controls while a snapshot is loading", () => {
		expect(
			formatEndpointWorkspaceHintRow("connections", {
				snapshotLoaded: false,
				filter: "",
				presetCount: 0,
				visibleRows: [],
				selectedIndex: 0,
			}),
		).toBe("active endpoints · f filter · tab/1-3 detail · home/end");
	});

	test("keeps loaded-empty export and open but hides filter and selection actions", () => {
		expect(
			formatEndpointWorkspaceHintRow("ports", {
				snapshotLoaded: true,
				filter: "   ",
				presetCount: 0,
				visibleRows: [],
				selectedIndex: 0,
			}),
		).toBe(
			"listening ports · f filter · e export · o open · tab/1-3 detail · home/end",
		);
	});

	test("shows filter and preset actions for one selected row without immobile j/k", () => {
		expect(
			formatEndpointWorkspaceHintRow("ports", {
				snapshotLoaded: true,
				filter: " node ",
				presetCount: 2,
				visibleRows: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "123",
						command: "node",
						user: "alice",
					},
				],
				selectedIndex: 0,
			}),
		).toBe(
			"listening ports · f filter · P save · ] preset · D cleanup · e export · o open · enter Processes / picos process · I inspector · K control · tab/1-3 detail · home/end",
		);
	});

	test("shows j/k for a movable multi-row domain without inventing filter presets", () => {
		const rows = [
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "3000",
				remoteAddress: "127.0.0.1",
				remotePort: "52000",
				pid: "4242",
			},
			{
				protocol: "tcp4",
				localAddress: "127.0.0.1",
				localPort: "3001",
				remoteAddress: "127.0.0.1",
				remotePort: "52001",
				pid: undefined,
			},
		];
		const hint = formatEndpointWorkspaceHintRow("connections", {
			snapshotLoaded: true,
			filter: "",
			presetCount: 0,
			visibleRows: rows,
			selectedIndex: 0,
		});

		expect(hint).toBe(
			"active endpoints · f filter · e export · o open · enter Processes / picos process · tab/1-3 detail · home/end · j/k select",
		);
	});

	test("advertises actionable port controls and names the Processes handoff", () => {
		expect(
			formatEndpointWorkspaceHintRow("ports", {
				snapshotLoaded: true,
				filter: "node",
				presetCount: 1,
				visibleRows: [
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "3000",
						pid: "123",
						command: "node",
						user: "alice",
					},
				],
				selectedIndex: 0,
			}),
		).toBe(
			"listening ports · f filter · P save · ] preset · D cleanup · e export · o open · enter Processes / picos process · I inspector · K control · tab/1-3 detail · home/end",
		);
	});

	test("advertises the named Processes handoff only for a selected connection PID", () => {
		const selected = {
			protocol: "tcp4",
			localAddress: "127.0.0.1",
			localPort: "3000",
			remoteAddress: "127.0.0.1",
			remotePort: "52000",
			pid: "4242",
		};
		expect(
			formatEndpointWorkspaceHintRow("connections", {
				snapshotLoaded: true,
				filter: "tcp4",
				presetCount: 1,
				visibleRows: [selected],
				selectedIndex: 0,
			}),
		).toBe(
			"active endpoints · f filter · P save · ] preset · D cleanup · e export · o open · enter Processes / picos process · tab/1-3 detail · home/end",
		);
		expect(
			formatEndpointWorkspaceHintRow("connections", {
				snapshotLoaded: true,
				filter: "",
				presetCount: 0,
				visibleRows: [{ ...selected, pid: undefined }],
				selectedIndex: 0,
			}),
		).not.toContain("enter");
	});

	test("omits port inspector and control keys when no numeric PID can act", () => {
		const hint = formatEndpointWorkspaceHintRow("ports", {
			snapshotLoaded: true,
			filter: "",
			presetCount: 0,
			visibleRows: [
				{
					protocol: "tcp",
					localAddress: "*",
					localPort: "3000",
					pid: "-",
					command: "node",
					user: "alice",
				},
			],
			selectedIndex: 0,
		});
		expect(hint).not.toContain("enter");
		expect(hint).not.toContain("I inspector");
		expect(hint).not.toContain("K control");
	});

	test("derives control availability from the supplied visible endpoint domain", () => {
		const hint = formatEndpointWorkspaceHintRow("ports", {
			snapshotLoaded: true,
			filter: "postgres",
			presetCount: 0,
			visibleRows: [
				{
					protocol: "tcp",
					localAddress: "127.0.0.1",
					localPort: "5432",
					pid: "222",
					command: "postgres",
					user: "alice",
				},
			],
			selectedIndex: 0,
		});
		expect(hint).toContain("enter Processes / picos process");
		expect(hint).toContain("I inspector");
		expect(hint).toContain("K control");
	});

	test("scopes inspector and control to ports and shares the rest", () => {
		const connections = getEndpointWorkspaceHintKeys("connections");
		const ports = getEndpointWorkspaceHintKeys("ports");
		expect(connections.every((key) => ports.includes(key))).toBe(true);
		expect(ports.filter((key) => !connections.includes(key))).toEqual([
			"I",
			"K",
		]);
	});
});
