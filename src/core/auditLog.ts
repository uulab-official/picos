import {
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export type AuditLogEventLevel = "run" | "ok" | "warn" | "fail" | "info";

export type AuditLogEvent = {
	id: string;
	level: AuditLogEventLevel;
	message: string;
	time: string;
};

export type ConsoleAuditExportPlan = {
	path: string;
	content: string;
	eventCount: number;
	query?: string;
	scope?: "all" | "filtered" | "selected";
};

export type ConsoleAuditExportRead = {
	path: string;
	events: AuditLogEvent[];
};

export type ConsoleAuditExportIndexItem = {
	fileName: string;
	path: string;
	generatedAt: string;
	scope: "all" | "filtered" | "selected";
	query?: string;
	entryCount: number;
};

export type ConsoleAuditExportIndex = {
	baseDir: string;
	items: ConsoleAuditExportIndexItem[];
};

export type ConsoleAuditExportArchivePlan = {
	sourcePath: string;
	archivedPath: string;
	fileName: string;
	risk: "write";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "archive audit export";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
};

export type ConsoleAuditExportArchiveResult = {
	status: "archived" | "blocked";
	sourcePath: string;
	archivedPath: string;
	message: string;
};

export type ConsoleAuditArchiveRetentionPlan = {
	baseDir: string;
	maxItems: number;
	retainedItems: ConsoleAuditExportIndexItem[];
	candidateItems: ConsoleAuditExportIndexItem[];
	risk: "destructive";
	privilege: "user";
	confirmationRequired: true;
	confirmationPhrase: "prune audit archive";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
};

export type ConsoleAuditArchivePruneResult = {
	status: "pruned" | "blocked";
	removed: number;
	removedPaths: string[];
	message: string;
};

export function formatConsoleAuditLog(
	events: AuditLogEvent[],
	options: {
		generatedAt?: string;
		query?: string;
		scope?: "all" | "filtered" | "selected";
	} = {},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	return [
		"# picos audit log",
		`generatedAt=${generatedAt}`,
		...(options.scope ? [`scope=${options.scope}`] : []),
		...(options.query ? [`query=${options.query}`] : []),
		`events=${events.length}`,
		"",
		...events.map(
			(event) =>
				`[${event.time}] ${event.level.toUpperCase().padEnd(4)} ${event.message}`,
		),
		"",
	].join("\n");
}

export function createConsoleAuditExportPlan(
	events: AuditLogEvent[],
	options: {
		baseDir: string;
		generatedAt?: Date;
		query?: string;
		scope?: "all" | "filtered" | "selected";
	},
): ConsoleAuditExportPlan {
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	const scope = options.scope ?? "all";
	const fileScope =
		scope === "filtered" || scope === "selected" ? `${scope}-` : "";
	return {
		path: join(
			options.baseDir,
			"audit",
			`picos-audit-${fileScope}${iso.replaceAll(/[:.]/g, "")}.log`,
		),
		content: formatConsoleAuditLog(events, {
			generatedAt: iso,
			query: options.query,
			scope: options.scope,
		}),
		eventCount: events.length,
		...(options.query ? { query: options.query } : {}),
		...(options.scope ? { scope: options.scope } : {}),
	};
}

export async function writeConsoleAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

export function parseConsoleAuditLog(content: string): AuditLogEvent[] {
	return content
		.split(/\r?\n/)
		.map((line) => line.match(/^\[([^\]]+)\]\s+([A-Z]+)\s+(.+)$/))
		.filter((match): match is RegExpMatchArray => Boolean(match))
		.map((match) => {
			const time = match[1] ?? "";
			const level = toAuditLogEventLevel(match[2]);
			const message = match[3] ?? "";
			return {
				id: createPersistedEventId(time, level, message),
				level,
				time,
				message,
			};
		});
}

export async function readLatestConsoleAuditExport(
	baseDir: string,
): Promise<ConsoleAuditExportRead | undefined> {
	const auditDir = join(baseDir, "audit");
	let files: string[];
	try {
		files = await readdir(auditDir);
	} catch {
		return undefined;
	}
	const latest = files.filter(isPicosAuditExportFilename).sort().at(-1);
	if (!latest) {
		return undefined;
	}

	const path = join(auditDir, latest);
	return {
		path,
		events: parseConsoleAuditLog(await readFile(path, "utf8")),
	};
}

export async function readConsoleAuditExportIndex(
	baseDir: string,
	limit = 20,
): Promise<ConsoleAuditExportIndex> {
	return readConsoleAuditExportIndexFromDirectory(
		baseDir,
		join(baseDir, "audit"),
		limit,
	);
}

export async function readConsoleAuditExportArchiveIndex(
	baseDir: string,
	limit = 20,
): Promise<ConsoleAuditExportIndex> {
	return readConsoleAuditExportIndexFromDirectory(
		baseDir,
		join(baseDir, "audit", "archive"),
		limit,
	);
}

