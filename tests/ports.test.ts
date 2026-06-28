import { describe, expect, test } from "bun:test";
import {
	buildPortsCommand,
	formatPorts,
	parseListeningPorts,
	parseLsofListeningPorts,
	parseSsListeningPorts,
	parseWindowsNetstatPorts,
} from "../src/core/ports";

describe("lazyifconfig-style ports inspector", () => {
	test("builds platform commands", () => {
		expect(buildPortsCommand("darwin")).toEqual({
			command: "lsof",
			args: ["-nP", "-iTCP", "-sTCP:LISTEN"],
		});
		expect(buildPortsCommand("linux")).toEqual({
			command: "ss",
			args: ["-ltnp"],
		});
		expect(buildPortsCommand("win32")).toEqual({
			command: "netstat",
			args: ["-ano"],
		});
	});

	test("parses lsof listening ports", () => {
		const ports =
			parseLsofListeningPorts(`COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   21u  IPv6 0x123      0t0  TCP *:3000 (LISTEN)
Python  23456 user    5u  IPv4 0x456      0t0  TCP 127.0.0.1:8000 (LISTEN)`);

		expect(ports).toContainEqual({
			protocol: "tcp",
			localAddress: "*",
			localPort: "3000",
			pid: "12345",
			command: "node",
			user: "user",
		});
		expect(ports[1]).toMatchObject({
			localAddress: "127.0.0.1",
			localPort: "8000",
		});
	});

	test("parses bracketed IPv6 listening ports", () => {
		const ports =
			parseLsofListeningPorts(`COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
redis   33333 user    6u  IPv6 0x789      0t0  TCP [::1]:6379 (LISTEN)`);

		expect(ports[0]).toMatchObject({
			localAddress: "::1",
			localPort: "6379",
		});
	});

	test("parses ss listening ports", () => {
		const ports = parseSsListeningPorts(
			`LISTEN 0 4096 127.0.0.1:5432 0.0.0.0:* users:(("postgres",pid=123,fd=7))`,
		);

		expect(ports).toContainEqual({
			protocol: "tcp",
			localAddress: "127.0.0.1",
			localPort: "5432",
			pid: "123",
			command: "postgres",
			user: "-",
		});
	});

	test("parses Windows listening ports", () => {
		expect(
			parseWindowsNetstatPorts(
				"TCP    0.0.0.0:3000        0.0.0.0:0        LISTENING     4684",
			),
		).toContainEqual({
			protocol: "tcp",
			localAddress: "0.0.0.0",
			localPort: "3000",
			pid: "4684",
			command: "pid:4684",
			user: "-",
		});
	});

	test("auto-detects parser and formats ports", () => {
		const ports =
			parseListeningPorts(`COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   21u  IPv6 0x123      0t0  TCP *:3000 (LISTEN)`);
		const output = formatPorts({
			command: "lsof",
			args: ["-nP"],
			rawOutput: "raw",
			ports,
		});

		expect(output).toContain("Listening Ports: 1");
		expect(output).toContain("*:3000");
	});
});
