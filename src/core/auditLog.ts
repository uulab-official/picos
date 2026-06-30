import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type AuditLogEvent = {
	id: string;
	level: string;
	message: string;
	time: string;
};

export type ConsoleAuditExportPlan = {
	path: string;
	content: string;
	eventCount: number;
};

export function formatConsoleAuditLog(
	events: AuditLogEvent[],
	options: {
		generatedAt?: string;
	} = {},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	return [
		"# picos audit log",
		`generatedAt=${generatedAt}`,
		`events=${events.length}`,
		"",
		...events.map(
			(event) =>
				`[${event.time}] ${event.level.toUpperCase().padEnd(4)} ${event.message}`,
		),
		"",
	].join("\n");
}

export function createConsoleAuditExportPlan(
	events: AuditLogEvent[],
	options: {
		baseDir: string;
		generatedAt?: Date;
	},
): ConsoleAuditExportPlan {
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	return {
		path: join(
			options.baseDir,
			"audit",
			`picos-audit-${iso.replaceAll(/[:.]/g, "")}.log`,
		),
		content: formatConsoleAuditLog(events, { generatedAt: iso }),
		eventCount: events.length,
	};
}

export async function writeConsoleAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}
