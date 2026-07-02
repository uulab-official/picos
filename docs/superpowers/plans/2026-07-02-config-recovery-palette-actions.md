# Config Recovery Palette Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make empty Config shelf recovery hints discoverable and executable from the command palette.

**Architecture:** Add read-only `config.recovery.*` action catalog entries that reuse existing Config shelf focus routing. Keep dispatch safe by navigating to the owning workspace and showing Config-origin landing/focus rows rather than creating presets automatically.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Action Catalog Tests

**Files:**
- Modify: `tests/actions.test.ts`

- [x] **Step 1: Expect recovery actions in the enabled catalog**

Add assertions that `getActionCatalog()` exposes:

```ts
"config.recovery.routes",
"config.recovery.connections",
"config.recovery.ports",
"config.recovery.tools",
"config.recovery.logs",
"config.recovery.remotes",
```

Each action should be `category: "config"`, `risk: "read"`, `privilege: "none"`, `enabled: true`, and `confirmationRequired: false`.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/actions.test.ts
```

Expected: FAIL because the recovery actions do not exist yet and the catalog summary counts still reflect the older action total.

### Task 2: Add Failing Palette Tests

**Files:**
- Modify: `tests/palette.test.ts`

- [x] **Step 1: Expect recovery query discovery**

Add command palette search expectations:

```ts
"empty route filters" -> "config.recovery.routes"
"recover connection filters" -> "config.recovery.connections"
"missing port filters" -> "config.recovery.ports"
"recover tools targets" -> "config.recovery.tools"
"missing log profiles" -> "config.recovery.logs"
"recover remote profiles" -> "config.recovery.remotes"
```

- [x] **Step 2: Expect recovery previews**

Expect `formatCommandPaletteActionPreviewRows()` for `config.recovery.routes` to return:

```ts
[
	"config recovery target=routes workspace=Routes",
	"empty=routeFilters action=restore missing shelf",
	"scope=route filters, raw route evidence, path lookup",
	"focus=routeFilters cursor=0 detail=table",
	"enter=cycle route filter presets  fallback=open filter prompt",
]
```

Expect `config.recovery.remotes` to return the same shape for remote profiles and Remotes focus.

- [x] **Step 3: Run focused tests and verify RED**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because the new recovery action ids and previews do not exist.

### Task 3: Implement Recovery Action Mapping

**Files:**
- Modify: `src/core/actions.ts`
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add recovery actions to the catalog**

Add six enabled read-only actions in the Config category with descriptions containing the search phrases from Task 2.

- [x] **Step 2: Add Config recovery target helpers**

Add `getConfigRecoveryActionFocusTarget(actionId)` and `formatConfigRecoveryPaletteRows(target)` helpers that map recovery actions to the existing managed shelf focus presets.

- [x] **Step 3: Render recovery palette previews**

Teach `formatCommandPaletteActionPreviewRows()` to use the recovery helper and show recovery-specific preview rows.

- [x] **Step 4: Dispatch recovery actions in App**

Reuse the existing Config shelf focus dispatch path for `config.recovery.*` actions, and log `config recovery palette ...` so palette-triggered recovery is distinguishable from normal shelf focus.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts
```

Expected: PASS.

### Task 4: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document palette recovery actions**

Record that empty Config shelf recovery hints are now searchable from the command palette and dispatch into the owning workspace.

- [x] **Step 2: Add v0.4.250 roadmap entry**

Add `v0.4.250 - Config Recovery Palette Actions` above v0.4.249 and set the next slice toward direct prompt creation for missing presets/profiles.

- [x] **Step 3: Run full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

### Task 5: Publish the Version Slice

**Files:**
- Commit all modified source, tests, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-config-recovery-palette-actions.md src/core/actions.ts src/tui/configPanel.ts src/tui/palette.ts src/tui/App.tsx tests/actions.test.ts tests/palette.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): add recovery palette actions"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.250-config-recovery-palette-actions
gh pr create --draft --base codex/picos-v0.4.249-config-empty-shelf-recovery-hints --head codex/picos-v0.4.250-config-recovery-palette-actions --title "feat(config): add recovery palette actions"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
