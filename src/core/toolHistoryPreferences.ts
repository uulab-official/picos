export type ToolHistorySortPreference = "time" | "tool" | "status";
export type ToolHistoryGroupPreference = "none" | "tool" | "status";
export type ToolHistoryDetailPreference = "raw" | "summary" | "command";

const maxToolHistoryFilterPresets = 6;

export function normalizeToolHistoryFilterPresets(input: unknown): string[] {
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
		if (presets.length >= maxToolHistoryFilterPresets) {
			break;
		}
	}
	return presets;
}

export function normalizeToolHistorySortPreference(
	input: unknown,
): ToolHistorySortPreference {
	if (input === "tool" || input === "status") {
		return input;
	}
	return "time";
}

export function normalizeToolHistoryGroupPreference(
	input: unknown,
): ToolHistoryGroupPreference {
	if (input === "tool" || input === "status") {
		return input;
	}
	return "none";
}

export function normalizeToolHistoryDetailPreference(
	input: unknown,
): ToolHistoryDetailPreference {
	if (input === "summary" || input === "command") {
		return input;
	}
	return "raw";
}
