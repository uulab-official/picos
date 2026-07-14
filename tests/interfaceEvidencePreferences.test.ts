import { describe, expect, test } from "bun:test";
import {
	nextInterfaceEvidenceSearchPreset,
	normalizeInterfaceEvidenceQuery,
	normalizeInterfaceEvidenceSearchPresets,
	saveInterfaceEvidenceSearchPreset,
} from "../src/core/interfaceEvidencePreferences";

describe("interface evidence search preferences", () => {
	test("normalizes queries and persisted presets", () => {
		expect(normalizeInterfaceEvidenceQuery("  Wi-Fi   BLOCKED ")).toBe(
			"wi-fi blocked",
		);
		expect(
			normalizeInterfaceEvidenceSearchPresets([
				" Wi-Fi ",
				"",
				"wifi",
				"WI-FI",
				"ethernet",
				"rejected",
				"archived",
				"disable",
				"ignored",
			]),
		).toEqual(["wi-fi", "wifi", "ethernet", "rejected", "archived", "disable"]);
	});

	test("saves the current query first and cycles with wraparound", () => {
		const presets = saveInterfaceEvidenceSearchPreset(
			["wifi", "ethernet", "archived"],
			"  Rejected  ",
		);
		expect(presets).toEqual(["rejected", "wifi", "ethernet", "archived"]);
		expect(nextInterfaceEvidenceSearchPreset(presets, "rejected")).toBe("wifi");
		expect(nextInterfaceEvidenceSearchPreset(presets, "archived")).toBe(
			"rejected",
		);
		expect(nextInterfaceEvidenceSearchPreset([], "wifi")).toBeUndefined();
	});
});
