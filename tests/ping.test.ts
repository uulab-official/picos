import { describe, expect, test } from "bun:test";
import { buildPingCommand } from "../src/core/command";

describe("ping command builder", () => {
	test("uses platform-specific count flags", () => {
		expect(buildPingCommand("example.com", "darwin")).toEqual({
			command: "ping",
			args: ["-c", "4", "-W", "10000", "example.com"],
		});

		expect(buildPingCommand("example.com", "linux")).toEqual({
			command: "ping",
			args: ["-c", "4", "-W", "10", "example.com"],
		});

		expect(buildPingCommand("example.com", "win32")).toEqual({
			command: "ping",
			args: ["-n", "4", "-w", "10000", "example.com"],
		});
	});

	test("rejects hosts that would require shell interpretation", () => {
		expect(() => buildPingCommand("example.com; rm -rf /", "linux")).toThrow(
			"Invalid host",
		);
	});

	test("supports bounded count and timeout options", () => {
		expect(
			buildPingCommand("example.com", "linux", { count: 2, timeoutMs: 3000 }),
		).toEqual({
			command: "ping",
			args: ["-c", "2", "-W", "3", "example.com"],
		});

		expect(
			buildPingCommand("example.com", "darwin", {
				count: 2,
				timeoutMs: 3000,
			}),
		).toEqual({
			command: "ping",
			args: ["-c", "2", "-W", "3000", "example.com"],
		});
	});

	test("rejects unsafe ping options", () => {
		expect(() =>
			buildPingCommand("example.com", "linux", { count: 0 }),
		).toThrow("Invalid ping count");
		expect(() =>
			buildPingCommand("example.com", "linux", { timeoutMs: 50 }),
		).toThrow("Invalid ping timeout");
	});
});
