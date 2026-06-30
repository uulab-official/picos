import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	formatHandoffIndexRows,
	getSelectedHandoffIndexItem,
	readHandoffIndex,
} from "../src/core/handoffIndex";

describe("handoff index", () => {
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
			4,
		);

		expect(rows).toEqual([
			"HANDOFFS 2 base=/tmp/picos",
			"  endpoint ports raw 2026-06-30T13:00:00.000Z ports raw output",
			"> route routes diagnostics 2026-06-30T12:00:00.000Z route diagnostics",
			"open target=/tmp/picos/routes/picos-routes-diagnostics.md",
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
