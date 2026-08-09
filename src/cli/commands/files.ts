import {
	createLocalFileProvider,
	type FileReadResult,
	formatDirEntries,
	formatFileLocations,
	getSystemFileLocations,
} from "../../core/files";

import {
	assertLocalJsonOptions,
	formatFileLocationsJson,
	isLocalJsonRequested,
	reportLocalInspectorJsonFailure,
} from "../localInspectorOutput";
import { isCliOutputWriteError, writeCliOutput } from "../output";

export function formatPwd(path: string): string {
	return path;
}

export function formatType(result: FileReadResult): string {
	return result.content;
}

export function formatFileError(caught: unknown): string {
	const message = caught instanceof Error ? caught.message : String(caught);
	return `picos file error: ${message}`;
}

export async function pwdCommand(): Promise<void> {
	const provider = createLocalFileProvider(process.cwd());
	console.log(formatPwd(await provider.pwd()));
}

export async function locationsCommand(
	options: { json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const locations = getSystemFileLocations();
		if (json) {
			await writeCliOutput(formatFileLocationsJson(locations, "locations"));
			return;
		}
		console.log(formatFileLocations(locations));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("locations", caught, {
				request: { action: "list" },
			});
		}
		throw caught;
	}
}

export async function drivesCommand(
	options: { json?: unknown } = {},
): Promise<void> {
	const jsonRequested = isLocalJsonRequested(options.json);
	try {
		const json = assertLocalJsonOptions(options);
		const locations = getSystemFileLocations();
		if (json) {
			await writeCliOutput(formatFileLocationsJson(locations, "drives"));
			return;
		}
		console.log(formatFileLocations(locations));
	} catch (caught) {
		if (isCliOutputWriteError(caught)) throw caught;
		if (jsonRequested) {
			reportLocalInspectorJsonFailure("drives", caught, {
				request: { action: "list" },
			});
		}
		throw caught;
	}
}

export async function dirCommand(path = "."): Promise<void> {
	const provider = createLocalFileProvider(process.cwd());
	try {
		console.log(formatDirEntries(await provider.list(path)));
	} catch (caught) {
		console.error(formatFileError(caught));
		process.exitCode = 1;
	}
}

export async function lsCommand(path = "."): Promise<void> {
	await dirCommand(path);
}

export async function typeCommand(path: string): Promise<void> {
	const provider = createLocalFileProvider(process.cwd());
	try {
		console.log(formatType(await provider.read(path)));
	} catch (caught) {
		console.error(formatFileError(caught));
		process.exitCode = 1;
	}
}

export async function catCommand(path: string): Promise<void> {
	await typeCommand(path);
}
