import { describe, expect, test } from "bun:test";
import { appendEvent, type ConsoleEvent, createEvent } from "../src/tui/events";

describe("TUI event log", () => {
	test("creates timestamped console events", () => {
		expect(createEvent("ok", "doctor completed", "12:00:00")).toEqual({
			id: "12:00:00-ok-doctor-completed",
			level: "ok",
			message: "doctor completed",
			time: "12:00:00",
		});
	});

	test("keeps the most recent events", () => {
		const events = ["one", "two", "three", "four"].reduce<ConsoleEvent[]>(
			(current, message) =>
				appendEvent(current, createEvent("run", message), 3),
			[],
		);

		expect(events.map((event) => event.message)).toEqual([
			"two",
			"three",
			"four",
		]);
	});
});
