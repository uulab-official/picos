import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AuditLogEvent } from "../core/auditLog";
import {
	buildFileOpenPlan,
	type FileOpenOrigin,
	type FileOpenPlan,
} from "../core/fileOpen";
import type { SupportedPlatform } from "../core/types";
import {
	basenamePathLike,
	dirnamePathLike,
	joinPathLike,
	resolvePathLike,
	samePathLike,
} from "../utils/pathStyle";
import type { LogProfile } from "./logPanel";
import { clampIndex, type Screen } from "./navigation";
import { classifyRequestPublication } from "./requestSequence";
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

export type CleanupHandoffDismissPlan = {
	label: string;
	screen: Screen;
	workspace: string;
};

export type CleanupHandoffReopenPlan = {
	id: CleanupShelfId;
	label: string;
	workspace: string;
	screen: Screen;
	shortcut: string;
	confirmationPhrase: string;
	count: number;
	detail: string;
};

export type CleanupHandoffHistoryOutcome = "prompt-opened" | "dismissed";

export type CleanupHandoffHistory = {
	id: CleanupShelfId;
	label: string;
	workspace: string;
	screen: Screen;
	shortcut: string;
	confirmationPhrase: string;
	count: number;
	detail: string;
	outcome: CleanupHandoffHistoryOutcome;
};

export type CleanupHandoffHistoryExportScope = "selected" | "all";

export type CleanupHandoffHistoryExportPlan = {
	path: string;
	content: string;
	itemCount: number;
	origin?: FileOpenOrigin;
	scope: CleanupHandoffHistoryExportScope;
};

export type CleanupHandoffHistoryExportRead = {
	path: string;
	events: AuditLogEvent[];
};

export type CleanupHandoffHistoryExportIndexItem = {
	fileName: string;
	path: string;
	scope: CleanupHandoffHistoryExportScope;
	entryCount: number;
	generatedAt: string;
	origin?: FileOpenOrigin;
};

export type CleanupHandoffHistoryExportIndex = {
	baseDir: string;
	items: CleanupHandoffHistoryExportIndexItem[];
};

export type CleanupHandoffHistoryExportArchivePlan = {
	sourcePath: string;
	archivedPath: string;
	fileName: string;
	risk: "write";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "archive cleanup export";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
};

export type CleanupHandoffHistoryExportArchiveResult = {
	status: "archived" | "blocked";
	sourcePath: string;
	archivedPath: string;
	message: string;
};

export type CleanupExportNotice = {
	level: "ok" | "info" | "warn" | "fail";
	message: string;
};

export type CleanupExportIndexRefreshTransition =
	| { status: "stale"; notice?: CleanupExportNotice }
	| { status: "failure"; notice: CleanupExportNotice }
	| {
			status: "success";
			index: CleanupHandoffHistoryExportIndex;
			selectedIndex: number;
			notice?: CleanupExportNotice;
	  };

export type SelectedCleanupExportOpenTransition =
	| { kind: "notice"; notice: CleanupExportNotice }
	| {
			kind: "open";
			selectedIndex: number;
			item: CleanupHandoffHistoryExportIndexItem;
			plan: FileOpenPlan;
			notice: CleanupExportNotice;
	  };

export type SelectedCleanupExportArchiveTransition =
	| { kind: "notice"; notice: CleanupExportNotice }
	| {
			kind: "confirmation";
			selectedIndex: number;
			item: CleanupHandoffHistoryExportIndexItem;
			plan: CleanupHandoffHistoryExportArchivePlan;
			notice: CleanupExportNotice;
	  };

export type CleanupExportArchiveConfirmationTransition =
	| { kind: "notice"; notice: CleanupExportNotice }
	| { kind: "execute"; plan: CleanupHandoffHistoryExportArchivePlan };

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

