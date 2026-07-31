# Agent Guide

This repository is agent-friendly. Codex, Claude, and other coding agents should follow this file before editing code.

## Project Intent

`picos` is a tiny terminal OS for developers: a keyboard-driven TUI/CLI control panel for inspecting and eventually controlling local OS state.

The default experience is `picos`, which opens the TUI. Plain CLI commands are secondary automation surfaces.

## Stack

- Runtime: Bun
- Language: TypeScript
- TUI: Ink + React
- CLI parser: cac
- Formatter/linter: Biome
- Tests: Bun test
- Package: `@uulab/picos`
- Binary: `picos`

## Required Commands

Before claiming work is done, run:

```bash
bun run verify
```

Useful focused commands:

```bash
bun run lint
bun test
bun run typecheck
bun run build
bun run smoke
bun run harness local-json
bun run harness diagnostics-json
bun run harness operations-json
bun run harness automation-presets
bun run harness sftp
```

## Architecture Rules

- `src/tui` owns keyboard-driven panels and visual state.
- Describe a key by the shape of what it does, not by listing every instance. The `enter` and `j/k` entries in the README went stale the moment a workspace was added, the same way a hand-listed union member goes stale; prefer "act on the current selection" over an enumeration that has to be revisited.
- Clamp a list index with `clampIndex()` from `src/tui/navigation.ts` rather than inline arithmetic. The inline form was spelled three ways, two of which omitted the lower bound and one of which indexed an empty list at `-1`; all three happened to work, for different reasons.
- Nothing under `tests/` touches `src/tui/App.tsx`, so any decision left inside a component callback is unverified by construction. Put guards, selection resolution, state transitions, and message wording in a sibling `src/tui/*.ts` module with a test, and keep the component to wiring and I/O. Every defect found reviewing the Operations workspace lived in logic that had been written inline.
- State written after an `await` needs a sequence from `src/tui/requestSequence.ts`, checked before every publish including in the `catch`. One sequence per group of state that must stay consistent, shared by every writer of that group and separate from other groups: shared counters stop two writers overwriting each other, separate ones stop a slow inspection discarding a fresh refresh. No scheduler here waits for the previous run, so this is routine rather than a corner case.
- Await everything a batch needs before writing any of it. A partial update pairs fresh data with stale data, which is how a listening port comes to resolve to the wrong process.
- A value derived by diffing against the previous one must be computed by the newest request only. A late request diffing against a reference a newer one already advanced describes a change that never happened, and those writes are usually audit events.
- On failure, separate history from current state. The event log records every failure because it is a history; a superseded request must not set the current error, or a stale failure sits beside a newer success.
- A long-running TUI action must be identified by a token, not tracked with a shared boolean. A boolean let a superseded run clear the current run's cancellation and publish onto its progress; comparing tokens makes a superseded loop unable to do either.
- An in-flight status set is not just the obvious one. Treat every non-terminal status as busy, including a `cancelling` state, or a second action will start while the first is still running.
- A control row must never advertise a key that cannot act. If a run has no interruptible window, say so in the row instead of offering the cancel key. A row that points at another workspace must name that workspace or the CLI command, never a bare key, because the same letter is usually bound to something else where the row renders.
- Shared status that several actions can set must be counted, not assigned. With two actions in flight, the first to return would otherwise report idle while the second was still working. Pair every begin with exactly one end in a `finally`, keep the end unconditional even when a newer action superseded this one, and floor the count at zero so an unbalanced end cannot strand the indicator.
- `src/cli` owns command parsing and output.
- `src/core` owns platform-neutral behavior and metadata.
- `src/core/sftp.ts` owns SSH/SFTP transport and exposes only the shared read-only `FileProvider` surface.
- `src/adapters` owns OS-specific command definitions.
- `src/utils/safeExec.ts` is the only place that should spawn OS commands.
- Keep the default `safeExec()` combined stdout/stderr byte bound; platform readers must not restore unbounded child-output buffering.
- TUI and CLI must call `core` APIs rather than shelling out directly.
- SFTP connections require a selected SHA256 host-key candidate and exact confirmation; never auto-accept or persist host trust.
- CLI SFTP list/read must use the same core provider, local `known_hosts` verification, timeout/read bounds, audit formatting, and guaranteed close as the TUI.
- Remote `--json` must remain one versioned stdout document; keep audit diagnostics on stderr, preserve non-zero failure exits, and never serialize key paths or credentials.
- Local inspector `--json` must remain one bounded versioned stdout document, omit raw OS output and process arguments, preserve source success/exit status, redact failure text, flush large pipe output without double reporting, and reject `--raw --json` before command execution.
- The local JSON subprocess harness must run in `bun run verify` on every supported CI OS.
- Doctor, DNS, and Tools JSON must preserve stable check/tool identities, normalized source evidence, recursive secret redaction, and locked DNS mutation; run the diagnostics JSON subprocess harness when changing them.
- Monitor, Logs, and Process JSON must preserve collector support/success/exit/truncation evidence, omit process arguments and raw log/process output, bound and redact normalized log text, and distinguish optional collector gaps with `outcome=partial`; run the operations JSON subprocess harness when changing them.
- Saved operation presets must stay declarative: store validated inspector options only, never a command string, re-validate on load, keep the preset shelf bounded, require exact `save operation preset <id>` / `remove operation preset <id>` confirmation for config writes, keep `operationPresets` out of generic `picos config set`, and never let a preset run something the direct command cannot.
- Bounded monitor sampling must stay inside its sample-count, interval, and interval-span limits so no preset or CLI flag can turn picos into a long-running background collector. The span cap is not a wall-clock guarantee, because each sample also runs a collector bounded by its own `safeExec()` timeout; never document it as one.
- A preset write that drops another saved preset must report what it dropped in both the JSON and plain-text forms; the bounded shelf may evict, but never silently.
- A reference point used to judge identity must never be fabricated when it is missing. A synthesized baseline is not persisted, so it is re-derived on every read and always reports agreement, which silently disables the check; leave it absent and report `unknown` instead. This is narrower than it looks: defaulting a `generatedAt` or a run's `startedAt` to now is correct, because those describe the thing being created. The rule is about inventing a *past* instant that should have come from storage.
- State an identity verdict no more strongly than its weakest path supports. Comparing two wall-clock instants is sound; comparing a kernel-reported age against the wall clock can invert under a clock step, so document that as evidence rather than proof and prefer the absolute value where a platform supplies one.
- A result that could be read as reassuring must say when it is bounded rather than complete. A log query capped before filtering, or an identity check with no baseline, has to publish that fact rather than leaving a consumer to infer it from counts.
- The published operation preset contract must be derived from the same constants the preset validators enforce, never hand-copied; changing a bound or default requires updating the contract test in the same change. The published id pattern must come from the enforcing regular expression's `source`, not a copied string.
- The contract catalog must stay keyed by the preset kind union so a new preset kind cannot ship without its published contract, and published field names must keep matching the preset input keys.
- `picos operations kinds` must answer from the built-in catalog without reading config, and must keep returning copies so callers cannot mutate the catalog.
- Exact confirmation phrases must come from the shared core formatter so the CLI write guard and the published contract cannot disagree.
- Run the automation presets subprocess harness when changing preset parsing, storage, run dispatch, monitor sampling, the published contract, or their confirmation and failure behavior; it must stay pointed at an isolated temporary config directory so it never reads or writes real operator presets.
- The disposable localhost SFTP harness must use public-key authentication, reject mutation/exec, and run in `bun run verify` on every supported CI OS.
- Treat matching `@revoked` fingerprints as global blockers, preserve exact confirmation bytes, and keep trust files plus remote reads/listings bounded before presenting output.
- Retrying a failed or cancelled connection must require the exact confirmation again; cancellation must remain visible and recoverable as audit evidence.
- OS mutation must be represented as an action before it is executable.

