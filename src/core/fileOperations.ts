import type { ActionPrivilege, ActionRisk } from "./actions";
import type { FileProvider, FileProviderKind } from "./files";

export type FileOperationKind = "copy" | "move" | "delete";

export type FileOperationExecutionPolicy = {
	mode: "disabled" | "local-write";
};

export type FileOperationExecutionPlan = {
	kind: FileOperationKind;
	path: string;
	destination?: string;
	providerKind: FileProviderKind;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	confirmationPhrase: string;
	confirmed: boolean;
	policy: FileOperationExecutionPolicy["mode"];
	status: "blocked" | "ready";
	willExecute: boolean;
	reason: string;
	blockers: string[];
};

export type FileOperationExecutionAudit = {
	kind: FileOperationKind;
	path: string;
	destination?: string;
	providerKind: FileProviderKind;
	status: "blocked" | "completed" | "failed";
	policy: FileOperationExecutionPolicy["mode"];
	confirmed: boolean;
	willExecute: boolean;
	blockers: string[];
	error?: string;
};

export type FileOperationExecutionResult = {
	success: boolean;
	audit: FileOperationExecutionAudit;
	error?: string;
};

export function createFileOperationExecutionPlan(input: {
	kind: FileOperationKind;
	path: string;
	destination?: string;
	providerKind?: FileProviderKind;
	confirmation?: string;
	policy?: FileOperationExecutionPolicy;
}): FileOperationExecutionPlan {
	const providerKind = input.providerKind ?? "local";
	const confirmationPhrase = `${input.kind} file`;
	const source = input.path;
	const destination = input.destination;
	const hasSource = source.trim().length > 0;
	const hasDestination = (destination?.trim().length ?? 0) > 0;
	const confirmed = input.confirmation === confirmationPhrase;
	const blockers = [
		...(hasSource ? [] : ["source-required"]),
		...(input.policy?.mode === "local-write"
			? []
			: ["file-operations-disabled"]),
		...(confirmed ? [] : ["confirmation-required"]),
		...(providerKind === "local" ? [] : ["provider-write-locked"]),
		...(input.kind === "delete" || hasDestination
			? []
			: ["destination-required"]),
		...(destination && destination === source
			? ["source-destination-same"]
			: []),
	];

	return {
		kind: input.kind,
		path: input.path,
		...(input.destination ? { destination: input.destination } : {}),
		providerKind,
		risk: input.kind === "delete" ? "destructive" : "write",
		privilege: "user",
		confirmationPhrase,
		confirmed,
		policy: input.policy?.mode ?? "disabled",
		status: blockers.length ? "blocked" : "ready",
		willExecute: blockers.length === 0,
		reason: blockers[0] ?? "ready",
		blockers,
	};
}

export async function runFileOperationExecutionPlan(
	plan: FileOperationExecutionPlan,
	provider: FileProvider,
): Promise<FileOperationExecutionResult> {
	if (plan.status !== "ready") {
		return {
			success: false,
			audit: createFileOperationExecutionAudit(plan, "blocked"),
			error: `File operation blocked: ${plan.reason}`,
		};
	}

	if (provider.kind !== plan.providerKind) {
		return {
			success: false,
			audit: createFileOperationExecutionAudit(plan, "blocked", [
				"provider-mismatch",
			]),
			error: "File operation blocked: provider-mismatch",
		};
	}

	try {
		if (plan.kind === "delete") {
			if (!provider.remove) throw new Error("remove operation unavailable");
			await provider.remove(plan.path);
		} else if (plan.kind === "copy") {
			if (!provider.copy || !plan.destination) {
				throw new Error("copy operation unavailable");
			}
			await provider.copy(plan.path, plan.destination);
		} else {
			if (!provider.move || !plan.destination) {
				throw new Error("move operation unavailable");
			}
			await provider.move(plan.path, plan.destination);
		}
		return {
			success: true,
			audit: createFileOperationExecutionAudit(plan, "completed"),
		};
	} catch (caught) {
		const error = caught instanceof Error ? caught.message : String(caught);
		return {
			success: false,
			audit: createFileOperationExecutionAudit(plan, "failed", [], error),
			error,
		};
	}
}

export function formatFileOperationExecutionRows(
	plan: FileOperationExecutionPlan,
): string[] {
	return [
		`FILE OPERATION ${plan.kind}`,
		`path ${plan.path}`,
		...(plan.destination ? [`destination ${plan.destination}`] : []),
		`status=${plan.status} policy=${plan.policy} provider=${plan.providerKind}`,
		`confirmed=${plan.confirmed} willExecute=${plan.willExecute} reason=${plan.reason}`,
		`risk=${plan.risk} privilege=${plan.privilege}`,
		...(plan.blockers.length ? [`blockers=${plan.blockers.join(",")}`] : []),
	];
}

function createFileOperationExecutionAudit(
	plan: FileOperationExecutionPlan,
	status: FileOperationExecutionAudit["status"],
	extraBlockers: string[] = [],
	error?: string,
): FileOperationExecutionAudit {
	return {
		kind: plan.kind,
		path: plan.path,
		...(plan.destination ? { destination: plan.destination } : {}),
		providerKind: plan.providerKind,
		status,
		policy: plan.policy,
		confirmed: plan.confirmed,
		willExecute: status === "completed",
		blockers: [...plan.blockers, ...extraBlockers],
		...(error ? { error } : {}),
	};
}
