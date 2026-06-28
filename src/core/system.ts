import { arch, hostname, platform, release, uptime } from "node:os";
import type { RuntimeSummary, SystemSummary } from "./types";
import { VERSION } from "./version";

export function getSystemSummary(): SystemSummary {
	return {
		hostname: hostname(),
		platform: platform(),
		arch: arch(),
		release: release(),
		uptimeSeconds: Math.floor(uptime()),
	};
}

export function formatUptime(seconds: number): string {
	const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;
	const parts: string[] = [];

	if (days > 0) {
		parts.push(`${days}d`);
	}
	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	parts.push(`${minutes}m`);

	return parts.join(" ");
}

export function getRuntimeSummary(configPath: string): RuntimeSummary {
	return {
		picosVersion: VERSION,
		nodeVersion: process.version,
		bunVersion: Bun.version,
		configPath,
	};
}
