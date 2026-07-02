# Remote Known Hosts Candidate Compare Plan

## Goal

Connect parsed `known_hosts` read-result candidates to remote host-key compare detail so the operator can inspect the selected candidate before any host trust, socket, scan, local trust-file write, or remote mutation is possible.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover empty compare detail fields.
  - Cover read-result candidate source, line, host pattern, key type, selected fingerprint, and `candidate-only` match state.
  - Cover provider status inclusion and blocked execution flags.

- [x] **Step 2: Implement candidate-aware compare detail**
  - Let `createRemoteHostKeyCompareDetail()` accept a known_hosts candidate preview.
  - Keep collected host-key evidence as `sha256:unknown` until a later locked evidence model exists.
  - Keep all execution flags disabled.

- [x] **Step 3: Update docs**
  - Update README, CHANGELOG, and ROADMAP.

- [x] **Step 4: Verify, commit, push, and open draft PR**
  - Focused remote tests passed with 38 tests, 0 failures.
  - `bun run verify` passed with 635 tests, 0 failures.
  - `bun run release:check` passed with npm pack dry-run.
  - `git diff --check` passed.
