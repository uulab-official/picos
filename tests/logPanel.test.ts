import { describe, expect, test } from "bun:test";
import type { OsLogSnapshot } from "../src/core/osLogs";
import {
	formatLogWorkspaceRows,
	nextLogSearchPreset,
	saveLogSearchPreset,
} from "../src/tui/logPanel";

const snapshot: OsLogSnapshot = {
	source: "macos-unified-log",
	status: "ok",
	command: "log",
	args: ["show", "--last", "2m"],
	note: "recent unified system log entries",
	entries: [
		{ index: 1, level: "info", message: "launchd: service started" },
		{ index: 2, level: "warn", message: "kernel: thermal pressure" },
		{ index: 3, level: "fail", message: "kernel: disk error" },
	],
};

describe("log TUI panel formatting", () => {
	test("formats filtered log rows with preset context", () => {
		expect(
			formatLogWorkspaceRows(snapshot, 7, {
				query: "kernel",
				level: "warn",
				presets: ["kernel", "error"],
			}),
		).toEqual([
			"LOGS level=warn search=kernel presets=kernel|error",
			"PICOS OS LOGS",
			"source=macos-unified-log status=ok entries=1/3 level=warn filter=kernel",
			"command=log show --last 2m",
			"note=recent unified system log entries",
			"002 warn kernel: thermal pressure",
			"shortcuts: e level · f search · F clear · P save · ] preset · r refresh",
		]);
	});

	test("keeps no-snapshot rows useful for keyboard discovery", () => {
		expect(formatLogWorkspaceRows(undefined, 5, { query: "" })).toEqual([
			"LOGS level=all search=-",
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · r refresh",
		]);
	});

	test("saves and cycles log search presets", () => {
		expect(saveLogSearchPreset([], " kernel ")).toEqual(["kernel"]);
		expect(saveLogSearchPreset(["error", "kernel"], "error")).toEqual([
			"error",
			"kernel",
		]);
		expect(nextLogSearchPreset(["kernel", "error"], "")).toBe("kernel");
		expect(nextLogSearchPreset(["kernel", "error"], "kernel")).toBe("error");
		expect(nextLogSearchPreset([], "kernel")).toBeUndefined();
	});
});
