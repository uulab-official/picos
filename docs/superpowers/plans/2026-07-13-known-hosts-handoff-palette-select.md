# Known Hosts Handoff Palette Select Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a command-palette discovery slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Let operators discover and execute the Remotes known_hosts evidence handoff selector from the command palette.

**Architecture:** Add a read-only Action Center entry that dispatches to the same selection helper as Status `H`. Preview rows consume selected handoff metadata already derived from Status Activity result history.

**Tech Stack:** Bun, TypeScript, Ink command palette, Status Activity result history.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Add action metadata**
  Expose `status.remoteKnownHostsEvidence.handoffSelect` as an enabled read-only Status action.

- [x] **Step 2: Add palette discovery**
  Make `known_hosts handoff select` and related queries find the new action.

- [x] **Step 3: Add preview rows**
  Show selected cursor, target id, action, row number, and replay query before dispatch.

- [x] **Step 4: Reuse Status selection**
  Dispatch through the same selection path as `H`, moving focus to Status without reading, connecting, scanning, trusting, writing, or mutating.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for palette-based handoff selection.

## Validation

- [x] `bun test tests/palette.test.ts tests/actions.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
