# DNS Target Preflight

## Goal

Make DNS edit proposals target-aware so the operator can see which system/interface resolver surface would be affected before any mutation exists.

## Scope

- Add a DNS proposal target model for system resolver fallback and selected local interfaces.
- Render target label, scope, selected index, status, kind, primary marker, platform, and addresses in the DNS workspace.
- Let `T` cycle the DNS proposal target across local interfaces.
- Clear stale DNS proposal previews when the target changes.
- Include target metadata in submitted DNS proposal rows and preflight rows.
- Update README, CHANGELOG, and ROADMAP.

## Safety

- No DNS command is executed.
- No platform adapter mutation is added.
- The proposal action stays `enabled=false`.
- Target switching only changes local TUI proposal state.
- Preflight rows continue to state `execution=disabled`.

## Validation

- [x] `bun test tests/dnsControl.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
