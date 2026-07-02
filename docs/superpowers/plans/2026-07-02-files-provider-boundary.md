# Files Provider Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active Files provider boundary visible for local and SFTP-ready contexts before operators navigate, preview, copy, or plan writes.

**Architecture:** Extend `src/tui/fileSelection.ts` with pure provider-boundary row formatting that accepts a local root and optional `RemoteFileContext`. Render those rows from `src/tui/App.tsx` in compact and full Files layouts without changing provider execution, SFTP placeholder behavior, or locked write policy.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Provider Boundary Model

**Files:**
- Modify: `src/tui/fileSelection.ts`
- Test: `tests/fileSelection.test.ts`

- [x] **Step 1: Write the failing test**

  Add expectations for `formatFileProviderBoundaryRows()` for a local root and an SFTP `RemoteFileContext`.

- [x] **Step 2: Verify RED**

  Run `bun test tests/fileSelection.test.ts`. Expected: fail because `formatFileProviderBoundaryRows()` is not exported yet.

- [x] **Step 3: Implement boundary rows**

  Return `PROVIDER BOUNDARY local` rows for local Files and `PROVIDER BOUNDARY sftp <label>` rows for remote contexts, preserving locked write posture and safe controls.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/fileSelection.test.ts`. Expected: pass.

### Task 2: Files Rendering and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-files-provider-boundary.md`

- [x] **Step 1: Render boundary rows**

  Import `formatFileProviderBoundaryRows()`, replace ad hoc local/remote provider text with boundary rows, and render compact rows in short layouts.

- [x] **Step 2: Update docs and roadmap**

  Record v0.4.267 and document local/SFTP provider boundary visibility.

- [x] **Step 3: Verify full slice**

  Run `bun test tests/fileSelection.test.ts`, `bun run typecheck`, `bun run lint`, `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.266-files-breadcrumbs`.
