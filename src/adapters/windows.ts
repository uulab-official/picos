import type { PingCommand } from "../core/types";

export function gatewayCommand(): { command: string; args: string[] } {
	return {
		command: "powershell",
		args: [
			"-NoProfile",
			"-Command",
			"(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).NextHop",
		],
	};
}

export function parseGateway(stdout: string): string | undefined {
	return stdout.trim().split(/\s+/).find(Boolean);
}

export function pingCommand(host: string, count: number): PingCommand {
	return { command: "ping", args: ["-n", String(count), host] };
}
