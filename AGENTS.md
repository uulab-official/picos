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
bun run harness sftp
```

## Architecture Rules

- `src/tui` owns keyboard-driven panels and visual state.
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
- locked action catalog for future privileged controls

Actual OS mutation remains disabled by default.

## Working Style

- Keep changes small and scoped.
- Prefer tested pure functions for navigation, action metadata, parsing, and permission decisions.
- Update `CHANGELOG.md` for user-visible changes.
- Update `README.md` when commands, setup, or product scope changes.
- Do not commit build output from `dist/`.
