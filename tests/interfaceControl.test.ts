import { describe, expect, test } from "bun:test";
import {
	createInterfaceStateProposal,
	formatInterfaceStateProposalRows,
} from "../src/core/interfaceControl";
import type { NetworkInterfaceSummary } from "../src/core/types";

const selected: NetworkInterfaceSummary = {
	name: "en0",
	status: "connected",
	kind: "wifiOrEthernet",
	ipv4: "192.168.0.20",
	ipv4Cidr: "192.168.0.20/24",
	ipv6: "fe80::1",
	mac: "aa:bb:cc:dd:ee:ff",
	mtu: 1500,
};

describe("interface state proposal preflight", () => {
	test("creates locked disable proposals for selected interfaces", () => {
		const proposal = createInterfaceStateProposal(selected, "disable", {
			platform: "darwin",
			primaryInterfaceName: "en0",
		});

		expect(proposal).toEqual({
			actionId: "interface.disable",
			action: "disable",
			status: "ready",
			risk: "write",
			privilege: "admin",
			enabled: false,
			confirmationPhrase: "disable interface",
			target: {
				name: "en0",
				status: "connected",
				kind: "wifiOrEthernet",
				ipv4: "192.168.0.20/24",
				ipv6: "fe80::1",
				mac: "aa:bb:cc:dd:ee:ff",
				mtu: 1500,
				primary: true,
				platform: "darwin",
			},
			currentStatus: "connected",
			desiredStatus: "disconnected",
			preflight: [
				"scope=interface target=en0",
				"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
				"willModify=interface-link-state serviceOrAdapter=platform-dependent",
				"requires=selected-interface admin confirmation dry-run-policy",
				"adapterDryRun=proposal-only",
				"rollback=restore previous interface state from current snapshot",
			],
		});
		expect(formatInterfaceStateProposalRows(proposal)).toEqual([
			"INTERFACE STATE PROPOSAL",
			"status=ready action=interface.disable locked enabled=false",
			"target=en0 kind=wifiOrEthernet primary=yes platform=darwin",
			"address ipv4=192.168.0.20/24 ipv6=fe80::1 mac=aa:bb:cc:dd:ee:ff mtu=1500",
			"transition current=connected desired=disconnected",
			"risk=write privilege=admin confirm=disable interface",
			"PREFLIGHT",
			"scope=interface target=en0",
			"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
			"willModify=interface-link-state serviceOrAdapter=platform-dependent",
			"requires=selected-interface admin confirmation dry-run-policy",
			"adapterDryRun=proposal-only",
			"rollback=restore previous interface state from current snapshot",
			"execution=disabled no interface state will be changed",
		]);
	});

	test("marks noop and invalid proposals without enabling execution", () => {
		const enableProposal = createInterfaceStateProposal(selected, "enable", {
			platform: "linux",
		});
		expect(enableProposal.status).toBe("noop");
		expect(enableProposal.enabled).toBeFalse();
		expect(enableProposal.desiredStatus).toBe("connected");

		const invalid = createInterfaceStateProposal(undefined, "disable", {
			platform: "win32",
		});
		expect(invalid.status).toBe("invalid");
		expect(invalid.target).toBeUndefined();
		expect(formatInterfaceStateProposalRows(undefined)).toEqual([
			"INTERFACE STATE PROPOSAL",
			"status=empty action=interface.enable|interface.disable locked",
			"controls=D disable proposal U enable proposal C clear",
		]);
	});
});
