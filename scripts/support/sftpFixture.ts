import { timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import type { Server as NetServer, Socket } from "node:net";
import { posix } from "node:path";
import type { Connection, ParsedKey, SFTPWrapper } from "ssh2";
import { Server, utils } from "ssh2";
import { createSftpHostKeyFingerprint } from "../../src/core/sftp";

const sftpProtocol = utils.sftp;

type FixtureNode = { type: "directory" } | { type: "file"; content: Buffer };

type OpenHandle = {
	kind: "directory" | "file";
	path: string;
	sent: boolean;
};

export type SftpFixtureMetrics = {
	connections: number;
	authenticated: number;
	closed: number;
	writeAttempts: number;
	execAttempts: number;
};

export type SftpIntegrationFixture = {
	host: "127.0.0.1";
	port: number;
	username: "picos";
	root: "/srv/app";
	clientPrivateKey: string;
	hostFingerprint: string;
	knownHosts: string;
	metrics: SftpFixtureMetrics;
	close(): Promise<void>;
};

const FIXTURE_FILES = new Map<string, FixtureNode>([
	["/srv", { type: "directory" }],
	["/srv/app", { type: "directory" }],
	["/srv/app/logs", { type: "directory" }],
	[
		"/srv/app/README.md",
		{ type: "file", content: Buffer.from("picos integration fixture\n") },
	],
	[
		"/srv/app/logs/app.log",
		{ type: "file", content: Buffer.from("fixture ready\n") },
	],
]);
const FIXTURE_CLOSE_TIMEOUT_MS = 5_000;

export async function startSftpIntegrationFixture(): Promise<SftpIntegrationFixture> {
	const hostKey = utils.generateKeyPairSync("ed25519");
	const clientKey = utils.generateKeyPairSync("ed25519");
	const allowedKey = parseFixtureKey(clientKey.public);
	const metrics: SftpFixtureMetrics = {
		connections: 0,
		authenticated: 0,
		closed: 0,
		writeAttempts: 0,
		execAttempts: 0,
	};
	const clients = new Set<Connection>();
	const sockets = new Set<Socket>();
	const server = new Server({ hostKeys: [hostKey.private] }, (client) => {
		metrics.connections += 1;
		clients.add(client);
		const socket = connectionSocket(client);
		if (socket) {
			sockets.add(socket);
			socket.once("close", () => {
				sockets.delete(socket);
				metrics.closed += 1;
			});
		} else {
			client.once("close", () => {
				metrics.closed += 1;
			});
		}
		client
			.on("authentication", (context) => {
				if (
					context.username !== "picos" ||
					context.method !== "publickey" ||
					context.key.algo !== allowedKey.type ||
					!equalBuffers(context.key.data, allowedKey.getPublicSSH())
				) {
					context.reject();
					return;
				}
				if (
					context.signature &&
					(!context.blob ||
						allowedKey.verify(
							context.blob,
							context.signature,
							context.hashAlgo,
						) !== true)
				) {
					context.reject();
					return;
				}
				context.accept();
			})
			.on("ready", () => {
				metrics.authenticated += 1;
				client.on("session", (accept) => {
					const session = accept();
					session.on("exec", (_accept, reject) => {
						metrics.execAttempts += 1;
						reject();
					});
					session.on("sftp", (acceptSftp) => {
						configureReadOnlySftp(acceptSftp(), metrics);
					});
				});
			})
			.on("close", () => {
				clients.delete(client);
			});
	});
	const port = await listen(server);
	return {
		host: "127.0.0.1",
		port,
		username: "picos",
		root: "/srv/app",
		clientPrivateKey: clientKey.private,
		hostFingerprint: createSftpHostKeyFingerprint(
			parseFixtureKey(hostKey.public).getPublicSSH(),
		),
		knownHosts: `[127.0.0.1]:${port} ${hostKey.public.trim()}\n`,
		metrics,
		async close() {
			for (const client of clients) client.end();
			for (const socket of sockets) socket.destroy();
			await closeServer(server, clients, sockets);
		},
	};
}

function configureReadOnlySftp(
	sftp: SFTPWrapper,
	metrics: SftpFixtureMetrics,
): void {
	const handles = new Map<number, OpenHandle>();
	let nextHandle = 1;
	const openHandle = (state: OpenHandle): Buffer => {
		const id = nextHandle++;
		handles.set(id, state);
		const handle = Buffer.alloc(4);
		handle.writeUInt32BE(id);
		return handle;
	};
	const getHandle = (handle: Buffer): OpenHandle | undefined =>
		handle.length === 4 ? handles.get(handle.readUInt32BE(0)) : undefined;
	const rejectMutation = (requestId: number) => {
		metrics.writeAttempts += 1;
		sftp.status(requestId, sftpProtocol.STATUS_CODE.PERMISSION_DENIED);
	};

	sftp
		.on("REALPATH", (requestId, path) => {
			const normalized = normalizeFixturePath(path);
			if (!FIXTURE_FILES.has(normalized)) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.NO_SUCH_FILE);
				return;
			}
			sftp.name(requestId, [
				{
					...fixtureEntry(normalized),
					filename: normalized,
				},
			]);
		})
		.on("STAT", (requestId, path) =>
			sendFixtureAttributes(sftp, requestId, path),
		)
		.on("LSTAT", (requestId, path) =>
			sendFixtureAttributes(sftp, requestId, path),
		)
		.on("FSTAT", (requestId, handle) => {
			const opened = getHandle(handle);
			if (!opened) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.FAILURE);
				return;
			}
			sendFixtureAttributes(sftp, requestId, opened.path);
		})
		.on("OPENDIR", (requestId, path) => {
			const normalized = normalizeFixturePath(path);
			if (FIXTURE_FILES.get(normalized)?.type !== "directory") {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.NO_SUCH_FILE);
				return;
			}
			sftp.handle(
				requestId,
				openHandle({ kind: "directory", path: normalized, sent: false }),
			);
		})
		.on("READDIR", (requestId, handle) => {
			const opened = getHandle(handle);
			if (opened?.kind !== "directory") {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.FAILURE);
				return;
			}
			if (opened.sent) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.EOF);
				return;
			}
			opened.sent = true;
			sftp.name(requestId, listFixtureDirectory(opened.path));
		})
		.on("OPEN", (requestId, path, flags) => {
			const normalized = normalizeFixturePath(path);
			const node = FIXTURE_FILES.get(normalized);
			if (!node) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.NO_SUCH_FILE);
				return;
			}
			if (node.type !== "file") {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.FAILURE);
				return;
			}
			if (
				(flags & sftpProtocol.OPEN_MODE.READ) === 0 ||
				(flags & ~sftpProtocol.OPEN_MODE.READ) !== 0
			) {
				metrics.writeAttempts += 1;
				sftp.status(requestId, sftpProtocol.STATUS_CODE.PERMISSION_DENIED);
				return;
			}
			sftp.handle(
				requestId,
				openHandle({ kind: "file", path: normalized, sent: false }),
			);
		})
		.on("READ", (requestId, handle, offset, length) => {
			const opened = getHandle(handle);
			const node = opened ? FIXTURE_FILES.get(opened.path) : undefined;
			if (opened?.kind !== "file" || node?.type !== "file") {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.FAILURE);
				return;
			}
			const start = Math.max(0, offset);
			const data = node.content.subarray(start, start + length);
			if (data.length === 0) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.EOF);
				return;
			}
			sftp.data(requestId, data);
		})
		.on("CLOSE", (requestId, handle) => {
			if (handle.length !== 4 || !handles.delete(handle.readUInt32BE(0))) {
				sftp.status(requestId, sftpProtocol.STATUS_CODE.FAILURE);
				return;
			}
			sftp.status(requestId, sftpProtocol.STATUS_CODE.OK);
		})
		.on("WRITE", rejectMutation)
		.on("FSETSTAT", rejectMutation)
		.on("SETSTAT", rejectMutation)
		.on("REMOVE", rejectMutation)
		.on("RMDIR", rejectMutation)
		.on("MKDIR", rejectMutation)
		.on("RENAME", rejectMutation)
		.on("SYMLINK", rejectMutation);
}

