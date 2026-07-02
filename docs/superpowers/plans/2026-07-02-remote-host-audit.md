# Remote Host Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing.

**Goal:** Make remote profile staging leave searchable Timeline audit evidence before picos can open any live SFTP session.

**Architecture:** Add a pure audit-message formatter in `src/core/remotes.ts`, emit that message from the Remotes stage path in `src/tui/App.tsx`, and verify Timeline audit filtering/search can surface it. No network session or write path is enabled.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `tests/timelinePanel.test.ts`

- [x] **Step 1: Add remote audit formatter expectations**

  Assert that `formatRemoteHostReviewAuditMessage()` includes action, id, target, host, port, user, key presence, read-only policy, locked writes, no-network posture, and exact future confirmation text.

- [x] **Step 2: Add Timeline search expectation**

  Assert that remote host review audit events appear under Timeline `audit` filtering and can be searched by profile/host-review terms.

- [x] **Step 3: Verify RED**

  Run focused tests and confirm they fail because the audit formatter is not exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement audit formatter**

  Generate a structured, quoted, secret-free audit message without opening a session.

- [x] **Step 2: Emit audit on stage**

  Log the audit message when a selected remote profile is staged for Files.

- [x] **Step 3: Verify GREEN**

  Run focused remotes/timeline tests and typecheck.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-host-audit.md`

- [x] **Step 1: Document v0.4.270**

  Record searchable remote host review Timeline audit evidence.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.269-remote-host-review`.
