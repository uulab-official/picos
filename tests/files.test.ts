import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatPwd, formatType } from "../src/cli/commands/files";
import {
	formatFileLocationsJson,
	LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
} from "../src/cli/localInspectorOutput";
import {
	createFileProvider,
	createLocalFileProvider,
	formatDirEntries,
	formatFileLocations,
	getFileParentPath,
	getSystemFileLocations,
	getSystemFileRoot,
	withParentDirectoryEntry,
} from "../src/core/files";

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

	test("supports absolute paths and home shorthand", async () => {
		const provider = createLocalFileProvider("/", { homeDir: root });

		expect((await provider.read(join(root, "README.md"))).content).toBe(
			"# picos\n",
		);
		expect((await provider.read("~/README.md")).content).toBe("# picos\n");
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

	test("keeps local writes locked unless the provider is explicitly created for writes", async () => {
		const lockedProvider = createLocalFileProvider(root);
		await expect(
			lockedProvider.write("README.md", "# locked\n"),
		).rejects.toThrow("File writes require editor confirmation");
		expect(await readFile(join(root, "README.md"), "utf8")).toBe("# picos\n");

		const writableProvider = createLocalFileProvider(root, {
			allowWrites: true,
		});
		await writableProvider.write("README.md", "# picos\nsaved\n");

		expect(await readFile(join(root, "README.md"), "utf8")).toBe(
			"# picos\nsaved\n",
		);
	});

	test("formats system file locations", () => {
		const locations = getSystemFileLocations({
			cwd: join(root, "workspace"),
			homeDir: root,
			tempDir: join(root, "tmp"),
			platform: "darwin",
		});

		expect(getSystemFileRoot("darwin")).toBe("/");
		expect(locations.map((location) => location.label)).toContain(
			"Filesystem Root",
		);
		expect(formatFileLocations(locations)).toContain("Workspace");
	});

	test("formats bounded redacted JSON for locations and drives", () => {
		const locations = getSystemFileLocations({
			cwd: "/Users/alice/project",
			homeDir: "/Users/alice",
			tempDir: "/tmp/picos",
			platform: "darwin",
		});

		const locationsDocument = JSON.parse(
			formatFileLocationsJson(locations, "locations"),
		);
		const drivesDocument = JSON.parse(
			formatFileLocationsJson(locations, "drives"),
		);

		expect(locationsDocument).toMatchObject({
			schemaVersion: LOCAL_INSPECTOR_JSON_SCHEMA_VERSION,
			command: "locations",
			status: "completed",
			data: { returnedCount: locations.length, truncated: false },
		});
		expect(drivesDocument.command).toBe("drives");
		expect(JSON.stringify(locationsDocument)).not.toContain("/Users/alice");
		expect(locationsDocument.data.locations[1].path).toBe("$HOME");
	});

	test("creates local providers through the shared provider factory", async () => {
		const provider = createFileProvider({ kind: "local", root });

		expect(provider.kind).toBe("local");
		expect(await provider.pwd()).toBe(root);
	});

	test("creates locked SFTP provider placeholders through the shared provider factory", async () => {
		const provider = createFileProvider({
			kind: "sftp",
			profile: {
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: "/srv/app",
			},
		});

		expect(provider.kind).toBe("sftp");
		expect(await provider.pwd()).toBe(
			"sftp://alice@dev.example.com:22/srv/app",
		);
		await expect(provider.list(".")).rejects.toThrow(
			"SFTP adapter is not connected yet",
		);
		await expect(provider.write("file.txt", "content")).rejects.toThrow(
			"Remote writes require host and path confirmation",
		);
	});

	test("preserves SFTP authority when resolving parent directory entries", () => {
		const root = "sftp://alice@dev.example.com:22/srv/app/releases";
		expect(getFileParentPath(root)).toBe(
			"sftp://alice@dev.example.com:22/srv/app",
		);
		expect(withParentDirectoryEntry(root, [])[0]).toEqual({
			name: "..",
			path: "sftp://alice@dev.example.com:22/srv/app",
			type: "directory",
			readonly: true,
		});
	});

	test("adds a parent directory entry outside filesystem root", async () => {
		const provider = createLocalFileProvider(root);
		const entries = withParentDirectoryEntry(
			join(root, "src"),
			await provider.list("src"),
		);

		expect(entries[0]).toMatchObject({
			name: "..",
			path: root,
			type: "directory",
			readonly: true,
		});
		expect(
			withParentDirectoryEntry("/", await provider.list("."))[0]?.name,
		).not.toBe("..");
	});
});
