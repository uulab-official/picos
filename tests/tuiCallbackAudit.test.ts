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

	test("permits only the documented wiring reasons", () => {
		const sourceText = "const save = useCallback(() => {}, []);";
		const reasons = [
			"React setter/event publication",
			"direct I/O invocation",
			"stale request/run-token publication check",
		];

		for (const reason of reasons) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: [manifest("save", { classification: "wiring", reason })],
				}),
			).not.toThrow();
		}
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
});
