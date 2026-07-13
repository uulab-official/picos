# Known Hosts Evidence Handoff Hints Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a Status Activity discoverability slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Show direct recovered Remotes known_hosts evidence copy/export handoff keywords inside the Status Activity copy-intent shelf.

**Architecture:** Keep rendering in `src/tui/statusActivityQueue.ts`, where copy-intent shelf rows already combine selected audit-jump, process evidence, Timeline trail, Tools evidence, and remote known_hosts evidence hints.

**Tech Stack:** Bun, TypeScript, Ink row formatting, existing Status Activity copy-intent tests.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Add shelf handoff keyword row**
  Render `remote known_hosts evidence handoff y/e palette=? known_hosts evidence copy/export` when a recovered known_hosts evidence export is selected.

- [x] **Step 2: Add compact controls hint**
  Extend the copy-intent controls row with `palette known_hosts copy/export` beside `remote known_hosts evidence`.

- [x] **Step 3: Update tests**
  Assert both the new handoff row and controls hint in the recovered known_hosts evidence shelf test.

- [x] **Step 4: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for the visible shelf hint.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts`
- [x] `bun run verify`
- [x] `bun run release:check`
