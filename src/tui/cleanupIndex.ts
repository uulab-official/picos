import type { LogProfile } from "./logPanel";
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
			workspace: "Logs",
			shortcut: "D",
			confirmationPhrase: "clear logs",
			detail: `search=${logSearchCount} profiles=${logProfileCount}`,
		},
		{
			id: "routes",
			label: "Route filters",
			count: routeCount,
			workspace: "Routes",
			shortcut: "D",
			confirmationPhrase: "clear routes",
			detail: `filters=${routeCount}`,
		},
		{
			id: "connections",
			label: "Connection filters",
			count: connectionCount,
			workspace: "Connections",
			shortcut: "D",
			confirmationPhrase: "clear connections",
			detail: `filters=${connectionCount}`,
		},
		{
			id: "ports",
			label: "Port filters",
			count: portCount,
			workspace: "Ports",
			shortcut: "D",
			confirmationPhrase: "clear ports",
			detail: `filters=${portCount}`,
		},
		{
			id: "timeline",
			label: "Timeline searches",
			count: timelineCount,
			workspace: "Timeline",
			shortcut: "D",
			confirmationPhrase: "clear timeline",
			detail: `searches=${timelineCount}`,
		},
		{
			id: "tools-history",
			label: "Tools history filters",
			count: toolHistoryCount,
			workspace: "Tools",
			shortcut: "C",
			confirmationPhrase: "clear tools history",
			detail: `filters=${toolHistoryCount}`,
		},
		{
			id: "tool-targets",
			label: "Tool targets",
			count: toolTargetCount,
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
): string[] {
	const rows = [
		`CLEANUP INDEX active=${index.activeShelves} items=${index.totalItems}`,
		...(index.totalItems > 0
			? index.shelves.map(
					(shelf) =>
						`${shelf.workspace.padEnd(11)} ${shelf.shortcut.padEnd(2)} count=${shelf.count}  ${shelf.confirmationPhrase}  ${shelf.detail}`,
				)
			: ["no saved preset shelves to clean"]),
	];
	return rows.slice(0, Math.max(1, visibleRows));
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
