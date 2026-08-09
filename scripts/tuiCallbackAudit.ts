import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { tuiCallbackManifest } from "./support/tuiCallbackManifest";

export const permittedWiringReasons = [
	"React setter/event publication",
	"direct I/O invocation",
	"stale request/run-token publication check",
] as const;

export const permittedWiringCallbacks = {
	log: "React setter/event publication",
	beginCommand: "React setter/event publication",
	endCommand: "React setter/event publication",
	refreshFiles: "direct I/O invocation",
	refresh: "direct I/O invocation",
} as const;

export const expectedTuiCallbackCounts = {
	callbacks: 154,
	useInput: 1,
	total: 155,
} as const;

export type TuiCallbackClassification =
	| "inline-decision"
	| "delegated"
	| "wiring";

export type TuiCallbackManifestRow = {
	name: string;
	owner: string;
	classification: TuiCallbackClassification;
	slice: string;
	reason: string;
};

export type TuiCallbackInventoryRow = {
	name: string;
	startLine: number;
	endLine: number;
};

export type TuiInlineSelectionClamp = {
	name: string;
	line: number;
	occurrence: number;
	expression: string;
};

export type TuiCallbackMathBoundaryAllowlistEntry = TuiInlineSelectionClamp & {
	reason: "layout sizing/clipping";
};

type AuditOptions = {
	sourceText: string;
	manifest: readonly TuiCallbackManifestRow[];
	mathBoundaryAllowlist?: readonly TuiCallbackMathBoundaryAllowlistEntry[];
	ownerFileExists?: (path: string) => boolean;
	strict?: boolean;
};

export type TuiCallbackAudit = {
	inventory: TuiCallbackInventoryRow[];
	counts: {
		callbacks: number;
		useInput: number;
		total: number;
		inlineDecisions: number;
		selectionClamps: number;
	};
};

const callbackName = (call: ts.CallExpression, expectedName: string) =>
	(ts.isIdentifier(call.expression) && call.expression.text === expectedName) ||
	(ts.isPropertyAccessExpression(call.expression) &&
		ts.isIdentifier(call.expression.expression) &&
		call.expression.expression.text === "React" &&
		call.expression.name.text === expectedName);

const lineNumber = (sourceFile: ts.SourceFile, position: number) =>
	sourceFile.getLineAndCharacterOfPosition(position).line + 1;

