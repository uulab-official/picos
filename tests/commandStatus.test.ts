import { describe, expect, test } from "bun:test";
import {
	beginCommandStatusCount,
	endCommandStatusCount,
	resolveCommandStatus,
} from "../src/tui/commandStatus";

describe("shared command status", () => {
	test("stays running until the last overlapping action finishes", () => {
		// The defect this guards: two actions in flight, and the first to return
		// reported idle while the second was still working.
		let count = 0;
		count = beginCommandStatusCount(count);
		expect(resolveCommandStatus(count)).toBe("running");

		count = beginCommandStatusCount(count);
		count = endCommandStatusCount(count);
		expect(resolveCommandStatus(count)).toBe("running");

		count = endCommandStatusCount(count);
		expect(resolveCommandStatus(count)).toBe("idle");
	});

	test("cannot be stranded on running by an unbalanced end", () => {
		// A path that returns without a matching begin must not drive the count
		// negative, because a negative count would never reach zero again.
		expect(endCommandStatusCount(0)).toBe(0);
		expect(resolveCommandStatus(endCommandStatusCount(0))).toBe("idle");
		expect(beginCommandStatusCount(-5)).toBe(1);
		expect(resolveCommandStatus(-5)).toBe("idle");
	});
});
