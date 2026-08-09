import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	readConfig,
	resetConfigWorkspaceValues,
	setConfigEndpointFilterPresets,
	setConfigEndpointSort,
	setConfigInterfaceEvidenceSearchPresets,
	setConfigLogProfiles,
	setConfigLogSearchPresets,
	setConfigOperationPresets,
	setConfigRouteFilterPresets,
	setConfigToolHistoryPreferences,
	setConfigToolTargetPresets,
	setConfigValue,
	upsertConfigRemoteProfile,
	writeConfig,
} from "../src/config/store";

const tempDirs: string[] = [];

async function tempConfigPath(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "picos-config-"));
	tempDirs.push(dir);
	return join(dir, "config.json");
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("config store", () => {
	test("serializes concurrent read-modify-write mutations for one config path", async () => {
		const path = await tempConfigPath();

		await Promise.all([
			upsertConfigRemoteProfile(
				{
					id: "prod",
					kind: "sftp",
					host: "prod.example.com",
					port: 22,
					username: "operator",
					root: "/srv/app",
				},
				path,
			),
			setConfigLogSearchPresets(["kernel"], path),
			setConfigValue("theme", "light", path),
		]);

		const config = await readConfig(path);
		expect(config.theme).toBe("light");
		expect(config.logSearchPresets).toEqual(["kernel"]);
		expect(config.remoteProfiles.map((profile) => profile.id)).toEqual([
			"prod",
		]);
	});

	test("applies a core reset without rebuilding the write plan in App", async () => {
		const path = await tempConfigPath();
		await mkdir(dirname(path), { recursive: true });
		await writeFile(
			path,
			JSON.stringify({
				theme: "light",
				toolTargetPresets: [
					{ id: "api", actionId: "tools.dns", target: "api.example.com" },
					{ id: "db", actionId: "tools.dns", target: "db.example.com" },
				],
			}),
		);

		const config = await resetConfigWorkspaceValues(
			{
				auditArchiveRetentionLimit: 10,
				toolTargetPresetLimit: 1,
				language: "en",
				refreshInterval: 3000,
				defaultPingHost: "google.com",
				controlExecutionMode: "disabled",
				allowAdminDryRun: false,
				enableExperimentalControls: false,
				editorSaveMode: "disabled",
				statusResultJumpClassFilter: "all",
			},
			path,
		);

		expect(config.theme).toBe("light");
		expect(config.toolTargetPresets).toHaveLength(1);
	});

	test("upserts a remote profile without rebuilding config in App", async () => {
		const path = await tempConfigPath();
		await mkdir(dirname(path), { recursive: true });
		await writeFile(
			path,
			JSON.stringify({
				theme: "light",
				remoteProfiles: [
					{
						id: "prod",
						kind: "sftp",
						host: "old.example.com",
						port: 22,
						username: "deploy",
					},
				],
			}),
		);

		const config = await upsertConfigRemoteProfile(
			{
				id: "prod",
				kind: "sftp",
				host: "new.example.com",
				port: 2222,
				username: "operator",
				root: "/srv/app",
			},
			path,
		);

		expect(config.theme).toBe("light");
		expect(config.remoteProfiles).toEqual([
			{
				id: "prod",
				kind: "sftp",
				host: "new.example.com",
				port: 2222,
				username: "operator",
				root: "/srv/app",
			},
		]);
	});

	test("persists normalized log profiles without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigLogProfiles(
			[
				{ level: "warn", query: " kernel " },
				{ level: "all", query: "" },
				{ level: "warn", query: "kernel" },
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.logProfiles).toEqual([
			{ level: "warn", query: "kernel" },
			{ level: "all", query: "" },
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).logProfiles).toEqual(config.logProfiles);
	});

	test("persists normalized log search presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigLogSearchPresets(
			[" kernel ", "", "error", "kernel", "dns", "route", "boot", "panic", "x"],
			path,
		);

		const config = await readConfig(path);
		expect(config.logSearchPresets).toEqual([
			"kernel",
			"error",
			"dns",
			"route",
			"boot",
			"panic",
		]);
		expect(config.theme).toBe("dark");
	});

	test("persists normalized operation presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigOperationPresets(
			[
				{ id: "pulse", kind: "monitor", samples: 3, intervalMs: 500 },
				{
					id: "errors",
					kind: "logs",
					limit: 20,
					level: "warn",
					filter: "kernel",
				},
				{
					id: "worker",
					kind: "process",
					pid: 42,
					files: true,
					savedAtMs: 1_700_000_000_000,
				},
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.operationPresets).toHaveLength(3);
		expect(config.operationPresets[0]).toMatchObject({
			id: "pulse",
			kind: "monitor",
		});
		expect(config.theme).toBe("dark");
		const raw = JSON.parse(await readFile(path, "utf8"));
		expect(raw.operationPresets).toEqual(config.operationPresets);
	});

	test("keeps operation presets across a whole-config write", async () => {
		const path = await tempConfigPath();
		const preset = {
			id: "pulse",
			kind: "monitor" as const,
			samples: 3,
			intervalMs: 500,
		};
		await setConfigOperationPresets([preset], path);
		const config = await readConfig(path);

		await writeConfig({ ...config, theme: "light" }, path);

		const next = await readConfig(path);

		expect(next.theme).toBe("light");
		expect(next.operationPresets).toEqual([preset]);
	});

	test("persists normalized interface evidence search presets", async () => {
		const path = await tempConfigPath();
		await setConfigInterfaceEvidenceSearchPresets(
			[" Wi-Fi ", "rejected", "WI-FI", "archived"],
			path,
		);

		const config = await readConfig(path);
		expect(config.interfaceEvidenceSearchPresets).toEqual([
			"wi-fi",
			"rejected",
			"archived",
		]);
		expect(config.theme).toBe("dark");
	});

	test("persists normalized route filter presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigRouteFilterPresets(
			[" utun ", "", "default", "utun", "link", "ipv6", "vpn", "metric", "x"],
			path,
		);

		const config = await readConfig(path);
		expect(config.routeFilterPresets).toEqual([
			"utun",
			"default",
			"link",
			"ipv6",
			"vpn",
			"metric",
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).routeFilterPresets).toEqual(
			config.routeFilterPresets,
		);
	});

	test("persists normalized endpoint filter presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigEndpointFilterPresets(
			"connections",
			[" 443 ", "", "node", "443", "ESTABLISHED", "127.0.0.1", "pg", "udp"],
			path,
		);
		await setConfigEndpointFilterPresets(
			"ports",
			[" node ", "", "3000", "node", "postgres", "tcp", "5432", "listen"],
			path,
		);

		const config = await readConfig(path);
		expect(config.connectionFilterPresets).toEqual([
			"443",
			"node",
			"ESTABLISHED",
			"127.0.0.1",
			"pg",
			"udp",
		]);
		expect(config.portFilterPresets).toEqual([
			"node",
			"3000",
			"postgres",
			"tcp",
			"5432",
			"listen",
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).connectionFilterPresets).toEqual(
			config.connectionFilterPresets,
		);
		expect(JSON.parse(raw).portFilterPresets).toEqual(config.portFilterPresets);
	});

	test("persists endpoint sort preferences without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigEndpointSort(
			"connections",
			{ key: "remotePort", direction: "asc" },
			path,
		);
		await setConfigEndpointSort(
			"ports",
			{ key: "pid", direction: "desc" },
			path,
		);

		const config = await readConfig(path);
		expect(config.connectionSort).toBe("remotePort");
		expect(config.portSort).toBe("-pid");
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).connectionSort).toBe("remotePort");
		expect(JSON.parse(raw).portSort).toBe("-pid");
	});

	test("persists tool history preferences without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigToolHistoryPreferences(
			{
				filterPresets: [" dns ", "", "fail", "dns", "tls"],
				sort: "status",
				group: "tool",
				detailView: "compare",
			},
			path,
		);

		const config = await readConfig(path);
		expect(config.toolHistoryFilterPresets).toEqual(["dns", "fail", "tls"]);
		expect(config.toolHistorySort).toBe("status");
		expect(config.toolHistoryGroup).toBe("tool");
		expect(config.toolHistoryDetailView).toBe("compare");
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).toolHistoryFilterPresets).toEqual([
			"dns",
			"fail",
			"tls",
		]);
		expect(JSON.parse(raw).toolHistorySort).toBe("status");
		expect(JSON.parse(raw).toolHistoryGroup).toBe("tool");
		expect(JSON.parse(raw).toolHistoryDetailView).toBe("compare");
	});

	test("persists normalized tool target presets without losing existing config", async () => {
		const path = await tempConfigPath();
		await setConfigToolTargetPresets(
			[
				{
					id: " api ",
					label: " API DNS ",
					actionId: "tools.dns",
					target: " api.example.com ",
					hint: " production api ",
				},
				{
					actionId: "network.connect",
					target: "db.internal:5432",
				},
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.toolTargetPresets).toEqual([
			{
				id: "api",
				label: "API DNS",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "production api",
			},
			{
				id: "network-connect-db-internal-5432",
				label: "network.connect db.internal:5432",
				actionId: "network.connect",
				target: "db.internal:5432",
				hint: "custom target",
			},
		]);
		expect(config.theme).toBe("dark");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).toolTargetPresets).toEqual(config.toolTargetPresets);
	});

	test("applies configured tool target preset retention limits", async () => {
		const path = await tempConfigPath();
		await mkdir(dirname(path), { recursive: true });
		await writeFile(
			path,
			JSON.stringify({ theme: "light", toolTargetPresetLimit: 1 }),
		);

		await setConfigToolTargetPresets(
			[
				{
					id: "api",
					actionId: "tools.dns",
					target: "api.example.com",
				},
				{
					id: "db",
					actionId: "network.connect",
					target: "db.internal:5432",
				},
			],
			path,
		);

		const config = await readConfig(path);
		expect(config.toolTargetPresetLimit).toBe(1);
		expect(config.toolTargetPresets).toEqual([
			{
				id: "api",
				label: "tools.dns api.example.com",
				actionId: "tools.dns",
				target: "api.example.com",
				hint: "custom target",
			},
		]);
		expect(config.theme).toBe("light");
	});

	test("persists audit archive retention limits without losing existing config", async () => {
		const path = await tempConfigPath();
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, JSON.stringify({ theme: "light" }));

		await setConfigValue("auditArchiveRetentionLimit", "20", path);

		const config = await readConfig(path);
		expect(config.auditArchiveRetentionLimit).toBe(20);
		expect(config.theme).toBe("light");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).auditArchiveRetentionLimit).toBe(20);
	});

	test("persists status result jump class filters without losing existing config", async () => {
		const path = await tempConfigPath();
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, JSON.stringify({ theme: "light" }));

		await setConfigValue("statusResultJumpClassFilter", "source", path);

		const config = await readConfig(path);
		expect(config.statusResultJumpClassFilter).toBe("source");
		expect(config.theme).toBe("light");

		const raw = await readFile(path, "utf8");
		expect(JSON.parse(raw).statusResultJumpClassFilter).toBe("source");
	});
});
