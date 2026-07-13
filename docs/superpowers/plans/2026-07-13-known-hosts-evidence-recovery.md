# Known Hosts Evidence Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Add failing tests before production code, keep Remotes mutation locked, and commit this version separately.

**Goal:** Recover Remotes known_hosts selection-history audit exports as first-class Status Evidence after refresh or restart.

**Architecture:** Treat the audit export index as the persisted source, filter exports by the `remote known_hosts selection history <id>` query prefix, expose them through the existing Status Evidence family model, and route open/search through existing locked file-open and Timeline audit-search flows.

**Tech Stack:** Bun, TypeScript, Ink, existing audit export, Status Evidence, and Status Activity infrastructure.

---

### Task 1: Recovery Model

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Add RED tests for recovering known_hosts selection-history exports from the audit index.
- [x] Add selected/latest/move helpers for recovered known_hosts selection-history exports.
- [x] Add locked file-open and Timeline search plan helpers.

### Task 2: Status Evidence Family

**Files:**
- Modify: `src/tui/statusEvidence.ts`
- Test: `tests/statusEvidence.test.ts`

- [x] Add the `remote-known-hosts` Status Evidence family.
- [x] Show summary, table, detail, command strip, and legacy bridge rows.
- [x] Support `Tab`, `1..9`, `[/]`, `enter`/`R`, and `G` search affordances.

### Task 3: TUI Integration

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Refresh known_hosts selection-history exports whenever the audit index refreshes.
- [x] Route Status Evidence `G` to Timeline audit search for active `remote-known-hosts` evidence.
- [x] Route active-family `enter` and `R` through locked `:file-open` confirmation.
- [x] Keep Status Activity evidence detection aware of known_hosts selection-history exports.

### Task 4: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document the recovered `remote-known-hosts` evidence family and controls.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.299.

Result: Draft PR [#375](https://github.com/uulab-official/picos/pull/375) opened on 2026-07-13, stacked on `codex/picos-v0.4.299-known-hosts-history-copy-export`.
