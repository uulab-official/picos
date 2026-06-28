import { describe, expect, test } from "bun:test";
import { parsePsOutput } from "../src/core/processes";

describe("process inventory", () => {
	test("parses bounded ps output", () => {
		const output = [
			"  PID  %CPU %MEM COMMAND",
			"  123   1.2  0.5 bun src/bin/picos.ts",
			"  456   0.0  0.1 zsh",
		].join("\n");

		expect(parsePsOutput(output, 1)).toEqual([
			{
				pid: 123,
				cpu: "1.2",
				memory: "0.5",
				command: "bun src/bin/picos.ts",
			},
		]);
	});
});
