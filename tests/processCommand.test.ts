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

	test("prints process file snapshot when files option is enabled", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		try {
			await processCommand(
				"12345",
				{ files: true },
				async () => ({
					pid: 12345,
					command: "bun src/bin/picos.ts",
				}),
				async () => ({
					pid: 12345,
					cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
					fileEntries: [
						{
							descriptor: "txt",
							label: "executable",
							path: "/usr/local/bin/bun",
						},
					],
					openFiles: ["/usr/local/bin/bun"],
					rawOutput: "raw",
				}),
			);
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("Files");
		expect(writes.join("\n")).toContain("/usr/local/bin/bun");
	});
});