## Safety Rules

Future OS-changing actions must have:

- risk: `read`, `write`, or `destructive`
- privilege: `none`, `user`, or `admin`
- preview/dry-run text
- confirmation requirement for write/destructive actions
- adapter-owned OS commands
- tests for locked/default behavior

Never add a system-changing command directly to a screen or CLI handler.

## Current Product Boundary

The current milestone makes picos visible and navigable:

- Dashboard, System, Hardware, Storage, Processes, Network, DNS, Actions, Status, Logs panels
- keyboard navigation with number keys, arrows, and `h`/`l`
- read-only OS inventory and safe network reachability tools
- host-key-verified read-only SFTP list/stat/read sessions with explicit close and locked remote writes
- cancellable/retryable SFTP lifecycle diagnostics and guarded CLI remote list/read automation
- schema-versioned remote JSON automation and a credentialed cross-platform SFTP integration harness
- schema-versioned local OS/network inspector JSON and a cross-platform subprocess integration harness
- schema-versioned doctor/DNS/Tools automation and a localhost-backed cross-platform diagnostics harness
- schema-versioned monitor/log/process automation and a cross-platform operations harness
- bounded monitor sampling plus exact-confirm saved monitor/log/process automation presets and a cross-platform presets harness
- locked action catalog for future privileged controls

Actual OS mutation remains disabled by default.

## Working Style

- Keep changes small and scoped.
- Prefer tested pure functions for navigation, action metadata, parsing, and permission decisions.
- Update `CHANGELOG.md` for user-visible changes.
- Update `README.md` when commands, setup, or product scope changes.
- Do not commit build output from `dist/`.