export function formatCleanupOpsConsoleRows(
	index: CleanupShelfIndex,
	selectedShelfIndex: number,
	histories: CleanupHandoffHistory[],
	selectedHistoryIndex: number,
): string[] {
	const activeShelves = getActiveCleanupShelves(index);
	const selectedShelf = getSelectedCleanupShelf(index, selectedShelfIndex);
	const selectedHistory = getSelectedCleanupHandoffHistory(
		histories,
		selectedHistoryIndex,
	);
	const rows = [
		`CLEANUP OPS active=${index.activeShelves} items=${index.totalItems} history=${histories.length} selected=${
			selectedShelf?.workspace ?? "none"
		}`,
		...(activeShelves.length > 0
			? orderCleanupShelvesForOpsConsole(activeShelves, selectedShelf).map(
					(shelf) => {
						const marker = selectedShelf?.id === shelf.id ? "> " : "  ";
						return `${marker}shelf ${shelf.workspace} ${shelf.shortcut} count=${shelf.count} confirm=${shelf.confirmationPhrase} detail=${shelf.detail}`;
					},
				)
			: ["no saved preset shelves to clean"]),
		selectedHistory
			? `history=${selectedHistory.outcome} ${selectedHistory.workspace} ${selectedHistory.shortcut} confirm=${selectedHistory.confirmationPhrase} detail=${selectedHistory.detail}`
			: "history=none",
		...(selectedHistory
			? [
					`reopen=R jump ${selectedHistory.workspace} exact-confirm stays locked`,
				]
			: []),
		"controls=j/k shelf enter jump [ history R reopen E export",
	];
	return rows;
}

function orderCleanupShelvesForOpsConsole(
	shelves: CleanupShelf[],
	selectedShelf: CleanupShelf | undefined,
): CleanupShelf[] {
	if (!selectedShelf) {
		return shelves;
	}
	return [
		selectedShelf,
		...shelves.filter((shelf) => shelf.id !== selectedShelf.id),
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

export function createCleanupHandoffDismissPlan(
	audit: CleanupJumpAudit | undefined,
	currentScreen: Screen,
): CleanupHandoffDismissPlan | undefined {
	if (!audit || audit.screen !== currentScreen) {
		return undefined;
	}

	return {
		label: audit.label,
		screen: audit.screen,
		workspace: audit.workspace,
	};
}

export function formatCleanupHandoffDismissRows(
	plan: CleanupHandoffDismissPlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}

	return [
		"CLEANUP DISMISS esc clears handoff",
		`normal ${plan.workspace} enter behavior resumes`,
	];
}

export function createCleanupHandoffHistory(
	audit: CleanupJumpAudit,
	outcome: CleanupHandoffHistoryOutcome,
): CleanupHandoffHistory {
	return {
		id: audit.id,
		label: audit.label,
		workspace: audit.workspace,
		screen: audit.screen,
		shortcut: audit.shortcut,
		confirmationPhrase: audit.confirmationPhrase,
		count: audit.count,
		detail: audit.detail,
		outcome,
	};
}

export function createCleanupHandoffReopenPlan(
	history: CleanupHandoffHistory | undefined,
): CleanupHandoffReopenPlan | undefined {
	if (!history) {
		return undefined;
	}

	return {
		id: history.id,
		label: history.label,
		workspace: history.workspace,
		screen: history.screen,
		shortcut: history.shortcut,
		confirmationPhrase: history.confirmationPhrase,
		count: history.count,
		detail: history.detail,
	};
}

export function createCleanupJumpAuditFromHistory(
	history: CleanupHandoffHistory,
): CleanupJumpAudit {
	return {
		id: history.id,
		label: history.label,
		workspace: history.workspace,
		screen: history.screen,
		shortcut: history.shortcut,
		confirmationPhrase: history.confirmationPhrase,
		count: history.count,
		detail: history.detail,
	};
}

export function formatCleanupHandoffReopenRows(
	plan: CleanupHandoffReopenPlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}

	return [
		`CLEANUP REOPEN ${plan.label}`,
		`R jumps to ${plan.workspace} and restores handoff`,
		`shortcut=${plan.shortcut} confirm=${plan.confirmationPhrase} detail=${plan.detail} count=${plan.count}`,
	];
}

