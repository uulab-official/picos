import type { LogProfile } from "./logPanel";
import type { Screen } from "./navigation";
import type { ToolRunActionId } from "./toolHistory";

export type CleanupShelfId =
	| "logs"
	| "routes"
	| "connections"
	| "ports"
	| "timeline"
	| "tools-history"
	| "tool-targets";

export type CleanupShelf = {
	id: CleanupShelfId;
	label: string;
	count: number;
	screen: Screen;
	workspace: string;
	shortcut: string;
	confirmationPhrase: string;
	detail: string;
};

export type CleanupShelfIndex = {
	activeShelves: number;
	totalItems: number;
	shelves: CleanupShelf[];
};

export type CleanupJumpAudit = {
	id: CleanupShelfId;
	label: string;
	screen: Screen;
	workspace: string;
	shortcut: string;
	confirmationPhrase: string;
	count: number;
	detail: string;
};

export type CleanupHandoffActionPlan = {
	id: CleanupShelfId;
	label: string;
	screen: Screen;
	workspace: string;
	shortcut: string;
	confirmationPhrase: string;
};

export type CleanupShelfIndexInput = {
	connectionFilterPresets?: string[];
	customToolTargetPresets?: Array<{
		actionId?: ToolRunActionId | string;
		target?: string;
	}>;
	logProfiles?: LogProfile[];
	logSearchPresets?: string[];
	portFilterPresets?: string[];
	routeFilterPresets?: string[];
	timelineSearchPresets?: string[];
	toolHistoryFilterPresets?: string[];
};

export function createCleanupShelfIndex(
	input: CleanupShelfIndexInput,
): CleanupShelfIndex {
	const logSearchCount = countText(input.logSearchPresets);
	const logProfileCount = countLogProfiles(input.logProfiles);
	const routeCount = countText(input.routeFilterPresets);
	const connectionCount = countText(input.connectionFilterPresets);
	const portCount = countText(input.portFilterPresets);
	const timelineCount = countText(input.timelineSearchPresets);
	const toolHistoryCount = countText(input.toolHistoryFilterPresets);
	const toolTargetCount = countToolTargets(input.customToolTargetPresets);
	const shelves: CleanupShelf[] = [
		{
			id: "logs",
			label: "Logs presets",
			count: logSearchCount + logProfileCount,
			screen: "logs",
			workspace: "Logs",
			shortcut: "D",
			confirmationPhrase: "clear logs",
			detail: `search=${logSearchCount} profiles=${logProfileCount}`,
		},
		{
			id: "routes",
			label: "Route filters",
			count: routeCount,
			screen: "routes",
			workspace: "Routes",
			shortcut: "D",
			confirmationPhrase: "clear routes",
			detail: `filters=${routeCount}`,
		},
		{
			id: "connections",
			label: "Connection filters",
			count: connectionCount,
			screen: "connections",
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			detail: `filters=${connectionCount}`,
		},
		{
			id: "ports",
			label: "Port filters",
			count: portCount,
			screen: "ports",
			workspace: "Ports",
			shortcut: "D",
			confirmationPhrase: "clear ports",
			detail: `filters=${portCount}`,
		},
		{
			id: "timeline",
			label: "Timeline searches",
			count: timelineCount,
			screen: "timeline",
			workspace: "Timeline",
			shortcut: "D",
			confirmationPhrase: "clear timeline",
			detail: `searches=${timelineCount}`,
		},
		{
			id: "tools-history",
			label: "Tools history filters",
			count: toolHistoryCount,
			screen: "tools",
			workspace: "Tools",
			shortcut: "C",
			confirmationPhrase: "clear tools history",
			detail: `filters=${toolHistoryCount}`,
		},
		{
			id: "tool-targets",
			label: "Tool targets",
			count: toolTargetCount,
			screen: "tools",
			workspace: "Tools",
			shortcut: "D",
			confirmationPhrase: "delete <action id>",
			detail: `saved-targets=${toolTargetCount}`,
		},
	];
	return {
		activeShelves: shelves.filter((shelf) => shelf.count > 0).length,
		totalItems: shelves.reduce((total, shelf) => total + shelf.count, 0),
		shelves,
	};
}

