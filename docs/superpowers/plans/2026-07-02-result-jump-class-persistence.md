# Result Jump Class Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the Status result jump class filter so operators who work mostly in process, tools, source, or timeline recovery trails do not have to reset the class every TUI session.

**Architecture:** Add a config enum field named `statusResultJumpClassFilter` that reuses the existing Status result jump filter values. Config schema/load/set paths normalize invalid values back to `all`; App boot sync initializes the TUI state from config and Status `^` / palette filter dispatch writes the selected class back to config.

**Tech Stack:** Bun test, TypeScript config schema/store, Ink TUI state sync.

---

### Task 1: Config Schema Persistence

**Files:**
- Modify: `tests/config.test.ts`
- Modify: `tests/configStore.test.ts`
- Modify: `src/core/types.ts`
- Modify: `src/config/schema.ts`

- [x] **Step 1: Write failing config tests**

Add tests that assert:

```ts
defaultConfig.statusResultJumpClassFilter === "all"
mergeConfig({ statusResultJumpClassFilter: "process" }).statusResultJumpClassFilter === "process"
mergeConfig({ statusResultJumpClassFilter: "unsafe" }).statusResultJumpClassFilter === "all"
coerceConfigValue("statusResultJumpClassFilter", "tools") === "tools"
coerceConfigValue("statusResultJumpClassFilter", "unsafe") throws
```

Add a store test that `setConfigValue("statusResultJumpClassFilter", "source", path)` persists and reloads `"source"`.

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
bun test tests/config.test.ts tests/configStore.test.ts
```

Expected: FAIL because the config key/type does not exist.

- [x] **Step 3: Implement minimal schema support**

Add the type field to `PicosConfig`, default it to `all`, merge only allowed values, and coerce only `all`, `process`, `timeline`, `tools`, or `source`.

- [x] **Step 4: Run tests to verify GREEN**

Run:

```bash
bun test tests/config.test.ts tests/configStore.test.ts
```

Expected: PASS.

### Task 2: TUI Sync and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Restore filter from config**

Update `syncConfigSessionState()` so boot/config reload sets `statusActivityResultTimelineJumpFilter` from `config.statusResultJumpClassFilter`.

- [x] **Step 2: Persist filter changes**

In `cycleStatusActivityResultTimelineJumpFilter()`, after computing the next class, call `setConfigValue("statusResultJumpClassFilter", next)` asynchronously and log a warning if persistence fails. Keep keyboard and palette dispatch equivalent.

- [x] **Step 3: Update docs**

Document v0.4.241, README config example, and CHANGELOG entry for persisted Status result jump class filter preference.

- [x] **Step 4: Run full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands exit 0.
