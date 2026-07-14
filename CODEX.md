# Codex Guide

This file is a human-readable companion to `AGENTS.md` for Codex sessions.

## Default Loop

1. Inspect the current tree and recent docs.
2. Make the smallest scoped change that advances the terminal OS direction.
3. Add or update tests for behavior changes.
4. Run `bun run verify`.
5. Report exact verification results and any remaining risk.

## Branching

Use `codex/` branch names for Codex-authored work unless the user requests another name.

## Product Priorities

1. A usable keyboard-driven TUI shell.
2. Safe read-only system inspection.
3. A transparent action/permission model.
4. Carefully confirmed privileged controls.
5. Plugins and broader system integrations.

## OS Inventory Rules

For OS inventory features, keep read-only behavior first. All platform commands must stay in adapters or core helpers that call `safeExec()`. Do not add write/destructive system controls without preview, confirmation, privilege metadata, and tests proving the action is locked by default.

Monitor, Logs, and Process automation must remain bounded and source-aware. Omit process command arguments and raw collector output, redact normalized log text, preserve optional collector support/failure state, and run `bun run harness operations-json` when changing those paths.

## Files Codex Should Keep Fresh

- `README.md`: public project overview and usage.
- `CHANGELOG.md`: user-visible changes.
- `docs/HARNESS.md`: verification harness details.
- `docs/LOCAL_AUTOMATION.md`: versioned local inspector and diagnostics contracts.
- `AGENTS.md`: cross-agent rules.
- `CLAUDE.md`: Claude-specific notes.
