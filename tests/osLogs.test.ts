import { describe, expect, test } from "bun:test";
import {
	buildOsLogCommand,
	createOsLogSnapshot,
	formatOsLogRows,
	parseOsLogLines,
} from "../src/core/osLogs";

describe("OS log reader", () => {
	test("builds platform log commands without shell interpolation", () => {
		expect(buildOsLogCommand("darwin", { limit: 25 })).toEqual({
			source: "macos-unified-log",
			command: "log",
			args: [
				"show",
				"--style",
				"compact",
				"--last",
				"2m",
				"--predicate",
				'process != ""',
			],
			note: "recent unified system log entries",
		});

		expect(buildOsLogCommand("linux", { limit: 25 })).toEqual({
			source: "systemd-journal",
			command: "journalctl",
			args: ["-n", "25", "--no-pager", "-o", "short-iso"],
			note: "recent systemd journal entries",
		});

		expect(buildOsLogCommand("win32", { limit: 25 })).toEqual({
			source: "windows-system-event-log",
			command: "powershell",
			args: [
				"-NoProfile",
				"-Command",
				"Get-WinEvent -LogName System -MaxEvents 25 | Format-Table -AutoSize TimeCreated,ProviderName,LevelDisplayName,Id,Message",
			],
			note: "recent Windows System event log entries",
		});
	});

	test("creates bounded entries with severity hints from raw log lines", async () => {
		const snapshot = await createOsLogSnapshot({
			platform: "linux",
			limit: 2,
			runner: async () => ({
				command: "journalctl",
				args: ["-n", "2"],
				stdout:
					"2026-06-30T08:00:00 host kernel: warning thermal pressure\n2026-06-30T08:00:01 host sshd[7]: accepted publickey",
				stderr: "",
				exitCode: 0,
				success: true,
			}),
		});

		expect(snapshot.status).toBe("ok");
		expect(snapshot.entries).toEqual([
			{
				index: 1,
				level: "warn",
				message: "2026-06-30T08:00:00 host kernel: warning thermal pressure",
			},
			{
				index: 2,
				level: "info",
				message: "2026-06-30T08:00:01 host sshd[7]: accepted publickey",
			},
		]);
	});

	test("formats command status and raw log rows for CLI and TUI", () => {
		const entries = parseOsLogLines(
			"kernel: error disk pressure\nlaunchd: service started",
			2,
		);

		expect(
			formatOsLogRows({
				source: "macos-unified-log",
				status: "ok",
				command: "log",
				args: ["show", "--last", "10m"],
				note: "recent unified system log entries",
				entries,
			}),
		).toEqual([
			"PICOS OS LOGS",
			"source=macos-unified-log status=ok entries=2",
			"command=log show --last 10m",
			"note=recent unified system log entries",
			"001 fail kernel: error disk pressure",
			"002 info launchd: service started",
		]);
	});
});
