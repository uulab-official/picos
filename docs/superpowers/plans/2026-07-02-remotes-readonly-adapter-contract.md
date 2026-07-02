# Remotes Read-only Adapter Contract Plan

## Goal

Make the future SFTP read-only adapter contract visible before picos imports any transport module, opens a socket, or enables filesystem mutation.

## Architecture

- Add a pure contract model in `src/core/remotes.ts`.
- Render the same rows in `picos remote <id>` and the Remotes TUI between transport probe and host review.
- Keep the contract static: no SFTP adapter import, no socket, no remote mutation.
- Make planned read methods explicit while write/destructive methods stay locked.

## Tasks

- [x] Add RED tests for selected and empty remote read-only adapter contract rows.
- [x] Implement the core contract, CLI provider status rows, and Remotes TUI section.
- [x] Update README, CHANGELOG, and ROADMAP for v0.4.277.
- [x] Run focused checks, full verify, release check, commit, push, and open a draft PR.

## Safety Notes

- No optional SFTP dependency is imported.
- No remote network session is opened.
- List/read/stat are planned only.
- Write/delete/chmod stay locked.
- Host review and exact confirmation remain required before future live reads.
