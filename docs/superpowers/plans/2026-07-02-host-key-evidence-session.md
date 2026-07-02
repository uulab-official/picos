# Host Key Evidence Session Plan

## Goal

Make provided host-key fingerprint evidence immediately visible in Remotes compare detail after a locked prompt submission, without persisting trust, reading `known_hosts`, scanning hosts, opening transport, or mutating local/remote state.

## Tasks

- [x] Add a failing core regression test for session-backed evidence input and compare-detail state.
- [x] Implement profile-id keyed evidence session helpers in `src/core/remotes.ts`.
- [x] Wire Remotes TUI prompt submissions into session state.
- [x] Feed session-backed evidence input into Remotes evidence rows and compare detail.
- [x] Update README, CHANGELOG, and ROADMAP for v0.4.291.
- [x] Run focused tests and static verification.
- [x] Run full release readiness verification.
- [ ] Commit, push, and open a draft PR.
- [ ] Watch GitHub Actions checks and record the result.
