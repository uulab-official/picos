# Known Hosts Candidate Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked known_hosts candidate selection preview that shows how picos will choose a parsed trust row before enabling local reads, parser execution, fingerprint comparison, host trust, transport import, socket open, or mutation.

**Architecture:** Keep candidate selection as a pure preview in `src/core/remotes.ts`, then surface it through `picos remote <id>` and the Remotes TUI. The preview sits after `REMOTE HOST KEY COMPARE DETAIL` and before host review so the trust pipeline remains visually ordered.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Candidate Selection Preview

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write the failing test**

Add tests for `createRemoteKnownHostsCandidateSelection()` and `formatRemoteKnownHostsCandidateSelectionRows()` covering selected and empty profile states, zero candidates, selected `none`, exact confirmation, and no-read/no-parse/no-compare/no-trust execution flags.

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because the candidate selection exports do not exist yet.

- [x] **Step 3: Implement core preview**

Add type, create helper, formatter, and provider status rows between compare detail and host review.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: Remotes TUI Section

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render candidate selection**

Import candidate helpers, compute rows for selected profile, and render `KNOWN_HOSTS CANDIDATE SELECTION` after compare detail.

- [x] **Step 2: Preserve terminal row budget**

Adjust Remotes row reservation so the new section remains responsive on short terminals.

- [x] **Step 3: Run focused checks**

Run: `bun run typecheck`, `bun run lint`, and `bun test tests/remotes.test.ts`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-known-hosts-candidate-selection.md`

- [x] **Step 1: Document v0.4.286**

Update README, CHANGELOG, and ROADMAP to describe candidate selection and next step.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.286-known-hosts-candidate-selection`, open a draft PR stacked on `codex/picos-v0.4.285-host-key-compare-detail`, then update ROADMAP and this plan with the PR link.

Result: draft PR [#348](https://github.com/uulab-official/picos/pull/348).
