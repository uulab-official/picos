# Known Hosts Evidence Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Keep all Remotes trust and file mutation locked, and ship this as a separate stacked PR.

**Goal:** Expose recovered Remotes known_hosts selection-history evidence through the command palette and Status Activity result trail.

**Architecture:** Reuse the recovered audit export plan from Status Evidence, add read-only Action Center entries, preview selection/open/search handoffs in the command palette, and record palette or Status Evidence operations as Status Activity results plus Timeline audit messages.

**Tech Stack:** Bun, TypeScript, Ink, existing command palette, Status Activity, Timeline, and audit export infrastructure.

---

### Task 1: Action Catalog and Palette

**Files:**
- Modify: `src/core/actions.ts`
- Modify: `src/tui/palette.ts`
- Test: `tests/actions.test.ts`
- Test: `tests/palette.test.ts`

- [x] Add read-only `status.remoteKnownHostsEvidence.select/open/search` actions.
- [x] Make command palette queries find recovered known_hosts evidence actions.
- [x] Preview selected export cursor, target id, event count, query, path, and open/search handoff.

### Task 2: Activity and Timeline Recovery

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`
- Test: `tests/timelinePanel.test.ts`

- [x] Format palette-triggered known_hosts evidence Status Activity results.
- [x] Format Status Evidence known_hosts search result rows.
- [x] Convert those result rows into reusable Timeline audit jumps for `I`/replay.
- [x] Keep Timeline audit search rendering stable for palette known_hosts evidence actions.

### Task 3: TUI Integration

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Dispatch palette select/open/search into existing Status Evidence known_hosts evidence state.
- [x] Record palette select/open/search audit messages and Status Activity results.
- [x] Record Status Evidence `G` known_hosts searches as Status Activity results for later replay.
- [x] Preserve the locked no-local-read/no-network/no-scan/no-trust/no-write posture.

### Task 4: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document command palette known_hosts evidence actions and replay path.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.300.

Result: Draft PR [#376](https://github.com/uulab-official/picos/pull/376) opened on 2026-07-13, stacked on `codex/picos-v0.4.300-known-hosts-evidence-recovery`.
