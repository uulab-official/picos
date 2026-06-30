const maxEndpointFilterPresets = 6;

export function normalizeEndpointFilterPresets(input: unknown): string[] {
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
		if (presets.length >= maxEndpointFilterPresets) {
			break;
		}
	}
	return presets;
}
