import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createGuardedRemoteFileRequest,
	formatGuardedRemoteFailureAuditMessage,
	runGuardedRemoteFileRequest,
} from "../src/cli/commands/remotes";
import type { FileProvider } from "../src/core/files";
import { parseRemoteKnownHostsCandidates } from "../src/core/remotes";
import type { SftpRemoteProfile } from "../src/core/types";

const profile: SftpRemoteProfile = {
	id: "prod",
	kind: "sftp",
	host: "prod.example.com",
	port: 2222,
	username: "deploy",
	root: "/srv/app",
};

const keyBlob = Buffer.from("picos-cli-host-key").toString("base64");
const knownHosts = `[prod.example.com]:2222 ssh-ed25519 ${keyBlob}`;

describe("guarded remote CLI files", () => {
	test("requires one operation and the exact connection confirmation", () => {
		expect(createGuardedRemoteFileRequest("prod", {})).toBeUndefined();
		expect(() =>
			createGuardedRemoteFileRequest("prod", {
				list: ".",
				read: "README.md",
				confirm: "connect remote prod",
			}),
		).toThrow("exactly one");
		expect(() => createGuardedRemoteFileRequest("prod", { list: "." })).toThrow(
			'--confirm "connect remote prod"',
		);
		expect(() =>
			createGuardedRemoteFileRequest("prod", {
				list: ".",
				confirm: " connect remote prod ",
			}),
		).toThrow('--confirm "connect remote prod"');
		expect(() =>
			createGuardedRemoteFileRequest("prod", {
				read: "README.md",
				confirm: "connect remote prod",
				maxBytes: "1048577",
			}),
		).toThrow("--max-bytes");
		expect(
			createGuardedRemoteFileRequest("prod", {
				read: 2026,
				confirm: "connect remote prod",
			}),
		).toMatchObject({ path: "2026" });
		expect(() =>
			createGuardedRemoteFileRequest("prod", {
				read: ["one", "two"],
				confirm: "connect remote prod",
			}),
		).toThrow("--read must be provided exactly once");
	});

	test("lists through a host-verified provider and always closes the session", async () => {
		const request = createGuardedRemoteFileRequest("prod", {
			list: ".",
			confirm: "connect remote prod",
			knownHosts: "/tmp/known_hosts",
		});
		expect(request).toBeDefined();
		if (!request) throw new Error("expected guarded list request");
		const expectedFingerprint = parseRemoteKnownHostsCandidates(
			"prod.example.com:2222",
			knownHosts,
		)[0]?.fingerprint;
		let closed = false;
		let receivedFingerprint = "";
		const output: string[] = [];
		const diagnostics: string[] = [];
		const provider: FileProvider = {
			kind: "sftp",
			async pwd() {
				return "sftp://deploy@prod.example.com:2222/srv/app";
			},
			async list() {
				return [
					{
						name: "logs",
						path: "sftp://deploy@prod.example.com:2222/srv/app/logs",
						type: "directory",
						readonly: true,
					},
				];
			},
			async read() {
				throw new Error("not used");
			},
			async write() {
				throw new Error("locked");
			},
			async stat() {
				throw new Error("not used");
			},
			async close() {
				closed = true;
			},
		};

		await runGuardedRemoteFileRequest(profile, request, {
			readKnownHosts: async () => knownHosts,
			connect: async (_profile, options) => {
				receivedFingerprint = options.expectedHostKeyFingerprint;
				return provider;
			},
			writeOutput: (value) => {
				expect(closed).toBeTrue();
				output.push(value);
			},
			writeDiagnostic: (value) => diagnostics.push(value),
		});

		expect(receivedFingerprint).toBe(expectedFingerprint);
		expect(output.join("\n")).toContain("logs");
		expect(diagnostics[0]).toContain("status=completed");
		expect(diagnostics[0]).toContain("network=closed");
		expect(diagnostics[0]).toContain("writes=locked");
		expect(closed).toBeTrue();
	});

	test("bounded-reads a remote file", async () => {
		const request = createGuardedRemoteFileRequest("prod", {
			read: "README.md",
			confirm: "connect remote prod",
			maxBytes: "64",
		});
		expect(request).toBeDefined();
		if (!request) throw new Error("expected guarded read request");
		let maxBytes = 0;
		const output: string[] = [];
		await runGuardedRemoteFileRequest(profile, request, {
			readKnownHosts: async () => knownHosts,
			connect: async () => ({
				kind: "sftp",
				async pwd() {
					return "sftp://deploy@prod.example.com:2222/srv/app";
				},
				async list() {
					return [];
				},
				async read(path, options) {
					expect(path).toBe("README.md");
					maxBytes = options?.maxBytes ?? 0;
					return {
						path,
						content: "remote text",
						encoding: "utf8",
						truncated: false,
					};
				},
				async write() {
					throw new Error("locked");
				},
				async stat() {
					throw new Error("not used");
				},
			}),
			writeOutput: (value) => output.push(value),
			writeDiagnostic: () => undefined,
		});
		expect(maxBytes).toBe(64);
		expect(output).toEqual(["remote text"]);
	});

	test("audits failures and closes an opened provider", async () => {
		const request = createGuardedRemoteFileRequest("prod", {
			list: "/missing",
			confirm: "connect remote prod",
		});
		if (!request) throw new Error("expected guarded list request");
		let closed = false;
		const diagnostics: string[] = [];
		await expect(
			runGuardedRemoteFileRequest(profile, request, {
				readKnownHosts: async () => knownHosts,
				connect: async () => ({
					kind: "sftp",
					async pwd() {
						return "sftp://deploy@prod.example.com:2222/srv/app";
					},
					async list() {
						throw new Error("permission denied");
					},
					async read() {
						throw new Error("not used");
					},
					async write() {
						throw new Error("locked");
					},
					async stat() {
						throw new Error("not used");
					},
					async close() {
						closed = true;
					},
				}),
				writeDiagnostic: (value) => diagnostics.push(value),
			}),
		).rejects.toThrow("permission denied");
		expect(diagnostics[0]).toContain("status=failed");
		expect(diagnostics[0]).toContain("network=closed");
		expect(closed).toBeTrue();
	});

	test("does not emit output or success audit when session close fails", async () => {
		const request = createGuardedRemoteFileRequest("prod", {
			list: ".",
			confirm: "connect remote prod",
		});
		if (!request) throw new Error("expected guarded list request");
		let closeCount = 0;
		const output: string[] = [];
		const diagnostics: string[] = [];

		await expect(
			runGuardedRemoteFileRequest(profile, request, {
				readKnownHosts: async () => knownHosts,
				connect: async () => ({
					kind: "sftp",
					async pwd() {
						return "sftp://deploy@prod.example.com:2222/srv/app";
					},
					async list() {
						return [];
					},
					async read() {
						throw new Error("not used");
					},
					async write() {
						throw new Error("locked");
					},
					async stat() {
						throw new Error("not used");
					},
					async close() {
						closeCount += 1;
						throw new Error("transport close failed");
					},
				}),
				writeOutput: (value) => output.push(value),
				writeDiagnostic: (value) => diagnostics.push(value),
			}),
		).rejects.toThrow("transport close failed");

		expect(closeCount).toBe(2);
		expect(output).toEqual([]);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toContain("status=failed");
		expect(diagnostics[0]).toContain("network=unknown");
		expect(diagnostics[0]).toContain("session close failed");
	});

	test("times out an in-flight remote operation and closes its provider", async () => {
		const created = createGuardedRemoteFileRequest("prod", {
			list: ".",
			confirm: "connect remote prod",
		});
		if (!created) throw new Error("expected guarded list request");
		const request = { ...created, timeoutMs: 5 };
		let closed = false;
		const diagnostics: string[] = [];

		await expect(
			runGuardedRemoteFileRequest(profile, request, {
				readKnownHosts: async () => knownHosts,
				connect: async () => ({
					kind: "sftp",
					async pwd() {
						return "sftp://deploy@prod.example.com:2222/srv/app";
					},
					async list() {
						return new Promise(() => undefined);
					},
					async read() {
						throw new Error("not used");
					},
					async write() {
						throw new Error("locked");
					},
					async stat() {
						throw new Error("not used");
					},
					async close() {
						closed = true;
					},
				}),
				writeDiagnostic: (value) => diagnostics.push(value),
			}),
		).rejects.toThrow("timed out after 5ms");

		expect(closed).toBeTrue();
		expect(diagnostics[0]).toContain("status=cancelled");
	});

	test("audits forged confirmations and host-key selection failures", async () => {
		const request = createGuardedRemoteFileRequest("prod", {
			list: ".",
			confirm: "connect remote prod",
		});
		if (!request) throw new Error("expected guarded list request");
		const diagnostics: string[] = [];

		await expect(
			runGuardedRemoteFileRequest(
				profile,
				{ ...request, confirm: "forged" },
				{ writeDiagnostic: (value) => diagnostics.push(value) },
			),
		).rejects.toThrow("require confirmation");
		expect(diagnostics[0]).toContain("status=failed");
		expect(diagnostics[0]).toContain("fingerprint=SHA256:unknown");

		diagnostics.length = 0;
		await expect(
			runGuardedRemoteFileRequest(profile, request, {
				readKnownHosts: async () => "not a known_hosts row",
				writeDiagnostic: (value) => diagnostics.push(value),
			}),
		).rejects.toThrow("No usable known_hosts candidate");
		expect(diagnostics[0]).toContain("status=failed");
		expect(diagnostics[0]).toContain("network=closed");
		expect(
			formatGuardedRemoteFailureAuditMessage(profile, "validation failed"),
		).toContain("fingerprint=SHA256:unknown");
	});

	test("rejects oversized known_hosts files before connecting", async () => {
		const directory = await mkdtemp(join(tmpdir(), "picos-known-hosts-"));
		const knownHostsPath = join(directory, "known_hosts");
		await writeFile(knownHostsPath, Buffer.alloc(4 * 1024 * 1024 + 1));
		const created = createGuardedRemoteFileRequest("prod", {
			list: ".",
			confirm: "connect remote prod",
		});
		if (!created) throw new Error("expected guarded list request");
		let connected = false;
		const diagnostics: string[] = [];

		try {
			await expect(
				runGuardedRemoteFileRequest(
					profile,
					{ ...created, knownHostsPath },
					{
						connect: async () => {
							connected = true;
							throw new Error("must not connect");
						},
						writeDiagnostic: (value) => diagnostics.push(value),
					},
				),
			).rejects.toThrow("known_hosts exceeds");
			expect(connected).toBeFalse();
			expect(diagnostics[0]).toContain("network=closed");
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
