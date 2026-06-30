import { describe, expect, test } from "bun:test";
import {
	buildRoutePathCommand,
	buildRouteTableCommand,
	diagnoseRoutes,
	formatRouteTable,
	nextRouteSort,
	parseLinuxIpRoutes,
	parseLinuxRoutePath,
	parseMacosNetstatRoutes,
	parseMacosRoutePath,
	parseRouteSort,
	parseWindowsRoutePrint,
	sortRouteEntries,
} from "../src/core/routes";

describe("lazyifconfig-style route inspector", () => {
	test("builds platform route table commands", () => {
		expect(buildRouteTableCommand("linux")).toEqual({
			command: "ip",
			args: ["route", "show", "table", "all"],
		});
		expect(buildRouteTableCommand("darwin")).toEqual({
			command: "netstat",
			args: ["-rn"],
		});
		expect(buildRouteTableCommand("win32")).toEqual({
			command: "route",
			args: ["PRINT"],
		});
	});

	test("builds route path commands", () => {
		expect(buildRoutePathCommand("8.8.8.8", "linux")).toEqual({
			command: "ip",
			args: ["route", "get", "8.8.8.8"],
		});
		expect(buildRoutePathCommand("8.8.8.8", "darwin")).toEqual({
			command: "route",
			args: ["-n", "get", "8.8.8.8"],
		});
	});

	test("parses linux ip route output", () => {
		expect(
			parseLinuxIpRoutes(
				"default via 192.168.0.1 dev eth0 proto dhcp metric 100",
			),
		).toContainEqual({
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "eth0",
			family: "ipv4",
			metric: 100,
			protocol: "dhcp",
		});
	});

	test("parses macOS netstat route output", () => {
		expect(
			parseMacosNetstatRoutes(
				"Internet:\nDestination Gateway Flags Netif\n default 192.168.0.1 UGSc en0",
			)[0],
		).toMatchObject({
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "en0",
			family: "ipv4",
		});
		expect(
			parseMacosNetstatRoutes(
				"Internet:\nDestination Gateway Flags Netif Expire\n192.168.0.1 3c:64:cf:7c:c6:78 UHLWIir en0 1179",
			)[0],
		).toMatchObject({
			destination: "192.168.0.1",
			interfaceName: "en0",
		});
	});

	test("parses windows route print output", () => {
		expect(
			parseWindowsRoutePrint(
				"IPv4 Route Table\nActive Routes:\nNetwork Destination Netmask Gateway Interface Metric\n0.0.0.0 0.0.0.0 192.168.0.1 192.168.0.20 25",
			),
		).toContainEqual({
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "192.168.0.20",
			family: "ipv4",
			metric: 25,
		});
	});

	test("diagnoses default route state", () => {
		expect(diagnoseRoutes([])).toContainEqual({
			status: "warn",
			label: "Default route missing",
		});
		expect(
			diagnoseRoutes([
				{
					destination: "default",
					gateway: "192.168.0.1",
					interfaceName: "en0",
					family: "ipv4",
				},
			]),
		).toContainEqual(
			expect.objectContaining({
				status: "pass",
				label: "Default route present",
			}),
		);
	});

	test("parses route path output", () => {
		expect(
			parseLinuxRoutePath(
				"8.8.8.8",
				"8.8.8.8 via 192.168.0.1 dev eth0 src 192.168.0.20 uid 501",
			),
		).toMatchObject({
			destination: "8.8.8.8",
			gateway: "192.168.0.1",
			interfaceName: "eth0",
			sourceIp: "192.168.0.20",
		});
		expect(
			parseMacosRoutePath(
				"8.8.8.8",
				"route to: 8.8.8.8\ngateway: 192.168.0.1\ninterface: en0",
			),
		).toMatchObject({
			destination: "8.8.8.8",
			gateway: "192.168.0.1",
			interfaceName: "en0",
		});
	});

	test("sorts route rows by default priority and selected fields", () => {
		const routes = [
			{
				destination: "10.8.0.0/24",
				gateway: "link",
				interfaceName: "utun0",
				family: "ipv4" as const,
				metric: 30,
			},
			{
				destination: "default",
				gateway: "192.168.0.1",
				interfaceName: "en0",
				family: "ipv4" as const,
				metric: 100,
			},
			{
				destination: "172.16.0.0/16",
				gateway: "link",
				interfaceName: "bridge0",
				family: "ipv4" as const,
				metric: 20,
			},
		];

		expect(sortRouteEntries(routes).map((route) => route.destination)).toEqual([
			"default",
			"10.8.0.0/24",
			"172.16.0.0/16",
		]);
		expect(
			sortRouteEntries(routes, { key: "interface", direction: "asc" }).map(
				(route) => route.interfaceName,
			),
		).toEqual(["bridge0", "en0", "utun0"]);
		expect(
			sortRouteEntries(routes, { key: "metric", direction: "asc" }).map(
				(route) => route.metric,
			),
		).toEqual([20, 30, 100]);
	});

	test("parses route sort options", () => {
		expect(parseRouteSort("interface")).toEqual({
			direction: "asc",
			key: "interface",
		});
		expect(parseRouteSort("-metric")).toEqual({
			direction: "desc",
			key: "metric",
		});
		expect(() => parseRouteSort("unsafe")).toThrow("Invalid route sort");
	});

	test("cycles route sort state for keyboard use", () => {
		expect(nextRouteSort({ key: "default", direction: "asc" })).toEqual({
			direction: "asc",
			key: "destination",
		});
		expect(nextRouteSort({ key: "metric", direction: "asc" })).toEqual({
			direction: "desc",
			key: "metric",
		});
		expect(nextRouteSort({ key: "metric", direction: "desc" })).toEqual({
			direction: "asc",
			key: "default",
		});
	});

	test("formats route tables with selected sort order", () => {
		expect(
			formatRouteTable(
				{
					command: "netstat",
					args: ["-rn"],
					diagnostics: [],
					rawOutput: "",
					routes: [
						{
							destination: "10.8.0.0/24",
							gateway: "link",
							interfaceName: "utun0",
							family: "ipv4",
						},
						{
							destination: "default",
							gateway: "192.168.0.1",
							interfaceName: "en0",
							family: "ipv4",
						},
					],
				},
				{ sort: { key: "interface", direction: "asc" } },
			),
		).toContain(
			"Sort: interface asc\n\n[Routes]\ndefault            192.168.0.1        en0        ipv4\n10.8.0.0/24        link               utun0      ipv4",
		);
	});
});
