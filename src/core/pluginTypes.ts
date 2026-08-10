export type DeveloperPluginId = "docker";

export type DeveloperPluginRuntimeStatus =
	| "completed"
	| "partial"
	| "unsupported";

export type DeveloperPluginCapability = {
	id: string;
	label: string;
	risk: "read" | "write" | "destructive";
	status: "available" | "locked" | "unsupported";
	bounds?: {
		timeoutMs?: number;
		maxEntries?: number;
		maxTextLength?: number;
	};
};

export type DeveloperPluginContract = {
	id: DeveloperPluginId;
	label: string;
	description: string;
	source: "built-in";
	risk: "read";
	mutations: "locked";
	capabilities: DeveloperPluginCapability[];
};

export type DeveloperPluginEvidence = {
	id: "client" | "context" | "engine" | "containers";
	command: string;
	args: string[];
	supported: boolean;
	success: boolean;
	exitCode: number | null;
	truncated: boolean;
	diagnostic?: string;
};

export type DockerContainerSummary = {
	id: string;
	names: string;
	image: string;
	state: string;
	status: string;
};

export type DockerPluginData = {
	clientVersion: string | null;
	context: string | null;
	engineVersion: string | null;
	containerCounts: {
		total: number | null;
		running: number | null;
		paused: number | null;
		stopped: number | null;
	};
	imageCount: number | null;
	requestedContainerLimit: number;
	returnedContainerCount: number;
	containers: DockerContainerSummary[];
};

export type DockerPluginSnapshot = {
	id: "docker";
	contract: DeveloperPluginContract;
	status: DeveloperPluginRuntimeStatus;
	evidence: DeveloperPluginEvidence[];
	sourceTruncated: boolean;
	resultTruncated: boolean;
	data: DockerPluginData;
};

export type DeveloperPluginSnapshot = DockerPluginSnapshot;
