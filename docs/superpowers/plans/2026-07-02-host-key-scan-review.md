# Host Key Scan Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked host-key scan review confirmation path that records confirmed-blocked/rejected scan intent without importing SFTP transport, opening sockets, scanning host keys, trusting hosts, or mutating anything.

**Architecture:** Extend the pure remote scan request model in `src/core/remotes.ts` with a confirmation result and audit formatter. Surface the result in Status Activity with Timeline recovery search, then wire Remotes TUI key handling and command prompt to record the blocked scan review.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Scan Review Confirmation

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add a test that imports `submitRemoteHostKeyScanReview()` and `formatRemoteHostKeyScanReviewAuditMessage()`, creates a `createRemoteHostKeyScanRequest(profile)`, and expects exact confirmation `scan host key prod` to return:

```ts
{
  request,
  status: "confirmed-blocked",
  input: "scan host key prod",
  networkOpened: false,
  hostKeyScanned: false,
  trustApplied: false,
  knownHostsWritten: false,
  message: "remote host key scan review blocked prod sftp://deploy@prod.example.com:2222/srv/app"
}
```

Also assert the audit line contains `remote host key scan review audit`, `status=confirmed-blocked`, `network=not-opened`, `scan=not-run`, `trust=not-applied`, `knownHostsWrite=false`, and `confirm="scan host key prod"`. Add a rejected assertion for bad input.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because scan review exports do not exist yet.

- [x] **Step 3: Implement core model**

Add `RemoteHostKeyScanReviewConfirmation`, `submitRemoteHostKeyScanReview()`, and `formatRemoteHostKeyScanReviewAuditMessage()` near the existing host trust review helpers. The helper must trim input, mark exact matches as `confirmed-blocked`, and keep every execution/mutation flag false.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Status Activity and TUI Wiring

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`
- Test: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Write the failing Status Activity test**

Add a test for `createRemoteHostKeyScanReviewStatusActivityResult()` that expects action `remote-host-key-scan-review`, message `remote host key scan review confirmed-blocked prod prod.example.com:2222`, detail rows with target, dependency, evidence output, `network=not-opened`, `scan=not-run`, `trust=not-applied`, `knownHostsWrite=false`, and Timeline search query `remote host key scan review audit id=prod status=confirmed-blocked`.

- [x] **Step 2: Verify red state**

Run: `bun test tests/statusActivityQueue.test.ts`
Expected: FAIL because the Status Activity helper and action do not exist yet.

- [x] **Step 3: Implement Status Activity**

Import `RemoteHostKeyScanReviewConfirmation`, add the `remote-host-key-scan-review` action, add result creation, include it in remote activity shelf filtering and compact labels, and add Timeline search recovery for its audit rows.

- [x] **Step 4: Wire Remotes TUI**

Import scan review submit/audit/status helpers in `src/tui/App.tsx`. Add `remote-host-scan` command prompt, `s` key in Remotes focus, submit handler, cancellation text, prompt rendering under `HOST KEY SCAN REQUEST`, and update Remotes help/controls to show `s scan`.

- [x] **Step 5: Run focused checks**

Run: `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-scan-review.md`

- [x] **Step 1: Document v0.4.290**

Update README, CHANGELOG, and ROADMAP to describe the blocked scan review flow, `s` key, audit result, and Timeline recovery.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.290-host-key-scan-review`, open a draft PR stacked on `codex/picos-v0.4.289-host-key-scan-request`, then update ROADMAP and this plan with the PR link.

Result: draft PR [#358](https://github.com/uulab-official/picos/pull/358).