export function formatCleanupHandoffHistoryExport(
	histories: CleanupHandoffHistory[],
	options: {
		generatedAt?: string;
		origin?: FileOpenOrigin;
		scope: CleanupHandoffHistoryExportScope;
		selectedIndex?: number;
	},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	const items = getCleanupHandoffHistoryExportItems(
		histories,
		options.selectedIndex ?? 0,
		options.scope,
	);
	return [
		"# picos cleanup handoff history",
		`generatedAt=${generatedAt}`,
		`scope=${options.scope}`,
		...formatCleanupExportOriginMetadata(options.origin),
		`entries=${items.length}`,
		"",
		...items.flatMap(formatCleanupHandoffHistoryExportItem),
	].join("\n");
}

export function createCleanupHandoffHistoryExportPlan(
	histories: CleanupHandoffHistory[],
	selectedIndex: number,
	options: {
		baseDir: string;
		generatedAt?: Date;
		origin?: FileOpenOrigin;
		scope: CleanupHandoffHistoryExportScope;
	},
): CleanupHandoffHistoryExportPlan | undefined {
	const items = getCleanupHandoffHistoryExportItems(
		histories,
		selectedIndex,
		options.scope,
	);
	if (items.length === 0) {
		return undefined;
	}

	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: joinPathLike(
			options.baseDir,
			"cleanup",
			`picos-cleanup-${options.scope}-${iso.replaceAll(/[:.]/g, "")}.md`,
		),
		content: formatCleanupHandoffHistoryExport(items, {
			generatedAt: iso,
			origin: options.origin,
			scope: options.scope,
			selectedIndex: options.scope === "selected" ? 0 : selectedIndex,
		}),
		itemCount: items.length,
		...(options.origin ? { origin: options.origin } : {}),
		scope: options.scope,
	};
}

export async function writeCleanupHandoffHistoryExport(
	plan: CleanupHandoffHistoryExportPlan,
): Promise<CleanupHandoffHistoryExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

