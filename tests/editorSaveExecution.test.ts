import { describe, expect, test } from "bun:test";
import {
	createEditorSaveExecutionPlan,
	defaultEditorSaveExecutionPolicy,
	formatEditorSaveExecutionAuditMessage,
	formatEditorSaveExecutionRows,
	runEditorSaveExecutionPlan,
} from "../src/core/editorSaveExecution";
import type { FileProvider } from "../src/core/files";
import { createEditorWritePreview } from "../src/core/fileWritePreview";

function createProvider(kind: FileProvider["kind"] = "local"): FileProvider {
	const writes: Array<{ path: string; content: string }> = [];
	return {
		kind,
		async pwd() {
			return "/workspace/picos";
		},
		async list() {
			return [];
		},
		async read(path) {
			return {
				path,
				content: "",
				encoding: "utf8",
				truncated: false,
			};
		},
		async write(path, content) {
			writes.push({ path, content });
		},
		async stat(path) {
			return {
				name: "README.md",
				path,
				type: "file",
				readonly: false,
			};
		},
		writes,
	} as FileProvider & { writes: Array<{ path: string; content: string }> };
}

describe("editor save execution", () => {
	test("blocks editor saves by default even after exact confirmation", () => {
		const preview = createEditorWritePreview({
			path: "/workspace/picos/README.md",
			originalContent: "old\n",
			nextContent: "new\n",
		});

		const plan = createEditorSaveExecutionPlan({
			preview,
			confirmed: true,
			policy: defaultEditorSaveExecutionPolicy,
			nextContent: "new\n",
		});

		expect(plan).toMatchObject({
			status: "blocked",
			policy: "disabled",
			confirmed: true,
			willExecute: false,
			blockers: ["editor-save-disabled"],
		});
		expect(formatEditorSaveExecutionRows(plan)).toContain(
			"willExecute=false reason=editor-save-disabled",
		);
		expect(formatEditorSaveExecutionAuditMessage(plan)).toBe(
			"editor save /workspace/picos/README.md status=blocked policy=disabled provider=local confirmed=true willExecute=false changed=true blockers=editor-save-disabled",
		);
	});

	test("blocks unchanged and remote editor saves before provider writes", () => {
		const unchanged = createEditorWritePreview({
			path: "/workspace/picos/README.md",
			originalContent: "same\n",
			nextContent: "same\n",
		});
		const remote = createEditorWritePreview({
			path: "/srv/app/README.md",
			originalContent: "old\n",
			nextContent: "new\n",
			providerKind: "sftp",
		});

		expect(
			createEditorSaveExecutionPlan({
				preview: unchanged,
				confirmed: true,
				policy: { mode: "local-write" },
				nextContent: "same\n",
			}).blockers,
		).toEqual(["no-content-changes"]);
		expect(
			createEditorSaveExecutionPlan({
				preview: remote,
				confirmed: true,
				policy: { mode: "local-write" },
				nextContent: "new\n",
			}).blockers,
		).toEqual(["remote-provider-write-locked"]);
	});

	test("executes confirmed local editor saves through the provider and records audit", async () => {
		const preview = createEditorWritePreview({
			path: "/workspace/picos/README.md",
			originalContent: "old\n",
			nextContent: "new\n",
		});
		const plan = createEditorSaveExecutionPlan({
			preview,
			confirmed: true,
			policy: { mode: "local-write" },
			nextContent: "new\n",
		});
		const provider = createProvider("local") as FileProvider & {
			writes: Array<{ path: string; content: string }>;
		};

		const result = await runEditorSaveExecutionPlan(plan, provider);

		expect(plan.status).toBe("ready");
		expect(result.success).toBe(true);
		expect(provider.writes).toEqual([
			{ path: "/workspace/picos/README.md", content: "new\n" },
		]);
		expect(result.audit).toMatchObject({
			status: "saved",
			policy: "local-write",
			providerKind: "local",
			confirmed: true,
			willExecute: true,
		});
	});
});
