import type { FileProvider, FileProviderKind } from "./files";
import type { EditorWritePreview } from "./fileWritePreview";

export type EditorSaveExecutionPolicy = {
	mode: "disabled" | "local-write";
};

export type EditorSaveExecutionPlan = {
	kind: "editor-save-execution";
	path: string;
	providerKind: FileProviderKind;
	status: "blocked" | "ready";
	policy: EditorSaveExecutionPolicy["mode"];
	confirmed: boolean;
	willExecute: boolean;
	changed: boolean;
	reason: string;
	blockers: string[];
	nextContent: string;
};

export type EditorSaveExecutionAudit = {
	path: string;
	status: "blocked" | "saved" | "save-failed";
	policy: EditorSaveExecutionPolicy["mode"];
	providerKind: FileProviderKind;
	confirmed: boolean;
	willExecute: boolean;
	changed: boolean;
	blockers: string[];
	error?: string;
};

export type EditorSaveExecutionResult = {
	success: boolean;
	audit: EditorSaveExecutionAudit;
	error?: string;
};

export const defaultEditorSaveExecutionPolicy: EditorSaveExecutionPolicy = {
	mode: "disabled",
};

export function createEditorSaveExecutionPlan(input: {
	preview: EditorWritePreview;
	confirmed: boolean;
	policy?: EditorSaveExecutionPolicy;
	nextContent: string;
}): EditorSaveExecutionPlan {
	const policy = input.policy ?? defaultEditorSaveExecutionPolicy;
	const blockers = getEditorSaveExecutionBlockers(
		input.preview,
		input.confirmed,
		policy,
	);

	return {
		kind: "editor-save-execution",
		path: input.preview.path,
		providerKind: input.preview.providerKind,
		status: blockers.length ? "blocked" : "ready",
		policy: policy.mode,
		confirmed: input.confirmed,
		willExecute: blockers.length === 0,
		changed: input.preview.changed,
		reason: blockers[0] ?? "ready",
		blockers,
		nextContent: input.nextContent,
	};
}

export async function runEditorSaveExecutionPlan(
	plan: EditorSaveExecutionPlan,
	provider: FileProvider,
): Promise<EditorSaveExecutionResult> {
	if (plan.status !== "ready") {
		return {
			success: false,
			audit: createEditorSaveExecutionAudit(plan, "blocked"),
			error: `Editor save blocked: ${plan.reason}`,
		};
	}

	if (provider.kind !== plan.providerKind) {
		const audit = createEditorSaveExecutionAudit(plan, "blocked", [
			"provider-mismatch",
		]);
		return {
			success: false,
			audit,
			error: "Editor save blocked: provider-mismatch",
		};
	}

	try {
		await provider.write(plan.path, plan.nextContent);
		return {
			success: true,
			audit: createEditorSaveExecutionAudit(plan, "saved"),
		};
	} catch (caught) {
		const error = caught instanceof Error ? caught.message : String(caught);
		return {
			success: false,
			audit: createEditorSaveExecutionAudit(plan, "save-failed", [], error),
			error,
		};
	}
}

export function formatEditorSaveExecutionAuditMessage(
	planOrAudit: EditorSaveExecutionPlan | EditorSaveExecutionAudit,
): string {
	const audit =
		"kind" in planOrAudit
			? createEditorSaveExecutionAudit(planOrAudit, "blocked")
			: planOrAudit;

	return [
		`editor save ${audit.path}`,
		`status=${audit.status}`,
		`policy=${audit.policy}`,
		`provider=${audit.providerKind}`,
		`confirmed=${audit.confirmed}`,
		`willExecute=${audit.willExecute}`,
		`changed=${audit.changed}`,
		audit.blockers.length ? `blockers=${audit.blockers.join(",")}` : "",
		audit.error ? `error=${audit.error}` : "",
	]
		.filter(Boolean)
		.join(" ");
}

export function formatEditorSaveExecutionRows(
	plan: EditorSaveExecutionPlan,
): string[] {
	return [
		"EDITOR SAVE EXECUTION",
		`path ${plan.path}`,
		`status=${plan.status} policy=${plan.policy} provider=${plan.providerKind} confirmed=${plan.confirmed}`,
		`willExecute=${plan.willExecute} reason=${plan.reason}`,
		`changed=${plan.changed}`,
		...(plan.blockers.length ? [`blockers=${plan.blockers.join(",")}`] : []),
	];
}

function getEditorSaveExecutionBlockers(
	preview: EditorWritePreview,
	confirmed: boolean,
	policy: EditorSaveExecutionPolicy,
): string[] {
	if (policy.mode === "disabled") {
		return ["editor-save-disabled"];
	}

	return [
		...(confirmed ? [] : ["confirmation-required"]),
		...(preview.changed ? [] : ["no-content-changes"]),
		...(preview.providerKind === "local"
			? []
			: ["remote-provider-write-locked"]),
	];
}

function createEditorSaveExecutionAudit(
	plan: EditorSaveExecutionPlan,
	status: EditorSaveExecutionAudit["status"],
	extraBlockers: string[] = [],
	error?: string,
): EditorSaveExecutionAudit {
	const blockers = [...plan.blockers, ...extraBlockers];
	return {
		path: plan.path,
		status,
		policy: plan.policy,
		providerKind: plan.providerKind,
		confirmed: plan.confirmed,
		willExecute: status === "saved" ? true : plan.willExecute,
		changed: plan.changed,
		blockers,
		...(error ? { error } : {}),
	};
}
