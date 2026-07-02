# Config Settings Palette Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make common Config settings reachable from the command palette so picos feels more like an OS settings center.

**Architecture:** Add read-only Config focus actions for safety policy, editor save mode, audit retention, and tools target retention. Reuse Config workspace item keys as the routing boundary, add compact palette previews from current Config row values, and dispatch actions by focusing the Config workspace row instead of mutating settings.

**Tech Stack:** Bun test, TypeScript, existing action catalog, Ink TUI state, command palette preview, Config workspace model.

---

### Task 1: Action Catalog and Palette Discovery

**Files:**
- Modify: `tests/actions.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `src/core/actions.ts`

- [x] **Step 1: Write failing action tests**

Add enabled action expectations for:

```txt
config.safetyPolicy.focus
config.editorSaveMode.focus
config.auditRetention.focus
config.toolTargetRetention.focus
```

Expected action summary after the new actions:

```ts
{
  total: 58,
  enabled: 46,
  locked: 12,
  elevated: 4,
}
```

- [x] **Step 2: Write failing palette discovery tests**

Assert these command-palette queries find the matching action ids:

```txt
safety policy config -> config.safetyPolicy.focus
editor save config -> config.editorSaveMode.focus
audit retention config -> config.auditRetention.focus
tools retention config -> config.toolTargetRetention.focus
```

- [x] **Step 3: Run RED**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: FAIL because the actions do not exist.

- [x] **Step 4: Implement catalog actions**

Add the four read-only Config actions near `config.statusResultJumpClass.focus`. Descriptions must include the query phrases above because command-palette filtering uses substring matching.

- [x] **Step 5: Run GREEN for catalog/discovery**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: discovery/action catalog tests pass while preview/focus tests may still fail until later tasks are complete.

### Task 2: Config Focus Routing

**Files:**
- Modify: `tests/configPanel.test.ts`
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Write failing routing tests**

Add expectations:

```ts
expect(getConfigWorkspaceActionFocusKey("config.safetyPolicy.focus")).toBe(
  "controlExecutionMode",
);
expect(getConfigWorkspaceActionFocusKey("config.editorSaveMode.focus")).toBe(
  "editorSaveMode",
);
expect(getConfigWorkspaceActionFocusKey("config.auditRetention.focus")).toBe(
  "auditArchiveRetentionLimit",
);
expect(getConfigWorkspaceActionFocusKey("config.toolTargetRetention.focus")).toBe(
  "toolTargetPresetLimit",
);
```

- [x] **Step 2: Run RED**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: FAIL because the routing helper does not exist.

- [x] **Step 3: Implement routing helper and App dispatch**

Add `getConfigWorkspaceActionFocusKey(actionId)` in `src/tui/configPanel.ts`. Replace the single hard-coded Config palette dispatch branch in `src/tui/App.tsx` with the helper so all Config focus actions set `screen="config"`, `focusArea="workspaces"`, and `selectedConfigIndex` for the target key.

- [x] **Step 4: Run GREEN**

Run:

```bash
bun test tests/configPanel.test.ts tests/actions.test.ts tests/palette.test.ts
bun run typecheck
```

Expected: all pass.

### Task 3: Palette Preview Rows

**Files:**
- Modify: `tests/palette.test.ts`
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Write failing preview tests**

Use `createConfigWorkspaceItems()` in `tests/palette.test.ts` and assert:

```txt
config target=controlExecutionMode
current mode=disabled adminDryRun=false editorSave=disabled
section=safety action=focus Config row
controls=P presets safe/user/admin +/- cycle selected row

config target=editorSaveMode
current=disabled
section=safety action=focus Config row
controls=+/- cycle disabled/local-write

config target=auditArchiveRetentionLimit
current=10
section=retention action=focus Config row
controls=+/- clamp 1..60 archived audit logs

config target=toolTargetPresetLimit
current=8
section=retention action=focus Config row
controls=+/- clamp 1..24 saved tool targets
```

- [x] **Step 2: Run RED**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because preview rows return `[]`.

- [x] **Step 3: Implement preview rows**

Extend `CommandPalettePreviewContext` with `configWorkspaceItems?: ConfigWorkspaceItem[]`, pass `configWorkspaceItems` from `renderWorkspace()`, and render compact preview rows for all Config focus action ids.

- [x] **Step 4: Run focused verification**

Run:

```bash
bun test tests/configPanel.test.ts tests/actions.test.ts tests/palette.test.ts
bun run lint
bun run typecheck
```

Expected: all pass.

### Task 4: Docs, Verify, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-config-settings-palette-focus.md`

- [x] **Step 1: Update docs**

Document v0.4.244 and mention `safety policy config`, `editor save config`, `audit retention config`, and `tools retention config` in the README command-palette/Config sections.

- [x] **Step 2: Full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both exit 0.

- [ ] **Step 3: Commit and PR**

Commit:

```bash
git add .
git commit -m "feat(config): focus settings rows from palette"
git push -u origin codex/picos-v0.4.244-config-settings-palette-focus
gh pr create --draft --base codex/picos-v0.4.243-config-jump-class-palette-focus --head codex/picos-v0.4.244-config-settings-palette-focus
```
