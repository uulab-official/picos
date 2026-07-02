# Remote Connect Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make future SFTP connect attempts visible as an exact-confirm, locked host-review preview before any transport package or network session is enabled.

**Architecture:** Add pure Remotes preview/confirmation helpers in `src/core/remotes.ts`, render the preview in the Remotes TUI and `picos remote <id>` output, and wire the Remotes `c` key to a locked `:remote-connect` prompt that records audit rows only. The implementation must not import an SFTP transport package, open sockets, or mutate remote/local files.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Add connect preview expectations**

  Add a test that imports `createRemoteConnectPreview`, `formatRemoteConnectPreviewRows`, `submitRemoteConnectConfirmation`, and `formatRemoteConnectConfirmationAuditMessage`. Assert a selected SFTP profile returns rows:

  ```txt
  REMOTE CONNECT PREVIEW prod
  dialog=host-review action=connect remote prod status=blocked network=not-opened
  target=sftp://deploy@prod.example.com:2222/srv/app
  identity user=deploy host=prod.example.com port=2222 key=configured hostKey=unverified
  risk=read privilege=user writes=locked destructive=locked
  confirm="connect remote prod" willExecute=false reason=sftp-adapter-not-installed
  controls=future c confirm host review · enter stage context · no socket opened
  ```

- [x] **Step 2: Add confirmation expectations**

  Assert `submitRemoteConnectConfirmation(preview, " connect remote prod ")` returns `confirmed-blocked` with `networkOpened=false`, while a wrong phrase returns `rejected`; assert audit messages include profile id, target, status, dependency, and `network=not-opened`.

- [x] **Step 3: Verify RED**

  Run `bun test tests/remotes.test.ts` and confirm it fails because the new Remotes connect preview helpers are not exported yet.

### Task 2: Core Implementation

**Files:**
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Add preview and confirmation types**

  Add `RemoteConnectPreview` and `RemoteConnectConfirmation` types with profile id, target URI, dependency, exact phrase, locked status, risk/privilege, host-key posture, and `networkOpened: false`.

- [x] **Step 2: Implement pure helpers**

  Implement `createRemoteConnectPreview(profile)`, `formatRemoteConnectPreviewRows(preview)`, `submitRemoteConnectConfirmation(preview, input)`, and `formatRemoteConnectConfirmationAuditMessage(confirmation)` without shelling out or touching adapters.

- [x] **Step 3: Include preview in provider status**

  Append the connect preview rows to `formatRemoteProviderStatus()` after host-review rows so CLI inspection shows the same gate as the TUI.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/remotes.test.ts` and `bun run typecheck`.

### Task 3: TUI Wiring

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render connect preview**

  Import the new formatter, compute the selected profile preview inside `RemotesWorkspace`, and render a `CONNECT PREVIEW` block under host review.

- [x] **Step 2: Add locked prompt flow**

  Add `remote-connect` as a command-line prompt. In Remotes focus, pressing `c` opens the prompt for the selected profile; pressing Enter submits the confirmation, closes the prompt, logs the audit message, and leaves the session unopened.

- [x] **Step 3: Add prompt copy**

  Update Remotes focus text and command-line rows to show `c connect preview`, exact phrase guidance, and cancellation behavior.

- [x] **Step 4: Focused checks**

  Run `bun test tests/remotes.test.ts`, `bun run lint`, and `git diff --check`.

### Task 4: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remote-connect-preview.md`

- [x] **Step 1: Document v0.4.273**

  Add README/CHANGELOG/ROADMAP notes for the Remotes `REMOTE CONNECT PREVIEW` and locked `c` confirmation prompt.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.272-remote-adapter-boundary`.
