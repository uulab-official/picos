# Remote Known Hosts Read Result Plan

## Goal

Model provided local `known_hosts` read output as a locked read-result surface that can feed candidate parsing while raw content stays hidden and host trust, sockets, scans, writes, and remote mutation remain disabled.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover read-result rows, hidden raw content, bytes/line counts, empty provider status rows, and feeding read results into candidate parsing.

- [x] **Step 2: Implement read-result model**
  - Add `createRemoteKnownHostsReadResult()`.
  - Add `formatRemoteKnownHostsReadResultRows()`.
  - Add `parseRemoteKnownHostsCandidatesFromReadResult()`.

- [x] **Step 3: Connect CLI/TUI surfaces**
  - Insert `REMOTE KNOWN_HOSTS READ RESULT` into `picos remote <id>`.
  - Render `KNOWN_HOSTS READ RESULT` in Remotes between read preview and parser preview.
  - Preserve raw-content-hidden and no-socket/no-scan/no-trust/no-mutation posture.

- [x] **Step 4: Update docs**
  - Update README, CHANGELOG, and ROADMAP.

- [x] **Step 5: Verify, commit, push, and open draft PR**
  - Focused remote tests, lint, and typecheck passed before full verification.
  - `bun run verify` passed with 634 tests, 0 failures.
  - `bun run release:check` passed with npm pack dry-run.
  - `git diff --check` passed.
