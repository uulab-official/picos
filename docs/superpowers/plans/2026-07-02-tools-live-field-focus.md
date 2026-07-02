# Tools Live Field Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Tools prompts support live field focus so operators can move between fields and edit the active Tool input instead of treating every Tool as one opaque command line.

**Architecture:** Keep `CommandLineState` generic by adding optional field-focus metadata. Keep Tool-specific parsing, field selection, and value serialization in `src/tui/toolHistory.ts`. Wire `App.tsx` so Tool prompts open with defaults, `Tab` advances the active field, typed input edits only the selected field, and `Enter` still submits the serialized value through the existing safe run-plan path.

**Tech Stack:** Bun, TypeScript, Ink, React, Bun test, Biome.

---

### Task 1: Command-Line Field Focus State

**Files:**
- Modify: `src/tui/commandLine.ts`
- Test: `tests/commandLine.test.ts`

- [x] **Step 1: Write failing tests**

  Add tests showing `openCommandLine()` can initialize a field index without affecting existing prompts, and `moveCommandLineField()` wraps forward/backward.

- [x] **Step 2: Verify RED**

  Run `bun test tests/commandLine.test.ts`. Expected: fail because field-focus helpers are not exported yet.

- [x] **Step 3: Implement field-focus metadata**

  Add optional `fieldIndex?: number`, `openCommandLine(prompt, options)`, and `moveCommandLineField(state, total, direction)`.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/commandLine.test.ts`. Expected: pass.

### Task 2: Tools Form Selection and Serialization

**Files:**
- Modify: `src/tui/toolHistory.ts`
- Test: `tests/toolHistory.test.ts`

- [x] **Step 1: Write failing tests**

  Add tests for selecting a Tool form field, editing the selected field, serializing telnet fields back to `host port`, and rendering prompt rows with the selected field index.

- [x] **Step 2: Verify RED**

  Run `bun test tests/toolHistory.test.ts`. Expected: fail because selection/serialization helpers and selected prompt rows are not implemented.

- [x] **Step 3: Implement Tool form selection**

  Add `selectToolFormField()`, `formatToolFormInputValue()`, and optional selected-index support in `createToolFormState()` / `formatToolPromptRows()`.

- [x] **Step 4: Verify GREEN**

  Run `bun test tests/toolHistory.test.ts`. Expected: pass.

### Task 3: App Wiring and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-tools-live-field-focus.md`

- [x] **Step 1: Wire live Tool field editing**

  Open Tool prompts with default serialized values and `fieldIndex=0`; handle `Tab` while a Tool prompt is active; route character/backspace input through the selected Tool form field.

- [x] **Step 2: Update docs and roadmap**

  Add v0.4.261 and explain live Tool field focus.

- [x] **Step 3: Verify full slice**

  Run `bun test tests/commandLine.test.ts`, `bun test tests/toolHistory.test.ts`, `bun run verify`, `bun run release:check`, and `git diff --check`.

- [x] **Step 4: Publish**

  Commit, push, and open a draft PR based on `codex/picos-v0.4.260-tools-field-form`.
