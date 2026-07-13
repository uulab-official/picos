# Known Hosts Evidence Handoff Browser Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a Status Activity navigation and visibility slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Let operators select Remotes known_hosts evidence copy/export handoff result rows directly from the Status copy-intent shelf.

**Architecture:** Reuse the `evidence-handoffs` result-history classifier and existing Timeline replay planner. Add a compact shelf browser plus a keyboard shortcut that only changes Status selection state.

**Tech Stack:** Bun, TypeScript, Ink row formatting, Status Activity result history.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Extract handoff indexes**
  Reuse the evidence-handoff result-history filter to identify copy/export handoff rows.

- [x] **Step 2: Add selected handoff metadata**
  Expose selected cursor, original result row, target id, action, and Timeline replay query.

- [x] **Step 3: Render the shelf browser**
  Show compact `remote known_hosts handoffs` rows inside `STATUS ACTIVITY COPY INTENTS`.

- [x] **Step 4: Wire keyboard selection**
  Add `H` in Status to cycle only known_hosts evidence handoff rows and sync the selected result-history row for `I` replay.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for the handoff browser.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
