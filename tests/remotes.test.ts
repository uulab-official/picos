import { describe, expect, test } from "bun:test";
import { defaultConfig, mergeConfig } from "../src/config/schema";
import {
	createRemoteFileContext,
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
});
