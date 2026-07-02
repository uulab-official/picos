import { posix, win32 } from "node:path";

function usesWindowsSeparators(path: string): boolean {
	return path.includes("\\") || path.startsWith("//");
}

function pathApiFor(path: string): typeof posix | typeof win32 {
	return usesWindowsSeparators(path) ? win32 : posix;
}

export function joinPathLike(basePath: string, ...parts: string[]): string {
	return pathApiFor(basePath).join(basePath, ...parts);
}

export function resolvePathLike(basePath: string, ...parts: string[]): string {
	return pathApiFor(basePath).resolve(basePath, ...parts);
}

export function dirnamePathLike(path: string): string {
	return pathApiFor(path).dirname(path);
}

export function basenamePathLike(path: string): string {
	return pathApiFor(path).basename(path);
}
