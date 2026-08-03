import type { ToolDefinition, ToolResult } from "../core/tools";
import type { ReleaseHealthReport } from "../core/release";
import type { DoctorCheck } from "../core/types";
import {
	LOCAL_INSPECTOR_JSON_ENTRY_LIMIT,
	LOCAL_INSPECTOR_JSON_MAX_BYTES,
	LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
	sanitizeLocalInspectorText,
	stringifyLocalInspectorCompleted,
} from "./localInspectorOutput";

const MAX_OBJECT_KEYS = 128;
const MAX_VALUE_DEPTH = 8;

export function formatDoctorJson(checks: DoctorCheck[]): string {
	const normalizedChecks = checks
		.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
		.map((check) => ({
			id: check.id,
			label: sanitizeLocalInspectorText(check.label),
			status: check.status,
			detail: check.detail ? sanitizeLocalInspectorText(check.detail) : null,
		}));
	const passCount = checks.filter((check) => check.status === "pass").length;
	const warnCount = checks.filter((check) => check.status === "warn").length;
	const failCount = checks.filter((check) => check.status === "fail").length;

	return stringifyLocalInspectorCompleted("doctor", {
		data: {
			healthy: failCount === 0,
			passCount,
			warnCount,
			failCount,
			checkCount: checks.length,
			checks: normalizedChecks,
		},
	});
}

export function formatReleaseHealthJson(
	report: ReleaseHealthReport,
): string {
	return stringifyLocalInspectorCompleted("release-health", {
		request: { action: "check" },
		data: {
			status: report.status,
			passCount: report.passCount,
			failCount: report.failCount,
			checks: report.items.map((item) => ({
				label: sanitizeLocalInspectorText(item.label),
				status: item.status,
				detail: item.detail
					? sanitizeLocalInspectorText(item.detail)
					: null,
			})),
		},
	});
}

export function formatDnsJson(servers: string[]): string {
	const normalized = servers
		.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
		.map(sanitizeLocalInspectorText);
	return stringifyLocalInspectorCompleted("dns", {
		request: { operation: "show" },
		source: {
			kind: "node",
			api: "dns.getServers",
			success: true,
		},
		data: {
			configured: normalized.length > 0,
			serverCount: servers.length,
			servers: normalized,
		},
	});
}

export function formatDnsBlockedJson(message: string): string {
	return stringifyBounded({
		schemaVersion: LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
		command: "dns",
		status: "blocked",
		limits: { maxBytes: LOCAL_INSPECTOR_JSON_MAX_BYTES },
		request: { operation: "flush" },
		action: {
			risk: "write",
			privilege: "admin",
			confirmationRequired: true,
			executionEnabled: false,
		},
		error: {
			code: "PICOS_ACTION_LOCKED",
			message: sanitizeLocalInspectorText(message),
		},
	});
}

export function formatToolsListJson(definitions: ToolDefinition[]): string {
	const tools = definitions
		.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
		.map((tool) => ({
			id: tool.id,
			name: sanitizeLocalInspectorText(tool.name),
			description: sanitizeLocalInspectorText(tool.description),
			fields: tool.fields.map((field) => ({
				key: sanitizeLocalInspectorText(field.key),
				label: sanitizeLocalInspectorText(field.label),
				placeholder: sanitizeLocalInspectorText(field.placeholder),
			})),
		}));
	return stringifyLocalInspectorCompleted("tools", {
		request: { operation: "list" },
		data: { toolCount: definitions.length, tools },
	});
}

export function formatToolRunJson(
	result: ToolResult,
	request: { name: string; args: string[]; timeoutMs?: number },
): string {
	if (!result.toolId || !result.automation) {
		throw new Error("Tool result does not include automation metadata");
	}
	const source = sanitizeJsonValue(result.automation.source);
	const data = sanitizeJsonValue(result.automation.data);
	return stringifyLocalInspectorCompleted("tools", {
		request: {
			operation: "run",
			tool: result.toolId,
			requestedTool: sanitizeLocalInspectorText(request.name),
			args: request.args
				.slice(0, 32)
				.map((argument) => sanitizeLocalInspectorText(argument)),
			timeoutMs: request.timeoutMs ?? null,
		},
		source,
		data: {
			title: sanitizeLocalInspectorText(result.title),
			outcome: result.automation.source.success ? "ok" : "fail",
			result: data,
		},
	});
}

function sanitizeJsonValue(value: unknown, depth = 0): unknown {
	if (depth >= MAX_VALUE_DEPTH) return "[MAX_DEPTH]";
	if (typeof value === "string") return sanitizeLocalInspectorText(value);
	if (
		value === null ||
		typeof value === "boolean" ||
		(typeof value === "number" && Number.isFinite(value))
	) {
		return value;
	}
	if (Array.isArray(value)) {
		return value
			.slice(0, LOCAL_INSPECTOR_JSON_ENTRY_LIMIT)
			.map((entry) => sanitizeJsonValue(entry, depth + 1));
	}
	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.slice(0, MAX_OBJECT_KEYS)
				.map(([key, entry]) => {
					const sanitizedKey = sanitizeLocalInspectorText(key);
					return [
						sanitizedKey,
						isSensitiveKey(sanitizedKey)
							? "[REDACTED]"
							: sanitizeJsonValue(entry, depth + 1),
					];
				}),
		);
	}
	return sanitizeLocalInspectorText(String(value));
}

function isSensitiveKey(key: string): boolean {
	return /(?:token|password|passwd|secret|api[_-]?key|private[_-]?key)/iu.test(
		key,
	);
}

function stringifyBounded(value: Record<string, unknown>): string {
	const output = JSON.stringify(value);
	if (Buffer.byteLength(output, "utf8") > LOCAL_INSPECTOR_JSON_MAX_BYTES) {
		throw new Error(
			`Diagnostic JSON exceeds ${LOCAL_INSPECTOR_JSON_MAX_BYTES} bytes`,
		);
	}
	return output;
}
