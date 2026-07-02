# Files Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep root and selected-entry filesystem context visible in Files, even when paths are deep or terminal height is tight.

**Architecture:** Extend `src/tui/fileSelection.ts` with pure breadcrumb formatting so path slicing is tested outside Ink. Render those rows in `src/tui/App.tsx` for compact and full Files layouts without changing file provider behavior or unsafe write posture.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Breadcrumb Model

**Files:**
- Modify: `src/tui/fileSelection.ts`
- Test: `tests/fileSelection.test.ts`

- [x] **Step 1: Write the failing test**

  Add expectations for `formatFileBreadcrumbRows()` to show sliced root and selected-entry breadcrumbs, plus a useful empty selection state.

- [x] **Step 2: Verify RED**

  Run `bun test tests/fileSelection.test.ts`. Expected: fail because `formatFileBreadcrumbRows()` is not exported yet.

- [x] **Step 3: Implement breadcrumb slicing**

  Split paths into segments, preserve `/` or drive prefixes, slice long paths with `...`, and return root/selected/control rows.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/fileSelection.test.ts`. Expected: pass.

### Task 2: Files Rendering and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-files-breadcrumbs.md`

- [x] **Step 1: Render breadcrumb rows**

  Import `formatFileBreadcrumbRows()`, render compact breadcrumb rows in short layouts, and render the full breadcrumb block above system locations in normal layouts.

- [x] **Step 2: Update docs and roadmap**

  Record v0.4.266 and document visible root/selected breadcrumbs.

- [x] **Step 3: Verify full slice**

  Run `bun test tests/fileSelection.test.ts`, `bun run typecheck`, `bun run lint`, `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.265-files-path-copy`.
