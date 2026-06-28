import type { PingCommand } from "../core/types";

export function gatewayCommand(): { command: string; args: string[] } {
	return { command: "route", args: ["-n", "get", "default"] };
}

export function parseGateway(stdout: string): string | undefined {
	const line = stdout
		.split("\n")
		.map((value) => value.trim())
		.find((value) => value.startsWith("gateway:"));
	return line?.split(/\s+/).at(1);
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-c", String(count), host] };
}
