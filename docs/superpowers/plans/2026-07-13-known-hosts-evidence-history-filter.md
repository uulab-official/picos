# Known Hosts Evidence History Filter Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a compact Status Activity filtering slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Let operators narrow Status Activity result history to Remotes known_hosts evidence copy/export handoff rows.

**Architecture:** Extend the existing Status Activity result-history filter enum and predicate. Reuse the compact known_hosts handoff target token as the read-only classifier for evidence handoff rows.

**Tech Stack:** Bun, TypeScript, Ink row formatting, Status Activity result history.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Add filter state**
  Extend the result-history filter cycle to `all -> palette-result-jumps -> evidence-handoffs -> all`.

- [x] **Step 2: Match handoff rows**
  Treat only known_hosts evidence copy/export result rows with compact handoff target tokens as `evidence-handoffs`.

- [x] **Step 3: Keep filtered navigation stable**
  Preserve original row numbers and keep `u`/`i` movement inside the filtered handoff row list.

- [x] **Step 4: Improve command-palette discovery**
  Make `known_hosts handoffs` find the same read-only Status result-history filter action.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for the new filter cycle.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts tests/palette.test.ts tests/actions.test.ts`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
