# Result Jump Class Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators filter the Status result jump browser by recovery target class (`all`, `process`, `timeline`, `tools`, `source`).

**Architecture:** Add a small pure filter model around existing result-jump indexes. `formatStatusActivityResultTimelineJumpRows()` and `moveStatusActivityResultTimelineJumpSelection()` accept an optional class filter; `App.tsx` stores that filter and cycles it from Status with `^`.

**Tech Stack:** Bun test, TypeScript, Ink TUI pure helpers.

---

### Task 1: Pure Result Jump Class Filter

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `src/tui/statusActivityQueue.ts`

- [x] **Step 1: Write the failing test**

Add imports and tests for:

```ts
nextStatusActivityResultTimelineJumpFilter("all") === "process"
nextStatusActivityResultTimelineJumpFilter("source") === "all"
```

Create mixed history rows containing:
- a Timeline selected copy jump
- a Status Evidence process search jump
- a Tools evidence search jump
- a palette source trail result jump

Expect:

```txt
STATUS RESULT TIMELINE JUMPS filter=process count=1/4 selected=1/1
```

and a single process row. Also expect `moveStatusActivityResultTimelineJumpSelection(history, 0, "next", "process")` to return the process row index.

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because class filters do not exist.

- [x] **Step 3: Write minimal implementation**

Add `StatusActivityResultTimelineJumpFilter`, classifier helper, filtered index helper, `nextStatusActivityResultTimelineJumpFilter()`, and optional filter parameters to existing row/move helpers.

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: PASS.

### Task 2: Status UI Wiring and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Wire Status UI**

Add `selectedStatusActivityResultTimelineJumpFilter` state in `App.tsx`, pass it to formatter/move helpers, and cycle it on Status `^`. Log the selected filter.

- [x] **Step 2: Update docs**

Document v0.4.239 and mention `^` cycles result jump class filters.

- [ ] **Step 3: Verify and publish review branch**

Run:

```bash
bun run verify
bun run release:check
```

Commit, push, and open a draft PR based on `codex/picos-v0.4.238-result-jump-browser-target`.

## Self-Review

- Spec coverage: covers the v0.4.238 roadmap next item and improves dense Status Activity navigation.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: uses existing result jump helper naming and Status Activity result shapes.
