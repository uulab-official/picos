import { formatDeveloperPluginSnapshotRows } from "../core/plugins";
import type { DeveloperPluginSnapshot } from "../core/pluginTypes";

export type SystemPluginRowColor = "cyan" | "gray" | "yellow";

export function formatSystemPluginRows(
	plugins: DeveloperPluginSnapshot[],
	visibleRows: number,
): string[] {
	const rows = [
		"DEVELOPER PLUGINS",
		...(plugins.length > 0
			? plugins.flatMap(formatCompactPluginRows)
			: ["no registered plugin snapshots"]),
	];
	return rows.slice(0, Math.max(1, visibleRows));
}

export function formatSystemPluginRowColor(row: string): SystemPluginRowColor {
	if (row === "DEVELOPER PLUGINS") return "cyan";
	if (/\b(?:partial|unsupported|warn)\b/iu.test(row)) return "yellow";
	return "gray";
}

function formatCompactPluginRows(snapshot: DeveloperPluginSnapshot): string[] {
	const snapshotRows = formatDeveloperPluginSnapshotRows(snapshot);
	const clientVersion = readSnapshotRow(snapshotRows, "Client:");
	const context = readSnapshotRow(snapshotRows, "Context:");
	const engineVersion = snapshot.evidence.some(
		(evidence) => evidence.id === "engine" && !evidence.success,
	)
		? "-"
		: readSnapshotRow(snapshotRows, "Engine:");
	const warnings = snapshot.evidence
		.filter((evidence) => !evidence.success)
		.map((evidence) => `${evidence.id} warn`);

	return [
		`${snapshot.id} ${snapshot.status} · ${snapshot.contract.source} · ${snapshot.contract.risk}-only · mutations ${snapshot.contract.mutations}`,
		`context=${context} client=${clientVersion} engine=${engineVersion}`,
		`containers=${snapshot.data.returnedContainerCount}/${snapshot.data.requestedContainerLimit} resultTruncated=${snapshot.resultTruncated} sourceTruncated=${snapshot.sourceTruncated}`,
		...warnings,
	];
}

function readSnapshotRow(rows: string[], label: string): string {
	const row = rows.find((candidate) => candidate.trimStart().startsWith(label));
	return row?.trimStart().slice(label.length).trim() ?? "unknown";
}
