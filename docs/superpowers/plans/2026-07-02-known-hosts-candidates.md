# Remote Known Hosts Candidate Parser Plan

## Goal

Parse injected `known_hosts` content into safe candidate rows for future host-key comparison without reading local trust files, opening sockets, scanning host keys, trusting hosts, or mutating remote/local state.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover plain host rows, bracketed host:port rows, marker/wildcard rows, hashed-host non-matches, candidate preview rows, empty preview rows, and provider status inclusion.

- [x] **Step 2: Implement pure parser and preview**
  - Add `parseRemoteKnownHostsCandidates()`.
  - Add candidate preview type, creator, and formatter.
  - Compute SSH-style SHA256 fingerprints from injected key blobs.

- [x] **Step 3: Connect CLI/TUI surfaces**
  - Insert `REMOTE KNOWN_HOSTS CANDIDATES` into `picos remote <id>`.
  - Render `KNOWN_HOSTS CANDIDATES` in Remotes after parser preview.
  - Preserve no-read/no-connect/no-scan/no-trust/no-mutation execution flags.

- [x] **Step 4: Update docs**
  - Update README, CHANGELOG, and ROADMAP.

- [x] **Step 5: Verify locally**
  - Run focused tests.
  - Run `bun run verify`.
  - Run `bun run release:check`.
  - Result: PASS. `bun run verify` passed 631 tests, lint, typecheck, build, and smoke. `bun run release:check` and `git diff --check` also passed.

- [x] **Step 6: Commit, push, and open draft PR**
  - Commit and push `codex/picos-v0.4.286-known-hosts-candidates`.
  - Open a draft PR stacked on `codex/picos-v0.4.285-host-key-compare-detail`.
  - Result: draft PR [#349](https://github.com/uulab-official/picos/pull/349) opened against `codex/picos-v0.4.285-host-key-compare-detail`.
