# Process Evidence Search Jump Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Status Evidence process `G` search results recoverable as reusable Timeline audit jumps from Status Activity history.

**Architecture:** Extend the existing Status Activity result-to-Timeline search model instead of adding a new shelf. The new keyboard-origin `status evidence process search ...` result rows should map back to `status evidence process audit action=search ...` audit queries, and the existing copy-intent shelf should summarize those reusable jumps as process-control targets.

**Tech Stack:** Bun test, TypeScript, Ink TUI pure helpers.

---

### Task 1: Status Evidence Process Search Result Jump

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `src/tui/statusActivityQueue.ts`

- [ ] **Step 1: Write the failing test**

Add a test in `tests/statusActivityQueue.test.ts` that builds a `createProcessControlEvidenceStatusActivityResult("search", processEvidence, { selectedIndex: 1, total: 3 })` result and expects `createStatusActivityResultTimelineSearch([result], 0)` to return:

```ts
{
	filter: "audit",
	query:
		'status evidence process audit action=search target="pid:12345"',
	message:
		"status activity result timeline search status process evidence pid=12345",
}
```

Also create an intent with `createStatusActivityResultTimelineSearchIntent(jump)` and expect `formatStatusActivityCopyIntentRows([...])` to show:

```txt
audit jumps count=1 target=process-control pid:12345 latest=status evidence process audit action=search target="pid:12345" lines=3 I=replay replay=selected valid
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because `createStatusActivityResultTimelineSearch()` does not yet recognize `source=evidence action=process-control-evidence` result rows.

- [ ] **Step 3: Write minimal implementation**

In `src/tui/statusActivityQueue.ts`, add a branch to `createStatusActivityResultTimelineSearch()` for `result.source === "evidence" && result.action === "process-control-evidence"`. Parse `target=pid:<pid>` from `result.detail`; for a PID return an audit jump query scoped to `status evidence process audit action=search target="pid:<pid>"`, otherwise return `status evidence process audit action=search status=unavailable`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: PASS.

### Task 2: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update docs**

Document v0.4.235 as a small continuation of process evidence recovery. Mention that Status Evidence process search result rows can now be converted into reusable Timeline audit jumps and replayed from Status Activity.

- [ ] **Step 2: Run required verification**

Run:

```bash
bun run verify
bun run release:check
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit and open a draft PR**

Create a commit:

```bash
git add tests/statusActivityQueue.test.ts src/tui/statusActivityQueue.ts README.md CHANGELOG.md ROADMAP.md docs/superpowers/plans/2026-07-02-process-evidence-search-jump-recovery.md
git commit -m "feat(tui): recover status process evidence jumps"
```

Push the branch and open a draft PR based on `codex/picos-v0.4.234-process-evidence-search-audit`.

## Self-Review

- Spec coverage: this plan covers the next roadmap item from v0.4.234 and moves picos closer to a recoverable OS-style console where keyboard actions remain searchable and replayable.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: the plan uses existing exported helper names and existing `StatusActivityResult` action/source strings.
