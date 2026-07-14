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
```

## Architecture Rules

- `src/tui` owns keyboard-driven panels and visual state.
- `src/cli` owns command parsing and output.
- `src/core` owns platform-neutral behavior and metadata.
- `src/core/sftp.ts` owns SSH/SFTP transport and exposes only the shared read-only `FileProvider` surface.
- `src/adapters` owns OS-specific command definitions.
- `src/utils/safeExec.ts` is the only place that should spawn OS commands.
- TUI and CLI must call `core` APIs rather than shelling out directly.
- SFTP connections require a selected SHA256 host-key candidate and exact confirmation; never auto-accept or persist host trust.
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
- locked action catalog for future privileged controls

Actual OS mutation remains disabled by default.

## Working Style

- Keep changes small and scoped.
- Prefer tested pure functions for navigation, action metadata, parsing, and permission decisions.
- Update `CHANGELOG.md` for user-visible changes.
- Update `README.md` when commands, setup, or product scope changes.
- Do not commit build output from `dist/`.
