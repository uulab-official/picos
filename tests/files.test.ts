import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatPwd, formatType } from "../src/cli/commands/files";
import { createLocalFileProvider, formatDirEntries } from "../src/core/files";

let root = "";

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "picos-files-"));
	await mkdir(join(root, "src"));
	await writeFile(join(root, "README.md"), "# picos\n");
	await writeFile(join(root, "src", "index.ts"), "export const ok = true;\n");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("local file provider", () => {
	test("lists files and directories in stable order", async () => {
		const provider = createLocalFileProvider(root);
		const entries = await provider.list(".");

		expect(entries.map((entry) => [entry.name, entry.type])).toEqual([
			["src", "directory"],
			["README.md", "file"],
		]);
	});

	test("reads utf8 text files", async () => {
		const provider = createLocalFileProvider(root);
		const result = await provider.read("README.md");

		expect(result).toEqual({
			path: join(root, "README.md"),
			content: "# picos\n",
			encoding: "utf8",
			truncated: false,
		});
	});

	test("formats dir output for CLI use", async () => {
		const provider = createLocalFileProvider(root);
		const output = formatDirEntries(await provider.list("."));

		expect(output).toContain("<DIR> src");
		expect(output).toContain("README.md");
	});

	test("formats pwd and type output for CLI use", async () => {
		const provider = createLocalFileProvider(root);

		expect(formatPwd(await provider.pwd())).toBe(root);
		expect(formatType(await provider.read("README.md"))).toBe("# picos\n");
	});
});
