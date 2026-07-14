import { getServers } from "node:dns";
import { readConfig } from "../../config/store";
import { formatDnsBlockedJson, formatDnsJson } from "../diagnosticOutput";
import { ReportedCliError } from "../errors";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export async function dnsCommand(
	action?: string,
	options: { json?: unknown } = {},
	dependencies: {
		getServers?: () => string[];
		readConfig?: typeof readConfig;
	} = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		if (action === "flush") {
			const config = await (dependencies.readConfig ?? readConfig)();
			const message = config.enableExperimentalControls
				? "DNS flush execution is not implemented and remains locked."
				: "DNS flush is disabled; OS mutation controls remain locked.";
			if (json) {
				await writeCliOutput(formatDnsBlockedJson(message));
				throw new ReportedCliError(message);
			}
			console.log(message);
			return;
		}

		if (action && action !== "show") {
			throw new Error(`Unknown dns action: ${action}`);
		}

		const servers = (dependencies.getServers ?? getServers)();
		if (json) {
			await writeCliOutput(formatDnsJson(servers));
			return;
		}

		console.log("picos dns");
		console.log("");
		console.log(`Servers: ${servers.length ? servers.join(", ") : "-"}`);
	} catch (caught) {
		if (isCliOutputWriteError(caught) || caught instanceof ReportedCliError) {
			throw caught;
		}
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("dns", caught, {
				request: { operation: action ?? "show" },
			});
		}
		throw caught;
	}
}
