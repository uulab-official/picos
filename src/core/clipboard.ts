import { clipboardWriteCommand as linuxClipboardWriteCommand } from "../adapters/linux";
import { clipboardWriteCommand as macosClipboardWriteCommand } from "../adapters/macos";
import { clipboardWriteCommand as windowsClipboardWriteCommand } from "../adapters/windows";
import type { ClipboardPreview } from "../tui/clipboardPreview";
import { safeExec } from "../utils/safeExec";
import type { ActionPrivilege, ActionRisk } from "./actions";
import type { SafeExecResult, SupportedPlatform } from "./types";

export type ClipboardWriteAdapter = {
	command: string;
	args: string[];
	stdin: true;
};

export type ClipboardWritePlan = {
	risk: ActionRisk;
	privilege: ActionPrivilege;
	confirmationRequired: true;
	confirmationPhrase: "copy";
	confirmed: boolean;
	enabled: boolean;
	reason: string;
	previewText: string;
	adapter: ClipboardWriteAdapter;
	source: ClipboardPreview["source"];
	label: string;
};

export type ClipboardAuditEvent = {
	at: string;
	action: "clipboard.write";
	risk: ActionRisk;
	privilege: ActionPrivilege;
	source: ClipboardPreview["source"];
	label: string;
	confirmed: boolean;
	adapter: string;
	preview: string;
};

export type ClipboardWriteResult = {
	success: boolean;
	audit: ClipboardAuditEvent;
	error?: string;
};

export type ClipboardWriteRunner = (
	command: string,
	args: string[],
	options: { stdin: string },
) => Promise<SafeExecResult>;

export function buildClipboardWritePlan(
	preview: ClipboardPreview,
	options: {
		confirmation?: string;
		platform?: SupportedPlatform;
	} = {},
): ClipboardWritePlan {
	const confirmed = options.confirmation === preview.confirmation;
	return {
		risk: "write",
		privilege: "user",
		confirmationRequired: true,
		confirmationPhrase: preview.confirmation,
		confirmed,
		enabled: confirmed,
		reason: confirmed
			? "confirmed"
			: `type ${preview.confirmation} to allow clipboard write`,
		previewText: preview.copyText,
		adapter: getClipboardWriteAdapter(options.platform ?? process.platform),
		source: preview.source,
		label: preview.label,
	};
}

export function createClipboardAuditEvent(
	plan: ClipboardWritePlan,
	at = new Date().toISOString(),
): ClipboardAuditEvent {
	return {
		at,
		action: "clipboard.write",
		risk: plan.risk,
		privilege: plan.privilege,
		source: plan.source,
		label: plan.label,
		confirmed: plan.confirmed,
		adapter: plan.adapter.command,
		preview: plan.previewText,
	};
}

export async function runClipboardWritePlan(
	plan: ClipboardWritePlan,
	runner: ClipboardWriteRunner = (command, args, options) =>
		safeExec(command, args, { stdin: options.stdin }),
): Promise<ClipboardWriteResult> {
	const audit = createClipboardAuditEvent(plan);
	if (!plan.enabled) {
		return {
			success: false,
			audit,
			error: `Clipboard write is locked: ${plan.reason}`,
		};
	}

	const result = await runner(plan.adapter.command, plan.adapter.args, {
		stdin: plan.previewText,
	});
	return {
		success: result.success,
		audit,
		...(result.success
			? {}
			: { error: result.stderr || "Clipboard write failed" }),
	};
}

function getClipboardWriteAdapter(
	platform: SupportedPlatform,
): ClipboardWriteAdapter {
	if (platform === "win32") {
		return windowsClipboardWriteCommand();
	}
	if (platform === "darwin") {
		return macosClipboardWriteCommand();
	}
	return linuxClipboardWriteCommand();
}
