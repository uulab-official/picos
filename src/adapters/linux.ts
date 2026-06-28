import type { PingCommand } from "../core/types";

export function gatewayCommand(): { command: string; args: string[] } {
	return { command: "ip", args: ["route", "show", "default"] };
}

export function parseGateway(stdout: string): string | undefined {
	const match = stdout.match(/\bvia\s+(\S+)/);
	return match?.[1];
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-c", String(count), host] };
}