export function parseCleanupHandoffHistoryExport(
	content: string,
): AuditLogEvent[] {
	const lines = content.split(/\r?\n/);
	const generatedAt =
		lines
			.find((line) => line.startsWith("generatedAt="))
			?.replace("generatedAt=", "") ?? "";
	const time = formatCleanupExportEventTime(generatedAt);
	const events: AuditLogEvent[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const labelLine = lines[index];
		if (!labelLine?.startsWith("## ")) {
			continue;
		}

		const label = labelLine.replace(/^##\s+/, "");
		const outcome = lines[index + 1]?.match(/^outcome=(.+)$/)?.[1];
		const target = lines[index + 2]?.match(
			/^workspace=(.+) screen=([^ ]+) shortcut=(.+)$/,
		);
		const confirmation = lines[index + 3]?.match(
			/^confirm=(.+) count=(\d+) detail=(.*)$/,
		);

		if (!outcome || !target || !confirmation) {
			continue;
		}

		const workspace = target[1] ?? "";
		const screen = target[2] ?? "";
		const shortcut = target[3] ?? "";
		const confirmationPhrase = confirmation[1] ?? "";
		const count = confirmation[2] ?? "0";
		const detail = confirmation[3] ?? "";
		const message = `cleanup history ${outcome} ${label} workspace=${workspace} screen=${screen} shortcut=${shortcut} confirm=${confirmationPhrase} count=${count} detail=${detail}`;
		events.push({
			id: createPersistedCleanupEventId(time, label, outcome),
			level: "info",
			time,
			message,
		});
	}

	return events;
}

export async function readLatestCleanupHandoffHistoryExport(
	baseDir: string,
): Promise<CleanupHandoffHistoryExportRead | undefined> {
	const cleanupDir = join(baseDir, "cleanup");
	let files: string[];
	try {
		files = await readdir(cleanupDir);
	} catch {
		return undefined;
	}

	const latest = files
		.filter(isPicosCleanupHandoffHistoryExportFilename)
		.sort()
		.at(-1);
	if (!latest) {
		return undefined;
	}

	const path = join(cleanupDir, latest);
	return {
		path,
		events: parseCleanupHandoffHistoryExport(await readFile(path, "utf8")),
	};
}

export async function readCleanupHandoffHistoryExportIndex(
	baseDir: string,
	limit = 20,
): Promise<CleanupHandoffHistoryExportIndex> {
	const cleanupDir = join(baseDir, "cleanup");
	let files: string[];
	try {
		files = await readdir(cleanupDir);
	} catch {
		return { baseDir, items: [] };
	}

	const items = (
		await Promise.all(
			files
				.filter(isPicosCleanupHandoffHistoryExportFilename)
				.map(async (fileName) => {
					const path = join(cleanupDir, fileName);
					return createCleanupHandoffHistoryExportIndexItem(
						fileName,
						path,
						await readFile(path, "utf8"),
					);
				}),
		)
	)
		.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
		.slice(0, limit);

	return { baseDir, items };
}

export async function readCleanupHandoffHistoryExportArchiveIndex(
	baseDir: string,
	limit = 20,
): Promise<CleanupHandoffHistoryExportIndex> {
	const archiveDir = join(baseDir, "cleanup", "archive");
	let files: string[];
	try {
		files = await readdir(archiveDir);
	} catch {
		return { baseDir, items: [] };
	}

	const items = (
		await Promise.all(
			files
				.filter(isPicosCleanupHandoffHistoryExportFilename)
				.map(async (fileName) => {
					const path = join(archiveDir, fileName);
					return createCleanupHandoffHistoryExportIndexItem(
						fileName,
						path,
						await readFile(path, "utf8"),
					);
				}),
		)
	)
		.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
		.slice(0, limit);

	return { baseDir, items };
}

export function classifyCleanupExportIndexRefresh(input: {
	target: "active" | "archive";
	currentRequestToken: number;
	requestToken: number;
	selectedIndex: number;
	announce?: boolean;
	outcome:
		| { status: "success"; index: CleanupHandoffHistoryExportIndex }
		| { status: "failure"; error: unknown };
}): CleanupExportIndexRefreshTransition {
	const prefix =
		input.target === "active" ? "cleanup export" : "cleanup archive";
	if (input.outcome.status === "failure") {
		const notice = {
			level: "fail",
			message: `${prefix} index failed ${formatCleanupExportError(input.outcome.error)}`,
		} as const;
		return classifyRequestPublication(
			input.currentRequestToken,
			input.requestToken,
		) === "stale"
			? { status: "stale", notice }
			: { status: "failure", notice };
	}
	if (
		classifyRequestPublication(
			input.currentRequestToken,
			input.requestToken,
		) === "stale"
	) {
		return { status: "stale" };
	}

	return {
		status: "success",
		index: input.outcome.index,
		selectedIndex: clampIndex(
			input.selectedIndex,
			input.outcome.index.items.length,
		),
		...(input.announce
			? {
					notice: {
						level: "info" as const,
						message:
							input.target === "active"
								? `cleanup exports indexed ${input.outcome.index.items.length}`
								: `cleanup archive indexed ${input.outcome.index.items.length}`,
					},
				}
			: {}),
	};
}

export function prepareSelectedCleanupExportOpen(input: {
	index: CleanupHandoffHistoryExportIndex;
	selectedIndex: number;
	platform: SupportedPlatform;
	origin?: FileOpenOrigin;
}): SelectedCleanupExportOpenTransition {
	const selectedIndex = clampIndex(
		input.selectedIndex,
		input.index.items.length,
	);
	const item = input.index.items[selectedIndex];
	if (!item) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no cleanup export selected" },
		};
	}

	return {
		kind: "open",
		selectedIndex,
		item,
		plan: buildFileOpenPlan({
			baseDir: input.index.baseDir,
			label: `cleanup export ${item.scope} ${item.generatedAt}`,
			origin: item.origin ?? input.origin,
			path: item.path,
			platform: input.platform,
			source: "cleanup-export",
		}),
		notice: {
			level: "info",
			message: `cleanup export open confirmation opened for ${item.fileName}`,
		},
	};
}

export function prepareSelectedCleanupExportArchive(
	index: CleanupHandoffHistoryExportIndex,
	selectedIndex: number,
): SelectedCleanupExportArchiveTransition {
	const normalizedIndex = clampIndex(selectedIndex, index.items.length);
	const item = index.items[normalizedIndex];
	if (!item) {
		return {
			kind: "notice",
			notice: { level: "warn", message: "no cleanup export selected" },
		};
	}

	return {
		kind: "confirmation",
		selectedIndex: normalizedIndex,
		item,
		plan: createCleanupHandoffHistoryExportArchivePlan(
			index.baseDir,
			item.path,
		),
		notice: {
			level: "info",
			message: `cleanup export archive confirmation opened for ${item.fileName}`,
		},
	};
}

