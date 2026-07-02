# SFTP Package Resolution Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record injected optional SFTP package resolution found/missing metadata as an operator-visible review result without running a resolver, reading package files, importing transport code, opening sockets, starting sessions, trusting hosts, writing `known_hosts`, or mutating anything.

**Architecture:** Extend `src/core/remotes.ts` with a pure `RemoteSftpPackageResolutionReview` object that consumes the existing package resolution preview plus injected result metadata. Render review rows in `picos remote <id>` and the Remotes TUI after package resolution preview. Keep execution flags false so review output is evidence, not execution.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Resolution Review Result

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteSftpPackageResolutionReview()` and `formatRemoteSftpPackageResolutionReviewRows()` covering default missing and injected found states. Missing rows must show `REMOTE SFTP PACKAGE RESOLUTION REVIEW`, dependency `@uulab/picos-sftp`, detector `injected-resolution-result`, status `missing`, blocker `package-not-found`, matched lookup `-`, and all execution flags false. Found rows must show resolved package path, package JSON path, version, matched lookup index, blocker `none`, and still keep resolver/package-read/import/connect/mutate false.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because resolution review exports do not exist yet.

Result: FAIL because `createRemoteSftpPackageResolutionReview` was not exported yet.

- [x] **Step 3: Implement core review result**

Add `RemoteSftpPackageResolutionReview`, `createRemoteSftpPackageResolutionReview()`, and `formatRemoteSftpPackageResolutionReviewRows()`. Add review rows to `formatRemoteProviderStatus()` after package resolution preview rows.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

Result: PASS with `bun test tests/remotes.test.ts` (`52 pass`, `0 fail`).

### Task 2: Remotes TUI Review Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render review rows**

Import resolution review helpers, compute default review rows from the preview, and render a `SFTP PACKAGE REVIEW` section after `SFTP PACKAGE RESOLUTION`.

- [x] **Step 2: Preserve vertical budget and colors**

Increase the Remotes row reservation and color missing/package-not-found/false rows yellow, found rows green, and headers cyan.

- [x] **Step 3: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

Result: PASS with `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-sftp-package-resolution-review.md`

- [x] **Step 1: Document v0.4.295**

Update README, CHANGELOG, and ROADMAP to describe `REMOTE SFTP PACKAGE RESOLUTION REVIEW`, injected found/missing metadata, matched lookup index, and continued no-resolver/no-read/no-import/no-connect/no-mutate posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

Result: PASS on 2026-07-02 with `bun run verify` (`650 pass`, `0 fail`, plus typecheck/build/smoke), `bun run release:check`, and `git diff --check`.

- [ ] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.295-sftp-package-resolution-review`, open a draft PR stacked on `codex/picos-v0.4.294-sftp-package-resolution-preview`, then update ROADMAP and this plan with the PR link.
