# Endpoint Detail Section Shortcuts

## Goal

Continue lazyifconfig parity by making the Connections and Ports detail panes directly keyboard-addressable, matching the new Routes section shortcut behavior.

## Scope

- Add a pure endpoint detail shortcut mapper for `1`, `2`, `3`, Home, and End.
- Wire Connections focus to jump directly to detail, raw, or process panes.
- Wire Ports focus to jump directly to detail, raw, or process panes.
- Clear stale clipboard/control previews on direct jumps, matching existing Tab cycling behavior.
- Update footer help, README, CHANGELOG, and ROADMAP.

## Safety

- This is read-only TUI navigation.
- No OS commands are added.
- No privileged action is enabled.
- Existing endpoint copy/control previews remain locked.

## Validation

- [x] `bun test tests/endpointPanel.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
