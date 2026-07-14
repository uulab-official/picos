import { describe, expect, test } from "bun:test";
import {
	connectReadOnlySftpFileProvider,
	createReadOnlySftpFileProvider,
	createSftpHostKeyFingerprint,
	finishReadOnlySftpConnectionDiagnostic,
	formatReadOnlySftpConnectionAuditMessage,
	formatReadOnlySftpConnectionDiagnosticRows,
	formatSftpProfileUri,
	formatSftpUri,
	isReadOnlySftpConnectionCancelledError,
	normalizeSftpHostKeyFingerprint,
	ReadOnlySftpConnectionCancelledError,
	type ReadOnlySftpSession,
	requestReadOnlySftpConnectionCancellation,
	resolveSftpProviderPath,
	startReadOnlySftpConnectionDiagnostic,
} from "../src/core/sftp";
import type { SftpRemoteProfile } from "../src/core/types";

const profile: SftpRemoteProfile = {
	id: "prod",
	kind: "sftp",
	host: "prod.example.com",
	port: 2222,
	username: "deploy",
	root: "/srv/app",
};

function createSession(): ReadOnlySftpSession & { closed: boolean } {
	const session = {
		closed: false,
		async realpath(path: string) {
			return path === "." ? "/home/deploy" : path;
		},
		async list(path: string) {
			expect(path).toBe("/srv/app");
			return [
				{ name: "app.log", type: "file" as const, size: 12 },
				{ name: "releases", type: "directory" as const, size: 0 },
				{ name: ".", type: "directory" as const, size: 0 },
			];
		},
		async read(path: string, maxBytes: number) {
			expect(path).toBe("/srv/app/app.log");
			expect(maxBytes).toBe(5);
			return Buffer.from("hello");
		},
		async stat(path: string) {
			return {
				type: path.endsWith("app.log")
					? ("file" as const)
					: ("directory" as const),
				size: path.endsWith("app.log") ? 12 : 0,
			};
		},
		async close() {
			session.closed = true;
		},
	};
	return session;
}

