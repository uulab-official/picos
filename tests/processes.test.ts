import { describe, expect, test } from "bun:test";
import {
	buildProcessDetailCommand,
	buildProcessFilesCommand,
	formatProcessDetail,
	formatProcessFileSnapshot,
	parseLsofProcessFiles,
	parsePosixProcessDetail,
	parsePsOutput,
	parseWindowsProcessDetail,
	validateProcessId,
} from "../src/core/processes";

describe("process inventory", () => {
	test("parses bounded ps output", () => {
		const output = [
			"  PID  %CPU %MEM COMMAND",
			"  123   1.2  0.5 bun src/bin/picos.ts",
			"  456   0.0  0.1 zsh",
		].join("\n");

		expect(parsePsOutput(output, 1)).toEqual([
			{
				pid: 123,
				cpu: "1.2",
				memory: "0.5",
				command: "bun src/bin/picos.ts",
			},
		]);
	});

	test("validates process ids before building commands", () => {
		expect(validateProcessId("12345")).toBe(12345);
		expect(() => validateProcessId("0")).toThrow("Invalid process id");
		expect(() => validateProcessId("12;rm")).toThrow("Invalid process id");
	});

	test("builds platform process detail commands", () => {
		expect(buildProcessDetailCommand(12345, "darwin")).toEqual({
			command: "ps",
			args: [
				"-p",
				"12345",
				"-o",
				"pid=,ppid=,user=,stat=,pcpu=,pmem=,etime=,command=",
			],
		});
		expect(buildProcessDetailCommand(12345, "linux")).toEqual({
			command: "ps",
			args: [
				"-p",
				"12345",
				"-o",
				"pid=,ppid=,user=,stat=,pcpu=,pmem=,etime=,command=",
			],
		});
		expect(buildProcessDetailCommand(12345, "win32")).toEqual({
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				'Get-CimInstance Win32_Process -Filter "ProcessId = 12345" | Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath,CreationDate | ConvertTo-Json -Compress',
			],
		});
	});

	test("parses POSIX process detail output", () => {
		const output = "12345 1 bonjin S 2.5 1.1 01:23 bun src/bin/picos.ts --dev";

		expect(parsePosixProcessDetail(output)).toEqual({
			pid: 12345,
			ppid: 1,
			user: "bonjin",
			state: "S",
			cpu: "2.5",
			memory: "1.1",
			elapsed: "01:23",
			command: "bun src/bin/picos.ts --dev",
		});
	});

	test("parses Windows process detail JSON", () => {
		expect(
			parseWindowsProcessDetail(
				JSON.stringify({
					ProcessId: 12345,
					ParentProcessId: 1,
					Name: "node.exe",
					CommandLine: "node server.js",
					ExecutablePath: "C:\\\\Program Files\\\\nodejs\\\\node.exe",
					CreationDate: "20260630100000.000000+540",
				}),
			),
		).toEqual({
			pid: 12345,
			ppid: 1,
			name: "node.exe",
			command: "node server.js",
			executablePath: "C:\\\\Program Files\\\\nodejs\\\\node.exe",
			started: "20260630100000.000000+540",
		});
	});

	test("formats process detail for CLI use", () => {
		expect(
			formatProcessDetail({
				pid: 12345,
				ppid: 1,
				user: "bonjin",
				state: "S",
				cpu: "2.5",
				memory: "1.1",
				elapsed: "01:23",
				command: "bun src/bin/picos.ts --dev",
			}),
		).toContain("Command:  bun src/bin/picos.ts --dev");
	});

	test("builds POSIX process file snapshot commands", () => {
		expect(buildProcessFilesCommand(12345, "darwin")).toEqual({
			command: "lsof",
			args: ["-a", "-p", "12345", "-Fn", "-w"],
		});
		expect(buildProcessFilesCommand(12345, "linux")).toEqual({
			command: "lsof",
			args: ["-a", "-p", "12345", "-Fn", "-w"],
		});
		expect(buildProcessFilesCommand(12345, "win32")).toBeUndefined();
	});

	test("parses lsof process files with cwd first", () => {
		const output = [
			"p12345",
			"fcwd",
			"n/Users/bonjin/Documents/workspace/uulab/picos",
			"ftxt",
			"n/usr/local/bin/bun",
			"f1",
			"n/Users/bonjin/Documents/workspace/uulab/picos/README.md",
			"f2",
			"n/Users/bonjin/Documents/workspace/uulab/picos/README.md",
		].join("\n");

		expect(parseLsofProcessFiles(output, 3)).toEqual({
			pid: 12345,
			cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
			openFiles: [
				"/usr/local/bin/bun",
				"/Users/bonjin/Documents/workspace/uulab/picos/README.md",
			],
			rawOutput: output,
		});
	});

	test("formats process file snapshots", () => {
		expect(
			formatProcessFileSnapshot({
				pid: 12345,
				cwd: "/Users/bonjin/Documents/workspace/uulab/picos",
				openFiles: ["/usr/local/bin/bun"],
				rawOutput: "raw",
			}),
		).toContain("CWD:      /Users/bonjin/Documents/workspace/uulab/picos");
	});
});
