import { describe, expect, test } from "bun:test";
import {
	formatOperationPresetKindsJson,
	formatOperationPresetsJson,
} from "../src/cli/operationPresetsOutput";
import {
	findOperationPresetKindContract,
	listOperationPresetKindContracts,
} from "../src/core/operationPresets";

describe("operation preset JSON output", () => {
	test("omits config paths and redacts saved filter credentials", () => {
		const output = formatOperationPresetsJson({
			action: "list",
			presets: [
				{
					id: "errors",
					kind: "logs",
					limit: 20,
					level: "fail",
					filter: 'token: "abc,def"',
				},
			],
		});
		const document = JSON.parse(output);

		expect(document.source).toEqual({
			kind: "picos-config",
			location: "user-config",
			success: true,
		});
		expect(document.data.presets[0].filter).toBe("token: [REDACTED]");
		expect(output).not.toContain("abc,def");
		expect(output).not.toContain("config.json");
	});

	test("publishes the preset contract with bounds and confirmations", () => {
		const output = formatOperationPresetKindsJson(
			listOperationPresetKindContracts(),
		);
		const document = JSON.parse(output);

		expect(document).toMatchObject({
			command: "operations",
			status: "completed",
			request: { operation: "kinds", presetId: null, kind: null },
			source: { kind: "picos-contract", location: "built-in", success: true },
		});
		expect(document.data.totalCount).toBe(3);
		expect(document.data.returnedCount).toBe(3);
		expect(document.data.limits).toEqual({
			maxPresets: 12,
			maxIdLength: 32,
			maxMonitorIntervalSpanMs: 300000,
			idPattern: "^[a-z0-9][a-z0-9._-]*$",
			idNormalization: "trim-lowercase",
		});
		expect(document.data.confirmations).toEqual({
			save: "save operation preset <id>",
			remove: "remove operation preset <id>",
		});
		expect(document.data.kinds[0].fields[0]).toEqual({
			name: "samples",
			option: "--samples",
			type: "integer",
			required: false,
			default: 1,
			min: 1,
			max: 60,
			maxLength: null,
			choices: null,
		});
		expect(document.data.kinds[1].fields[1].choices).toEqual([
			"all",
			"warn",
			"fail",
			"info",
		]);
		expect(output).not.toContain("config.json");
	});

	test("reports evicted preset ids on save", () => {
		const document = JSON.parse(
			formatOperationPresetsJson({
				action: "save",
				presets: [],
				evicted: ["oldest"],
			}),
		);

		const listed = JSON.parse(
			formatOperationPresetsJson({ action: "list", presets: [] }),
		);

		expect(document.data.evicted).toEqual(["oldest"]);
		expect(listed.data.evicted).toEqual([]);
	});

	test("reports catalog and returned counts when filtered to one kind", () => {
		const monitor = findOperationPresetKindContract("monitor");
		const document = JSON.parse(
			formatOperationPresetKindsJson([monitor], { kind: monitor.kind }),
		);

		expect(document.request.kind).toBe("monitor");
		expect(document.data.totalCount).toBe(3);
		expect(document.data.returnedCount).toBe(1);
		expect(document.data.kinds).toHaveLength(1);
	});
});
