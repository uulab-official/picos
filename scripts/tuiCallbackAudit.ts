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

function getBindingNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) return [name.text];
	return name.elements.flatMap((element) =>
		ts.isOmittedExpression(element) ? [] : getBindingNames(element.name),
	);
}

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

type CallbackRuntimeOwnerFlow = DelegatedOwnerCall & {
	parameterNames: readonly string[];
	bridge?: DelegatedOwnerCall & { argumentIndex: number; callbackName: string };
};

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

function getCalledBinding(
	expression: ts.Expression,
	bindings: ReadonlyMap<string, ImportedOwnerBinding>,
): ImportedOwnerBinding | undefined {
	if (ts.isIdentifier(expression)) {
		if (isRuntimeIdentifierShadowed(expression)) return undefined;
		return bindings.get(expression.text);
	}
	if (
		ts.isPropertyAccessExpression(expression) &&
		ts.isIdentifier(expression.expression)
	) {
		if (isRuntimeIdentifierShadowed(expression.expression)) return undefined;
		const namespace = bindings.get(expression.expression.text);
		if (namespace?.symbol === "*") {
			return { owner: namespace.owner, symbol: expression.name.text };
		}
	}
	return undefined;
}

function bindingNameContains(name: ts.BindingName, expected: string): boolean {
	return getBindingNames(name).includes(expected);
}

function runtimeScopeDeclaresName(scope: ts.Node, name: string): boolean {
	if (
		(ts.isFunctionExpression(scope) || ts.isClassExpression(scope)) &&
		scope.name?.text === name
	) {
		return true;
	}
	if (ts.isFunctionLike(scope)) {
		if (
			scope.parameters.some((parameter) =>
				bindingNameContains(parameter.name, name),
			)
		) {
			return true;
		}
	}
	if (ts.isCatchClause(scope) && scope.variableDeclaration) {
		return bindingNameContains(scope.variableDeclaration.name, name);
	}
	if (
		(ts.isForStatement(scope) ||
			ts.isForInStatement(scope) ||
			ts.isForOfStatement(scope)) &&
		scope.initializer &&
		ts.isVariableDeclarationList(scope.initializer)
	) {
		return scope.initializer.declarations.some((declaration) =>
			bindingNameContains(declaration.name, name),
		);
	}
	if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) return false;
	for (const statement of scope.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
			return true;
		}
		if (ts.isClassDeclaration(statement) && statement.name?.text === name) {
			return true;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (bindingNameContains(declaration.name, name)) return true;
			}
		}
	}
	return false;
}

function isRuntimeIdentifierShadowed(identifier: ts.Identifier): boolean {
	let current: ts.Node | undefined = identifier.parent;
	while (current && !ts.isSourceFile(current)) {
		if (runtimeScopeDeclaresName(current, identifier.text)) return true;
		current = current.parent;
	}
	return current ? runtimeScopeDeclaresName(current, identifier.text) : false;
}

