import {
	buildClipboardWritePlan,
	type ClipboardWritePlan,
	type ClipboardWriteResult,
	type ClipboardWriteRunner,
	runClipboardWritePlan,
} from "../core/clipboard";
import type { SupportedPlatform } from "../core/types";
import type { ClipboardPreview } from "./clipboardPreview";
import type { ConsoleEventLevel } from "./events";

export type ClipboardConfirmationState = {
	active: boolean;
	preview?: ClipboardPreview;
	value: string;
};

export type ClipboardConfirmationOutcome = {
	state: ClipboardConfirmationState;
	event: {
		level: ConsoleEventLevel;
		message: string;
	};
	result: ClipboardWriteResult;
};

export function createClipboardConfirmationState(
	preview: ClipboardPreview,
): ClipboardConfirmationState {
	return {
		active: true,
		preview,
		value: "",
	};
}

export function clearClipboardConfirmationState(): ClipboardConfirmationState {
	return {
		active: false,
		value: "",
	};
}

export function appendClipboardConfirmationInput(
	state: ClipboardConfirmationState,
	input: string,
): ClipboardConfirmationState {
	if (!state.active || input.length !== 1 || input < " ") {
		return state;
	}

	return {
		...state,
		value: `${state.value}${input}`,
	};
}

export function backspaceClipboardConfirmationInput(
	state: ClipboardConfirmationState,
): ClipboardConfirmationState {
	if (!state.active) {
		return state;
	}

	return {
		...state,
		value: state.value.slice(0, -1),
	};
}

export async function submitClipboardConfirmation(
	state: ClipboardConfirmationState,
	options: {
		platform?: SupportedPlatform;
		runner?: ClipboardWriteRunner;
	} = {},
): Promise<ClipboardConfirmationOutcome> {
	if (!state.preview) {
		const result: ClipboardWriteResult = {
			success: false,
			audit: {
				action: "clipboard.write",
				source: "process-resource",
				label: "none",
				adapter: "none",
				preview: "",
				confirmed: false,
				at: new Date().toISOString(),
				risk: "write",
				privilege: "user",
			},
			error: "No clipboard preview selected",
		};
		return {
			state: clearClipboardConfirmationState(),
			event: {
				level: "warn",
				message: "clipboard locked no preview selected",
			},
			result,
		};
	}

	const plan = buildClipboardWritePlan(state.preview, {
		confirmation: state.value.trim(),
		platform: options.platform,
	});
	return submitClipboardWritePlan(plan, options.runner);
}

export async function submitClipboardWritePlan(
	plan: ClipboardWritePlan,
	runner?: ClipboardWriteRunner,
): Promise<ClipboardConfirmationOutcome> {
	const result = await runClipboardWritePlan(plan, runner);
	return {
		state: clearClipboardConfirmationState(),
		event: {
			level: result.success ? "ok" : "warn",
			message: formatClipboardResultMessage(
				plan.label,
				plan.adapter.command,
				result,
			),
		},
		result,
	};
}

function formatClipboardResultMessage(
	label: string,
	adapter: string,
	result: ClipboardWriteResult,
): string {
	if (result.success) {
		return `clipboard copied ${label} via ${adapter}`;
	}
	if (!result.audit.confirmed) {
		return `clipboard locked ${label} via ${adapter}`;
	}
	return [
		`clipboard failed ${label} via ${adapter}`,
		result.hint ? `· ${result.hint}` : "",
	]
		.filter(Boolean)
		.join(" ");
}
