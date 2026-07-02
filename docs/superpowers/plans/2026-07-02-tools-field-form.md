# Tools Field Form Implementation Plan

**Goal:** Turn Tools target prompts into structured, field-aware form rows so multi-input tools such as telnet can feel like an OS console panel instead of a single opaque command line.

**Architecture:** Keep execution on the existing `createToolRunPlan()` and `runTool()` path. `src/tui/toolHistory.ts` owns the pure form state, field movement, value updates, CLI preview formatting, and conversion back into a safe run plan. `App.tsx` can continue opening the same prompt while the Tools workspace renders richer rows.

## Tasks

- [x] **Step 1: Add Tools field-form regression tests**

  Cover telnet host/port defaults, field focus movement, field value updates, conversion to `ToolRunPlan`, and rendered prompt rows.

- [x] **Step 2: Implement pure field-form model**

  Add form state helpers backed by `getToolDefinitions()` so action metadata and tool field definitions stay in one place.

- [x] **Step 3: Render Tools prompts as field forms**

  Update `formatToolPromptRows()` to show selected field, placeholders, CLI preview, and controls while preserving existing run semantics.

- [x] **Step 4: Update user-facing docs and roadmap**

  Record v0.4.260 in `CHANGELOG.md`, `README.md`, and `ROADMAP.md`, including the next step toward true Tab-focused editing in the TUI.

- [x] **Step 5: Verify and publish slice**

  Run focused tests first, then `bun run verify`, `bun run release:check`, and `git diff --check`; commit, push, and open a draft PR.
