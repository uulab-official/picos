import { describe, expect, test } from "bun:test";
import { handoffsCommand } from "../src/cli/commands/handoffs";

describe("handoffs CLI command", () => {
	test("prints indexed route and endpoint handoff rows", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await handoffsCommand({
				index: {
					baseDir: "/tmp/picos",
					items: [
						{
							source: "endpoint-handoff",
							kind: "connections",
							view: "raw",
							label: "connections raw output",
							command: "netstat -an",
							generatedAt: "2026-06-30T13:00:00.000Z",
							path: "/tmp/picos/endpoints/picos-connections-raw.md",
						},
					],
				},
			});
		} finally {
			console.log = originalLog;
		}

		const output = writes.join("\n");
		expect(output).toContain("HANDOFFS 1 base=/tmp/picos");
		expect(output).toContain(
			"> endpoint connections raw 2026-06-30T13:00:00.000Z connections raw output",
		);
		expect(output).toContain(
			"open target=/tmp/picos/endpoints/picos-connections-raw.md",
		);
	});

	test("prints archive results for a requested handoff file", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await handoffsCommand({
				archive: "/tmp/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md",
				baseDir: "/tmp/picos",
				archiver: async (baseDir, targetPath) => ({
					status: "archived",
					sourcePath: targetPath,
					archivedPath:
						"/tmp/picos/archive/routes/picos-routes-raw-2026-06-30T120000000Z.md",
					message: `archived under ${baseDir}`,
				}),
			});
		} finally {
			console.log = originalLog;
		}

		const output = writes.join("\n");
		expect(output).toContain("HANDOFF ARCHIVE archived");
		expect(output).toContain(
			"source=/tmp/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md",
		);
		expect(output).toContain(
			"archive=/tmp/picos/archive/routes/picos-routes-raw-2026-06-30T120000000Z.md",
		);
	});
});
