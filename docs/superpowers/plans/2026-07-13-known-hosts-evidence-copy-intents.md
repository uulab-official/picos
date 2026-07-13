# Known Hosts Evidence Copy Intents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Preserve the read-only Remotes trust posture and keep this as a separate stacked PR.

**Goal:** Show recovered Remotes known_hosts selection-history evidence in the Status Activity copy-intent shelf.

**Architecture:** Reuse the recovered `remote-known-hosts` audit export plans from Status Evidence, render them beside existing process evidence and Timeline trail recovery rows, and teach copy-intent audit-jump summaries to display remote known_hosts target tokens.

**Tech Stack:** Bun, TypeScript, Ink, existing Status Activity copy-intent, audit export, and Timeline recovery helpers.

---

### Task 1: Copy-Intent Shelf Rows

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Add RED tests for recovered known_hosts evidence rows inside `STATUS ACTIVITY COPY INTENTS`.
- [x] Render selected export count, filename, query, event count, recovered remote id, path, and action hints.
- [x] Keep empty copy-intent shelves useful when recovered known_hosts evidence exists.

### Task 2: Result Jump Target Tokens

**Files:**
- Modify: `src/tui/statusActivityQueue.ts`
- Test: `tests/statusActivityQueue.test.ts`

- [x] Format fresh known_hosts evidence result jumps as `remote known_hosts target=id:<id> action=search I=fresh`.
- [x] Format reusable audit-jump summaries as `target=remote-known-hosts id:<id>`.

### Task 3: TUI Integration

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Pass recovered known_hosts selection-history audit exports into the Status copy-intent shelf renderer.
- [x] Preserve existing Status Evidence open/search routes instead of adding mutation paths.

### Task 4: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document the copy-intent shelf rows and known_hosts replay target tokens.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.301.

Result: Draft PR [#377](https://github.com/uulab-official/picos/pull/377) opened on 2026-07-13, stacked on `codex/picos-v0.4.301-known-hosts-evidence-palette`.
