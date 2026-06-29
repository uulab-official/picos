import type { FileEntry } from "../core/files";

export type FileFilterState = {
	active: boolean;
	query: string;
};

export function openFileFilter(query = ""): FileFilterState {
	return {
		active: true,
		query,
	};
}

export function clearFileFilter(_state: FileFilterState): FileFilterState {
	return {
		active: false,
		query: "",
	};
}

export function closeFileFilter(state: FileFilterState): FileFilterState {
	return {
		...state,
		active: false,
	};
}

export function appendFileFilterQuery(
	state: FileFilterState,
	input: string,
): FileFilterState {
	const printableInput = Array.from(input)
		.filter((char) => {
			const codePoint = char.codePointAt(0) ?? 0;
			return codePoint >= 32 && codePoint !== 127;
		})
		.join("");
	if (!state.active || printableInput.length === 0) {
		return state;
	}

	return {
		...state,
		query: `${state.query}${printableInput}`,
	};
}

export function backspaceFileFilterQuery(
	state: FileFilterState,
): FileFilterState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		query: state.query.slice(0, -1),
	};
}

export function filterFileEntries(
	entries: FileEntry[],
	state: Pick<FileFilterState, "query">,
): FileEntry[] {
	const query = state.query.trim().toLowerCase();
	if (!query) {
		return entries;
	}

	return entries.filter((entry) => {
		if (entry.name === "..") {
			return true;
		}
		return [entry.name, entry.path, entry.type]
			.join(" ")
			.toLowerCase()
			.includes(query);
	});
}
