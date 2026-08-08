# Task 8 Report — Interface and DNS Target/Proposal Transitions

## RED / GREEN

- RED: `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts` failed because `src/tui/dnsPanel.ts` and the planned interface transition exports did not exist.
- RED follow-up: the source-handoff regression failed because an empty interface inventory returned `{ kind: "source-handoff" }` for `e` instead of an explicit no-op.
- GREEN: the focused suite passed with 37 tests / 136 expectations across `interfacePanel`, `dnsPanel`, `interfaceControl`, `dnsControl`, and `actions`.

## Transition ownership

- `src/tui/interfacePanel.ts` resolves selected interfaces with `clampIndex()`, source-handoff eligibility, state proposal drafts, confirmation outcomes, and all associated notices.
- `src/tui/dnsPanel.ts` resolves DNS interface targets with `clampIndex()`, prepares locked server proposals, exposes confirmation eligibility, and returns explicit no-ops for unavailable target lists.
- `App.tsx` applies transition state, opens prompts, records audits, and retains the existing handoff I/O adapters. No callback was added; the audit remains 154 `useCallback` declarations plus one `useInput` dispatcher.

## Callback manifest rows

| Callback | Owner | Classification |
| --- | --- | --- |
| `exportInterfaceSourceHandoff` | `src/tui/interfacePanel.ts` | delegated |
| `openInterfaceSourceHandoff` | `src/tui/interfacePanel.ts` | delegated |
| `submitDnsServerProposalCommand` | `src/tui/dnsPanel.ts` | delegated |
| `openInterfaceStateProposal` | `src/tui/interfacePanel.ts` | delegated |
| `submitInterfaceConfirmationCommand` | `src/tui/interfacePanel.ts` | delegated |
| `useInput` | App plus panel transition owners | delegated |

## Locked-safety evidence

- Interface and DNS transitions only call proposal/control constructors; they do not invoke command execution or `safeExec()`.
- Tested proposals remain `enabled: false` and previews/confirmation results remain `willExecute: false`.
- A Darwin interface without a resolvable service mapping stays proposal-only with a missing control-target confidence.
- Empty interface/DNS targets return no-op decisions. The DNS workspace replaces `T`/`S`/`C` controls with a non-actionable unavailable-target row.
- Exact interface confirmation mismatches produce the existing rejected audit result and retain the execution-disabled blockers.

## Verification

- `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts tests/interfaceControl.test.ts tests/dnsControl.test.ts tests/actions.test.ts` — pass (37 tests, 136 expectations)
- `bun run audit:tui-callbacks` — pass (`callbacks=154`, `useInput=1`, `total=155`)
- `bun run typecheck` — pass
- `bun run lint` — pass
- `git diff --check` — pass
- `bun run verify` — pass (973 tests, all five integration harnesses, typecheck, build, and smoke)

## Self-review

- Verified all new selection resolution uses `clampIndex()`.
- Verified no new `useCallback` or App tests were introduced.
- Verified supported notices/prompt wording is preserved and no targetless path enters mutation proposal or handoff I/O.
- Verified no `dist/` output is included.

## Concerns

- `bun run audit:tui-callbacks --strict` still reports 61 legacy inline-decision entries outside Task 8. This task reclassified its affected callbacks and dispatcher ownership, but did not alter unrelated transition slices.

## Commit

- Local commit: `refactor(tui): extract interface and DNS transitions`
- Push: intentionally not performed; review remains pending.
