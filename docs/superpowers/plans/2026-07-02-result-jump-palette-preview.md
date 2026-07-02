# Result Jump Palette Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show compact command-palette previews for recovered Status Activity result Timeline jumps, including Status Evidence process PID jumps.

**Architecture:** Reuse the existing `StatusActivityCopyIntentTimelineSearch` jump model. `formatCommandPaletteActionPreviewRows()` gets the currently selected result jump in its context, renders `status.resultJump.select` and `status.resultJump.open` previews, and `App.tsx` passes the selected jump plus jump-browser cursor metadata from existing Status Activity helpers.

**Tech Stack:** Bun test, TypeScript, Ink TUI pure palette helpers.

---

### Task 1: Palette Preview Rows

**Files:**
- Modify: `tests/palette.test.ts`
- Modify: `src/tui/palette.ts`

- [ ] **Step 1: Write the failing test**

Add a test in `tests/palette.test.ts` that calls `formatCommandPaletteActionPreviewRows()` with the `status.resultJump.open` action and this context:

```ts
{
	selectedStatusActivityResultTimelineJump: {
		filter: "audit",
		query: 'status evidence process audit action=search target="pid:12345"',
		message:
			"status activity result timeline search status process evidence pid=12345",
	},
	selectedStatusActivityResultTimelineJumpIndex: 1,
	totalStatusActivityResultTimelineJumps: 3,
}
```

Expected rows:

```txt
selected result jump 2/3 filter=audit
target=process-control pid:12345 action=search
query=status evidence process audit action=search target="pid:12345"
timeline-search=audit message=status activity result timeline search status process evidence pid=12345
```

Also assert `status.resultJump.select` renders `action=select next Status result Timeline jump`, and no jump renders `selected result jump unavailable`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because result jump actions currently do not render preview rows.

- [ ] **Step 3: Write minimal implementation**

Add result-jump context fields to `CommandPalettePreviewContext`, include `status.resultJump.select` and `status.resultJump.open` in the preview allow-list, then render rows from the selected jump. Parse `status evidence process audit`, `palette process evidence audit`, and `palette process control audit` queries into compact `target=process-control ...` rows.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: PASS.

### Task 2: App Wiring, Docs, and PR

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Pass selected jump context from App**

In the command-palette render path, pass `createStatusActivityResultTimelineSearch(statusActivityResultHistory, selectedStatusActivityResultHistoryIndex)` and `getStatusActivityResultTimelineJumpSelection(...)` values into `formatCommandPaletteActionPreviewRows()`.

- [ ] **Step 2: Update docs**

Document v0.4.236 and mention that `? result jump` previews now show filter, PID/action target, query, and dispatch mode for recovered Status Evidence process searches.

- [ ] **Step 3: Verify and commit**

Run:

```bash
bun run verify
bun run release:check
```

Then commit, push, and open a draft PR based on `codex/picos-v0.4.235-process-evidence-jump-recovery`.

## Self-Review

- Spec coverage: covers the v0.4.235 roadmap next item and moves direct `I` result recovery and command-palette result-jump recovery closer to parity.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: uses existing `StatusActivityCopyIntentTimelineSearch`, result jump action ids, and Status Activity helper names.
