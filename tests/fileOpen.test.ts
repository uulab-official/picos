import { describe, expect, test } from "bun:test";
import {
	buildFileOpenPlan,
	formatFileOpenPlanRows,
	runFileOpenPlan,
} from "../src/core/fileOpen";

const baseDir = "/Users/me/.config/picos";
const handoffPath =
	"/Users/me/.config/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md";

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
				label: "outside",
				path: "/Users/me/Downloads/picos-routes.md",
				platform: "linux",
				source: "route-handoff",
				confirmation: "open",
			}),
		).toMatchObject({
			enabled: false,
			reason: "external file open is limited to picos handoff files",
			adapter: { command: "xdg-open" },
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
