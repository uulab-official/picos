# Remote Host Key Evidence Input Plan

## Goal

Add a locked host-key evidence input surface so provided fingerprints can be compared with selected `known_hosts` candidates without opening SFTP transport, scanning a host key, trusting a host, reading local trust files, writing `known_hosts`, or mutating a remote system.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover provided and missing `REMOTE HOST KEY EVIDENCE INPUT` rows.
  - Cover provider status inclusion.
  - Cover matched and mismatch compare detail states from evidence input plus read-result candidates.
  - Cover disabled import/connect/local-read/known-hosts-parse/scan/trust/mutation flags.

- [x] **Step 2: Implement evidence input model**
  - Add `createRemoteHostKeyEvidenceInput()`.
  - Add `formatRemoteHostKeyEvidenceInputRows()`.
  - Keep raw transport not opened and trust blocked.

- [x] **Step 3: Connect compare detail and surfaces**
  - Let `createRemoteHostKeyCompareDetail()` accept evidence input.
  - Report `matched`, `mismatch`, `candidate-only`, `evidence-only`, or `unknown`.
  - Insert empty evidence input rows into `picos remote <id>` provider status.
  - Render `HOST KEY EVIDENCE INPUT` in Remotes TUI.

- [x] **Step 4: Update docs**
  - Update README, CHANGELOG, and ROADMAP.

- [x] **Step 5: Verify, commit, push, and open draft PR**
  - Focused remote tests passed with 41 tests, 0 failures.
  - `bun run verify` passed with 638 tests, 0 failures.
  - `bun run release:check` passed with npm pack dry-run.
  - `git diff --check` passed.
