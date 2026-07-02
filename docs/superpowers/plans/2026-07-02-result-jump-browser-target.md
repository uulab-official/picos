# Result Jump Browser Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show process-control PID/action targets directly in the Status result jump browser rows.

**Architecture:** Reuse the existing process-control target parser added for palette result-jump previews and dispatch audit rows. `formatStatusActivityResultTimelineJumpRows()` should append a compact `target=process-control ...` token only when the selected jump query is process-control related, leaving generic result jump rows unchanged.

**Tech Stack:** Bun test, TypeScript, Ink TUI pure helpers.

---

### Task 1: Browser Row Target Token

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `src/tui/statusActivityQueue.ts`

- [ ] **Step 1: Write the failing test**

Extend `formats a compact timeline result jump browser` with a process evidence search result created by `createProcessControlEvidenceStatusActivityResult("search", ...)`. Expect `formatStatusActivityResultTimelineJumpRows()` to render:

```txt
> #4 filter=audit query=status evidence process audit action=search target="pid:12345" target=process-control pid:12345 action=search action=process-control-evidence
```

Keep the existing generic Timeline copy/export rows unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because browser rows currently include only filter/query/action.

- [ ] **Step 3: Write minimal implementation**

In `formatStatusActivityResultTimelineJumpRows()`, compute `formatStatusActivityResultTimelineJumpTargetToken(jump.query)` and append `target=<token>` before `action=<result.action>` only when the token exists.

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

Document v0.4.238 and mention that the Status result jump browser now shows process-control PID/action targets before palette or direct open.

- [ ] **Step 2: Verify and publish review branch**

Run:

```bash
bun run verify
bun run release:check
```

Commit, push, and open a draft PR based on `codex/picos-v0.4.237-result-jump-audit-target`.

## Self-Review

- Spec coverage: covers the v0.4.237 roadmap next item and improves OS-console scanability for recovered process jumps.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: reuses existing Status Activity helper names and result action strings.
