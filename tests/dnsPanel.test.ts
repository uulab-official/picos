import { describe, expect, test } from "bun:test";
import type { NetworkSummary } from "../src/core/types";
import {
	prepareDnsPanelInput,
	prepareDnsServerProposalTransition,
	resolveDnsTarget,
} from "../src/tui/dnsPanel";

const fixture: NetworkSummary = {
	status: "online",
	host: "local",
	platform: "linux",
	interfaces: [
		{
			name: "en0",
			status: "connected",
			kind: "wifiOrEthernet",
			ipv4: "192.168.0.20",
			ipv4Cidr: "192.168.0.20/24",
		},
		{
			name: "tun0",
			status: "connected",
			kind: "vpn",
			ipv4: "10.0.0.2",
		},
	],
	networkGroups: [],
	dnsServers: ["9.9.9.9"],
};

describe("DNS panel transitions", () => {
	test("clamps DNS targets and treats empty inventories as unavailable", () => {
		expect(
			resolveDnsTarget({ selectedIndex: -3, summary: fixture }),
		).toMatchObject({
			kind: "target",
			selectedIndex: 0,
			target: { name: "en0", scope: "interface" },
		});
		expect(
			resolveDnsTarget({ selectedIndex: 42, summary: fixture }),
		).toMatchObject({
			kind: "target",
			selectedIndex: 1,
			target: { name: "tun0", scope: "interface" },
		});
		expect(
			resolveDnsTarget({
				selectedIndex: 0,
				summary: { ...fixture, interfaces: [] },
			}),
		).toEqual({ kind: "unavailable", selectedIndex: 0 });
	});

	test("creates locked DNS previews for supported targets", () => {
		expect(
			prepareDnsServerProposalTransition({
				input: "1.1.1.1 8.8.8.8",
				selectedIndex: 99,
				summary: fixture,
			}),
		).toMatchObject({
			kind: "proposal",
			selectedIndex: 1,
			proposal: {
				status: "ready",
				enabled: false,
				target: { name: "tun0", scope: "interface" },
			},
			confirmation: {
				eligible: true,
				phrase: "set dns servers",
				willExecute: false,
				reason: "dns-execution-disabled",
			},
			notice: {
				level: "warn",
				message:
					"dns server proposal ready target=tun0 proposed=1.1.1.1,8.8.8.8",
			},
		});
	});

	test("returns explicit no-ops without mutation keys when DNS targets are unavailable", () => {
		const empty = { ...fixture, interfaces: [] };
		expect(
			prepareDnsPanelInput({ input: "S", selectedIndex: 0, summary: empty }),
		).toEqual({
			kind: "no-op",
			notice: {
				level: "warn",
				message: "no DNS interface target available for server proposal",
			},
		});
		expect(
			prepareDnsPanelInput({ input: "T", selectedIndex: 0, summary: empty }),
		).toEqual({ kind: "no-op" });
		expect(
			prepareDnsServerProposalTransition({
				input: "1.1.1.1",
				selectedIndex: 0,
				summary: empty,
			}),
		).toEqual({
			kind: "no-op",
			notice: {
				level: "warn",
				message: "no DNS interface target available for server proposal",
			},
		});
	});
});
