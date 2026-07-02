# Remotes Transport Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and keep this checklist current while implementing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a read-only SFTP transport capability probe in Remotes before any live adapter or network session is enabled.

**Architecture:** Add a pure probe model in `src/core/remotes.ts` that reports dependency, installed status, planned read capabilities, locked writes/destructive actions, exact confirmation, and `network=not-opened`. Render the same rows in `picos remote <id>` and the Remotes TUI so CLI and TUI safety posture stay aligned. No dynamic import, socket, credential use, or OS mutation is introduced.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Failing Coverage

**Files:**
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Add transport probe expectations**

  Assert `createRemoteTransportProbe(profile)` returns a read-only blocked probe for the selected SFTP profile and `formatRemoteTransportProbeRows(probe)` returns:

  ```txt
  REMOTE TRANSPORT PROBE prod
  dependency=@uulab/picos-sftp installed=false status=missing probe=static
  target=sftp://deploy@prod.example.com:2222/srv/app
  auth=user key=configured hostKey=unverified
  capabilities=list/read planned write locked destructive locked
  execution=blocked network=not-opened willImport=false willConnect=false
  next=install optional adapter · then host review exact confirm
  ```

- [x] **Step 2: Add empty probe expectations**

  Assert no selected profile renders:

  ```txt
  REMOTE TRANSPORT PROBE none
  dependency=@uulab/picos-sftp installed=false status=missing probe=static
  target=none
  auth=user=- key=none hostKey=unverified
  capabilities=list/read planned write locked destructive locked
  execution=blocked network=not-opened willImport=false willConnect=false
  next=select remote profile · no socket opened
  ```

- [x] **Step 3: Add CLI provider status expectation**

  Assert `formatRemoteProviderStatus(profile)` includes `REMOTE TRANSPORT PROBE <id>` and the blocked execution posture.

- [x] **Step 4: Verify RED**

  Run `bun test tests/remotes.test.ts` and confirm failure because the probe functions are not implemented/exported yet.

### Task 2: Implementation

**Files:**
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Implement pure transport probe**

  Add `RemoteTransportProbe`, `createRemoteTransportProbe(profile?)`, and `formatRemoteTransportProbeRows(probe?)` in `src/core/remotes.ts`.

- [x] **Step 2: Add probe to CLI provider status**

  Insert the transport probe section into `formatRemoteProviderStatus()` between adapter boundary and host review.

- [x] **Step 3: Add probe to Remotes TUI**

  Import the new functions in `src/tui/App.tsx`, compute rows for the selected profile, render a `TRANSPORT PROBE` section after Adapter Boundary, and keep row colors aligned with blocked/locked/no-network status.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/remotes.test.ts`, `bun run typecheck`, `bun run lint`, and `git diff --check`.

### Task 3: Docs and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-remotes-transport-probe.md`

- [x] **Step 1: Document v0.4.276**

  Add README/CHANGELOG/ROADMAP notes for the Remotes transport probe and its no-network safety posture.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.275-remotes-activity-shelf`.
