# Known Hosts Selection History Copy Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Add failing tests before production code, keep Remotes mutation locked, and commit this version separately.

**Goal:** Let operators copy and export the Remotes known_hosts selection-history shelf as durable evidence.

**Architecture:** Keep Status Activity result history as the source of truth, add pure clipboard/export helpers in `src/tui/statusActivityQueue.ts`, and wire Remotes focus keys to existing locked clipboard confirmation plus picos-owned audit exports.

**Tech Stack:** Bun, TypeScript, Ink, existing clipboard preview and audit export infrastructure.

---

### Task 1: Copy/export model

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Add RED tests for known_hosts selection-history clipboard previews.
- [x] Add RED tests for filtered audit export plans and file writes.
- [x] Preserve candidate summaries, details, Timeline recovery queries, and locked guard posture.

### Task 2: Remotes keyboard controls

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Map Remotes focus `y` to the locked clipboard confirmation.
- [x] Map Remotes focus `E` to a picos-owned audit export and refresh the evidence index.
- [x] Update Remotes focus help and selection-history controls.

### Task 3: Docs, verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document Remotes known_hosts selection-history copy/export controls.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.298.

Result: Draft PR [#374](https://github.com/uulab-official/picos/pull/374) opened on 2026-07-13, stacked on `codex/picos-v0.4.298-known-hosts-selection-history`.