export function formatCleanupShelfIndexRows(
	index: CleanupShelfIndex,
	visibleRows: number,
	selectedIndex?: number,
): string[] {
	const selectedShelf =
		selectedIndex === undefined
			? undefined
			: getSelectedCleanupShelf(index, selectedIndex);
	const rows = [
		`CLEANUP INDEX active=${index.activeShelves} items=${index.totalItems}${
			selectedShelf ? ` selected=${selectedShelf.workspace}` : ""
		}`,
		...(index.totalItems > 0
			? index.shelves.map((shelf) => {
					const marker =
						selectedIndex === undefined
							? ""
							: selectedShelf?.id === shelf.id
								? "> "
								: "  ";
					return `${marker}${shelf.workspace.padEnd(11)} ${shelf.shortcut.padEnd(2)} count=${shelf.count}  ${shelf.confirmationPhrase}  ${shelf.detail}`;
				})
			: ["no saved preset shelves to clean"]),
	];
	return rows.slice(0, Math.max(1, visibleRows));
}

export function formatCleanupShelfDetailRows(
	index: CleanupShelfIndex,
	selectedIndex: number,
): string[] {
	const shelf = getSelectedCleanupShelf(index, selectedIndex);
	if (!shelf) {
		return [
			"CLEANUP DETAIL none",
			"no active cleanup shelf selected",
			"save presets first, then return to Status",
		];
	}

	return [
		`CLEANUP DETAIL ${shelf.label}`,
		`target=${shelf.workspace} screen=${shelf.screen} shortcut=${shelf.shortcut}`,
		`items=${shelf.count} detail=${shelf.detail}`,
		`confirm=${shelf.confirmationPhrase}`,
		`enter jumps to ${shelf.workspace}; press ${shelf.shortcut} then type exact phrase`,
	];
}

export function createCleanupJumpAudit(shelf: CleanupShelf): CleanupJumpAudit {
	return {
		id: shelf.id,
		label: shelf.label,
		screen: shelf.screen,
		workspace: shelf.workspace,
		shortcut: shelf.shortcut,
		confirmationPhrase: shelf.confirmationPhrase,
		count: shelf.count,
		detail: shelf.detail,
	};
}

export function formatCleanupJumpAuditRows(
	audit: CleanupJumpAudit | undefined,
): string[] {
	if (!audit) {
		return [];
	}

	return [
		`CLEANUP HANDOFF ${audit.label}`,
		`from=Status target=${audit.workspace} shortcut=${audit.shortcut} count=${audit.count}`,
		`confirm=${audit.confirmationPhrase} detail=${audit.detail}`,
	];
}

export function createCleanupHandoffActionPlan(
	audit: CleanupJumpAudit | undefined,
	currentScreen: Screen,
): CleanupHandoffActionPlan | undefined {
	if (!audit || audit.screen !== currentScreen) {
		return undefined;
	}

	return {
		id: audit.id,
		label: audit.label,
		screen: audit.screen,
		workspace: audit.workspace,
		shortcut: audit.shortcut,
		confirmationPhrase: audit.confirmationPhrase,
	};
}

export function formatCleanupHandoffActionRows(
	plan: CleanupHandoffActionPlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}

	return [
		"CLEANUP ACTION open prompt",
		`enter opens ${plan.workspace} cleanup shortcut=${plan.shortcut}`,
		`confirm=${plan.confirmationPhrase}`,
	];
}

export function getSelectedCleanupShelf(
	index: CleanupShelfIndex,
	selectedIndex: number,
): CleanupShelf | undefined {
	const activeShelves = getActiveCleanupShelves(index);
	if (activeShelves.length === 0) {
		return undefined;
	}

	const normalized = Math.min(
		Math.max(selectedIndex, 0),
		activeShelves.length - 1,
	);
	return activeShelves[normalized];
}

export function moveCleanupShelfSelection(
	index: CleanupShelfIndex,
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	const activeShelves = getActiveCleanupShelves(index);
	if (activeShelves.length === 0) {
		return 0;
	}

	const normalized = Math.min(
		Math.max(selectedIndex, 0),
		activeShelves.length - 1,
	);
	const offset = direction === "next" ? 1 : -1;
	return (normalized + offset + activeShelves.length) % activeShelves.length;
}

function getActiveCleanupShelves(index: CleanupShelfIndex): CleanupShelf[] {
	return index.shelves.filter((shelf) => shelf.count > 0);
}

function countText(values: string[] | undefined): number {
	return (values ?? []).filter((value) => value.trim()).length;
}

function countLogProfiles(profiles: LogProfile[] | undefined): number {
	return (profiles ?? []).filter((profile) => profile.query.trim()).length;
}

function countToolTargets(
	presets: CleanupShelfIndexInput["customToolTargetPresets"],
): number {
	return (presets ?? []).filter((preset) => preset.target?.trim()).length;
}
