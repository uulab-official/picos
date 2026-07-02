# Host Key Compare Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked host-key compare detail surface that shows how collected host-key evidence would be compared with known_hosts candidates before any trust, parser execution, local read, transport import, socket open, or mutation is enabled.

**Architecture:** Keep the behavior in `src/core/remotes.ts` as pure preview rows and consume it from CLI/TUI through existing Remotes provider status and workspace sections. The detail view is a read-only/blocked model layered after the trust decision preview and before host review, matching the existing remote safety pipeline.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Compare Detail Preview

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add a test that expects `createRemoteHostKeyCompareDetail()` and `formatRemoteHostKeyCompareDetailRows()` to expose selected-profile and empty-state rows with collected fingerprint, known_hosts candidate count, selected candidate, match state, blocked decision, exact confirm text, and all execution flags false.

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because the compare detail exports do not exist yet.

- [x] **Step 3: Write minimal implementation**

Add `RemoteHostKeyCompareDetail`, `createRemoteHostKeyCompareDetail()`, and `formatRemoteHostKeyCompareDetailRows()` in `src/core/remotes.ts`. Insert formatted rows into `formatRemoteProviderStatus()` between trust decision preview and host review.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Detail Section

**Files:**
- Modify: `src/tui/App.tsx`
- Test: existing typecheck/lint plus Remotes core tests

- [x] **Step 1: Render compare detail rows**

Import the new core helpers, compute rows for the selected remote profile, and render a `HOST KEY COMPARE DETAIL` section after `HOST KEY TRUST DECISION`.

- [x] **Step 2: Preserve responsive row budget**

Adjust the Remotes profile row reservation so the new section does not squeeze existing panels into overlapping text on short terminals.

- [x] **Step 3: Run focused checks**

Run: `bun run typecheck`, `bun run lint`, and `bun test tests/remotes.test.ts`.
Expected: PASS.

### Task 3: Docs, Verification, And PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-compare-detail.md`

- [x] **Step 1: Document v0.4.285**

Update README, CHANGELOG, and ROADMAP to describe the locked compare detail surface and next step.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Result: PASS. `bun run verify` passed 628 tests, lint, typecheck, build, and smoke. `bun run release:check` and `git diff --check` also passed.

- [x] **Step 3: Commit, push, and open draft PR**

Commit feature/docs, push `codex/picos-v0.4.285-host-key-compare-detail`, open draft PR [#347](https://github.com/uulab-official/picos/pull/347) stacked on `codex/picos-v0.4.284-host-trust-review-activity`, then update this plan and ROADMAP with the PR link.
