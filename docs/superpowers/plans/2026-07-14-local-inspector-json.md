# v0.4.337 Local Inspector JSON Plan

## Goal

Expose the lazyifconfig-inspired local OS and network inspectors as stable, bounded, machine-readable automation surfaces without serializing raw command output or widening mutation permissions.

## Tasks

- [x] Add schema-versioned JSON success output to `info`, `routes`, `route`, `connections`, and `ports`.
- [x] Preserve effective filters, sorts, source command identity, source success, and exit code.
- [x] Preserve source capture-truncation state, fail incomplete snapshots, and expose storage/process source status in full inventory.
- [x] Limit table results to 10,000 rows and 4 MiB with total, visible, returned, and truncation counts.
- [x] Fit final serialized rows exactly, expose the real full-process sampling boundary, and verify a near-limit subprocess pipe.
- [x] Normalize optional fields and omit raw source/command output from JSON snapshots.
- [x] Emit one bounded JSON failure with a non-zero exit for parser, validation, and command errors.
- [x] Reject ambiguous `--raw --json` requests before running an OS command.
- [x] Flush large stdout documents before process exit, including pipe consumers.
- [x] Omit process arguments, redact sensitive failure text, bound `safeExec()` capture, confirm child cleanup, and prevent output-write/audit double reporting.
- [x] Redact remote SFTP paths in terminal audits and bound descendant process cleanup.
- [x] Add unit, CLI-boundary, and real subprocess integration coverage.
- [x] Include local JSON integration in `bun run verify` for macOS, Linux, and Windows CI.
- [x] Update user, package, harness, agent, Claude, changelog, and roadmap documentation.
- [x] Run full verification and review.
- [ ] Open a stacked draft PR on #411 and monitor CI/review feedback.

## Safety Boundary

This milestone adds no OS mutation, privilege escalation, raw-output serialization, remote transfer, or remote execution. All platform commands remain behind core and `safeExec()`, and JSON mode only exposes normalized read-only snapshots plus bounded source-status metadata.