export function prepareCleanupExportArchiveConfirmation(
	preview: CleanupHandoffHistoryExportArchivePlan | undefined,
	baseDir: string,
	confirmation: string,
): CleanupExportArchiveConfirmationTransition {
	if (!preview) {
		return {
			kind: "notice",
			notice: {
				level: "warn",
				message: "cleanup export archive missing preview",
			},
		};
	}
	return {
		kind: "execute",
		plan: createCleanupHandoffHistoryExportArchivePlan(
			baseDir,
			preview.sourcePath,
			{ confirmation },
		),
	};
}

export function createCleanupHandoffHistoryExportArchivePlan(
	baseDir: string,
	path: string,
	options: { confirmation?: string } = {},
): CleanupHandoffHistoryExportArchivePlan {
	const target = resolvePathLike(path);
	const cleanupDir = resolvePathLike(baseDir, "cleanup");
	const targetDir = dirnamePathLike(target);
	const fileName = basenamePathLike(target);
	const allowed =
		samePathLike(targetDir, cleanupDir) &&
		isPicosCleanupHandoffHistoryExportFilename(fileName);
	const confirmed = options.confirmation === "archive cleanup export";
	const enabled = allowed && confirmed;
	const archivedPath = allowed
		? joinPathLike(targetDir, "archive", fileName)
		: "";
	const reason = !allowed
		? "cleanup export archive is limited to picos-owned export files"
		: enabled
			? "confirmed"
			: "type archive cleanup export to move selected cleanup export";

	return {
		sourcePath: target,
		archivedPath,
		fileName,
		risk: "write",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "archive cleanup export",
		confirmed,
		enabled,
		reason,
	};
}

