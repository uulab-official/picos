# Known Hosts Selection History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Add failing tests before production code, keep Remotes mutation locked, and commit this version separately.

**Goal:** Surface recent Remotes known_hosts candidate selections as a dedicated OS-console shelf that can later become a copy/export source.

**Architecture:** Reuse Status Activity result history as the source of truth, filter `remote-known-hosts-selection` rows in `src/tui/statusActivityQueue.ts`, and render the formatted rows inside `RemotesWorkspace` without adding local trust-file reads, network transport, host scans, trust writes, or remote mutation.

**Tech Stack:** Bun, TypeScript, Ink, existing Status Activity history tests.

---

### Task 1: Selection history formatter

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Add RED tests for empty and populated known_hosts selection-history rows.
- [x] Filter only `remote-known-hosts-selection` timeline results.
- [x] Include candidate summaries, details, locked guard rows, and Timeline recovery queries.

### Task 2: Remotes workspace rendering

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Render `KNOWN_HOSTS SELECTION HISTORY` below recent remote activity.
- [x] Keep the panel compact with a bounded recent-history limit.
- [x] Preserve the Remotes vertical budget for responsive terminal height behavior.

### Task 3: Docs, verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document the new Remotes selection-history shelf.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.297.

Result: Draft PR [#373](https://github.com/uulab-official/picos/pull/373) opened on 2026-07-13, stacked on `codex/picos-v0.4.297-known-hosts-select-palette`.
