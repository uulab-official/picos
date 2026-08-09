import { describe, expect, test } from "bun:test";
import {
	formatRemoteJsonFailure,
	formatRemoteJsonSuccess,
	formatRemoteProfilesJson,
	REMOTE_JSON_SCHEMA_VERSION,
} from "../src/cli/remoteOutput";
import type { SftpRemoteProfile } from "../src/core/types";

const profile: SftpRemoteProfile = {
	id: "prod",
	kind: "sftp",
	host: "prod.example.com",
	port: 2222,
	username: "deploy",
	root: "/srv/app",
	keyPath: "/secret/id_ed25519",
};

describe("remote JSON output", () => {
	test("formats a bounded profile listing without private key paths", () => {
		const output = formatRemoteProfilesJson([profile]);
		const result = JSON.parse(output);

		expect(result).toMatchObject({
			schemaVersion: REMOTE_JSON_SCHEMA_VERSION,
			command: "remotes",
			status: "completed",
			data: {
				totalCount: 1,
				returnedCount: 1,
				truncated: false,
				profiles: [
					{
						id: "prod",
						host: "prod.example.com",
						username: "deploy",
						root: "/srv/app",
					},
				],
			},
		});
		expect(output).not.toContain("/secret/id_ed25519");
		expect(output).not.toContain("keyPath");
	});

	test("formats a stable secret-free list result", () => {
		const output = formatRemoteJsonSuccess({
			profile,
			operation: "list",
			path: ".",
			timeoutMs: 15_000,
			maxBytes: 262_144,
			root: "sftp://deploy@prod.example.com:2222/srv/app",
			fingerprint: "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			entries: [
				{
					name: "logs",
					path: "sftp://deploy@prod.example.com:2222/srv/app/logs",
					type: "directory",
					size: 0,
					modifiedAt: new Date("2026-07-14T00:00:00.000Z"),
					readonly: true,
				},
			],
		});
		const result = JSON.parse(output);

		expect(result.schemaVersion).toBe(REMOTE_JSON_SCHEMA_VERSION);
		expect(result).toMatchObject({
			command: "remote",
			status: "completed",
			operation: "list",
			profile: {
				id: "prod",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
			},
			request: { path: ".", timeoutMs: 15_000 },
			session: {
				network: "closed",
				capabilities: ["list", "stat", "read"],
				writes: "locked",
				exec: "unsupported",
			},
			data: {
				count: 1,
				entries: [
					{
						name: "logs",
						modifiedAt: "2026-07-14T00:00:00.000Z",
						readonly: true,
					},
				],
			},
		});
		expect(output).not.toContain("/secret/id_ed25519");
		expect(output).not.toContain("keyPath");
	});

	test("reports bounded read metadata without changing content", () => {
		const result = JSON.parse(
			formatRemoteJsonSuccess({
				profile,
				operation: "read",
				path: "README.md",
				timeoutMs: 10_000,
				maxBytes: 8,
				root: "sftp://deploy@prod.example.com:2222/srv/app",
				fingerprint: "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				file: {
					path: "sftp://deploy@prod.example.com:2222/srv/app/README.md",
					content: "한글",
					encoding: "utf8",
					truncated: true,
				},
			}),
		);

		expect(result.data.file).toMatchObject({
			content: "한글",
			contentBytes: 6,
			maxBytes: 8,
			truncated: true,
		});
	});

	test("redacts credentials and avoids repeated remote roots", () => {
		const secret = "TOPSECRET";
		const longRoot = `/srv/${"nested/".repeat(1_000)}`;
		const output = formatRemoteJsonSuccess({
			profile: { ...profile, root: longRoot },
			operation: "list",
			path: `sftp://deploy:${secret}@prod.example.com${longRoot}`,
			timeoutMs: 15_000,
			maxBytes: 262_144,
			root: `sftp://deploy@prod.example.com${longRoot}`,
			fingerprint: "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			entries: Array.from({ length: 1_000 }, (_, index) => ({
				name: `entry-${index}`,
				path: `sftp://deploy:${secret}@prod.example.com${longRoot}entry-${index}`,
				type: "file" as const,
				readonly: true,
			})),
		});
		const result = JSON.parse(output);

		expect(output).not.toContain(secret);
		expect(result.data.entries[0].path).toBe("entry-0");
		expect(result.request.path.length).toBeLessThanOrEqual(4_096);
		expect(output.length).toBeLessThan(250_000);
	});

	test("formats machine-readable failures with a locked session posture", () => {
		const output = formatRemoteJsonFailure({
			id: "prod",
			profile,
			operation: "list",
			path: "/missing",
			timeoutMs: 12_000,
			maxBytes: 512,
			message: "permission denied",
			fingerprint: "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			network: "unknown",
		});
		const result = JSON.parse(output);

		expect(result).toMatchObject({
			schemaVersion: 1,
			status: "failed",
			operation: "list",
			request: { path: "/missing", timeoutMs: 12_000 },
			session: { network: "unknown", writes: "locked" },
			error: {
				code: "PICOS_REMOTE_OPERATION_FAILED",
				message: "permission denied",
			},
		});
		expect(output).not.toContain("/secret/id_ed25519");
	});

	test("redacts SFTP credentials from failed request paths and messages", () => {
		const output = formatRemoteJsonFailure({
			id: "prod",
			operation: "read",
			path: "sftp://deploy:TOPSECRET@prod.example.com/README.md",
			message:
				"Could not read sftp://deploy:TOPSECRET@prod.example.com/README.md",
		});
		const result = JSON.parse(output);

		expect(output).not.toContain("TOPSECRET");
		expect(result.request.path).toContain("[REDACTED]");
		expect(result.error.message).toContain("[REDACTED]");
	});
});
