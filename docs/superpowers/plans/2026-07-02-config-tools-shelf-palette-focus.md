# Config Tools Shelf Palette Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a command-palette shortcut that jumps directly into the Tools managed Config shelf.

**Architecture:** Reuse the existing Config managed shelf navigation model instead of adding a new route. The action catalog exposes `config.shelf.tools.focus`, `configPanel` maps that id to the existing `tools` shelf, palette preview rows come from the shared shelf formatters, and App dispatch mirrors the current keyboard shelf jump behavior.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Coverage

**Files:**
- Modify: `tests/actions.test.ts`
- Modify: `tests/palette.test.ts`
- Modify: `tests/configPanel.test.ts`

- [x] **Step 1: Write the failing tests**

Add `config.shelf.tools.focus` to the enabled action ordering and object coverage in `tests/actions.test.ts`, add `tools shelf config` search plus the Tools preview rows in `tests/palette.test.ts`, and assert `getConfigManagedShelfActionFocusTarget("config.shelf.tools.focus") === "tools"` in `tests/configPanel.test.ts`.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts tests/configPanel.test.ts
```

Expected: FAIL because `config.shelf.tools.focus` is not yet in the action catalog or Config managed shelf action map.

### Task 2: Implement Tools Shelf Palette Focus

**Files:**
- Modify: `src/core/actions.ts`
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add the action catalog entry**

Add a read-only enabled action:

```ts
{
	id: "config.shelf.tools.focus",
	title: "Open tools target shelf",
	description:
		"Tools shelf config and tool target presets config shortcut for jumping into the Tools managed shelf with Config origin.",
	category: "config",
	risk: "read",
	privilege: "none",
	enabled: true,
	confirmationRequired: false,
}
```

- [x] **Step 2: Map the action to the Tools shelf**

Add this entry to `configManagedShelfActionFocusTargets`:

```ts
"config.shelf.tools.focus": "tools",
```

- [x] **Step 3: Align palette dispatch with keyboard shelf jump**

When the action focus cursor is `toolTargetPresets`, set the selected Tools preset index and summary detail view:

```ts
} else if (focus.cursor === "toolTargetPresets") {
	setSelectedToolTargetPresetIndex(focus.index);
	setToolHistoryDetailView("summary");
}
```

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/actions.test.ts tests/palette.test.ts tests/configPanel.test.ts
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document the user-visible shortcut**

Record that `tools shelf config` / `tool target presets config` now opens the Tools managed shelf from the command palette.

- [x] **Step 2: Add the next roadmap slice**

Add `v0.4.246 - Config Tools Shelf Palette Focus` at the top of `ROADMAP.md`, with the next slice pointing to live count previews for Config-origin shelf shortcuts.

- [x] **Step 3: Run full verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands pass.

### Task 4: Publish the Version Slice

**Files:**
- Commit all modified source, tests, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-config-tools-shelf-palette-focus.md src/core/actions.ts src/tui/configPanel.ts src/tui/App.tsx tests/actions.test.ts tests/palette.test.ts tests/configPanel.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): focus tools shelf from palette"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.246-config-tools-shelf-palette-focus
gh pr create --draft --base codex/picos-v0.4.245-config-shelf-palette-focus --head codex/picos-v0.4.246-config-tools-shelf-palette-focus --title "feat(config): focus tools shelf from palette"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the created draft PR URL, rerun verification, amend the commit, and force-push with lease.
