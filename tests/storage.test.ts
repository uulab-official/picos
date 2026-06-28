import { describe, expect, test } from "bun:test";
import { parseDfOutput } from "../src/core/storage";

describe("storage inventory", () => {
	test("parses POSIX df output into storage volumes", () => {
		const output = [
			"Filesystem      Size  Used Avail Capacity Mounted on",
			"/dev/disk3s1s1  460Gi  12Gi  220Gi  6% /",
			"devfs           203Ki 203Ki    0Bi 100% /dev",
		].join("\n");

		expect(parseDfOutput(output)).toEqual([
			{
				filesystem: "/dev/disk3s1s1",
				size: "460Gi",
				used: "12Gi",
				available: "220Gi",
				capacity: "6%",
				mount: "/",
			},
			{
				filesystem: "devfs",
				size: "203Ki",
				used: "203Ki",
				available: "0Bi",
				capacity: "100%",
				mount: "/dev",
			},
		]);
	});

	test("parses macOS df output with inode columns", () => {
		const output = [
			"Filesystem        Size    Used   Avail Capacity iused ifree %iused  Mounted on",
			"/dev/disk3s1s1   926Gi    14Gi    79Gi    15%  451k  829M    0%   /",
		].join("\n");

		expect(parseDfOutput(output)).toEqual([
			{
				filesystem: "/dev/disk3s1s1",
				size: "926Gi",
				used: "14Gi",
				available: "79Gi",
				capacity: "15%",
				mount: "/",
			},
		]);
	});
});
