import { describe, expect, test } from "bun:test";
import { defaultConfig, mergeConfig } from "../src/config/schema";
import {
	createRemoteFileContext,
	formatRemoteHandoffBoundaryRows,
	formatRemoteHostReviewAuditMessage,
	formatRemoteHostReviewRows,
	formatRemoteProfiles,
	formatRemoteProviderStatus,
	normalizeRemoteProfiles,
	parseRemoteProfileCommand,
} from "../src/core/remotes";

describe("remote profiles", () => {
	test("defaults to no configured remote profiles", () => {
		expect(defaultConfig.remoteProfiles).toEqual([]);
		expect(formatRemoteProfiles([])).toBe("No remote profiles configured.");
	});

	test("normalizes safe SFTP profile fields and drops secrets", () => {
		const profiles = normalizeRemoteProfiles([
			{
				id: "prod",
				host: "example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
				password: "never-store-me",
			},
		]);

		expect(profiles).toEqual([
			{
				id: "prod",
				kind: "sftp",
				host: "example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			},
		]);
		expect(JSON.stringify(profiles)).not.toContain("never-store-me");
	});

	test("ignores invalid remote profile entries", () => {
		expect(
			normalizeRemoteProfiles([
				{ id: "bad host", host: "example.com", username: "me" },
				{ id: "missing-user", host: "example.com" },
				{ id: "bad-port", host: "example.com", username: "me", port: 70000 },
			]),
		).toEqual([]);
	});

	test("merges remote profiles from config input", () => {
		expect(
			mergeConfig({
				remoteProfiles: [
					{
						id: "dev",
						host: "dev.example.com",
						username: "alice",
					},
				],
			}).remoteProfiles,
		).toEqual([
			{
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			},
		]);
	});

	test("formats remote profiles without exposing secrets", () => {
		const output = formatRemoteProfiles([
			{
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			},
		]);

		expect(output).toContain("dev");
		expect(output).toContain("sftp://alice@dev.example.com:22");
		expect(output).toContain("root=.");
	});

	test("parses one-line remote profile commands", () => {
		expect(
			parseRemoteProfileCommand(
				"prod deploy@example.com:2222 /srv/app key=~/.ssh/id_ed25519",
			),
		).toEqual({
			id: "prod",
			kind: "sftp",
			host: "example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});
		expect(parseRemoteProfileCommand("dev alice@dev.example.com")).toEqual({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: ".",
		});
		expect(
			parseRemoteProfileCommand("bad host alice@example.com"),
		).toBeUndefined();
		expect(parseRemoteProfileCommand("prod example.com")).toBeUndefined();
	});

	test("formats remote provider status without opening a network session", async () => {
		const output = await formatRemoteProviderStatus({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(output).toContain("Profile: dev");
		expect(output).toContain("Provider: sftp");
		expect(output).toContain("Root: sftp://alice@dev.example.com:22/srv/app");
		expect(output).toContain("Status: adapter pending");
		expect(output).toContain("REMOTE HANDOFF dev");
		expect(output).toContain("session=staged");
		expect(output).toContain("REMOTE HOST REVIEW dev");
		expect(output).toContain("network=not opened");
	});

	test("creates a locked remote file context for selected profiles", async () => {
		const context = await createRemoteFileContext({
			id: "dev",
			kind: "sftp",
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		});

		expect(context).toEqual({
			id: "dev",
			kind: "sftp",
			label: "dev",
			root: "sftp://alice@dev.example.com:22/srv/app",
			status: "adapter pending",
			writes: "locked",
		});
	});

	test("formats remote handoff boundary rows before and after staging", () => {
		const profile = {
			id: "dev",
			kind: "sftp" as const,
			host: "dev.example.com",
			port: 22,
			username: "alice",
			root: "/srv/app",
		};

		expect(formatRemoteHandoffBoundaryRows({ profile })).toEqual([
			"REMOTE HANDOFF dev",
			"provider=sftp root=sftp://alice@dev.example.com:22/srv/app",
			"status=profile ready writes=locked session=not staged",
			"controls=enter stage · files opens locked SFTP boundary · no network session",
		]);

		expect(
			formatRemoteHandoffBoundaryRows({
				profile,
				context: {
					id: "dev",
					kind: "sftp",
					label: "dev",
					root: "sftp://alice@dev.example.com:22/srv/app",
					status: "adapter pending",
					writes: "locked",
				},
			}),
		).toEqual([
			"REMOTE HANDOFF dev",
			"provider=sftp root=sftp://alice@dev.example.com:22/srv/app",
			"status=adapter pending writes=locked session=staged",
			"controls=enter restage · files opens locked SFTP boundary · no network session",
		]);
	});

	test("formats remote host review rows without secrets or sessions", () => {
		expect(
			formatRemoteHostReviewRows({
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toEqual([
			"REMOTE HOST REVIEW prod",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"identity user=deploy host=prod.example.com port=2222 key=configured",
			"policy=read-only adapter=pending writes=locked network=not opened",
			"confirm=connect remote prod",
			"controls=review host · enter stage context · future connect requires exact confirmation",
		]);

		expect(
			formatRemoteHostReviewRows({
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			}).join("\n"),
		).not.toContain("password");
	});

	test("formats remote host review audit messages without opening sessions", () => {
		expect(
			formatRemoteHostReviewAuditMessage("stage", {
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toBe(
			'remote host review audit action=stage id=prod target="sftp://deploy@prod.example.com:2222/srv/app" host=prod.example.com port=2222 user=deploy key=configured policy=read-only writes=locked network=not-opened confirm="connect remote prod"',
		);

		expect(
			formatRemoteHostReviewAuditMessage("view", {
				id: "dev",
				kind: "sftp",
				host: "dev.example.com",
				port: 22,
				username: "alice",
				root: ".",
			}),
		).not.toContain("password");
	});
});
