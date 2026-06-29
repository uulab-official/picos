import { describe, expect, test } from "bun:test";
import { parseInterfaceStats as parseLinuxInterfaceStats } from "../src/adapters/linux";
import { parseInterfaceStats as parseMacosInterfaceStats } from "../src/adapters/macos";
import { parseInterfaceStats as parseWindowsInterfaceStats } from "../src/adapters/windows";

describe("platform interface statistics parsers", () => {
	test("parses macOS netstat interface counters", () => {
		const stats = parseMacosInterfaceStats(`
Name  Mtu   Network       Address            Ipkts Ierrs    Ibytes    Opkts Oerrs    Obytes  Coll
en0   1500  <Link#4>      aa:bb:cc:dd:ee:ff  100   0        123456    200   0        654321  0
en0   1500  192.168.0/24  192.168.0.12       100   -        123456    200   -        654321  -
awdl0 1500  <Link#12>     ff:ee:dd:cc:bb:aa  10    0        2048      12    0        4096    0
`);

		expect(stats.en0).toEqual({
			mtu: 1500,
			rxPackets: 100,
			rxBytes: 123456,
			txPackets: 200,
			txBytes: 654321,
		});
		expect(stats.awdl0?.rxBytes).toBe(2048);
	});

	test("parses Linux ip -s link counters", () => {
		const stats = parseLinuxInterfaceStats(`
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether aa:bb:cc:dd:ee:ff brd ff:ff:ff:ff:ff:ff
    RX:  bytes packets errors dropped  missed   mcast
    123456 100 0 0 0 0
    TX:  bytes packets errors dropped carrier collsns
    654321 200 0 0 0 0
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default
    link/ether 02:42:14:1d:4d:9a brd ff:ff:ff:ff:ff:ff
    RX:  bytes packets errors dropped  missed   mcast
    2048 10 0 0 0 0
    TX:  bytes packets errors dropped carrier collsns
    4096 12 0 0 0 0
`);

		expect(stats.eth0).toEqual({
			mtu: 1500,
			rxBytes: 123456,
			rxPackets: 100,
			txBytes: 654321,
			txPackets: 200,
		});
		expect(stats.docker0?.txPackets).toBe(12);
	});

	test("parses Windows adapter statistics", () => {
		const stats = parseWindowsInterfaceStats(`
Name       ReceivedBytes SentBytes ReceivedUnicastPackets SentUnicastPackets
----       ------------- --------- ---------------------- ------------------
Wi-Fi 2    123456        654321    100                    200
Ethernet   2048          4096      10                     12
`);

		expect(stats["Wi-Fi 2"]).toEqual({
			rxBytes: 123456,
			txBytes: 654321,
			rxPackets: 100,
			txPackets: 200,
		});
		expect(stats.Ethernet?.rxPackets).toBe(10);
	});
});