function sendFixtureAttributes(
	sftp: SFTPWrapper,
	requestId: number,
	path: string,
): void {
	const normalized = normalizeFixturePath(path);
	const node = FIXTURE_FILES.get(normalized);
	if (!node) {
		sftp.status(requestId, sftpProtocol.STATUS_CODE.NO_SUCH_FILE);
		return;
	}
	sftp.attrs(requestId, fixtureAttributes(node));
}

function listFixtureDirectory(path: string) {
	return [...FIXTURE_FILES.entries()]
		.filter(
			([candidate]) => candidate !== path && posix.dirname(candidate) === path,
		)
		.map(([candidate]) => fixtureEntry(candidate));
}

function fixtureEntry(path: string) {
	const node = FIXTURE_FILES.get(path);
	if (!node) throw new Error(`Missing fixture path: ${path}`);
	return {
		filename: path === "/" ? "/" : posix.basename(path),
		longname: `${node.type === "directory" ? "d" : "-"}r--r--r-- 1 picos picos ${node.type === "file" ? node.content.length : 0} fixture ${posix.basename(path)}`,
		attrs: fixtureAttributes(node),
	};
}

function fixtureAttributes(node: FixtureNode) {
	const timestamp = Math.floor(Date.now() / 1000);
	return {
		mode:
			(node.type === "directory" ? constants.S_IFDIR : constants.S_IFREG) |
			constants.S_IRUSR |
			constants.S_IRGRP |
			constants.S_IROTH,
		uid: 1000,
		gid: 1000,
		size: node.type === "file" ? node.content.length : 0,
		atime: timestamp,
		mtime: timestamp,
	};
}

