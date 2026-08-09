import { describe, expect, test } from "bun:test";
import {
	buildProcessDetailCommand,
	buildProcessFilesCommand,
	detectProcessIdReuse,
	formatProcessDetail,
	formatProcessFileSnapshot,
	getProcessDetailWithSource,
	getProcessFileSnapshotWithSource,
	parseLsofProcessFiles,
	parsePosixProcessDetail,
	parseProcessElapsedMs,
	parseProcessStartedAtMs,
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

	test("returns process detail with source evidence", async () => {
		const result = await getProcessDetailWithSource(
			"12345",
			"linux",
			async (command, args) => ({
				command,
				args,
				stdout: "12345 1 user S 2.5 1.1 01:23 bun app.ts",
				stderr: "",
				exitCode: 0,
				success: true,
			}),
		);

		expect(result.detail?.pid).toBe(12345);
		expect(result.source).toMatchObject({
			key: "process-detail",
			command: "ps",
			supported: true,
			success: true,
			exitCode: 0,
			totalCount: 1,
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

	test("distinguishes unsupported and failed process file collectors", async () => {
		const unsupported = await getProcessFileSnapshotWithSource(
			"12345",
			20,
			"win32",
		);
		expect(unsupported).toEqual({
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
		});

		const failed = await getProcessFileSnapshotWithSource(
			"12345",
			20,
			"linux",
			async (command, args) => ({
				command,
				args,
				stdout: "",
				stderr: "lsof unavailable",
				exitCode: 127,
				success: false,
			}),
		);
		expect(failed.source).toMatchObject({
			supported: true,
			success: false,
			exitCode: 127,
		});
		expect(failed.snapshot).toBeUndefined();
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
			totalCount: 2,
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
					path: "/Users/bonjin/Documents/workspace/uulab/picos/README.md",
				},
			],
			openFiles: [
				"/usr/local/bin/bun",
				"/Users/bonjin/Documents/workspace/uulab/picos/README.md",
			],
			rawOutput: output,
		});
	});

	test("keeps lsof file descriptors for labeled process file navigation", () => {
		const output = [
			"p12345",
			"fcwd",
			"n/Users/bonjin/Documents/workspace/uulab/picos",
			"ftxt",
			"n/usr/local/bin/bun",
			"fmem",
			"n/usr/lib/libSystem.B.dylib",
			"f1",
			"n/Users/bonjin/Documents/workspace/uulab/picos/picos.log",
		].join("\n");

		expect(parseLsofProcessFiles(output, 3)?.fileEntries).toEqual([
			{
				descriptor: "txt",
				label: "executable",
				resourceKind: "file",
				path: "/usr/local/bin/bun",
			},
			{
				descriptor: "mem",
				label: "mapped",
				resourceKind: "file",
				path: "/usr/lib/libSystem.B.dylib",
			},
			{
				descriptor: "1",
				label: "fd",
				resourceKind: "file",
				path: "/Users/bonjin/Documents/workspace/uulab/picos/picos.log",
			},
		]);
	});

	test("counts resources beyond the returned process file limit", () => {
		const snapshot = parseLsofProcessFiles(
			["p12345", "f1", "n/a", "f2", "n/b", "f3", "n/c"].join("\n"),
			2,
		);

		expect(snapshot?.totalCount).toBe(3);
		expect(snapshot?.fileEntries).toHaveLength(2);
	});

	test("classifies lsof sockets pipes and unix resources separately from files", () => {
		const output = [
			"p12345",
			"f3",
			"nTCP 127.0.0.1:3000->127.0.0.1:52000 (ESTABLISHED)",
			"f4",
			"npipe",
			"f5",
			"n/var/run/docker.sock",
			"f6",
			"nunix 0x123456789",
		].join("\n");

		expect(parseLsofProcessFiles(output, 10)?.fileEntries).toEqual([
			{
				descriptor: "3",
				label: "socket",
				resourceKind: "socket",
				path: "TCP 127.0.0.1:3000->127.0.0.1:52000 (ESTABLISHED)",
			},
			{
				descriptor: "4",
				label: "pipe",
				resourceKind: "pipe",
				path: "pipe",
			},
			{
				descriptor: "5",
				label: "socket-file",
				resourceKind: "file",
				path: "/var/run/docker.sock",
			},
			{
				descriptor: "6",
				label: "unix",
				resourceKind: "unix",
				path: "unix 0x123456789",
			},
		]);
	});

	test("formats process file snapshots", () => {
		const output = formatProcessFileSnapshot({
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
		});

		expect(output).toContain(
			"CWD:      /Users/bonjin/Documents/workspace/uulab/picos",
		);
		expect(output).toContain("txt  executable  /usr/local/bin/bun");
	});
});

