import type { SupportedPlatform } from "../core/types";

export function currentPlatform(): SupportedPlatform {
	return process.platform;
}

export function isKnownDesktopPlatform(platform: SupportedPlatform): boolean {
	return platform === "darwin" || platform === "linux" || platform === "win32";
}
