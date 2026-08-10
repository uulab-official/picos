import {
	type DockerCommandPlan,
	getDockerCommandPlans,
} from "../adapters/docker";
import { type SafeExecOptions, safeExec } from "../utils/safeExec";
import type {
	DeveloperPluginContract,
	DeveloperPluginEvidence,
	DockerContainerSummary,
	DockerPluginData,
	DockerPluginSnapshot,
} from "./pluginTypes";
import type { SafeExecResult } from "./types";

export const DOCKER_PLUGIN_TIMEOUT_MS = 5_000;
export const DOCKER_PLUGIN_CONTAINER_LIMIT = 200;
export const DOCKER_PLUGIN_TEXT_LIMIT = 256;

export type DockerPluginExec = (
	command: string,
	args: string[],
	options?: SafeExecOptions,
) => Promise<SafeExecResult>;

export type DockerPluginCollectorOptions = {
	exec?: DockerPluginExec;
	timeoutMs?: number;
	containerLimit?: number;
};

export function createDockerPluginContract(): DeveloperPluginContract {
	return {
		id: "docker",
		label: "Docker",
		description: "Inspect the Docker client, context, engine, and containers.",
		source: "built-in",
		risk: "read",
		mutations: "locked",
		capabilities: [
			{
				id: "client",
				label: "Docker client version",
				risk: "read",
				status: "available",
				bounds: { timeoutMs: DOCKER_PLUGIN_TIMEOUT_MS },
			},
			{
				id: "context",
				label: "Active Docker context",
				risk: "read",
				status: "available",
				bounds: { timeoutMs: DOCKER_PLUGIN_TIMEOUT_MS },
			},
			{
				id: "engine",
				label: "Docker engine summary",
				risk: "read",
				status: "available",
				bounds: { timeoutMs: DOCKER_PLUGIN_TIMEOUT_MS },
			},
			{
				id: "containers",
				label: "Docker container summaries",
				risk: "read",
				status: "available",
				bounds: {
					timeoutMs: DOCKER_PLUGIN_TIMEOUT_MS,
					maxEntries: DOCKER_PLUGIN_CONTAINER_LIMIT,
					maxTextLength: DOCKER_PLUGIN_TEXT_LIMIT,
				},
			},
		],
	};
}

export async function collectDockerPlugin(
	options: DockerPluginCollectorOptions = {},
): Promise<DockerPluginSnapshot> {
	const exec = options.exec ?? safeExec;
	const plans = getDockerCommandPlans();
	const timeoutMs = options.timeoutMs ?? DOCKER_PLUGIN_TIMEOUT_MS;
	const containerLimit =
		options.containerLimit ?? DOCKER_PLUGIN_CONTAINER_LIMIT;
	const [clientPlan, ...remainingPlans] = plans;
	if (!clientPlan) throw new Error("Docker client plan is required");
	const clientResult = await runPlan(exec, clientPlan, timeoutMs);
	if (isExecutableMissing(clientResult)) {
		return createUnsupportedDockerSnapshot(clientPlan, clientResult);
	}
	const remaining = await Promise.all(
		remainingPlans.map((plan) => runPlan(exec, plan, timeoutMs)),
	);
	return createDockerSnapshot(
		[clientResult, ...remaining],
		containerLimit,
		plans,
	);
}

export function parseDockerEngineSummary(value: string): {
	engineVersion: string | null;
	containerCounts: DockerPluginData["containerCounts"];
	imageCount: number | null;
	malformed: boolean;
} {
	const fields = value.trim().split("\t");
	const [version, total, running, paused, stopped, images] = fields;
	const containerCounts = {
		total: parseDockerCount(total),
		running: parseDockerCount(running),
		paused: parseDockerCount(paused),
		stopped: parseDockerCount(stopped),
	};
	const imageCount = parseDockerCount(images);
	const engineVersion = version ? normalizeDockerText(version) : null;
	return {
		engineVersion,
		containerCounts,
		imageCount,
		malformed:
			fields.length !== 6 ||
			engineVersion === null ||
			Object.values(containerCounts).some((count) => count === null) ||
			imageCount === null,
	};
}

export function parseDockerContainerSummaries(
	value: string,
	limit = DOCKER_PLUGIN_CONTAINER_LIMIT,
): DockerContainerSummary[] {
	return parseDockerContainerRows(value, limit).containers;
}

export function normalizeDockerText(
	value: string,
	maxLength = DOCKER_PLUGIN_TEXT_LIMIT,
): string {
	let normalized = value.replace(/\s+/gu, " ").trim();
	normalized = normalized
		.replace(
			/(\b(?:access[_-]?token|token|password|passwd|secret|api[_-]?key)\s*=\s*)([^\s,;}\]]+)/giu,
			"$1[REDACTED]",
		)
		.replace(
			/(\bauthorization\s*:\s*)(?:bearer|basic)\s+[^\s,;]+/giu,
			"$1[REDACTED]",
		)
		.replace(/\/Users\/[^/\s]+|\/home\/[^/\s]+/gu, "$HOME")
		.replace(/[A-Za-z]:\\Users\\[^\\\s]+/gu, "$HOME");
	if (normalized.length <= maxLength) return normalized;
	if (maxLength <= 3) return normalized.slice(0, Math.max(0, maxLength));
	return `${normalized.slice(0, maxLength - 3)}...`;
}

