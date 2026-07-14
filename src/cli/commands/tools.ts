import {
	formatToolResult,
	getToolDefinitions,
	runTool,
} from "../../core/tools";
import { formatToolRunJson, formatToolsListJson } from "../diagnosticOutput";
import {
	assertLocalJsonOptions,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

type ToolsCommandOptions = {
	timeout?: string | number;
	raw?: boolean;
	json?: unknown;
};

export async function toolsCommand(
	name?: string,
	args: Array<string | number> = [],
	options: ToolsCommandOptions = {},
	runner: typeof runTool = runTool,
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	const normalizedArgs = args.map(String);
	try {
		const json = assertLocalJsonOptions(options);
		const timeoutMs = parseToolsTimeout(options.timeout);
		if (!name || name === "list") {
			const definitions = getToolDefinitions();
			if (json) {
				await writeCliOutput(formatToolsListJson(definitions));
				return;
			}
			console.log("picos tools");
			console.log("");
			for (const tool of definitions) {
				console.log(`${tool.id.padEnd(12)} ${tool.description}`);
			}
			return;
		}

		const result = await runner(name, normalizedArgs, { timeoutMs });
		if (json) {
			await writeCliOutput(
				formatToolRunJson(result, { name, args: normalizedArgs, timeoutMs }),
			);
			if (result.automation?.source.success === false) process.exitCode = 1;
			return;
		}

		console.log(options.raw ? result.rawOutput : formatToolResult(result));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("tools", caught, {
				request: {
					operation: !name || name === "list" ? "list" : "run",
					tool: name,
					args: normalizedArgs,
					timeoutMs: options.timeout,
				},
			});
		}
		throw caught;
	}
}

export function parseToolsTimeout(
	value: string | number | undefined,
): number | undefined {
	if (value === undefined) return undefined;
	const timeoutMs = Number(value);
	if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
		throw new Error("Invalid tool timeout");
	}
	return timeoutMs;
}
