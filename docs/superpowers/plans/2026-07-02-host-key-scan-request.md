# Host Key Scan Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked host-key scan request preview before any transport scan can collect remote fingerprint evidence.

**Architecture:** Model scan request as pure metadata in `src/core/remotes.ts`, then render it in `picos remote <id>` and the Remotes TUI between `REMOTE HOST KEY EVIDENCE` and `REMOTE KNOWN_HOSTS SOURCE`. The request shows target, dependency, exact confirmation, evidence output placeholder, and all execution flags as false.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Scan Request Preview

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for `createRemoteHostKeyScanRequest()` and `formatRemoteHostKeyScanRequestRows()` covering selected and empty profiles, blocked status, exact `scan host key <id>` confirmation, and no-import/no-connect/no-scan/no-trust/no-mutation posture.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because scan request exports do not exist yet.

- [x] **Step 3: Implement core model**

Add `RemoteHostKeyScanRequest`, create helper, formatter rows, and provider status rows between host-key evidence and known_hosts source.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render scan request**

Import scan request helpers, compute rows for the selected profile, and render `HOST KEY SCAN REQUEST` after `HOST KEY EVIDENCE`.

- [x] **Step 2: Preserve row budget**

Increase Remotes workspace row reservation for the new section.

- [x] **Step 3: Run focused checks**

Run: `bun run typecheck`, `bun run lint`, and `bun test tests/remotes.test.ts`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-scan-request.md`

- [x] **Step 1: Document v0.4.289**

Update README, CHANGELOG, and ROADMAP to describe the locked host-key scan request and next step.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [ ] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.289-host-key-scan-request`, open a draft PR stacked on `codex/picos-v0.4.288-host-key-candidate-compare`, then update ROADMAP and this plan with the PR link.