function visitExecutableNodes(
	root: ts.Node,
	visitor: (node: ts.Node) => void,
): void {
	const localFunctions = new Map<string, ts.FunctionLikeDeclaration>();
	const collectFunctions = (node: ts.Node): void => {
		if (node !== root && ts.isFunctionLike(node)) {
			if (ts.isFunctionDeclaration(node) && node.name) {
				localFunctions.set(node.name.text, node);
			}
			return;
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			isInlineFunction(node.initializer)
		) {
			localFunctions.set(node.name.text, node.initializer);
			return;
		}
		ts.forEachChild(node, collectFunctions);
	};
	collectFunctions(root);

	const visitedFunctions = new Set<ts.FunctionLikeDeclaration>();
	const getStaticBoolean = (expression: ts.Expression): boolean | undefined => {
		const current = unwrapExpression(expression);
		if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
		if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
		return undefined;
	};
	const visit = (node: ts.Node): void => {
		visitor(node);
		if (ts.isIfStatement(node)) {
			visit(node.expression);
			const condition = getStaticBoolean(node.expression);
			if (condition !== false) visit(node.thenStatement);
			if (condition !== true && node.elseStatement) visit(node.elseStatement);
			return;
		}
		if (ts.isConditionalExpression(node)) {
			visit(node.condition);
			const condition = getStaticBoolean(node.condition);
			if (condition !== false) visit(node.whenTrue);
			if (condition !== true) visit(node.whenFalse);
			return;
		}
		if (
			ts.isBinaryExpression(node) &&
			(node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
				node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
		) {
			visit(node.left);
			const left = getStaticBoolean(node.left);
			const reachesRight =
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					? left !== false
					: left !== true;
			if (reachesRight) visit(node.right);
			return;
		}
		if (
			ts.isWhileStatement(node) &&
			getStaticBoolean(node.expression) === false
		) {
			visit(node.expression);
			return;
		}
		if (ts.isCallExpression(node)) {
			const calledLocal = ts.isIdentifier(node.expression)
				? localFunctions.get(node.expression.text)
				: undefined;
			const calledInline = isInlineFunction(node.expression)
				? node.expression
				: undefined;
			const setterCallbacks =
				ts.isIdentifier(node.expression) &&
				/^set[A-Z]/.test(node.expression.text)
					? node.arguments.filter(isInlineFunction)
					: [];
			for (const called of [calledLocal, calledInline, ...setterCallbacks]) {
				if (called?.body && !visitedFunctions.has(called)) {
					visitedFunctions.add(called);
					visit(called.body);
				}
			}
		}
		ts.forEachChild(node, (child) => {
			if (child !== root && ts.isFunctionLike(child)) return;
			visit(child);
		});
	};
	visit(isInlineFunction(root) ? root.body : root);
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
		};
		visitExecutableNodes(callback, visitReference);
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

function extractTuiCallbackRuntimeOwnerFlows(
	sourceText: string,
): ReadonlyMap<string, readonly CallbackRuntimeOwnerFlow[]> {
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
	const callbackParameters = new Map<string, readonly string[]>();
	const callbackContainers = new Map<string, ReadonlySet<string>>();
	const derivedVariables = new Map<string, ReadonlySet<string>>();
	const flows = new Map<string, CallbackRuntimeOwnerFlow[]>();

	const addFlow = (name: string, flow: CallbackRuntimeOwnerFlow): void => {
		const current = flows.get(name) ?? [];
		if (
			current.some(
				(existing) =>
					existing.owner === flow.owner &&
					existing.symbol === flow.symbol &&
					existing.bridge?.owner === flow.bridge?.owner &&
					existing.bridge?.symbol === flow.bridge?.symbol &&
					existing.bridge?.argumentIndex === flow.bridge?.argumentIndex &&
					existing.parameterNames.join("\0") === flow.parameterNames.join("\0"),
			)
		) {
			return;
		}
		flows.set(name, [...current, flow]);
	};

	const getParameterNames = (
		callback: ts.Node | undefined,
	): readonly string[] =>
		isInlineFunction(callback)
			? callback.parameters.map((parameter) =>
					ts.isIdentifier(parameter.name) ? parameter.name.text : "",
				)
			: [];

	const visitCallbacks = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			callbackName(node.initializer, "useCallback")
		) {
			callbackParameters.set(
				node.name.text,
				getParameterNames(node.initializer.arguments[0]),
			);
		}
		if (
			ts.isCallExpression(node) &&
			callbackName(node, "useInput") &&
			ts.isExpressionStatement(node.parent)
		) {
			callbackParameters.set("useInput", getParameterNames(node.arguments[0]));
		}
		ts.forEachChild(node, visitCallbacks);
	};
	visitCallbacks(sourceFile);

	const expressionOwnerCalls = (node: ts.Node): ReadonlySet<string> => {
		const calls = new Set<string>();
		const visit = (child: ts.Node): void => {
			if (ts.isCallExpression(child)) {
				const binding = getCalledBinding(child.expression, importedOwners);
				if (binding) calls.add(ownerCallKey(binding));
			}
			if (ts.isIdentifier(child)) {
				for (const call of derivedVariables.get(child.text) ?? [])
					calls.add(call);
			}
		};
		visitExecutableNodes(node, visit);
		return calls;
	};

	let expanded = true;
	while (expanded) {
		expanded = false;
		const collect = (node: ts.Node): void => {
			if (ts.isVariableDeclaration(node) && node.initializer) {
				const calls = expressionOwnerCalls(node.initializer);
				for (const name of getBindingNames(node.name)) {
					const current = new Set(derivedVariables.get(name) ?? []);
					for (const call of calls) current.add(call);
					if (current.size > (derivedVariables.get(name)?.size ?? 0)) {
						derivedVariables.set(name, current);
						expanded = true;
					}
				}
			}
			ts.forEachChild(node, collect);
		};
		collect(sourceFile);
	}

	const collectContainers = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer
		) {
			const initializer = unwrapExpression(node.initializer);
			if (ts.isObjectLiteralExpression(initializer)) {
				const callbacks = new Set<string>();
				for (const property of initializer.properties) {
					if (
						ts.isPropertyAssignment(property) &&
						ts.isIdentifier(property.initializer) &&
						callbackNames.has(property.initializer.text)
					) {
						callbacks.add(property.initializer.text);
					}
					if (
						ts.isShorthandPropertyAssignment(property) &&
						callbackNames.has(property.name.text)
					) {
						callbacks.add(property.name.text);
					}
				}
				if (callbacks.size > 0)
					callbackContainers.set(node.name.text, callbacks);
			}
		}
		ts.forEachChild(node, collectContainers);
	};
	collectContainers(sourceFile);

	const collectFlows = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			if (
				ts.isIdentifier(node.expression) &&
				callbackNames.has(node.expression.text)
			) {
				const parameterNames =
					callbackParameters.get(node.expression.text) ?? [];
				for (const [index, argument] of node.arguments.entries()) {
					const parameterName = parameterNames[index];
					if (!parameterName) continue;
					for (const key of expressionOwnerCalls(argument)) {
						addFlow(node.expression.text, {
							...parseOwnerCallKey(key),
							parameterNames: [parameterName],
						});
					}
				}
			}
			const binding = getCalledBinding(node.expression, importedOwners);
			if (binding) {
				for (const [argumentIndex, argument] of node.arguments.entries()) {
					const container = ts.isIdentifier(argument)
						? callbackContainers.get(argument.text)
						: undefined;
					if (!container) continue;
					const producers = new Set<string>();
					for (const [
						producerIndex,
						producerArgument,
					] of node.arguments.entries()) {
						if (producerIndex === argumentIndex) continue;
						for (const producer of expressionOwnerCalls(producerArgument)) {
							producers.add(producer);
						}
					}
					for (const callback of container) {
						for (const producer of producers) {
							addFlow(callback, {
								...parseOwnerCallKey(producer),
								parameterNames: (callbackParameters.get(callback) ?? []).filter(
									Boolean,
								),
								bridge: { ...binding, argumentIndex, callbackName: callback },
							});
						}
					}
				}
			}
		}
		ts.forEachChild(node, collectFlows);
	};
	collectFlows(sourceFile);
	return flows;
}

