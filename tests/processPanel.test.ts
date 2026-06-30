import { describe, expect, test } from "bun:test";
import type { ProcessFileSnapshot } from "../src/core/processes";
import {
	formatProcessWorkspaceRows,
	getProcessFileSelectionCount,
	getSelectedProcessFileRequest,
	getSelectedProcessResourceRequest,
} from "../src/tui/processPanel";

describe("process TUI panel formatting", () => {
	test("formats selected process detail and file snapshot", () => {
		expect(
			formatProcessWorkspaceRows(
				[
					{
						pid: 12345,
						command: "bun src/bin/picos.ts",
						cpu: "2.5",
						memory: "1.1",
					},
				],
				{
					pid: 12345,
					ppid: 1,
					user: "bonjin",
					state: "S",
					cpu: "2.5",
					memory: "1.1",
					elapsed: "01:23",
					command: "bun src/bin/picos.ts",
				},
				{
					pid: 12345,
					cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
					fileEntries: [
						{
							descriptor: "txt",
							label: "executable",
							resourceKind: "file",
							path: "/usr/local/bin/bun",
						},
						{
							descriptor: "1",
							label: "fd",
							resourceKind: "file",
							path: "/tmp/picos.log",
						},
					],
					openFiles: ["/usr/local/bin/bun", "/tmp/picos.log"],
					rawOutput: "raw",
				},
				12,
			),
		).toEqual([
			"SUMMARY processes=1 selected=12345",
			"SNAPSHOT",
			"12345   2.5%   1.1%   bun src/bin/picos.ts",
			"DETAIL pid=12345 ppid=1 user=bonjin state=S",
			"usage cpu=2.5% mem=1.1% elapsed=01:23",
			"command bun src/bin/picos.ts",
			"FILES",
			"> cwd  working-dir /Users/bonjin/Documents/workspace/uulab/picos",
			"  txt  executable  /usr/local/bin/bun",
			"  1    fd          /tmp/picos.log",
		]);
	});

	test("creates selected process file handoff requests", () => {
		const files: ProcessFileSnapshot = {
			pid: 12345,
			cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
			fileEntries: [
				{
					descriptor: "txt",
					label: "executable",
					resourceKind: "file",
					path: "/usr/local/bin/bun",
				},
				{
					descriptor: "1",
					label: "fd",
					resourceKind: "socket",
					path: "localhost:3000",
				},
			],
			openFiles: ["/usr/local/bin/bun", "localhost:3000"],
			rawOutput: "raw",
		};

		expect(getProcessFileSelectionCount(files)).toBe(3);
		expect(getSelectedProcessFileRequest(files, 0)).toEqual({
			path: "/Users/bonjin/Documents/workspace/uulab/picos",
			command: "picos dir /Users/bonjin/Documents/workspace/uulab/picos",
		});
		expect(getSelectedProcessFileRequest(files, 1)).toEqual({
			path: "/usr/local/bin/bun",
			command: "picos type /usr/local/bin/bun",
		});
		expect(getSelectedProcessFileRequest(files, 2)).toBeUndefined();
		expect(getSelectedProcessResourceRequest(files, 2)).toEqual({
			descriptor: "1",
			label: "fd",
			resourceKind: "socket",
			copyText: "localhost:3000",
			summary: "socket 1 fd localhost:3000",
		});
	});

	test("clips process rows to visible height", () => {
		expect(
			formatProcessWorkspaceRows(
				[
					{ pid: 1, command: "init" },
					{ pid: 2, command: "node" },
					{ pid: 3, command: "bun" },
				],
				undefined,
				undefined,
				4,
			),
		).toEqual([
			"SUMMARY processes=3 selected=-",
			"SNAPSHOT",
			"1       -      -      init",
			"↓ 2 more processes",
		]);
	});
});
