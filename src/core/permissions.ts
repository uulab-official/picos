import { platform, userInfo } from "node:os";
import type { PermissionSummary, SupportedPlatform } from "./types";

type UserInfoLike = {
	username: string;
};

type PermissionSource = {
	userInfo: () => UserInfoLike;
	getuid?: () => number;
	platform: SupportedPlatform;
};

export function getPermissionSummary(
	source: PermissionSource = {
		userInfo,
		getuid: process.getuid?.bind(process),
		platform: platform(),
	},
): PermissionSummary {
	const user = source.userInfo().username || "unknown";
	const isAdmin =
		source.platform !== "win32" &&
		typeof source.getuid === "function" &&
		source.getuid() === 0;

	return {
		user,
		isAdmin,
		detail: isAdmin ? "admin" : "user",
	};
}
