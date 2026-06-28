import { describe, expect, test } from "bun:test";
import { assertSafePort, runTcpConnect } from "../src/core/command";

describe("tcp connect tool", () => {
	test("validates safe ports", () => {
		expect(assertSafePort("443")).toBe(443);
		expect(() => assertSafePort("0")).toThrow("Invalid port");
		expect(() => assertSafePort("70000")).toThrow("Invalid port");
		expect(() => assertSafePort("22;rm")).toThrow("Invalid port");
	});

	test("reports reachable TCP endpoint with injected connector", async () => {
		const result = await runTcpConnect("example.com", "443", {
			timeoutMs: 1000,
			connect: async () => undefined,
			now: (() => {
				let value = 100;
				return () => (value += 25);
			})(),
		});

		expect(result).toEqual({
			host: "example.com",
			port: 443,
			reachable: true,
			elapsedMs: 25,
		});
	});
});