async function runPlan(
	exec: DockerPluginExec,
	plan: DockerCommandPlan,
	timeoutMs: number,
): Promise<SafeExecResult> {
	return exec(plan.command, [...plan.args], { timeoutMs });
}

function createUnsupportedDockerSnapshot(
	plan: DockerCommandPlan,
	result: SafeExecResult,
): DockerPluginSnapshot {
	return {
		id: "docker",
		contract: createDockerPluginContract(),
		status: "unsupported",
		evidence: [createEvidence(plan, result, false)],
		sourceTruncated: Boolean(result.truncated),
		resultTruncated: false,
		data: createEmptyDockerData(DOCKER_PLUGIN_CONTAINER_LIMIT),
	};
}

function createDockerSnapshot(
	results: SafeExecResult[],
	containerLimit: number,
	plans: DockerCommandPlan[],
): DockerPluginSnapshot {
	const [clientResult, contextResult, engineResult, containersResult] = results;
	const evidence = plans.map((plan, index) => {
		const result = results[index];
		if (!result) throw new Error(`Docker result is required for ${plan.id}`);
		return createEvidence(plan, result, true);
	});
	const clientVersion = clientResult?.success
		? parseDockerClientVersion(clientResult.stdout)
		: null;
	const context = contextResult?.success
		? parseDockerContext(contextResult.stdout)
		: null;
	const engine = engineResult?.success
		? parseDockerEngineSummary(engineResult.stdout)
		: createEmptyEngineSummary();
	const containerRows = containersResult?.success
		? parseDockerContainerRows(containersResult.stdout, containerLimit)
		: { containers: [], resultTruncated: false, malformed: false };
	const sourceTruncated = evidence.some((item) => item.truncated);
	const malformed =
		(clientResult?.success === true && clientVersion === null) ||
		(contextResult?.success === true && context === null) ||
		(engineResult?.success === true && engine.malformed) ||
		(containersResult?.success === true && containerRows.malformed);
	return {
		id: "docker",
		contract: createDockerPluginContract(),
		status:
			evidence.every((item) => item.success) && !sourceTruncated && !malformed
				? "completed"
				: "partial",
		evidence,
		sourceTruncated,
		resultTruncated: containerRows.resultTruncated,
		data: {
			clientVersion,
			context,
			engineVersion: engine.engineVersion,
			containerCounts: engine.containerCounts,
			imageCount: engine.imageCount,
			requestedContainerLimit: containerLimit,
			returnedContainerCount: containerRows.containers.length,
			containers: containerRows.containers,
		},
	};
}

function createEvidence(
	plan: DockerCommandPlan,
	result: SafeExecResult,
	supported: boolean,
): DeveloperPluginEvidence {
	const success = result.success && !result.truncated;
	const diagnostic = success
		? undefined
		: normalizeDockerText(result.stderr || result.stdout);
	return {
		id: plan.id,
		command: plan.command,
		args: [...plan.args],
		supported,
		success,
		exitCode: result.exitCode,
		truncated: Boolean(result.truncated),
		...(diagnostic ? { diagnostic } : {}),
	};
}

function createEmptyDockerData(containerLimit: number): DockerPluginData {
	return {
		clientVersion: null,
		context: null,
		...createEmptyEngineSummary(),
		requestedContainerLimit: containerLimit,
		returnedContainerCount: 0,
		containers: [],
	};
}

function createEmptyEngineSummary(): {
	engineVersion: null;
	containerCounts: DockerPluginData["containerCounts"];
	imageCount: null;
	malformed: false;
} {
	return {
		engineVersion: null,
		containerCounts: {
			total: null,
			running: null,
			paused: null,
			stopped: null,
		},
		imageCount: null,
		malformed: false,
	};
}

function parseDockerClientVersion(value: string): string | null {
	const version = value.match(/Docker version\s+([^,\s]+)/iu)?.[1];
	return version ? normalizeDockerText(version) : null;
}

function parseDockerContext(value: string): string | null {
	const context = value.split(/\r?\n/gu).find((line) => line.trim().length > 0);
	return context ? normalizeDockerText(context) : null;
}

function parseDockerContainerRows(
	value: string,
	limit: number,
): {
	containers: DockerContainerSummary[];
	resultTruncated: boolean;
	malformed: boolean;
} {
	const containers: DockerContainerSummary[] = [];
	let resultTruncated = false;
	let malformed = false;
	for (const line of value.split(/\r?\n/gu)) {
		if (line.trim().length === 0) continue;
		const fields = line.split("\t");
		if (fields.length !== 5) {
			malformed = true;
			continue;
		}
		if (containers.length >= limit) {
			resultTruncated = true;
			continue;
		}
		const [id = "", names = "", image = "", state = "", status = ""] = fields;
		containers.push({
			id: normalizeDockerText(id),
			names: normalizeDockerText(names),
			image: normalizeDockerText(image),
			state: normalizeDockerText(state),
			status: normalizeDockerText(status),
		});
	}
	return { containers, resultTruncated, malformed };
}

function parseDockerCount(value: string | undefined): number | null {
	if (!value || !/^\d+$/u.test(value)) return null;
	const count = Number(value);
	return Number.isSafeInteger(count) ? count : null;
}

function isExecutableMissing(result: SafeExecResult): boolean {
	if (result.success) return false;
	const diagnostic = `${result.stderr}\n${result.stdout}`;
	return /\benoent\b|\bnot found\b|\b(?:windows?|win32) error 2\b|\berror 2\b/iu.test(
		diagnostic,
	);
}
