import { describe, expect, test } from "bun:test";
import { defaultConfig, mergeConfig } from "../src/config/schema";
import {
	createRemoteConnectPreview,
	createRemoteFileContext,
	formatRemoteAdapterBoundaryRows,
	formatRemoteConnectConfirmationAuditMessage,
	formatRemoteConnectPreviewRows,
	formatRemoteHandoffBoundaryRows,
	formatRemoteHostReviewAuditMessage,
	formatRemoteHostReviewRows,
	formatRemoteProfiles,
	formatRemoteProviderStatus,
	normalizeRemoteProfiles,
	parseRemoteProfileCommand,
	submitRemoteConnectConfirmation,
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
		expect(output).toContain("REMOTE ADAPTER BOUNDARY dev");
		expect(output).toContain(
			"dependency=@uulab/picos-sftp status=not installed",
		);
		expect(output).toContain("REMOTE HOST REVIEW dev");
		expect(output).toContain("network=not opened");
		expect(output).toContain("REMOTE CONNECT PREVIEW dev");
		expect(output).toContain(
			"willExecute=false reason=sftp-adapter-not-installed",
		);
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

	test("formats remote adapter boundary rows before transport exists", () => {
		expect(
			formatRemoteAdapterBoundaryRows({
				id: "prod",
				kind: "sftp",
				host: "prod.example.com",
				port: 2222,
				username: "deploy",
				root: "/srv/app",
				keyPath: "~/.ssh/id_ed25519",
			}),
		).toEqual([
			"REMOTE ADAPTER BOUNDARY prod",
			"transport=sftp dependency=@uulab/picos-sftp status=not installed session=not opened",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"auth=user=deploy key=configured hostKey=unverified",
			"capabilities=list/read planned write locked destructive locked",
			"policy=read-only network=blocked-until-confirm confirm=connect remote prod",
			"controls=enter stage context · future connect opens host review dialog first",
		]);

		expect(formatRemoteAdapterBoundaryRows().join("\n")).toBe(
			[
				"REMOTE ADAPTER BOUNDARY none",
				"transport=sftp dependency=@uulab/picos-sftp status=not installed session=not opened",
				"target=none",
				"auth=user=- key=none hostKey=unverified",
				"capabilities=list/read planned write locked destructive locked",
				"policy=read-only network=blocked-until-profile confirm=select remote profile",
				"controls=j/k select · enter stage context · config remotes create profile",
			].join("\n"),
		);
	});

	test("formats remote connect preview rows without opening transport", () => {
		const preview = createRemoteConnectPreview({
			id: "prod",
			kind: "sftp",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			root: "/srv/app",
			keyPath: "~/.ssh/id_ed25519",
		});

		expect(preview).toEqual({
			id: "prod",
			target: "sftp://deploy@prod.example.com:2222/srv/app",
			host: "prod.example.com",
			port: 2222,
			username: "deploy",
			key: "configured",
			hostKey: "unverified",
			transport: "sftp",
			dependency: "@uulab/picos-sftp",
			status: "blocked",
			reason: "sftp-adapter-not-installed",
			risk: "read",
			privilege: "user",
			confirm: "connect remote prod",
			networkOpened: false,
			writes: "locked",
			destructive: "locked",
		});
		expect(formatRemoteConnectPreviewRows(preview)).toEqual([
			"REMOTE CONNECT PREVIEW prod",
			"dialog=host-review action=connect remote prod status=blocked network=not-opened",
			"target=sftp://deploy@prod.example.com:2222/srv/app",
			"identity user=deploy host=prod.example.com port=2222 key=configured hostKey=unverified",
			"risk=read privilege=user writes=locked destructive=locked",
			'confirm="connect remote prod" willExecute=false reason=sftp-adapter-not-installed',
			"controls=future c confirm host review · enter stage context · no socket opened",
		]);

		expect(formatRemoteConnectPreviewRows().join("\n")).toBe(
			[
				"REMOTE CONNECT PREVIEW none",
				"dialog=host-review action=connect remote status=blocked network=not-opened",
				"target=none",
				"identity user=- host=- port=- key=none hostKey=unverified",
				"risk=read privilege=user writes=locked destructive=locked",
				'confirm="select remote profile" willExecute=false reason=no-remote-profile',
				"controls=j/k select · enter stage context · no socket opened",
			].join("\n"),
		);

		const confirmed = submitRemoteConnectConfirmation(
			preview,
			" connect remote prod ",
		);
		expect(confirmed).toEqual({
			preview,
			status: "confirmed-blocked",
			input: "connect remote prod",
			networkOpened: false,
			message:
				"remote connect blocked prod sftp://deploy@prod.example.com:2222/srv/app",
		});
		expect(formatRemoteConnectConfirmationAuditMessage(confirmed)).toBe(
			'remote connect audit id=prod target="sftp://deploy@prod.example.com:2222/srv/app" status=confirmed-blocked dependency=@uulab/picos-sftp reason=sftp-adapter-not-installed network=not-opened confirm="connect remote prod"',
		);

		expect(submitRemoteConnectConfirmation(preview, "connect prod")).toEqual({
			preview,
			status: "rejected",
			input: "connect prod",
			networkOpened: false,
			message: "remote connect confirmation rejected prod",
		});
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
