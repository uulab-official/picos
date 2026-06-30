import { mkdir, readdir, readFile, rename } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { FileOpenSource } from "./fileOpen";

export type HandoffIndexKind = "routes" | "connections" | "ports";

export type HandoffIndexItem = {
	source: FileOpenSource;
	kind: HandoffIndexKind;
	view: string;
	label: string;
	command: string;
	generatedAt: string;
	path: string;
};

export type HandoffIndex = {
	baseDir: string;
	items: HandoffIndexItem[];
};

export type HandoffArchiveResult = {
	status: "archived" | "blocked";
	sourcePath: string;
	archivedPath: string;
	message: string;
};

type HandoffDirectory = {
	dir: "routes" | "endpoints";
	source: FileOpenSource;
};

const handoffDirectories: HandoffDirectory[] = [
	{ dir: "routes", source: "route-handoff" },
	{ dir: "endpoints", source: "endpoint-handoff" },
];

export async function readHandoffIndex(
	baseDir: string,
	limit = 20,
): Promise<HandoffIndex> {
	const items = (
		await Promise.all(
			handoffDirectories.map((directory) =>
				readHandoffDirectory(baseDir, directory),
			),
		)
	)
		.flat()
		.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
		.slice(0, limit);

	return { baseDir, items };
}

export function formatHandoffIndexRows(
	index: HandoffIndex,
	selectedIndex = 0,
	visibleRows = 8,
): string[] {
	const selected = getSelectedHandoffIndexItem(index, selectedIndex);
	const selectedTargets = selected
		? [`open target=${selected.path}`, `archive target=${selected.path}`]
		: [];
	const budget = Math.max(0, visibleRows - 1 - selectedTargets.length);
	return [
		`HANDOFFS ${index.items.length} base=${index.baseDir}`,
		...index.items
			.slice(0, budget)
			.map((item, itemIndex) =>
				[
					itemIndex === selectedIndex ? ">" : " ",
					item.source === "route-handoff" ? "route" : "endpoint",
					item.kind,
					item.view,
					item.generatedAt,
					item.label,
				].join(" "),
			),
		...selectedTargets,
	].slice(0, visibleRows);
}

export function getSelectedHandoffIndexItem(
	index: HandoffIndex,
	selectedIndex: number,
): HandoffIndexItem | undefined {
	if (index.items.length === 0) {
		return undefined;
	}
	return index.items[
		Math.min(Math.max(selectedIndex, 0), index.items.length - 1)
	];
}

export async function archiveHandoffFile(
	baseDir: string,
	targetPath: string,
): Promise<HandoffArchiveResult> {
	const match = getHandoffArchiveMatch(baseDir, targetPath);
	if (!match) {
		return {
			status: "blocked",
			sourcePath: targetPath,
			archivedPath: "",
			message: "handoff archive is limited to picos-owned handoff files",
		};
	}

	const archiveDir = join(resolve(baseDir), "archive", match.dir);
	const archivedPath = join(archiveDir, basename(match.target));
	await mkdir(archiveDir, { recursive: true });
	await rename(match.target, archivedPath);
	return {
		status: "archived",
		sourcePath: match.target,
		archivedPath,
		message: `archived ${basename(match.target)}`,
	};
}

async function readHandoffDirectory(
	baseDir: string,
	directory: HandoffDirectory,
): Promise<HandoffIndexItem[]> {
	const dir = join(baseDir, directory.dir);
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch (caught) {
		if ((caught as NodeJS.ErrnoException).code === "ENOENT") {
			return [];
		}
		throw caught;
	}

	const items = await Promise.all(
		entries
			.filter((entry) => isPicosHandoffFilename(directory.dir, entry))
			.map(async (entry) =>
				parseHandoffFile(join(dir, entry), directory.source),
			),
	);
	return items.filter((item): item is HandoffIndexItem => Boolean(item));
}

function isPicosHandoffFilename(
	dir: HandoffDirectory["dir"],
	filename: string,
): boolean {
	if (!filename.endsWith(".md")) {
		return false;
	}
	if (dir === "routes") {
		return /^picos-routes-[a-z-]+-\d{4}-\d{2}-\d{2}T/.test(filename);
	}
	return /^picos-(connections|ports)-[a-z-]+-\d{4}-\d{2}-\d{2}T/.test(filename);
}

function getHandoffArchiveMatch(
	baseDir: string,
	targetPath: string,
): { dir: HandoffDirectory["dir"]; target: string } | undefined {
	const target = resolve(targetPath);
	for (const directory of handoffDirectories) {
		const handoffDir = resolve(baseDir, directory.dir);
		if (
			dirname(target) === handoffDir &&
			isPicosHandoffFilename(directory.dir, basename(target))
		) {
			return { dir: directory.dir, target };
		}
	}
	return undefined;
}

async function parseHandoffFile(
	path: string,
	source: FileOpenSource,
): Promise<HandoffIndexItem | undefined> {
	const content = await readFile(path, "utf8");
	const metadata = parseMetadata(content);
	const generatedAt = metadata.generatedAt ?? generatedAtFromFilename(path);
	if (!generatedAt) {
		return undefined;
	}
	const kind = parseKind(source, metadata.kind);
	return {
		source,
		kind,
		view: metadata.view ?? "unknown",
		label: metadata.label ?? basename(path),
		command: metadata.command ?? "-",
		generatedAt,
		path,
	};
}

function parseMetadata(content: string): Record<string, string> {
	const metadata: Record<string, string> = {};
	for (const line of content.split(/\r?\n/).slice(0, 12)) {
		const match = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
		if (match) {
			metadata[match[1]] = match[2] ?? "";
		}
	}
	return metadata;
}

function parseKind(
	source: FileOpenSource,
	value: string | undefined,
): HandoffIndexKind {
	if (source === "route-handoff") {
		return "routes";
	}
	return value === "ports" ? "ports" : "connections";
}

function generatedAtFromFilename(path: string): string | undefined {
	const match = /(\d{4}-\d{2}-\d{2}T\d{6}\d{3}Z)\.md$/.exec(basename(path));
	if (!match?.[1]) {
		return undefined;
	}
	const value = match[1];
	return `${value.slice(0, 13)}:${value.slice(13, 15)}:${value.slice(15, 17)}.${value.slice(17, 20)}Z`;
}
