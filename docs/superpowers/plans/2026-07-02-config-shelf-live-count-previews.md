# Config Shelf Live Count Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live saved filter/profile/preset counts in Config managed shelf command-palette previews.

**Architecture:** Keep shelf navigation unchanged and extend the existing command-palette preview context with optional managed shelf counts. `palette.ts` formats one compact count row when counts are available, while `App.tsx` supplies lengths from the already-loaded in-memory Config/TUI preset arrays.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Preview Coverage

**Files:**
- Modify: `tests/palette.test.ts`

- [x] **Step 1: Write the failing tests**

Update the Config managed shelf preview test so `formatCommandPaletteActionPreviewRows()` receives:

```ts
{
	configManagedShelfCounts: {
		routes: 2,
		tools: 3,
		remotes: 1,
	},
}
```

Expect the route preview to include `counts=routeFilters 2`, the Tools preview to include `counts=toolTargetPresets 3`, and the Remotes preview to include `counts=remoteProfiles 1`.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because palette previews do not yet render count rows.

### Task 2: Implement Count-Aware Shelf Previews

**Files:**
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add count context types**

Import `ConfigManagedShelfTarget` from `configPanel` and add this optional context field:

```ts
configManagedShelfCounts?: Partial<Record<ConfigManagedShelfTarget, number>>;
```

- [x] **Step 2: Format one compact count row**

Add a helper that maps targets to shelf-owned labels:

```ts
function formatConfigManagedShelfPaletteCountRow(
	target: ConfigManagedShelfTarget,
	count: number | undefined,
): string | undefined {
	if (count === undefined) {
		return undefined;
	}
	const labels: Record<ConfigManagedShelfTarget, string> = {
		network: "interfaces",
		routes: "routeFilters",
		connections: "connectionFilters",
		ports: "portFilters",
		tools: "toolTargetPresets",
		logs: "logProfiles",
		remotes: "remoteProfiles",
	};
	return `counts=${labels[target]} ${count}`;
}
```

- [x] **Step 3: Insert the count row into shelf previews**

Pass `context.configManagedShelfCounts?.[configShelfTarget]` into `formatConfigManagedShelfPalettePreviewRows()`, and insert the count row between scope and focus rows.

- [x] **Step 4: Supply live counts from App**

In the command palette preview context inside `renderWorkspace()`, provide:

```ts
configManagedShelfCounts: {
	routes: routeFilterPresets.length,
	connections: connectionFilterPresets.length,
	ports: portFilterPresets.length,
	tools: customToolTargetPresets.length,
	logs: logProfiles.length,
	remotes: remoteProfiles.length,
},
```

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document the visible count preview**

Record that Config-origin managed shelf palette previews now include live counts for saved filters, profiles, and Tools target presets.

- [x] **Step 2: Add the next roadmap slice**

Add `v0.4.247 - Config Shelf Live Count Previews` above `v0.4.246`, and set the next slice toward broader OS control/dashboard parity.

- [x] **Step 3: Run full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

### Task 4: Publish the Version Slice

**Files:**
- Commit all modified source, tests, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-config-shelf-live-count-previews.md src/tui/palette.ts src/tui/App.tsx tests/palette.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): preview shelf counts in palette"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.247-config-shelf-live-count-previews
gh pr create --draft --base codex/picos-v0.4.246-config-tools-shelf-palette-focus --head codex/picos-v0.4.247-config-shelf-live-count-previews --title "feat(config): preview shelf counts in palette"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
