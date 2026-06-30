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
});
