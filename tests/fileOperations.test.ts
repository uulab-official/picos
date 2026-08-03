import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import {
	createFileOperationExecutionPlan,
	formatFileOperationExecutionRows,
	runFileOperationExecutionPlan,
} from "../src/core/fileOperations";
import { createLocalFileProvider } from "../src/core/files";

let root = "";

beforeEach(async () => {
	root = await mkdtemp(join(process.env.TMPDIR ?? "/tmp", "picos-ops-"));
	await mkdir(join(root, "source-dir"));
	await Bun.write(join(root, "source.txt"), "source\n");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("local file operation execution", () => {
	test("keeps operations locked by default even with exact confirmation", async () => {
		const plan = createFileOperationExecutionPlan({
			kind: "copy",
			path: join(root, "source.txt"),
			destination: join(root, "copy.txt"),
			confirmation: "copy file",
		});
		const result = await runFileOperationExecutionPlan(
			plan,
			createLocalFileProvider(root, { allowWrites: true }),
		);

		expect(plan).toMatchObject({
			status: "blocked",
			willExecute: false,
			blockers: ["file-operations-disabled"],
		});
		expect(result.success).toBe(false);
		expect(await stat(join(root, "source.txt"))).toBeTruthy();
	});

	test("executes confirmed local copy, move, and delete operations", async () => {
		const provider = createLocalFileProvider(root, { allowWrites: true });
		const copy = createFileOperationExecutionPlan({
			kind: "copy",
			path: join(root, "source.txt"),
			destination: join(root, "copy.txt"),
			confirmation: "copy file",
			policy: { mode: "local-write" },
		});
		const move = createFileOperationExecutionPlan({
			kind: "move",
			path: join(root, "copy.txt"),
			destination: join(root, "moved.txt"),
			confirmation: "move file",
			policy: { mode: "local-write" },
		});
		const remove = createFileOperationExecutionPlan({
			kind: "delete",
			path: join(root, "moved.txt"),
			confirmation: "delete file",
			policy: { mode: "local-write" },
		});

		expect((await runFileOperationExecutionPlan(copy, provider)).success).toBe(
			true,
		);
		expect(await readFile(join(root, "copy.txt"), "utf8")).toBe("source\n");
		expect((await runFileOperationExecutionPlan(move, provider)).success).toBe(
			true,
		);
		expect((await runFileOperationExecutionPlan(remove, provider)).success).toBe(
			true,
		);
		expect(formatFileOperationExecutionRows(copy)).toContain(
			"confirmed=true willExecute=true reason=ready",
		);
	});

	test("keeps provider writes locked and refuses destination replacement", async () => {
		const lockedProvider = createLocalFileProvider(root);
		const lockedPlan = createFileOperationExecutionPlan({
			kind: "copy",
			path: join(root, "source.txt"),
			destination: join(root, "locked-copy.txt"),
			confirmation: "copy file",
			policy: { mode: "local-write" },
		});
		const lockedResult = await runFileOperationExecutionPlan(
			lockedPlan,
			lockedProvider,
		);
		expect(lockedResult.success).toBe(false);
		expect(lockedResult.audit.status).toBe("failed");
		expect(
			await stat(join(root, "locked-copy.txt")).catch(() => undefined),
		).toBe(
			undefined,
		);

		await Bun.write(join(root, "existing.txt"), "keep\n");
		const provider = createLocalFileProvider(root, { allowWrites: true });
		const plan = createFileOperationExecutionPlan({
			kind: "move",
			path: join(root, "source.txt"),
			destination: join(root, "existing.txt"),
			confirmation: "move file",
			policy: { mode: "local-write" },
		});
		const result = await runFileOperationExecutionPlan(plan, provider);

		expect(result.success).toBe(false);
		expect(result.audit.status).toBe("failed");
		expect(await readFile(join(root, "existing.txt"), "utf8")).toBe("keep\n");
	});

	test("does not delete the provider root", async () => {
		const provider = createLocalFileProvider(root, { allowWrites: true });
		if (!provider.remove) throw new Error("remove operation unavailable");

		await expect(provider.remove(root)).rejects.toThrow(
			"provider or filesystem root",
		);
	});

	test("blocks unsafe or incomplete operation plans", () => {
		expect(
			createFileOperationExecutionPlan({
				kind: "delete",
				path: " ",
				confirmation: "delete file",
				policy: { mode: "local-write" },
			}).blockers,
		).toEqual(["source-required"]);
		expect(
			createFileOperationExecutionPlan({
				kind: "copy",
				path: "/workspace/source.txt",
				confirmation: "copy file",
				policy: { mode: "local-write" },
			}).blockers,
		).toEqual(["destination-required"]);
		expect(
			createFileOperationExecutionPlan({
				kind: "move",
				path: "/workspace/source.txt",
				destination: "/workspace/source.txt",
				confirmation: "move file",
				policy: { mode: "local-write" },
			}).blockers,
		).toEqual(["source-destination-same"]);
	});
});