describe("process identity across runs", () => {
	test("parses the ps elapsed formats into milliseconds", () => {
		expect(parseProcessElapsedMs("01:23")).toBe(83_000);
		expect(parseProcessElapsedMs("02:03:04")).toBe(7_384_000);
		expect(parseProcessElapsedMs("5-06:07:08")).toBe(454_028_000);
		expect(parseProcessElapsedMs(" 00:05 ")).toBe(5_000);
		expect(parseProcessElapsedMs(undefined)).toBeUndefined();
		expect(parseProcessElapsedMs("")).toBeUndefined();
		// Windows reports an absolute creation date instead, which this parser
		// deliberately does not accept.
		expect(parseProcessElapsedMs("2026-07-29T00:00:00")).toBeUndefined();
	});

	test("detects a reused PID from elapsed time alone", () => {
		const recordedAt = 1_000_000_000;

		// Running for an hour, recorded a minute ago: it predates the record, so it
		// is consistent with being the same process.
		expect(
			detectProcessIdReuse(
				{ elapsed: "60:00" },
				recordedAt,
				recordedAt + 60_000,
			),
		).toBe("consistent");

		// Running for five seconds, recorded an hour ago: it started long after the
		// record, so this cannot be the process that was recorded.
		expect(
			detectProcessIdReuse(
				{ elapsed: "00:05" },
				recordedAt,
				recordedAt + 3_600_000,
			),
		).toBe("reused");

		// One-second elapsed resolution must not produce a false positive for a
		// process recorded the moment it started.
		expect(
			detectProcessIdReuse(
				{ elapsed: "00:00" },
				recordedAt,
				recordedAt + 1_000,
			),
		).toBe("consistent");

		// Without an elapsed column, or without a baseline to compare against, there
		// is nothing to conclude. A fabricated baseline would always read consistent
		// and silently disable the check, so absence is reported as unknown.
		expect(detectProcessIdReuse({}, recordedAt, recordedAt)).toBe("unknown");
		expect(detectProcessIdReuse(undefined, recordedAt, recordedAt)).toBe(
			"unknown",
		);
		expect(
			detectProcessIdReuse({ elapsed: "00:05" }, undefined, recordedAt),
		).toBe("unknown");
	});

	test("prefers an absolute start time when the platform supplies one", () => {
		const recordedAt = Date.parse("2026-07-29T12:00:00.000Z");

		// Windows reports a creation date and no elapsed column, which is why the
		// check previously never fired there. Comparing two wall-clock instants also
		// needs no clock arithmetic on our side, so it wins when both are present.
		expect(
			detectProcessIdReuse(
				{ started: "2026-07-29T11:00:00.000Z" },
				recordedAt,
				recordedAt,
			),
		).toBe("consistent");
		expect(
			detectProcessIdReuse(
				{ started: "2026-07-29T13:00:00.000Z" },
				recordedAt,
				recordedAt,
			),
		).toBe("reused");
		expect(
			detectProcessIdReuse(
				{ started: "2026-07-29T13:00:00.000Z", elapsed: "60:00" },
				recordedAt,
				recordedAt,
			),
		).toBe("reused");

		// An unparseable creation date falls through to elapsed rather than guessing.
		expect(
			detectProcessIdReuse(
				{ started: "not-a-date", elapsed: "60:00" },
				recordedAt,
				recordedAt,
			),
		).toBe("consistent");
		expect(parseProcessStartedAtMs("not-a-date")).toBeUndefined();
		expect(parseProcessStartedAtMs(undefined)).toBeUndefined();
		expect(parseProcessStartedAtMs("2026-07-29T13:00:00.000Z")).toBe(
			Date.parse("2026-07-29T13:00:00.000Z"),
		);
	});
});