function normalizeFixturePath(path: string): string {
	const absolute = path.startsWith("/") ? path : posix.join("/srv/app", path);
	const normalized = posix.normalize(absolute);
	return normalized === "/." ? "/" : normalized;
}

function parseFixtureKey(value: string): ParsedKey {
	const parsed = utils.parseKey(value);
	if (parsed instanceof Error) throw parsed;
	return parsed;
}

function equalBuffers(left: Buffer, right: Buffer): boolean {
	return left.length === right.length && timingSafeEqual(left, right);
}

function listen(server: NetServer): Promise<number> {
	return new Promise((resolvePort, reject) => {
		const onError = (error: Error) => reject(error);
		server.once("error", onError);
		server.listen(0, "127.0.0.1", () => {
			server.removeListener("error", onError);
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(new Error("SFTP fixture did not expose a TCP port"));
				return;
			}
			resolvePort(address.port);
		});
	});
}

function closeServer(
	server: Server,
	clients: Set<Connection>,
	sockets: Set<Socket>,
): Promise<void> {
	return new Promise((resolveClose, rejectClose) => {
		const timeout = setTimeout(() => {
			for (const client of clients) connectionSocket(client)?.destroy();
			for (const socket of sockets) socket.destroy();
			server.unref();
			rejectClose(
				new Error(
					`SFTP fixture server close exceeded ${FIXTURE_CLOSE_TIMEOUT_MS}ms`,
				),
			);
		}, FIXTURE_CLOSE_TIMEOUT_MS);
		server.close((error) => {
			clearTimeout(timeout);
			if (error) rejectClose(error);
			else resolveClose();
		});
	});
}

function connectionSocket(connection: Connection): Socket | undefined {
	return (connection as Connection & { _sock?: Socket })._sock;
}
