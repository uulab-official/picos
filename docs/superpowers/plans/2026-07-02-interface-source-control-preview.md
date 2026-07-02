# Interface Source Control Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Interfaces source pane that shows the OS data source commands and adapter-owned locked interface-control preview without executing mutation.

**Architecture:** Extend `InterfaceDetailView` with a `source` pane after `platform`. Add pure formatting helpers in `src/tui/interfacePanel.ts` that use existing platform source labels plus `getControlPreviewCommand("interface.disable", platform)` to render a locked preview for the selected adapter.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helper formatting, Bun test, Biome.

---

### Task 1: Add Failing Source Pane Tests

**Files:**
- Modify: `tests/interfacePanel.test.ts`

- [x] **Step 1: Extend tab cycle expectations**

Expect `nextInterfaceDetailView("platform")` to return `"source"` and `nextInterfaceDetailView("source")` to return `"list"`.

- [x] **Step 2: Import and test source rows**

Add `formatInterfaceSourceRows(fixture, fixture.interfaces[0])` expectations:

```ts
[
	"SOURCE RAW en0",
	"inventory=node:os.networkInterfaces interface=en0",
	"stats=netstat -ib command=\"netstat -ibn\"",
	"gateway=route/get command=\"route -n get default\"",
	"dns=node:dns.getServers servers=1.1.1.1,8.8.8.8",
	"CONTROL interface.disable risk=write privilege=admin status=locked confirmation=disable interface",
	"adapter=macos command=\"sudo networksetup -setnetworkserviceenabled <service> off\"",
	"note=disable a network service",
]
```

- [x] **Step 3: Assert workspace source view includes selected summary plus source rows**

Call `formatInterfaceWorkspaceRows(fixture, 14, { selectedIndex: 0, view: "source" })` and assert the header, selected strip, and source rows appear in order.

- [x] **Step 4: Run focused tests and verify RED**

Run:

```bash
bun test tests/interfacePanel.test.ts
```

Expected: FAIL because `source` is not a valid view and `formatInterfaceSourceRows()` is not exported.

### Task 2: Implement Source Pane Formatting

**Files:**
- Modify: `src/tui/interfacePanel.ts`

- [x] **Step 1: Extend `InterfaceDetailView` and tab cycle**

Add `"source"` to the union and route `platform -> source -> list`.

- [x] **Step 2: Add source command helpers**

Add platform-specific source command formatters for inventory, stats, gateway, DNS, and selected interface name.

- [x] **Step 3: Add locked control preview rows**

Use `getControlPreviewCommand("interface.disable", summary.platform)` and render risk/privilege/locked/confirmation plus adapter command/note rows. Do not execute anything.

- [x] **Step 4: Wire `source` into `formatInterfaceWorkspaceRows()`**

Return header, selected summary strip, and source rows for the source pane while preserving visible row clipping.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/interfacePanel.test.ts tests/controlExecution.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document source pane**

Record that Interfaces now includes a source pane with raw OS source commands and locked adapter-owned interface control previews.

- [x] **Step 2: Add v0.4.254 roadmap entry**

Add `v0.4.254 - Interface Source Control Preview` above v0.4.253 and set the next slice toward real raw-output retention or interface action palette routing.

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
git add docs/superpowers/plans/2026-07-02-interface-source-control-preview.md src/tui/interfacePanel.ts tests/interfacePanel.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(interfaces): show source control preview"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.254-interface-source-control-preview
gh pr create --draft --base codex/picos-v0.4.253-interface-parity-selected-summary --head codex/picos-v0.4.254-interface-source-control-preview --title "feat(interfaces): show source control preview"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
