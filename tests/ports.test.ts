import { describe, expect, test } from "bun:test";
import {
	buildPortsCommand,
	filterListeningPorts,
	formatPorts,
	nextPortSort,
	parseListeningPorts,
	parseLsofListeningPorts,
	parsePortSort,
	parseSsListeningPorts,
	parseWindowsNetstatPorts,
	sortListeningPorts,
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

	test("formats filtered and sorted port results", () => {
		const output = formatPorts(
			{
				command: "lsof",
				args: ["-nP"],
				rawOutput: "raw",
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
			},
			{
				filter: 3000,
				sort: { key: "process", direction: "asc" },
			},
		);

		expect(output).toContain("Listening Ports: 1 / 2");
		expect(output).toContain("Filter: 3000");
		expect(output).toContain("Sort: process asc");
		expect(output).toContain("*:3000");
		expect(output).not.toContain("127.0.0.1:5432");
	});

	test("filters and sorts listening ports for endpoint scanning", () => {
		const ports = [
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
		];

		expect(filterListeningPorts(ports, "node")).toEqual([ports[0]]);
		expect(filterListeningPorts(ports, 3000)).toEqual([ports[0]]);
		expect(
			sortListeningPorts(ports, { key: "port", direction: "asc" }).map(
				(port) => port.localPort,
			),
		).toEqual(["3000", "5432"]);
		expect(
			sortListeningPorts(
				[
					...ports,
					{
						protocol: "tcp",
						localAddress: "*",
						localPort: "*",
						pid: "-",
						command: "unknown",
						user: "-",
					},
				],
				{ key: "port", direction: "asc" },
			).map((port) => port.localPort),
		).toEqual(["*", "3000", "5432"]);
	});

	test("parses port sort options", () => {
		expect(parsePortSort("process")).toEqual({
			direction: "asc",
			key: "process",
		});
		expect(parsePortSort("-port")).toEqual({
			direction: "desc",
			key: "port",
		});
		expect(() => parsePortSort("unsafe")).toThrow("Invalid port sort");
	});

	test("cycles port sort state for keyboard use", () => {
		expect(nextPortSort({ key: "port", direction: "asc" })).toEqual({
			direction: "asc",
			key: "process",
		});
		expect(nextPortSort({ key: "pid", direction: "asc" })).toEqual({
			direction: "desc",
			key: "pid",
		});
		expect(nextPortSort({ key: "pid", direction: "desc" })).toEqual({
			direction: "asc",
			key: "port",
		});
	});
});
