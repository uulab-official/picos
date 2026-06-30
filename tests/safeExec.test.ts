import { describe, expect, test } from "bun:test";
import { safeExec } from "../src/utils/safeExec";

describe("safeExec", () => {
	test("passes stdin to child processes without a shell", async () => {
		const result = await safeExec(
			process.execPath,
			[
				"-e",
				"let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => process.stdout.write(data.toUpperCase()));",
			],
			{ stdin: "picos clipboard" },
		);

		expect(result.success).toBeTrue();
		expect(result.stdout).toBe("PICOS CLIPBOARD");
	});
});
