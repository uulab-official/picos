import { describe, expect, test } from "bun:test";
import { runDoctorChecks } from "../src/core/doctor";

describe("doctor checks", () => {
	test("aggregates network diagnostics with warning for optional public IP", async () => {
		const checks = await runDoctorChecks({
			getNetworkSummary: async () => ({
				status: "online",
				host: "local",
				platform: "darwin",
				interfaces: [
					{
						name: "en0",
						status: "connected",
						kind: "wifiOrEthernet",
						ipv4: "192.168.0.12",
						ipv6: undefined,
						mac: "aa:bb:cc:dd:ee:ff",
					},
				],
				primaryInterface: {
					name: "en0",
					status: "connected",
					kind: "wifiOrEthernet",
					ipv4: "192.168.0.12",
					ipv6: undefined,
					mac: "aa:bb:cc:dd:ee:ff",
				},
				networkGroups: [],
				gateway: "192.168.0.1",
				dnsServers: ["1.1.1.1"],
			}),
			canReachGateway: async () => true,
			canResolveDns: async () => true,
			canReachInternet: async () => true,
			canPingDefaultHost: async () => true,
			lookupPublicIp: async () => undefined,
		});

		expect(checks.map((check) => [check.label, check.status])).toEqual([
			["Interface detected", "pass"],
			["IPv4 assigned", "pass"],
			["Gateway reachable", "pass"],
			["DNS configured", "pass"],
			["DNS resolve ok", "pass"],
			["Internet reachable", "pass"],
			["Default ping host reachable", "pass"],
			["Public IP lookup", "warn"],
		]);
		expect(checks.map((check) => check.id)).toEqual([
			"interface",
			"ipv4",
			"gateway",
			"dns-config",
			"dns-resolve",
			"internet",
			"default-ping",
			"public-ip",
		]);
	});

	test("contains individual probe failures instead of aborting the report", async () => {
		const checks = await runDoctorChecks({
			getNetworkSummary: async () => ({
				status: "online",
				host: "local",
				platform: "linux",
				interfaces: [],
				networkGroups: [],
				gateway: "192.168.0.1",
				dnsServers: [],
			}),
			canReachGateway: async () => {
				throw new Error("ping unavailable");
			},
			canResolveDns: async () => {
				throw new Error("resolver failed");
			},
			canReachInternet: async () => false,
			canPingDefaultHost: async () => false,
			lookupPublicIp: async () => {
				throw new Error("lookup timed out");
			},
		});

		expect(checks).toHaveLength(8);
		expect(checks.find((check) => check.id === "gateway")).toMatchObject({
			status: "fail",
			detail: "ping unavailable",
		});
		expect(checks.find((check) => check.id === "dns-resolve")).toMatchObject({
			status: "fail",
			detail: "resolver failed",
		});
		expect(checks.find((check) => check.id === "public-ip")).toMatchObject({
			status: "warn",
			detail: "lookup timed out",
		});
	});
});
