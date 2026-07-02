# Tools Field Help Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live Tools form prompts self-explanatory by showing the active field, whether input will replace or append, and the available field editing keys.

**Architecture:** Keep the field model in `src/tui/toolHistory.ts` and pass touched-field metadata from `CommandLineState` in `App.tsx`. Render one compact help row inside active Tools prompt rows without changing the safe Tool run path.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Prompt Help Row Model

**Files:**
- Modify: `src/tui/toolHistory.ts`
- Test: `tests/toolHistory.test.ts`

- [x] **Step 1: Write failing tests**

  Add expectations for `formatToolPromptRows()` to show `field help active=Host touched=no input=replace tab=next ctrl-u=clear` for untouched fields and `active=Port touched=yes input=append` for touched fields.

- [x] **Step 2: Verify RED**

  Run `bun test tests/toolHistory.test.ts`. Expected: fail because the help row is not rendered yet.

- [x] **Step 3: Implement prompt help row**

  Add a touched-field parameter to `formatToolPromptRows()` and append one compact row derived from the selected field.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/toolHistory.test.ts`. Expected: pass.

### Task 2: App Wiring and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-tools-field-help-strip.md`

- [x] **Step 1: Pass touched metadata from App**

  Pass `commandLine.fieldTouchedIndexes ?? []` into `formatToolPromptRows()` so the help row follows the live input mode.

- [x] **Step 2: Update docs and roadmap**

  Record v0.4.263 and describe the active field help strip.

- [x] **Step 3: Verify full slice**

  Run `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.262-tools-field-replace-clear`.
