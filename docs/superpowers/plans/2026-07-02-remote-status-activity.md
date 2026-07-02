# Remote Status Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing.

**Goal:** Make staged remote intent visible from Status Activity result/history rows, with a Timeline jump back to the matching remote host review audit.

**Architecture:** Add a pure Status Activity result factory in `src/tui/statusActivityQueue.ts`, wire it into Remotes staging in `src/tui/App.tsx`, and map the result to `createStatusActivityResultTimelineSearch()`. No network session or write path is enabled.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Add Status result expectations**

  Assert that staged remote profiles produce `remote-host-review` Status Activity result rows and history rows with target, host, policy, and confirmation context.

- [x] **Step 2: Add Timeline jump expectation**

  Assert that remote-host-review Status results create a Timeline audit search for `remote host review audit action=stage id=<profile>`.

- [x] **Step 3: Verify RED**

  Run focused Status Activity tests and confirm they fail because `createRemoteHostReviewStatusActivityResult()` is not exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement result factory**

  Create a secret-free remote-host-review Status Activity result from an SFTP profile.

- [x] **Step 2: Add Timeline search mapping**

  Map remote-host-review results back to the matching Timeline audit query.

- [x] **Step 3: Record result on stage**

  Append the result when Remotes stages a profile for Files.

- [x] **Step 4: Verify GREEN**

  Run focused Status Activity tests and typecheck.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-status-activity.md`

- [x] **Step 1: Document v0.4.271**

  Record Status Activity visibility for staged remote host review intent.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.270-remote-host-audit`.
