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
	ownerFileRead?: (path: string) => string | undefined;
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

const normalizeOwnerPath = (path: string) => path.replace(/\.tsx?$/, "");

type ImportedOwnerBinding = {
	owner: string;
	symbol: string;
};

type DelegatedOwnerCall = ImportedOwnerBinding;

function collectImportedOwnerBindings(
	sourceFile: ts.SourceFile,
): ReadonlyMap<string, ImportedOwnerBinding> {
	const importedOwners = new Map<string, ImportedOwnerBinding>();
	for (const statement of sourceFile.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier) ||
			!statement.moduleSpecifier.text.startsWith("./") ||
			!statement.importClause ||
			statement.importClause.isTypeOnly
		) {
			continue;
		}
		const owner = normalizeOwnerPath(
			`src/tui/${statement.moduleSpecifier.text.slice(2)}`,
		);
		const { importClause } = statement;
		if (importClause.name) {
			importedOwners.set(importClause.name.text, { owner, symbol: "default" });
		}
		const bindings = importClause.namedBindings;
		if (bindings && ts.isNamespaceImport(bindings)) {
			importedOwners.set(bindings.name.text, { owner, symbol: "*" });
		}
		if (bindings && ts.isNamedImports(bindings)) {
			for (const element of bindings.elements) {
				if (element.isTypeOnly) continue;
				importedOwners.set(element.name.text, {
					owner,
					symbol: element.propertyName?.text ?? element.name.text,
				});
			}
		}
	}
	return importedOwners;
}

function collectImportedOwnerTypeBindings(
	sourceFile: ts.SourceFile,
): ReadonlyMap<string, ImportedOwnerBinding> {
	const importedOwners = new Map<string, ImportedOwnerBinding>();
	for (const statement of sourceFile.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier) ||
			!statement.moduleSpecifier.text.startsWith("./") ||
			!statement.importClause
		) {
			continue;
		}
		const owner = normalizeOwnerPath(
			`src/tui/${statement.moduleSpecifier.text.slice(2)}`,
		);
		const bindings = statement.importClause.namedBindings;
		if (bindings && ts.isNamedImports(bindings)) {
			for (const element of bindings.elements) {
				importedOwners.set(element.name.text, {
					owner,
					symbol: element.propertyName?.text ?? element.name.text,
				});
			}
		}
	}
	return importedOwners;
}

function getCalledBinding(
	expression: ts.Expression,
	bindings: ReadonlyMap<string, ImportedOwnerBinding>,
): ImportedOwnerBinding | undefined {
	if (ts.isIdentifier(expression)) {
		return bindings.get(expression.text);
	}
	if (
		ts.isPropertyAccessExpression(expression) &&
		ts.isIdentifier(expression.expression)
	) {
		const namespace = bindings.get(expression.expression.text);
		if (namespace?.symbol === "*") {
			return { owner: namespace.owner, symbol: expression.name.text };
		}
	}
	return undefined;
}

function ownerCallKey(call: DelegatedOwnerCall): string {
	return `${call.owner}\0${call.symbol}`;
}

function parseOwnerCallKey(key: string): DelegatedOwnerCall {
	const [owner, symbol] = key.split("\0");
	return { owner: owner ?? "", symbol: symbol ?? "" };
}

