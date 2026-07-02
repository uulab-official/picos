# Remote Adapter Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing.

**Goal:** Make the future SFTP transport boundary visible before picos can open any remote network session.

**Architecture:** Add a pure Remotes formatter for adapter dependency/readiness rows in `src/core/remotes.ts`, render it through the existing CLI/TUI Remotes surfaces, and keep the SFTP provider placeholder locked. No transport package is imported and no network session is opened.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Add adapter boundary expectations**

  Assert that a selected SFTP profile formats `REMOTE ADAPTER BOUNDARY` rows with transport, dependency, host key, auth, session, read, write, and confirmation posture.

- [x] **Step 2: Add empty-state expectations**

  Assert that no selected profile still renders useful boundary rows without pretending a network target exists.

- [x] **Step 3: Verify RED**

  Run focused Remotes tests and confirm they fail because `formatRemoteAdapterBoundaryRows()` is not exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement adapter boundary formatter**

  Create a secret-free `formatRemoteAdapterBoundaryRows()` function that describes the locked SFTP dependency boundary.

- [x] **Step 2: Surface rows in CLI and TUI**

  Include adapter boundary rows in `formatRemoteProviderStatus()` and the Remotes workspace layout.

- [x] **Step 3: Verify GREEN**

  Run focused Remotes tests and typecheck.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-adapter-boundary.md`

- [x] **Step 1: Document v0.4.272**

  Record the locked SFTP adapter dependency boundary in user docs and roadmap.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.271-remote-status-activity`.
