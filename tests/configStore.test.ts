import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	readConfig,
	setConfigEndpointFilterPresets,
	setConfigEndpointSort,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
	setConfigRouteFilterPresets,
	setConfigToolHistoryPreferences,
	setConfigToolTargetPresets,
} from "../src/config/store";

const tempDirs: string[] = [];

async function tempConfigPath(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "picos-config-"));
	tempDirs.push(dir);
	return join(dir, "config.json");
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("config store", () => {
	test("persists normalized log profiles without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigLogProfiles(
			[
				{ level: "warn", query: " kernel " },
				{ level: "all", query: "" },
				{ level: "warn", query: "kernel" },
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.logProfiles).toEqual([
			{ level: "warn", query: "kernel" },
			{ level: "all", query: "" },
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).logProfiles).toEqual(config.logProfiles);
	});

	test("persists normalized log search presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigLogSearchPresets(
			[" kernel ", "", "error", "kernel", "dns", "route", "boot", "panic", "x"],
			path,
		);

		const config = await readConfig(path);
		expect(config.logSearchPresets).toEqual([
			"kernel",
			"error",
			"dns",
			"route",
			"boot",
			"panic",
		]);
		expect(config.theme).toBe("dark");
	});

	test("persists normalized route filter presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigRouteFilterPresets(
			[" utun ", "", "default", "utun", "link", "ipv6", "vpn", "metric", "x"],
			path,
		);

		const config = await readConfig(path);
		expect(config.routeFilterPresets).toEqual([
			"utun",
			"default",
			"link",
			"ipv6",
			"vpn",
			"metric",
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).routeFilterPresets).toEqual(
			config.routeFilterPresets,
		);
	});

	test("persists normalized endpoint filter presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigEndpointFilterPresets(
			"connections",
			[" 443 ", "", "node", "443", "ESTABLISHED", "127.0.0.1", "pg", "udp"],
			path,
		);
		await setConfigEndpointFilterPresets(
			"ports",
			[" node ", "", "3000", "node", "postgres", "tcp", "5432", "listen"],
			path,
		);

		const config = await readConfig(path);
		expect(config.connectionFilterPresets).toEqual([
			"443",
			"node",
			"ESTABLISHED",
			"127.0.0.1",
			"pg",
			"udp",
		]);
		expect(config.portFilterPresets).toEqual([
			"node",
			"3000",
			"postgres",
			"tcp",
			"5432",
			"listen",
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).connectionFilterPresets).toEqual(
			config.connectionFilterPresets,
		);
		expect(JSON.parse(raw).portFilterPresets).toEqual(config.portFilterPresets);
	});

	test("persists endpoint sort preferences without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigEndpointSort(
			"connections",
			{ key: "remotePort", direction: "asc" },
			path,
		);
		await setConfigEndpointSort(
			"ports",
			{ key: "pid", direction: "desc" },
			path,
		);

		const config = await readConfig(path);
		expect(config.connectionSort).toBe("remotePort");
		expect(config.portSort).toBe("-pid");
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).connectionSort).toBe("remotePort");
		expect(JSON.parse(raw).portSort).toBe("-pid");
	});

	test("persists tool history preferences without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigToolHistoryPreferences(
			{
				filterPresets: [" dns ", "", "fail", "dns", "tls"],
				sort: "status",
				group: "tool",
				detailView: "command",
			},
			path,
		);

		const config = await readConfig(path);
		expect(config.toolHistoryFilterPresets).toEqual(["dns", "fail", "tls"]);
		expect(config.toolHistorySort).toBe("status");
		expect(config.toolHistoryGroup).toBe("tool");
		expect(config.toolHistoryDetailView).toBe("command");
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).toolHistoryFilterPresets).toEqual([
			"dns",
			"fail",
			"tls",
		]);
		expect(JSON.parse(raw).toolHistorySort).toBe("status");
		expect(JSON.parse(raw).toolHistoryGroup).toBe("tool");
		expect(JSON.parse(raw).toolHistoryDetailView).toBe("command");
	});

	test("persists normalized tool target presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigToolTargetPresets(
			[
				{
					id: " api ",
					label: " API DNS ",
					actionId: "tools.dns",
					target: " api.example.com ",
					hint: " production api ",
				},
				{
					actionId: "network.connect",
					target: "db.internal:5432",
				},
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.toolTargetPresets).toEqual([
			{
				id: "api",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "network-connect-db-internal-5432",
				label: "network.connect db.internal:5432",
				actionId: "network.connect",
				target: "db.internal:5432",
				hint: "custom target",
			},
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).toolTargetPresets).toEqual(config.toolTargetPresets);
	});
});
