# Remote Known Hosts Selected Compare Plan

## Goal

Connect parsed `known_hosts` candidates to the host-key compare detail so operators can inspect which candidate would be compared before any socket, host-key scan, trust decision, or mutation is enabled.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover compare detail built from a parsed read-result candidate.
  - Cover provider status staying empty until real parser input exists.

- [x] **Step 2: Implement selected candidate compare detail**
  - Let compare detail accept a candidate preview.
  - Surface candidate count, selected candidate index, and selected fingerprint.
  - Preserve blocked decision and all no-execution flags.

- [x] **Step 3: Update docs**
  - Update README, CHANGELOG, and ROADMAP for v0.4.288.

- [ ] **Step 4: Verify and ship**
  - Focused remotes tests passed.
  - `bun run verify` passed.
  - `bun run release:check` passed.
  - `git diff --check` passed.
  - Push branch and open a draft PR.
