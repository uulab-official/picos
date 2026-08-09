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
			await processCommand(
				"12345",
				{},
				{
					readProcessDetail: async () => ({
						pid: 12345,
						ppid: 1,
						user: "bonjin",
						state: "S",
						cpu: "2.5",
						memory: "1.1",
						elapsed: "01:23",
						command: "bun src/bin/picos.ts --dev",
					}),
				},
			);
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("PID:      12345");
		expect(writes.join("\n")).toContain("Command:  bun src/bin/picos.ts --dev");
	});

	// Replaces a test that covered the removed union-typed second parameter, where
	// a reader could be passed in the options position. That is now structurally
	// impossible, so this covers a real branch instead: the file snapshot reader is
	// only consulted when `files` is requested.
	test("skips the file snapshot reader unless files is requested", async () => {
		const writes: string[] = [];
		const originalLog = console.log;
		console.log = (value?: unknown) => {
			writes.push(String(value));
		};
		let fileReaderCalled = false;
		try {
			await processCommand(
				"12345",
				{},
				{
					readProcessDetail: async () => ({ pid: 12345, command: "zsh" }),
					readProcessFileSnapshot: async () => {
						fileReaderCalled = true;
						return undefined;
					},
				},
			);
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("Command:  zsh");
		expect(fileReaderCalled).toBeFalse();
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
				{
					readProcessDetail: async () => ({
						pid: 12345,
						command: "bun src/bin/picos.ts",
					}),
					readProcessFileSnapshot: async () => ({
						pid: 12345,
						cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
						fileEntries: [
							{
								descriptor: "txt",
								label: "executable",
								resourceKind: "file",
								path: "/usr/local/bin/bun",
							},
						],
						openFiles: ["/usr/local/bin/bun"],
						rawOutput: "raw",
					}),
				},
			);
		} finally {
			console.log = originalLog;
		}

		expect(writes.join("\n")).toContain("Files");
		expect(writes.join("\n")).toContain("/usr/local/bin/bun");
	});
});
