# v0.4.294 Known Hosts Candidate Selection

## Goal

Let operators rotate through pasted `known_hosts` candidates from the Remotes workspace and make host-key compare detail follow the selected candidate without enabling local trust-file reads, host trust, sockets, scans, writes, or remote mutation.

## Scope

- Add pure core selection movement for pasted known_hosts review candidates.
- Preserve hidden raw paste content and blocked trust posture while selection changes.
- Support next/previous wraparound behavior.
- Wire Remotes `]` and `[` keys to update the paste review session and known_hosts candidate session.
- Keep compare detail driven by the selected candidate.
- Update README, CHANGELOG, and ROADMAP.

## Verification

- `bun test tests/remotes.test.ts`
- `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts tests/tuiNavigation.test.ts`
- `bun run typecheck`
- `bun run lint`
- `bun run verify`
- `bun run release:check`
