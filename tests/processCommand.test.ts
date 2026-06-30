import { describe, expect, test } from "bun:test";
import { processCommand } from "../src/cli/commands/process";

describe("process CLI command", () => {
	test("prints process detail from an injected reader", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await processCommand("12345", async () => ({
				pid: 12345,
				ppid: 1,
				user: "bonjin",
				state: "S",
				cpu: "2.5",
				memory: "1.1",
				elapsed: "01:23",
				command: "bun src/bin/picos.ts --dev",
			}));
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PID:      12345");
		expect(writes.join("\n")).toContain("Command:  bun src/bin/picos.ts --dev");
	});

	test("ignores cac options when a reader is provided separately", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await processCommand("12345", {}, async () => ({
				pid: 12345,
				command: "zsh",
			}));
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("Command:  zsh");
	});
});
