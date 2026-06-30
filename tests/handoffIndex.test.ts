import { describe, expect, test } from "bun:test";
import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	archiveHandoffFile,
	formatHandoffIndexRows,
	getSelectedHandoffIndexItem,
	readHandoffIndex,
} from "../src/core/handoffIndex";

describe("handoff index", () => {
	test("archives only picos-owned handoff files under the config tree", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-handoff-archive-"));
		try {
			await mkdir(join(root, "routes"), { recursive: true });
			const handoffPath = join(
				root,
				"routes",
				"picos-routes-raw-2026-06-30T120000000Z.md",
			);
			await writeFile(
				handoffPath,
				[
					"# picos route handoff",
					"generatedAt=2026-06-30T12:00:00.000Z",
					"view=raw",
					"",
				].join("\n"),
			);

			const result = await archiveHandoffFile(root, handoffPath);

			expect(result).toMatchObject({
				status: "archived",
				sourcePath: handoffPath,
			});
			expect(result.archivedPath).toContain(join(root, "archive", "routes"));
			expect(await readFile(result.archivedPath, "utf8")).toContain("view=raw");
			expect(await pathExists(handoffPath)).toBe(false);
			expect((await readHandoffIndex(root)).items).toHaveLength(0);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("refuses to archive files outside picos handoff directories", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-handoff-archive-"));
		const outside = await mkdtemp(join(tmpdir(), "picos-outside-"));
		try {
			const outsidePath = join(
				outside,
				"picos-routes-raw-2026-06-30T120000000Z.md",
			);
			await writeFile(outsidePath, "generatedAt=2026-06-30T12:00:00.000Z\n");

			const result = await archiveHandoffFile(root, outsidePath);

			expect(result).toEqual({
				status: "blocked",
				sourcePath: outsidePath,
				archivedPath: "",
				message: "handoff archive is limited to picos-owned handoff files",
			});
			expect(await pathExists(outsidePath)).toBe(true);
		} finally {
			await rm(root, { recursive: true, force: true });
			await rm(outside, { recursive: true, force: true });
		}
	});

	test("lists route and endpoint handoff files newest first", async () => {
		const root = await mkdtemp(join(tmpdir(), "picos-handoff-index-"));
		try {
			await mkdir(join(root, "routes"), { recursive: true });
			await mkdir(join(root, "endpoints"), { recursive: true });
			await writeFile(
				join(root, "routes", "picos-routes-raw-2026-06-30T120000000Z.md"),
				[
					"# picos route handoff",
					"generatedAt=2026-06-30T12:00:00.000Z",
					"view=raw",
					"label=route raw output",
					"command=netstat -rn",
					"",
				].join("\n"),
			);
			await writeFile(
				join(
					root,
					"endpoints",
					"picos-connections-detail-2026-06-30T130000000Z.md",
				),
				[
					"# picos endpoint handoff",
					"generatedAt=2026-06-30T13:00:00.000Z",
					"kind=connections",
					"view=detail",
					"label=connections summary",
					"command=netstat -an",
					"",
				].join("\n"),
			);
			await writeFile(join(root, "routes", "notes.md"), "ignore me");

			const index = await readHandoffIndex(root);

			expect(index.items.map((item) => item.label)).toEqual([
				"connections summary",
				"route raw output",
			]);
			expect(index.items[0]).toMatchObject({
				source: "endpoint-handoff",
				kind: "connections",
				view: "detail",
				command: "netstat -an",
			});
			expect(index.items[1]).toMatchObject({
				source: "route-handoff",
				kind: "routes",
				view: "raw",
				command: "netstat -rn",
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("formats selected handoff index rows", () => {
		const rows = formatHandoffIndexRows(
			{
				baseDir: "/tmp/picos",
				items: [
					{
						source: "endpoint-handoff",
						kind: "ports",
						view: "raw",
						label: "ports raw output",
						command: "lsof -nP",
						generatedAt: "2026-06-30T13:00:00.000Z",
						path: "/tmp/picos/endpoints/picos-ports-raw.md",
					},
					{
						source: "route-handoff",
						kind: "routes",
						view: "diagnostics",
						label: "route diagnostics",
						command: "netstat -rn",
						generatedAt: "2026-06-30T12:00:00.000Z",
						path: "/tmp/picos/routes/picos-routes-diagnostics.md",
					},
				],
			},
			1,
			5,
		);

		expect(rows).toEqual([
			"HANDOFFS 2 base=/tmp/picos",
			"  endpoint ports raw 2026-06-30T13:00:00.000Z ports raw output",
			"> route routes diagnostics 2026-06-30T12:00:00.000Z route diagnostics",
			"open target=/tmp/picos/routes/picos-routes-diagnostics.md",
			"archive target=/tmp/picos/routes/picos-routes-diagnostics.md",
		]);
		expect(
			getSelectedHandoffIndexItem(
				{
					baseDir: "/tmp/picos",
					items: [
						{
							source: "route-handoff",
							kind: "routes",
							view: "raw",
							label: "route raw output",
							command: "netstat -rn",
							generatedAt: "2026-06-30T12:00:00.000Z",
							path: "/tmp/picos/routes/picos-routes-raw.md",
						},
					],
				},
				99,
			)?.label,
		).toBe("route raw output");
	});
});

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
