# v0.4.295 Known Hosts Selection Activity

## Goal

Make pasted `known_hosts` candidate selection visible, durable, and recoverable from Status/Timeline while adding direct numeric candidate selection in Remotes.

## Scope

- Add pure core selection by pasted candidate number.
- Keep invalid/empty pasted reviews as no-ops.
- Record `[`/`]` and `1-9` selection changes as Status Activity results.
- Include selected line, host pattern, key type, fingerprint, hidden raw-content posture, and blocked trust/write state in Activity detail rows.
- Add Timeline recovery search rows for selection activity.
- Include known_hosts selection in the Remotes activity shelf.
- Update README, CHANGELOG, and ROADMAP.

## Verification

- `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts`
- `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts tests/tuiNavigation.test.ts`
- `bun run typecheck`
- `bun run lint`
- `bun run verify`
- `bun run release:check`
