import { describe, expect, test } from "bun:test";
import {
	buildFileOpenPlan,
	formatFileOpenOriginRows,
	formatFileOpenPlanRows,
	runFileOpenPlan,
} from "../src/core/fileOpen";

const baseDir = "/Users/me/.config/picos";
const handoffPath =
	"/Users/me/.config/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md";
const endpointHandoffPath =
	"/Users/me/.config/picos/endpoints/picos-ports-raw-2026-06-30T120000000Z.md";
const cleanupExportPath =
	"/Users/me/.config/picos/cleanup/picos-cleanup-all-2026-07-01T010000000Z.md";
const timelineExportPath =
	"/Users/me/.config/picos/audit/picos-audit-selected-2026-07-01T030000000Z.log";
const timelineArchiveExportPath =
	"/Users/me/.config/picos/audit/archive/picos-audit-selected-2026-07-01T030000000Z.log";
const toolsExportPath =
	"/Users/me/.config/picos/tools/picos-tools-selected-2026-07-01T040000000Z.md";

describe("external file open planning", () => {
	test("builds locked opener plans only for files under the allowed base directory", () => {
		expect(
			buildFileOpenPlan({
				baseDir,
				label: "route raw output",
				path: handoffPath,
				platform: "darwin",
				source: "route-handoff",
			}),
		).toEqual({
			source: "route-handoff",
			label: "route raw output",
			path: handoffPath,
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "open",
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [handoffPath],
			},
		});

		expect(
			buildFileOpenPlan({
				baseDir,
				label: "ports raw output",
				path: endpointHandoffPath,
				platform: "linux",
				source: "endpoint-handoff",
				confirmation: "open",
			}),
		).toMatchObject({
			enabled: true,
			reason: "confirmed",
			adapter: { command: "xdg-open" },
		});

		expect(
			buildFileOpenPlan({
				baseDir,
				label: "outside",
				path: "/Users/me/Downloads/picos-routes.md",
				platform: "linux",
				source: "endpoint-handoff",
				confirmation: "open",
			}),
		).toMatchObject({
			enabled: false,
			reason: "external file open is limited to picos handoff files",
		});
	});

	test("builds locked opener plans for cleanup export files", () => {
		const plan = buildFileOpenPlan({
			baseDir,
			label: "cleanup export all",
			path: cleanupExportPath,
			platform: "darwin",
			source: "cleanup-export",
		});

		expect(plan).toMatchObject({
			source: "cleanup-export",
			label: "cleanup export all",
			path: cleanupExportPath,
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [cleanupExportPath],
			},
		});
		expect(formatFileOpenPlanRows(plan)[0]).toBe("FILE OPEN cleanup-export");
	});

	test("builds locked opener plans for tools evidence export files", () => {
		expect(
			buildFileOpenPlan({
				baseDir,
				label: "tools export selected 2026-07-01T04:00:00.000Z",
				path: toolsExportPath,
				platform: "darwin",
				source: "tools-export",
			}),
		).toMatchObject({
			source: "tools-export",
			label: "tools export selected 2026-07-01T04:00:00.000Z",
			path: toolsExportPath,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				command: "open",
				args: [toolsExportPath],
			},
		});
	});

	test("builds locked opener plans for timeline audit export files", () => {
		const plan = buildFileOpenPlan({
			baseDir,
			label: "audit export selected",
			path: timelineExportPath,
			platform: "darwin",
			source: "timeline-export",
		});

		expect(plan).toMatchObject({
			source: "timeline-export",
			label: "audit export selected",
			path: timelineExportPath,
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [timelineExportPath],
			},
		});
		expect(formatFileOpenPlanRows(plan)[0]).toBe("FILE OPEN timeline-export");
	});

	test("builds locked opener plans for archived timeline audit export files", () => {
		const plan = buildFileOpenPlan({
			baseDir,
			label: "archived audit export selected",
			path: timelineArchiveExportPath,
			platform: "darwin",
			source: "timeline-export",
		});

		expect(plan).toMatchObject({
			source: "timeline-export",
			label: "archived audit export selected",
			path: timelineArchiveExportPath,
			confirmed: false,
			enabled: false,
			reason: "type open to launch external file viewer",
			adapter: {
				platform: "darwin",
				command: "open",
				args: [timelineArchiveExportPath],
			},
		});
	});

	test("formats operator-visible file open previews", () => {
		const plan = buildFileOpenPlan({
			baseDir,
			label: "route diagnostics",
			path: `${baseDir}/routes/picos-routes-diagnostics.md`,
			platform: "win32",
			source: "route-handoff",
		});

		expect(formatFileOpenPlanRows(plan)).toEqual([
			"FILE OPEN route-handoff",
			"label route diagnostics",
			"risk=write privilege=user confirmed=false",
			"confirm open locked",
			"adapter=windows",
			"command=rundll32 url.dll,FileProtocolHandler /Users/me/.config/picos/routes/picos-routes-diagnostics.md",
			"path=/Users/me/.config/picos/routes/picos-routes-diagnostics.md",
		]);
	});

	test("preserves config-origin metadata on file open plans", async () => {
		const origin = {
			kind: "config-shelf" as const,
			target: "routes",
			label: "Routes",
			scope: "routes.filters",
		};
		const plan = buildFileOpenPlan({
			baseDir,
			label: "route raw output",
			path: handoffPath,
			platform: "linux",
			source: "route-handoff",
			origin,
		});

		expect(plan.origin).toEqual(origin);
		expect(formatFileOpenOriginRows(plan)).toEqual([
			"CONFIG ORIGIN Config > Routes",
			"scope=routes.filters dialog=file-open locked esc=keep landing",
		]);
		expect(formatFileOpenPlanRows(plan)).toContain(
			"origin=config-shelf target=routes scope=routes.filters label=Routes",
		);

		const opened = await runFileOpenPlan(
			buildFileOpenPlan({
				baseDir,
				label: plan.label,
				path: plan.path,
				platform: "linux",
				source: plan.source,
				confirmation: "open",
				origin: plan.origin,
			}),
			async (command, args) => ({
				command,
				args,
				stdout: "opened",
				stderr: "",
				exitCode: 0,
				success: true,
			}),
		);

		expect(opened.audit.origin).toEqual(origin);
	});

	test("runs file open plans only after exact confirmation", async () => {
		const locked = buildFileOpenPlan({
			baseDir,
			label: "route raw output",
			path: handoffPath,
			platform: "linux",
			source: "route-handoff",
		});
		let called = false;

		const blocked = await runFileOpenPlan(locked, async () => {
			called = true;
			return {
				command: "xdg-open",
				args: [],
				stdout: "",
				stderr: "",
				exitCode: 0,
				success: true,
			};
		});

		expect(called).toBeFalse();
		expect(blocked).toEqual({
			success: false,
			audit: expect.objectContaining({
				action: "file.open",
				adapter: "xdg-open",
				confirmed: false,
				path: handoffPath,
			}),
			error: "File open is locked: type open to launch external file viewer",
		});

		const opened = await runFileOpenPlan(
			buildFileOpenPlan({
				baseDir,
				label: "route raw output",
				path: handoffPath,
				platform: "linux",
				source: "route-handoff",
				confirmation: "open",
			}),
			async (command, args) => ({
				command,
				args,
				stdout: "opened",
				stderr: "",
				exitCode: 0,
				success: true,
			}),
		);

		expect(opened).toEqual({
			success: true,
			audit: expect.objectContaining({
				action: "file.open",
				adapter: "xdg-open",
				confirmed: true,
				path: handoffPath,
			}),
			stdout: "opened",
		});
	});
});
