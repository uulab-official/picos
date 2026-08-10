import { describe, expect, test } from "bun:test";
import { formatFullInfo } from "../src/cli/commands/info";
import { getHardwareSummary } from "../src/core/hardware";
import { getPermissionSummary } from "../src/core/permissions";
import { formatUptime, getRuntimeSummary } from "../src/core/system";
import { createSystemInventory } from "../src/core/systemInventory";
import { createDockerSnapshotFixture } from "./support/pluginFixtures";

describe("system inventory", () => {
	test("formats uptime into stable days hours minutes text", () => {
		expect(formatUptime(0)).toBe("0m");
		expect(formatUptime(65)).toBe("1m");
		expect(formatUptime(3660)).toBe("1h 1m");
		expect(formatUptime(90061)).toBe("1d 1h 1m");
	});

	test("reports runtime versions for the full inventory report", () => {
		const runtime = getRuntimeSummary("/tmp/picos/config.json");

		expect(runtime.picosVersion).toMatch(/^\d+\.\d+\.\d+/);
		expect(runtime.nodeVersion).toBe(process.version);
		expect(runtime.configPath).toBe("/tmp/picos/config.json");
	});

	test("summarizes hardware with CPU and memory facts", () => {
		const hardware = getHardwareSummary({
			cpus: () => [{ model: "Test CPU" }, { model: "Test CPU" }],
			totalmem: () => 16,
			freemem: () => 4,
		});

		expect(hardware).toEqual({
			cpuModel: "Test CPU",
			cpuCount: 2,
			totalMemoryBytes: 16,
			freeMemoryBytes: 4,
		});
	});

	test("reports permission summary without throwing", () => {
		const permission = getPermissionSummary({
			userInfo: () => ({ username: "tester" }),
			getuid: () => 501,
			platform: "darwin",
		});

		expect(permission).toEqual({
			user: "tester",
			isAdmin: false,
			detail: "user",
		});
	});

	test("aggregates system inventory sections", async () => {
		// Break caught: caller-supplied developer plugin snapshots are omitted from
		// the unified System inventory.
		const docker = createDockerSnapshotFixture({ status: "partial" });
		const inventory = await createSystemInventory({
			configPath: "/tmp/picos/config.json",
			system: {
				hostname: "host",
				platform: "darwin",
				arch: "arm64",
				release: "25.0.0",
				uptimeSeconds: 120,
			},
			hardware: {
				cpuModel: "Test CPU",
				cpuCount: 4,
				totalMemoryBytes: 100,
				freeMemoryBytes: 25,
			},
			storage: [],
			processes: [],
			plugins: [docker],
			network: {
				status: "online",
				host: "host",
				platform: "darwin",
				interfaces: [
					{
						name: "en0",
						status: "connected",
						kind: "wifiOrEthernet",
						ipv4: "192.168.0.12",
						ipv4Cidr: "192.168.0.12/24",
						mac: "aa:bb:cc:dd:ee:ff",
					},
				],
				networkGroups: [
					{
						kind: "lan",
						label: "LAN",
						scope: "private",
						hint: "RFC1918 private network for local devices",
						interfaces: ["en0"],
						addresses: ["192.168.0.12"],
					},
				],
				dnsServers: ["1.1.1.1"],
			},
			permission: {
				user: "tester",
				isAdmin: false,
				detail: "user",
			},
		});

		expect(inventory.runtime.configPath).toBe("/tmp/picos/config.json");
		expect(inventory.system.hostname).toBe("host");
		expect(inventory.permission.detail).toBe("user");
		expect(inventory.plugins).toEqual([docker]);
		expect(inventory.sources).toEqual([]);
	});

	test("formats full info with OS-like sections", () => {
		const context = "ssh://operator:plain-password@docker.example/prod";
		const docker = createDockerSnapshotFixture({
			status: "partial",
			data: { context },
			evidence: [
				{
					id: "engine",
					command: "docker",
					args: ["version"],
					supported: true,
					success: false,
					exitCode: 1,
					truncated: false,
					diagnostic: "raw-secret-output",
				},
			],
		});
		const output = formatFullInfo({
			system: {
				hostname: "host",
				platform: "darwin",
				arch: "arm64",
				release: "25.0.0",
				uptimeSeconds: 60,
			},
			hardware: {
				cpuModel: "Test CPU",
				cpuCount: 2,
				totalMemoryBytes: 1024,
				freeMemoryBytes: 512,
			},
			storage: [{ filesystem: "/dev/test", mount: "/", size: "10G" }],
			processes: [{ pid: 1, command: "launchd" }],
			network: {
				status: "online",
				host: "host",
				platform: "darwin",
				interfaces: [
					{
						name: "en0",
						status: "connected",
						kind: "wifiOrEthernet",
						ipv4: "192.168.0.12",
						ipv4Cidr: "192.168.0.12/24",
						mac: "aa:bb:cc:dd:ee:ff",
					},
				],
				networkGroups: [
					{
						kind: "lan",
						label: "LAN",
						scope: "private",
						hint: "RFC1918 private network for local devices",
						interfaces: ["en0"],
						addresses: ["192.168.0.12"],
					},
				],
				dnsServers: ["1.1.1.1"],
			},
			permission: { user: "tester", isAdmin: false, detail: "user" },
			runtime: {
				picosVersion: "0.1.0",
				nodeVersion: "v1.0.0",
				bunVersion: "1.0.0",
				configPath: "/tmp/config.json",
			},
			plugins: [docker],
			sources: [
				{
					key: "processes",
					command: "ps",
					args: ["-axo", "pid,pcpu,pmem,command"],
					supported: true,
					success: false,
					exitCode: 1,
					truncated: false,
				},
			],
		});

		expect(output).toContain("System");
		expect(output).toContain("Hardware");
		expect(output).toContain("Storage");
		expect(output).toContain("Processes");
		expect(output).toContain("LAN: en0");
		expect(output).toContain("en0 wifiOrEthernet connected 192.168.0.12/24");
		expect(output).toContain("Permissions");
		expect(output).toContain("Plugins");
		expect(output).toContain("DOCKER partial");
		expect(output).toContain("docker.example/prod");
		expect(output).not.toContain("plain-password");
		expect(output).toContain("Sources");
		expect(output).toContain("processes: supported=true success=false exit=1");
		expect(output).not.toContain("raw-secret-output");
	});
});
