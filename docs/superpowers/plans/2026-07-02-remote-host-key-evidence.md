# Remote Host Key Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static host-key fingerprint evidence rows before any future SFTP read adapter evaluation.

**Architecture:** `src/core/remotes.ts` owns the pure host-key evidence model and formatting rows. `formatRemoteProviderStatus()` and the Remotes TUI render the same rows between the file request preview and host review. The evidence stays static and locked: no adapter import, no socket, no remote read, no mutation.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Evidence Model

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Write the failing tests**

Add tests for `createRemoteHostKeyEvidence()` and `formatRemoteHostKeyEvidenceRows()` covering selected and empty profile states plus provider status inclusion.

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`

Expected: FAIL because the new exports do not exist.

- [x] **Step 3: Implement minimal core functions**

Add the `RemoteHostKeyEvidence` type and formatter in `src/core/remotes.ts`, then include rows in `formatRemoteProviderStatus()`.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`

Expected: PASS.

### Task 2: TUI Surface

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render host-key evidence in Remotes**

Import the new helpers, compute rows for the selected profile, and render a `HOST KEY EVIDENCE` section before `HOST REVIEW`.

- [x] **Step 2: Run focused checks**

Run: `bun test tests/remotes.test.ts && bun run typecheck && bun run lint && git diff --check`

Expected: all pass.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document v0.4.279**

Add README/CHANGELOG/ROADMAP notes describing host-key evidence, fingerprint unknown state, and no-network posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check && git diff --check`

Expected: all pass.

- [x] **Step 3: Commit, push, and open draft PR**

Commit message: `feat(remotes): add host key evidence`

Base branch: `codex/picos-v0.4.278-remote-file-request-preview`
