# SFTP Review Readiness Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let injected found SFTP package resolution review metadata satisfy the transport readiness prerequisite without importing transport code, reading package files, opening sockets, starting sessions, trusting hosts, writing `known_hosts`, or mutating anything.

**Architecture:** Extend `createRemoteSftpTransportReadiness()` in `src/core/remotes.ts` to accept an optional `RemoteSftpPackageResolutionReview`. A found review maps to installed readiness with source `injected`; missing/default review data keeps readiness blocked. Host-key scan readiness already consumes transport readiness, so tests can prove found package metadata marks only `transportInstalled` ready while execution flags stay false.

**Tech Stack:** Bun, TypeScript, Bun test, Biome.

---

### Task 1: Core Readiness Bridge

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests showing `createRemoteSftpTransportReadiness({ packageReview: foundReview })` returns installed readiness with blocker `none`, source `injected`, and all execution flags false. Add a second assertion that passing this readiness into `createRemoteHostKeyScanReadiness()` marks only `transportInstalled` ready while scan/import/socket/trust/write/mutation flags remain false. Also assert a missing review keeps transport readiness missing.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because `createRemoteSftpTransportReadiness()` does not accept `packageReview` yet.

Result: FAIL because `packageReview` was ignored and missing review still reported `source=not-run`.

- [x] **Step 3: Implement bridge**

Update the transport readiness options type to include `packageReview?: RemoteSftpPackageResolutionReview` and set installed when `packagePresent === true` or `packageReview.status === "found"`.

- [x] **Step 4: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

Result: PASS with `bun test tests/remotes.test.ts` (`53 pass`, `0 fail`), `bun run typecheck`, and `bun run lint`.

### Task 2: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-sftp-review-readiness-bridge.md`

- [x] **Step 1: Document v0.4.296**

Update README, CHANGELOG, and ROADMAP to describe that injected found package review metadata can satisfy transport readiness while resolver execution, package reads, imports, sockets, sessions, trust writes, and mutation remain disabled.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

Result: PASS on 2026-07-02 with `bun run verify` (`651 pass`, `0 fail`, plus typecheck/build/smoke), `bun run release:check`, and `git diff --check`.

- [ ] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.296-sftp-review-readiness-bridge`, open a draft PR stacked on `codex/picos-v0.4.295-sftp-package-resolution-review`, then update ROADMAP and this plan with the PR link.
