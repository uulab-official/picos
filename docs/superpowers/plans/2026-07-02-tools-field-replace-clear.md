# Tools Field Replace Clear Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live Tools fields behave more like real terminal form inputs by replacing untouched defaults on first typing and supporting field-level clear.

**Architecture:** Keep the existing safe Tool run path unchanged. Add generic optional touched-field metadata to `CommandLineState`, then teach the Tools prompt input adapter in `App.tsx` to replace an untouched active field on the first printable key, append on later keys, clear the active field with `Ctrl+U`, and mark cleared/edited fields as touched.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Command-Line Touched Field Metadata

**Files:**
- Modify: `src/tui/commandLine.ts`
- Test: `tests/commandLine.test.ts`

- [x] **Step 1: Write failing tests**

  Cover `openCommandLine()` initializing touched fields, `markCommandLineFieldTouched()` adding the current field once, and `isCommandLineFieldTouched()` returning false for ordinary prompts.

- [x] **Step 2: Verify RED**

  Run `bun test tests/commandLine.test.ts`. Expected: fail because touched-field helpers are not exported yet.

- [x] **Step 3: Implement touched-field helpers**

  Add optional `fieldTouchedIndexes?: number[]`, open options for it, and pure helper functions that normalize duplicate indexes.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/commandLine.test.ts`. Expected: pass.

### Task 2: Tools First-Type Replace and Clear

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `tests/toolHistory.test.ts`
- Modify: `src/tui/toolHistory.ts`

- [x] **Step 1: Write failing pure-form tests**

  Add a test showing selected Tool field updates still serialize cleanly after an empty clear value.

- [x] **Step 2: Verify RED**

  Run `bun test tests/toolHistory.test.ts`. Expected: fail for the new helper or expected row behavior if missing.

- [x] **Step 3: Implement minimal pure support**

  Keep `formatToolFormInputValue()` stable for empty fields by falling back to placeholders only for run planning, while rendering cleared fields as an empty active value.

- [x] **Step 4: Wire App input adapter**

  Use touched-field metadata so first printable input replaces default active-field content, subsequent printable input appends, backspace edits normally, and `Ctrl+U` clears the active field.

- [x] **Step 5: Verify GREEN**

  Run `bun test tests/commandLine.test.ts tests/toolHistory.test.ts` plus `bun run typecheck`.

### Task 3: Docs, Verification, Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-tools-field-replace-clear.md`

- [x] **Step 1: Update docs and roadmap**

  Record v0.4.262 and describe first-type replacement and active-field clear.

- [x] **Step 2: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 3: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.261-tools-live-field-focus`.
