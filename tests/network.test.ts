import { describe, expect, test } from "bun:test";
import { summarizeNetworkInterfaces } from "../src/core/network";

describe("network summary", () => {
	test("extracts active IPv4 and IPv6 interface details", () => {
		const summary = summarizeNetworkInterfaces(
			{
				lo0: [
					{
						address: "127.0.0.1",
						family: "IPv4",
						internal: true,
						mac: "00:00:00:00:00:00",
						netmask: "255.0.0.0",
						cidr: "127.0.0.1/8",
					},
				],
				en0: [
					{
						address: "192.168.0.12",
						family: "IPv4",
						internal: false,
						mac: "aa:bb:cc:dd:ee:ff",
						netmask: "255.255.255.0",
						cidr: "192.168.0.12/24",
					},
					{
						address: "fe80::1",
						family: "IPv6",
						internal: false,
						mac: "aa:bb:cc:dd:ee:ff",
						netmask: "ffff:ffff:ffff:ffff::",
						cidr: "fe80::1/64",
						scopeid: 1,
					},
				],
			},
			["1.1.1.1", "8.8.8.8"],
		);

		expect(summary.status).toBe("online");
		expect(summary.primaryInterface?.name).toBe("en0");
		expect(summary.primaryInterface?.ipv4).toBe("192.168.0.12");
		expect(summary.primaryInterface?.ipv6).toBe("fe80::1");
		expect(summary.dnsServers).toEqual(["1.1.1.1", "8.8.8.8"]);
	});

	test("reports offline when no external address exists", () => {
		const summary = summarizeNetworkInterfaces(
			{
				lo0: [
					{
						address: "127.0.0.1",
						family: "IPv4",
						internal: true,
						mac: "00:00:00:00:00:00",
						netmask: "255.0.0.0",
						cidr: "127.0.0.1/8",
					},
				],
			},
			[],
		);

		expect(summary.status).toBe("offline");
		expect(summary.primaryInterface).toBeUndefined();
		expect(summary.interfaces).toEqual([]);
	});
});
