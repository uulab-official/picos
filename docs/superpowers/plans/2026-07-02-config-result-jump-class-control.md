# Config Result Jump Class Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators adjust the persisted Status result jump class filter directly from the Config workspace, without entering Status first.

**Architecture:** Add `statusResultJumpClassFilter` as a display-section choice item in the existing Config workspace model. Reuse the config workspace adjustment path so `+/-` persists through `setConfigValue()`, while App sync keeps the Status browser filter state aligned.

**Tech Stack:** Bun test, TypeScript, existing Config workspace model and Ink TUI state sync.

---

### Task 1: Config Workspace Model

**Files:**
- Modify: `tests/configPanel.test.ts`
- Modify: `src/tui/configPanel.ts`

- [x] **Step 1: Write failing tests**

Add `statusResultJumpClassFilter: "process"` to `createConfigWorkspaceItems()` inputs and expect:

```txt
display:statusResultJumpClassFilter
```

in the grouped item list, a visible row:

```txt
statusResultJumpClassFilter process  Status result jump browser class
```

and `adjustConfigWorkspaceItem()` to cycle `process -> timeline` and `process -> all` for increase/decrease.

- [x] **Step 2: Run test to verify RED**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: FAIL because the Config workspace item does not exist yet.

- [x] **Step 3: Implement minimal Config item support**

Add the key to `ConfigWorkspaceItemKey`, include it in `createConfigWorkspaceItems()` with options `all/process/timeline/tools/source`, and update display-section hints to mention jump class.

- [x] **Step 4: Run test to verify GREEN**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: PASS.

### Task 2: App Wiring and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Pass the setting into Config workspace items**

Include `statusResultJumpClassFilter: statusActivityResultTimelineJumpFilter` in `createConfigWorkspaceItems()`.

- [x] **Step 2: Sync after Config adjustment**

When `saveConfigWorkspaceAdjustment()` adjusts `statusResultJumpClassFilter`, update `statusActivityResultTimelineJumpFilter` optimistically before persisting, then rely on `syncConfigSessionState()` after save.

- [x] **Step 3: Update docs**

Document v0.4.242, README Config workspace behavior, and CHANGELOG.

- [x] **Step 4: Run full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands exit 0.
