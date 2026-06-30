import { describe, expect, test } from "bun:test";
import {
	formatConnectionsWorkspaceRows,
	formatPortsWorkspaceRows,
} from "../src/tui/endpointPanel";

describe("endpoint TUI panel formatting", () => {
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
			12,
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
		expect(rows).toContain(
			"COPY PREVIEW 192.168.0.20:61000 -> 142.250.207.14:443",
		);
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
			12,
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
			12,
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
		expect(rows).toContain("COPY PREVIEW *:3000 node pid=12345");
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
	});
});
