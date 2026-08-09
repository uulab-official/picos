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
		const sourceText = `
			import { prepareSave } from "./saveOwner";
			const save = useCallback(() => prepareSave(), []);
		`;
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
				ownerFileRead: () => undefined,
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

	test("requires delegated callback bodies to link to their declared owner", () => {
		const exists = new Set(["src/tui/saveOwner.ts", "tests/saveOwner.test.ts"]);
		const fixtures = [
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 if (!selected) return;
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 if (!selected) { return; }
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 if (selected) consume(transition); else { return; }
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 setSelectedIndex(0);
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 setSelectedIndex(0 as const);
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 setSelectedIndex(getInitialSelectionIndex());
				 return transition;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 setSelectedIndex((prepareSave(), 0));
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 log("warn", "missing selection");
				 return transition;
			 }, []);`,
		];

		for (const [index, sourceText] of fixtures.entries()) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
					ownerFileExists: (path) => exists.has(path),
					ownerFileRead: () => undefined,
				}),
			).toThrow(
				[
					"inline delegated guard: save",
					"inline delegated guard: save",
					"inline delegated guard: save",
					"inline delegated selection publication: save",
					"inline delegated selection publication: save",
					"inline delegated selection publication: save",
					"inline delegated selection publication: save",
					"inline delegated notice: save",
				][index],
			);
		}

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import { prepareSubmission } from "./commandBridge";
				 const save = useCallback(() => prepareSubmission(), []);`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? 'import { prepareSave } from "./saveOwner"; export const prepareSubmission = () => prepareSave();'
						: undefined,
			}),
		).not.toThrow();

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import { prepareSubmission } from "./commandBridge";
				 const save = useCallback(() => prepareSubmission(), []);`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? 'import { prepareSave } from "./saveOwner"; export const prepareSubmission = () => undefined;'
						: undefined,
			}),
		).toThrow("delegated callback has no owner call path: save");
	});

	test("requires selection publications to come from the callback's declared owner", () => {
		const exists = new Set([
			"src/tui/saveOwner.ts",
			"tests/saveOwner.test.ts",
			"src/tui/navigation.ts",
		]);
		const sourceText = `import { prepareSave } from "./saveOwner";
			 import { getInitialSelectionIndex } from "./navigation";
			 const save = useCallback(() => {
				 const transition = prepareSave();
				 setSelectedIndex(getInitialSelectionIndex());
				 return transition;
			 }, []);`;

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: () => undefined,
			}),
		).toThrow("inline delegated selection publication: save");

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import { prepareSave } from "./saveOwner";
				 const save = useCallback((transition: { selectedIndex: number }) => {
					 setSelectedIndex(transition.selectedIndex);
				 }, []);
				 save((prepareSave(), { selectedIndex: 0 }));`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: () => undefined,
			}),
		).toThrow("delegated callback has no owner call path: save");
	});

	test("rejects dead and type-only delegated owner references", () => {
		const exists = new Set(["src/tui/saveOwner.ts", "tests/saveOwner.test.ts"]);
		for (const sourceText of [
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => void prepareSave, []);`,
			`import type { SaveTransition } from "./saveOwner";
			 const save = useCallback((): SaveTransition | undefined => undefined, []);`,
			`import type { SaveTransition } from "./saveOwner";
			 const save = useCallback((transition: SaveTransition) => consume(transition), []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback((prepareSave: () => void) => prepareSave(), []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const run = function prepareSave() { prepareSave(); };
				 run();
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 for (const prepareSave of [() => undefined]) prepareSave();
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 for (let prepareSave = () => undefined; ready; ) prepareSave();
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 for (var prepareSave of [() => undefined]) consume(prepareSave);
				 prepareSave();
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 const dead = () => prepareSave();
				 return undefined;
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 if (false) prepareSave();
			 }, []);`,
			`import { prepareSave } from "./saveOwner";
			 const save = useCallback(() => {
				 if (false && ready) prepareSave();
			 }, []);`,
		]) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
					ownerFileExists: (path) => exists.has(path),
					ownerFileRead: () => undefined,
				}),
			).toThrow("delegated callback has no owner call path: save");
		}

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import type { Submission } from "./commandBridge";
				 const save = useCallback((transition: Submission) => consume(transition), []);`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? 'import { prepareSave } from "./saveOwner"; export type Submission = { kind: "save" }; export const unused = () => prepareSave();'
						: undefined,
			}),
		).toThrow("delegated callback has no owner call path: save");

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import { prepareSubmission } from "./commandBridge";
				 const save = useCallback(() => prepareSubmission(), []);`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? 'import { prepareSave } from "./saveOwner"; export const prepareSubmission = () => { const dead = () => prepareSave(); return undefined; };'
						: undefined,
			}),
		).toThrow("delegated callback has no owner call path: save");

		expect(() =>
			auditTuiCallbacks({
				sourceText: `import { prepareSubmission } from "./commandBridge";
				 const save = useCallback(() => prepareSubmission(), []);`,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? 'import { prepareSave } from "./saveOwner"; export const prepareSubmission = () => { if (false) prepareSave(); };'
						: undefined,
			}),
		).toThrow("delegated callback has no owner call path: save");
	});

	test("accepts only a runtime handler bridge that invokes the callback container", () => {
		const exists = new Set([
			"src/tui/commandBridge.ts",
			"tests/commandBridge.test.ts",
		]);
		const sourceText = `import { prepareEffect, dispatchEffect } from "./commandBridge";
			 const save = useCallback((transition: { kind: "ready" | "notice" }) => {
				 if (transition.kind === "notice") { return; }
				 consume(transition);
			 }, []);
			 const handlers = { save };
			 const effect = prepareEffect();
			 dispatchEffect(effect, handlers);`;
		const manifestRows = [
			manifest("save", { owner: "src/tui/commandBridge.ts" }),
		];

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: manifestRows,
				ownerFileExists: (path) => exists.has(path),
				ownerFileRead: (path) =>
					path === "src/tui/commandBridge.ts"
						? "export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = (effect: never, handlers: { save: (value: never) => void }) => handlers.save(effect);"
						: undefined,
			}),
		).not.toThrow();

		for (const bridgeSource of [
			"export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = () => undefined;",
			"export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = (effect: never, handlers: { save: (value: never) => void }) => { handlers.save.bind(undefined); };",
			"export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = (effect: never, handlers: { save: (value: never) => void; other: (value: never) => void }) => handlers.other(effect);",
			"export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = (effect: never, handlers: { save: (value: never) => void; other: (value: never) => void }) => { const name = 'other'; handlers[name](effect); };",
			"export const prepareEffect = () => ({ transition: { kind: 'ready' } }); export const dispatchEffect = (effect: never, handlers: { save: (value: never) => void }) => { const save = handlers.save; const run = function save() { save(effect); }; run(); };",
		]) {
			expect(() =>
				auditTuiCallbacks({
					sourceText,
					manifest: manifestRows,
					ownerFileExists: (path) => exists.has(path),
					ownerFileRead: (path) =>
						path === "src/tui/commandBridge.ts" ? bridgeSource : undefined,
				}),
			).toThrow("delegated callback has no owner call path: save");
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

	test("strict mode locks the App callback inventory baseline", () => {
		const sourceText = "const log = useCallback(() => {}, []);";

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [
					manifest("log", {
						classification: "wiring",
						reason: "React setter/event publication",
					}),
				],
				strict: true,
			}),
		).toThrow(
			"strict callback count mismatch callbacks=1/154 useInput=0/1 total=1/155",
		);
	});

	test("strict mode requires both delegated owner filesystem adapters", () => {
		const sourceText = `import { prepareSave } from "./saveOwner";
			const save = useCallback(() => prepareSave(), []);`;

		expect(() =>
			auditTuiCallbacks({
				sourceText,
				manifest: [manifest("save", { owner: "src/tui/saveOwner.ts" })],
				ownerFileRead: () => undefined,
				strict: true,
			}),
		).toThrow(
			"strict callback audit requires delegated owner existence checks",
		);
	});
});
