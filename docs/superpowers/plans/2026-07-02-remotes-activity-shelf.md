# Remotes Activity Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make recent remote stage/connect intent visible directly inside the Remotes workspace, not only from Status Activity or Timeline.

**Architecture:** Reuse the existing Status Activity result history as the authoritative event stream. Add a pure formatter in `src/tui/statusActivityQueue.ts` that extracts `remote-host-review` and `remote-connect` results into compact Remotes shelf rows, then pass those rows into `RemotesWorkspace` in `src/tui/App.tsx`. No transport package is imported and no network socket is opened.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Add Remotes shelf formatter expectations**

  Assert `formatRemoteActivityShelfRows()` returns an empty useful state when no remote activity exists:

  ```txt
  REMOTE ACTIVITY recent=0 selected=none
  no remote activity recorded yet
  controls=enter stage · c connect preview · Status I timeline recovery
  ```

  Assert mixed history rows keep only remote activity and newest-first context:

  ```txt
  REMOTE ACTIVITY recent=2 selected=prod
  > connect confirmed-blocked prod prod.example.com:2222
    target="sftp://deploy@prod.example.com:2222/srv/app" dependency=@uulab/picos-sftp reason=sftp-adapter-not-installed network=not-opened willExecute=false confirm="connect remote prod"
    stage prod prod.example.com:2222
    target="sftp://deploy@prod.example.com:2222/srv/app" user=deploy key=configured policy=read-only writes=locked network=not-opened confirm="connect remote prod"
  controls=enter stage · c connect preview · Status I timeline recovery
  ```

- [x] **Step 2: Verify RED**

  Run `bun test tests/statusActivityQueue.test.ts` and confirm failure because `formatRemoteActivityShelfRows()` is not implemented/exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement pure shelf formatter**

  Add `formatRemoteActivityShelfRows(history, options)` that:

  - filters `StatusActivityResult` rows where `action` is `remote-connect` or `remote-host-review`
  - limits rows to recent remote activity
  - marks the first row that matches the selected profile id, falling back to the newest row
  - preserves the existing detail string so target, dependency, policy, and no-network posture remain visible

- [x] **Step 2: Render shelf in Remotes**

  Import and call `formatRemoteActivityShelfRows(statusActivityResults, { selectedProfileId })` from `RemotesWorkspace`, rendering a `RECENT ACTIVITY` section above the selected context.

- [x] **Step 3: Verify GREEN**

  Run `bun test tests/statusActivityQueue.test.ts`, `bun run typecheck`, `bun run lint`, and `git diff --check`.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remotes-activity-shelf.md`

- [x] **Step 1: Document v0.4.275**

  Add README/CHANGELOG/ROADMAP notes for the Remotes recent activity shelf and explain that it is derived from Status Activity without opening transport.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.274-remote-connect-activity`.
