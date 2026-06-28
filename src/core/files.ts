import { readdir, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

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

const DEFAULT_MAX_READ_BYTES = 256 * 1024;

export function createLocalFileProvider(root = process.cwd()): FileProvider {
	const resolvedRoot = resolve(root);

	function resolvePath(path: string): string {
		return resolve(resolvedRoot, path);
	}

	return {
		kind: "local",
		async pwd() {
			return resolvedRoot;
		},
		async list(path: string) {
			const directory = resolvePath(path);
			const entries = await readdir(directory, { withFileTypes: true });
			const summaries = await Promise.all(
				entries.map(async (entry) => {
					const fullPath = resolve(directory, entry.name);
					const info = await stat(fullPath);
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

			return summaries.sort(compareFileEntries);
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

export function formatDirEntries(entries: FileEntry[]): string {
	return entries
		.map((entry) => {
			const kind =
				entry.type === "directory" ? "<DIR>" : formatFileSize(entry.size);
			return `${kind.padStart(8)} ${entry.name}`;
		})
		.join("\n");
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
