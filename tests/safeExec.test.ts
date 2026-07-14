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

	test("bounds combined stdout and stderr capture", async () => {
		const result = await safeExec(
			process.execPath,
			["-e", "process.stdout.write('x'.repeat(10000))"],
			{ maxOutputBytes: 128 },
		);

		expect(result.success).toBeFalse();
		expect(result.truncated).toBeTrue();
		expect(Buffer.byteLength(result.stdout, "utf8")).toBeLessThanOrEqual(128);
	});

	test("rejects invalid output bounds before spawning", () => {
		expect(() =>
			safeExec(process.execPath, ["--version"], { maxOutputBytes: 0 }),
		).toThrow("safeExec maxOutputBytes must be a positive integer");
	});

	test("keeps decoded UTF-8 output inside the configured byte bound", async () => {
		const result = await safeExec(
			process.execPath,
			["-e", "process.stdout.write('é')"],
			{ maxOutputBytes: 1 },
		);

		expect(result.success).toBeFalse();
		expect(result.truncated).toBeTrue();
		expect(Buffer.byteLength(result.stdout, "utf8")).toBeLessThanOrEqual(1);
	});

	test("waits for a process that ignores SIGTERM to be force-killed", async () => {
		if (process.platform === "win32") return;
		const startedAt = Date.now();
		const result = await safeExec(
			process.execPath,
			["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
			{ timeoutMs: 1000 },
		);

		expect(result.success).toBeFalse();
		expect(result.exitCode).toBeNull();
		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1200);
	});

	test("bounds descendants that inherit output pipes", async () => {
		if (process.platform === "win32") return;
		const startedAt = Date.now();
		const result = await safeExec(
			process.execPath,
			[
				"-e",
				`const {spawn}=require("node:child_process"); spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:["ignore","inherit","inherit"]}); setInterval(()=>{},1000)`,
			],
			{ timeoutMs: 100 },
		);

		expect(result.success).toBeFalse();
		expect(Date.now() - startedAt).toBeLessThan(2_000);
	});
});
