# Remote Connect Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make locked remote connect confirmation attempts visible from Status Activity and recoverable through Timeline audit search.

**Architecture:** Reuse the existing Status Activity result/history model in `src/tui/statusActivityQueue.ts`, add a small pure formatter for `RemoteConnectConfirmation`, and record it from the Remotes `:remote-connect` submit path in `src/tui/App.tsx`. No SFTP transport package is imported and no network session is opened.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `tests/timelinePanel.test.ts`

- [x] **Step 1: Add Status Activity result expectations**

  Assert `createRemoteConnectStatusActivityResult(confirmation)` returns:

  ```txt
  source=timeline
  action=remote-connect
  message=remote connect confirmed-blocked prod prod.example.com:2222
  detail=target="sftp://deploy@prod.example.com:2222/srv/app" dependency=@uulab/picos-sftp reason=sftp-adapter-not-installed network=not-opened willExecute=false confirm="connect remote prod"
  ```

- [x] **Step 2: Add history and Timeline jump expectations**

  Assert `formatStatusActivityResultRows()`, `formatStatusActivityResultHistoryRows()`, and `createStatusActivityResultTimelineSearch()` surface the remote connect result and generate query `remote connect audit id=prod status=confirmed-blocked`.

- [x] **Step 3: Add Timeline search coverage**

  Assert `formatTimelineWorkspaceRows()` finds `formatRemoteConnectConfirmationAuditMessage(confirmation)` when searching `remote connect prod`.

- [x] **Step 4: Verify RED**

  Run `bun test tests/statusActivityQueue.test.ts tests/timelinePanel.test.ts` and confirm failure because the Status Activity helper and Timeline search behavior are not wired yet.

### Task 2: Implementation

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add remote-connect action type and helper**

  Add `remote-connect` to `StatusActivityEnterAction` and implement `createRemoteConnectStatusActivityResult(confirmation)`.

- [x] **Step 2: Add Timeline jump mapping**

  Extend `createStatusActivityResultTimelineSearch()` with `remote-connect` results and parse profile id/status from the result message.

- [x] **Step 3: Record result from Remotes prompt**

  In `submitRemoteConnectCommand`, call `recordStatusActivityResult(createRemoteConnectStatusActivityResult(confirmation))` after logging the audit message.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/statusActivityQueue.test.ts tests/timelinePanel.test.ts`, `bun run typecheck`, `bun run lint`, and `git diff --check`.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-connect-activity.md`

- [x] **Step 1: Document v0.4.274**

  Add README/CHANGELOG/ROADMAP notes for remote connect Status Activity result rows and Timeline audit recovery.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.273-remote-connect-preview`.
