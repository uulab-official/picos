import { describe, expect, test } from "bun:test";
import { controlPreviewCommand as macosControlPreviewCommand } from "../src/adapters/macos";
import { controlPreviewCommand as windowsControlPreviewCommand } from "../src/adapters/windows";
import {
	createActionPreviewPlan,
	submitActionPreviewConfirmation,
} from "../src/core/actions";
import {
	createControlExecutionPlan,
	defaultControlExecutionPolicy,
	formatControlExecutionAuditMessage,
	formatControlExecutionPolicyRows,
	formatControlExecutionResultAuditMessage,
	formatControlExecutionRows,
	getControlExecutionPolicyFromConfig,
	runControlExecutionPlan,
} from "../src/core/controlExecution";

describe("control execution harness", () => {
	test("derives operator dry-run policy from config", () => {
		expect(
			getControlExecutionPolicyFromConfig({
				controlExecutionMode: "dry-run",
				allowAdminDryRun: true,
			}),
		).toEqual({
			mode: "dry-run",
			allowAdminDryRun: true,
		});
		expect(getControlExecutionPolicyFromConfig({})).toEqual(
			defaultControlExecutionPolicy,
		);
		expect(
			formatControlExecutionPolicyRows(defaultControlExecutionPolicy),
		).toEqual([
			"CONTROL EXECUTION POLICY",
			"mode=disabled allowAdminDryRun=false",
			"dry-run attempts blocked until controlExecutionMode=dry-run",
			"admin dry-run blocked until allowAdminDryRun=true",
		]);
		expect(
			formatControlExecutionPolicyRows({
				mode: "dry-run",
				allowAdminDryRun: true,
			}),
		).toEqual([
			"CONTROL EXECUTION POLICY",
			"mode=dry-run allowAdminDryRun=true",
			"dry-run attempts enabled for adapter-declared commands",
			"admin dry-run allowed after exact confirmation",
		]);
	});

	test("blocks locked OS controls unless explicit dry-run policy is enabled", async () => {
		const commandPreview = windowsControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "win32", commandPreview);

		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}

		const confirmation = submitActionPreviewConfirmation(plan, "flush dns");
		const execution = createControlExecutionPlan(
			plan,
			confirmation,
			defaultControlExecutionPolicy,
		);

		expect(execution).toEqual({
			actionId: "dns.flush",
			status: "blocked",
			policy: "disabled",
			confirmed: true,
			willExecute: false,
			dryRun: true,
			reason: "mutation-controls-disabled",
			blockers: ["mutation-controls-disabled"],
			commandPreview,
		});

		let calls = 0;
		const result = await runControlExecutionPlan(execution, async () => {
			calls += 1;
			throw new Error("runner must not be called");
		});

		expect(calls).toBe(0);
		expect(result).toEqual({
			success: false,
			audit: {
				actionId: "dns.flush",
				status: "blocked",
				policy: "disabled",
				confirmed: true,
				dryRun: true,
				willExecute: false,
				adapter: "windows",
				command: "powershell -NoProfile -Command Clear-DnsClientCache -WhatIf",
				blockers: ["mutation-controls-disabled"],
			},
			error: "Control execution blocked: mutation-controls-disabled",
		});
		expect(formatControlExecutionAuditMessage(execution)).toBe(
			'control execution dns.flush status=blocked policy=disabled confirmed=true dryRun=true willExecute=false blockers=mutation-controls-disabled adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
		);
		expect(formatControlExecutionRows(execution)).toEqual([
			"CONTROL EXECUTION dns.flush",
			"status=blocked policy=disabled confirmed=true dryRun=true",
			"willExecute=false reason=mutation-controls-disabled",
			"blockers=mutation-controls-disabled",
			"adapter=windows",
			"command=powershell -NoProfile -Command Clear-DnsClientCache -WhatIf",
		]);
	});

	test("runs only adapter-declared dry-run commands through an injected runner", async () => {
		const commandPreview = windowsControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "win32", commandPreview);

		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}

		const confirmation = submitActionPreviewConfirmation(plan, "flush dns");
		const execution = createControlExecutionPlan(plan, confirmation, {
			mode: "dry-run",
			allowAdminDryRun: true,
		});
		const calls: Array<{ command: string; args: string[] }> = [];
		const result = await runControlExecutionPlan(
			execution,
			async (command, args) => {
				calls.push({ command, args });
				return {
					command,
					args,
					stdout: "What if: Clear-DnsClientCache",
					stderr: "",
					exitCode: 0,
					success: true,
				};
			},
		);

		expect(execution.status).toBe("dry-run-ready");
		expect(execution.willExecute).toBeTrue();
		expect(calls).toEqual([
			{
				command: "powershell",
				args: ["-NoProfile", "-Command", "Clear-DnsClientCache -WhatIf"],
			},
		]);
		expect(result).toEqual({
			success: true,
			audit: {
				actionId: "dns.flush",
				status: "dry-run-executed",
				policy: "dry-run",
				confirmed: true,
				dryRun: true,
				willExecute: true,
				adapter: "windows",
				command: "powershell -NoProfile -Command Clear-DnsClientCache -WhatIf",
				blockers: [],
			},
			stdout: "What if: Clear-DnsClientCache",
		});
		expect(formatControlExecutionResultAuditMessage(result.audit)).toBe(
			'control execution dns.flush status=dry-run-executed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf"',
		);
	});

	test("refuses preview-only adapter commands even with dry-run opt-in", async () => {
		const commandPreview = macosControlPreviewCommand("dns.flush");
		const plan = createActionPreviewPlan("dns.flush", "darwin", commandPreview);

		if (!plan) {
			throw new Error("expected dns.flush preview plan");
		}

		const confirmation = submitActionPreviewConfirmation(plan, "flush dns");
		const execution = createControlExecutionPlan(plan, confirmation, {
			mode: "dry-run",
			allowAdminDryRun: true,
		});

		expect(execution.status).toBe("blocked");
		expect(execution.blockers).toEqual(["adapter-dry-run-unavailable"]);
	});
});