function extractTuiOwnerInvokedParameterIndexes(
	sourceText: string,
): ReadonlyMap<string, ReadonlySet<string>> {
	const sourceFile = ts.createSourceFile(
		"owner.ts",
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const invoked = new Map<string, ReadonlySet<string>>();
	const inspect = (
		name: string,
		parameters: readonly ts.ParameterDeclaration[],
		body: ts.Node | undefined,
	): void => {
		if (!body) return;
		const members = new Set<string>();
		for (const [index, parameter] of parameters.entries()) {
			if (!ts.isIdentifier(parameter.name)) continue;
			const containers = new Set([parameter.name.text]);
			const callableAliases = new Map<string, string>();
			const getContainerMember = (
				expression: ts.Expression,
			): string | undefined => {
				const current = unwrapExpression(expression);
				if (
					ts.isPropertyAccessExpression(current) &&
					ts.isIdentifier(current.expression) &&
					containers.has(current.expression.text)
				) {
					return current.name.text;
				}
				if (
					ts.isElementAccessExpression(current) &&
					ts.isIdentifier(current.expression) &&
					containers.has(current.expression.text)
				) {
					return current.argumentExpression &&
						ts.isStringLiteralLike(current.argumentExpression)
						? current.argumentExpression.text
						: "*";
				}
				return undefined;
			};
			let expanded = true;
			while (expanded) {
				expanded = false;
				const collect = (node: ts.Node): void => {
					if (
						ts.isVariableDeclaration(node) &&
						node.initializer &&
						ts.isIdentifier(node.name)
					) {
						const initializer = unwrapExpression(node.initializer);
						if (
							ts.isIdentifier(initializer) &&
							containers.has(initializer.text) &&
							!containers.has(node.name.text)
						) {
							containers.add(node.name.text);
							expanded = true;
						}
						const member = getContainerMember(initializer);
						const aliasedMember = ts.isIdentifier(initializer)
							? callableAliases.get(initializer.text)
							: undefined;
						const nextMember = member ?? aliasedMember;
						if (
							nextMember &&
							callableAliases.get(node.name.text) !== nextMember
						) {
							callableAliases.set(node.name.text, nextMember);
							expanded = true;
						}
					}
					if (
						ts.isVariableDeclaration(node) &&
						node.initializer &&
						ts.isObjectBindingPattern(node.name)
					) {
						const initializer = unwrapExpression(node.initializer);
						if (
							ts.isIdentifier(initializer) &&
							containers.has(initializer.text)
						) {
							for (const element of node.name.elements) {
								if (!ts.isIdentifier(element.name)) continue;
								const member = element.propertyName
									? element.propertyName
											.getText(sourceFile)
											.replace(/^['"]|['"]$/g, "")
									: element.name.text;
								if (callableAliases.get(element.name.text) !== member) {
									callableAliases.set(element.name.text, member);
									expanded = true;
								}
							}
						}
					}
				};
				visitExecutableNodes(body, collect);
			}
			const visit = (node: ts.Node): void => {
				if (ts.isCallExpression(node)) {
					const expression = unwrapExpression(node.expression);
					const member = ts.isIdentifier(expression)
						? callableAliases.get(expression.text)
						: getContainerMember(expression);
					if (member) members.add(`${index}\0${member}`);
				}
			};
			visitExecutableNodes(body, visit);
		}
		invoked.set(name, members);
	};
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			inspect(statement.name.text, statement.parameters, statement.body);
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (
					ts.isIdentifier(declaration.name) &&
					isInlineFunction(declaration.initializer)
				) {
					inspect(
						declaration.name.text,
						declaration.initializer.parameters,
						declaration.initializer.body,
					);
				}
			}
		}
	}
	return invoked;
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
		};
		visitExecutableNodes(node, visit);
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

