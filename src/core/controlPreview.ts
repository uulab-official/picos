import { controlPreviewCommand as linuxControlPreviewCommand } from "../adapters/linux";
import { controlPreviewCommand as macosControlPreviewCommand } from "../adapters/macos";
import { controlPreviewCommand as windowsControlPreviewCommand } from "../adapters/windows";
import type { ActionPreviewCommand } from "./actions";
import type { SupportedPlatform } from "./types";

export function getControlPreviewCommand(
	actionId: string,
	platform: SupportedPlatform,
): ActionPreviewCommand | undefined {
	if (platform === "darwin") {
		return macosControlPreviewCommand(actionId);
	}
	if (platform === "win32") {
		return windowsControlPreviewCommand(actionId);
	}
	return linuxControlPreviewCommand(actionId);
}
