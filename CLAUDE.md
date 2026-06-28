# Claude Code Guide

Claude should use `AGENTS.md` as the source of truth for this repository.

## Claude-Specific Notes

- Treat `picos` as a terminal OS product, not a generic CLI.
- Preserve the safety boundary around OS-changing actions.
- Do not bypass `src/utils/safeExec.ts` for process execution.
- Do not place OS-specific commands outside `src/adapters`.
- Keep OS inventory features read-only unless a write action has preview, confirmation, privilege metadata, and locked-by-default tests.
- Prefer `bun run verify` before final responses.

## Common Tasks

Run the app locally:

```bash
bun src/bin/picos.ts
```

Run the full harness:

```bash
bun run verify
```

Run a focused smoke check:

```bash
bun run smoke
```

## TUI Expectations

The app should remain keyboard-first:

- `1-9` selects the first nine workspaces.
- `left/right` and `h/l` move between panels.
- `j/k` moves through workspaces, or child action rows after explicit focus.
- `r` refreshes.
- `q` quits.

Avoid adding visible tutorial copy inside the primary dashboard unless it is part of the persistent footer or Status panel.
