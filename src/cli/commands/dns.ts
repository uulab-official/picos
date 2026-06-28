import { getServers } from "node:dns";
import { readConfig } from "../../config/store";

export async function dnsCommand(action?: string): Promise<void> {
	if (action === "flush") {
		const config = await readConfig();
		if (!config.enableExperimentalControls) {
			console.log(
				"DNS flush is disabled in v0.1. Enable experimental controls to revisit this later.",
			);
			return;
		}

		console.log("DNS flush is not implemented in v0.1.");
		return;
	}

	if (action && action !== "show") {
		throw new Error(`Unknown dns action: ${action}`);
	}

	const servers = getServers();
	console.log("picos dns");
	console.log("");
	console.log(`Servers: ${servers.length ? servers.join(", ") : "-"}`);
}
