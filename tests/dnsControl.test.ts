import { describe, expect, test } from "bun:test";
import {
	createDnsServerProposal,
	formatDnsServerProposalRows,
} from "../src/core/dnsControl";

describe("DNS control proposal preflight", () => {
	test("creates locked DNS server proposals from typed resolver lists", () => {
		const proposal = createDnsServerProposal("1.1.1.1, 8.8.8.8 1.1.1.1", [
			"9.9.9.9",
			"8.8.8.8",
		]);

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
			preflight: [
				"scope=selected resolver configuration",
				"willModify=dns-server-list persistentConfig=platform-dependent",
				"requires=interface-or-service admin confirmation dry-run-policy",
				"adapterDryRun=proposal-only",
				"rollback=restore previous DNS server list from current snapshot",
			],
		});
		expect(formatDnsServerProposalRows(proposal)).toEqual([
			"DNS SERVER PROPOSAL",
			"status=ready action=dns.servers.set locked enabled=false",
			"risk=write privilege=admin confirm=set dns servers",
			"current=9.9.9.9,8.8.8.8",
			"proposed=1.1.1.1,8.8.8.8",
			"added=1.1.1.1 removed=9.9.9.9",
			"PREFLIGHT",
			"scope=selected resolver configuration",
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
});
