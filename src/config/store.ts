import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { normalizeLogProfiles } from "../core/logProfiles";
import type { LogProfile, PicosConfig } from "../core/types";
import {
	coerceConfigValue,
	defaultConfig,
	getConfigPathForPlatform,
	isConfigKey,
	mergeConfig,
} from "./schema";

export function getConfigPath(): string {
	return getConfigPathForPlatform(process.platform, homedir(), process.env);
}

export async function readConfig(path = getConfigPath()): Promise<PicosConfig> {
	try {
		const raw = await readFile(path, "utf8");
		return mergeConfig(JSON.parse(raw));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return defaultConfig;
		}
		throw error;
	}
}

export async function writeConfig(
	config: PicosConfig,
	path = getConfigPath(),
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function setConfigValue(
	key: string,
	value: string,
	path = getConfigPath(),
): Promise<PicosConfig> {
	if (!isConfigKey(key)) {
		throw new Error(`Unknown config key: ${key}`);
	}

	const config = await readConfig(path);
	const next = {
		...config,
		[key]: coerceConfigValue(key, value),
	};
	await writeConfig(next, path);
	return next;
}

export async function setConfigLogProfiles(
	profiles: LogProfile[],
	path = getConfigPath(),
): Promise<PicosConfig> {
	const config = await readConfig(path);
	const next = {
		...config,
		logProfiles: normalizeLogProfiles(profiles),
	};
	await writeConfig(next, path);
	return next;
}
