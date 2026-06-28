import { describe, expect, test } from "bun:test";
import { computeShellLayout, formatTopBarLine } from "../src/tui/shell";

describe("full-screen shell layout", () => {
	test("uses the full terminal and reserves OS console regions", () => {
		expect(computeShellLayout(120, 36)).toEqual({
			width: 120,
			height: 36,
			topBarHeight: 3,
			contentHeight: 27,
			logHeight: 6,
			sidebarWidth: 24,
			inspectorWidth: 34,
			mainWidth: 62,
		});
	});

	test("keeps a usable layout in small terminals", () => {
		expect(computeShellLayout(70, 20)).toEqual({
			width: 70,
			height: 20,
			topBarHeight: 3,
			contentHeight: 13,
			logHeight: 4,
			sidebarWidth: 18,
			inspectorWidth: 0,
			mainWidth: 52,
		});
	});

	test("allocates every terminal row when height grows", () => {
		const compact = computeShellLayout(100, 24);
		const tall = computeShellLayout(100, 48);

		expect(
			compact.topBarHeight + compact.contentHeight + compact.logHeight,
		).toBe(compact.height);
		expect(tall.topBarHeight + tall.contentHeight + tall.logHeight).toBe(
			tall.height,
		);
		expect(tall.contentHeight - compact.contentHeight).toBe(22);
	});

	test("clips the top bar status instead of overlapping help text", () => {
		const line = formatTopBarLine(
			50,
			"tiny terminal OS · d doctor · p ping · q quit",
			"online · UULab-MacBook-Pro.local · idle",
		);

		expect(line).toHaveLength(50);
		expect(line).toStartWith("tiny terminal OS");
		expect(line).toContain("…");
		expect(line).not.toContain("quitab");
	});
});