async function readConsoleAuditExportIndexFromDirectory(
	baseDir: string,
	auditDir: string,
	limit: number,
): Promise<ConsoleAuditExportIndex> {
	let files: string[];
	try {
		files = await readdir(auditDir);
	} catch {
		return { baseDir, items: [] };
	}

	const items = (
		await Promise.all(
			files.filter(isPicosAuditExportFilename).map(async (fileName) => {
				const path = join(auditDir, fileName);
				return createConsoleAuditExportIndexItem(
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

export function getSelectedConsoleAuditExport(
	index: ConsoleAuditExportIndex,
	selectedIndex: number,
): ConsoleAuditExportIndexItem | undefined {
	if (index.items.length === 0) {
		return undefined;
	}
	return index.items[
		Math.min(Math.max(selectedIndex, 0), index.items.length - 1)
	];
}

export function formatConsoleAuditExportIndexRows(
	index: ConsoleAuditExportIndex,
	selectedIndex = 0,
	visibleRows = 5,
): string[] {
	return formatConsoleAuditExportRows(
		"AUDIT EXPORTS",
		index,
		selectedIndex,
		visibleRows,
	);
}

export function formatConsoleAuditExportArchiveIndexRows(
	index: ConsoleAuditExportIndex,
	selectedIndex = 0,
	visibleRows = 5,
): string[] {
	return formatConsoleAuditExportRows(
		"AUDIT ARCHIVE",
		index,
		selectedIndex,
		visibleRows,
	);
}

function formatConsoleAuditExportRows(
	title: string,
	index: ConsoleAuditExportIndex,
	selectedIndex: number,
	visibleRows: number,
): string[] {
	const selected = getSelectedConsoleAuditExport(index, selectedIndex);
	const pathRows = selected ? [`path=${selected.path}`] : [];
	const budget = Math.max(0, visibleRows - 1 - pathRows.length);
	return [
		`${title} ${index.items.length} base=${index.baseDir}`,
		...(index.items.length > 0
			? index.items
					.slice(0, budget)
					.map((item, itemIndex) =>
						[
							itemIndex === selectedIndex ? ">" : " ",
							item.scope,
							`events=${item.entryCount}`,
							item.generatedAt,
							item.query ? `query=${item.query}` : "",
						]
							.filter(Boolean)
							.join(" "),
					)
			: ["no audit exports yet"]),
		...pathRows,
	].slice(0, visibleRows);
}

export function createConsoleAuditExportArchivePlan(
	baseDir: string,
	path: string,
	options: { confirmation?: string } = {},
): ConsoleAuditExportArchivePlan {
	const auditDir = resolve(baseDir, "audit");
	const sourcePath = resolve(path);
	const fileName = basename(sourcePath);
	const allowed =
		dirname(sourcePath) === auditDir && isPicosAuditExportFilename(fileName);
	const archivedPath = allowed ? join(auditDir, "archive", fileName) : "";
	const confirmed = options.confirmation === "archive audit export";
	const reason = !allowed
		? "audit export archive is limited to picos-owned audit export files"
		: confirmed
			? `ready to archive audit export ${fileName}`
			: "type archive audit export to move selected audit export";

	return {
		sourcePath,
		archivedPath,
		fileName,
		risk: "write",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "archive audit export",
		confirmed,
		enabled: allowed && confirmed,
		reason,
	};
}

export function formatConsoleAuditExportArchiveRows(
	plan: ConsoleAuditExportArchivePlan | undefined,
): string[] {
	if (!plan) {
		return [];
	}
	return [
		`AUDIT EXPORT ARCHIVE ${plan.fileName}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		`from=${plan.sourcePath}`,
		`to=${plan.archivedPath || "-"}`,
		`reason=${plan.reason}`,
	];
}

export async function archiveConsoleAuditExport(
	plan: ConsoleAuditExportArchivePlan,
): Promise<ConsoleAuditExportArchiveResult> {
	if (!plan.enabled) {
		return {
			status: "blocked",
			sourcePath: plan.sourcePath,
			archivedPath: plan.archivedPath,
			message: `audit export archive is locked: ${plan.reason}`,
		};
	}

	await mkdir(dirname(plan.archivedPath), { recursive: true });
	await rename(plan.sourcePath, plan.archivedPath);
	return {
		status: "archived",
		sourcePath: plan.sourcePath,
		archivedPath: plan.archivedPath,
		message: `archived audit export ${plan.fileName}`,
	};
}

export function createConsoleAuditArchiveRetentionPlan(
	index: ConsoleAuditExportIndex,
	options: { maxItems?: number; confirmation?: string } = {},
): ConsoleAuditArchiveRetentionPlan {
	const maxItems = Math.max(1, Math.floor(options.maxItems ?? 10));
	const sorted = [...index.items].sort((left, right) =>
		right.generatedAt.localeCompare(left.generatedAt),
	);
	const retainedItems = sorted.slice(0, maxItems);
	const candidateItems = sorted.slice(maxItems);
	const confirmed = options.confirmation === "prune audit archive";
	const reason =
		candidateItems.length === 0
			? `audit archive retention has no files beyond ${maxItems}`
			: confirmed
				? `ready to prune ${candidateItems.length} archived audit exports`
				: `type prune audit archive to remove ${candidateItems.length} archived audit exports`;

	return {
		baseDir: index.baseDir,
		maxItems,
		retainedItems,
		candidateItems,
		risk: "destructive",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: "prune audit archive",
		confirmed,
		enabled: candidateItems.length > 0 && confirmed,
		reason,
	};
}

export function formatConsoleAuditArchiveRetentionRows(
	plan: ConsoleAuditArchiveRetentionPlan | undefined,
	visibleRows = 8,
): string[] {
	if (!plan) {
		return [];
	}
	return [
		`AUDIT ARCHIVE RETENTION max=${plan.maxItems} candidates=${plan.candidateItems.length}`,
		`risk=${plan.risk} privilege=${plan.privilege} confirmed=${plan.confirmed}`,
		`confirm ${plan.confirmationPhrase} ${plan.enabled ? "ready" : "locked"}`,
		...plan.retainedItems.slice(0, 2).map((item) => `keep ${item.fileName}`),
		...plan.candidateItems
			.slice(0, Math.max(0, visibleRows - 5))
			.map((item) => `remove ${item.fileName}`),
		`reason=${plan.reason}`,
	].slice(0, visibleRows);
}

export async function pruneConsoleAuditArchive(
	plan: ConsoleAuditArchiveRetentionPlan,
): Promise<ConsoleAuditArchivePruneResult> {
	if (!plan.enabled) {
		return {
			status: "blocked",
			removed: 0,
			removedPaths: [],
			message: `audit archive retention is locked: ${plan.reason}`,
		};
	}

	const unsafe = plan.candidateItems.find(
		(item) =>
			!isAllowedArchivedAuditExportPath(plan.baseDir, item.path, item.fileName),
	);
	if (unsafe) {
		return {
			status: "blocked",
			removed: 0,
			removedPaths: [],
			message: `audit archive retention refused unsafe path ${unsafe.path}`,
		};
	}

	const removedPaths: string[] = [];
	for (const item of plan.candidateItems) {
		await unlink(item.path);
		removedPaths.push(item.path);
	}
	return {
		status: "pruned",
		removed: removedPaths.length,
		removedPaths,
		message: `pruned ${removedPaths.length} archived audit exports`,
	};
}

function isAllowedArchivedAuditExportPath(
	baseDir: string,
	path: string,
	fileName: string,
): boolean {
	const archiveDir = resolve(baseDir, "audit", "archive");
	const target = resolve(path);
	return (
		dirname(target) === archiveDir &&
		basename(target) === fileName &&
		isPicosAuditExportFilename(fileName)
	);
}

function isPicosAuditExportFilename(fileName: string): boolean {
	return /^picos-audit-.+\.log$/.test(fileName);
}

function createPersistedEventId(
	time: string,
	level: AuditLogEventLevel,
	message: string,
): string {
	return `persisted-${time}-${level}-${message
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "")}`;
}

function toAuditLogEventLevel(level: string | undefined): AuditLogEventLevel {
	const normalized = level?.toLowerCase();
	if (
		normalized === "run" ||
		normalized === "ok" ||
		normalized === "warn" ||
		normalized === "fail" ||
		normalized === "info"
	) {
		return normalized;
	}
	return "info";
}

function createConsoleAuditExportIndexItem(
	fileName: string,
	path: string,
	content: string,
): ConsoleAuditExportIndexItem {
	const metadata = parseAuditMetadata(content);
	return {
		fileName,
		path,
		generatedAt:
			metadata.generatedAt ?? generatedAtFromAuditFilename(fileName) ?? "-",
		scope: normalizeAuditExportScope(metadata.scope),
		...(metadata.query ? { query: metadata.query } : {}),
		entryCount: Number.parseInt(metadata.events ?? "0", 10) || 0,
	};
}

function parseAuditMetadata(content: string): Record<string, string> {
	const metadata: Record<string, string> = {};
	for (const line of content.split(/\r?\n/).slice(0, 12)) {
		const match = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
		if (match) {
			metadata[match[1]] = match[2] ?? "";
		}
	}
	return metadata;
}

function normalizeAuditExportScope(
	value: string | undefined,
): ConsoleAuditExportIndexItem["scope"] {
	if (value === "filtered" || value === "selected") {
		return value;
	}
	return "all";
}

function generatedAtFromAuditFilename(fileName: string): string | undefined {
	const match = /(\d{4}-\d{2}-\d{2}T\d{6}\d{3}Z)\.log$/.exec(fileName);
	if (!match?.[1]) {
		return undefined;
	}
	const value = match[1];
	return `${value.slice(0, 13)}:${value.slice(13, 15)}:${value.slice(15, 17)}.${value.slice(17, 20)}Z`;
}
