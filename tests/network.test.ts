import { describe, expect, test } from "bun:test";
import {
	classifyNetworkAddress,
	inferInterfaceKind,
	summarizeNetworkInterfaces,
} from "../src/core/network";

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
		expect(summary.primaryInterface?.kind).toBe("wifiOrEthernet");
		expect(summary.primaryInterface?.ipv4Cidr).toBe("192.168.0.12/24");
		expect(summary.primaryInterface?.ipv6Cidr).toBe("fe80::1/64");
		expect(summary.networkGroups).toEqual([
			{
				kind: "lan",
				label: "LAN",
				interfaces: ["en0"],
				addresses: ["192.168.0.12"],
			},
			{
				kind: "linkLocal",
				label: "Link-local",
				interfaces: ["en0"],
				addresses: ["fe80::1"],
			},
		]);
		expect(summary.dnsServers).toEqual(["1.1.1.1", "8.8.8.8"]);
	});

	test("merges interface MTU and traffic counters into summaries", () => {
		const summary = summarizeNetworkInterfaces(
			{
				en0: [
					{
						address: "192.168.0.12",
						family: "IPv4",
						internal: false,
						mac: "aa:bb:cc:dd:ee:ff",
						netmask: "255.255.255.0",
						cidr: "192.168.0.12/24",
					},
				],
			},
			["1.1.1.1"],
			{
				interfaceStats: {
					en0: {
						mtu: 1500,
						rxBytes: 123456,
						rxPackets: 100,
						txBytes: 654321,
						txPackets: 200,
					},
				},
			},
		);

		expect(summary.primaryInterface).toMatchObject({
			name: "en0",
			mtu: 1500,
			rxBytes: 123456,
			rxPackets: 100,
			txBytes: 654321,
			txPackets: 200,
		});
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

	test("classifies lazyifconfig-style interface kinds and network groups", () => {
		expect(inferInterfaceKind("lo0", true)).toBe("loopback");
		expect(inferInterfaceKind("utun4", false)).toBe("vpn");
		expect(inferInterfaceKind("docker0", false)).toBe("container");
		expect(inferInterfaceKind("bridge0", false)).toBe("bridge");
		expect(inferInterfaceKind("en0", false)).toBe("wifiOrEthernet");

		expect(classifyNetworkAddress("127.0.0.1", "loopback")).toBe("loopback");
		expect(classifyNetworkAddress("10.10.0.5", "wifiOrEthernet")).toBe("lan");
		expect(classifyNetworkAddress("172.20.0.5", "wifiOrEthernet")).toBe("lan");
		expect(classifyNetworkAddress("192.168.0.12", "wifiOrEthernet")).toBe(
			"lan",
		);
		expect(classifyNetworkAddress("169.254.1.10", "wifiOrEthernet")).toBe(
			"linkLocal",
		);
		expect(classifyNetworkAddress("8.8.8.8", "wifiOrEthernet")).toBe("public");
		expect(classifyNetworkAddress("100.64.0.10", "vpn")).toBe("vpn");
		expect(classifyNetworkAddress("172.17.0.2", "container")).toBe("container");
	});
});
