import { isConfigKey } from "../../config/schema";
import { getConfigPath, readConfig, setConfigValue } from "../../config/store";

export async function configCommand(
	action?: string,
	key?: string,
	value?: string,
): Promise<void> {
	if (!action) {
		await printConfig();
		return;
	}

	if (action === "get") {
		if (!key || !isConfigKey(key)) {
			throw new Error("Usage: picos config get <key>");
		}
		const config = await readConfig();
		console.log(config[key]);
		return;
	}

	if (action === "set") {
		if (!key || value === undefined) {
			throw new Error("Usage: picos config set <key> <value>");
		}
		const config = await setConfigValue(key, value);
		console.log(`${key}=${config[key as keyof typeof config]}`);
		return;
	}

	throw new Error(`Unknown config action: ${action}`);
}

async function printConfig(): Promise<void> {
	const config = await readConfig();
	console.log(`Path: ${getConfigPath()}`);
	console.log(JSON.stringify(config, null, 2));
}
