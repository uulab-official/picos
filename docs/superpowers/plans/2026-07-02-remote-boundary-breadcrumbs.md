# Remote Boundary Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing.

**Goal:** Make Remotes show a visible SFTP handoff boundary before Files receives a remote context, and make Files breadcrumbs preserve the remote provider authority for SFTP paths.

**Architecture:** Add pure formatting for remote handoff rows in `src/core/remotes.ts`, reuse it from `src/tui/App.tsx`, and teach `src/tui/fileSelection.ts` to parse URL-style provider prefixes before breadcrumb slicing. No network sessions or write paths are enabled.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/fileSelection.test.ts`
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Add SFTP breadcrumb expectation**

  Assert that `formatFileBreadcrumbRows()` preserves `sftp://user@host:port` as the prefix and counts only remote path segments.

- [x] **Step 2: Add Remotes handoff expectations**

  Assert that `formatRemoteHandoffBoundaryRows()` shows pre-stage and staged state with locked writes and no-session guidance.

- [x] **Step 3: Verify RED**

  Run focused tests and confirm they fail because SFTP paths are local-sliced and the handoff formatter does not exist.

### Task 2: Implementation

**Files:**
- Modify: `src/tui/fileSelection.ts`
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Parse remote breadcrumb prefixes**

  Detect URL-style provider roots, keep the authority as the breadcrumb prefix, and count only the provider path for depth.

- [x] **Step 2: Add remote handoff rows**

  Format selected SFTP profile handoff rows with computed root, staged state, locked writes, and no-network-session controls.

- [x] **Step 3: Render handoff rows**

  Replace the one-line Remotes selected-context summary with the shared handoff rows.

- [x] **Step 4: Verify GREEN**

  Run focused file selection and remotes tests plus typecheck.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-boundary-breadcrumbs.md`

- [x] **Step 1: Document v0.4.268**

  Record SFTP breadcrumb authority preservation and Remotes handoff boundary rows.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.267-files-provider-boundary`.
