import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { tuiCallbackManifest } from "./support/tuiCallbackManifest";

export const permittedWiringReasons = [
	"React setter/event publication",
	"direct I/O invocation",
	"stale request/run-token publication check",
] as const;

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

type AuditOptions = {
	sourceText: string;
	manifest: readonly TuiCallbackManifestRow[];
	strict?: boolean;
};

export type TuiCallbackAudit = {
	inventory: TuiCallbackInventoryRow[];
	counts: {
		callbacks: number;
		useInput: number;
		total: number;
		inlineDecisions: number;
	};
};

const callbackName = (call: ts.CallExpression, expectedName: string) =>
	ts.isIdentifier(call.expression) && call.expression.text === expectedName;

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

export function auditTuiCallbacks({
	sourceText,
	manifest,
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
		if (row.classification === "wiring" && !permittedReasons.has(row.reason)) {
			fail(`unpermitted wiring reason: ${row.name}`);
		}
	}

	const inlineDecisions = manifest.filter(
		(row) => row.classification === "inline-decision",
	).length;
	if (strict && inlineDecisions > 0) {
		fail(
			`strict audit rejected ${inlineDecisions} inline-decision entr${inlineDecisions === 1 ? "y" : "ies"}`,
		);
	}

	return {
		inventory,
		counts: {
			callbacks: inventory.filter((row) => row.name !== "useInput").length,
			useInput: inventory.filter((row) => row.name === "useInput").length,
			total: inventory.length,
			inlineDecisions,
		},
	};
}

const appSourcePath = fileURLToPath(
	new URL("../src/tui/App.tsx", import.meta.url),
);

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

	try {
		const audit = auditTuiCallbacks({
			sourceText,
			manifest: tuiCallbackManifest,
			strict,
		});
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
