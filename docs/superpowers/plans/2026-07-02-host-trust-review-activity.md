# v0.4.284 Host Trust Review Activity Plan

## Goal

Make the remote host-key trust review boundary keyboard-visible from Remotes without enabling SFTP transport, host trust, local `known_hosts` writes, or remote mutation.

## Steps

- [x] **Step 1: Add failing core tests**
  - Cover exact `review host trust <id>` confirmation.
  - Cover rejected input.
  - Assert `networkOpened=false`, `trustApplied=false`, and `knownHostsWritten=false`.
  - Assert searchable audit text.

- [x] **Step 2: Add failing Status Activity tests**
  - Cover result/history rows.
  - Cover Timeline audit-search recovery.
  - Cover Remotes activity shelf inclusion.

- [x] **Step 3: Implement core trust-review confirmation**
  - Add pure confirmation and audit helpers.
  - Keep all execution fields locked.

- [x] **Step 4: Implement Status Activity integration**
  - Add `remote-host-trust-review` result action.
  - Add Timeline recovery query generation.
  - Include trust attempts in the Remotes activity shelf.

- [x] **Step 5: Implement Remotes TUI prompt**
  - Add `t` shortcut for locked `:remote-host-trust`.
  - Record audit and Status Activity rows for confirmed-blocked and rejected attempts.
  - Keep `c` reserved for connect preview.

- [x] **Step 6: Update docs**
  - Update README, CHANGELOG, and ROADMAP.

- [ ] **Step 7: Verify, commit, push, and open draft PR**
  - Run focused tests.
  - Run `bun run verify`.
  - Run `bun run release:check`.
  - Push branch and open draft PR.
