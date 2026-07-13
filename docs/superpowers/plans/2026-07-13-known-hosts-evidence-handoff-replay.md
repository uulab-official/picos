# Known Hosts Evidence Handoff Replay Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a replay/discoverability slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Let palette-triggered Remotes known_hosts evidence copy/export result rows become reusable Status Activity `I` Timeline jumps.

**Architecture:** Extend the existing Status Activity result-to-Timeline mapper in `src/tui/statusActivityQueue.ts`. The mapper already builds audit queries for known_hosts evidence select/open/search rows; copy/export should reuse the same target extraction and audit prefix.

**Tech Stack:** Bun, TypeScript, Ink row formatting, Status Activity result history, Timeline audit search.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Extend replay action matching**
  Include `copy` and `export` in the known_hosts evidence Status Activity result-to-Timeline mapper.

- [x] **Step 2: Cover reusable handoff jumps**
  Assert palette copy/export result rows create audit Timeline searches with the selected recovered target id.

- [x] **Step 3: Cover Timeline audit rendering**
  Assert `palette remote known_hosts evidence audit action=copy` rows are searchable in the Timeline workspace.

- [x] **Step 4: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for reusable copy/export replay.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts tests/timelinePanel.test.ts`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
