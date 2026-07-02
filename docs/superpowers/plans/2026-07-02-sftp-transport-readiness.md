# SFTP Transport Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transport dependency readiness detector that reports whether the future SFTP package appears installed without importing it, opening sockets, starting sessions, trusting hosts, writing `known_hosts`, or mutating anything.

**Architecture:** Model dependency detection as pure metadata in `src/core/remotes.ts`, driven by an injectable package presence flag for tests and future package-resolution plumbing. Render detector rows in `picos remote <id>` and Remotes TUI after host-key scan readiness, and feed its status into readiness rows without enabling execution.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Transport Readiness Detector

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteSftpTransportReadiness()` and `formatRemoteSftpTransportReadinessRows()` covering default missing and injected installed states. Default rows must show `REMOTE SFTP TRANSPORT READINESS`, dependency `@uulab/picos-sftp`, detector `package-resolution`, status `missing`, import/session/network `not-run`, blocker `transport-missing`, and execution flags `willResolve=false willImport=false willConnect=false willMutate=false`. Injected installed rows must show status `installed`, blocker `none`, and still keep import/connect/mutate false.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because transport readiness exports do not exist yet.

- [x] **Step 3: Implement core detector**

Add `RemoteSftpTransportReadiness`, `createRemoteSftpTransportReadiness()`, and `formatRemoteSftpTransportReadinessRows()`. Add detector rows to `formatRemoteProviderStatus()` after host-key scan readiness rows.

- [x] **Step 4: Feed readiness checks**

Update `createRemoteHostKeyScanReadiness()` to accept optional transport readiness and make the `transportInstalled` check `ready` when injected readiness is installed while keeping every execution flag false.

- [x] **Step 5: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Detector Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render detector rows**

Import transport readiness helpers, compute default readiness rows, pass readiness into host-key scan readiness, and render a `SFTP TRANSPORT READINESS` section after `HOST KEY SCAN READINESS`.

- [x] **Step 2: Preserve vertical budget and colors**

Increase the Remotes row reservation and color missing/blocked/not-run/false rows yellow, installed rows green.

- [x] **Step 3: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-sftp-transport-readiness.md`

- [x] **Step 1: Document v0.4.293**

Update README, CHANGELOG, and ROADMAP to describe `REMOTE SFTP TRANSPORT READINESS`, no-import detection posture, injected installed state for future package resolution, and continued socket/session lock.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

Result: PASS on 2026-07-02 with `bun run verify` (`646 pass`, `0 fail`, plus typecheck/build/smoke), `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.293-sftp-transport-readiness`, open a draft PR stacked on `codex/picos-v0.4.292-host-key-scan-readiness`, then update ROADMAP and this plan with the PR link.

Result: Draft PR [#364](https://github.com/uulab-official/picos/pull/364) opened on 2026-07-02, stacked on `codex/picos-v0.4.292-host-key-scan-readiness`.
