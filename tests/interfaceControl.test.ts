import { describe, expect, test } from "bun:test";
import {
	createInterfaceControlTarget,
	createInterfaceDryRunPreview,
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
			controlTarget: {
				kind: "network-service",
				label: "<service-for-en0>",
				confidence: "missing",
				source: "networksetup-hardware-port-map",
				commandPreview:
					'sudo networksetup -setnetworkserviceenabled "<service-for-en0>" off',
				resolution:
					"requires networksetup hardware-port lookup for BSD device en0",
			},
			dryRunPreview: {
				status: "blocked",
				policy: "proposal-only",
				adapterDryRun: "unavailable",
				willExecute: false,
				commandPreview:
					'sudo networksetup -setnetworkserviceenabled "<service-for-en0>" off',
				reason: "interface-execution-disabled",
				blockers: [
					"interface-execution-disabled",
					"mutation-controls-disabled",
					"adapter-dry-run-unavailable",
				],
			},
			currentStatus: "connected",
			desiredStatus: "disconnected",
			preflight: [
				"scope=interface target=en0",
				"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
				"willModify=interface-link-state serviceOrAdapter=network-service controlTarget=<service-for-en0>",
				"targetResolution=requires networksetup hardware-port lookup for BSD device en0",
				"requires=selected-interface admin confirmation dry-run-policy",
				"adapterDryRun=unavailable policy=proposal-only willExecute=false",
				"dryRunBlockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
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
			"controlTarget kind=network-service label=<service-for-en0> confidence=missing source=networksetup-hardware-port-map",
			'controlCommand=sudo networksetup -setnetworkserviceenabled "<service-for-en0>" off',
			"dryRun status=blocked policy=proposal-only adapterDryRun=unavailable willExecute=false",
			'dryRunCommand=sudo networksetup -setnetworkserviceenabled "<service-for-en0>" off',
			"dryRunReason=interface-execution-disabled blockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
			"PREFLIGHT",
			"scope=interface target=en0",
			"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
			"willModify=interface-link-state serviceOrAdapter=network-service controlTarget=<service-for-en0>",
			"targetResolution=requires networksetup hardware-port lookup for BSD device en0",
			"requires=selected-interface admin confirmation dry-run-policy",
			"adapterDryRun=unavailable policy=proposal-only willExecute=false",
			"dryRunBlockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
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
		expect(enableProposal.dryRunPreview).toMatchObject({
			adapterDryRun: "unavailable",
			willExecute: false,
		});

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

	test("resolves platform control targets without enabling execution", () => {
		const target = createInterfaceStateProposalTargetFixture();

		expect(
			createInterfaceControlTarget(target, "disable", { platform: "linux" }),
		).toEqual({
			kind: "interface",
			label: "en0",
			confidence: "exact",
			source: "ip-link-name",
			commandPreview: "sudo ip link set en0 down",
			resolution: "selected interface name is the ip-link target",
		});
		expect(
			createInterfaceControlTarget(target, "enable", { platform: "win32" }),
		).toEqual({
			kind: "adapter",
			label: "en0",
			confidence: "exact",
			source: "Get-NetAdapter.Name",
			commandPreview:
				"powershell -NoProfile -Command \"Enable-NetAdapter -Name 'en0' -Confirm:$false -WhatIf\"",
			resolution: "selected adapter name is the NetAdapter target",
		});
		expect(
			createInterfaceControlTarget(target, "enable", {
				platform: "darwin",
				macosServiceNamesByDevice: { en0: "Wi-Fi" },
			}),
		).toEqual({
			kind: "network-service",
			label: "Wi-Fi",
			confidence: "exact",
			source: "networksetup-hardware-port-map",
			commandPreview: "sudo networksetup -setnetworkserviceenabled Wi-Fi on",
			resolution: "mapped BSD device en0 to network service Wi-Fi",
		});
	});

	test("models dry-run policy previews without enabling execution", () => {
		const target = createInterfaceStateProposalTargetFixture();
		const windowsTarget = createInterfaceControlTarget(target, "disable", {
			platform: "win32",
		});
		const linuxTarget = createInterfaceControlTarget(target, "disable", {
			platform: "linux",
		});

		expect(createInterfaceDryRunPreview(windowsTarget)).toEqual({
			status: "blocked",
			policy: "proposal-only",
			adapterDryRun: "available",
			willExecute: false,
			commandPreview:
				"powershell -NoProfile -Command \"Disable-NetAdapter -Name 'en0' -Confirm:$false -WhatIf\"",
			reason: "interface-execution-disabled",
			blockers: ["interface-execution-disabled", "mutation-controls-disabled"],
		});
		expect(createInterfaceDryRunPreview(linuxTarget)).toEqual({
			status: "blocked",
			policy: "proposal-only",
			adapterDryRun: "unavailable",
			willExecute: false,
			commandPreview: "sudo ip link set en0 down",
			reason: "interface-execution-disabled",
			blockers: [
				"interface-execution-disabled",
				"mutation-controls-disabled",
				"adapter-dry-run-unavailable",
			],
		});
	});
});

function createInterfaceStateProposalTargetFixture() {
	const proposal = createInterfaceStateProposal(selected, "disable", {
		platform: "darwin",
		primaryInterfaceName: "en0",
	});
	if (!proposal.target) {
		throw new Error("expected selected interface target");
	}
	return proposal.target;
}
