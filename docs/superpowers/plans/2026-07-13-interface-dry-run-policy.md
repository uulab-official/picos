# v0.4.323 Interface Dry-Run Policy Plan

## Goal

Show explicit dry-run policy preview rows inside locked interface enable/disable proposals without enabling execution.

## Scope

- Add an interface dry-run preview model.
- Mark Windows `Get-NetAdapter` proposal commands as adapter dry-run available because previews use `-WhatIf`.
- Mark Linux `ip link` and macOS `networksetup` proposal commands as adapter dry-run unavailable.
- Keep every interface proposal blocked by `proposal-only` policy and mutation disabled blockers.
- Show dry-run status, policy, command, reason, and blockers in workspace and command-palette previews.
- Update README, CHANGELOG, ROADMAP, and tests.

## Safety

- No interface mutation command is executed.
- No dry-run execution is enabled.
- Proposals remain locked with `enabled=false`.
- The model only exposes the future execution policy surface and blockers.

## Validation

- [x] `bun test tests/interfaceControl.test.ts tests/interfacePanel.test.ts tests/palette.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `git diff --check`
- [x] `bun run verify`
- [x] `bun run release:check`
