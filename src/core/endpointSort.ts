import { type ConnectionSort, parseConnectionSort } from "./connections";
import { type PortSort, parsePortSort } from "./ports";

export function formatConnectionSortPreference(sort: ConnectionSort): string {
	return sort.direction === "desc" ? `-${sort.key}` : sort.key;
}

export function formatPortSortPreference(sort: PortSort): string {
	return sort.direction === "desc" ? `-${sort.key}` : sort.key;
}

export function normalizeConnectionSortPreference(input: unknown): string {
	if (typeof input !== "string") {
		return "state";
	}
	try {
		return formatConnectionSortPreference(parseConnectionSort(input));
	} catch {
		return "state";
	}
}

export function normalizePortSortPreference(input: unknown): string {
	if (typeof input !== "string") {
		return "port";
	}
	try {
		return formatPortSortPreference(parsePortSort(input));
	} catch {
		return "port";
	}
}