function extractTuiCallbackDelegatedOwnerCalls(
	sourceText: string,
): ReadonlyMap<string, ReadonlySet<string>> {
	const sourceFile = ts.createSourceFile(
		"App.tsx",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const importedOwners = collectImportedOwnerBindings(sourceFile);
	const importedOwnerTypes = collectImportedOwnerTypeBindings(sourceFile);
	const typeAliasOwners = new Map<string, ReadonlySet<string>>();
	for (const statement of sourceFile.statements) {
		if (!ts.isTypeAliasDeclaration(statement)) continue;
		const owners = new Set<string>();
		const visitType = (node: ts.Node): void => {
			if (ts.isIdentifier(node)) {
				const binding = importedOwnerTypes.get(node.text);
				if (binding) owners.add(binding.owner);
			}
			ts.forEachChild(node, visitType);
		};
		visitType(statement.type);
		if (owners.size > 0) typeAliasOwners.set(statement.name.text, owners);
	}
	const references = new Map<string, ReadonlySet<string>>();
	const callbackNames = new Set(
		extractTuiCallbackInventory(sourceText).map((row) => row.name),
	);
	const callbackDependencies = new Map<string, ReadonlySet<string>>();
	const inspectCallback = (
		name: string,
		callback: ts.Node | undefined,
	): void => {
		if (!callback) return;
		const calls = new Set<string>();
		const dependencies = new Set<string>();
		if (isInlineFunction(callback)) {
			for (const parameter of callback.parameters) {
				if (!ts.isIdentifier(parameter.name) || !parameter.type) continue;
				const parameterName = parameter.name.text;
				let used = false;
				const findUse = (node: ts.Node): void => {
					if (ts.isIdentifier(node) && node.text === parameterName) {
						used = true;
						return;
					}
					ts.forEachChild(node, findUse);
				};
				findUse(callback.body);
				if (!used) continue;
				const visitParameterType = (node: ts.Node): void => {
					if (ts.isIdentifier(node)) {
						const binding = importedOwnerTypes.get(node.text);
						if (binding) {
							calls.add(
								ownerCallKey({
									owner: binding.owner,
									symbol: "@parameter",
								}),
							);
						}
						for (const owner of typeAliasOwners.get(node.text) ?? []) {
							calls.add(ownerCallKey({ owner, symbol: "@parameter" }));
						}
					}
					if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
						const binding = importedOwners.get(node.exprName.text);
						if (binding) {
							calls.add(
								ownerCallKey({
									owner: binding.owner,
									symbol: "@parameter",
								}),
							);
						}
					}
					ts.forEachChild(node, visitParameterType);
				};
				visitParameterType(parameter.type);
			}
		}
		const visitReference = (node: ts.Node): void => {
			if (ts.isCallExpression(node)) {
				const binding = getCalledBinding(node.expression, importedOwners);
				if (binding) calls.add(ownerCallKey(binding));
				if (
					ts.isIdentifier(node.expression) &&
					node.expression.text !== name &&
					callbackNames.has(node.expression.text)
				) {
					dependencies.add(node.expression.text);
				}
			}
			ts.forEachChild(node, visitReference);
		};
		visitReference(callback);
		references.set(name, calls);
		callbackDependencies.set(name, dependencies);
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
			inspectCallback("useInput", node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	let expanded = true;
	while (expanded) {
		expanded = false;
		for (const [name, dependencies] of callbackDependencies) {
			const calls = new Set(references.get(name) ?? []);
			for (const dependency of dependencies) {
				for (const call of references.get(dependency) ?? []) {
					if (!calls.has(call)) {
						calls.add(call);
						expanded = true;
					}
				}
			}
			references.set(name, calls);
		}
	}
	return references;
}

export function extractTuiCallbackDelegatedOwnerReferences(
	sourceText: string,
): ReadonlyMap<string, ReadonlySet<string>> {
	const references = new Map<string, ReadonlySet<string>>();
	for (const [name, callKeys] of extractTuiCallbackDelegatedOwnerCalls(
		sourceText,
	)) {
		const owners = new Set<string>();
		for (const key of callKeys) owners.add(parseOwnerCallKey(key).owner);
		references.set(name, owners);
	}
	return references;
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

function extractTuiOwnerExportCallPaths(
	sourceText: string,
): ReadonlyMap<string, ReadonlySet<string>> {
	const sourceFile = ts.createSourceFile(
		"owner.ts",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const importedOwners = collectImportedOwnerBindings(sourceFile);
	const localNames = new Set<string>();
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			localNames.add(statement.name.text);
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					localNames.add(declaration.name.text);
				}
			}
		}
	}
	const callPaths = new Map<string, ReadonlySet<string>>();
	const dependencies = new Map<string, ReadonlySet<string>>();
	const inspect = (name: string, node: ts.Node | undefined) => {
		if (!node) return;
		const owners = new Set<string>();
		const localDependencies = new Set<string>();
		const visit = (child: ts.Node): void => {
			if (ts.isCallExpression(child)) {
				const binding = getCalledBinding(child.expression, importedOwners);
				if (binding) owners.add(binding.owner);
				if (
					ts.isIdentifier(child.expression) &&
					child.expression.text !== name &&
					localNames.has(child.expression.text)
				) {
					localDependencies.add(child.expression.text);
				}
			}
			ts.forEachChild(child, visit);
		};
		visit(node);
		callPaths.set(name, owners);
		dependencies.set(name, localDependencies);
	};
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			inspect(statement.name.text, statement.body);
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					inspect(declaration.name.text, declaration.initializer);
				}
			}
		}
	}
	let expanded = true;
	while (expanded) {
		expanded = false;
		for (const [name, localDependencies] of dependencies) {
			const owners = new Set(callPaths.get(name) ?? []);
			for (const dependency of localDependencies) {
				for (const owner of callPaths.get(dependency) ?? []) {
					if (!owners.has(owner)) {
						owners.add(owner);
						expanded = true;
					}
				}
			}
			callPaths.set(name, owners);
		}
	}
	return callPaths;
}

