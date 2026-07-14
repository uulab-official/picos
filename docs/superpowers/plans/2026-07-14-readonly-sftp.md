# Read-Only SFTP Plan

## Goal

Connect a reviewed remote profile to the Files workspace through a host-key-verified, read-only SFTP provider.

## Tasks

- [x] Add `ssh2` transport with private-key or SSH-agent authentication.
- [x] Require a valid selected SHA256 `known_hosts` candidate before exact connect confirmation.
- [x] Verify the raw server host key during the SSH handshake.
- [x] Implement read-only list, stat, bounded read, URI navigation, and explicit close.
- [x] Hand connected sessions from Remotes into Files and restore local Files on close.
- [x] Block remote write, copy, move, delete, and command execution.
- [x] Record connected and failed audit evidence with exact Timeline recovery.
- [x] Cover transport-independent behavior, security guards, navigation, and activity recovery with tests.
- [ ] Open a stacked draft PR on [#408](https://github.com/uulab-official/picos/pull/408) and confirm CI.

## Safety Boundary

No password is stored, no host key is auto-accepted, and picos does not write `known_hosts`. Remote mutation and remote command execution remain unavailable. Live-server validation is manual because deterministic CI uses injected read-only sessions rather than network credentials.
