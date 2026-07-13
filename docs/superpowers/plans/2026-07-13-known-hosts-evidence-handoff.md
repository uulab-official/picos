# Known Hosts Evidence Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Reuse existing clipboard/audit export safety gates and do not add trust, `known_hosts` writes, local trust-file reads, network transport, or host scans.

**Goal:** Let operators copy or export selected recovered Remotes known_hosts evidence from the Status Activity copy-intent shelf.

**Architecture:** Convert the selected recovered audit export plan into a locked clipboard preview and a selected picos audit export handoff. Wire those as fallbacks for Status `y` and `e` when normal result-history/copy-intent payloads are unavailable.

**Tech Stack:** Bun, TypeScript, Ink, existing Status Activity, clipboard preview, audit export, and file-open handoff helpers.

---

### Task 1: Handoff Helpers

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Add RED tests for selected known_hosts evidence clipboard preview rows.
- [x] Add RED tests for selected known_hosts evidence audit export handoff content.
- [x] Include target id, selected cursor, filename, query, path, events, and locked guard posture.

### Task 2: Status Key Fallbacks

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Make Status `y` fall back to selected known_hosts evidence when no result-history copy preview exists.
- [x] Make Status `e` fall back to selected known_hosts evidence handoff export when no copy-intent row exists.
- [x] Keep exported handoffs reopenable through the existing `z` file-open path.

### Task 3: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document direct known_hosts evidence copy/export fallback behavior.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.302.

Result: Draft PR [#378](https://github.com/uulab-official/picos/pull/378) opened on 2026-07-13, stacked on `codex/picos-v0.4.302-known-hosts-evidence-copy-intents`.
