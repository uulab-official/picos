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
});
