import { runPing } from "../../core/command";

export async function pingCommand(
	host: string,
	options: { count?: string; timeout?: string } = {},
): Promise<void> {
	const result = await runPing(host, process.platform, {
		count: options.count ? Number(options.count) : undefined,
		timeoutMs: options.timeout ? Number(options.timeout) : undefined,
	});

	console.log(result.stdout || result.stderr || "No ping output.");

	if (!result.success) {
		process.exitCode = 1;
	}
}
