# Remote File Request Preview Plan

## Goal

Make future SFTP list/read requests visible as locked previews before picos imports transport, opens a socket, or reads remote file content.

## Architecture

- Add a pure request preview model in `src/core/remotes.ts`.
- Render the same rows in `picos remote <id>` and the Remotes TUI after the read adapter contract.
- Keep execution static: no transport import, no socket, no remote read, and no mutation.
- Reuse host-review and exact-confirm language so future live reads stay auditable.

## Tasks

- [x] Add RED tests for selected and empty remote file request previews.
- [x] Implement core preview rows, CLI provider status, and Remotes TUI section.
- [x] Update README, CHANGELOG, and ROADMAP for v0.4.278.
- [x] Run focused checks, full verify, release check, commit, push, and open a draft PR.

## Safety Notes

- No optional SFTP dependency is imported.
- No remote network session is opened.
- No remote file content is read.
- List/read remain planned preview requests only.
- Write/delete/exec remain locked or unsupported.
