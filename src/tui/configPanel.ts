import type { PicosConfig } from "../core/types";
import { getNextIndex } from "./navigation";

export type ConfigWorkspaceItemKey =
	| "auditArchiveRetentionLimit"
	| "toolTargetPresetLimit";

export type ConfigWorkspaceItem = {
	key: ConfigWorkspaceItemKey;
	label: string;
	value: number;
	min: number;
	max: number;
	hint: string;
};

export function createConfigWorkspaceItems(
	config: Pick<
		PicosConfig,
		"auditArchiveRetentionLimit" | "toolTargetPresetLimit"
	>,
): ConfigWorkspaceItem[] {
	return [
		{
			key: "auditArchiveRetentionLimit",
			label: "Audit archive retention",
			value: config.auditArchiveRetentionLimit,
			min: 1,
			max: 60,
			hint: "archived Timeline audit logs kept before prune",
		},
		{
			key: "toolTargetPresetLimit",
			label: "Tools target retention",
			value: config.toolTargetPresetLimit,
			min: 1,
			max: 24,
			hint: "saved Tools target presets kept",
		},
	];
}

export function moveConfigWorkspaceSelection(
	current: number,
	total: number,
	direction: "next" | "previous",
): number {
	return getNextIndex(current, total, direction);
}

export function getConfigWorkspaceItem(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
): ConfigWorkspaceItem | undefined {
	return items[Math.min(Math.max(selectedIndex, 0), items.length - 1)];
}

export function adjustConfigWorkspaceItem(
	item: ConfigWorkspaceItem,
	direction: "increase" | "decrease",
): number {
	const offset = direction === "increase" ? 1 : -1;
	return Math.min(item.max, Math.max(item.min, item.value + offset));
}

export function formatConfigWorkspaceRows(
	items: ConfigWorkspaceItem[],
	selectedIndex: number,
	visibleRows: number,
): string[] {
	const selected = getConfigWorkspaceItem(items, selectedIndex);
	const bodyRows = items.map((item, index) => {
		const marker = index === selectedIndex ? ">" : " ";
		return `${marker} ${item.key.padEnd(27)} ${String(item.value).padEnd(4)} ${item.hint}`;
	});
	const rows = [
		"CONFIG WORKSPACE",
		"j/k select  +/- adjust+save  enter show  values persist to picos config",
		...bodyRows,
		selected
			? `selected=${selected.key} range=${selected.min}..${selected.max}`
			: "selected=-",
	];
	return rows.slice(0, Math.max(0, visibleRows));
}
