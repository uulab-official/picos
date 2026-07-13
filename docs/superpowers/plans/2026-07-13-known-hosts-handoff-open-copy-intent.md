# Known Hosts Handoff Open Copy Intent Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a Status copy-intent visibility slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Keep command-palette Remotes known_hosts handoff-open replays visible and repeatable inside the Status copy-intent shelf.

**Architecture:** Add a dedicated copy-intent record for selected handoff-open replay results while preserving the original audit query as the first copyText line so Timeline replay stays precise.

**Tech Stack:** Bun, TypeScript, Ink Status Activity shelves.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Add dedicated copy-intent creation**
  Create a Remotes known_hosts handoff-open intent with target id, action, source row, selected cursor, match count, and original Timeline query.

- [x] **Step 2: Add latest-summary shelf rows**
  Surface the latest handoff-open intent above Status copy-intent history rows.

- [x] **Step 3: Preserve Timeline replay**
  Make `g Timeline` on a selected handoff-open intent search the original audit query instead of the human-readable label.

- [x] **Step 4: Wire palette dispatch**
  Record the handoff-open copy intent when command-palette dispatch replays the selected handoff search.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, ROADMAP, and this implementation plan.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts`
- [x] `bun run typecheck`
- [x] `bun run lint`
- [x] `bun run verify`
- [x] `bun run release:check`
