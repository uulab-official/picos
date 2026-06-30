import { describe, expect, test } from "bun:test";
import type { NetworkSummary } from "../src/core/types";
import { createNetworkTimelineEvents } from "../src/tui/networkTimeline";

const baseSummary: NetworkSummary = {
	status: "online",
	host: "local",
	platform: "darwin",
	interfaces: [
		{
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.0.12",
			ipv6: "fe80::1",
		},
	],
	networkGroups: [],
	primaryInterface: {
		name: "en0",
		status: "connected",
		kind: "wifiOrEthernet",
		ipv4: "192.168.0.12",
		ipv6: "fe80::1",
	},
	gateway: "192.168.0.1",
	dnsServers: ["1.1.1.1"],
	publicIp: "203.0.113.10",
};

describe("network timeline events", () => {
	test("does not emit state-change events for the first observed summary", () => {
		expect(
			createNetworkTimelineEvents(undefined, baseSummary, "12:00:00"),
		).toEqual([]);
	});

	test("emits status, public IP, and primary address changes", () => {
		const next: NetworkSummary = {
			...baseSummary,
			status: "offline",
			publicIp: undefined,
			primaryInterface: undefined,
			interfaces: [],
		};

		expect(createNetworkTimelineEvents(baseSummary, next, "12:00:00")).toEqual([
			{
				id: "12:00:00-warn-network-status-online-offline",
				level: "warn",
				message: "network status online -> offline",
				time: "12:00:00",
			},
			{
				id: "12:00:00-info-network-primary-en0-192-168-0-12",
				level: "info",
				message: "network primary en0 192.168.0.12 -> -",
				time: "12:00:00",
			},
			{
				id: "12:00:00-info-network-public-ip-203-0-113-10",
				level: "info",
				message: "network public ip 203.0.113.10 -> -",
				time: "12:00:00",
			},
			{
				id: "12:00:00-warn-network-interface-en0-192-168-0-12-fe80-1-removed",
				level: "warn",
				message: "network interface en0 192.168.0.12,fe80::1 removed",
				time: "12:00:00",
			},
		]);
	});

	test("emits interface address changes in stable interface-name order", () => {
		const previous: NetworkSummary = {
			...baseSummary,
			interfaces: [
				{
					name: "utun0",
					status: "connected",
					kind: "vpn",
					ipv4: "10.8.0.2",
				},
				...baseSummary.interfaces,
			],
		};
		const next: NetworkSummary = {
			...previous,
			interfaces: [
				{
					name: "utun0",
					status: "connected",
					kind: "vpn",
					ipv4: "10.8.0.3",
				},
				{
					name: "en0",
					status: "connected",
					kind: "wifiOrEthernet",
					ipv4: "192.168.0.13",
					ipv6: "fe80::2",
				},
			],
		};

		expect(
			createNetworkTimelineEvents(previous, next, "12:00:05").map(
				(event) => event.message,
			),
		).toEqual([
			"network interface en0 192.168.0.12,fe80::1 -> 192.168.0.13,fe80::2",
			"network interface utun0 10.8.0.2 -> 10.8.0.3",
		]);
	});
});
