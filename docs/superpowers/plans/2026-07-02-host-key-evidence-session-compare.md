# v0.4.291 Host Key Evidence Session Compare Plan

## Goal

Make recorded Remotes host-key evidence visible in the current TUI session immediately after `:remote-host-key-evidence` submission.

## Scope

- Add a pure session evidence map for recorded host-key fingerprints.
- Keep rejected evidence submissions from clearing or mutating the session map.
- Feed session evidence into `REMOTE HOST KEY EVIDENCE INPUT`.
- Feed session evidence into `REMOTE HOST KEY COMPARE DETAIL` so it can show `evidence-only`.
- Preserve the no-transport, no-scan, no-trust, no-write, no-mutation posture.

## Verification

- RED: `bun test tests/remotes.test.ts` failed on missing session evidence exports.
- GREEN: `bun test tests/remotes.test.ts`
- GREEN: `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts`
- GREEN: `bun run typecheck`

## Next

Add session candidate selection so live Remotes compare detail can move from `evidence-only` to `matched` or `mismatch` once a known_hosts candidate is selected.
