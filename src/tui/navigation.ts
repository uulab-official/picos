export type Screen =
	| "dashboard"
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
	| "logs";

export const screenOrder: Screen[] = [
	"dashboard",
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
	"logs",
];

export type FocusArea = "workspaces" | "actions";

const shortcuts: Record<string, Screen> = {
	"1": "dashboard",
	"2": "system",
	"3": "hardware",
	"4": "storage",
	"5": "processes",
	"6": "interfaces",
	"7": "network",
	"8": "routes",
	"9": "connections",
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
	return current;
}

export function leaveFocus(current: FocusArea): FocusArea {
	if (current === "actions") {
		return "workspaces";
	}
	return current;
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
	const clampedSelectedIndex = Math.min(Math.max(selectedIndex, 0), total - 1);
	const centeredStart =
		clampedSelectedIndex - Math.floor(clampedVisibleCount / 2);
	const maxStart = total - clampedVisibleCount;
	const start = Math.min(Math.max(centeredStart, 0), maxStart);

	return { start, end: start + clampedVisibleCount };
}
