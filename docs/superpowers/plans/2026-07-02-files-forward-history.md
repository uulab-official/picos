# Files Forward History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Files navigation feel like an OS file manager by adding a forward stack alongside the existing back stack.

**Architecture:** Keep the navigation stack behavior in `src/tui/fileHistory.ts` so it remains tested without Ink. Wire `src/tui/App.tsx` to keep `fileForwardHistory`, move current roots between stacks on `b`/`B`, clear forward history on fresh navigation, and expose counts in the Files workspace UI.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: History Model

**Files:**
- Modify: `src/tui/fileHistory.ts`
- Test: `tests/fileHistory.test.ts`

- [x] **Step 1: Write the failing test**

  Add tests for a back action that moves the current root into forward history, a forward action that restores it, and an empty forward stack result.

- [x] **Step 2: Verify RED**

  Run `bun test tests/fileHistory.test.ts`. Expected: fail because `pushFileForwardHistory()` and `popFileForwardHistory()` are not exported yet.

- [x] **Step 3: Implement forward stack helpers**

  Add `pushFileForwardHistory()` and `popFileForwardHistory()` using the same unique-stack behavior as the existing back history helpers.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/fileHistory.test.ts`. Expected: pass.

### Task 2: TUI Wiring

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-files-forward-history.md`

- [x] **Step 1: Add forward history state**

  Add `fileForwardHistory` state, clear it on fresh Files navigation, and move roots between back/forward stacks for `b` and `B`.

- [x] **Step 2: Expose the shortcut and counts**

  Add `B` key handling and show `history back=... forward=...` plus `b/B history` rows in compact and full Files layouts.

- [x] **Step 3: Verify full slice**

  Run `bun test tests/fileHistory.test.ts`, `bun run typecheck`, `bun run lint`, `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.263-tools-field-help-strip`.
