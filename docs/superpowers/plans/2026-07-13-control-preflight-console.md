# Control Preflight Console

## Goal

Move closer to lazyifconfig-style OS controls by making locked mutation previews explain operational impact before any confirmation or dry-run attempt.

## Scope

- Add structured preflight rows to generic action preview plans.
- Cover DNS flush, interface disable, route add, service restart, process termination, and picos update apply.
- Render preflight rows inside Action Center preview blocks.
- Surface compact preflight rows in command-palette locked control previews.
- Preserve the existing disabled-by-default mutation model.
- Update README, CHANGELOG, and ROADMAP.

## Safety

- No new OS commands are added.
- No mutation is enabled.
- Existing exact-confirm prompts remain required.
- Dry-run execution still requires the existing `controlExecutionMode=dry-run` policy and adapter dry-run support.
- Preview-only macOS/Linux commands remain blocked from execution even after confirmation.

## Validation

- [x] `bun test tests/actions.test.ts tests/palette.test.ts tests/timelinePanel.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
