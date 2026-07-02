import type { PicosAction } from "../core/actions";
import { getNextIndex } from "./navigation";
import type { StatusActivityToolsEvidenceSearchRecovery } from "./statusActivityQueue";

export type CommandPaletteState = {
	active: boolean;
	selectedIndex: number;
	query: string;
};

export function openCommandPalette(): CommandPaletteState {
	return {
		active: true,
		selectedIndex: 0,
		query: "",
	};
}

export function closeCommandPalette(
	state: CommandPaletteState,
): CommandPaletteState {
	return {
		...state,
		active: false,
	};
}

export function moveCommandPalette(
	state: CommandPaletteState,
	total: number,
	direction: "next" | "previous",
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		selectedIndex: getNextIndex(state.selectedIndex, total, direction),
	};
}

export function appendCommandPaletteQuery(
	state: CommandPaletteState,
	input: string,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	const printableInput = input.replace(/[^\x20-\x7e]/g, "");
	if (printableInput.length === 0) {
		return state;
	}

	return {
		...state,
		query: `${state.query}${printableInput}`,
		selectedIndex: 0,
	};
}

export function backspaceCommandPaletteQuery(
	state: CommandPaletteState,
): CommandPaletteState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		query: state.query.slice(0, -1),
		selectedIndex: 0,
	};
}

export function getFilteredPaletteActions(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction[] {
	const query = state.query.trim().toLowerCase();
	if (query.length === 0) {
		return actions;
	}

	return actions.filter((action) =>
		[
			action.id,
			action.title,
			action.description,
			action.category,
			action.risk,
			action.privilege,
		]
			.join(" ")
			.toLowerCase()
			.includes(query),
	);
}

export function getPaletteAction(
	actions: PicosAction[],
	state: CommandPaletteState,
): PicosAction | undefined {
	if (!state.active) {
		return undefined;
	}

	return getFilteredPaletteActions(actions, state)[state.selectedIndex];
}

export type CommandPalettePreviewContext = {
	toolsEvidenceSearchRecovery?: StatusActivityToolsEvidenceSearchRecovery;
	selectedToolsEvidenceSearchMatchIndex?: number;
};

export function formatCommandPaletteActionPreviewRows(
	action: PicosAction | undefined,
	context: CommandPalettePreviewContext = {},
): string[] {
	if (!action) {
		return [];
	}
	if (
		action.id !== "status.toolsEvidence.matchOpen" &&
		action.id !== "status.toolsEvidence.matchArchive"
	) {
		return [];
	}

	const recovery = context.toolsEvidenceSearchRecovery;
	if (!recovery || recovery.items.length === 0) {
		return [
			"selected tools match unavailable",
			"hint=run tools evidence search",
		];
	}

	const selected =
		Math.max(
			0,
			Math.floor(context.selectedToolsEvidenceSearchMatchIndex ?? 0),
		) % recovery.items.length;
	const item = recovery.items[selected];
	const actionVerb =
		action.id === "status.toolsEvidence.matchOpen"
			? "file-open"
			: "archive tools export";
	const rows = [
		`selected tools match ${recovery.target} ${selected + 1}/${recovery.items.length} ${item.fileName}`,
		`query=${recovery.query || "-"} scope=${item.scope} runs=${item.runCount}`,
	];

	if (
		action.id === "status.toolsEvidence.matchArchive" &&
		recovery.target === "archive"
	) {
		rows.push("blocked=archived Tools evidence matches are already archived");
	} else {
		rows.push(`confirm=${actionVerb} path=${item.path}`);
	}
	return rows;
}
