# v0.4.320 Interface Proposal Palette Plan

## Goal

Make locked interface state proposals reachable from the command palette so operators can search for `interface proposal disable` or `interface proposal enable` and land in the same Interfaces proposal flow as the direct `D`/`U` shortcuts.

## Scope

- Add read-only palette actions that open locked interface proposal previews.
- Keep the actual interface enable/disable mutation action locked and disabled.
- Show selected adapter metadata, write/admin risk, confirmation phrase, preflight, rollback, and execution-disabled rows in palette preview.
- Dispatch palette enter into the Interfaces workspace with the selected adapter proposal opened.
- Update README, CHANGELOG, ROADMAP, and tests.

## Safety

- No adapter command execution is added.
- No privileged command is added.
- Proposal rows stay `enabled=false`.
- Palette actions are read-only openers for a locked proposal, not mutation controls.

## Validation

- [x] `bun test tests/palette.test.ts tests/actions.test.ts tests/interfaceControl.test.ts tests/interfacePanel.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `git diff --check`
- [x] `bun run verify`
- [x] `bun run release:check`
