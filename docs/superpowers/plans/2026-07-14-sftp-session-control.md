# SFTP Session Control Plan

## Goal

Make real read-only SFTP sessions observable and interruptible in the TUI, then expose the same guarded provider for CLI list/read automation.

## Tasks

- [x] Model connecting, cancelling, connected, failed, cancelled, and disconnected diagnostics.
- [x] Add Remotes `X` cancellation and exact-confirm `R` retry controls.
- [x] Preserve cancellation and failure outcomes in Status Activity and Timeline audit recovery.
- [x] Match plain, wildcard, bracketed-port, and OpenSSH hashed `known_hosts` entries.
- [x] Reject revoked/CA rows as direct keys and require explicit fingerprint selection for ambiguous hosts.
- [x] Add guarded CLI remote list/read with timeout and read-size bounds.
- [x] Guarantee provider close and structured success/failure/cancellation diagnostics.
- [x] Cover lifecycle, host selection, CLI operations, audit recovery, and safety bounds with tests.
- [x] Keep Remotes responsive at compact 80x24 and expanded 120x40 terminal sizes.
- [x] Run full verification and gstack review.
- [x] Open stacked draft PR #410 on #409.
- [x] Monitor PR #410 CI to completion: 8/8 checks passed.

## Safety Boundary

Every socket still requires a local `known_hosts` match and the exact phrase `connect remote <id>`. Password persistence, host-key auto-accept, trust-file writes, remote writes, deletion, transfer, and remote command execution remain unavailable.
