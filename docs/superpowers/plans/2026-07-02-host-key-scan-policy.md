# Host Key Scan Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a disabled-by-default host-key scan execution policy that makes future transport prerequisites visible before picos can import SFTP, open sockets, scan host keys, trust hosts, write known_hosts, or mutate anything.

**Architecture:** Extend the pure Remotes core model with a `RemoteHostKeyScanPolicy` derived from the existing scan request. Render policy rows in `picos remote <id>` and Remotes TUI immediately after `REMOTE HOST KEY SCAN REQUEST`, preserving all execution flags as blocked until a future adapter policy is explicitly enabled.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Scan Policy Rows

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteHostKeyScanPolicy()` and `formatRemoteHostKeyScanPolicyRows()` covering a selected profile and empty profile. The selected profile must expose policy `disabled`, mode `preview-only`, dependency `@uulab/picos-sftp`, prerequisites `scanReview, transportInstalled, hostReview, knownHostsCompare`, blockers `policy-disabled, transport-missing, fingerprint-unknown`, confirm `scan host key prod`, and execution flags `willImport=false willConnect=false willScan=false willTrust=false willWriteKnownHosts=false willMutate=false`.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because scan policy exports do not exist yet.

- [x] **Step 3: Implement core policy**

Add `RemoteHostKeyScanPolicy`, `createRemoteHostKeyScanPolicy()`, and `formatRemoteHostKeyScanPolicyRows()` near the scan request helpers. Add policy rows to `formatRemoteProviderStatus()` directly after scan request rows.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Policy Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render scan policy**

Import scan policy helpers, compute rows from the selected profile, and render a `HOST KEY SCAN POLICY` section after `HOST KEY SCAN REQUEST`.

- [x] **Step 2: Preserve vertical budget and colors**

Increase the Remotes row reservation and color disabled, blocked, missing, unknown, and false execution rows yellow.

- [x] **Step 3: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-scan-policy.md`

- [x] **Step 1: Document v0.4.291**

Update README, CHANGELOG, and ROADMAP to describe `REMOTE HOST KEY SCAN POLICY`, disabled-by-default posture, prerequisites, blockers, and future adapter policy direction.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.291-host-key-scan-policy`, open a draft PR stacked on `codex/picos-v0.4.290-host-key-scan-review`, then update ROADMAP and this plan with the PR link.

Result: draft PR [#359](https://github.com/uulab-official/picos/pull/359).
