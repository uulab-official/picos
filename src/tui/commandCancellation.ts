import {
	type CommandPrompt,
	type CommandPromptCleanupIntent,
	resolveCommandPromptOwnership,
} from "./commandLine";
import {
	clearFileOperationDialog,
	type FileOperationDialogState,
} from "./fileOperationDialog";
import type { FocusArea } from "./navigation";

export type CommandCancellationCleanupIntent = CommandPromptCleanupIntent;

export type CommandCancellationResult = {
	commandLine: "close";
	focusArea: FocusArea;
	cleanup: CommandCancellationCleanupIntent[];
	fileOperationDialog?: FileOperationDialogState;
	submit: { owner: string; effect: string };
	notice: { level: "info"; message: string };
};

export function prepareCommandCancellation(
	prompt: CommandPrompt | string | undefined,
	focusArea: FocusArea,
	state: { fileOperationDialog?: FileOperationDialogState } = {},
): CommandCancellationResult | undefined {
	const ownership = resolveCommandPromptOwnership(prompt);
	if (!ownership) return undefined;
	const cleanup = "cleanup" in ownership ? [...ownership.cleanup] : [];
	return {
		commandLine: "close",
		focusArea,
		cleanup,
		...(cleanup.includes("file-operation-dialog") && state.fileOperationDialog
			? {
					fileOperationDialog: clearFileOperationDialog(
						state.fileOperationDialog,
					),
				}
			: {}),
		submit: { owner: ownership.owner, effect: ownership.effect },
		notice: { level: "info", message: ownership.cancel },
	};
}
