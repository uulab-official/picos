const INTERFACE_EVIDENCE_SEARCH_PRESET_LIMIT = 6;

export function normalizeInterfaceEvidenceQuery(query: string): string {
	return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeInterfaceEvidenceSearchPresets(
	input: unknown,
	limit = INTERFACE_EVIDENCE_SEARCH_PRESET_LIMIT,
): string[] {
	if (!Array.isArray(input)) {
		return [];
	}
	const normalizedLimit = Math.max(1, Math.floor(limit));
	const presets: string[] = [];
	for (const value of input) {
		if (typeof value !== "string") {
			continue;
		}
		const query = normalizeInterfaceEvidenceQuery(value);
		if (!query || presets.includes(query)) {
			continue;
		}
		presets.push(query);
		if (presets.length >= normalizedLimit) {
			break;
		}
	}
	return presets;
}

export function saveInterfaceEvidenceSearchPreset(
	presets: string[],
	query: string,
	limit = INTERFACE_EVIDENCE_SEARCH_PRESET_LIMIT,
): string[] {
	const normalized = normalizeInterfaceEvidenceQuery(query);
	if (!normalized) {
		return normalizeInterfaceEvidenceSearchPresets(presets, limit);
	}
	return normalizeInterfaceEvidenceSearchPresets(
		[normalized, ...presets.filter((preset) => preset !== normalized)],
		limit,
	);
}

export function nextInterfaceEvidenceSearchPreset(
	presets: string[],
	currentQuery: string,
): string | undefined {
	const normalized = normalizeInterfaceEvidenceSearchPresets(presets);
	if (normalized.length === 0) {
		return undefined;
	}
	const current = normalizeInterfaceEvidenceQuery(currentQuery);
	const index = normalized.indexOf(current);
	return normalized[(index + 1) % normalized.length] ?? normalized[0];
}
