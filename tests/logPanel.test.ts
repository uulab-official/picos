import { describe, expect, test } from "bun:test";
import type { OsLogSnapshot } from "../src/core/osLogs";
import {
	createLogCleanupPreview,
	formatLogProfileLabel,
	formatLogWorkspaceRows,
	type LogProfile,
	nextLogProfile,
	nextLogSearchPreset,
	prepareLogPanelInput,
	prepareLogSearchTransition,
	saveLogProfile,
	saveLogSearchPreset,
	submitLogCleanupConfirmation,
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
	test("owns empty and filtered log search transitions with exact notices", () => {
		expect(
			prepareLogSearchTransition({
				entries: snapshot.entries,
				level: "warn",
				presets: ["kernel"],
				query: " ",
			}),
		).toEqual({
			query: "",
			presets: ["kernel"],
			notice: { level: "info", message: "logs search cleared" },
		});
		expect(
			prepareLogSearchTransition({
				entries: snapshot.entries,
				level: "fail",
				presets: [],
				query: "missing",
			}),
		).toEqual({
			query: "missing",
			presets: ["missing"],
			notice: {
				level: "warn",
				message: "logs search missing matches 0",
			},
		});
	});

	test("owns log preset, cleanup no-op, and invalid shortcut decisions", () => {
		const state = {
			entries: snapshot.entries,
			level: "all" as const,
			query: "",
			presets: [] as string[],
			profiles: [] as LogProfile[],
			follow: false,
		};
		expect(prepareLogPanelInput({ ...state, input: "1" })).toEqual({
			kind: "no-op",
		});
		expect(prepareLogPanelInput({ ...state, input: "]" })).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no logs search presets" },
		});
		expect(prepareLogPanelInput({ ...state, input: "D" })).toEqual({
			kind: "notice",
			notice: { level: "warn", message: "no logs presets to clean" },
		});
	});
	test("formats filtered log rows with preset context", () => {
		const profiles: LogProfile[] = [{ level: "warn", query: "kernel" }];
		expect(
			formatLogWorkspaceRows(snapshot, 7, {
				query: "kernel",
				level: "warn",
				presets: ["kernel", "error"],
				profiles,
				follow: true,
				followRefreshCount: 3,
				followLastStatus: "warn",
			}),
		).toEqual([
			"LOGS level=warn search=kernel follow=on ticks=3 last=warn presets=kernel|error profiles=warn:kernel",
			"PICOS OS LOGS",
			"source=macos-unified-log status=ok entries=1/3 level=warn filter=kernel",
			"command=log show --last 2m",
			"note=recent unified system log entries",
			"002 warn kernel: thermal pressure",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
		]);
	});

	test("formats selected log profile shelf controls for config focus", () => {
		expect(
			formatLogWorkspaceRows(snapshot, 8, {
				query: "kernel",
				level: "warn",
				profiles: [
					{ level: "warn", query: "kernel" },
					{ level: "fail", query: "error" },
				],
				shelfFocus: true,
			}).slice(1, 4),
		).toEqual([
			"SHELF CONTROL logs.profiles",
			"> profile=warn:kernel next=fail:error saved=2",
			"enter=cycle log profiles  }=cycle S=save D=cleanup",
		]);
	});

	test("keeps no-snapshot rows useful for keyboard discovery", () => {
		expect(formatLogWorkspaceRows(undefined, 5, { query: "" })).toEqual([
			"LOGS level=all search=- follow=off",
			"No OS log snapshot yet. Run logs.read or refresh.",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
		]);
	});

	test("formats bounded live follow history rows", () => {
		expect(
			formatLogWorkspaceRows(snapshot, 10, {
				follow: true,
				followRefreshCount: 2,
				followLastStatus: "ok",
				followHistory: [
					{ status: "ok", entries: 3, label: "21:10:01" },
					{ status: "warn", entries: 0, label: "21:10:04" },
				],
			}),
		).toEqual([
			"LOGS level=all search=- follow=on ticks=2 last=ok",
			"PICOS OS LOGS",
			"source=macos-unified-log status=ok entries=3",
			"command=log show --last 2m",
			"note=recent unified system log entries",
			"001 info launchd: service started",
			"002 warn kernel: thermal pressure",
			"003 fail kernel: disk error",
			"follow history: 21:10:01 ok entries=3 | 21:10:04 warn entries=0",
			"shortcuts: e level · f search · F clear · P save · ] preset · S profile · } cycle · L follow · C follow-clear · r refresh",
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

	test("saves and cycles combined log profiles", () => {
		const profile = saveLogProfile([], { level: "warn", query: " kernel " });
		expect(profile).toEqual([{ level: "warn", query: "kernel" }]);
		expect(
			saveLogProfile(
				[
					{ level: "fail", query: "error" },
					{ level: "warn", query: "kernel" },
				],
				{ level: "fail", query: "error" },
			),
		).toEqual([
			{ level: "fail", query: "error" },
			{ level: "warn", query: "kernel" },
		]);
		expect(formatLogProfileLabel({ level: "all", query: "" })).toBe("all:-");
		expect(formatLogProfileLabel({ level: "warn", query: "kernel" })).toBe(
			"warn:kernel",
		);
		expect(
			nextLogProfile(
				[
					{ level: "warn", query: "kernel" },
					{ level: "fail", query: "error" },
				],
				{ level: "all", query: "" },
			),
		).toEqual({ level: "warn", query: "kernel" });
		expect(
			nextLogProfile(
				[
					{ level: "warn", query: "kernel" },
					{ level: "fail", query: "error" },
				],
				{ level: "warn", query: "kernel" },
			),
		).toEqual({ level: "fail", query: "error" });
		expect(nextLogProfile([], { level: "all", query: "" })).toBeUndefined();
	});

	test("requires exact confirmation before clearing saved log presets", () => {
		const presets = ["kernel", "dns"];
		const profiles: LogProfile[] = [{ level: "warn", query: "kernel" }];
		const preview = createLogCleanupPreview(presets, profiles);

		expect(preview).toEqual({
			count: 3,
			confirmationPhrase: "clear logs",
			cleanup: {
				id: "logs.presets",
				label: "Logs presets",
				scope: "logs",
				count: 3,
				verb: "clear",
				confirmationPhrase: "clear logs",
				rows: [
					"CONFIG CLEANUP",
					"target=Logs presets",
					"scope=logs count=3",
					"confirm clear logs locked",
				],
			},
			rows: [
				"LOGS CLEANUP",
				"search-presets=2 profiles=1",
				"confirm clear logs locked",
			],
		});
		expect(
			submitLogCleanupConfirmation(presets, profiles, "clear log"),
		).toEqual({
			confirmed: false,
			message: "logs cleanup rejected",
			presets,
			profiles,
			removed: 0,
		});
		expect(
			submitLogCleanupConfirmation(presets, profiles, " clear logs "),
		).toEqual({
			confirmed: true,
			message: "logs cleanup removed 3 presets",
			presets: [],
			profiles: [],
			removed: 3,
		});
		expect(createLogCleanupPreview([], [])).toBeUndefined();
	});
});
