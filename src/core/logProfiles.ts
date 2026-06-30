import type { LogProfile } from "./types";

const maxLogProfiles = 6;
const logProfileLevels = new Set<LogProfile["level"]>([
	"all",
	"warn",
	"fail",
	"info",
]);

export function normalizeLogProfiles(input: unknown): LogProfile[] {
	if (!Array.isArray(input)) {
		return [];
	}

	const profiles: LogProfile[] = [];
	const seen = new Set<string>();
	for (const candidate of input) {
		const profile = normalizeLogProfileInput(candidate);
		if (!profile) {
			continue;
		}
		const label = formatLogProfileLabel(profile);
		if (seen.has(label)) {
			continue;
		}
		profiles.push(profile);
		seen.add(label);
		if (profiles.length >= maxLogProfiles) {
			break;
		}
	}
	return profiles;
}

export function saveLogProfile(
	profiles: LogProfile[],
	profile: LogProfile,
): LogProfile[] {
	const normalized = normalizeLogProfile(profile);
	return [
		normalized,
		...profiles.filter(
			(candidate) =>
				formatLogProfileLabel(candidate) !== formatLogProfileLabel(normalized),
		),
	].slice(0, maxLogProfiles);
}

export function nextLogProfile(
	profiles: LogProfile[],
	current: LogProfile,
): LogProfile | undefined {
	if (profiles.length === 0) {
		return undefined;
	}
	const currentLabel = formatLogProfileLabel(current);
	const index = profiles.findIndex(
		(profile) => formatLogProfileLabel(profile) === currentLabel,
	);
	return profiles[(index + 1) % profiles.length] ?? profiles[0];
}

export function formatLogProfileLabel(profile: LogProfile): string {
	const normalized = normalizeLogProfile(profile);
	return `${normalized.level}:${normalized.query || "-"}`;
}

function normalizeLogProfileInput(input: unknown): LogProfile | undefined {
	if (!input || typeof input !== "object") {
		return undefined;
	}

	const candidate = input as Partial<LogProfile>;
	if (!candidate.level || !logProfileLevels.has(candidate.level)) {
		return undefined;
	}
	if (typeof candidate.query !== "string") {
		return undefined;
	}
	return normalizeLogProfile({
		level: candidate.level,
		query: candidate.query,
	});
}

function normalizeLogProfile(profile: LogProfile): LogProfile {
	return {
		level: profile.level,
		query: profile.query.trim(),
	};
}
