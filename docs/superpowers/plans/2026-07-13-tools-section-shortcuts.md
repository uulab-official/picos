# Tools Detail Section Shortcuts

## Goal

Continue lazyifconfig-style panel ergonomics by making Tools Hub history detail panes directly keyboard-addressable.

## Scope

- Add a pure Tools detail shortcut mapper for `1`, `2`, `3`, `4`, Home, and End.
- Wire Tools focus to jump directly to raw, summary, command, or compare detail panes.
- Persist direct detail jumps through the existing Tools history preference store.
- Clear stale Tools copy previews on direct jumps, matching existing Tab cycling behavior.
- Update footer help, README, CHANGELOG, and ROADMAP.

## Safety

- This is read-only TUI navigation and config preference persistence.
- No OS commands are added.
- No privileged action is enabled.
- Existing Tools copy/export/cleanup confirmations remain locked.

## Validation

- [x] `bun test tests/toolHistory.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
