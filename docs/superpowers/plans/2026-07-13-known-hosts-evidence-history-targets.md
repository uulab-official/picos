# Known Hosts Evidence History Targets Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. This is a compact Status Activity history visibility slice. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Show recovered Remotes known_hosts evidence copy/export replay targets in compact Status Activity result-history rows.

**Architecture:** Extend only the Status Activity result-history row formatter. Reuse the existing known_hosts evidence result detail parser to derive the target id already present in the result detail row.

**Tech Stack:** Bun, TypeScript, Ink row formatting, Status Activity result history.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Add compact target token helper**
  Append `target=remote-known-hosts id:<id> action=copy|export` only for palette known_hosts evidence handoff result rows.

- [x] **Step 2: Keep detail rows intact**
  Preserve the detailed `target=... query=... path=...` row below the compact row.

- [x] **Step 3: Add focused tests**
  Assert copy/export history rows expose their replay target before the detail row.

- [x] **Step 4: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for compact result-history target tokens.

## Validation

- [x] `bun test tests/statusActivityQueue.test.ts`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
