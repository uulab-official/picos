# Config Jump Class Palette Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators search the command palette for jump-class configuration and land directly on the Config workspace row that controls `statusResultJumpClassFilter`.

**Architecture:** Add a read-only command palette action that focuses Config rather than mutating OS state. Introduce a small pure helper for finding a Config item by key, use it in App dispatch to set `screen="config"` and select the exact row, and add preview rows that show the current value and `+/-` behavior.

**Tech Stack:** Bun test, TypeScript, existing action catalog, command palette preview, Config workspace model.

---

### Task 1: Action and Preview

**Files:**
- Modify: `tests/actions.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `src/core/actions.ts`
- Modify: `src/tui/palette.ts`

- [x] **Step 1: Write failing tests**

Assert `config.statusResultJumpClass.focus` appears in the enabled action catalog, matches palette queries `jump class config` and `status jump config`, and previews:

```txt
config target=statusResultJumpClassFilter
current=process
section=display action=focus Config row
controls=+/- cycle all/process/timeline/tools/source
```

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: FAIL because the action and preview do not exist.

- [x] **Step 3: Implement minimal action/preview**

Add the action to the catalog near `config.show`, extend `CommandPalettePreviewContext` with the current status jump class config value, and render compact preview rows.

- [x] **Step 4: Run tests to verify GREEN**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: PASS.

### Task 2: Config Row Focus

**Files:**
- Modify: `tests/configPanel.test.ts`
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Write failing helper test**

Add a pure helper expectation:

```ts
getConfigWorkspaceItemIndex(items, "statusResultJumpClassFilter") === 4
```

- [x] **Step 2: Implement helper and App dispatch**

Implement `getConfigWorkspaceItemIndex()` and in `runAction()` route `config.statusResultJumpClass.focus` to Config, set focus area to workspaces, select the returned row, and log a concise focus message.

- [x] **Step 3: Run focused verification**

Run:

```bash
bun test tests/configPanel.test.ts tests/actions.test.ts tests/palette.test.ts
bun run typecheck
bun run lint
```

Expected: all pass.

### Task 3: Docs and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Update docs**

Document v0.4.243 and mention `jump class config` palette discovery.

- [x] **Step 2: Run full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands exit 0.
