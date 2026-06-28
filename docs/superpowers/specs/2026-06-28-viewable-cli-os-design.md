# Viewable CLI OS Design

## Goal

Make `picos` feel like a keyboard-driven terminal control panel, not a list of CLI commands. The next milestone should be visibly usable: a user can run `picos`, move between panels, see system state, see project capability status, and understand which OS-changing actions are available or locked.

## Scope

This milestone keeps actual OS mutation disabled by default. It introduces the UI shell and action permission model needed for future controls.

## User Experience

- `picos` opens a full-screen TUI console by default.
- Number keys, arrow keys, and vim-style `h`/`j`/`k`/`l` navigation switch workspaces and action selection.
- The main workspaces include Dashboard, Interfaces, Network, Routes, Connections, Ports, Tools, Timeline, DNS, Actions, Status, and Logs.
- The layout has a top status bar, left workspace nav, main workspace, right inspector, and bottom event log.
- The Status panel shows version, supported platforms, v0.1.1 progress, and locked future controls.
- The Actions panel shows read/write/destructive actions with permission state and confirm requirements; read-only actions can run from the TUI.

## Architecture

- `core/actions.ts` defines OS action metadata: id, title, scope, risk, required privilege, enabled state, and confirmation phrase.
- `core/roadmap.ts` defines visible project progress for the Status panel.
- `tui/navigation.ts` owns pure keyboard navigation behavior so it can be tested without terminal rendering.
- `tui/App.tsx` remains the Ink shell and delegates content to focused screen components.
- CLI commands continue to call `core` APIs. TUI does not run write actions yet.

## Safety Model

Actions are grouped by risk:

- `read`: safe inspection.
- `write`: local state changes that need confirmation.
- `destructive`: actions with network/system impact, always disabled until explicit implementation.

Every future write action must support preview text, confirmation text, and privilege requirements before execution.

## Test Strategy

- Unit test navigation wraparound and direct number key mapping.
- Unit test action catalog risk/permission defaults.
- Keep existing config, network, ping, and doctor tests passing.
- Verify with `bun test`, `bunx tsc --noEmit`, `bun run lint`, and `bun run build`.
