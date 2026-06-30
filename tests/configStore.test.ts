import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	readConfig,
	setConfigEndpointFilterPresets,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
	setConfigRouteFilterPresets,
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
});
