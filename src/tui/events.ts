export type ConsoleEventLevel = "run" | "ok" | "warn" | "fail" | "info";

export type ConsoleEvent = {
	id: string;
	level: ConsoleEventLevel;
	message: string;
	time: string;
};

export function createEvent(
	level: ConsoleEventLevel,
	message: string,
	time = new Date().toLocaleTimeString("en-US", { hour12: false }),
): ConsoleEvent {
	return {
		id: `${time}-${level}-${message
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/g, "-")
			.replaceAll(/^-|-$/g, "")}`,
		level,
		message,
		time,
	};
}

export function appendEvent(
	events: ConsoleEvent[],
	event: ConsoleEvent,
	limit = 64,
): ConsoleEvent[] {
	return [...events, event].slice(-limit);
}
