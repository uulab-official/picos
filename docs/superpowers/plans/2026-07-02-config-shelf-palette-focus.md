# Config Shelf Palette Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators jump from the command palette into Config-origin managed shelves for route filters, endpoint filters, log profiles, and remote profiles.

**Architecture:** Add read-only command-palette actions that map to existing `ConfigManagedShelfTarget` values. Reuse the existing Config shelf focus preset and landing behavior so palette dispatch enters the destination workspace with the same Config-origin banner as manual `g/G` + `enter`.

**Tech Stack:** Bun test, TypeScript, existing action catalog, command palette preview, Config managed shelf helpers, Ink TUI state.

---

### Task 1: Action Catalog and Palette Discovery

**Files:**
- Modify: `tests/actions.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `src/core/actions.ts`

- [x] **Step 1: Write failing action tests**

Add enabled action expectations for:

```txt
config.shelf.routes.focus
config.shelf.connections.focus
config.shelf.ports.focus
config.shelf.logs.focus
config.shelf.remotes.focus
```

Expected summary after the new actions:

```ts
{
  total: 63,
  enabled: 51,
  locked: 12,
  elevated: 4,
}
```

- [x] **Step 2: Write failing palette discovery tests**

Assert these queries find their action ids:

```txt
route filters config -> config.shelf.routes.focus
connection filters config -> config.shelf.connections.focus
port filters config -> config.shelf.ports.focus
log profiles config -> config.shelf.logs.focus
remote profiles config -> config.shelf.remotes.focus
```

- [x] **Step 3: Run RED**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: FAIL because the actions do not exist.

- [x] **Step 4: Implement catalog actions**

Add the five read-only Config shelf focus actions near the existing Config actions. Include the exact query phrases in descriptions because palette search is substring-based.

- [x] **Step 5: Run GREEN for discovery**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: action and discovery tests pass.

### Task 2: Shelf Routing Helper and Preview Rows

**Files:**
- Modify: `tests/configPanel.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/palette.ts`

- [x] **Step 1: Write failing routing tests**

Add expectations:

```ts
expect(getConfigManagedShelfActionFocusTarget("config.shelf.routes.focus")).toBe("routes");
expect(getConfigManagedShelfActionFocusTarget("config.shelf.connections.focus")).toBe("connections");
expect(getConfigManagedShelfActionFocusTarget("config.shelf.ports.focus")).toBe("ports");
expect(getConfigManagedShelfActionFocusTarget("config.shelf.logs.focus")).toBe("logs");
expect(getConfigManagedShelfActionFocusTarget("config.shelf.remotes.focus")).toBe("remotes");
expect(getConfigManagedShelfActionFocusTarget("network.inspect")).toBeUndefined();
```

- [x] **Step 2: Write failing preview tests**

Assert preview rows for routes and remotes:

```txt
config shelf target=routes workspace=Routes
scope=route filters, raw route evidence, path lookup
focus=routeFilters cursor=0 detail=table
enter=cycle route filter presets  esc=clear landing
```

```txt
config shelf target=remotes workspace=Remotes
scope=SFTP profiles, provider boundary, locked file context
focus=remoteProfiles cursor=0
enter=remote profile focus  esc=clear landing
```

- [x] **Step 3: Run RED**

Run:

```bash
bun test tests/configPanel.test.ts tests/palette.test.ts
```

Expected: FAIL because the helper and preview support do not exist.

- [x] **Step 4: Implement helper and previews**

Add `getConfigManagedShelfActionFocusTarget()` in `configPanel.ts`. Export a compact preview formatter for managed shelf focus actions or reuse existing `getConfigManagedShelfFocusPreset()` and `formatConfigManagedShelfFocusRows()` from `palette.ts`.

- [x] **Step 5: Run GREEN**

Run:

```bash
bun test tests/configPanel.test.ts tests/palette.test.ts
bun run typecheck
bun run lint
```

Expected: all pass.

### Task 3: App Dispatch and Docs

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-config-shelf-palette-focus.md`

- [x] **Step 1: Implement App dispatch**

In `runAction()`, use `getConfigManagedShelfActionFocusTarget(action.id)` and route to the same Config shelf landing state as `jumpToConfigManagedShelf()`: destination screen, focus area, `configShelfLandingTarget`, and target-specific cursor setup.

- [x] **Step 2: Update docs**

Document v0.4.245 and mention `route filters config`, `connection filters config`, `port filters config`, `log profiles config`, and `remote profiles config`.

- [x] **Step 3: Full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both exit 0.

- [ ] **Step 4: Commit and PR**

Commit:

```bash
git add .
git commit -m "feat(config): focus managed shelves from palette"
git push -u origin codex/picos-v0.4.245-config-shelf-palette-focus
gh pr create --draft --base codex/picos-v0.4.244-config-settings-palette-focus --head codex/picos-v0.4.245-config-shelf-palette-focus
```
