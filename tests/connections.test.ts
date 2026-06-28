import { describe, expect, test } from "bun:test";
import {
	buildConnectionsCommand,
	formatConnections,
	parseConnections,
} from "../src/core/connections";

describe("lazyifconfig-style connections inspector", () => {
	test("builds platform commands", () => {
		expect(buildConnectionsCommand("darwin")).toEqual({
			command: "netstat",
			args: ["-an"],
		});
		expect(buildConnectionsCommand("win32")).toEqual({
			command: "netstat",
			args: ["-ano"],
		});
	});

	test("parses POSIX netstat connections", () => {
		const connections = parseConnections(
			"tcp4       0      0  192.168.0.20.52344    142.250.207.14.443    ESTABLISHED",
		);

		expect(connections).toContainEqual({
			protocol: "tcp4",
			localAddress: "192.168.0.20",
			localPort: "52344",
			remoteAddress: "142.250.207.14",
			remotePort: "443",
			state: "ESTABLISHED",
		});
	});

	test("parses Windows netstat connections including PID", () => {
		const connections = parseConnections(
			"TCP    127.0.0.1:24801        127.0.0.1:52108        ESTABLISHED     4684",
		);

		expect(connections).toContainEqual({
			protocol: "tcp",
			localAddress: "127.0.0.1",
			localPort: "24801",
			remoteAddress: "127.0.0.1",
			remotePort: "52108",
			state: "ESTABLISHED",
			pid: "4684",
		});
	});

	test("parses bracketed IPv6 endpoints", () => {
		const connections = parseConnections(
			"tcp6       0      0  [::1]:3000    [::1]:52000    ESTABLISHED",
		);

		expect(connections[0]).toMatchObject({
			localAddress: "::1",
			localPort: "3000",
			remoteAddress: "::1",
			remotePort: "52000",
		});
	});

	test("formats connection results", () => {
		const output = formatConnections({
			command: "netstat",
			args: ["-an"],
			rawOutput: "raw",
			connections: [
				{
					protocol: "tcp4",
					localAddress: "127.0.0.1",
					localPort: "3000",
					remoteAddress: "127.0.0.1",
					remotePort: "50000",
					state: "ESTABLISHED",
				},
			],
		});

		expect(output).toContain("Connections: 1");
		expect(output).toContain("127.0.0.1:3000");
	});
});
