# Remote Host Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing.

**Goal:** Add a visible host-review contract for SFTP profiles before picos can ever open a live remote session.

**Architecture:** Add pure host-review row formatting in `src/core/remotes.ts`, render the rows from `src/tui/App.tsx`, and include them in `picos remote <id>` output through `formatRemoteProviderStatus()`. No network session or write path is enabled.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Add host review expectations**

  Assert that `formatRemoteHostReviewRows()` includes target URI, identity, key presence, read-only policy, locked writes, no-network posture, and an exact future confirmation phrase.

- [x] **Step 2: Add CLI status coverage**

  Assert that `formatRemoteProviderStatus()` includes the host review rows without opening a network session.

- [x] **Step 3: Verify RED**

  Run `bun test tests/remotes.test.ts`. Expected: fail because `formatRemoteHostReviewRows()` is not exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement host review rows**

  Format selected and empty profile states without exposing secrets or opening sessions.

- [x] **Step 2: Render host review rows**

  Show the host review block in Remotes under the selected handoff context.

- [x] **Step 3: Keep CLI aligned**

  Append host review rows to `picos remote <id>` status output.

- [x] **Step 4: Verify GREEN**

  Run focused remotes tests and typecheck.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-host-review.md`

- [x] **Step 1: Document v0.4.269**

  Record host review rows and the no-network-session posture.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.268-remote-boundary-breadcrumbs`.