export function formatCleanupHandoffHistoryExportArchiveRows(
	plan: CleanupHandoffHistoryExportArchivePlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}

	return [
		`CLEANUP EXPORT ARCHIVE ${plan.fileName}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		`from=${plan.sourcePath}`,
		`to=${plan.archivedPath}`,
		`reason=${plan.reason}`,
	];
}

export async function archiveCleanupHandoffHistoryExport(
	plan: CleanupHandoffHistoryExportArchivePlan,
): Promise<CleanupHandoffHistoryExportArchiveResult> {
	if (!plan.enabled) {
		return {
			status: "blocked",
			sourcePath: plan.sourcePath,
			archivedPath: plan.archivedPath,
			message: `cleanup export archive is locked: ${plan.reason}`,
		};
	}

	await mkdir(dirname(plan.archivedPath), { recursive: true });
	await rename(plan.sourcePath, plan.archivedPath);
	return {
		status: "archived",
		sourcePath: plan.sourcePath,
		archivedPath: plan.archivedPath,
		message: `archived ${plan.fileName}`,
	};
}

export function getSelectedCleanupHandoffHistoryExport(
	index: CleanupHandoffHistoryExportIndex,
	selectedIndex: number,
): CleanupHandoffHistoryExportIndexItem | undefined {
	if (index.items.length === 0) {
		return undefined;
	}

	return index.items[clampIndex(selectedIndex, index.items.length)];
}

export function formatCleanupHandoffHistoryExportIndexRows(
	index: CleanupHandoffHistoryExportIndex,
	selectedIndex = 0,
	visibleRows = 5,
): string[] {
	const selected = getSelectedCleanupHandoffHistoryExport(index, selectedIndex);
	const pathRows = selected ? [`path=${selected.path}`] : [];
	const budget = Math.max(0, visibleRows - 1 - pathRows.length);
	return [
		`CLEANUP EXPORTS ${index.items.length} base=${index.baseDir}`,
		...(index.items.length > 0
			? index.items
					.slice(0, budget)
					.map((item, itemIndex) =>
						[
							itemIndex === selectedIndex ? ">" : " ",
							item.scope.padEnd(8),
							`entries=${item.entryCount}`,
							item.generatedAt,
							formatCleanupExportOriginHint(item.origin),
						]
							.filter(Boolean)
							.join(" "),
					)
			: ["no cleanup exports yet"]),
		...pathRows,
	].slice(0, visibleRows);
}

export function getSelectedCleanupHandoffHistoryExportArchive(
	index: CleanupHandoffHistoryExportIndex,
	selectedIndex: number,
): CleanupHandoffHistoryExportIndexItem | undefined {
	return getSelectedCleanupHandoffHistoryExport(index, selectedIndex);
}

export function formatCleanupHandoffHistoryExportArchiveIndexRows(
	index: CleanupHandoffHistoryExportIndex,
	selectedIndex = 0,
	visibleRows = 5,
): string[] {
	const selected = getSelectedCleanupHandoffHistoryExportArchive(
		index,
		selectedIndex,
	);
	const pathRows = selected ? [`path=${selected.path}`] : [];
	const budget = Math.max(0, visibleRows - 1 - pathRows.length);
	return [
		`CLEANUP ARCHIVE ${index.items.length} base=${index.baseDir}`,
		...(index.items.length > 0
			? index.items
					.slice(0, budget)
					.map((item, itemIndex) =>
						[
							itemIndex === selectedIndex ? ">" : " ",
							item.scope.padEnd(8),
							`entries=${item.entryCount}`,
							item.generatedAt,
							formatCleanupExportOriginHint(item.origin),
						]
							.filter(Boolean)
							.join(" "),
					)
			: ["no archived cleanup exports yet"]),
		...pathRows,
	].slice(0, visibleRows);
}

export function formatCleanupHandoffHistoryRows(
	history: CleanupHandoffHistory | undefined,
): string[] {
	if (!history) {
		return [];
	}

	const outcomeText =
		history.outcome === "prompt-opened"
			? "exact-confirm prompt opened"
			: "normal controls restored";
	return [
		`CLEANUP HISTORY ${history.outcome} ${history.label}`,
		`target=${history.workspace} shortcut=${history.shortcut} confirm=${history.confirmationPhrase}`,
		`detail=${history.detail} ${outcomeText}`,
	];
}

export function appendCleanupHandoffHistory(
	histories: CleanupHandoffHistory[],
	history: CleanupHandoffHistory,
	limit = 5,
): CleanupHandoffHistory[] {
	return [history, ...histories].slice(0, Math.max(1, limit));
}

export function getSelectedCleanupHandoffHistory(
	histories: CleanupHandoffHistory[],
	selectedIndex: number,
): CleanupHandoffHistory | undefined {
	if (histories.length === 0) {
		return undefined;
	}

	const normalized = clampIndex(selectedIndex, histories.length);
	return histories[normalized];
}

export function moveCleanupHandoffHistorySelection(
	histories: CleanupHandoffHistory[],
	selectedIndex: number,
	direction: "next" | "previous",
): number {
	if (histories.length === 0) {
		return 0;
	}

	const normalized = clampIndex(selectedIndex, histories.length);
	const offset = direction === "next" ? 1 : -1;
	return (normalized + offset + histories.length) % histories.length;
}

export function formatCleanupHandoffHistoryIndexRows(
	histories: CleanupHandoffHistory[],
	selectedIndex: number,
	visibleRows: number,
): string[] {
	const selected = getSelectedCleanupHandoffHistory(histories, selectedIndex);
	const rows = [
		`CLEANUP HISTORY entries=${histories.length}${
			selected ? ` selected=${selected.workspace}` : ""
		}`,
		...(histories.length > 0
			? histories.map((history, index) => {
					const marker = selectedIndex === index ? "> " : "  ";
					return `${marker}${history.outcome.padEnd(13)} ${history.workspace.padEnd(11)} ${history.shortcut.padEnd(2)} ${history.confirmationPhrase}  ${history.detail}`;
				})
			: ["no cleanup handoff history yet"]),
	];
	return rows.slice(0, Math.max(1, visibleRows));
}

function getCleanupHandoffHistoryExportItems(
	histories: CleanupHandoffHistory[],
	selectedIndex: number,
	scope: CleanupHandoffHistoryExportScope,
): CleanupHandoffHistory[] {
	if (scope === "all") {
		return histories;
	}

	const selected = getSelectedCleanupHandoffHistory(histories, selectedIndex);
	return selected ? [selected] : [];
}

function formatCleanupHandoffHistoryExportItem(
	history: CleanupHandoffHistory,
): string[] {
	return [
		`## ${history.label}`,
		`outcome=${history.outcome}`,
		`workspace=${history.workspace} screen=${history.screen} shortcut=${history.shortcut}`,
		`confirm=${history.confirmationPhrase} count=${history.count} detail=${history.detail}`,
		"",
	];
}

