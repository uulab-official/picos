import { describe, expect, test } from "bun:test";
import type { ProcessFileSnapshot } from "../src/core/processes";
import {
	classifyProcessInspectionFailure,
	classifyProcessInspectionPublication,
	formatProcessWorkspaceRows,
	getProcessFileSelectionCount,
	getSelectedProcessClipboardPreview,
	getSelectedProcessFileRequest,
	getSelectedProcessResourceRequest,
	prepareProcessPanelInput,
	prepareSelectedProcessInspection,
	prepareSelectedProcessResourceAction,
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
		expect(getSelectedProcessClipboardPreview(files, 2)).toEqual({
			source: "process-resource",
			label: "socket 1 fd",
			copyText: "localhost:3000",
			confirmation: "copy",
			enabled: false,
			reason: "Clipboard writes require explicit confirmation plumbing.",
		});
		expect(
			formatProcessWorkspaceRows(
				[],
				{ pid: 12345, command: "node" },
				files,
				14,
				2,
				true,
			),
		).toContain("CLIPBOARD PREVIEW process-resource");
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

describe("process inspection transitions", () => {
	const request = { pid: "12345", command: "picos process 12345 --files" };

	test("rejects inspection when the selected endpoint has no process", () => {
		expect(
			prepareSelectedProcessInspection({
				screen: "connections",
				connectionRequest: undefined,
				portRequest: request,
			}),
		).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "no process PID available for selected endpoint",
			},
		});
		expect(
			prepareSelectedProcessInspection({
				screen: "ports",
				connectionRequest: undefined,
				portRequest: request,
			}),
		).toEqual({ kind: "inspect", request });
	});

	test("publishes detail while identifying an unsupported file collector", () => {
		const transition = classifyProcessInspectionPublication({
			currentToken: 4,
			requestToken: 4,
			request,
			detail: { pid: 12345, command: "bun worker.ts" },
			fileResult: {
				source: {
					key: "process-files",
					command: null,
					args: [],
					supported: false,
					success: null,
					exitCode: null,
					truncated: false,
					totalCount: 0,
				},
			},
		});

		expect(transition).toEqual({
			kind: "publish",
			detail: { pid: 12345, command: "bun worker.ts" },
			files: undefined,
			fileEvidenceIssue: {
				status: "unavailable",
				pid: "12345",
				reason: "collector unsupported",
			},
			selectedFileIndex: 0,
			clipboardPreview: false,
			notice: {
				level: "warn",
				message:
					"process inspected picos process 12345 --files; file evidence unsupported",
			},
		});
	});

	test("does not publish a superseded inspection batch", () => {
		expect(
			classifyProcessInspectionPublication({
				currentToken: 5,
				requestToken: 4,
				request,
				detail: { pid: 12345, command: "bun worker.ts" },
				fileResult: {
					snapshot: {
						pid: 12345,
						fileEntries: [],
						openFiles: [],
						rawOutput: "",
					},
					source: {
						key: "process-files",
						command: "lsof",
						args: [],
						supported: true,
						success: true,
						exitCode: 0,
						truncated: false,
						totalCount: 0,
					},
				},
			}),
		).toEqual({
			kind: "stale",
			notice: {
				level: "info",
				message: "process inspection superseded picos process 12345 --files",
			},
		});
	});

	test("keeps stale inspection failures as history without current error state", () => {
		expect(
			classifyProcessInspectionFailure({
				currentToken: 5,
				requestToken: 4,
				request,
				error: new Error("detail lookup failed"),
			}),
		).toEqual({
			publishCurrent: false,
			fileEvidenceIssue: undefined,
			notice: { level: "fail", message: "detail lookup failed" },
		});
	});
});

describe("process workspace input transitions", () => {
	const files: ProcessFileSnapshot = {
		pid: 12345,
		cwd: "/srv/app",
		fileEntries: [
			{
				descriptor: "1",
				label: "socket",
				resourceKind: "socket",
				path: "localhost:3000",
			},
		],
		openFiles: ["localhost:3000"],
		rawOutput: "",
	};

	test("owns selected resource guards and exact notices", () => {
		expect(prepareSelectedProcessResourceAction(undefined, 0)).toEqual({
			kind: "notice",
			notice: {
				level: "warn",
				message: "selected process file is not openable",
			},
		});
		expect(prepareSelectedProcessResourceAction(files, 1)).toEqual({
			kind: "resource",
			resource: {
				descriptor: "1",
				label: "socket",
				resourceKind: "socket",
				copyText: "localhost:3000",
				summary: "socket 1 socket localhost:3000",
			},
			notice: {
				level: "info",
				message: "process resource socket 1 socket localhost:3000",
			},
		});
	});

	test("repairs process resource selection through panel input", () => {
		expect(
			prepareProcessPanelInput({
				input: "j",
				files,
				selectedIndex: 99,
			}),
		).toEqual({
			kind: "selection",
			selectedIndex: 0,
			clipboardPreview: false,
		});
		expect(
			prepareProcessPanelInput({
				input: "c",
				files: undefined,
				selectedIndex: 0,
			}),
		).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no process resource selected" },
		});
	});
});
