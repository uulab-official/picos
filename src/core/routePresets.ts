const maxRouteFilterPresets = 6;

export function normalizeRouteFilterPresets(input: unknown): string[] {
	if (!Array.isArray(input)) {
		return [];
	}

	const presets: string[] = [];
	const seen = new Set<string>();
	for (const candidate of input) {
		if (typeof candidate !== "string") {
			continue;
		}
		const preset = candidate.trim();
		if (!preset || seen.has(preset)) {
			continue;
		}
		presets.push(preset);
		seen.add(preset);
		if (presets.length >= maxRouteFilterPresets) {
			break;
		}
	}
	return presets;
}

export function saveRouteFilterPresetValue(
	presets: string[],
	query: string,
): string[] {
	return normalizeRouteFilterPresets([query, ...presets]);
}
