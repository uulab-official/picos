import { describe, expect, test } from "bun:test";
import { createActionPreviewPlan, getActionCatalog } from "../src/core/actions";
import type { ControlExecutionResult } from "../src/core/controlExecution";
import {
	classifyControlExecutionFailure,
	classifyControlExecutionResult,
	prepareActionDispatch,
	prepareControlConfirmationPrompt,
	prepareControlExecutionStart,
	prepareControlExecutionTransition,
	submitControlConfirmationTransition,
} from "../src/tui/actionControlTransitions";

describe("action control dispatch transitions", () => {
	test("blocks unknown actions before any execution intent is returned", () => {
		expect(
			prepareActionDispatch({
				actionId: "missing.action",
				actions: getActionCatalog(),
				platform: "linux",
			}),
		).toEqual({
			kind: "blocked",
			actionId: "missing.action",
			blockers: ["action-not-found"],
			control: {
				previewPlan: undefined,
				confirmation: undefined,
				simulation: undefined,
				executionPlan: undefined,
			},
			notice: {
				level: "warn",
				message: "action missing.action blocked: action-not-found",
			},
		});
	});

	test("blocks incomplete action metadata instead of trusting a cast", () => {
		const incomplete = {
			id: "broken.read",
			title: "Broken read",
			description: "Missing risk metadata",
			category: "system",
			privilege: "none",
			enabled: true,
			confirmationRequired: false,
		};

		expect(
			prepareActionDispatch({
				actionId: "broken.read",
				actions: [incomplete],
				platform: "linux",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["risk-missing"],
			notice: {
				level: "warn",
				message: "action broken.read blocked: risk-missing",
			},
		});
	});

	test("routes an enabled read action directly without inventing confirmation", () => {
		expect(
			prepareActionDispatch({
				actionId: "network.inspect",
				actions: getActionCatalog(),
				platform: "darwin",
			}),
		).toMatchObject({
			kind: "run",
			action: {
				id: "network.inspect",
				risk: "read",
				privilege: "none",
				enabled: true,
				confirmationRequired: false,
			},
			control: {
				previewPlan: undefined,
				confirmation: undefined,
				simulation: undefined,
				executionPlan: undefined,
			},
			notice: { level: "run", message: "network.inspect started" },
		});
	});

	test("never routes an enabled mutable action even when a malformed catalog enables it", () => {
		const mutable = {
			...getCatalogAction("dns.flush"),
			enabled: true,
		};

		expect(
			prepareActionDispatch({
				actionId: mutable.id,
				actions: [mutable],
				platform: "win32",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["mutable-action-enabled"],
		});
	});

	test("blocks disabled read actions and mutable actions without exact confirmation metadata", () => {
		expect(
			prepareActionDispatch({
				actionId: "remote.sftp.connect",
				actions: getActionCatalog(),
				platform: "linux",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["action-disabled"],
		});

		const missingPhrase = {
			...getCatalogAction("dns.flush"),
			confirmationPhrase: undefined,
		};
		expect(
			prepareActionDispatch({
				actionId: missingPhrase.id,
				actions: [missingPhrase],
				platform: "win32",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["confirmation-phrase-missing"],
		});
	});

	test("blocks unsupported platforms and missing adapter-owned previews", () => {
		expect(
			prepareActionDispatch({
				actionId: "dns.flush",
				actions: getActionCatalog(),
				platform: "freebsd",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["unsupported-platform"],
		});
		expect(
			prepareActionDispatch({
				actionId: "files.write",
				actions: getActionCatalog(),
				platform: "linux",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["adapter-command-missing"],
		});
	});

	test("blocks a preview owned by a different platform adapter", () => {
		const macosPreview = createActionPreviewPlan("dns.flush", "darwin", {
			adapter: "macos",
			command: "sudo",
			args: ["dscacheutil", "-flushcache"],
			note: "flush local DNS resolver cache",
		});

		expect(
			prepareActionDispatch({
				actionId: "dns.flush",
				actions: getActionCatalog(),
				platform: "win32",
				previewPlan: macosPreview,
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["adapter-platform-mismatch"],
		});
	});

	test("opens a complete locked mutation preview without enabling execution", () => {
		const transition = prepareActionDispatch({
			actionId: "dns.flush",
			actions: getActionCatalog(),
			platform: "win32",
		});

		expect(transition).toMatchObject({
			kind: "preview",
			action: {
				id: "dns.flush",
				risk: "write",
				privilege: "admin",
				enabled: false,
			},
			screen: "actions",
			control: {
				previewPlan: {
					actionId: "dns.flush",
					dryRun: true,
					confirmationPhrase: "flush dns",
					commandPreview: { adapter: "windows", dryRunExecutable: true },
				},
				confirmation: undefined,
				simulation: {
					actionId: "dns.flush",
					status: "blocked-by-policy",
					executionEnabled: false,
				},
				executionPlan: undefined,
			},
		});
		expect(transition.notice.message).toContain(
			"control preview dns.flush risk=write privilege=admin dryRun=true",
		);
	});

	test("keeps update apply in its feature-owner status handoff until update evidence exists", () => {
		expect(
			prepareActionDispatch({
				actionId: "picos.update.apply",
				actions: getActionCatalog(),
				platform: "linux",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["update-check-required"],
			screen: "status",
			notice: {
				level: "warn",
				message: "run picos.update before opening update apply preview",
			},
		});
	});

	test("preserves the focused Actions handoff when update apply evidence is available", () => {
		expect(
			prepareActionDispatch({
				actionId: "picos.update.apply",
				actions: getActionCatalog(),
				platform: "linux",
				updateCheckResult: {
					packageName: "@uulab/picos",
					currentVersion: "0.2.0",
					latestVersion: "0.3.0",
					status: "update-available",
					registryUrl: "https://registry.npmjs.org/@uulab%2Fpicos/latest",
				},
			}),
		).toMatchObject({
			kind: "preview",
			screen: "actions",
			focusArea: "actions",
			control: {
				previewPlan: {
					actionId: "picos.update.apply",
					commandPreview: {
						adapter: "linux",
						dryRunExecutable: true,
					},
				},
			},
		});
	});
});

describe("action control confirmation transitions", () => {
	const preview = createActionPreviewPlan("dns.flush", "win32", {
		adapter: "windows",
		command: "powershell",
		args: ["-NoProfile", "-Command", "Clear-DnsClientCache -WhatIf"],
		note: "flush local DNS resolver cache with WhatIf preview",
		dryRunExecutable: true,
	});

	test("advertises confirmation only for a complete locked mutable preview", () => {
		expect(prepareControlConfirmationPrompt(undefined)).toEqual({
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control confirmation needs a locked action preview first",
			},
		});
		expect(prepareControlConfirmationPrompt(preview)).toEqual({
			kind: "prompt",
			prompt: "control-confirm",
			notice: {
				level: "info",
				message: "control confirmation opened for dns.flush",
			},
		});
	});

	test("rejects absent or mismatched confirmation without execution", () => {
		expect(
			submitControlConfirmationTransition({
				previewPlan: undefined,
				input: "",
			}),
		).toEqual({
			kind: "blocked",
			closeCommandLine: true,
			notices: [
				{
					level: "warn",
					message: "control confirmation missing preview",
				},
			],
		});

		const rejected = submitControlConfirmationTransition({
			previewPlan: preview,
			input: "flush cache",
		});
		expect(rejected).toMatchObject({
			kind: "confirmation",
			closeCommandLine: true,
			confirmation: { confirmed: false, status: "rejected" },
			simulation: { executionEnabled: false },
			executionPlan: undefined,
			notices: [{ level: "fail" }, { level: "warn" }],
		});
	});

	test("records an exact confirmation but keeps mutation execution disabled", () => {
		const accepted = submitControlConfirmationTransition({
			previewPlan: preview,
			input: " flush dns ",
		});
		expect(accepted).toMatchObject({
			kind: "confirmation",
			confirmation: {
				expectedPhrase: "flush dns",
				receivedPhrase: "flush dns",
				confirmed: true,
				executionEnabled: false,
			},
			simulation: {
				confirmed: true,
				executionEnabled: false,
			},
			notices: [{ level: "warn" }, { level: "warn" }],
		});
	});
});

describe("control execution token publication", () => {
	const preview = createActionPreviewPlan("dns.flush", "win32", {
		adapter: "windows",
		command: "powershell",
		args: ["-NoProfile", "-Command", "Clear-DnsClientCache -WhatIf"],
		note: "flush local DNS resolver cache with WhatIf preview",
		dryRunExecutable: true,
	});
	const confirmed = preview
		? submitControlConfirmationTransition({
				previewPlan: preview,
				input: "flush dns",
			})
		: undefined;

	test("does not publish a stale execution plan after config policy I/O", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		expect(
			prepareControlExecutionTransition({
				previewPlan: preview,
				confirmation: confirmed.confirmation,
				policy: { mode: "dry-run", allowAdminDryRun: true },
				requestToken: 1,
				currentToken: 2,
			}),
		).toEqual({ kind: "stale", publishCurrent: false });
	});

	test("guards missing previews before requesting config policy I/O", () => {
		expect(prepareControlExecutionStart(undefined)).toEqual({
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		});
		expect(prepareControlExecutionStart(preview)).toEqual({
			kind: "read-policy",
			actionId: "dns.flush",
			io: { kind: "read-control-policy" },
		});
	});

	test("returns an adapter execution intent only for the owning token", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		const transition = prepareControlExecutionTransition({
			previewPlan: preview,
			confirmation: confirmed.confirmation,
			policy: { mode: "dry-run", allowAdminDryRun: true },
			requestToken: 3,
			currentToken: 3,
		});
		expect(transition).toMatchObject({
			kind: "execute",
			publishCurrent: true,
			executionPlan: {
				actionId: "dns.flush",
				status: "dry-run-ready",
				willExecute: true,
			},
			io: { kind: "run-control-execution" },
		});
	});

	test("blocks execution when confirmation belongs to a different action", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		expect(
			prepareControlExecutionTransition({
				previewPlan: preview,
				confirmation: {
					...confirmed.confirmation,
					actionId: "route.add",
				},
				policy: { mode: "dry-run", allowAdminDryRun: true },
				requestToken: 4,
				currentToken: 4,
			}),
		).toEqual({
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message:
					"control execution dns.flush blocked: confirmation-action-mismatch",
			},
		});
	});

	test("blocks a confirmed execution when its exact phrase differs from the preview", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		expect(
			prepareControlExecutionTransition({
				previewPlan: preview,
				confirmation: {
					...confirmed.confirmation,
					expectedPhrase: "flush resolver",
					receivedPhrase: "flush resolver",
				},
				policy: { mode: "dry-run", allowAdminDryRun: true },
				requestToken: 5,
				currentToken: 5,
			}),
		).toEqual({
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message:
					"control execution dns.flush blocked: confirmation-preview-mismatch",
			},
		});
	});

	test("blocks a confirmed execution when its adapter command differs from the preview", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		const commandPreview = confirmed.confirmation.commandPreview;
		if (!commandPreview) {
			throw new Error("expected adapter command fixture");
		}
		expect(
			prepareControlExecutionTransition({
				previewPlan: preview,
				confirmation: {
					...confirmed.confirmation,
					commandPreview: {
						...commandPreview,
						command: "cmd.exe",
					},
				},
				policy: { mode: "dry-run", allowAdminDryRun: true },
				requestToken: 6,
				currentToken: 6,
			}),
		).toEqual({
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message:
					"control execution dns.flush blocked: confirmation-preview-mismatch",
			},
		});
	});

	test("keeps stale failures as history without publishing current output", () => {
		const result: ControlExecutionResult = {
			success: false,
			audit: {
				actionId: "dns.flush",
				status: "dry-run-failed",
				policy: "dry-run",
				confirmed: true,
				dryRun: true,
				willExecute: true,
				adapter: "windows",
				command: "powershell -NoProfile -Command Clear-DnsClientCache -WhatIf",
				blockers: [],
			},
			stderr: "access denied",
			error: "access denied",
		};
		expect(
			classifyControlExecutionResult({
				result,
				requestToken: 4,
				currentToken: 5,
			}),
		).toEqual({
			publication: "stale",
			publishCurrent: false,
			historyNotice: {
				level: "fail",
				message:
					'control execution dns.flush status=dry-run-failed policy=dry-run confirmed=true dryRun=true willExecute=true adapter=windows command="powershell -NoProfile -Command Clear-DnsClientCache -WhatIf" publication=stale',
			},
			currentNotices: [],
		});
	});

	test("does not publish stale successes and publishes current output only for its owner", () => {
		const result: ControlExecutionResult = {
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
		};
		expect(
			classifyControlExecutionResult({
				result,
				requestToken: 6,
				currentToken: 7,
			}),
		).toMatchObject({
			publication: "stale",
			publishCurrent: false,
			currentNotices: [],
		});
		expect(
			classifyControlExecutionResult({
				result,
				requestToken: 7,
				currentToken: 7,
			}),
		).toMatchObject({
			publication: "current",
			publishCurrent: true,
			historyNotice: { level: "ok" },
			currentNotices: [
				{
					level: "info",
					message: "control dry-run stdout What if: Clear-DnsClientCache",
				},
			],
		});
	});

	test("classifies thrown stale failures as history-only evidence", () => {
		expect(
			classifyControlExecutionFailure({
				actionId: "dns.flush",
				error: new Error("runner exploded"),
				requestToken: 8,
				currentToken: 9,
			}),
		).toEqual({
			publication: "stale",
			publishCurrent: false,
			historyNotice: {
				level: "fail",
				message:
					"control execution dns.flush failed runner exploded publication=stale",
			},
		});
	});

	test("blocks an execution attempt without a preview", () => {
		const transition = prepareControlExecutionTransition({
			previewPlan: undefined,
			confirmation: undefined,
			policy: { mode: "disabled", allowAdminDryRun: false },
			requestToken: 10,
			currentToken: 10,
		});
		expect(transition).toEqual({
			kind: "blocked",
			publishCurrent: true,
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		});
	});
});

function getCatalogAction(actionId: string) {
	const action = getActionCatalog().find(
		(candidate) => candidate.id === actionId,
	);
	if (!action) {
		throw new Error(`expected ${actionId} action fixture`);
	}
	return action;
}
