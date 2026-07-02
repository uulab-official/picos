# Host Key Candidate Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the selected `known_hosts` read-result candidate inside host-key compare detail while keeping collected host-key evidence unknown and all trust/network/mutation paths blocked.

**Architecture:** Extend the existing pure Remotes compare-detail model in `src/core/remotes.ts` so it can accept a parsed candidate preview. Surface the selected candidate count, selected candidate id, host pattern, key type, and fingerprint in CLI/TUI compare rows without importing transport, opening sockets, reading local files, trusting hosts, or writing `known_hosts`.

**Tech Stack:** Bun, TypeScript, Ink/React, Bun test, Biome.

---

### Task 1: Core Candidate Compare Detail

**Files:**
- Modify: `src/core/remotes.ts`
- Test: `tests/remotes.test.ts`

- [x] **Step 1: Write failing tests**

Add tests that create a read-result candidate preview, pass it to `createRemoteHostKeyCompareDetail()`, and expect selected candidate metadata while collected evidence remains `sha256:unknown` and `match=unknown`.

- [x] **Step 2: Verify red state**

Run: `bun test tests/remotes.test.ts`
Expected: FAIL because compare detail does not accept candidate previews yet.

- [x] **Step 3: Implement compare detail candidate fields**

Update `RemoteHostKeyCompareDetail`, `createRemoteHostKeyCompareDetail()`, and `formatRemoteHostKeyCompareDetailRows()` to include `candidateSource`, `selectedHostPattern`, and `selectedKeyType`.

- [x] **Step 4: Run focused tests**

Run: `bun test tests/remotes.test.ts`
Expected: PASS.

### Task 2: CLI and TUI Flow

**Files:**
- Modify: `src/core/remotes.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Keep default provider status locked**

Ensure `picos remote <id>` still prints empty compare detail unless a candidate preview is explicitly provided.

- [x] **Step 2: Preserve Remotes TUI locked compare section**

Keep Remotes TUI rendering the same locked compare detail with new selected-candidate fields clipped safely.

- [x] **Step 3: Run focused checks**

Run: `bun run typecheck`, `bun run lint`, and `bun test tests/remotes.test.ts`.
Expected: PASS.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-host-key-candidate-compare.md`

- [x] **Step 1: Document v0.4.288**

Update README, CHANGELOG, and ROADMAP to describe selected-candidate compare detail and the next step.

- [x] **Step 2: Run full verification**

Run: `bun run verify`, `bun run release:check`, and `git diff --check`.
Expected: PASS.

- [x] **Step 3: Commit, push, and open draft PR**

Push `codex/picos-v0.4.288-host-key-candidate-compare`, open a draft PR stacked on `codex/picos-v0.4.287-known-hosts-read-result`, then update ROADMAP and this plan with the PR link.

Result: draft PR [#353](https://github.com/uulab-official/picos/pull/353).
