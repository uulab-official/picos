import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterfaceStateProposal } from "../src/core/interfaceControl";
import type { NetworkSummary } from "../src/core/types";
import {
	createInterfaceSourceHandoffPlan,
	formatInterfaceSourceRows,
	formatInterfaceWorkspaceRows,
	formatSelectedInterfaceSummaryRows,
	getInterfaceSourceClipboardPreview,
	getNextInterfaceIndex,
	nextInterfaceDetailView,
	writeInterfaceSourceHandoffPlan,
} from "../src/tui/interfacePanel";

const fixture: NetworkSummary = {
	status: "online",
	host: "local",
	platform: "darwin",
	gateway: "192.168.0.1",
	dnsServers: ["1.1.1.1", "8.8.8.8"],
	publicIp: "203.0.113.10",
	sourceOutputs: [
		{
			key: "interface-inventory",
			label: "Interface inventory",
			command: "node:os",
			args: ["networkInterfaces()"],
			output:
				"en0 IPv4 192.168.0.20/24 external mac=aa:bb:cc:dd:ee:ff\nutun4 IPv6 fe80::2/64 external mac=00:00:00:00:00:00",
			lineCount: 2,
			shownLines: 2,
			truncated: false,
			success: true,
			exitCode: 0,
		},
		{
			key: "interface-stats",
			label: "Interface stats",
			command: "netstat",
			args: ["-ibn"],
			output:
				"Name Mtu Network Address Ipkts Ierrs Ibytes Opkts\n en0 1500 <Link#4> aa:bb:cc:dd:ee:ff 9000 0 125000000 7100",
			lineCount: 3,
			shownLines: 2,
			truncated: true,
			success: true,
			exitCode: 0,
		},
		{
			key: "gateway",
			label: "Default gateway",
			command: "route",
			args: ["-n", "get", "default"],
			output: "gateway: 192.168.0.1\ninterface: en0",
			lineCount: 2,
			shownLines: 2,
			truncated: false,
			success: true,
			exitCode: 0,
		},
		{
			key: "hardware-ports",
			label: "macOS hardware ports",
			command: "networksetup",
			args: ["-listallhardwareports"],
			output:
				"Hardware Port: Wi-Fi\nDevice: en0\nEthernet Address: aa:bb:cc:dd:ee:ff",
			lineCount: 3,
			shownLines: 3,
			truncated: false,
			success: true,
			exitCode: 0,
		},
	],
	macosServiceNamesByDevice: {
		en0: "Wi-Fi",
	},
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
			scope: "private",
			hint: "RFC1918 private network for local devices",
			interfaces: ["en0"],
			addresses: ["192.168.0.20"],
		},
		{
			kind: "vpn",
			label: "VPN",
			scope: "tunnel",
			hint: "tunnel interface likely carries private or corporate routes",
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
		expect(nextInterfaceDetailView("platform")).toBe("source");
		expect(nextInterfaceDetailView("source")).toBe("list");
		expect(getNextInterfaceIndex(0, 2, "down")).toBe(1);
		expect(getNextInterfaceIndex(1, 2, "down")).toBe(0);
		expect(getNextInterfaceIndex(0, 2, "up")).toBe(1);
		expect(getNextInterfaceIndex(3, 0, "down")).toBe(0);
	});

	test("formats list detail stats and platform views for selected interface", () => {
		expect(
			formatSelectedInterfaceSummaryRows(fixture, fixture.interfaces[0]),
		).toEqual([
			"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
			"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
			"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
		]);
		expect(formatSelectedInterfaceSummaryRows(fixture, undefined)).toEqual([
			"SELECTED none",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 10, {
				selectedIndex: 1,
				view: "list",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=utun4 view=list",
			"SELECTED utun4 up vpn group=VPN primary=no",
			"ADDR ipv4=- ipv6=fe80::2/64 mac=00:00:00:00:00:00 netmask=-",
			"LINK mtu=1380 rx=2.0KB/20pk tx=4.1KB/30pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
			"  en0      wifiOrEthernet up   192.168.0.20/24      mtu=1500",
			"> utun4    vpn            up   fe80::2/64           mtu=1380",
			"GROUPS LAN:en0 | VPN:utun4",
			"gateway=192.168.0.1 dns=1.1.1.1, 8.8.8.8 public=203.0.113.10",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 12, {
				selectedIndex: 0,
				view: "detail",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=detail",
			"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
			"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
			"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
			"DETAIL en0 status=connected kind=wifiOrEthernet",
			"IPv4 192.168.0.20/24 netmask=255.255.255.0",
			"IPv6 fe80::1/64",
			"MAC aa:bb:cc:dd:ee:ff MTU 1500",
			"Gateway 192.168.0.1",
			"DNS 1.1.1.1, 8.8.8.8",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 10, {
				selectedIndex: 0,
				view: "stats",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=stats",
			"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
			"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
			"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
			"STATS en0",
			"rxBytes=125.0MB txBytes=42.0MB",
			"rxPackets=9000 txPackets=7100",
			"mtu=1500 status=connected",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 12, {
				selectedIndex: 0,
				view: "platform",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=platform",
			"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
			"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
			"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
			"PLATFORM darwin",
			"SOURCES node:os.networkInterfaces, netstat -ib, route/get gateway, networksetup hardware ports, dns.getServers",
			"PRIMARY en0",
			"MACOS SERVICE MAP en0:Wi-Fi",
			"GROUP LAN scope=private interfaces=en0 addresses=192.168.0.20",
			"  hint=RFC1918 private network for local devices",
		]);
	});

	test("formats source and locked control preview rows for selected interface", () => {
		expect(formatInterfaceSourceRows(fixture, fixture.interfaces[0])).toEqual([
			"SOURCE RAW en0",
			"inventory=node:os.networkInterfaces interface=en0",
			'stats=netstat -ib command="netstat -ibn"',
			'gateway=route/get command="route -n get default"',
			'hardwarePorts=networksetup command="networksetup -listallhardwareports"',
			"serviceMap=en0:Wi-Fi",
			"dns=node:dns.getServers servers=1.1.1.1,8.8.8.8",
			"RAW RETAINED sources=4 selected=en0",
			"raw[interface-inventory] node:os networkInterfaces() ok lines=2 shown=2",
			"  en0 IPv4 192.168.0.20/24 external mac=aa:bb:cc:dd:ee:ff",
			"raw[interface-stats] netstat -ibn ok lines=3 shown=2 truncated=yes",
			"  Name Mtu Network Address Ipkts Ierrs Ibytes Opkts",
			"raw[gateway] route -n get default ok lines=2 shown=2",
			"  gateway: 192.168.0.1",
			"raw[hardware-ports] networksetup -listallhardwareports ok lines=3 shown=3",
			"  Hardware Port: Wi-Fi",
			"CONTROL interface.disable risk=write privilege=admin status=locked confirmation=disable interface",
			'adapter=macos command="sudo networksetup -setnetworkserviceenabled <service> off"',
			"note=disable a network service",
		]);
		expect(
			formatInterfaceWorkspaceRows(fixture, 25, {
				selectedIndex: 0,
				view: "source",
			}),
		).toEqual([
			"SUMMARY interfaces=2 selected=en0 view=source",
			"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
			"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
			"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
			"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
			"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
			"SOURCE RAW en0",
			"inventory=node:os.networkInterfaces interface=en0",
			'stats=netstat -ib command="netstat -ibn"',
			'gateway=route/get command="route -n get default"',
			'hardwarePorts=networksetup command="networksetup -listallhardwareports"',
			"serviceMap=en0:Wi-Fi",
			"dns=node:dns.getServers servers=1.1.1.1,8.8.8.8",
			"RAW RETAINED sources=4 selected=en0",
			"raw[interface-inventory] node:os networkInterfaces() ok lines=2 shown=2",
			"  en0 IPv4 192.168.0.20/24 external mac=aa:bb:cc:dd:ee:ff",
			"raw[interface-stats] netstat -ibn ok lines=3 shown=2 truncated=yes",
			"  Name Mtu Network Address Ipkts Ierrs Ibytes Opkts",
			"raw[gateway] route -n get default ok lines=2 shown=2",
			"  gateway: 192.168.0.1",
			"raw[hardware-ports] networksetup -listallhardwareports ok lines=3 shown=3",
			"  Hardware Port: Wi-Fi",
			"CONTROL interface.disable risk=write privilege=admin status=locked confirmation=disable interface",
			'adapter=macos command="sudo networksetup -setnetworkserviceenabled <service> off"',
			"note=disable a network service",
		]);
	});

	test("creates interface source clipboard previews and handoff plans", async () => {
		expect(
			getInterfaceSourceClipboardPreview(fixture, fixture.interfaces[0]),
		).toEqual({
			source: "interface-source",
			label: "interface source evidence en0",
			copyText:
				"picos interfaces source\n\n" +
				"[Summary]\n" +
				"Selected: en0\n" +
				"Platform: darwin\n" +
				"Gateway: 192.168.0.1\n\n" +
				"[interface-inventory] node:os networkInterfaces() ok lines=2 shown=2\n" +
				"en0 IPv4 192.168.0.20/24 external mac=aa:bb:cc:dd:ee:ff\n" +
				"utun4 IPv6 fe80::2/64 external mac=00:00:00:00:00:00\n\n" +
				"[interface-stats] netstat -ibn ok lines=3 shown=2 truncated=yes\n" +
				"Name Mtu Network Address Ipkts Ierrs Ibytes Opkts\n" +
				" en0 1500 <Link#4> aa:bb:cc:dd:ee:ff 9000 0 125000000 7100\n\n" +
				"[gateway] route -n get default ok lines=2 shown=2\n" +
				"gateway: 192.168.0.1\n" +
				"interface: en0\n\n" +
				"[hardware-ports] networksetup -listallhardwareports ok lines=3 shown=3\n" +
				"Hardware Port: Wi-Fi\n" +
				"Device: en0\n" +
				"Ethernet Address: aa:bb:cc:dd:ee:ff",
			details: [
				"selected=en0 platform=darwin",
				"sources=4 gateway=192.168.0.1",
			],
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(
			getInterfaceSourceClipboardPreview({ ...fixture, sourceOutputs: [] }),
		).toBeUndefined();

		const plan = createInterfaceSourceHandoffPlan(fixture, {
			baseDir: "/tmp/picos",
			generatedAt: new Date("2026-07-02T06:00:00.000Z"),
			selected: fixture.interfaces[0],
		});

		expect(plan).toEqual({
			path: "/tmp/picos/interfaces/picos-interfaces-source-2026-07-02T060000000Z.md",
			label: "interface source evidence en0",
			view: "source",
			content:
				"# picos interface source handoff\n" +
				"generatedAt=2026-07-02T06:00:00.000Z\n" +
				"kind=interfaces\n" +
				"view=source\n" +
				"label=interface source evidence en0\n" +
				"command=node:os networkInterfaces(); netstat -ibn; route -n get default; networksetup -listallhardwareports\n" +
				"selected=en0\n" +
				"platform=darwin\n" +
				"\n" +
				"```txt\n" +
				"picos interfaces source\n\n" +
				"[Summary]\n" +
				"Selected: en0\n" +
				"Platform: darwin\n" +
				"Gateway: 192.168.0.1\n\n" +
				"[interface-inventory] node:os networkInterfaces() ok lines=2 shown=2\n" +
				"en0 IPv4 192.168.0.20/24 external mac=aa:bb:cc:dd:ee:ff\n" +
				"utun4 IPv6 fe80::2/64 external mac=00:00:00:00:00:00\n\n" +
				"[interface-stats] netstat -ibn ok lines=3 shown=2 truncated=yes\n" +
				"Name Mtu Network Address Ipkts Ierrs Ibytes Opkts\n" +
				" en0 1500 <Link#4> aa:bb:cc:dd:ee:ff 9000 0 125000000 7100\n\n" +
				"[gateway] route -n get default ok lines=2 shown=2\n" +
				"gateway: 192.168.0.1\n" +
				"interface: en0\n\n" +
				"[hardware-ports] networksetup -listallhardwareports ok lines=3 shown=3\n" +
				"Hardware Port: Wi-Fi\n" +
				"Device: en0\n" +
				"Ethernet Address: aa:bb:cc:dd:ee:ff\n" +
				"```\n",
		});

		const root = await mkdtemp(join(tmpdir(), "picos-interface-handoff-"));
		try {
			const writable = createInterfaceSourceHandoffPlan(fixture, {
				baseDir: root,
				generatedAt: new Date("2026-07-02T06:00:00.000Z"),
				selected: fixture.interfaces[0],
			});
			if (!writable) {
				throw new Error("expected interface handoff plan");
			}
			const written = await writeInterfaceSourceHandoffPlan(writable);

			expect(written.path).toBe(
				join(
					root,
					"interfaces",
					"picos-interfaces-source-2026-07-02T060000000Z.md",
				),
			);
			expect(await readFile(written.path, "utf8")).toBe(writable.content);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("formats interface source clipboard preview rows", () => {
		expect(
			formatInterfaceWorkspaceRows(fixture, 40, {
				copyPreview: true,
				selectedIndex: 0,
				view: "source",
			}).slice(-12),
		).toEqual([
			"CLIPBOARD PREVIEW interface-source",
			"label interface source evidence en0",
			"detail selected=en0 platform=darwin",
			"detail sources=4 gateway=192.168.0.1",
			"copy picos interfaces source",
			"copy ",
			"copy [Summary]",
			"copy Selected: en0",
			"copy Platform: darwin",
			"copy Gateway: 192.168.0.1",
			"copy ... 17 more lines",
			"confirm copy locked",
		]);
	});

	test("formats locked interface state proposal rows in the workspace", () => {
		const proposal = createInterfaceStateProposal(
			fixture.interfaces[0],
			"disable",
			{
				platform: fixture.platform,
				primaryInterfaceName: fixture.primaryInterface?.name,
				macosServiceNamesByDevice: fixture.macosServiceNamesByDevice,
			},
		);

		expect(
			formatInterfaceWorkspaceRows(fixture, 40, {
				selectedIndex: 0,
				stateProposal: proposal,
				view: "detail",
			}).slice(-21),
		).toEqual([
			"INTERFACE STATE PROPOSAL",
			"status=ready action=interface.disable locked enabled=false",
			"target=en0 kind=wifiOrEthernet primary=yes platform=darwin",
			"address ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff mtu=1500",
			"transition current=connected desired=disconnected",
			"risk=write privilege=admin confirm=disable interface",
			"controlTarget kind=network-service label=Wi-Fi confidence=exact source=networksetup-hardware-port-map",
			"controlCommand=sudo networksetup -setnetworkserviceenabled Wi-Fi off",
			"dryRun status=blocked policy=proposal-only adapterDryRun=unavailable willExecute=false",
			"dryRunCommand=sudo networksetup -setnetworkserviceenabled Wi-Fi off",
			"dryRunReason=interface-execution-disabled blockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
			"PREFLIGHT",
			"scope=interface target=en0",
			"currentStatus=connected desiredStatus=disconnected primary=yes platform=darwin",
			"willModify=interface-link-state serviceOrAdapter=network-service controlTarget=Wi-Fi",
			"targetResolution=mapped BSD device en0 to network service Wi-Fi",
			"requires=selected-interface admin confirmation dry-run-policy",
			"adapterDryRun=unavailable policy=proposal-only willExecute=false",
			"dryRunBlockers=interface-execution-disabled,mutation-controls-disabled,adapter-dry-run-unavailable",
			"rollback=restore previous interface state from current snapshot",
			"execution=disabled no interface state will be changed",
		]);
	});
});
