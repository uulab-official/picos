import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type AuditLogEventLevel = "run" | "ok" | "warn" | "fail" | "info";

export type AuditLogEvent = {
	id: string;
	level: AuditLogEventLevel;
	message: string;
	time: string;
};

export type ConsoleAuditExportPlan = {
	path: string;
	content: string;
	eventCount: number;
	query?: string;
	scope?: "all" | "filtered";
};

export type ConsoleAuditExportRead = {
	path: string;
	events: AuditLogEvent[];
};

export function formatConsoleAuditLog(
	events: AuditLogEvent[],
	options: {
		generatedAt?: string;
		query?: string;
		scope?: "all" | "filtered";
	} = {},
): string {
	const generatedAt = options.generatedAt ?? new Date().toISOString();
	return [
		"# picos audit log",
		`generatedAt=${generatedAt}`,
		...(options.scope ? [`scope=${options.scope}`] : []),
		...(options.query ? [`query=${options.query}`] : []),
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
		query?: string;
		scope?: "all" | "filtered";
	},
): ConsoleAuditExportPlan {
	const generatedAt = options.generatedAt ?? new Date();
	const iso = generatedAt.toISOString();
	const scope = options.scope ?? "all";
	const fileScope = scope === "filtered" ? "filtered-" : "";
	return {
		path: join(
			options.baseDir,
			"audit",
			`picos-audit-${fileScope}${iso.replaceAll(/[:.]/g, "")}.log`,
		),
		content: formatConsoleAuditLog(events, {
			generatedAt: iso,
			query: options.query,
			scope: options.scope,
		}),
		eventCount: events.length,
		...(options.query ? { query: options.query } : {}),
		...(options.scope ? { scope: options.scope } : {}),
	};
}

export async function writeConsoleAuditExport(
	plan: ConsoleAuditExportPlan,
): Promise<ConsoleAuditExportPlan> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, "utf8");
	return plan;
}

export function parseConsoleAuditLog(content: string): AuditLogEvent[] {
	return content
		.split(/\r?\n/)
		.map((line) => line.match(/^\[([^\]]+)\]\s+([A-Z]+)\s+(.+)$/))
		.filter((match): match is RegExpMatchArray => Boolean(match))
		.map((match) => {
			const time = match[1] ?? "";
			const level = toAuditLogEventLevel(match[2]);
			const message = match[3] ?? "";
			return {
				id: createPersistedEventId(time, level, message),
				level,
				time,
				message,
			};
		});
}

export async function readLatestConsoleAuditExport(
	baseDir: string,
): Promise<ConsoleAuditExportRead | undefined> {
	const auditDir = join(baseDir, "audit");
	let files: string[];
	try {
		files = await readdir(auditDir);
	} catch {
		return undefined;
	}
	const latest = files
		.filter((file) => /^picos-audit-.+\.log$/.test(file))
		.sort()
		.at(-1);
	if (!latest) {
		return undefined;
	}

	const path = join(auditDir, latest);
	return {
		path,
		events: parseConsoleAuditLog(await readFile(path, "utf8")),
	};
}

function createPersistedEventId(
	time: string,
	level: AuditLogEventLevel,
	message: string,
): string {
	return `persisted-${time}-${level}-${message
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "")}`;
}

function toAuditLogEventLevel(level: string | undefined): AuditLogEventLevel {
	const normalized = level?.toLowerCase();
	if (
		normalized === "run" ||
		normalized === "ok" ||
		normalized === "warn" ||
		normalized === "fail" ||
		normalized === "info"
	) {
		return normalized;
	}
	return "info";
}
