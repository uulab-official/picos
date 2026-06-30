import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	readConfig,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
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
});
