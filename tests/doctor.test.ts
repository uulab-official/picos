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
						ipv4: "192.168.0.12",
						ipv6: undefined,
						mac: "aa:bb:cc:dd:ee:ff",
					},
				],
				primaryInterface: {
					name: "en0",
					status: "connected",
					ipv4: "192.168.0.12",
					ipv6: undefined,
					mac: "aa:bb:cc:dd:ee:ff",
				},
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
	});
});
