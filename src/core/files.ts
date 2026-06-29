import { lstat, readdir, readFile, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, isAbsolute, resolve } from "node:path";

export type FileProviderKind = "local" | "sftp";

export type FileEntryType = "file" | "directory" | "symlink" | "unknown";

export type FileEntry = {
	name: string;
	path: string;
	type: FileEntryType;
	size?: number;
	modifiedAt?: Date;
	readonly: boolean;
};

export type FileLocationKind = "root" | "drive" | "home" | "workspace" | "temp";

export type FileLocation = {
	label: string;
	path: string;
	kind: FileLocationKind;
};

export type FileReadResult = {
	path: string;
	content: string;
	encoding: "utf8";
	truncated: boolean;
};

export type FileProvider = {
	kind: FileProviderKind;
	pwd(): Promise<string>;
	list(path: string): Promise<FileEntry[]>;
	read(path: string, options?: { maxBytes?: number }): Promise<FileReadResult>;
	write(path: string, content: string): Promise<void>;
	stat(path: string): Promise<FileEntry>;
};

export type LocalFileProviderOptions = {
	homeDir?: string;
};

const DEFAULT_MAX_READ_BYTES = 256 * 1024;

export function createLocalFileProvider(
	root = process.cwd(),
	options: LocalFileProviderOptions = {},
): FileProvider {
	const resolvedRoot = resolve(root);
	const resolvedHome = resolve(options.homeDir ?? homedir());

	function resolvePath(path: string): string {
		const input = path.trim() || ".";
		if (input === "~") {
			return resolvedHome;
		}
		if (input.startsWith("~/") || input.startsWith("~\\")) {
			return resolve(resolvedHome, input.slice(2));
		}
		if (isAbsolute(input)) {
			return resolve(input);
		}
		return resolve(resolvedRoot, input);
	}

	return {
		kind: "local",
		async pwd() {
			return resolvedRoot;
		},
		async list(path: string) {
			const directory = resolvePath(path);
			const entries = await readdir(directory, { withFileTypes: true });
			const summaries: (FileEntry | undefined)[] = await Promise.all(
				entries.map(async (entry): Promise<FileEntry | undefined> => {
					const fullPath = resolve(directory, entry.name);
					const info = await lstat(fullPath).catch(() => undefined);
					if (!info) {
						return undefined;
					}
					return {
						name: entry.name,
						path: fullPath,
						type: entry.isDirectory()
							? "directory"
							: entry.isFile()
								? "file"
								: entry.isSymbolicLink()
									? "symlink"
									: "unknown",
						size: info.size,
						modifiedAt: info.mtime,
						readonly: false,
					} satisfies FileEntry;
				}),
			);

			return summaries
				.filter((entry): entry is FileEntry => entry !== undefined)
				.sort(compareFileEntries);
		},
		async read(path: string, options = {}) {
			const fullPath = resolvePath(path);
			const maxBytes = options.maxBytes ?? DEFAULT_MAX_READ_BYTES;
			const content = await readFile(fullPath, "utf8");
			const truncated = Buffer.byteLength(content, "utf8") > maxBytes;

			return {
				path: fullPath,
				content: truncated ? content.slice(0, maxBytes) : content,
				encoding: "utf8",
				truncated,
			};
		},
		async write() {
			throw new Error("File writes require editor confirmation");
		},
		async stat(path: string) {
			const fullPath = resolvePath(path);
			const info = await stat(fullPath);
			return {
				name: basename(fullPath),
				path: fullPath,
				type: info.isDirectory()
					? "directory"
					: info.isFile()
						? "file"
						: "unknown",
				size: info.size,
				modifiedAt: info.mtime,
				readonly: false,
			};
		},
	};
}

export function getSystemFileRoot(
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = process.env,
): string {
	if (platform === "win32") {
		return env.SystemDrive ? `${env.SystemDrive}\\` : "C:\\";
	}
	return "/";
}

export function getSystemFileLocations(
	options: {
		cwd?: string;
		homeDir?: string;
		tempDir?: string;
		platform?: NodeJS.Platform;
		env?: NodeJS.ProcessEnv;
	} = {},
): FileLocation[] {
	const platform = options.platform ?? process.platform;
	const root = getSystemFileRoot(platform, options.env ?? process.env);
	const home = resolve(options.homeDir ?? homedir());
	const workspace = resolve(options.cwd ?? process.cwd());
	const temp = resolve(options.tempDir ?? tmpdir());
	const locations: FileLocation[] = [
		{
			label: platform === "win32" ? "System Drive" : "Filesystem Root",
			path: root,
			kind: platform === "win32" ? "drive" : "root",
		},
		{ label: "Home", path: home, kind: "home" },
		{ label: "Workspace", path: workspace, kind: "workspace" },
		{ label: "Temp", path: temp, kind: "temp" },
	];

	return dedupeLocations(locations);
}

export function formatFileLocations(locations: FileLocation[]): string {
	return locations
		.map((location) => `${location.label.padEnd(16)} ${location.path}`)
		.join("\n");
}

export function formatDirEntries(entries: FileEntry[]): string {
	return entries
		.map((entry) => {
			const kind =
				entry.type === "directory" ? "<DIR>" : formatFileSize(entry.size);
			return `${kind.padStart(8)} ${entry.name}`;
		})
		.join("\n");
}

function dedupeLocations(locations: FileLocation[]): FileLocation[] {
	const seen = new Set<string>();
	return locations.filter((location) => {
		if (seen.has(location.path)) {
			return false;
		}
		seen.add(location.path);
		return true;
	});
}

function compareFileEntries(left: FileEntry, right: FileEntry): number {
	if (left.type === "directory" && right.type !== "directory") {
		return -1;
	}
	if (left.type !== "directory" && right.type === "directory") {
		return 1;
	}
	return left.name.localeCompare(right.name);
}

function formatFileSize(size?: number): string {
	if (size === undefined) {
		return "-";
	}
	return String(size);
}
