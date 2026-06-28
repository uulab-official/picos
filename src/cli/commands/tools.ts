import {
	formatToolResult,
	getToolDefinitions,
	runTool,
} from "../../core/tools";

export async function toolsCommand(
	name?: string,
	args: string[] = [],
	options: { timeout?: string; raw?: boolean } = {},
): Promise<void> {
	if (!name || name === "list") {
		console.log("picos tools");
		console.log("");
		for (const tool of getToolDefinitions()) {
			console.log(`${tool.id.padEnd(12)} ${tool.description}`);
		}
		return;
	}

	const result = await runTool(name, args, {
		timeoutMs: options.timeout ? Number(options.timeout) : undefined,
	});

	console.log(options.raw ? result.rawOutput : formatToolResult(result));
}
