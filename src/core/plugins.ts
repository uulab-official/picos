import {
	collectDockerPlugin,
	createDockerPluginContract,
	type DockerPluginCollectorOptions,
} from "./dockerPlugin";
import type {
	DeveloperPluginCapability,
	DeveloperPluginContract,
	DeveloperPluginId,
	DeveloperPluginSnapshot,
} from "./pluginTypes";

const pluginCatalog: Record<DeveloperPluginId, DeveloperPluginContract> = {
	docker: createDockerPluginContract(),
};

export function parseDeveloperPluginId(value: string): DeveloperPluginId {
	if (Object.hasOwn(pluginCatalog, value)) return value as DeveloperPluginId;
	throw new Error(`Unknown developer plugin: ${value}`);
}

export function getDeveloperPluginCatalog(): DeveloperPluginContract[] {
	return (Object.keys(pluginCatalog) as DeveloperPluginId[]).map((id) =>
		cloneContract(pluginCatalog[id]),
	);
}

export function getDeveloperPluginContract(
	id: DeveloperPluginId,
): DeveloperPluginContract {
	const contract = pluginCatalog[id];
	if (!contract) throw new Error(`Unknown developer plugin: ${id}`);
	return cloneContract(contract);
}

export async function collectDeveloperPlugin(
	id: DeveloperPluginId,
	options?: DockerPluginCollectorOptions,
): Promise<DeveloperPluginSnapshot> {
	switch (parseDeveloperPluginId(id)) {
		case "docker":
			return collectDockerPlugin(options);
	}
}

export function formatDeveloperPluginCatalogRows(
	catalog: DeveloperPluginContract[],
): string[] {
	return catalog.flatMap((contract) => [
		`${contract.id.toUpperCase()} ${contract.label}`,
		`  Source: ${contract.source}`,
		`  Risk: ${contract.risk}`,
		`  Mutations: ${contract.mutations}`,
		...contract.capabilities.map(
			(capability) =>
				`  ${capitalize(capability.id)}: ${capability.status} (${capability.risk})`,
		),
	]);
}

export function formatDeveloperPluginSnapshotRows(
	snapshot: DeveloperPluginSnapshot,
): string[] {
	return [
		`${snapshot.id.toUpperCase()} ${snapshot.status}`,
		`  Client: ${snapshot.data.clientVersion ?? "unknown"}`,
		`  Context: ${snapshot.data.context ?? "unknown"}`,
		`  Engine: ${snapshot.data.engineVersion ?? "unknown"}`,
		`  Containers: ${snapshot.data.returnedContainerCount} returned (limit ${snapshot.data.requestedContainerLimit})`,
		`  Source bounded: ${snapshot.sourceTruncated ? "yes" : "no"}`,
		`  Result bounded: ${snapshot.resultTruncated ? "yes" : "no"}`,
	];
}

function cloneContract(
	contract: DeveloperPluginContract,
): DeveloperPluginContract {
	return {
		...contract,
		capabilities: contract.capabilities.map(cloneCapability),
	};
}

function cloneCapability(
	capability: DeveloperPluginCapability,
): DeveloperPluginCapability {
	return {
		...capability,
		bounds: capability.bounds ? { ...capability.bounds } : undefined,
	};
}

function capitalize(value: string): string {
	return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
