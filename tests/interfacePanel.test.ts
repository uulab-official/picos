import { describe, expect, test } from "bun:test";
import type { NetworkSummary } from "../src/core/types";
import {
	formatInterfaceWorkspaceRows,
	getNextInterfaceIndex,
	nextInterfaceDetailView,
} from "../src/tui/interfacePanel";

const fixture: NetworkSummary = {
	status: "online",
	host: "local",
	platform: "darwin",
	gateway: "192.168.0.1",
	dnsServers: ["1.1.1.1", "8.8.8.8"],
	publicIp: "203.0.113.10",
	primaryInterface: {
		name: "en0",
		status: "connected",
		kind: "wifiOrEthernet",
		ipv4: "192.168.0.20",
		ipv6: "fe80::1",
		ipv4Cidr: "192.168.0.20/24",
		ipv6Cidr: "fe80::1/64",
		netmask: "255.255.255.0",
		mac: "aa:bb:cc:dd:ee:ff",
		mtu: 1500,
		rxBytes: 125000000,
		txBytes: 42000000,
		rxPackets: 9000,
		txPackets: 7100,
	},
	interfaces: [
		{
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.0.20",
			ipv6: "fe80::1",
			ipv4Cidr: "192.168.0.20/24",
			ipv6Cidr: "fe80::1/64",
			netmask: "255.255.255.0",
			mac: "aa:bb:cc:dd:ee:ff",
			mtu: 1500,
			rxBytes: 125000000,
			txBytes: 42000000,
			rxPackets: 9000,
			txPackets: 7100,
		},
		{
			name: "utun4",
			status: "connected",
			kind: "vpn",
			ipv6: "fe80::2",
			ipv6Cidr: "fe80::2/64",
			mac: "00:00:00:00:00:00",
			mtu: 1380,
			rxBytes: 2048,
			txBytes: 4096,
			rxPackets: 20,
			txPackets: 30,
		},
	],
	networkGroups: [
		{
			kind: "lan",
			label: "LAN",
			interfaces: ["en0"],
			addresses: ["192.168.0.20"],
		},
		{
			kind: "vpn",
			label: "VPN",
			interfaces: ["utun4"],
			addresses: ["fe80::2"],
		},
	],
};

describe("interface TUI panel formatting", () => {
	test("cycles interface detail tabs and selection indexes", () => {
		expect(nextInterfaceDetailView("list")).toBe("detail");
		expect(nextInterfaceDetailView("detail")).toBe("stats");
		expect(nextInterfaceDetailView("stats")).toBe("platform");
		expect(nextInterfaceDetailView("platform")).toBe("list");
		expect(getNextInterfaceIndex(0, 2, "down")).toBe(1);
		expect(getNextInterfaceIndex(1, 2, "down")).toBe(0);
		expect(getNextInterfaceIndex(0, 2, "up")).toBe(1);
		expect(getNextInterfaceIndex(3, 0, "down")).toBe(0);
	});

	test("formats list detail stats and platform views for selected interface", () => {
		expect(
			formatInterfaceWorkspaceRows(fixture, 6, {
				selectedIndex: 1,
				view: "list",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=utun4 view=list",
			"  en0      wifiOrEthernet up   192.168.0.20/24      mtu=1500",
			"> utun4    vpn            up   fe80::2/64           mtu=1380",
			"GROUPS LAN:en0 | VPN:utun4",
			"gateway=192.168.0.1 dns=1.1.1.1, 8.8.8.8 public=203.0.113.10",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 7, {
				selectedIndex: 0,
				view: "detail",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=detail",
			"DETAIL en0 status=connected kind=wifiOrEthernet",
			"IPv4 192.168.0.20/24 netmask=255.255.255.0",
			"IPv6 fe80::1/64",
			"MAC aa:bb:cc:dd:ee:ff MTU 1500",
			"Gateway 192.168.0.1",
			"DNS 1.1.1.1, 8.8.8.8",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 6, {
				selectedIndex: 0,
				view: "stats",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=stats",
			"STATS en0",
			"rxBytes=125.0MB txBytes=42.0MB",
			"rxPackets=9000 txPackets=7100",
			"mtu=1500 status=connected",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 6, {
				selectedIndex: 0,
				view: "platform",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=platform",
			"PLATFORM darwin",
			"SOURCES node:os.networkInterfaces, netstat -ib, route/get gateway, dns.getServers",
			"PRIMARY en0",
			"GROUP LAN interfaces=en0 addresses=192.168.0.20",
			"GROUP VPN interfaces=utun4 addresses=fe80::2",
		]);
	});
});