function extractTuiOwnerModuleImports(sourceText: string): ReadonlySet<string> {
	const sourceFile = ts.createSourceFile(
		"owner.ts",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const owners = new Set<string>();
	for (const statement of sourceFile.statements) {
		if (
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteral(statement.moduleSpecifier) &&
			statement.moduleSpecifier.text.startsWith("./")
		) {
			owners.add(
				normalizeOwnerPath(
					`src/tui/${statement.moduleSpecifier.text.slice(2)}`,
				),
			);
		}
	}
	return owners;
}

type TuiInlineDelegatedDecision = {
	name: string;
	kind: "guard" | "selection-publication" | "notice";
	line: number;
	expression: string;
};

function containsConstructedText(node: ts.Node): boolean {
	let found = false;
	const visit = (child: ts.Node): void => {
		if (
			ts.isStringLiteralLike(child) ||
			ts.isNoSubstitutionTemplateLiteral(child) ||
			ts.isTemplateExpression(child)
		) {
			found = true;
			return;
		}
		ts.forEachChild(child, visit);
	};
	visit(node);
	return found;
}

function extractInlineDelegatedDecisions(
	sourceText: string,
): ReadonlyMap<string, readonly TuiInlineDelegatedDecision[]> {
	const sourceFile = ts.createSourceFile(
		"App.tsx",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const importedOwners = collectImportedOwnerBindings(sourceFile);
	const callbackNames = new Set(
		extractTuiCallbackInventory(sourceText).map((row) => row.name),
	);
	const decisions = new Map<string, readonly TuiInlineDelegatedDecision[]>();
	const inspect = (name: string, callback: ts.Node | undefined) => {
		if (!callback) return;
		const ownerDerived = new Set<string>();
		const isOwnerDerived = (node: ts.Node): boolean => {
			let derived = false;
			const visit = (child: ts.Node): void => {
				if (ts.isIdentifier(child) && ownerDerived.has(child.text)) {
					derived = true;
					return;
				}
				if (ts.isCallExpression(child)) {
					if (
						getCalledBinding(child.expression, importedOwners) ||
						(ts.isIdentifier(child.expression) &&
							callbackNames.has(child.expression.text))
					) {
						derived = true;
						return;
					}
				}
				ts.forEachChild(child, visit);
			};
			visit(node);
			return derived;
		};
		let expanded = true;
		while (expanded) {
			expanded = false;
			const collect = (node: ts.Node): void => {
				if (
					ts.isVariableDeclaration(node) &&
					ts.isIdentifier(node.name) &&
					node.initializer &&
					!ownerDerived.has(node.name.text) &&
					isOwnerDerived(node.initializer)
				) {
					ownerDerived.add(node.name.text);
					expanded = true;
				}
				ts.forEachChild(node, collect);
			};
			collect(callback);
		}
		const found: TuiInlineDelegatedDecision[] = [];
		const visit = (node: ts.Node): void => {
			if (
				ts.isIfStatement(node) &&
				ts.isReturnStatement(node.thenStatement) &&
				!node.thenStatement.expression &&
				!isOwnerDerived(node.expression)
			) {
				found.push({
					name,
					kind: "guard",
					line: lineNumber(sourceFile, node.getStart(sourceFile)),
					expression: node.expression.getText(sourceFile),
				});
			}
			if (
				ts.isCallExpression(node) &&
				ts.isIdentifier(node.expression) &&
				/^setSelected.*Index$/.test(node.expression.text) &&
				node.arguments[0] &&
				(ts.isNumericLiteral(node.arguments[0]) ||
					ts.isStringLiteralLike(node.arguments[0]))
			) {
				found.push({
					name,
					kind: "selection-publication",
					line: lineNumber(sourceFile, node.getStart(sourceFile)),
					expression: node.getText(sourceFile),
				});
			}
			if (
				ts.isCallExpression(node) &&
				ts.isIdentifier(node.expression) &&
				node.expression.text === "log" &&
				node.arguments[1] &&
				!ts.isCallExpression(node.arguments[1]) &&
				containsConstructedText(node.arguments[1])
			) {
				found.push({
					name,
					kind: "notice",
					line: lineNumber(sourceFile, node.getStart(sourceFile)),
					expression: node.arguments[1].getText(sourceFile),
				});
			}
			ts.forEachChild(node, visit);
		};
		visit(callback);
		decisions.set(name, found);
	};
	const visit = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			callbackName(node.initializer, "useCallback")
		) {
			inspect(node.name.text, node.initializer.arguments[0]);
		}
		if (
			ts.isCallExpression(node) &&
			callbackName(node, "useInput") &&
			ts.isExpressionStatement(node.parent)
		) {
			inspect("useInput", node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return decisions;
}

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
	ownerFileRead,
	strict = false,
}: AuditOptions): TuiCallbackAudit {
	const inventory = extractTuiCallbackInventory(sourceText);
	const delegatedOwnerCalls = extractTuiCallbackDelegatedOwnerCalls(sourceText);
	const delegatedDecisions = extractInlineDelegatedDecisions(sourceText);
	const ownerExportCallPaths = new Map<
		string,
		ReadonlyMap<string, ReadonlySet<string>>
	>();
	const ownerModuleImports = new Map<string, ReadonlySet<string>>();
	const hasDelegatedRows = manifest.some(
		(row) => row.classification === "delegated",
	);
	if (strict && hasDelegatedRows && !ownerFileExists) {
		fail("strict callback audit requires delegated owner existence checks");
	}
	if (strict && hasDelegatedRows && !ownerFileRead) {
		fail("strict callback audit requires delegated owner source linkage");
	}
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
			if (ownerFileRead) {
				const declaredOwners = owners.map(normalizeOwnerPath);
				const ownerCalls = [...(delegatedOwnerCalls.get(row.name) ?? [])].map(
					parseOwnerCallKey,
				);
				const linked = declaredOwners.some((declaredOwner) => {
					for (const call of ownerCalls) {
						if (call.owner === declaredOwner) return true;
						if (call.symbol === "@parameter") {
							let imports = ownerModuleImports.get(call.owner);
							if (!imports) {
								const ownerSource = ownerFileRead(`${call.owner}.ts`);
								imports = ownerSource
									? extractTuiOwnerModuleImports(ownerSource)
									: new Set<string>();
								ownerModuleImports.set(call.owner, imports);
							}
							if (imports.has(declaredOwner)) return true;
							continue;
						}
						let exports = ownerExportCallPaths.get(call.owner);
						if (!exports) {
							const ownerSource = ownerFileRead(`${call.owner}.ts`);
							exports = ownerSource
								? extractTuiOwnerExportCallPaths(ownerSource)
								: new Map<string, ReadonlySet<string>>();
							ownerExportCallPaths.set(call.owner, exports);
						}
						if (exports.get(call.symbol)?.has(declaredOwner)) return true;
					}
					return false;
				});
				if (!linked) {
					fail(`delegated callback has no owner call path: ${row.name}`);
				}
				const decision = delegatedDecisions.get(row.name)?.[0];
				if (decision) {
					const label =
						decision.kind === "selection-publication"
							? "selection publication"
							: decision.kind;
					fail(
						`inline delegated ${label}: ${row.name} line=${decision.line} expression=${decision.expression}`,
					);
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
			ownerFileRead: (path) => {
				const resolved = resolve(
					fileURLToPath(new URL("..", import.meta.url)),
					path,
				);
				return existsSync(resolved)
					? readFileSync(resolved, "utf8")
					: undefined;
			},
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
