import { describe, expect, test } from "bun:test";
import {
	buildExternalOpenPlan,
	formatExternalOpenPlanRows,
	runExternalOpenPlan,
} from "../src/core/externalOpen";

describe("external URL open planning", () => {
	test("builds platform opener commands only for https update handoff links", () => {
		expect(
			buildExternalOpenPlan({
				source: "update-handoff",
				label: "GitHub Release",
				url: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
				platform: "darwin",
			}),
		).toEqual({
			source: "update-handoff",
			label: "GitHub Release",
			url: "https://github.com/uulab-official/picos/releases/tag/v0.3.0",
			risk: "write",
			privilege: "user",
			confirmationRequired: true,
			confirmationPhrase: "open",
			confirmed: false,
			enabled: false,
			reason: "type open to launch external browser",
			adapter: {
				platform: "darwin",
				command: "open",
				args: ["https://github.com/uulab-official/picos/releases/tag/v0.3.0"],
			},
		});

		expect(
			buildExternalOpenPlan({
				source: "update-handoff",
				label: "npm package",
				url: "http://example.com/package",
				platform: "linux",
			}),
		).toMatchObject({
			enabled: false,
			reason: "external open only allows https URLs",
			adapter: { command: "xdg-open" },
		});
	});

	test("formats operator-visible preview rows", () => {
		const plan = buildExternalOpenPlan({
			source: "update-handoff",
			label: "CHANGELOG",
			url: "https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
			platform: "win32",
		});

		expect(formatExternalOpenPlanRows(plan)).toEqual([
			"EXTERNAL OPEN update-handoff",
			"label CHANGELOG",
			"risk=write privilege=user confirmed=false",
			"confirm open locked",
			"adapter=windows",
			"command=rundll32 url.dll,FileProtocolHandler https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
			"url=https://github.com/uulab-official/picos/blob/main/CHANGELOG.md",
		]);
	});

	test("runs an external opener only after exact confirmation", async () => {
		const locked = buildExternalOpenPlan({
			source: "update-handoff",
			label: "npm package",
			url: "https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
			platform: "linux",
		});
		let called = false;

		const blocked = await runExternalOpenPlan(locked, async () => {
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
				action: "external.open",
				confirmed: false,
				adapter: "xdg-open",
			}),
			error: "External open is locked: type open to launch external browser",
		});

		const opened = await runExternalOpenPlan(
			buildExternalOpenPlan({
				source: "update-handoff",
				label: "npm package",
				url: "https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
				platform: "linux",
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
				action: "external.open",
				confirmed: true,
				adapter: "xdg-open",
				url: "https://www.npmjs.com/package/@uulab/picos/v/0.3.0",
			}),
			stdout: "opened",
		});
	});
});
