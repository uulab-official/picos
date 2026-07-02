# SFTP Package Resolution Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the future optional SFTP transport package lookup locations before picos runs package resolution, imports transport code, opens sockets, starts sessions, trusts hosts, writes `known_hosts`, or mutates anything.

**Architecture:** Add a pure metadata preview in `src/core/remotes.ts` that computes Node-style ancestor `node_modules/@uulab/picos-sftp` candidate paths from an injected start directory. Render the preview in `picos remote <id>` and the Remotes TUI directly after SFTP transport readiness. Keep all execution flags false so the feature is inspectable but non-executing.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Package Resolution Preview

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteSftpPackageResolutionPreview()` and `formatRemoteSftpPackageResolutionPreviewRows()` using injected POSIX and Windows start directories. The rows must show `REMOTE SFTP PACKAGE RESOLUTION PREVIEW`, dependency `@uulab/picos-sftp`, detector `node-module-lookup`, status `preview-only`, blocker `resolver-not-run`, all execution flags false, and deterministic `lookup[...]` entries.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because package resolution preview exports do not exist yet.

Result: FAIL because `createRemoteSftpPackageResolutionPreview` was not exported yet.

- [x] **Step 3: Implement core preview**

Add `RemoteSftpPackageResolutionPreview`, `createRemoteSftpPackageResolutionPreview()`, and `formatRemoteSftpPackageResolutionPreviewRows()`. Add preview rows to `formatRemoteProviderStatus()` after SFTP transport readiness.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

Result: PASS with `bun test tests/remotes.test.ts` (`50 pass`, `0 fail`).

### Task 2: Remotes TUI Preview Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render preview rows**

Import package resolution preview helpers, compute default preview rows, and render a `SFTP PACKAGE RESOLUTION` section after `SFTP TRANSPORT READINESS`.

- [x] **Step 2: Preserve vertical budget and colors**

Increase the Remotes row reservation and color preview-only/resolver-not-run/false rows yellow while keeping headers cyan.

- [x] **Step 3: Run focused checks**

Run: `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.
Expected: PASS.

Result: PASS with `bun test tests/remotes.test.ts`, `bun run typecheck`, and `bun run lint`.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-sftp-package-resolution-preview.md`

- [x] **Step 1: Document v0.4.294**

Update README, CHANGELOG, and ROADMAP to describe `REMOTE SFTP PACKAGE RESOLUTION PREVIEW`, deterministic lookup paths, and continued no-resolve/no-import/no-connect/no-mutate posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

Result: PASS on 2026-07-02 with `bun run verify` (`648 pass`, `0 fail`, plus typecheck/build/smoke), `bun run release:check`, and `git diff --check`.

- [ ] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.294-sftp-package-resolution-preview`, open a draft PR stacked on `codex/picos-v0.4.293-sftp-transport-readiness`, then update ROADMAP and this plan with the PR link.