export function extractTuiCallbackInventory(
	sourceText: string,
): TuiCallbackInventoryRow[] {
	const sourceFile = ts.createSourceFile(
		"App.tsx",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const inventory: TuiCallbackInventoryRow[] = [];

	const visit = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			callbackName(node.initializer, "useCallback")
		) {
			inventory.push({
				name: node.name.text,
				startLine: lineNumber(sourceFile, node.getStart(sourceFile)),
				endLine: lineNumber(sourceFile, node.getEnd()),
			});
		}

		if (
			ts.isCallExpression(node) &&
			callbackName(node, "useInput") &&
			ts.isExpressionStatement(node.parent)
		) {
			inventory.push({
				name: "useInput",
				startLine: lineNumber(sourceFile, node.getStart(sourceFile)),
				endLine: lineNumber(sourceFile, node.getEnd()),
			});
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return inventory;
}

const isInlineFunction = (
	node: ts.Node | undefined,
): node is ts.ArrowFunction | ts.FunctionExpression =>
	Boolean(node) &&
	(ts.isArrowFunction(node as ts.Node) ||
		ts.isFunctionExpression(node as ts.Node));

const getMathBoundaryName = (
	node: ts.Expression,
): "min" | "max" | undefined => {
	if (
		ts.isPropertyAccessExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "Math" &&
		(node.name.text === "min" || node.name.text === "max")
	) {
		return node.name.text;
	}
	if (
		ts.isElementAccessExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "Math" &&
		node.argumentExpression &&
		ts.isStringLiteral(node.argumentExpression) &&
		(node.argumentExpression.text === "min" ||
			node.argumentExpression.text === "max")
	) {
		return node.argumentExpression.text;
	}
	return undefined;
};

export function extractInlineDomainSelectionClamps(
	sourceText: string,
): TuiInlineSelectionClamp[] {
	const sourceFile = ts.createSourceFile(
		"App.tsx",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const clamps: TuiInlineSelectionClamp[] = [];
	const occurrences = new Map<string, number>();

	const inspectCallback = (
		name: string,
		callback: ts.Node | undefined,
	): void => {
		if (!callback) return;
		const boundaryAliases = new Set<string>(["clampIndex"]);
		const collectAliases = (node: ts.Node): void => {
			if (
				ts.isVariableDeclaration(node) &&
				ts.isIdentifier(node.name) &&
				node.initializer &&
				(getMathBoundaryName(node.initializer) ||
					(ts.isIdentifier(node.initializer) &&
						boundaryAliases.has(node.initializer.text)))
			) {
				boundaryAliases.add(node.name.text);
			}
			ts.forEachChild(node, collectAliases);
		};
		collectAliases(callback);

		const isBoundaryCall = (node: ts.Node): node is ts.CallExpression =>
			ts.isCallExpression(node) &&
			(Boolean(getMathBoundaryName(node.expression)) ||
				(ts.isIdentifier(node.expression) &&
					boundaryAliases.has(node.expression.text)));
		const visit = (node: ts.Node): void => {
			if (isBoundaryCall(node) && !isBoundaryCall(node.parent)) {
				const line = lineNumber(sourceFile, node.getStart(sourceFile));
				const expression = node.getText(sourceFile);
				const occurrenceKey = `${name}\0${line}\0${expression}`;
				const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1;
				occurrences.set(occurrenceKey, occurrence);
				clamps.push({
					name,
					line,
					occurrence,
					expression,
				});
				return;
			}
			ts.forEachChild(node, visit);
		};
		visit(callback);
	};

	const visit = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			callbackName(node.initializer, "useCallback")
		) {
			inspectCallback(node.name.text, node.initializer.arguments[0]);
		}
		if (
			ts.isCallExpression(node) &&
			callbackName(node, "useInput") &&
			ts.isExpressionStatement(node.parent)
		) {
			if (!isInlineFunction(node.arguments[0])) {
				fail("useInput handler must be inline");
			}
			inspectCallback("useInput", node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return clamps;
}

const findDuplicateName = (rows: readonly { name: string }[]) => {
	const names = new Set<string>();
	for (const { name } of rows) {
		if (names.has(name)) {
			return name;
		}
		names.add(name);
	}
	return undefined;
};

const fail = (message: string): never => {
	throw new Error(message);
};

const mathBoundaryKey = (entry: TuiInlineSelectionClamp) =>
	`${entry.name}\0${entry.line}\0${entry.occurrence}\0${entry.expression}`;

function resolveInlineDomainSelectionClamps(
	sourceText: string,
	allowlist: readonly TuiCallbackMathBoundaryAllowlistEntry[],
): TuiInlineSelectionClamp[] {
	const candidates = extractInlineDomainSelectionClamps(sourceText);
	const candidateKeys = new Set(candidates.map(mathBoundaryKey));
	const allowedKeys = new Set<string>();
	for (const entry of allowlist) {
		if (entry.reason !== "layout sizing/clipping") {
			fail(`unpermitted callback Math allowlist reason: ${entry.name}`);
		}
		const key = mathBoundaryKey(entry);
		if (allowedKeys.has(key)) {
			fail(`duplicate callback Math allowlist entry: ${entry.name}`);
		}
		if (!candidateKeys.has(key)) {
			fail(`stale callback Math allowlist entry: ${entry.name}`);
		}
		allowedKeys.add(key);
	}
	return candidates.filter(
		(candidate) => !allowedKeys.has(mathBoundaryKey(candidate)),
	);
}

export function auditTuiCallbacks({
	sourceText,
	manifest,
	mathBoundaryAllowlist = [],
	ownerFileExists,
	strict = false,
}: AuditOptions): TuiCallbackAudit {
	const inventory = extractTuiCallbackInventory(sourceText);
	const duplicateInventoryName = findDuplicateName(inventory);
	if (duplicateInventoryName) {
		fail(`duplicate inventory name: ${duplicateInventoryName}`);
	}

	const duplicateManifestName = findDuplicateName(manifest);
	if (duplicateManifestName) {
		fail(`duplicate manifest name: ${duplicateManifestName}`);
	}

	const inventoryNames = new Set(inventory.map((row) => row.name));
	const manifestNames = new Set(manifest.map((row) => row.name));
	for (const name of inventoryNames) {
		if (!manifestNames.has(name)) {
			fail(`missing manifest entry: ${name}`);
		}
	}
	for (const name of manifestNames) {
		if (!inventoryNames.has(name)) {
			fail(`stale manifest entry: ${name}`);
		}
	}

	const classifications = new Set<TuiCallbackClassification>([
		"inline-decision",
		"delegated",
		"wiring",
	]);
	const permittedReasons = new Set<string>(permittedWiringReasons);
	for (const row of manifest) {
		if (!row.owner.trim()) {
			fail(`blank owner: ${row.name}`);
		}
		if (!row.slice.trim()) {
			fail(`blank slice: ${row.name}`);
		}
		if (!classifications.has(row.classification)) {
			fail(`unsupported classification: ${row.name}`);
		}
		if (row.classification === "wiring") {
			if (!permittedReasons.has(row.reason)) {
				fail(`unpermitted wiring reason: ${row.name}`);
			}
			const expectedReason = (
				permittedWiringCallbacks as Readonly<Record<string, string>>
			)[row.name];
			if (!expectedReason) {
				fail(`unpermitted wiring callback: ${row.name}`);
			}
			if (row.reason !== expectedReason) {
				fail(
					`mismatched wiring reason: ${row.name} expected=${expectedReason}`,
				);
			}
		} else if (row.classification === "delegated" && ownerFileExists) {
			const owners = row.owner.split(" + ");
			if (
				owners.length === 0 ||
				owners.some((owner) => !/^src\/tui\/[A-Za-z0-9]+\.tsx?$/.test(owner))
			) {
				fail(`invalid delegated owner reference: ${row.name}`);
			}
			for (const owner of owners) {
				if (!ownerFileExists(owner)) {
					fail(`missing delegated owner: ${owner}`);
				}
				const testPath = `tests/${basename(owner).replace(/\.tsx?$/, ".test.ts")}`;
				if (!ownerFileExists(testPath)) {
					fail(`missing delegated owner test: ${testPath}`);
				}
			}
		}
	}

	const selectionClamps = resolveInlineDomainSelectionClamps(
		sourceText,
		mathBoundaryAllowlist,
	);
	if (selectionClamps[0]) {
		const clamp = selectionClamps[0];
		fail(
			`inline domain-selection clamp: ${clamp.name} line=${clamp.line} expression=${clamp.expression}`,
		);
	}

	const inlineDecisions = manifest.filter(
		(row) => row.classification === "inline-decision",
	).length;
	if (strict && inlineDecisions > 0) {
		fail(
			`strict audit rejected ${inlineDecisions} inline-decision entr${inlineDecisions === 1 ? "y" : "ies"}`,
		);
	}
	const callbackCount = inventory.filter(
		(row) => row.name !== "useInput",
	).length;
	const useInputCount = inventory.length - callbackCount;
	if (
		strict &&
		(callbackCount !== expectedTuiCallbackCounts.callbacks ||
			useInputCount !== expectedTuiCallbackCounts.useInput ||
			inventory.length !== expectedTuiCallbackCounts.total)
	) {
		fail(
			`strict callback count mismatch callbacks=${callbackCount}/${expectedTuiCallbackCounts.callbacks} useInput=${useInputCount}/${expectedTuiCallbackCounts.useInput} total=${inventory.length}/${expectedTuiCallbackCounts.total}`,
		);
	}

	return {
		inventory,
		counts: {
			callbacks: callbackCount,
			useInput: useInputCount,
			total: inventory.length,
			inlineDecisions,
			selectionClamps: selectionClamps.length,
		},
	};
}

const appSourcePath = fileURLToPath(
	new URL("../src/tui/App.tsx", import.meta.url),
);

export const appCallbackMathBoundaryAllowlist =
	[] as const satisfies readonly TuiCallbackMathBoundaryAllowlistEntry[];

export function runTuiCallbackAudit(
	args: readonly string[] = process.argv.slice(2),
) {
	const sourceText = readFileSync(appSourcePath, "utf8");
	const strict = args.includes("--strict");
	const inventory = extractTuiCallbackInventory(sourceText);
	const callbackCount = inventory.filter(
		(row) => row.name !== "useInput",
	).length;
	const useInputCount = inventory.length - callbackCount;
	const inlineDecisions = tuiCallbackManifest.filter(
		(row) => row.classification === "inline-decision",
	).length;
	let selectionClamps = extractInlineDomainSelectionClamps(sourceText).length;

	try {
		const audit = auditTuiCallbacks({
			sourceText,
			manifest: tuiCallbackManifest,
			mathBoundaryAllowlist: appCallbackMathBoundaryAllowlist,
			ownerFileExists: (path) =>
				existsSync(
					resolve(fileURLToPath(new URL("..", import.meta.url)), path),
				),
			strict,
		});
		selectionClamps = audit.counts.selectionClamps;
		console.log(JSON.stringify(audit));
		return audit;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.log(
			JSON.stringify({
				inventory,
				counts: {
					callbacks: callbackCount,
					useInput: useInputCount,
					total: inventory.length,
					inlineDecisions,
					selectionClamps,
				},
				error: message,
			}),
		);
		process.exitCode = 1;
		return undefined;
	}
}

if (import.meta.main) {
	runTuiCallbackAudit();
}
