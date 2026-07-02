# Result Jump Class Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Status result jump class filter through the command palette so operators can discover and cycle the same `^` flow without memorizing the key.

**Architecture:** Reuse the existing command palette action catalog and preview pipeline. Add one locked-read action id for cycling the result jump class filter, pass current filter/count metadata into palette previews, then route dispatch through the same Status state transition used by `^`.

**Tech Stack:** Bun test, TypeScript, Ink TUI, existing `core/actions.ts` and `tui/palette.ts` helpers.

---

### Task 1: Palette Action and Preview

**Files:**
- Modify: `tests/actions.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `src/core/actions.ts`
- Modify: `src/tui/palette.ts`

- [x] **Step 1: Write the failing tests**

Add assertions that:

```ts
getActionCatalog().some((action) => action.id === "status.resultJump.filter")
```

is true, that `result jump filter` and `jump class` searches include `status.resultJump.filter`, and that preview rows for the action include:

```txt
result jump class filter
current=process next=timeline
visible=1/4
dispatch=cycle Status ^ filter
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: FAIL because `status.resultJump.filter` and preview metadata do not exist yet.

- [x] **Step 3: Implement the minimal action and preview**

Add a `status.resultJump.filter` action near the existing Status result jump actions. Extend `CommandPalettePreviewContext` with current/next result jump class filter and visible/total counts, then render a compact preview for the new action.

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: PASS.

### Task 2: TUI Dispatch and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Wire palette dispatch**

In `runAction()`, dispatch `status.resultJump.filter` through `cycleStatusActivityResultTimelineJumpFilter({ origin: "palette" })` and include that callback in dependencies.

- [x] **Step 2: Pass preview context**

When rendering the command palette, pass the current filter, next filter, and filtered jump counts into `formatCommandPaletteActionPreviewRows()`.

- [x] **Step 3: Update docs**

Document v0.4.240, mention command palette searches for `result jump filter` / `jump class`, and keep README/CHANGELOG aligned with the user-visible shortcut.

- [x] **Step 4: Run full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands exit 0.
