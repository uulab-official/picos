# Config Status Shelf Count Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface Config managed shelf count coverage in Config and Status summaries so operators can spot empty OS-console presets without opening every workspace.

**Architecture:** Extend the existing pure Config shelf summary formatter with compact coverage and empty-shelf rows. Add Config as a read-only Status Activity Queue source by passing the same managed shelf rows into Status, preserving safe `none` enter behavior.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Config Summary Coverage

**Files:**
- Modify: `tests/configPanel.test.ts`

- [x] **Step 1: Write the failing Config test expectations**

Expect `formatConfigManagedShelfRows()` to include:

```ts
"shelf coverage saved=8 empty=0 routeFilters=2 connectionFilters=1 portFilters=1 toolTargets=1 logProfiles=1 logSearches=1 remotes=1",
"empty shelves none",
```

for a populated config, and add a sparse config assertion that returns:

```ts
"shelf coverage saved=0 empty=7 routeFilters=0 connectionFilters=0 portFilters=0 toolTargets=0 logProfiles=0 logSearches=0 remotes=0",
"empty shelves routeFilters,connectionFilters,portFilters,toolTargets,logProfiles,logSearches,remotes",
```

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: FAIL because Config shelf summaries do not yet include coverage rows.

### Task 2: Add Failing Status Queue Coverage

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`

- [x] **Step 1: Write the failing Status queue test expectations**

Pass `configRows` into `formatStatusActivityQueueRows()` and expect:

```ts
"STATUS ACTIVITY QUEUE active=5 sources=release,dialog,cleanup,config,evidence"
"  config CONFIG MANAGED SHELVES"
"controls=Status queue scans release/dialog/cleanup/config/evidence; open panels for detail"
```

Also expect `formatStatusActivityDetailRows(input, "config")` to show the Config rows and `createStatusActivityEnterPlan(input, "config")` to return action `none` with a safe Config-detail message.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because Status Activity Queue does not yet know about Config rows.

### Task 3: Implement Config and Status Count Summaries

**Files:**
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/statusActivityQueue.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add Config shelf coverage rows**

Compute saved counts for route filters, connection filters, port filters, tool targets, log profiles, log searches, and remotes. Append a `shelf coverage ...` row and an `empty shelves ...` row.

- [x] **Step 2: Add Config to Status Activity Queue**

Add `configRows?: string[]`, include source key `config`, prefix `CONFIG MANAGED SHELVES`, update queue controls text, route detail rows, and make enter plan safe:

```ts
case "config":
	return {
		source,
		action: "none",
		message: "config activity selected; review managed shelf counts",
	};
```

- [x] **Step 3: Pass Config rows from App Status**

In Status rendering, pass `configRows: configManagedShelfRows` into `formatStatusActivityQueueRows()`, `formatStatusActivityDetailRows()`, `moveStatusActivitySource()`, and `createStatusActivityEnterPlan()` inputs through the existing shared object.

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

- [x] **Step 1: Document Config/Status visibility**

Record that Config managed shelf summaries now include saved/empty counts and Status Activity includes a Config source.

- [x] **Step 2: Add v0.4.248 roadmap entry**

Add `v0.4.248 - Config Status Shelf Count Summaries` above v0.4.247 and set the next slice toward actionable setup/recovery hints for empty shelves.

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
git add docs/superpowers/plans/2026-07-02-config-status-shelf-count-summaries.md src/tui/configPanel.ts src/tui/statusActivityQueue.ts src/tui/App.tsx tests/configPanel.test.ts tests/statusActivityQueue.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(status): summarize config shelf counts"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.248-config-status-shelf-count-summaries
gh pr create --draft --base codex/picos-v0.4.247-config-shelf-live-count-previews --head codex/picos-v0.4.248-config-status-shelf-count-summaries --title "feat(status): summarize config shelf counts"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
