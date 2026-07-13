# Known Hosts Handoff Palette Open Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a command-palette replay slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Let operators replay the selected Remotes known_hosts evidence copy/export handoff Timeline search directly from the command palette.

**Architecture:** Add a read-only Action Center entry that consumes the selected handoff metadata from Status Activity result history and opens its existing Timeline replay query directly.

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
  Expose `status.remoteKnownHostsEvidence.handoffOpen` as an enabled read-only Status action.

- [x] **Step 2: Add palette discovery**
  Make `known_hosts handoff open` and related queries find the new action.

- [x] **Step 3: Add preview rows**
  Show selected cursor, target id, action, row number, Timeline filter, replay query, and replay message before dispatch.

- [x] **Step 4: Reuse replay target metadata**
  Dispatch directly from selected handoff metadata so replay does not depend on asynchronous Status row selection.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for palette-based handoff replay.

## Validation

- [x] `bun test tests/palette.test.ts tests/actions.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
