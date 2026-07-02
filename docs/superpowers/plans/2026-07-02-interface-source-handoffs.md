# Interface Source Handoffs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators copy, export, reopen, and index retained Interfaces source evidence like other picos OS-console handoffs.

**Architecture:** `src/tui/interfacePanel.ts` will own pure clipboard/export formatting for `NetworkSummary.sourceOutputs`. `src/core/fileOpen.ts` and `src/core/handoffIndex.ts` will recognize picos-owned `interfaces/*.md` handoff files. `src/tui/App.tsx` will wire `c`, `e`, and `o` for the Interfaces source pane through existing locked clipboard and file-open confirmation flows.

**Tech Stack:** Bun, TypeScript, Ink/React TUI formatting helpers, Bun test, Biome.

---

### Task 1: Interface Source Copy and Export Model

**Files:**
- Modify: `src/tui/interfacePanel.ts`
- Modify: `src/tui/clipboardPreview.ts`
- Modify: `tests/interfacePanel.test.ts`

- [x] **Step 1: Write failing tests**

Add tests that expect `getInterfaceSourceClipboardPreview()` and `createInterfaceSourceHandoffPlan()` to build a locked clipboard preview and markdown handoff from retained source evidence.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/interfacePanel.test.ts
```

Expected: FAIL because the helpers and clipboard source do not exist.

- [x] **Step 3: Implement pure helpers**

Add `interface-source` clipboard source, format source evidence into reusable text, create `picos-interfaces-source-*.md` plans under `interfaces/`, and write plans to disk.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/interfacePanel.test.ts
bun run typecheck
```

Expected: PASS.

### Task 2: Handoff Index and File Open Support

**Files:**
- Modify: `src/core/fileOpen.ts`
- Modify: `src/core/handoffIndex.ts`
- Modify: `tests/fileOpen.test.ts`
- Modify: `tests/handoffIndex.test.ts`

- [x] **Step 1: Write failing index/open tests**

Expect `interfaces/picos-interfaces-source-*.md` to be accepted by file-open planning, listed by the Status handoff index as `kind=interfaces`, and archived only from the picos config tree.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/fileOpen.test.ts tests/handoffIndex.test.ts
```

Expected: FAIL because `interface-handoff` is unsupported.

- [x] **Step 3: Implement index/open support**

Add `interface-handoff` source, `interfaces` handoff kind/directory, filename validation, row label formatting, archive matching, and allowed file-open path support.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/fileOpen.test.ts tests/handoffIndex.test.ts
bun run typecheck
```

Expected: PASS.

### Task 3: App Keyboard Wiring

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `src/tui/interfacePanel.ts`
- Modify: `tests/interfacePanel.test.ts`

- [x] **Step 1: Add source-pane preview tests**

Expect `formatInterfaceWorkspaceRows(..., { view: "source", copyPreview: true })` to append `CLIPBOARD PREVIEW interface-source` rows.

- [x] **Step 2: Implement App wiring**

Add `interfaceSourceCopyPreview` state, clear it on selection/tab changes, wire Interfaces source-pane `c` to locked clipboard preview, `e` to write the handoff and refresh Status handoffs, and `o` to write then open through locked `:file-open`.

- [x] **Step 3: Verify focused behavior**

Run:

```bash
bun test tests/interfacePanel.test.ts tests/fileOpen.test.ts tests/handoffIndex.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 4: Docs, Verification, and Publish

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-interface-source-handoffs.md`

- [x] **Step 1: Document v0.4.257 behavior**

Record Interfaces source copy/export/open handoffs and Status index recovery.

- [x] **Step 2: Run full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

- [x] **Step 3: Commit, push, and open draft PR**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-interface-source-handoffs.md src/tui/interfacePanel.ts src/tui/clipboardPreview.ts src/core/fileOpen.ts src/core/handoffIndex.ts src/tui/App.tsx tests/interfacePanel.test.ts tests/fileOpen.test.ts tests/handoffIndex.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(interfaces): export source evidence handoffs"
git push -u origin codex/picos-v0.4.257-interface-source-handoffs
gh pr create --draft --base codex/picos-v0.4.256-interface-raw-source-retention --head codex/picos-v0.4.257-interface-source-handoffs --title "feat(interfaces): export source evidence handoffs"
```