type TuiInlineDelegatedDecision = {
	name: string;
	kind: "guard" | "selection-publication" | "notice";
	line: number;
	expression: string;
	ownerCalls?: readonly string[];
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

function unwrapExpression(expression: ts.Expression): ts.Expression {
	let current = expression;
	while (
		ts.isParenthesizedExpression(current) ||
		ts.isAsExpression(current) ||
		ts.isTypeAssertionExpression(current) ||
		ts.isNonNullExpression(current) ||
		ts.isSatisfiesExpression(current)
	) {
		current = current.expression;
	}
	return current;
}

function hasEmptyReturn(statement: ts.Statement): boolean {
	if (ts.isReturnStatement(statement)) return !statement.expression;
	return (
		ts.isBlock(statement) &&
		statement.statements.length === 1 &&
		ts.isReturnStatement(statement.statements[0]) &&
		!statement.statements[0].expression
	);
}

function extractInlineDelegatedDecisions(
	sourceText: string,
	ownerDerivedParameters: ReadonlyMap<
		string,
		ReadonlyMap<string, ReadonlySet<string>>
	> = new Map(),
	delegatedCallbackCalls: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
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
		const ownerDerived = new Map<string, ReadonlySet<string>>(
			ownerDerivedParameters.get(name) ?? [],
		);
		const getOwnerCalls = (node: ts.Node): ReadonlySet<string> => {
			const calls = new Set<string>();
			const visit = (child: ts.Node): void => {
				if (ts.isIdentifier(child)) {
					for (const call of ownerDerived.get(child.text) ?? [])
						calls.add(call);
				}
				if (ts.isCallExpression(child)) {
					const binding = getCalledBinding(child.expression, importedOwners);
					if (binding) calls.add(ownerCallKey(binding));
					if (
						ts.isIdentifier(child.expression) &&
						callbackNames.has(child.expression.text)
					) {
						for (const call of delegatedCallbackCalls.get(
							child.expression.text,
						) ?? []) {
							calls.add(call);
						}
					}
				}
				ts.forEachChild(child, visit);
			};
			visit(node);
			return calls;
		};
		const getValueOwnerCalls = (
			expression: ts.Expression,
		): ReadonlySet<string> => {
			const current = unwrapExpression(expression);
			if (ts.isIdentifier(current)) {
				return new Set(ownerDerived.get(current.text) ?? []);
			}
			if (ts.isCallExpression(current)) {
				const binding = getCalledBinding(current.expression, importedOwners);
				if (binding) return new Set([ownerCallKey(binding)]);
				if (
					ts.isIdentifier(current.expression) &&
					callbackNames.has(current.expression.text)
				) {
					return new Set(
						delegatedCallbackCalls.get(current.expression.text) ?? [],
					);
				}
				return new Set();
			}
			if (
				ts.isPropertyAccessExpression(current) ||
				ts.isElementAccessExpression(current)
			) {
				return getValueOwnerCalls(current.expression);
			}
			if (ts.isAwaitExpression(current)) {
				return getValueOwnerCalls(current.expression);
			}
			if (ts.isConditionalExpression(current)) {
				const whenTrue = getValueOwnerCalls(current.whenTrue);
				const whenFalse = getValueOwnerCalls(current.whenFalse);
				if (whenTrue.size === 0 || whenFalse.size === 0) return new Set();
				return new Set([...whenTrue, ...whenFalse]);
			}
			if (
				ts.isBinaryExpression(current) &&
				current.operatorToken.kind === ts.SyntaxKind.CommaToken
			) {
				return getValueOwnerCalls(current.right);
			}
			return new Set();
		};
		const isOwnerDerived = (node: ts.Node): boolean =>
			getOwnerCalls(node).size > 0;
		let expanded = true;
		while (expanded) {
			expanded = false;
			const collect = (node: ts.Node): void => {
				if (
					ts.isVariableDeclaration(node) &&
					node.initializer &&
					getValueOwnerCalls(node.initializer).size > 0
				) {
					const calls = getValueOwnerCalls(node.initializer);
					for (const name of getBindingNames(node.name)) {
						const current = new Set(ownerDerived.get(name) ?? []);
						for (const call of calls) current.add(call);
						if (current.size > (ownerDerived.get(name)?.size ?? 0)) {
							ownerDerived.set(name, current);
							expanded = true;
						}
					}
				}
				ts.forEachChild(node, collect);
			};
			collect(callback);
		}
		const found: TuiInlineDelegatedDecision[] = [];
		const visit = (node: ts.Node): void => {
			if (
				ts.isIfStatement(node) &&
				(hasEmptyReturn(node.thenStatement) ||
					(node.elseStatement !== undefined &&
						hasEmptyReturn(node.elseStatement))) &&
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
				node.arguments[0]
			) {
				found.push({
					name,
					kind: "selection-publication",
					line: lineNumber(sourceFile, node.getStart(sourceFile)),
					expression: node.getText(sourceFile),
					ownerCalls: [...getValueOwnerCalls(node.arguments[0])],
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
	const delegatedOwnerCalls = new Map(
		extractTuiCallbackDelegatedOwnerCalls(sourceText),
	);
	const runtimeOwnerFlows = extractTuiCallbackRuntimeOwnerFlows(sourceText);
	const ownerDerivedParameters = new Map<
		string,
		ReadonlyMap<string, ReadonlySet<string>>
	>();
	const ownerExportCallPaths = new Map<
		string,
		ReadonlyMap<string, ReadonlySet<string>>
	>();
	const ownerInvokedParameterIndexes = new Map<
		string,
		ReadonlyMap<string, ReadonlySet<string>>
	>();
	for (const [name, flows] of runtimeOwnerFlows) {
		const calls = new Set(delegatedOwnerCalls.get(name) ?? []);
		const parameters = new Map<string, Set<string>>();
		for (const flow of flows) {
			let valid = flow.bridge === undefined;
			if (!valid && ownerFileRead) {
				const bridge = flow.bridge as NonNullable<
					CallbackRuntimeOwnerFlow["bridge"]
				>;
				let invoked = ownerInvokedParameterIndexes.get(bridge.owner);
				if (!invoked) {
					const ownerSource = ownerFileRead(`${bridge.owner}.ts`);
					invoked = ownerSource
						? extractTuiOwnerInvokedParameterIndexes(ownerSource)
						: new Map<string, ReadonlySet<string>>();
					ownerInvokedParameterIndexes.set(bridge.owner, invoked);
				}
				const invokedMembers = invoked.get(bridge.symbol);
				valid = Boolean(
					invokedMembers?.has(
						`${bridge.argumentIndex}\0${bridge.callbackName}`,
					) || invokedMembers?.has(`${bridge.argumentIndex}\0*`),
				);
			}
			if (!valid) continue;
			calls.add(ownerCallKey(flow));
			for (const parameterName of flow.parameterNames) {
				const parameterCalls =
					parameters.get(parameterName) ?? new Set<string>();
				parameterCalls.add(ownerCallKey(flow));
				parameters.set(parameterName, parameterCalls);
			}
		}
		delegatedOwnerCalls.set(name, calls);
		if (parameters.size > 0) ownerDerivedParameters.set(name, parameters);
	}
	const delegatedDecisions = extractInlineDelegatedDecisions(
		sourceText,
		ownerDerivedParameters,
		delegatedOwnerCalls,
	);
	const hasDelegatedRows = manifest.some(
		(row) => row.classification === "delegated",
	);
	if (strict && hasDelegatedRows && !ownerFileExists) {
		fail("strict callback audit requires delegated owner existence checks");
	}
	if (strict && hasDelegatedRows && !ownerFileRead) {
		fail("strict callback audit requires delegated owner source linkage");
	}
	const callLinksDeclaredOwner = (
		call: DelegatedOwnerCall,
		declaredOwner: string,
	): boolean => {
		if (call.owner === declaredOwner) return true;
		if (!ownerFileRead) return false;
		let exports = ownerExportCallPaths.get(call.owner);
		if (!exports) {
			const ownerSource = ownerFileRead(`${call.owner}.ts`);
			exports = ownerSource
				? extractTuiOwnerExportCallPaths(ownerSource)
				: new Map<string, ReadonlySet<string>>();
			ownerExportCallPaths.set(call.owner, exports);
		}
		return Boolean(exports.get(call.symbol)?.has(declaredOwner));
	};
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
				const linked = declaredOwners.some((declaredOwner) =>
					ownerCalls.some((call) =>
						callLinksDeclaredOwner(call, declaredOwner),
					),
				);
				if (!linked) {
					fail(`delegated callback has no owner call path: ${row.name}`);
				}
				const decision = delegatedDecisions.get(row.name)?.find((candidate) => {
					if (candidate.kind !== "selection-publication") return true;
					const selectionCalls = (candidate.ownerCalls ?? []).map(
						parseOwnerCallKey,
					);
					return !declaredOwners.some((declaredOwner) =>
						selectionCalls.some((call) =>
							callLinksDeclaredOwner(call, declaredOwner),
						),
					);
				});
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