function createCleanupHandoffHistoryExportIndexItem(
	fileName: string,
	path: string,
	content: string,
): CleanupHandoffHistoryExportIndexItem {
	const lines = content.split(/\r?\n/);
	const metadata = parseCleanupExportMetadata(content);
	const origin = parseCleanupExportOriginMetadata(metadata);
	return {
		fileName,
		path,
		scope: toCleanupHandoffHistoryExportScope(
			lines.find((line) => line.startsWith("scope="))?.replace("scope=", ""),
		),
		entryCount: Number(
			lines
				.find((line) => line.startsWith("entries="))
				?.replace("entries=", "") ?? 0,
		),
		generatedAt:
			lines
				.find((line) => line.startsWith("generatedAt="))
				?.replace("generatedAt=", "") ?? "",
		...(origin ? { origin } : {}),
	};
}

function formatCleanupExportOriginMetadata(
	origin: FileOpenOrigin | undefined,
): string[] {
	if (!origin) {
		return [];
	}
	return [
		`originKind=${sanitizeCleanupExportMetadata(origin.kind)}`,
		`originTarget=${sanitizeCleanupExportMetadata(origin.target)}`,
		`originLabel=${sanitizeCleanupExportMetadata(origin.label)}`,
		`originScope=${sanitizeCleanupExportMetadata(origin.scope)}`,
	];
}

function parseCleanupExportMetadata(content: string): Record<string, string> {
	const metadata: Record<string, string> = {};
	for (const line of content.split(/\r?\n/).slice(0, 12)) {
		const match = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
		if (match) {
			metadata[match[1]] = match[2] ?? "";
		}
	}
	return metadata;
}

function parseCleanupExportOriginMetadata(
	metadata: Record<string, string>,
): FileOpenOrigin | undefined {
	if (metadata.originKind !== "config-shelf") {
		return undefined;
	}
	const { originTarget, originLabel, originScope } = metadata;
	if (!originTarget || !originLabel || !originScope) {
		return undefined;
	}
	return {
		kind: "config-shelf",
		target: originTarget,
		label: originLabel,
		scope: originScope,
	};
}

function formatCleanupExportOriginHint(
	origin: FileOpenOrigin | undefined,
): string {
	return origin ? `origin=Config>${origin.label} scope=${origin.scope}` : "";
}

function sanitizeCleanupExportMetadata(value: string): string {
	return value.replaceAll(/\r?\n/g, " ").trim();
}

function isPicosCleanupHandoffHistoryExportFilename(fileName: string): boolean {
	return /^picos-cleanup-(all|selected)-\d{4}-\d{2}-\d{2}T\d{9}Z\.md$/.test(
		fileName,
	);
}

function toCleanupHandoffHistoryExportScope(
	scope: string | undefined,
): CleanupHandoffHistoryExportScope {
	return scope === "selected" ? "selected" : "all";
}

function formatCleanupExportEventTime(generatedAt: string): string {
	const match = generatedAt.match(/T(\d{2}:\d{2}:\d{2})/);
	return match?.[1] ?? "00:00:00";
}

function formatCleanupExportError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createPersistedCleanupEventId(
	time: string,
	label: string,
	outcome: string,
): string {
	const slug = `${label}-${outcome}`
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "");
	return `persisted-cleanup-${time}-info-${slug}`;
}

export function getSelectedCleanupShelf(
	index: CleanupShelfIndex,
	selectedIndex: number,
): CleanupShelf | undefined {
	const activeShelves = getActiveCleanupShelves(index);
	if (activeShelves.length === 0) {
		return undefined;
	}

	const normalized = clampIndex(selectedIndex, activeShelves.length);
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

	const normalized = clampIndex(selectedIndex, activeShelves.length);
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
