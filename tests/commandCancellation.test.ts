import { describe, expect, test } from "bun:test";
import {
	type CommandCancellationCleanupIntent,
	prepareCommandCancellation,
} from "../src/tui/commandCancellation";
import {
	commandPromptOwnershipRegistry,
	getCommandPromptExamples,
} from "../src/tui/commandLine";

describe("command prompt cancellation", () => {
	test("every registered prompt closes the command line and has submit and cancellation ownership", () => {
		const examples = getCommandPromptExamples();
		expect(examples.length).toBe(commandPromptOwnershipRegistry.length);

		for (const prompt of examples) {
			const result = prepareCommandCancellation(prompt, "workspaces");
			expect(result?.commandLine).toBe("close");
			expect(result?.focusArea).toBe("workspaces");
			expect(result?.notice.level).toBe("info");
			expect(result?.notice.message.endsWith("cancelled")).toBe(true);
			expect(result?.submit.owner.length).toBeGreaterThan(0);
		}
	});

	test("returns exact cleanup intents for stateful dialogs and sessions", () => {
		const fileOperationDialog = {
			active: true as const,
			preview: {
				kind: "delete" as const,
				title: "Delete file",
				path: "/tmp/example",
				targetHint: "selected path will be removed",
				risk: "destructive" as const,
				privilege: "user" as const,
				confirmationPhrase: "delete file",
				executable: false,
				reason: "confirmation-required",
			},
		};
		const cases: Array<{
			prompt: Parameters<typeof prepareCommandCancellation>[0];
			cleanup: CommandCancellationCleanupIntent[];
			notice: string;
		}> = [
			{
				prompt: "clipboard",
				cleanup: [
					"clipboard-confirmation",
					"connection-copy-preview",
					"port-copy-preview",
					"process-copy-preview",
					"route-copy-preview",
					"tool-copy-preview",
				],
				notice: "clipboard confirmation cancelled",
			},
			{
				prompt: "external-open",
				cleanup: ["external-open-plan"],
				notice: "external open confirmation cancelled",
			},
			{
				prompt: "file-open",
				cleanup: ["file-open-plan"],
				notice: "file open confirmation cancelled",
			},
			{
				prompt: "port-process-control",
				cleanup: ["port-process-preview"],
				notice: "port process control cancelled",
			},
			{
				prompt: "cleanup-export-archive",
				cleanup: ["cleanup-export-archive-plan"],
				notice: "cleanup export archive cancelled",
			},
			{
				prompt: "tool-export-archive",
				cleanup: ["tool-export-archive-plan"],
				notice: "tools evidence archive cancelled",
			},
			{
				prompt: "audit-export-archive",
				cleanup: ["audit-export-archive-plan"],
				notice: "audit export archive cancelled",
			},
			{
				prompt: "audit-archive-retention",
				cleanup: ["audit-archive-retention-plan"],
				notice: "audit archive retention cancelled",
			},
			{
				prompt: "tools-archive-retention",
				cleanup: ["tool-archive-retention-plan"],
				notice: "tools archive retention cancelled",
			},
			{
				prompt: "config-reset",
				cleanup: ["config-reset-preview"],
				notice: "config reset cancelled",
			},
			{
				prompt: "file-operation-destination",
				cleanup: ["file-operation-dialog"],
				notice: "file operation destination cancelled",
			},
			{
				prompt: "file-operation-confirm",
				cleanup: ["file-operation-dialog"],
				notice: "file operation confirmation cancelled",
			},
		];

		for (const item of cases) {
			const result = prepareCommandCancellation(item.prompt, "workspaces", {
				fileOperationDialog,
			});
			expect(result?.cleanup).toEqual(item.cleanup);
			expect(result?.notice.message).toBe(item.notice);
			if (item.cleanup.includes("file-operation-dialog")) {
				expect(result?.fileOperationDialog).toEqual({ active: false });
			}
		}
	});

	test("uses feature-specific notices instead of the path fallback", () => {
		expect(
			prepareCommandCancellation("interface-evidence-search", "workspaces")
				?.notice.message,
		).toBe("interface evidence search cancelled");
		expect(
			prepareCommandCancellation("interface-confirm", "workspaces")?.notice
				.message,
		).toBe("interface confirmation cancelled");
	});

	test("no prompt and unknown or inherited keys cannot cancel or route", () => {
		expect(prepareCommandCancellation(undefined, "workspaces")).toBeUndefined();
		expect(
			prepareCommandCancellation("toString", "workspaces"),
		).toBeUndefined();
		expect(prepareCommandCancellation("unknown", "workspaces")).toBeUndefined();
	});
});
