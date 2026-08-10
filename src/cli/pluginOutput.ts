import type {
	DeveloperPluginCapability,
	DeveloperPluginContract,
	DeveloperPluginEvidence,
	DeveloperPluginSnapshot,
} from "../core/pluginTypes";
import {
	sanitizeLocalInspectorText,
	stringifyLocalInspectorCompleted,
} from "./localInspectorOutput";

export function formatPluginCatalogJson(
	catalog: DeveloperPluginContract[],
): string {
	return stringifyLocalInspectorCompleted("plugins", {
		request: { action: "list", id: null },
		data: {
			totalCount: catalog.length,
			returnedCount: catalog.length,
			plugins: catalog.map(normalizeContract),
		},
	});
}

export function formatPluginSnapshotJson(
	snapshot: DeveloperPluginSnapshot,
): string {
	return stringifyLocalInspectorCompleted("plugins", {
		request: { action: "inspect", id: snapshot.id },
		data: {
			id: snapshot.id,
			status: snapshot.status,
			contract: normalizeContract(snapshot.contract),
			sourceTruncated: snapshot.sourceTruncated,
			resultTruncated: snapshot.resultTruncated,
			evidence: snapshot.evidence.map(normalizeEvidence),
			clientVersion: normalizeOptionalText(snapshot.data.clientVersion),
			context: normalizeOptionalText(snapshot.data.context),
			engineVersion: normalizeOptionalText(snapshot.data.engineVersion),
			containerCounts: {
				total: snapshot.data.containerCounts.total,
				running: snapshot.data.containerCounts.running,
				paused: snapshot.data.containerCounts.paused,
				stopped: snapshot.data.containerCounts.stopped,
			},
			imageCount: snapshot.data.imageCount,
			requestedContainerLimit: snapshot.data.requestedContainerLimit,
			returnedContainerCount: snapshot.data.returnedContainerCount,
			containers: snapshot.data.containers.map((container) => ({
				id: sanitizeLocalInspectorText(container.id),
				names: sanitizeLocalInspectorText(container.names),
				image: sanitizeLocalInspectorText(container.image),
				state: sanitizeLocalInspectorText(container.state),
				status: sanitizeLocalInspectorText(container.status),
			})),
		},
	});
}

function normalizeContract(contract: DeveloperPluginContract) {
	return {
		id: contract.id,
		label: sanitizeLocalInspectorText(contract.label),
		description: sanitizeLocalInspectorText(contract.description),
		source: contract.source,
		risk: contract.risk,
		mutations: contract.mutations,
		capabilities: contract.capabilities.map(normalizeCapability),
	};
}

function normalizeCapability(capability: DeveloperPluginCapability) {
	return {
		id: sanitizeLocalInspectorText(capability.id),
		label: sanitizeLocalInspectorText(capability.label),
		risk: capability.risk,
		status: capability.status,
		bounds: capability.bounds
			? {
					timeoutMs: capability.bounds.timeoutMs ?? null,
					maxEntries: capability.bounds.maxEntries ?? null,
					maxTextLength: capability.bounds.maxTextLength ?? null,
				}
			: null,
	};
}

function normalizeEvidence(evidence: DeveloperPluginEvidence) {
	return {
		id: evidence.id,
		command: sanitizeLocalInspectorText(evidence.command),
		args: evidence.args.map(sanitizeLocalInspectorText),
		supported: evidence.supported,
		success: evidence.success,
		exitCode: evidence.exitCode,
		truncated: evidence.truncated,
		diagnostic: normalizeOptionalText(evidence.diagnostic),
	};
}

function normalizeOptionalText(
	value: string | undefined | null,
): string | null {
	return value === undefined || value === null
		? null
		: sanitizeLocalInspectorText(value);
}
