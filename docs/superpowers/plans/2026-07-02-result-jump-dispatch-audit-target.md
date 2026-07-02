# Result Jump Dispatch Audit Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make palette-triggered Status result jump select/open attempts carry the same process-control target identity shown in the command-palette preview.

**Architecture:** Extend existing Status Activity result and audit formatting helpers instead of adding a new dispatch path. The helper parses process-control evidence audit queries and appends a compact `target=process-control pid:<pid> action=<action>` token to result details and audit text.

**Tech Stack:** Bun test, TypeScript, Ink TUI pure helpers.

---

### Task 1: Result Jump Dispatch Target Tokens

**Files:**
- Modify: `tests/statusActivityQueue.test.ts`
- Modify: `src/tui/statusActivityQueue.ts`

- [ ] **Step 1: Write the failing test**

Add expectations for `createStatusActivityResultTimelineJumpPaletteResult("open", ...)` and `formatStatusActivityResultTimelineJumpPaletteAuditMessage("open", ...)` where the jump query is:

```ts
'status evidence process audit action=search target="pid:12345"'
```

Expected result detail:

```txt
target=process-control pid:12345 action=search filter=audit search=status evidence process audit action=search target="pid:12345" matches=4
```

Expected audit message:

```txt
palette status result jump audit action=open selected=1/1 row=2 target="process-control pid:12345 action=search" filter=audit query="status evidence process audit action=search target=\"pid:12345\"" matches=4
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test tests/statusActivityQueue.test.ts
```

Expected: FAIL because result-jump result/audit helpers do not yet include process-control target tokens.

- [ ] **Step 3: Write minimal implementation**

Add a helper in `src/tui/statusActivityQueue.ts` that parses `palette process control audit`, `palette process evidence audit`, and `status evidence process audit` queries into `process-control pid/status action` target tokens. Add that token to `createStatusActivityResultTimelineJumpPaletteResult()` details and `formatStatusActivityResultTimelineJumpPaletteAuditMessage()` audit fields when present.

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

Document v0.4.237 and mention that palette result-jump dispatch rows now include process PID/action target identity.

- [ ] **Step 2: Verify and publish review branch**

Run:

```bash
bun run verify
bun run release:check
```

Commit, push, and open a draft PR based on `codex/picos-v0.4.236-result-jump-preview`.

## Self-Review

- Spec coverage: covers the v0.4.236 roadmap next item and improves OS-console traceability for palette recovery actions.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: uses existing Status Activity result jump helper names and `StatusActivityCopyIntentTimelineSearch` shape.
