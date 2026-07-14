# SFTP Integration and JSON Automation Plan

## Goal

Prove the real read-only SFTP transport with a disposable credentialed peer and expose a stable machine-readable remote list/read contract.

## Tasks

- [x] Add a schema-versioned, secret-free JSON success/failure contract for remote list/read.
- [x] Keep one JSON document on stdout, audit diagnostics on stderr, and non-zero failure exits.
- [x] Generate disposable host/client keys and require verified public-key authentication.
- [x] Serve an in-memory read-only SFTP filesystem on a random localhost port.
- [x] Reject and count remote mutation and exec requests.
- [x] Exercise the real CLI for list, bounded read, exact-confirm rejection, and observed close.
- [x] Fix real `READDIR` EOF handling exposed by the protocol harness.
- [x] Include the SFTP harness and scripts typecheck in `bun run verify`.
- [x] Add focused output/command tests and user, agent, Claude, changelog, roadmap, and harness documentation.
- [x] Run full verification and gstack review.
- [ ] Open a stacked draft PR on #410 and monitor CI.

## Safety Boundary

The milestone adds no remote write, transfer, delete, trust-file mutation, password authentication, host-key auto-accept, or remote command execution. Every socket still requires a local matching `known_hosts` key and exact confirmation.
