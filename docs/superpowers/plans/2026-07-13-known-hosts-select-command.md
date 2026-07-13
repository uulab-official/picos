# Known Hosts Select Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Add failing tests before production code, keep changes small, and commit this version separately.

**Goal:** Let Remotes operators select pasted `known_hosts` candidates beyond `1-9` through a typed command prompt.

**Architecture:** Add a small core parser for candidate-selection command input, reuse the existing paste-review selection/session update path, and keep all trust/network/local-read/write mutation flags disabled. TUI only opens and submits the prompt; core owns parsing and candidate selection semantics.

**Tech Stack:** Bun, TypeScript, Ink, existing picos core/TUI tests.

---

### Task 1: Core typed selection parser

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] Add RED tests for `parseRemoteKnownHostsCandidateSelectionInput`.
- [x] Implement parsing for `12`, `#12`, and `candidate 12`.
- [x] Keep invalid, zero, negative, and empty values as `undefined`.

### Task 2: TUI command prompt

**Files:**
- Modify: `src/tui/App.tsx`
- Test: focused core/status tests plus full `bun run verify`

- [x] Add `remote-known-hosts-select` prompt submission.
- [x] Open it from Remotes focus with `S`.
- [x] Reuse existing selection/session/activity update path with method `command`.
- [x] Render compact prompt help beside known_hosts paste review.

### Task 3: Docs, verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document `S` typed selection and Activity/Timeline behavior.
- [x] Run `bun run verify` and `bun run release:check`.
- [x] Commit, push, and open a draft PR stacked on v0.4.295.

Result: Draft PR [#371](https://github.com/uulab-official/picos/pull/371) opened on 2026-07-13, stacked on `codex/picos-v0.4.295-known-hosts-selection-activity`.