describe("read-only SFTP provider", () => {
	test("lists, stats, and bounded-reads remote files while keeping writes locked", async () => {
		const session = createSession();
		const provider = createReadOnlySftpFileProvider(profile, session);

		expect(await provider.pwd()).toBe(
			"sftp://deploy@prod.example.com:2222/srv/app",
		);
		expect(await provider.list(await provider.pwd())).toEqual([
			{
				name: "releases",
				path: "sftp://deploy@prod.example.com:2222/srv/app/releases",
				type: "directory",
				size: 0,
				modifiedAt: undefined,
				readonly: true,
			},
			{
				name: "app.log",
				path: "sftp://deploy@prod.example.com:2222/srv/app/app.log",
				type: "file",
				size: 12,
				modifiedAt: undefined,
				readonly: true,
			},
		]);
		expect(
			await provider.read(
				"sftp://deploy@prod.example.com:2222/srv/app/app.log",
				{ maxBytes: 5 },
			),
		).toEqual({
			path: "sftp://deploy@prod.example.com:2222/srv/app/app.log",
			content: "hello",
			encoding: "utf8",
			truncated: true,
		});
		await expect(provider.write("app.log", "nope")).rejects.toThrow(
			"writes are disabled",
		);
		await provider.close?.();
		expect(session.closed).toBeTrue();
	});

	test("enforces the core read ceiling even when a caller requests more", async () => {
		const session = createSession();
		let receivedMaxBytes = 0;
		session.read = async (_path, maxBytes) => {
			receivedMaxBytes = maxBytes;
			return Buffer.from("bounded");
		};
		session.stat = async () => ({ type: "file", size: 2 * 1024 * 1024 });
		const provider = createReadOnlySftpFileProvider(profile, session);

		const result = await provider.read("app.log", {
			maxBytes: 2 * 1024 * 1024,
		});

		expect(receivedMaxBytes).toBe(1024 * 1024);
		expect(result.truncated).toBeTrue();
	});

	test("rejects oversized remote directory listings", async () => {
		const session = createSession();
		session.list = async () =>
			Array.from({ length: 10_001 }, (_, index) => ({
				name: `entry-${index}`,
				type: "file" as const,
				size: 0,
			}));
		const provider = createReadOnlySftpFileProvider(profile, session);

		await expect(provider.list(".")).rejects.toThrow(
			"exceeds safe listing limits",
		);
	});

	test("requires a trusted fingerprint before invoking the connector", async () => {
		let called = false;
		await expect(
			connectReadOnlySftpFileProvider(profile, {
				expectedHostKeyFingerprint: "unknown",
				connect: async () => {
					called = true;
					return createSession();
				},
			}),
		).rejects.toThrow("trusted SHA256 host key fingerprint");
		expect(called).toBeFalse();
	});

	test("does not invoke the connector after cancellation", async () => {
		let called = false;
		const controller = new AbortController();
		controller.abort();
		await expect(
			connectReadOnlySftpFileProvider(profile, {
				expectedHostKeyFingerprint:
					"SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				signal: controller.signal,
				connect: async () => {
					called = true;
					return createSession();
				},
			}),
		).rejects.toThrow("connection cancelled");
		expect(called).toBeFalse();
	});

	test("resolves relative profile roots before exposing provider URIs", async () => {
		const session = createSession();
		const provider = await connectReadOnlySftpFileProvider(
			{ ...profile, root: "." },
			{
				expectedHostKeyFingerprint:
					"SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				connect: async () => session,
			},
		);

		expect(await provider.pwd()).toBe(
			"sftp://deploy@prod.example.com:2222/home/deploy",
		);
		await provider.close?.();
		expect(session.closed).toBeTrue();
	});

	test("closes the session when remote root resolution fails", async () => {
		const session = createSession();
		session.realpath = async () => {
			throw new Error("root unavailable");
		};
		await expect(
			connectReadOnlySftpFileProvider(profile, {
				expectedHostKeyFingerprint:
					"SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				connect: async () => session,
			}),
		).rejects.toThrow("root unavailable");
		expect(session.closed).toBeTrue();
	});

	test("keeps provider paths on the selected profile authority", () => {
		expect(formatSftpUri(profile, "/srv/app/releases")).toBe(
			"sftp://deploy@prod.example.com:2222/srv/app/releases",
		);
		expect(resolveSftpProviderPath(profile, "/srv/app", "../logs")).toBe(
			"/srv/logs",
		);
		expect(() =>
			resolveSftpProviderPath(
				profile,
				"/srv/app",
				"sftp://deploy@other.example.com:2222/etc",
			),
		).toThrow("different remote profile");
		const ipv6Profile = { ...profile, host: "::1", port: 22 };
		expect(formatSftpUri(ipv6Profile, "/srv/app")).toBe(
			"sftp://deploy@[::1]:22/srv/app",
		);
		expect(
			resolveSftpProviderPath(
				ipv6Profile,
				"/srv/app",
				"sftp://deploy@[::1]:22/srv/app/releases",
			),
		).toBe("/srv/app/releases");
		expect(
			formatSftpProfileUri({
				...profile,
				host: "::1",
				root: "./release #1",
			}),
		).toBe("sftp://deploy@[::1]:2222/./release%20%231");
		const specialPath = "/srv/app/release #1?.txt";
		const specialUri = formatSftpUri(profile, specialPath);
		expect(specialUri).toBe(
			"sftp://deploy@prod.example.com:2222/srv/app/release%20%231%3F.txt",
		);
		expect(resolveSftpProviderPath(profile, "/srv/app", specialUri)).toBe(
			specialPath,
		);
	});

	test("formats OpenSSH-compatible SHA256 fingerprints and audit rows", () => {
		const fingerprint = createSftpHostKeyFingerprint(Buffer.from("host-key"));
		expect(fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
		expect(normalizeSftpHostKeyFingerprint(`${fingerprint}=`)).toBe(
			fingerprint,
		);
		expect(normalizeSftpHostKeyFingerprint(`${fingerprint}==`)).toBeUndefined();
		expect(
			formatReadOnlySftpConnectionAuditMessage({
				status: "connected",
				id: "prod",
				target: "sftp://deploy@prod.example.com:2222/srv/app",
				host: "prod.example.com",
				port: 2222,
				fingerprint,
				message: "read-only SFTP connected entries=2",
			}),
		).toContain("status=connected");
		expect(
			formatReadOnlySftpConnectionAuditMessage({
				status: "connected",
				id: "prod",
				target: "sftp://deploy@prod.example.com:2222/srv/app",
				host: "prod.example.com",
				port: 2222,
				fingerprint,
				message: "read-only SFTP connected entries=2",
			}),
		).toContain("fingerprint=SHA256:");
		expect(
			formatReadOnlySftpConnectionAuditMessage({
				status: "failed",
				id: "prod",
				target: "sftp://deploy@prod.example.com:2222/srv/app",
				host: "prod.example.com",
				port: 2222,
				fingerprint,
				message: "remote\nerror",
			}),
		).toContain('message="remote\\nerror"');
		expect(
			formatReadOnlySftpConnectionAuditMessage({
				status: "cancelled",
				id: "prod",
				target: "sftp://deploy@prod.example.com:2222/srv/app",
				host: "prod.example.com",
				port: 2222,
				fingerprint,
				message: "cancelled by operator",
			}),
		).toContain("status=cancelled");
	});

	test("models visible connection, cancellation, retry, and disconnect diagnostics", () => {
		const fingerprint = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
		const first = startReadOnlySftpConnectionDiagnostic(
			profile,
			fingerprint,
			undefined,
			1_000,
		);
		expect(formatReadOnlySftpConnectionDiagnosticRows(first)).toContain(
			"status=connecting attempt=1 duration=running network=opening",
		);
		const cancelling = requestReadOnlySftpConnectionCancellation(first);
		expect(cancelling.status).toBe("cancelling");
		expect(formatReadOnlySftpConnectionDiagnosticRows(cancelling)).toContain(
			"status=cancelling attempt=1 duration=running network=closing",
		);
		const cancelled = finishReadOnlySftpConnectionDiagnostic(
			cancelling,
			"cancelled",
			"cancelled by operator",
			1_125,
		);
		expect(formatReadOnlySftpConnectionDiagnosticRows(cancelled)).toContain(
			"status=cancelled attempt=1 duration=125ms network=closed",
		);
		expect(
			formatReadOnlySftpConnectionDiagnosticRows(cancelled).at(-1),
		).toContain("R retry");

		const retry = startReadOnlySftpConnectionDiagnostic(
			profile,
			fingerprint,
			cancelled,
			2_000,
		);
		expect(retry.attempt).toBe(2);
		const connected = finishReadOnlySftpConnectionDiagnostic(
			retry,
			"connected",
			"entries=3",
			2_200,
		);
		expect(formatReadOnlySftpConnectionDiagnosticRows(connected)).toContain(
			"status=connected attempt=2 duration=200ms network=opened",
		);
		const disconnected = finishReadOnlySftpConnectionDiagnostic(
			connected,
			"disconnected",
			"closed",
			3_000,
		);
		expect(disconnected.status).toBe("disconnected");
		expect(
			isReadOnlySftpConnectionCancelledError(
				new ReadOnlySftpConnectionCancelledError(),
			),
		).toBeTrue();
	});
});
