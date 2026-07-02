# Config Empty Shelf Recovery Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn sparse Config managed shelf summaries into actionable recovery hints that tell operators where to create missing presets/profiles from Config and Status.

**Architecture:** Keep the Config shelf summary pure and platform-neutral by deriving recovery rows from existing managed shelf counts. Teach Status Activity detail to prioritize Config coverage/recovery rows and make Enter on Config activity jump back to the Config workspace instead of remaining a dead review action.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Config Recovery Hint Tests

**Files:**
- Modify: `tests/configPanel.test.ts`

- [x] **Step 1: Write sparse and populated recovery assertions**

Extend the managed shelf summary test so a sparse config expects:

```ts
"recovery routeFilters -> Routes enter=cycle route filter presets fallback=open filter prompt",
"recovery connectionFilters -> Connections enter=cycle connection filter presets fallback=open filter prompt",
"recovery portFilters -> Ports enter=cycle port filter presets fallback=open filter prompt",
"recovery toolTargets -> Tools enter=cycle tool target presets fallback=keep first target",
"recovery logProfiles -> Logs enter=cycle log profiles fallback=open search prompt",
"recovery logSearches -> Logs enter=cycle log profiles fallback=open search prompt",
"recovery remotes -> Remotes enter=remote profile focus fallback=empty profile list",
```

Also assert a populated config includes:

```ts
"recovery all shelves ready"
```

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: FAIL because Config managed shelf rows do not yet include recovery rows.

### Task 2: Add Failing Status Recovery Detail Tests

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Write Status Config detail and enter expectations**

Add `configRows` containing coverage, empty shelves, and recovery rows. Expect `formatStatusActivityDetailRows(input, "config")` to prioritize:

```ts
"STATUS ACTIVITY DETAIL active=config rows=5",
"> shelf coverage saved=0 empty=2 routeFilters=0 connectionFilters=0 portFilters=1 toolTargets=1 logProfiles=1 logSearches=1 remotes=1",
"  empty shelves routeFilters,connectionFilters",
"  recovery routeFilters -> Routes enter=cycle route filter presets fallback=open filter prompt",
```

Expect `createStatusActivityEnterPlan(input, "config")` to return:

```ts
{
	source: "config",
	action: "focus-config",
	message: "config activity selected; opening Config recovery hints",
}
```

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because Status does not prioritize Config recovery rows and Config enter is still `none`.

### Task 3: Implement Recovery Rows and Config Enter Action

**Files:**
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add Config recovery rows**

Derive empty shelf keys from the existing shelf counts. If none are empty, append `recovery all shelves ready`; otherwise append one recovery row per empty shelf using the existing workspace label and focus action hint language.

- [x] **Step 2: Prioritize Config detail rows in Status**

When `formatStatusActivityDetailRows()` receives source `config`, select the coverage row, empty shelf row, and the first recovery row before falling back to the generic first three rows.

- [x] **Step 3: Make Status Enter focus Config**

Add `focus-config` to `StatusActivityEnterAction`, return it for Config activity, and handle it in `App.tsx` by switching to the Config screen, focusing workspaces, recording the Status Activity result, and logging the message.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/configPanel.test.ts tests/statusActivityQueue.test.ts
```

Expected: PASS.

### Task 4: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document recovery hints**

Record that Config empty shelf rows now include recovery hints and Status Enter on Config activity opens the Config recovery view.

- [x] **Step 2: Add v0.4.249 roadmap entry**

Add `v0.4.249 - Config Empty Shelf Recovery Hints` above v0.4.248 and set the next slice toward command-palette actions or direct workspace creation prompts for missing shelf items.

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
git add docs/superpowers/plans/2026-07-02-config-empty-shelf-recovery-hints.md src/tui/configPanel.ts src/tui/statusActivityQueue.ts src/tui/App.tsx tests/configPanel.test.ts tests/statusActivityQueue.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): add empty shelf recovery hints"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.249-config-empty-shelf-recovery-hints
gh pr create --draft --base codex/picos-v0.4.248-config-status-shelf-count-summaries --head codex/picos-v0.4.249-config-empty-shelf-recovery-hints --title "feat(config): add empty shelf recovery hints"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
