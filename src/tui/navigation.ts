export type Screen =
	| "dashboard"
	| "files"
	| "remotes"
	| "editor"
	| "system"
	| "hardware"
	| "storage"
	| "processes"
	| "interfaces"
	| "network"
	| "routes"
	| "connections"
	| "ports"
	| "tools"
	| "networkTools"
	| "timeline"
	| "dns"
	| "actions"
	| "status"
	| "config"
	| "logs"
	| "operations";

export const screenOrder: Screen[] = [
	"dashboard",
	"files",
	"remotes",
	"editor",
	"system",
	"hardware",
	"storage",
	"processes",
	"interfaces",
	"network",
	"routes",
	"connections",
	"ports",
	"tools",
	"networkTools",
	"timeline",
	"dns",
	"actions",
	"status",
	"config",
	"logs",
	// Appended rather than inserted next to `config`, so every existing screen
	// index stays stable for callers and tests that hardcode them.
	"operations",
];

export type FocusArea = "workspaces" | "actions" | "files" | "remotes";

const shortcuts: Record<string, Screen> = {
	"1": "dashboard",
	"2": "files",
	"3": "remotes",
	"4": "editor",
	"5": "system",
	"6": "hardware",
	"7": "storage",
	"8": "processes",
	"9": "interfaces",
};

export function getScreenByShortcut(input: string): Screen | undefined {
	return shortcuts[input];
}

export function getScreenIndex(screen: Screen): number {
	return screenOrder.indexOf(screen);
}

export function moveScreen(
	current: Screen,
	direction: "next" | "previous",
): Screen {
	const index = getScreenIndex(current);
	const offset = direction === "next" ? 1 : -1;
	const nextIndex = (index + offset + screenOrder.length) % screenOrder.length;
	return screenOrder[nextIndex];
}

export function getScreenLabel(screen: Screen): string {
	if (screen === "dns") {
		return "DNS";
	}
	if (screen === "networkTools") {
		return "Network Tools";
	}
	return `${screen.charAt(0).toUpperCase()}${screen.slice(1)}`;
}

export function enterFocus(screen: Screen, current: FocusArea): FocusArea {
	if (screen === "actions" && current === "workspaces") {
		return "actions";
	}
	if (screen === "files" && current === "workspaces") {
		return "files";
	}
	if (screen === "remotes" && current === "workspaces") {
		return "remotes";
	}
	return current;
}

export function leaveFocus(current: FocusArea): FocusArea {
	if (current === "actions" || current === "files" || current === "remotes") {
		return "workspaces";
	}
	return current;
}

// Clamps an index into a list's valid range, returning 0 for an empty list so a
// caller can index without a second guard. Extracted because this arithmetic was
// spelled three different ways across `App.tsx` and this module, and two of those
// spellings omitted the lower bound, letting a negative index survive. That is
// unreachable today only because every writer happens to clamp already, which is
// the kind of accident worth removing rather than relying on.
export function clampIndex(index: number, total: number): number {
	return total <= 0 ? 0 : Math.min(Math.max(index, 0), total - 1);
}

export function getNextIndex(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	if (total <= 0) {
		return 0;
	}

	const normalized = clampIndex(current, total);
	const offset = direction === "next" ? 1 : -1;
	return (normalized + offset + total) % total;
}

export function getLocationShortcutIndex(
	input: string,
	locationCount: number,
): number | undefined {
	if (locationCount <= 0 || !/^[1-9]$/.test(input)) {
		return undefined;
	}

	const index = Number(input) - 1;
	return index < locationCount ? index : undefined;
}

export function getVisibleWindow(
	total: number,
	selectedIndex: number,
	visibleCount: number,
): { start: number; end: number } {
	if (total <= 0 || visibleCount <= 0) {
		return { start: 0, end: 0 };
	}

	const clampedVisibleCount = Math.min(total, visibleCount);
	const clampedSelectedIndex = clampIndex(selectedIndex, total);
	const centeredStart =
		clampedSelectedIndex - Math.floor(clampedVisibleCount / 2);
	const maxStart = total - clampedVisibleCount;
	const start = Math.min(Math.max(centeredStart, 0), maxStart);

	return { start, end: start + clampedVisibleCount };
}
