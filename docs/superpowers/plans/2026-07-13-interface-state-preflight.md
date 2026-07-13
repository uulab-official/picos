# Interface State Proposal Preflight

## Goal

Give Interfaces the same target-aware locked control proposal loop now available in DNS.

## Scope

- Add a pure interface state proposal model for enable/disable intents.
- Distinguish ready, noop, and invalid proposal states.
- Render selected adapter metadata, current/desired state, risk, privilege, confirmation phrase, preflight, rollback, and disabled-execution rows.
- Add Interfaces controls for `D` disable proposal, `U` enable proposal, and `C` clear.
- Clear stale interface state proposals when the selected interface changes.
- Update README, CHANGELOG, and ROADMAP.

## Safety

- No interface command is executed.
- No platform adapter mutation is added.
- The proposal action stays `enabled=false`.
- Key handling only changes local TUI proposal state.
- Preflight rows explicitly state `execution=disabled`.

## Validation

- [x] `bun test tests/interfaceControl.test.ts tests/interfacePanel.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
