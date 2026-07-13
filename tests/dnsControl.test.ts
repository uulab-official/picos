import { describe, expect, test } from "bun:test";
import {
	createDnsServerProposal,
	createDnsServerProposalTarget,
	formatDnsServerProposalRows,
	formatDnsServerProposalTargetRows,
} from "../src/core/dnsControl";

describe("DNS control proposal preflight", () => {
	test("creates locked DNS server proposals from typed resolver lists", () => {
		const target = createDnsServerProposalTarget(
			{
				name: "en0",
				status: "connected",
				kind: "wifiOrEthernet",
				ipv4: "192.168.0.20",
				ipv4Cidr: "192.168.0.20/24",
			},
			{ platform: "darwin", primaryInterfaceName: "en0" },
		);
		const proposal = createDnsServerProposal(
			"1.1.1.1, 8.8.8.8 1.1.1.1",
			["9.9.9.9", "8.8.8.8"],
			target,
		);

		expect(proposal).toEqual({
			actionId: "dns.servers.set",
			status: "ready",
			risk: "write",
			privilege: "admin",
			enabled: false,
			confirmationPhrase: "set dns servers",
			currentServers: ["9.9.9.9", "8.8.8.8"],
			proposedServers: ["1.1.1.1", "8.8.8.8"],
			invalidServers: [],
			addedServers: ["1.1.1.1"],
			removedServers: ["9.9.9.9"],
			rawInput: "1.1.1.1, 8.8.8.8 1.1.1.1",
			target: {
				scope: "interface",
				name: "en0",
				label: "en0 wifiOrEthernet",
				platform: "darwin",
				status: "connected",
				kind: "wifiOrEthernet",
				ipv4: "192.168.0.20/24",
				ipv6: undefined,
				primary: true,
			},
			preflight: [
				"scope=interface target=en0",
				"targetStatus=connected kind=wifiOrEthernet primary=yes platform=darwin",
				"willModify=dns-server-list persistentConfig=platform-dependent",
				"requires=interface-or-service admin confirmation dry-run-policy",
				"adapterDryRun=proposal-only",
				"rollback=restore previous DNS server list from current snapshot",
			],
		});
		expect(formatDnsServerProposalRows(proposal)).toEqual([
			"DNS SERVER PROPOSAL",
			"status=ready action=dns.servers.set locked enabled=false",
			"proposalTarget=en0 wifiOrEthernet scope=interface",
			"risk=write privilege=admin confirm=set dns servers",
			"current=9.9.9.9,8.8.8.8",
			"proposed=1.1.1.1,8.8.8.8",
			"added=1.1.1.1 removed=9.9.9.9",
			"PREFLIGHT",
			"scope=interface target=en0",
			"targetStatus=connected kind=wifiOrEthernet primary=yes platform=darwin",
			"willModify=dns-server-list persistentConfig=platform-dependent",
			"requires=interface-or-service admin confirmation dry-run-policy",
			"adapterDryRun=proposal-only",
			"rollback=restore previous DNS server list from current snapshot",
			"execution=disabled no DNS settings will be changed",
		]);
	});

	test("marks empty or invalid DNS proposals as invalid without enabling execution", () => {
		expect(createDnsServerProposal("", ["1.1.1.1"]).status).toBe("invalid");
		const proposal = createDnsServerProposal("1.1.1.1 resolver.local", [
			"1.1.1.1",
		]);

		expect(proposal.status).toBe("invalid");
		expect(proposal.enabled).toBeFalse();
		expect(proposal.invalidServers).toEqual(["resolver.local"]);
		expect(formatDnsServerProposalRows(proposal)).toContain(
			"invalid=resolver.local",
		);
		expect(formatDnsServerProposalRows(undefined)).toEqual([
			"DNS SERVER PROPOSAL",
			"status=empty action=dns.servers.set locked",
			"controls=S propose servers · example: 1.1.1.1 8.8.8.8",
		]);
	});

	test("formats selectable DNS proposal targets without enabling mutation", () => {
		const systemTarget = createDnsServerProposalTarget(undefined, {
			platform: "linux",
		});
		expect(formatDnsServerProposalTargetRows(systemTarget)).toEqual([
			"DNS TARGET",
			"target=system resolver scope=system selected=-",
			"status=- kind=- primary=no platform=linux",
			"address ipv4=- ipv6=-",
			"controls=T target S proposal C clear",
		]);

		const interfaceTarget = createDnsServerProposalTarget(
			{
				name: "utun4",
				status: "connected",
				kind: "vpn",
				ipv6: "fe80::2",
				ipv6Cidr: "fe80::2/64",
			},
			{ platform: "darwin", primaryInterfaceName: "en0" },
		);

		expect(
			formatDnsServerProposalTargetRows(interfaceTarget, {
				selectedIndex: 1,
				totalTargets: 3,
			}),
		).toEqual([
			"DNS TARGET",
			"target=utun4 vpn scope=interface selected=2/3",
			"status=connected kind=vpn primary=no platform=darwin",
			"address ipv4=- ipv6=fe80::2/64",
			"controls=T target S proposal C clear",
		]);
	});
});
