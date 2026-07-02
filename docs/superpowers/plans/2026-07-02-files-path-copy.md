# Files Path Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make selected Files entries easy to inspect and reuse by showing selected path metadata and routing path copy through the existing locked clipboard flow.

**Architecture:** Add a small `src/tui/fileSelection.ts` model for selected entry rows and clipboard previews. Reuse `src/tui/clipboardPreview.ts` by adding a `file-path` source, and keep `src/tui/App.tsx` limited to keyboard wiring plus rendering those pure rows.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Selection Model

**Files:**
- Create: `src/tui/fileSelection.ts`
- Modify: `src/tui/clipboardPreview.ts`
- Test: `tests/fileSelection.test.ts`

- [x] **Step 1: Write the failing test**

  Add tests for `formatSelectedFilePathRows()` and `getSelectedFilePathClipboardPreview()` with a selected README file plus an empty selection.

- [x] **Step 2: Verify RED**

  Run `bun test tests/fileSelection.test.ts`. Expected: fail because `src/tui/fileSelection.ts` does not exist yet.

- [x] **Step 3: Implement selected path rows and preview**

  Add selected path formatting, `file-path` clipboard source support, and a locked clipboard preview with type, size, readonly, and path metadata.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/fileSelection.test.ts tests/clipboardPreview.test.ts`. Expected: pass.

### Task 2: TUI Wiring and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-files-path-copy.md`

- [x] **Step 1: Wire Files path copy**

  Import the selected path helpers, render selected path rows in compact and full Files layouts, and bind `y` in Files focus to `openClipboardConfirmation()`.

- [x] **Step 2: Update docs and roadmap**

  Record v0.4.265 and document `y` selected path copy plus visible selected path details.

- [x] **Step 3: Verify full slice**

  Run `bun test tests/fileSelection.test.ts tests/clipboardPreview.test.ts`, `bun run typecheck`, `bun run lint`, `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.264-files-forward-history`.
