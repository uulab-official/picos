import type { ActionPrivilege, ActionRisk } from "./actions";
import type { FileProviderKind } from "./files";

type DiffOperation =
	| {
			kind: "same";
			oldLine: number;
			newLine: number;
			content: string;
	  }
	| {
			kind: "delete";
			oldLine: number;
			content: string;
	  }
	| {
			kind: "add";
			newLine: number;
			content: string;
	  };

export type EditorWritePreview = {
	kind: "editor-save";
	path: string;
	providerKind: FileProviderKind;
	risk: ActionRisk;
	privilege: ActionPrivilege;
	confirmationPhrase: "save file";
	executable: false;
	reason: string;
	changed: boolean;
	stats: {
		additions: number;
		deletions: number;
		unchanged: number;
		originalLines: number;
		nextLines: number;
	};
	diffRows: string[];
};

export function createEditorWritePreview(input: {
	path: string;
	originalContent: string;
	nextContent: string;
	providerKind?: FileProviderKind;
	maxDiffRows?: number;
}): EditorWritePreview {
	const originalLines = splitTextLines(input.originalContent);
	const nextLines = splitTextLines(input.nextContent);
	const operations = diffLines(originalLines, nextLines);
	const additions = operations.filter((operation) => operation.kind === "add");
	const deletions = operations.filter(
		(operation) => operation.kind === "delete",
	);
	const unchanged = operations.filter((operation) => operation.kind === "same");
	const changed = additions.length > 0 || deletions.length > 0;
	const maxDiffRows = input.maxDiffRows ?? 12;

	return {
		kind: "editor-save",
		path: input.path,
		providerKind: input.providerKind ?? "local",
		risk: "write",
		privilege: "user",
		confirmationPhrase: "save file",
		executable: false,
		reason: changed
			? "locked until exact confirmation and provider write policy are enabled"
			: "no content changes to save",
		changed,
		stats: {
			additions: additions.length,
			deletions: deletions.length,
			unchanged: unchanged.length,
			originalLines: originalLines.length,
			nextLines: nextLines.length,
		},
		diffRows: changed
			? operations.slice(0, maxDiffRows).map(formatDiffOperation)
			: ["no changes"],
	};
}

export function formatEditorWritePreviewRows(
	preview: EditorWritePreview,
): string[] {
	return [
		"EDITOR SAVE PREVIEW",
		`path ${preview.path}`,
		`provider=${preview.providerKind} risk=${preview.risk} privilege=${preview.privilege}`,
		`changes +${preview.stats.additions} -${preview.stats.deletions} same=${preview.stats.unchanged} original=${preview.stats.originalLines} next=${preview.stats.nextLines}`,
		`locked confirm=${preview.confirmationPhrase} executable=${preview.executable}`,
		`reason ${preview.reason}`,
		"DIFF",
		...preview.diffRows,
	];
}

function splitTextLines(content: string): string[] {
	const lines = content.split(/\r?\n/);
	if (lines.at(-1) === "") {
		return lines.slice(0, -1);
	}
	return lines;
}

function diffLines(
	originalLines: string[],
	nextLines: string[],
): DiffOperation[] {
	const matrix = buildLongestCommonSubsequenceMatrix(originalLines, nextLines);
	const operations: DiffOperation[] = [];
	let oldIndex = 0;
	let newIndex = 0;

	while (oldIndex < originalLines.length || newIndex < nextLines.length) {
		if (
			oldIndex < originalLines.length &&
			newIndex < nextLines.length &&
			originalLines[oldIndex] === nextLines[newIndex]
		) {
			operations.push({
				kind: "same",
				oldLine: oldIndex + 1,
				newLine: newIndex + 1,
				content: originalLines[oldIndex] ?? "",
			});
			oldIndex += 1;
			newIndex += 1;
			continue;
		}

		if (
			newIndex < nextLines.length &&
			(oldIndex >= originalLines.length ||
				matrix[oldIndex]?.[newIndex + 1] >
					(matrix[oldIndex + 1]?.[newIndex] ?? 0))
		) {
			operations.push({
				kind: "add",
				newLine: newIndex + 1,
				content: nextLines[newIndex] ?? "",
			});
			newIndex += 1;
			continue;
		}

		if (oldIndex < originalLines.length) {
			operations.push({
				kind: "delete",
				oldLine: oldIndex + 1,
				content: originalLines[oldIndex] ?? "",
			});
			oldIndex += 1;
		}
	}

	return operations;
}

function buildLongestCommonSubsequenceMatrix(
	originalLines: string[],
	nextLines: string[],
): number[][] {
	const matrix = Array.from({ length: originalLines.length + 1 }, () =>
		Array.from({ length: nextLines.length + 1 }, () => 0),
	);

	for (let oldIndex = originalLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
		for (let newIndex = nextLines.length - 1; newIndex >= 0; newIndex -= 1) {
			matrix[oldIndex][newIndex] =
				originalLines[oldIndex] === nextLines[newIndex]
					? (matrix[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
					: Math.max(
							matrix[oldIndex + 1]?.[newIndex] ?? 0,
							matrix[oldIndex]?.[newIndex + 1] ?? 0,
						);
		}
	}

	return matrix;
}

function formatDiffOperation(operation: DiffOperation): string {
	if (operation.kind === "same") {
		return ` ${String(operation.newLine).padStart(2)} | ${operation.content}`;
	}
	if (operation.kind === "delete") {
		return `- ${String(operation.oldLine).padStart(2)} | ${operation.content}`;
	}
	return `+ ${String(operation.newLine).padStart(2)} | ${operation.content}`;
}
