# Host Key Scan Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the disabled host-key scan policy into operator-visible readiness checks so each future prerequisite can be inspected independently without enabling transport imports, sockets, host-key scans, trust writes, or mutation.

**Architecture:** Derive `RemoteHostKeyScanReadiness` rows from the existing `RemoteHostKeyScanPolicy`. Render them in `picos remote <id>` and the Remotes TUI immediately after `REMOTE HOST KEY SCAN POLICY`, with each check exposing status, dependency, blocker, required action, and blocked execution posture.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Readiness Rows

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteHostKeyScanReadiness()` and `formatRemoteHostKeyScanReadinessRows()` covering selected and empty SFTP profile states. Selected profiles must produce checks for `scanReview`, `transportInstalled`, `hostReview`, `knownHostsCompare`, and `fingerprintEvidence`, all with `status=blocked`, while transport has blocker `transport-missing`, fingerprint has blocker `fingerprint-unknown`, and every row keeps `willImport=false willConnect=false willScan=false willTrust=false willWriteKnownHosts=false willMutate=false`.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because readiness exports do not exist yet.

- [x] **Step 3: Implement core readiness**

Add `RemoteHostKeyScanReadinessCheck`, `RemoteHostKeyScanReadiness`, `createRemoteHostKeyScanReadiness()`, and `formatRemoteHostKeyScanReadinessRows()` near the scan policy helpers. Add readiness rows to `formatRemoteProviderStatus()` directly after policy rows.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Readiness Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render readiness rows**

Import readiness helpers, compute rows for the selected profile, and render a `HOST KEY SCAN READINESS` section after `HOST KEY SCAN POLICY`.

- [x] **Step 2: Preserve vertical budget and colors**

Increase the Remotes row reservation and color blocked/missing/unknown/false execution rows yellow.

- [x] **Step 3: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-scan-readiness.md`

- [x] **Step 1: Document v0.4.292**

Update README, CHANGELOG, and ROADMAP to describe `REMOTE HOST KEY SCAN READINESS`, individual prerequisite rows, blocked execution posture, and future transport-readiness direction.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.292-host-key-scan-readiness`, open a draft PR stacked on `codex/picos-v0.4.291-host-key-scan-policy`, then update ROADMAP and this plan with the PR link.

Result: draft PR [#362](https://github.com/uulab-official/picos/pull/362).
