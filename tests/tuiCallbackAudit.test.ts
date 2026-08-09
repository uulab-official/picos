import { describe, expect, test } from "bun:test";
import { tuiCallbackManifest } from "../scripts/support/tuiCallbackManifest";
import {
	auditTuiCallbacks,
	extractTuiCallbackInventory,
	type TuiCallbackManifestRow,
} from "../scripts/tuiCallbackAudit";

const callbackFixture = `
function App() {

	const oneLine = useCallback(() => {}, []);
	const wrapped =
		useCallback(
			() => {},
			[],
		);
	useInput((input: string) => input);
}
`;

const manifest = (
	name: string,
	overrides: Partial<TuiCallbackManifestRow> = {},
): TuiCallbackManifestRow => ({
	name,
	owner: "callbackAudit.ts",
	classification: "delegated",
	slice: "inventory",
	reason: "delegates to the callback audit",
	...overrides,
});

describe("TUI callback audit", () => {
	test("finds one-line and line-wrapped callbacks plus the input dispatcher", () => {
		expect(extractTuiCallbackInventory(callbackFixture)).toEqual([
			{ name: "oneLine", startLine: 4, endLine: 4 },
			{ name: "wrapped", startLine: 5, endLine: 9 },
			{ name: "useInput", startLine: 10, endLine: 10 },
		]);
	});

	test("names every wrapped App callback in the baseline manifest", () => {
		const names = tuiCallbackManifest.map((row) => row.name);

		expect(names).toEqual(
			expect.arrayContaining([
				"openSelectedStatusActivityToolsEvidenceSearchMatchFile",
				"openSelectedStatusActivityToolsEvidenceSearchMatchArchive",
				"openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff",
			]),
		);
	});

	test("rejects duplicate inventory names", () => {
		const sourceText = `
			const save = useCallback(() => {}, []);
			const save = useCallback(() => {}, []);
		`;

		expect(() =>
			auditTuiCallbacks({ sourceText, manifest: [manifest("save")] }),
		).toThrow("duplicate inventory name: save");
	});

	test("rejects duplicate, missing, and stale manifest names", () => {
		const sourceText = "const save = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save"), manifest("save")],
			}),
		).toThrow("duplicate manifest name: save");
		expect(() => auditTuiCallbacks({ sourceText, manifest: [] })).toThrow(
			"missing manifest entry: save",
		);
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save"), manifest("oldSave")],
			}),
		).toThrow("stale manifest entry: oldSave");
	});

	test("rejects invalid manifest classifications and incomplete wiring reasons", () => {
		const sourceText = "const save = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { owner: "" })],
			}),
		).toThrow("blank owner: save");
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { slice: "" })],
			}),
		).toThrow("blank slice: save");
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [
					manifest("save", { classification: "unclassified" as never }),
				],
			}),
		).toThrow("unsupported classification: save");
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { classification: "wiring", reason: "" })],
			}),
		).toThrow("unpermitted wiring reason: save");
	});

	test("permits only the documented wiring callback and reason pairs", () => {
		const pairs = [
			["log", "React setter/event publication"],
			["beginCommand", "React setter/event publication"],
			["endCommand", "React setter/event publication"],
			["refreshFiles", "direct I/O invocation"],
			["refresh", "direct I/O invocation"],
		] as const;

		for (const [name, reason] of pairs) {
			expect(() =>
				auditTuiCallbacks({
					sourceText: `const ${name} = useCallback(() => {}, []);`,
					manifest: [manifest(name, { classification: "wiring", reason })],
				}),
			).not.toThrow();
		}

		expect(() =>
			auditTuiCallbacks({
				sourceText: "const log = useCallback(() => {}, []);",
				manifest: [
					manifest("log", {
						classification: "wiring",
						reason: "direct I/O invocation",
					}),
				],
			}),
		).toThrow(
			"mismatched wiring reason: log expected=React setter/event publication",
		);
	});

	test("rejects an allowed wiring reason on an unapproved callback", () => {
		const sourceText = "const save = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [
					manifest("save", {
						classification: "wiring",
						reason: "direct I/O invocation",
					}),
				],
			}),
		).toThrow("unpermitted wiring callback: save");
	});

	test("rejects inline domain-selection arithmetic but excludes layout sizing", () => {
		const sourceText = `
			const select = useCallback(() => {
				setSelectedIndex(Math.min(Math.max(index, 0), items.length - 1));
			}, [index, items.length]);
			const layout = useCallback(() => Math.max(1, width - 4), [width]);
		`;

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("select"), manifest("layout")],
			}),
		).toThrow(
			"inline domain-selection clamp: select line=3 expression=Math.min(Math.max(index, 0), items.length - 1)",
		);

		expect(() =>
			auditTuiCallbacks({
				sourceText:
					"const layout = useCallback(() => Math.max(1, width - 4), [width]);",
				manifest: [manifest("layout")],
				mathBoundaryAllowlist: [
					{
						name: "layout",
						line: 1,
						occurrence: 1,
						expression: "Math.max(1, width - 4)",
						reason: "layout sizing/clipping",
					},
				],
			}),
		).not.toThrow();
	});

	test("rejects total-based clamps and stale layout allowlist entries", () => {
		const sourceText = `
			const select = useCallback(() => {
				const next = Math.min(Math.max(value, 0), total - 1);
				setSelectedIndex(next);
			}, [total, value]);
		`;

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("select")],
			}),
		).toThrow(
			"inline domain-selection clamp: select line=3 expression=Math.min(Math.max(value, 0), total - 1)",
		);
		expect(() =>
			auditTuiCallbacks({
				sourceText: "const layout = useCallback(() => {}, []);",
				manifest: [manifest("layout")],
				mathBoundaryAllowlist: [
					{
						name: "layout",
						line: 1,
						occurrence: 1,
						expression: "Math.max(1, width - 4)",
						reason: "layout sizing/clipping",
					},
				],
			}),
		).toThrow("stale callback Math allowlist entry: layout");
	});

	test("binds each layout allowlist entry to one Math occurrence", () => {
		const sourceText =
			"const layout = useCallback(() => [Math.max(1, width), Math.max(1, width)], [width]);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("layout")],
				mathBoundaryAllowlist: [
					{
						name: "layout",
						line: 1,
						occurrence: 1,
						expression: "Math.max(1, width)",
						reason: "layout sizing/clipping",
					},
				],
			}),
		).toThrow(
			"inline domain-selection clamp: layout line=1 expression=Math.max(1, width)",
		);
	});

	test("rejects name and length-alias clamp evasions", () => {
		const fixtures = [
			`const move = useCallback(() => {
				setActiveRow(Math.max(0, rows.length - 1));
			}, [rows.length]);`,
			`const move = useCallback(() => {
				const last = items.length - 1;
				setPosition(Math.min(position, last));
			}, [items.length, position]);`,
		];

		for (const sourceText of fixtures) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: [manifest("move")],
				}),
			).toThrow("inline domain-selection clamp: move");
		}
	});

	test("rejects computed Math, aliased clamps, and direct clampIndex calls", () => {
		const fixtures = [
			`const move = React.useCallback(() => {
				setSelectedIndex(Math["min"](index, items.length - 1));
			}, [index, items.length]);`,
			`const move = useCallback(() => {
				const min = Math.min;
				setSelectedIndex(min(index, items.length - 1));
			}, [index, items.length]);`,
			`const move = useCallback(() => {
				setSelectedIndex(clampIndex(index, items.length));
			}, [index, items.length]);`,
		];

		for (const sourceText of fixtures) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: [manifest("move")],
				}),
			).toThrow("inline domain-selection clamp: move");
		}
	});

	test("requires useInput to own an inline handler", () => {
		const sourceText = `
			const handler = () => {};
			useInput(handler);
		`;

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("useInput")],
			}),
		).toThrow("useInput handler must be inline");
	});

	test("requires every delegated owner and its focused test to exist", () => {
		const sourceText = "const save = useCallback(() => {}, []);";
		const exists = new Set(["src/tui/saveOwner.ts", "tests/saveOwner.test.ts"]);

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [
					manifest("save", {
						owner: "src/tui/saveOwner.ts",
					}),
				],
				ownerFileExists: (path) => exists.has(path),
			}),
		).not.toThrow();
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { owner: "imaginary owner" })],
				ownerFileExists: () => false,
			}),
		).toThrow("invalid delegated owner reference: save");
		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => path === "src/tui/saveOwner.ts",
			}),
		).toThrow("missing delegated owner test: tests/saveOwner.test.ts");
	});

	test("strict mode rejects an inline decision", () => {
		const sourceText = "const save = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { classification: "inline-decision" })],
				strict: true,
			}),
		).toThrow("strict audit rejected 1 inline-decision entry");
	});

	test("strict mode locks the App callback inventory baseline", () => {
		const sourceText = "const save = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save")],
				strict: true,
			}),
		).toThrow(
			"strict callback count mismatch callbacks=1/154 useInput=0/1 total=1/155",
		);
	});
});
