import { posix, win32 } from "node:path";

function usesWindowsSeparators(path: string): boolean {
	return path.includes("\\") || path.startsWith("//");
}

function isRootRelativeBackslashPath(path: string): boolean {
	return /^\\(?!\\)/.test(path);
}

function pathApiFor(path: string): typeof posix | typeof win32 {
	return usesWindowsSeparators(path) ? win32 : posix;
}

export function joinPathLike(basePath: string, ...parts: string[]): string {
	return pathApiFor(basePath).join(basePath, ...parts);
}

export function resolvePathLike(basePath: string, ...parts: string[]): string {
	if (parts.length === 0 && isRootRelativeBackslashPath(basePath)) {
		return win32.normalize(basePath);
	}
	return pathApiFor(basePath).resolve(basePath, ...parts);
}

export function dirnamePathLike(path: string): string {
	return pathApiFor(path).dirname(path);
}

export function basenamePathLike(path: string): string {
	return pathApiFor(path).basename(path);
}

export function samePathLike(left: string, right: string): boolean {
	return normalizeComparablePath(left) === normalizeComparablePath(right);
}

function normalizeComparablePath(path: string): string {
	return path
		.replaceAll("\\", "/")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "")
		.toLowerCase();
}
