export type ToolHistorySortPreference = "time" | "tool" | "status";
export type ToolHistoryGroupPreference = "none" | "tool" | "status";
export type ToolHistoryDetailPreference =
	| "raw"
	| "summary"
	| "command"
	| "compare";
export type ToolRunActionPreference =
	| "tools.dns"
	| "tools.traceroute"
	| "tools.whois"
	| "tools.ipInfo"
	| "tools.tls"
	| "network.connect"
	| "ping.default";

export type ToolTargetPresetPreference = {
	id: string;
	label: string;
	actionId: ToolRunActionPreference;
	target: string;
	hint: string;
};

const maxToolHistoryFilterPresets = 6;
const maxToolTargetPresets = 24;

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
	if (input === "summary" || input === "command" || input === "compare") {
		return input;
	}
	return "raw";
}

export function normalizeToolTargetPresets(
	input: unknown,
): ToolTargetPresetPreference[] {
	if (!Array.isArray(input)) {
		return [];
	}

	const presets: ToolTargetPresetPreference[] = [];
	const seen = new Set<string>();
	for (const candidate of input) {
		if (!candidate || typeof candidate !== "object") {
			continue;
		}
		const raw = candidate as Record<string, unknown>;
		if (!isToolRunActionPreference(raw.actionId)) {
			continue;
		}
		const target = typeof raw.target === "string" ? raw.target.trim() : "";
		if (!target) {
			continue;
		}
		const key = `${raw.actionId}:${target}`;
		if (seen.has(key)) {
			continue;
		}
		const id =
			typeof raw.id === "string" && raw.id.trim()
				? slugifyToolPresetId(raw.id)
				: slugifyToolPresetId(`${raw.actionId}-${target}`);
		const label =
			typeof raw.label === "string" && raw.label.trim()
				? raw.label.trim()
				: `${raw.actionId} ${target}`;
		const hint =
			typeof raw.hint === "string" && raw.hint.trim()
				? raw.hint.trim()
				: "custom target";
		presets.push({
			id,
			label,
			actionId: raw.actionId,
			target,
			hint,
		});
		seen.add(key);
		if (presets.length >= maxToolTargetPresets) {
			break;
		}
	}
	return presets;
}

function isToolRunActionPreference(
	value: unknown,
): value is ToolRunActionPreference {
	return (
		value === "tools.dns" ||
		value === "tools.traceroute" ||
		value === "tools.whois" ||
		value === "tools.ipInfo" ||
		value === "tools.tls" ||
		value === "network.connect" ||
		value === "ping.default"
	);
}

function slugifyToolPresetId(value: string): string {
	return (
		value
			.trim()
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/g, "-")
			.replaceAll(/^-|-$/g, "") || "custom-target"
	);
}
