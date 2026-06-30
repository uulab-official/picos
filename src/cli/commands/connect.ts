import { runTcpConnect } from "../../core/command";

export async function connectCommand(
	host: string,
	port: string,
	options: { timeout?: string } = {},
): Promise<void> {
	await runTcpConnectCommand("connect", host, port, options);
}

export async function telnetCommand(
	host: string,
	port: string,
	options: { timeout?: string } = {},
): Promise<void> {
	await runTcpConnectCommand("telnet", host, port, options);
}

async function runTcpConnectCommand(
	commandName: "connect" | "telnet",
	host: string,
	port: string,
	options: { timeout?: string },
): Promise<void> {
	const result = await runTcpConnect(host, port, {
		timeoutMs: options.timeout ? Number(options.timeout) : undefined,
	});

	console.log(`picos ${commandName} ${result.host}:${result.port}`);
	console.log(`Reachable: ${result.reachable ? "yes" : "no"}`);
	console.log(`Elapsed:   ${result.elapsedMs}ms`);
	if (result.error) {
		console.log(`Error:     ${result.error}`);
	}

	process.exitCode = result.reachable ? 0 : 1;
}
